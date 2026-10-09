import { baseAsset } from "./baseAssets";
import fs from "node:fs";
import path from "node:path";
import { teamLogo } from "./assets";
import { wikiMap } from "./wiki";
import { slot, pause, ok as wmOk } from "./wmGate";
import { all } from "./db";

/**
 * Logo for any constructor: 2026 grid → official F1 logo; otherwise the team's Wikidata logo (P154) from Commons;
 * otherwise null (caller draws a monogram in team colour). Cached in data/team-logos.json.
 */
const FILE = path.join(process.cwd(), "data/team-logos.json");
let store: Record<string, string | null> | null = null;
let mtime = 0;
const load = () => {
  try { const m = fs.statSync(FILE).mtimeMs; if (!store || m !== mtime) { store = JSON.parse(fs.readFileSync(FILE, "utf8")); mtime = m; } } catch { store ??= {}; }
  return store!;
};
const UA = { "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" };
let last = 0;
async function get(url: string) {
  await slot(); // lib/wmGate: serialized, paused after a 429 (throws WmPaused = "could not ask")
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
  if (r.status === 429) { pause(+(r.headers.get("retry-after") ?? 0)); throw new Error("throttled"); }
  if (r.ok) wmOk();
  return r.ok ? r.json() : null;
}
const inflight = new Map<string, Promise<string | null>>();

