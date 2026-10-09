import { baseAsset } from "./baseAssets";
import fs from "node:fs";
import { cutoutKnown } from "./cutout";
import path from "node:path";
import { all, get } from "./db";
import { DRIVERS_2026, TEAMS_2026, driverBust } from "./assets";
import { driverImage } from "./wiki";
import { zhName } from "./zh";
import { categoryFiles, searchFiles, fileInfo, fileTitleOf, fileYear, Throttled, type CommonsFile } from "./commons";

/**
 * A driver's photo FOR A GIVEN SEASON — exact or nothing (the caller then shows F1's own driver placeholder).
 * 1. 2026 grid → official 2026 portrait
 * 2. official F1 season portraits (2025 new CDN; 2015, 2019–2024 legacy "<Y>Drivers/<surname>")
 * 3. Wikimedia Commons "Category:<Full name> in <year>", else a file whose NAME carries his surname and the year.
 *    Every Commons pick must pass `judge`: a solo photo of him (no group shot, no second driver named), not a car on
 *    track / road car / watch / statue, and no other team's kit (no other constructor named in its title, categories
 *    or description).
 * Exact-year storage stays separate from display fallback: missing portraits may use the nearest same-team season,
 * with the source year shown. Another team's uniform is never substituted.
 * Cached in data/period-faces.json as `f2:<id>:<year>` → url | null. Older unprefixed entries (from the guessing
 * resolver) are re-checked once against `judge` and either kept or dropped.
 */