export async function teamLogoAny(id: string, white = false, w = 480): Promise<string | null> {
  const official = teamLogo(id, w, white ? "white" : "color");
  if (official) return official;
  const s = load();
  if (id in s) return s[id];
  if (inflight.has(id)) return inflight.get(id)!;
  const p = (async () => {
    try {
      const title = wikiMap().constructors?.[id];
      if (!title) return null;
      const pp: any = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&redirects=1&titles=${encodeURIComponent(title)}`);
      const qid = (Object.values(pp?.query?.pages ?? {})[0] as any)?.pageprops?.wikibase_item;
      let file: string | null = null;
      if (qid) {
        const c: any = await get(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P154`);
        file = c?.claims?.P154?.[0]?.mainsnak?.datavalue?.value ?? null;
      }
      const url = file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=640` : null;
      load()[id] = url;
      fs.writeFileSync(FILE, JSON.stringify(load()));
      return url;
    } catch { return null; } // throttled / offline: not cached, retried next time
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/* ---------- year-aware logo ---------- */

const YFILE = path.join(process.cwd(), "data/team-logos-year.json");
type LogoSpan = { file: string; from: number | null; to: number | null };
let ystore: Record<string, any> | null = null;
let ymtime = 0;
const yload = () => {
  try { const m = fs.statSync(YFILE).mtimeMs; if (!ystore || m !== ymtime) { ystore = JSON.parse(fs.readFileSync(YFILE, "utf8")); ymtime = m; } } catch { ystore ??= {}; }
  return ystore!;
};
const yearOf = (t?: string) => (t ? +(/^[+-]?(\d{4})/.exec(t)?.[1] ?? NaN) || null : null);
const NEW_2025: Record<string, string> = {
  mercedes: "mercedes", ferrari: "ferrari", mclaren: "mclaren", "red-bull": "redbullracing", williams: "williams", alpine: "alpine",
  "aston-martin": "astonmartin", haas: "haasf1team", "racing-bulls": "racingbulls", "kick-sauber": "kicksauber",
};
/** formula1.com legacy per-season logos 2019–2024: content/dam/fom-website/teams/<year>/<slug>-logo.png */
const LEGACY: Record<string, string[]> = {
  mercedes: ["mercedes"], ferrari: ["ferrari"], mclaren: ["mclaren"], "red-bull": ["red-bull-racing"], williams: ["williams"],
  "alfa-romeo": ["alfa-romeo", "alfa-romeo-racing"], haas: ["haas-f1-team", "haas"], "racing-point": ["racing-point"], "toro-rosso": ["toro-rosso"],
  alphatauri: ["alphatauri"], renault: ["renault"], alpine: ["alpine"], "aston-martin": ["aston-martin"], "kick-sauber": ["kick-sauber"], rb: ["rb"],
};
const legacyLogo = (slug: string, year: number) => `https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_160/content/dam/fom-website/teams/${year}/${slug}-logo.png`;
/** Probe (and remember) which legacy slug serves `team`'s logo in `year`. */
export async function probeLegacyLogo(team: string, year: number): Promise<string | null> {
  const k = `@off:${team}@${year}`;
  if (k in yload()) return yload()[k];
  if (year < 2019 || year > 2024 || !LEGACY[team]) return null;
  let url: string | null = null;
  for (const sl of LEGACY[team]) {
    try {
      const r = await fetch(legacyLogo(sl, year), { headers: UA, signal: AbortSignal.timeout(8000) });
      r.body?.cancel().catch(() => {});
      if (r.ok && /image/.test(r.headers.get("content-type") ?? "")) { url = legacyLogo(sl, year); break; }
    } catch { return null; } // network: unknown, not cached
  }
  yload()[k] = url;
  let disk: Record<string, any> = {};
  try { disk = JSON.parse(fs.readFileSync(YFILE, "utf8")); } catch {}
  disk[k] = url;
  fs.writeFileSync(YFILE, JSON.stringify(disk));
  ymtime = -1;
  return url;
}
const filePath = (file: string, w = 320) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=${w}`;

/** Every logo statement (Wikidata P154) of a team with its validity span (P580 start / P582 end qualifiers). */
export async function logoSpans(id: string): Promise<LogoSpan[]> {
  const s = yload();
  if (id in s) return s[id];
  const title = wikiMap().constructors?.[id];
  if (!title) return [];
  const pp: any = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&redirects=1&titles=${encodeURIComponent(title)}`);
  const qid = (Object.values(pp?.query?.pages ?? {})[0] as any)?.pageprops?.wikibase_item;
  const c: any = qid ? await get(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P154`) : null;
  const spans: LogoSpan[] = (c?.claims?.P154 ?? []).filter((st: any) => st.rank !== "deprecated" && st.mainsnak?.datavalue?.value).map((st: any) => ({
    file: st.mainsnak.datavalue.value as string,
    from: yearOf(st.qualifiers?.P580?.[0]?.datavalue?.value?.time),
    to: yearOf(st.qualifiers?.P582?.[0]?.datavalue?.value?.time),
  }));
  yload()[id] = spans;
  let disk: Record<string, LogoSpan[]> = {};
  try { disk = JSON.parse(fs.readFileSync(YFILE, "utf8")); } catch {}
  disk[id] = spans;
  fs.writeFileSync(YFILE, JSON.stringify(disk)); // merge: the build script writes this file too
  ymtime = -1;
  return spans;
}

/* ---------- high-resolution colour catalog (user: 高质量素材、尽可能非单色) ---------- */

/** One logo file: original on upload.wikimedia.org (SVG = vector, any size), validity years, and whether its ink is
 *  mostly dark (then it is unreadable on a dark surface and is served whitened from the SAME source). */
export type LogoFile = { file: string; url: string; svg: boolean; w: number; h: number; from: number | null; to: number | null; dark: boolean | null };
const LOGO_RE = /\b(logo|logos|logotype|wordmark|emblem|badge|crest|roundel)\b/i;
/** "(1997–2001)" → [1997, 2001]; "(2023)" / "2023 logo" → [2023, null] (introduced then) */
function fileSpan(name: string): [number | null, number | null] {
  const n = name.replace(/_/g, " ");
  const r = /(19[4-9]\d|20[0-3]\d)\s*[–—-]\s*(19[4-9]\d|20[0-3]\d|present)/i.exec(n);
  if (r) return [+r[1], /present/i.test(r[2]) ? null : +r[2]];
  const one = /(?:^|[^0-9])(19[4-9]\d|20[0-3]\d)(?![0-9])/.exec(n);
  if (one) return [+one[1], null];
  // "Scuderia Ferrari HP logo 24.svg" → 2024 (two-digit season after "logo")
  const yy = /\blogo[ -]?'?(\d{2})\b/i.exec(n);
  if (yy) { const v = +yy[1]; return [v <= (new Date().getFullYear() % 100) ? 2000 + v : 1900 + v, null]; }
  return [null, null];
}
/** Share of dark ink in an SVG (fills / strokes / stops; no fill at all = black, the SVG default). */
async function svgDark(url: string): Promise<boolean | null> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const t = await r.text();
    const cols = [...t.matchAll(/(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,6}|rgb\([^)]*\)|black|white)/gi)].map((m) => m[1].toLowerCase()).filter((c) => c !== "none");
    if (!cols.length) return true;
    const lum = (c: string) => {
      if (c === "black") return 0; if (c === "white") return 1;
      let rgb: number[];
      if (c.startsWith("#")) { const h = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1, 7); rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
      else rgb = c.replace(/[^\d,]/g, "").split(",").map(Number);
      const [R, G, B] = rgb.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    const dark = cols.filter((c) => lum(c) < 0.12).length;
    return dark / cols.length >= 0.6;
  } catch { return null; }
}
const ylSave = (k: string, v: any) => {
  yload()[k] = v;
  let disk: Record<string, any> = {};
  try { disk = JSON.parse(fs.readFileSync(YFILE, "utf8")); } catch {}
  disk[k] = v;
  fs.writeFileSync(YFILE, JSON.stringify(disk));
  ymtime = -1;
};
/** imageinfo of files (shared Commons files) through en.wikipedia — up to 50 per call */
async function infoOf(titles: string[]) {
  if (!titles.length) return [];
  const j: any = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&titles=${encodeURIComponent(titles.slice(0, 50).join("|"))}`);
  return (Object.values(j?.query?.pages ?? {}) as any[]).filter((p) => p.imageinfo?.[0]).map((p) => ({ title: String(p.title), ii: p.imageinfo[0] }));
}

/**
 * Build `cat:<team>`: the team's logo files — Wikidata P154 statements (with start/end years) and logo files used in
 * its Wikipedia article (years read from the file name) — each with a high-resolution URL and its darkness.
 */
export async function buildLogoCatalog(id: string): Promise<LogoFile[]> {
  const title = wikiMap().constructors?.[id];
  const spans = await logoSpans(id).catch(() => [] as LogoSpan[]);
  const art: any = title ? await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&generator=images&gimlimit=200&redirects=1&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800`) : null;
  const artFiles = (Object.values(art?.query?.pages ?? {}) as any[]).filter((p) => p.imageinfo?.[0] && LOGO_RE.test(p.title) && !/commons-logo|wiki|flag|portal|icon|edit/i.test(p.title))
    .map((p) => ({ title: String(p.title), ii: p.imageinfo[0] }));
  const wd = await infoOf(spans.map((x) => `File:${x.file}`));
  const out: LogoFile[] = [];
  for (const f of [...wd, ...artFiles]) {
    const file = f.title.replace(/^File:/, "");
    if (out.some((o) => o.file === file) || otherSeries(file, id)) continue; // IndyCar / Formula E… logos of the same brand
    const svg = /svg/.test(f.ii.mime ?? "");
    const span = spans.find((x) => x.file.replace(/_/g, " ") === file);
    const [fa, fb] = fileSpan(file);
    out.push({ file, url: svg ? f.ii.url : f.ii.thumburl ?? f.ii.url, svg, w: f.ii.width, h: f.ii.height,
      from: span?.from ?? fa, to: span?.to ?? fb, dark: svg ? await svgDark(f.ii.url) : null });
  }
  ylSave(`cat:${id}`, out);
  return out;
}
const catalog = (id: string): LogoFile[] | undefined => yload()[`cat:${id}`];