const FILE = path.join(process.cwd(), "data/period-faces.json");
const P = "f2:";
let store: Record<string, string | null> | null = null;
let mtime = -1;
const statM = () => { try { return fs.statSync(FILE).mtimeMs; } catch { return 0; } };
const load = () => {
  const m = statM();
  if (!store || m !== mtime) {
    try { store = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { store ??= {}; }
    mtime = m;
    if (Object.keys(store!).some((k) => !k.startsWith(P))) migrate();
  }
  return store!;
};
/** Several processes write this file (dev server bundles, build script): never write a stale snapshot — re-read the
 *  disk, apply only the keys this process changed, then write. */
const pending = new Map<string, any>();
const put = (k: string, v: any) => { load()[k] = v; pending.set(k, v); };
const save = () => {
  try {
    let disk: Record<string, any> = {};
    try { disk = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {}
    for (const [k, v] of pending) disk[k] = v;
    pending.clear();
    fs.writeFileSync(FILE, JSON.stringify(disk));
    mtime = -1; // re-read (and re-filter) on next load
  } catch {}
};
const inflight = new Map<string, Promise<string | null>>();
const UA = { "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" };
const CDN = "https://media.formula1.com/image/upload";
/** F1's own neutral driver placeholder (also used by /api/face). */
export const F1_FALLBACK_DRIVER = "https://media.formula1.com/image/upload/c_fill,g_north,w_480,h_480/q_auto/common/f1/2026/fallback/driver/2026fallbackdriverright.webp";

/** true = image, false = definitely not there, null = network trouble (do not cache) */
async function ok(url: string): Promise<boolean | null> {
  try {
    const r = await fetch(url, { method: "GET", headers: UA, signal: AbortSignal.timeout(8000) });
    const len = +(r.headers.get("content-length") ?? 0);
    const good = r.ok && /image/.test(r.headers.get("content-type") ?? "") && (len === 0 || len > 4000);
    r.body?.cancel().catch(() => {});
    if (!good && r.status >= 500) return null;
    return good;
  } catch { return null; }
}

/** "Sainz Jr." → "Sainz", "Ahrens, Jr." → "Ahrens" (F1's file names and photo titles use the bare surname) */
const bare = (last: string) => last.replace(/,?\s*\b(jr|sr|ii|iii)\.?$/i, "").trim();
const ascii = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function teamIn(id: string, year: number) {
  return get<any>("select rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = ? order by r.round desc limit 1", year, id)?.t as string | undefined;
}

/** Nearest seasons with the same unambiguous constructor as the requested season. */
export function sameTeamPortraitYears(id: string, year: number): number[] {
  const teams = all<{ t: string }>(`select distinct rr.constructor_id t from race_result rr join race r on r.id = rr.race_id
    where rr.driver_id = ? and r.year = ?`, id, year);
  if (teams.length !== 1) return []; // mid-season transfers need a team-specific photograph, not a guess
  return all<{ y: number }>(`select r.year y from race_result rr join race r on r.id = rr.race_id
    where rr.driver_id = ? and r.year <> ? group by r.year
    having count(distinct rr.constructor_id) = 1 and min(rr.constructor_id) = ?`, id, year, teams[0].t)
    .map((r) => r.y).sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || a - b);
}

class NetErr extends Error {}
async function official(id: string, year: number, d: any) {
  const check = async (u: string) => { const r = await ok(u); if (r === null) throw new NetErr(); return r; };
  if (year === 2026 && DRIVERS_2026[id]) return driverBust(id, 480, 560);
  if (year === 2025) {
    // 2025 new CDN: …/common/f1/2025/<team slug>/<code>/2025<slug><code>right.webp — code = 3+3 letters + "01"
    // (the 2026 table knows current drivers' codes; others are derived and verified by the HTTP check)
    const t = teamIn(id, 2025);
    const slug = t === "kick-sauber" || t === "sauber" ? "kicksauber" : t && TEAMS_2026[t as keyof typeof TEAMS_2026]?.slug;
    const code = DRIVERS_2026[id]?.code ?? `${ascii(d.first_name).slice(0, 3)}${ascii(bare(d.last_name)).slice(0, 3)}01`;
    if (slug) {
      const u = `${CDN}/c_fill,g_north,w_480,h_560/q_auto/v1740000001/common/f1/2025/${slug}/${code}/2025${slug}${code}right.webp`;
      if (await check(u)) return u;
    }
  }
  if (year === 2015 || (year >= 2019 && year <= 2024)) {
    const sur = ascii(bare(d.last_name));
    const u = `${CDN}/f_auto,c_limit,q_auto,w_640/content/dam/fom-website/drivers/${year}Drivers/${sur}`;
    // the legacy folder is keyed by surname only — guard against namesakes (Schumacher, Verstappen…) by checking they raced that year alone
    const namesakes = new Set(all<any>("select distinct dd.id, dd.last_name l from race_result rr join race r on r.id = rr.race_id join driver dd on dd.id = rr.driver_id where r.year = ?", year)
      .filter((x) => ascii(bare(x.l)) === sur).map((x) => x.id)).size;
    if (namesakes <= 1 && (await check(u))) return u;
  }
  return null;
}

/* ---------- judging a Commons file ---------- */

let surnames: string[] | null = null;
/** Other drivers' surnames (≥5 letters) — a file naming two drivers is a two-person photo ("SchumiAlonso", "Webber and Vettel"). */
const others = () => (surnames ??= [...new Set(all<any>("select last_name n from driver").map((r) => ascii(bare(r.n))).filter((n) => n.length >= 5))]);
let teamNames: { id: string; re: RegExp }[] | null = null;
/** Constructor names (≥5 letters) as whole words — to spot another team's kit / car in a title, category or description. */
const STOP = /^(march|eagle|spirit|shadow|arrows|ensign|wolf|kojima|token|connew|emeryson|scirocco)$/i; // also ordinary words / months
const constructors = () => (teamNames ??= all<any>("select distinct name from constructor").filter((c) => c.name.replace(/[^a-z]/gi, "").length >= 5 && !STOP.test(c.name))
  .map((c) => ({ id: String(c.name).toLowerCase(), re: new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s_-]*")}\\b`, "i") })));
let modelRe: RegExp | null = null;
/** "<Constructor> <model with a digit>" = a car ("Benetton B195", "Ferrari 250 GT", "McLaren MP4/4") */
const carNamed = () => (modelRe ??= new RegExp(`\\b(?:${all<any>("select distinct name from constructor").map((c) => c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})[\\s_-]+[A-Z]{0,4}\\d`, "i"));

/** Hard rejects in the file name: objects, events and scenes that are not his face. */
const BAD = /\b(f\d{3,4}|mp4[-\w]*|fw\d+\w*|b19\d|enzo|laferrari|testarossa|road ?car|on track|at the wheel|cockpit|chassis|livery|helmet|brothers|watch|omega|speedmaster|rolex|kart|karting|monoposto|replica|statue|wax|museum|poster|stamp|logo|map|grave|tomb|memorial|plaque|lego|signature|autograph|trophy)\b|_car_|helm\b|firma|copa\b/i;
const OTHER_SERIES = /\b(indy ?500|indianapolis 500|indy ?car|indycar|cart|champ ?car|le mans|wec|dakar|nascar|formula e|daytona|sebring|imsa|supercars?|dtm|rallye?|wrc|super formula|super gt|formula 2|formula 3|gp2|gp3|f2|f3|a1gp|race of champions)\b/i;
const MULTI = /\b(and|with|vs\.?|und|e|y|et|avec|mit|con)\b|&|,|podium|team ?mates?|grid|crew|mechanics|drivers|parade|start|crash|accident|pit ?lane|p[oó]dio|podi|siegerehrung|celebrat/i;
const SOLO = /cropped|portrait|headshot|head ?shot|close-?up|press|interview|paddock/i;
const VEHICLE_CAT = /\b(cars?|automobiles?|vehicles?|cabriolets?|coup[eé]s?|spiders?|roadsters?|single-seaters?|chassis|engines?|racing cars|karts?|helmets?|motorcycles?)\b/i;
const DRIVING = /\b(driving|drives|drove|at the wheel|on track|in (?:the|his) car|car\b|cars\b|lap\b|laps\b|qualifying lap|racing (?:a|his|the))/i;

export type Ctx = { id: string; last: string; year: number; ok: string[] };
/** Names that legitimately appear on his kit that season: his constructors, their engine makers, sister teams. */
const SISTERS: Record<string, string[]> = { "toro-rosso": ["Red Bull"], alphatauri: ["Red Bull"], rb: ["Red Bull"], "racing-bulls": ["Red Bull"], "red-bull": ["Toro Rosso"] };
function ctxOf(id: string, year: number, last: string): Ctx {
  const ok = new Set<string>();
  for (const r of all<any>(`select distinct c.name t, em.name e, sed.constructor_id cid from season_entrant_driver sed join constructor c on c.id = sed.constructor_id
      left join engine_manufacturer em on em.id = sed.engine_manufacturer_id where sed.driver_id = ? and sed.year = ?`, id, year)) {
    ok.add(String(r.t).toLowerCase()); if (r.e) ok.add(String(r.e).toLowerCase());
    for (const x of SISTERS[r.cid] ?? []) ok.add(x.toLowerCase());
  }
  return { id, last, year, ok: [...ok] };
}

/** null = reject; else a score (higher = more likely a solo portrait of him in that season). */
export function judge(f: Pick<CommonsFile, "title" | "width" | "height" | "categories" | "description">, c: Ctx): number | null {
  const title = f.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "");
  const t = ascii(title), me = ascii(c.last);
  if (BAD.test(title)) return null;
  // another series (Alonso at the 2017 Indy 500, Le Mans, Dakar…) is not his F1 season; Indianapolis itself hosted F1 2000–07
  const all3 = `${title} | ${f.categories.join(" | ")} | ${f.description}`;
  if (OTHER_SERIES.test(all3) || (/indianapolis/i.test(all3) && !/grand prix|formula (1|one)|\bf1\b/i.test(all3))) return null;
  if (MULTI.test(title)) return null;
  if (others().some((n) => n !== me && !me.includes(n) && !n.includes(me) && t.includes(n))) return null;
  if (/schumi/i.test(title) && me !== "schumacher") return null;
  if (f.width > f.height * 1.6) return null; // panoramic = a car on track, not a face
  const cats = f.categories.join(" | ");
  if (f.categories.some((k) => VEHICLE_CAT.test(k) || carNamed().test(k))) return null;
  if (carNamed().test(title)) return null;
  const desc = f.description;
  if (DRIVING.test(desc)) return null;
  const descA = ascii(desc);
  if (others().some((n) => n !== me && !me.includes(n) && !n.includes(me) && descA.includes(n))) return null;
  // another team's kit: a constructor named that he did not drive for (or get engines from) that season
  const blob = `${title} | ${cats} | ${desc}`;
  if (constructors().some((k) => ascii(k.id) !== me && k.re.test(blob) && !c.ok.some((n) => n === k.id || k.re.test(n)))) return null;
  let sc = 0;
  if (SOLO.test(title)) sc += 5;
  if (t.includes(me)) sc += 2;
  if (f.height >= f.width * 0.95) sc += 3; else if (f.width > f.height * 1.3) sc -= 3;
  if (f.width < 300) sc -= 3;
  return sc;
}

async function commons(name: string, c: Ctx) {
  const files = await categoryFiles(`Category:${name} in ${c.year}`);
  const scored = files.map((f) => ({ sc: judge(f, c), url: f.url })).filter((x) => x.sc !== null && x.sc >= 0) as { sc: number; url: string }[];
  scored.sort((a, b) => b.sc - a.sc);
  return scored[0]?.url ?? null;
}

/** Full-text Commons search ("<Name> <year> <team>") when no per-year category exists. */
async function commonsSearch(name: string, c: Ctx, team?: string) {
  const files = await searchFiles(`"${name}" ${c.year}${team ? " " + team : ""} filetype:bitmap`);
  let best: { sc: number; url: string } | null = null;
  for (const f of files) {
    // the file name itself must carry the surname AND the year, otherwise it's a guess
    if (!ascii(f.title).includes(ascii(c.last)) || fileYear(f.title) !== c.year) continue;
    const sc = judge(f, c);
    if (sc !== null && sc >= 0 && (!best || sc > best.sc)) best = { sc, url: f.url };
  }
  return best?.url ?? null;
}

/** Last season the driver raced — the default "year" when a page has no year context. */
export function latestYear(id: string) {
  return get<any>("select max(r.year) y from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ?", id)?.y as number | undefined;
}

/** Cached / official answer without touching Commons. undefined = unknown yet. */
export function periodFaceKnown(id: string, year?: number): string | null | undefined {
  const y = year ?? latestYear(id) ?? 2026;
  const reviewed = baseAsset("driver", id, y);
  if (reviewed) return reviewed.url;
  const s = load();
  if (`${P}${id}:${y}` in s) return s[`${P}${id}:${y}`];
  if (y === 2026 && DRIVERS_2026[id]) return driverBust(id, 480, 560);
  return undefined;
}

/** Non-blocking variant for HTTP handlers: cached answer if known, otherwise the official portrait (F1 CDN, quick);
 *  else start the Commons lookup in the background and answer "nothing yet" (→ placeholder, short cache). */
export async function periodFaceFast(id: string, year?: number): Promise<{ url: string | null; final: boolean }> {
  const y = year ?? latestYear(id) ?? 2026;
  const k = periodFaceKnown(id, y);
  if (k !== undefined) return { url: k, final: true };
  const d = get<any>("select id, name, first_name, last_name, full_name from driver where id = ?", id);
  if (d) {
    const off = await Promise.race([official(id, y, d).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 2500))]);
    if (off) { put(`${P}${id}:${y}`, off); save(); return { url: off, final: true }; }
  }
  periodFace(id, y).catch(() => {}); // fill the cache for next time
  return { url: null, final: false };
}

export async function periodFace(id: string, year?: number): Promise<string | null> {
  const y = year ?? latestYear(id) ?? 2026;
  const reviewed = baseAsset("driver", id, y);
  if (reviewed) return reviewed.url;
  const key = `${P}${id}:${y}`;
  const s = load();
  if (key in s) return s[key];
  if (inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
    try {
      const d = get<any>("select id, name, first_name, last_name, full_name from driver where id = ?", id);
      if (!d) return null;
      const raced = all<any>("select distinct r.year y from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ?", id).map((r) => r.y as number);
      let url: string | null = null;
      // a season he did not race has no period photo (the page shows the placeholder)
      if (raced.includes(y)) {
        const c = ctxOf(id, y, bare(d.last_name));
        url = await official(id, y, d);
        if (!url) url = await commons(d.name, c);
        if (!url && d.full_name && d.full_name !== d.name) url = await commons(d.full_name, c);
        if (!url) url = await commonsSearch(d.name, c); // file name must carry surname + year; one request
      }
      put(key, url);
      save();
      return url;
    } catch (e) {
      if (e instanceof Throttled || e instanceof NetErr) return null; // temporary: not cached, retried on a later request
      throw e;
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* ---------- hero picture: { url, caption, exact } ---------- */

export type FacePic = {
  url: string; caption: string | null; exact: boolean;
  sourceYear?: number;
  /** cut = official transparent bust; photo = photograph; placeholder = F1's neutral driver placeholder */
  kind: "cut" | "photo" | "placeholder";
};

/**
 * The driver picture for a hero: exact season first, then the nearest same-team season with an explicit caption.
 * If neither is known, use the placeholder captioned
 * 「暂无 Y 年照片」; without → his current official bust (2026 grid), else the photo of his last season captioned
 * 「Y 年 · 车队」, else the Wikipedia lead photo captioned as a reference photo (with its year when the file says it),
 * else the placeholder. Never another season's photo passed off as this one.
 */
export async function driverHeroImage(id: string, year?: number | null): Promise<FacePic> {
  return driverHeroKnown(id, year);
}
/** Never blocks on the network: answers from the cache (an unknown season starts its lookup in the background). */
function faceNow(id: string, year: number): string | null {
  const k = periodFaceKnown(id, year);
  if (k === undefined) { periodFace(id, year).catch(() => {}); return null; }
  return k;
}
function seasonPortraitKnown(id: string, year: number): FacePic {
  const url = faceNow(id, year);
  if (url) return { url, caption: null, exact: true, kind: year === 2026 && DRIVERS_2026[id] ? "cut" : "photo", sourceYear: year };
  const neighbours = sameTeamPortraitYears(id, year);
  for (const y of neighbours) {
    const near = periodFaceKnown(id, y);
    if (near) return { url: near, caption: `图为 ${y} 年 · ${zhName.team(teamIn(id, y)!) ?? teamIn(id, y)}`, exact: false,
      kind: y === 2026 && DRIVERS_2026[id] ? "cut" : "photo", sourceYear: y };
  }
  // Only the immediately adjacent candidates are warmed; rendering never waits for a chain of network lookups.
  for (const y of neighbours.filter((y) => Math.abs(y - year) === 1)) {
    if (periodFaceKnown(id, y) === undefined) periodFace(id, y).catch(() => {});
  }
  return { url: F1_FALLBACK_DRIVER, caption: `暂无 ${year} 年及同队相邻年份照片`, exact: false, kind: "placeholder" };
}
function driverHeroKnown0(id: string, year?: number | null): FacePic {
  if (year) {
    return seasonPortraitKnown(id, year);
  }
  if (DRIVERS_2026[id]) return { url: driverBust(id, 860, 1000)!, caption: null, exact: true, kind: "cut" };
  const ly = latestYear(id);
  if (ly) {
    const url = faceNow(id, ly);
    const t = teamIn(id, ly);
    if (url) return { url, caption: `${ly} 年${t ? ` · ${zhName.team(t) ?? t}` : ""}`, exact: false, kind: "photo" };
  }
  const k = `${P}wiki:${id}`;
  const wiki = load()[k];
  if (wiki === undefined) driverImage(id).then((u) => { put(k, u ?? null); save(); }).catch(() => {});
  if (wiki) {
    const fy = fileYear(wiki.split("/").pop()!.split("?")[0]);
    return { url: wiki, caption: fy ? `资料照片 · ${fy} 年` : "资料照片 · 年份不详", exact: false, kind: "photo" };
  }
  return { url: F1_FALLBACK_DRIVER, caption: "暂无照片", exact: false, kind: "placeholder" };
}

/** Shared season portrait selection for every hero, tile and avatar. */
async function driverPhotoAt0(id: string, year: number): Promise<FacePic> {
  await periodFace(id, year).catch(() => null);
  return seasonPortraitKnown(id, year);
}
/** Same, cached knowledge only (sync; an unknown season is looked up in the background). */
function driverPhotoKnown0(id: string, year: number): FacePic {
  return seasonPortraitKnown(id, year);
}

/* ---------- one-off re-check of entries cached by the old guessing resolver ---------- */
let migrating = false;
function migrate() {
  if (migrating) return;
  migrating = true;
  (async () => {
    const s = store!;
    const old = Object.entries(s).filter(([k]) => !k.startsWith(P));
    const commonsOld: { k: string; id: string; y: number; url: string; title: string }[] = [];
    for (const [k, url] of old) {
      const m = /^(.+):(\d{4})$/.exec(k);
      delete s[k];
      if (!m || !url) continue;
      const [, id, ys] = m, y = +ys;
      if (`${P}${k}` in s) continue;
      // official portraits are kept only when they are THAT season's (2023 key → 2023Drivers / 2025 key → /2025/)
      if (/media\.formula1\.com/.test(url)) {
        if (url.includes(`/${y}Drivers/`) || url.includes(`/common/f1/${y}/`)) s[`${P}${k}`] = url;
        continue;
      }
      const title = fileTitleOf(url);
      // en.wikipedia lead photos were the "latest photo" guess — never that season's by evidence
      if (!title || /utm_source=en\.wikipedia/.test(url)) continue;
      commonsOld.push({ k, id, y, url, title });
    }
    fs.writeFileSync(FILE, JSON.stringify(s)); mtime = -1; // the old keys must really go: full write
    for (let i = 0; i < commonsOld.length; i += 50) {
      const batch = commonsOld.slice(i, i + 50);
      let info: CommonsFile[] = [];
      try { info = await fileInfo(batch.map((b) => b.title)); } catch { continue; }
      const byTitle = new Map(info.map((f) => [f.title, f]));
      for (const b of batch) {
        const f = byTitle.get(b.title);
        const d = get<any>("select name, last_name from driver where id = ?", b.id);
        if (!f || !d) continue;
        // year evidence: the per-season category, or the year written in the file name
        const inYear = f.categories.some((c) => c.endsWith(` in ${b.y}`) && ascii(c).includes(ascii(bare(d.last_name)))) || fileYear(f.title) === b.y;
        const sc = inYear ? judge(f, ctxOf(b.id, b.y, bare(d.last_name))) : null;
        if (sc !== null && sc >= 0) put(`${P}${b.k}`, b.url);
      }
      save();
    }
  })().catch(() => {}).finally(() => { migrating = false; });
}

/* ---------- cutouts (user: 单人照能抠图，就把这个图抠掉，把这个人留下来) ---------- */
/** a single-person photo → its background-removed cutout once lib/cutout has made one (queued in the background) */
const lift = (p: FacePic): FacePic => {
  if (p.kind !== "photo") return p;
  const cut = cutoutKnown(p.url);
  return cut ? { ...p, url: cut, kind: "cut" } : p;
};
export const driverHeroKnown = (id: string, year?: number | null): FacePic => lift(driverHeroKnown0(id, year));
export const driverPhotoKnown = (id: string, year: number): FacePic => lift(driverPhotoKnown0(id, year));
export const driverPhotoAt = async (id: string, year: number): Promise<FacePic> => lift(await driverPhotoAt0(id, year));