export type LogoPic = { url: string | null; caption: string | null; exact: boolean; svg?: boolean; dark?: boolean | null; small?: boolean };
let lifeCache: Map<string, [number, number]> | null = null;
const life = (id: string) => {
  lifeCache ??= new Map(all<any>("select constructor_id t, min(year) a, max(year) b from season_entrant_constructor group by constructor_id").map((r) => [r.t, [r.a, r.b]]));
  return lifeCache.get(id);
};
/** file names that say "this is the racing team" (vs. the car maker's brand mark) */
const teamWords = (file: string) => /\b(f1|formula|team|racing|scuderia|petronas|grand prix|gp|motorsports?|works)\b/i.test(file.replace(/_/g, " "));
/** another series' logo — but a team literally named after a word in the list (Shadow, 1973–80) keeps its own */
const otherSeries = (file: string, id: string) => OTHER_SERIES.test(file.replace(new RegExp(`\\b${id.replace(/-/g, "[ _-]?")}\\b`, "ig"), ""));
/** sister companies sharing the brand (Red Bull Advanced Technologies, Mercedes-AMG High Performance Powertrains…) */
const NOT_TEAM = /\b(advanced technologies|powertrains?|limited|ltd|holdings|group|academy|junior|foundation|museum|heritage|automobil\w*|road cars?|engines?)\b/i;
/** title-sponsor composites (Scuderia Ferrari HP, Oracle Red Bull…) belong to their sponsor era: an undated one is used
 *  only for the team's last two seasons (or without a year) — never for Ferrari 1999 */
const SPONSOR = /\b(hp|petronas|oracle|bwt|stake|kick|moneygram|aramco|cognizant|visa|cash ?app|santander|marlboro|vodafone|mission winnow|shell|uralkali|rich energy|infiniti|orlen)\b/i;
const sponsorOk = (f: { file: string; from: number | null; to: number | null }, id: string, year: number | null) =>
  !SPONSOR.test(f.file) || !year || !!f.from || !!f.to || year >= (life(id)?.[1] ?? 9999) - 1;
const OTHER_SERIES = /\b(arrow|indy ?car|indy|formula e|extreme e|nascar|wec|le mans|gt3|gte|esports?|e-?sports|shadow|electric|rally|hypercar)\b/i;
/** Sync decision from the catalog. `w` = the requested pixel width (2× the CSS size). */
function pickLogo(id: string, year: number | null, w: number, white: boolean): LogoPic | null {
  const small = w <= 160; // F1's own per-season logos (96–160 px): exact year, transparent — right for chips / tiles up to ~70 px wide
  /** F1's own logo of that season (2019–2026), whatever the size asked: the fallback when the catalog has nothing of that year */
  const official = (): LogoPic | null => {
    if (!year) return null;
    if (year === 2026 && teamLogo(id)) return { url: teamLogo(id, 160, white ? "white" : "color"), caption: null, exact: true, small: true };
    if (year === 2025 && NEW_2025[id]) { const sl = NEW_2025[id]; return { url: `https://media.formula1.com/image/upload/c_lfill,w_160/q_auto/v1740000001/common/f1/2025/${sl}/2025${sl}logo${white ? "white" : ""}.webp`, caption: null, exact: true, small: true }; }
    const off = yload()[`@off:${id}@${year}`];
    return off ? { url: off, caption: null, exact: true, small: true } : null;
  };
  if (small && year) {
    if (year === 2026 && teamLogo(id)) return { url: teamLogo(id, 160, white ? "white" : "color"), caption: null, exact: true, small: true };
    if (year === 2025 && NEW_2025[id]) { const sl = NEW_2025[id]; return { url: `https://media.formula1.com/image/upload/c_lfill,w_160/q_auto/v1740000001/common/f1/2025/${sl}/2025${sl}logo${white ? "white" : ""}.webp`, caption: null, exact: true, small: true }; }
    const off = yload()[`@off:${id}@${year}`];
    if (off) return { url: off, caption: null, exact: true, small: true };
  }
  // other series' logos sharing the brand (Arrow McLaren = IndyCar, Formula E, WEC…) are never the F1 team's
  const cat = (catalog(id) ?? []).filter((f) => !otherSeries(f.file, id) && !NOT_TEAM.test(f.file) && sponsorOk(f, id, year));
  if (cat.length) {
    // vector first; a raster must cover the requested width (else it is upscaled and blurry)
    const rank = (f: LogoFile) => (f.svg ? 4 : 0) + (Math.max(f.w, f.h) >= w ? 2 : 0) + (Math.max(f.w, f.h) >= 400 ? 1 : 0);
    const y = year ?? 9999;
    const dated = cat.filter((f) => f.from || f.to).filter((f) => (f.from ?? -Infinity) <= y && y <= (f.to ?? Infinity))
      .sort((a, b) => +teamWords(b.file) - +teamWords(a.file) || (b.from ?? 0) - (a.from ?? 0) || rank(b) - rank(a));
    // never a logo from AFTER the season (Ferrari 2021 ≠ the 2024 「Ferrari HP」 mark): no year-valid file → F1's own logo of
    // that season, else the team's current mark, captioned
    const notLater = (f: LogoFile) => !year || !f.from || f.from <= year;
    const pick = dated[0] ?? [...cat].filter((f) => !f.from && !f.to).sort((a, b) => rank(b) - rank(a))[0] ?? [...cat].filter(notLater).sort((a, b) => (b.from ?? 0) - (a.from ?? 0))[0];
    if (!pick) {
      const off = official();
      if (off) return off;
      if (teamLogo(id)) return { url: teamLogo(id, 160, white ? "white" : "color"), caption: "现用标志", exact: false, small: true };
      return null;
    }
    const lf = life(id);
    // an undated logo is that season's only for a short-lived name (one identity, e.g. Brawn 2009) — else 「现用标志」
    // a car maker's brand mark (Mercedes-Benz star wordmark) is not the team's logo: shown, but captioned
    const brand = !teamWords(pick.file) && cat.some((f) => teamWords(f.file));
    const exact = !brand && (!year || !!dated[0] || (!!lf && lf[1] - lf[0] <= 6 && !pick.from && !pick.to));
    return { url: pick.url, caption: exact ? null : brand ? "品牌标志" : "现用标志", exact, svg: pick.svg, dark: pick.dark };
  }
  return official();
}

/**
 * The team's logo AS IT WAS in `year`, high-resolution and in colour where possible: the catalog logo whose years
 * cover `year` (exact) — else its undated/current logo (exact: false, 「现用标志」); F1's own 96 px per-season logos only
 * for small displays (w ≤ 80); the old single-logo lookup as the last resort.
 */
export async function teamLogoAt(id: string, year: number | null, white = false, w = 480): Promise<LogoPic> {
  if (!catalog(id)) await buildLogoCatalog(id).catch(() => null);
  if (year && year >= 2019 && year <= 2024) await probeLegacyLogo(id, year).catch(() => null);
  return teamLogoAtKnown(id, year, white, w);
}
/** Sync, cached knowledge only (never fetches; an unknown team's catalog is built in the background). */
export function teamLogoAtKnown(id: string, year: number | null, white = false, w = 480): LogoPic {
  const reviewed = baseAsset("team", id, year);
  if (reviewed) return { url: reviewed.url, caption: reviewed.caption, exact: reviewed.exact, svg: reviewed.url.endsWith(".svg") };
  if (!catalog(id)) buildLogoCatalog(id).catch(() => null);
  const p = pickLogo(id, year, w, white);
  if (p) return p;
  const f1 = teamLogo(id, 160, white ? "white" : "color");
  if (f1) return { url: f1, caption: year && year !== 2026 ? "现用标志" : null, exact: !year || year === 2026, small: true };
  const cur = load()[id] ?? null;
  return { url: cur, caption: cur && year ? "现用标志" : null, exact: !year };
}

/** Same logo turned white (for dark surfaces) — from the same vector source, via an SVG colour-matrix filter. */
export async function whitenedSvg(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    let t = await r.text();
    const open = /<svg\b[^>]*>/i.exec(t);
    if (!open) return null;
    const end = t.lastIndexOf("</svg>");
    const head = t.slice(0, open.index + open[0].length), body = t.slice(open.index + open[0].length, end);
    return `${head}<defs><filter id="pw-white"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter></defs><g filter="url(#pw-white)">${body}</g></svg>`;
  } catch { return null; }
}
