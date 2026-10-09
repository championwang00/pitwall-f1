import { baseAsset } from "./baseAssets";
import fs from "node:fs";
import path from "node:path";
import { all, get } from "./db";
import { teamCar, TEAMS_2026 } from "./assets";
import { summary, searchTitle, wikiThumb } from "./wiki";
import { searchFiles, categoryFiles, fileYear, Throttled } from "./commons";
import { cachedJSON, httpFailures } from "./cache";

/**
 * ONE picture rule for cars and teams (user: 有就有，没有就没有，但不要配得不准确；兜底也要有图):
 *  1. EXACT — the picture shows this object as it was: car → that chassis; team@Y → a chassis the team raced in Y
 *     (official F1 2026 car art for the 2026 grid).
 *  2. REPRESENTATIVE — only without a year context, and always with a caption naming what is shown
 *     (team → its most-winning chassis that has a photo: 「Lotus 25 · 1964」).
 *  3. PLACEHOLDER — F1's own neutral fallback car, captioned 「暂无 1994 年赛车照片」 / 「暂无该车照片」.
 *     Never another car / year passed off as this one. There is always a picture.
 *
 * Which chassis a photo shows is decided from evidence, not hope: the Wikipedia article must be about this car (or its
 * family), the file name must not name a sibling chassis, and a year written in the file name must be a season the
 * chassis raced (else the photo is re-assigned to the family member that raced that year — "Lotus 107 … 1993" is a 107B).
 * Results cached in data/car-images.json as `ch:<chassis>` → { u: url, d: depicted chassis | null, y: photo year, t: file }.
 * The cache file is watched (mtime), so photos added by another process appear without a restart.
 */
export const F1_FALLBACK_CAR = "https://media.formula1.com/image/upload/c_lfill,w_1200/q_auto/common/f1/2026/fallback/car/2026fallbackcarright.webp";

export type Pic = {
  url: string;
  /** small Chinese caption naming what is shown (null only for an exact picture whose subject is obvious) */
  caption: string | null;
  /** true = shows exactly this object in this context */
  exact: boolean;
  /** official = transparent F1 side view; photo = photograph (cover); placeholder = F1 fallback car (transparent) */
  kind: "official" | "photo" | "placeholder";
  /** chassis actually shown, when known */
  depicts?: string | null;
};
type Rec = { u: string; d: string | null; y: number | null; t: string } | null;
/** official F1 car art for team@year: url, chassis it shows, file hash, exact (false = F1 re-used another year's file) */
type Off = { u: string; d: string | null; h: string; x: boolean } | null;

const FILE = path.join(process.cwd(), "data/car-images.json");
let store: Record<string, any> | null = null;
let mtime = -1;
const statM = () => { try { return fs.statSync(FILE).mtimeMs; } catch { return 0; } };
function load(): Record<string, any> {
  const m = statM();
  if (!store || m !== mtime) {
    try {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<string, any>;
      // only entries of the evidence-checked resolver (`ch:`) are trusted; older `c:` / `t:` guesses are dropped
      store = Object.fromEntries(Object.entries(raw).filter(([k]) => k.startsWith("ch:") || k.startsWith("off:")));
    } catch { store ??= {}; }
    mtime = m;
  }
  return store!;
}
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

/* ---------- matching a file / article name to a chassis ---------- */

/** "HillGraham19690801Lotus-Nordkehre" → "hill graham 19690801 lotus nordkehre"; "MP4/4" → "mp 4 4" */
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
export function words(s: string) {
  return dec(s).replace(/\.[a-z]{3,4}$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
type Ch = { id: string; name: string; full_name: string; t: string; tname: string; years: number[] };
const chCache = new Map<string, Ch | null>();
function chassisRow(id: string): Ch | null {
  if (chCache.has(id)) return chCache.get(id)!;
  const r = get<any>("select ch.id, ch.name, ch.full_name, ch.constructor_id t, c.name tname from chassis ch join constructor c on c.id = ch.constructor_id where ch.id = ?", id);
  const v = r ? { ...r, years: all<any>("select distinct year from season_entrant_chassis where chassis_id = ? order by year", id).map((x) => x.year as number) } as Ch : null;
  chCache.set(id, v);
  return v;
}
const siblings = (t: string) => all<any>("select id from chassis where constructor_id = ?", t).map((r) => chassisRow(r.id)!).filter(Boolean);

/** Regex finding this chassis named in a `words()` string — not a longer variant ("FW14" ≠ "FW14 B", "312 T" ≠ "312 T 2"). */
function nameRe(ch: Ch) {
  const model = words(ch.name);
  const team = words(ch.tname).replace(/ /g, "");
  const teamRe = team.split("").map(esc).join(" ?");
  const compact = model.replace(/ /g, "");
  const distinctive = /[a-z]/.test(compact) && /\d/.test(compact) && compact.length >= 4 && !/^[a-z]?\d+[a-z]?$/.test(compact);
  const body = model.split(" ").map(esc).join(" ?");
  const tail = "(?! ?(?:[a-z]|\\d{1,2}|hours?|heures|h)(?: |$))(?: |$)";
  return new RegExp(distinctive ? `(?:^| )${body}${tail}` : `(?:^| )${teamRe}(?: [a-z]+){0,2} ${body}${tail}`);
}
/** chassis of `team` named in a file / article name (longest name wins) */
function namedChassis(s: string, team: string): Ch[] {
  const w = words(s);
  return siblings(team).filter((c) => nameRe(c).test(w)).sort((a, b) => words(b.name).length - words(a.name).length);
}
/** members of the same model family (107 / 107B / 107C) */
function family(ch: Ch) {
  const base = words(ch.name).replace(/( [a-z])+$/, "");
  return siblings(ch.t).filter((c) => words(c.name).replace(/( [a-z])+$/, "") === base);
}

const BAD = /\b(rear|nose|wing|gearbox|suspension|tyres?|wheel|detail|interior|model|models|scale|diecast|die cast|lego|toy|replica|poster|stamp|logo|engine|steering|cockpit|helmet|badge|plaque|drawing|sketch|diagram|livery|mock ?up|showcar|show car|tamiya|minichamps|slot ?car)\b/;

/** Which chassis a photo shows, given the article/candidate it came from. null = cannot tell. */
function depicts(file: string, ch: Ch, articleExact: Ch | null): Ch | null {
  const y = fileYear(file);
  const named = namedChassis(file, ch.t);
  if (named.length > 1 && words(named[0].name).length === words(named[1].name).length) return null; // two cars named
  const who: Ch | null = named[0] ?? articleExact;
  if (!who) {
    // only the family is known (article "Lotus 72"): the year decides, if exactly one family member raced then
    const fam = y ? family(ch).filter((c) => c.years.includes(y)) : [];
    return fam.length === 1 ? fam[0] : null;
  }
  if (y && !who.years.includes(y)) {
    const fam = family(who).filter((c) => c.years.includes(y));
    if (fam.length === 1) return fam[0];
    // a later demo run of a car (Goodwood 2001) is still that car; a photo from before it existed is not
    if (y < who.years[0] - 1 || fam.length > 1) return null;
  }
  return who;
}
const famBase = (name: string) => words(name).replace(/( [a-z])+$/, "");

const leadPhoto = (s: any) => {
  const t = s?.thumbnail?.source as string | undefined;
  if (!t || /\.svg/i.test(t) || /logo/i.test(t)) return null;
  const file = decodeURIComponent((s.originalimage?.source ?? t).split("/").pop()!.split("?")[0]);
  const url = s.originalimage?.width && s.originalimage.width < 960 ? s.originalimage.source : wikiThumb(t, 960);
  return { url: url as string, file };
};

const YEAR_S = 60 * 60 * 24 * 365;
/** Wikidata of a Wikipedia article: P373 Commons category + P18 image (wikidata.org — not the rate-limited Commons API). */
async function wikidataOf(wikibase: string | undefined): Promise<{ cat: string | null; image: string | null }> {
  if (!wikibase) return { cat: null, image: null };
  try {
    const j = await cachedJSON<any>(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${wikibase}`, YEAR_S);
    const v = (p: string) => j?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value ?? null;
    return { cat: v("P373"), image: v("P18") };
  } catch { return { cat: null, image: null }; }
}
/** Photos used in the Wikipedia article itself (en.wikipedia API, imageinfo of the shared Commons files). */
async function articleImages(title: string) {
  try {
    const j = await cachedJSON<any>(`https://en.wikipedia.org/w/api.php?action=query&format=json&generator=images&gimlimit=50&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=960`, YEAR_S);
    return (Object.values(j?.query?.pages ?? {}) as any[]).map((f) => ({ title: String(f.title), ii: f.imageinfo?.[0] }))
      .filter((f) => f.ii && /jpeg|png|webp/.test(f.ii.mime ?? "")).map((f) => ({ title: f.title, url: (f.ii.thumburl ?? f.ii.url) as string, width: f.ii.width as number, height: f.ii.height as number }));
  } catch { return []; }
}
let otherTeams: { id: string; re: RegExp }[] | null = null;
/** An article photo counts only if its file name names this team (or this car) and no other constructor —
 *  articles also show rivals and predecessors ("Honda RA109" in the Brawn article). */
function teamOnly(w: string, ch: Ch) {
  otherTeams ??= all<any>("select id, name from constructor").filter((c) => c.name.replace(/[^a-z]/gi, "").length >= 4)
    .map((c) => ({ id: c.id as string, re: new RegExp(`(?:^| )${words(c.name).replace(/ /g, " ?")}(?: |$)`) }));
  const mine = new RegExp(`(?:^| )${words(ch.tname).replace(/ /g, " ?")}(?: |$)`);
  if (!mine.test(w) && !nameRe(ch).test(w)) return false;
  return !otherTeams.some((t) => t.id !== ch.t && t.re.test(w) && !t.re.test(words(ch.tname)) && !engineOf(ch).some((e) => t.re.test(e)));
}
const engineCache = new Map<string, string[]>();
/** engine makers' names of this chassis ("McLaren Mercedes", "Lotus-Ford" file names are fine) */
function engineOf(ch: Ch) {
  if (!engineCache.has(ch.id)) engineCache.set(ch.id, all<any>("select distinct em.name n from season_entrant_chassis sec join engine_manufacturer em on em.id = sec.engine_manufacturer_id where sec.chassis_id = ?", ch.id).map((r) => words(r.n)));
  return engineCache.get(ch.id)!;
}
const filePathUrl = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=960`;

/** Ranking among photos that show the right car: a period photo (year in a season it raced) beats a museum / demo run;
 *  a landscape racing / side view beats a portrait-format detail; the curated Wikipedia lead image gets a small bonus. */
function score(c: { d: string | null; y: number | null; w: number; h: number; lead?: boolean }, ch: Ch) {
  const shown = chassisRow(c.d ?? "") ?? ch;
  let sc = 0;
  if (c.y && shown.years.includes(c.y)) sc += 4; else if (c.y && c.y > (shown.years.at(-1) ?? 0) + 1) sc -= 1;
  if (c.w >= c.h * 1.2) sc += 2; else if (c.h > c.w) sc -= 2;
  if (c.w >= 800) sc += 1;
  if (c.lead) sc += 1;
  return sc;
}

/** → [best photo, partial]: partial = a source could not be asked (rate limit / network) — shown but not cached unless exact */
async function resolve(ch: Ch): Promise<[Rec, boolean]> {
  let partial = false;
  const fails0 = httpFailures();
  const cands: { rec: NonNullable<Rec>; sc: number }[] = [];
  const add = (u: string, file: string, who: Ch | null, w: number, h: number, lead = false) => {
    const y = fileYear(file);
    cands.push({ rec: { u, d: who?.id ?? null, y, t: file }, sc: score({ d: who?.id ?? null, y, w, h, lead }, ch) });
  };
  const fam = family(ch);
  const famIds = new Set(fam.map((f) => f.id));
  // 1. the Wikipedia article about this car (or its family): lead image + its Commons category
  const titles = [ch.full_name, await searchTitle(`${ch.full_name} Formula One car`).catch(() => null)];
  const seen = new Set<string>();
  const cats: { cat: string; exactArt: Ch | null }[] = [];
  for (const title of titles) {
    const s: any = title ? await summary(title).catch(() => null) : null;
    if (!s || seen.has(s.title)) continue;
    seen.add(s.title);
    const bare = s.title.replace(/\s*\(.*\)$/, "");
    const art = namedChassis(bare, ch.t);
    const exactArt = art.find((c) => words(c.name) === words(bare).replace(words(ch.tname), "").trim()) ?? null;
    const artBase = famBase(words(bare).replace(words(ch.tname), "").trim());
    // the article must be about this car or its family — never "the closest search hit"
    const sameFamily = art.some((c) => famIds.has(c.id)) || (words(bare).startsWith(words(ch.tname)) && artBase === famBase(ch.name));
    const p = leadPhoto(s);
    if (p && !BAD.test(words(p.file)) && (sameFamily || nameRe(ch).test(words(p.file))))
      add(p.url, p.file, depicts(p.file, ch, sameFamily ? exactArt : null), s.originalimage?.width ?? 960, s.originalimage?.height ?? 640, true);
    if (sameFamily) {
      // the article's own photos (each judged by its file name / year), and its Wikidata image
      for (const f of await articleImages(s.title)) {
        const w = words(f.title.replace(/^File:/, ""));
        if (BAD.test(w) || f.width < 500 || f.height > f.width || !teamOnly(w, ch)) continue;
        add(f.url, f.title.replace(/^File:/, ""), depicts(f.title, ch, exactArt), f.width, f.height);
      }
      const wd = await wikidataOf(s.wikibase_item);
      if (wd.image && !BAD.test(words(wd.image))) add(filePathUrl(wd.image), wd.image, depicts(wd.image, ch, exactArt), 960, 640);
      if (wd.cat) cats.push({ cat: wd.cat, exactArt });
    }
  }
  // 2. the article's Commons category (every file in it shows this car / family), 3. files naming this exact chassis
  try {
    for (const { cat, exactArt } of cands.some((c) => c.rec.d === ch.id) ? [] : cats) {
      for (const f of await categoryFiles(`Category:${cat}`, 50)) {
        const w = words(f.title.replace(/^File:/, ""));
        if (BAD.test(w) || f.width < 500 || f.categories.some((c) => /\b(models?|replicas?|toys?|engines?|cockpits?|details?|steering wheels?)\b/i.test(c))) continue;
        add(f.url, f.title.replace(/^File:/, ""), depicts(f.title, ch, exactArt), f.width, f.height);
      }
    }
    if (!cands.some((c) => c.rec.d === ch.id)) {
      const re = nameRe(ch);
      for (const q of [`"${ch.full_name}"`, `"${ch.full_name}" ${ch.years[0] ?? ""}`]) {
        for (const f of await searchFiles(q, 20)) {
          const w = words(f.title.replace(/^File:/, ""));
          if (!re.test(w) || BAD.test(w) || f.width < 400) continue;
          if (namedChassis(f.title, ch.t).some((c) => c.id !== ch.id)) continue; // names another car too
          add(f.url, f.title.replace(/^File:/, ""), depicts(f.title, ch, ch), f.width, f.height);
        }
        if (cands.some((c) => c.rec.d === ch.id)) break;
      }
    }
  } catch (e) { partial = true; if (!(e instanceof Throttled)) console.warn("[carImage] commons", ch.id, String(e)); }
  const pick = (ok: (c: (typeof cands)[number]) => boolean) => cands.filter(ok).sort((a, b) => b.sc - a.sc)[0]?.rec ?? null;
  // exact first; else a family member's photo (shown captioned on the car page only)
  const best = pick((c) => c.rec.d === ch.id) ?? pick((c) => !c.rec.d || famIds.has(c.rec.d));
  // a Wikipedia / Wikidata call that failed (rate limit) means "could not ask", not "no photo": don't cache that
  if (httpFailures() > fails0) partial = true;
  return [best, partial && best?.d !== ch.id];
}
const inflight = new Map<string, Promise<Rec>>();
/** The best photo found for one chassis (exact or family), cached. */
export async function chassisPhoto(id: string): Promise<Rec> {
  const k = `ch:${id}`;
  if (k in load()) return load()[k];
  if (inflight.has(k)) return inflight.get(k)!;
  const p = (async () => {
    const ch = chassisRow(id);
    if (!ch) return null;
    const [r, partial] = await resolve(ch).catch((e): [Rec, boolean] => { console.warn("[carImage]", id, String(e)); return [null, true]; });
    if (!partial || r?.d === id) { put(k, r); save(); }
    return r;
  })().finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
/** Cached answer only (sync, never fetches): for list pages that must not wait. undefined = not looked up yet. */
export function knownChassisPhoto(id: string): Rec | undefined {
  const reviewed = baseAsset("car", id);
  if (reviewed) return { u: reviewed.url, d: id, y: reviewed.depictsYear ?? null, t: reviewed.source };
  const k = `ch:${id}`;
  return k in load() ? load()[k] : undefined;
}

/* ---------- official F1 car art, 2019–2025 (2026: lib/assets teamCar) ---------- */

const CDN = "https://media.formula1.com/image/upload";
/** formula1.com legacy team-page car files, 2019–2024: content/dam/fom-website/teams/<year>/<slug>.png */
const LEGACY: Record<string, string[]> = {
  mercedes: ["mercedes"], ferrari: ["ferrari"], mclaren: ["mclaren"], "red-bull": ["red-bull-racing"], williams: ["williams"],
  "alfa-romeo": ["alfa-romeo", "alfa-romeo-racing"], haas: ["haas-f1-team", "haas"], "racing-point": ["racing-point"], "toro-rosso": ["toro-rosso"],
  alphatauri: ["alphatauri"], renault: ["renault"], alpine: ["alpine"], "aston-martin": ["aston-martin"], "kick-sauber": ["kick-sauber"], rb: ["rb"],
};
/** 2025 new CDN slugs (same scheme as 2026) */
const NEW_2025: Record<string, string> = {
  mercedes: "mercedes", ferrari: "ferrari", mclaren: "mclaren", "red-bull": "redbullracing", williams: "williams", alpine: "alpine",
  "aston-martin": "astonmartin", haas: "haasf1team", "racing-bulls": "racingbulls", "kick-sauber": "kicksauber",
};
/** 2024 on the new CDN (the legacy 2024 files are mostly the 2023 cars re-used: Mercedes 2024 = W14, not W15) */
const NEW_2024: Record<string, string> = {
  mercedes: "mercedes", ferrari: "ferrari", mclaren: "mclaren", "red-bull": "redbullracing", williams: "williams", alpine: "alpine",
  "aston-martin": "astonmartin", haas: "haas", rb: "rb", "kick-sauber": "kicksauber",
};
const officialUrls = (team: string, year: number) =>
  year === 2024 && NEW_2024[team] ? [`${CDN}/c_lfill,w_1200/q_auto/common/f1/2024/${NEW_2024[team]}/2024${NEW_2024[team]}carright.webp`]
  : year === 2025 ? (NEW_2025[team] ? [`${CDN}/c_lfill,w_1200/q_auto/v1740000001/common/f1/2025/${NEW_2025[team]}/2025${NEW_2025[team]}carright.webp`] : [])
  : year >= 2019 && year <= 2024 ? (LEGACY[team] ?? []).map((sl) => `${CDN}/f_auto,c_limit,q_auto,w_1200/content/dam/fom-website/teams/${year}/${sl}.png`) : [];

async function hashOf(url: string): Promise<string | null | undefined> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "PITWALL-demo/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok || !/image/.test(r.headers.get("content-type") ?? "")) return r.status >= 500 ? undefined : null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 4000) return null;
    const { createHash } = await import("node:crypto");
    return createHash("md5").update(buf).digest("hex");
  } catch { return undefined; } // network trouble: unknown, not cached
}

const offInflight = new Map<string, Promise<void>>();
/**
 * Probe F1's official car art for every season 2019–2025 of `team`, then decide exactness: F1 re-used files across
 * seasons (Mercedes 2023 = 2024, McLaren 2020 = 2021). A file is exact only for the season whose car it is — the
 * earliest season with that file — and for later seasons only if the team raced the same chassis.
 */
export async function probeOfficial(team: string): Promise<void> {
  if (offInflight.has(team)) return offInflight.get(team);
  const p = (async () => {
    const years = all<any>("select distinct year from season_entrant_constructor where constructor_id = ? and year between 2019 and 2025 order by year", team).map((r) => r.year as number);
    const found: { year: number; url: string; h: string }[] = [];
    let incomplete = false;
    for (const y of years) {
      if (`off:${team}@${y}` in load()) { const o = load()[`off:${team}@${y}`] as Off; if (o) found.push({ year: y, url: o.u, h: o.h }); continue; }
      const cands: { url: string; h: string }[] = [];
      for (const u of officialUrls(team, y)) { const h = await hashOf(u); if (h === undefined) incomplete = true; else if (h) cands.push({ url: u, h }); }
      // prefer a file not already used by an earlier season (alfa-romeo-racing 2022 = 2021 file, alfa-romeo 2022 = new)
      const pick = cands.find((c) => !found.some((f) => f.h === c.h)) ?? cands[0];
      if (pick) found.push({ year: y, ...pick });
      else if (!incomplete) put(`off:${team}@${y}`, null);
    }
    for (const f of found) {
      const k = `off:${team}@${f.year}`;
      if (k in load()) continue;
      const first = found.find((g) => g.h === f.h)!; // earliest season using this file
      const d = chassisOf(team, f.year)[0] ?? null;
      const x = first.year === f.year || (d !== null && d === chassisOf(team, first.year)[0]);
      put(k, { u: f.url, d: x ? d : chassisOf(team, first.year)[0] ?? null, h: f.h, x } as Off);
    }
    save();
  })().finally(() => offInflight.delete(team));
  offInflight.set(team, p);
  return p;
}
const knownOfficial = (team: string, year: number): Off | undefined => load()[`off:${team}@${year}`];
/** official art known to show exactly this chassis (any season it raced) */
function officialFor(id: string): NonNullable<Off> | null {
  const ch = chassisRow(id);
  if (!ch) return null;
  for (const y of [...ch.years].reverse()) { const o = knownOfficial(ch.t, y); if (o && o.x && o.d === id) return o; }
  return null;
}

/* ---------- public helpers: { url, caption, exact } ---------- */

const official2026 = (id: string) => { const ch = chassisRow(id); return ch && ch.years.includes(2026) && ch.t in TEAMS_2026 ? ch : null; };
const nameOf = (id: string | null | undefined) => (id ? chassisRow(id)?.full_name ?? id : "");
/** the season a chassis is best remembered for: most wins, else first season */
function mainYear(id: string) {
  const r = get<any>(`select r.year y, count(*) n from race_result rr join race r on r.id = rr.race_id
    join season_entrant_driver sed on sed.year = r.year and sed.driver_id = rr.driver_id and sed.constructor_id = rr.constructor_id
    join season_entrant_chassis sec on sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id
    where sec.chassis_id = ? and rr.position_number = 1 group by r.year order by n desc, r.year limit 1`, id);
  return (r?.y as number | undefined) ?? chassisRow(id)?.years[0];
}
const photoYear = (rec: NonNullable<Rec>) => {
  const shown = chassisRow(rec.d ?? "");
  return rec.y && shown?.years.includes(rec.y) ? rec.y : shown ? mainYear(shown.id) : rec.y;
};

/** Picture from an already-known record (sync). `family`: allow a captioned sibling/family photo (no year context only). */
function carPic(id: string, rec: Rec | undefined, family = false): Pic {
  const reviewed = baseAsset("car", id);
  if (reviewed) return { url: reviewed.url, caption: reviewed.caption, exact: reviewed.exact, kind: "photo", depicts: id };
  const off = official2026(id);
  if (off) return { url: teamCar(off.t, 1600)!, caption: null, exact: true, kind: "official", depicts: id };
  const o = officialFor(id);
  if (o) return { url: o.u, caption: null, exact: true, kind: "official", depicts: id };
  if (rec && rec.d === id) return { url: rec.u, caption: null, exact: true, kind: "photo", depicts: id };
  if (family && rec) {
    const y = photoYear(rec);
    const cap = rec.d ? `图为同系列的 ${nameOf(rec.d)}` : `图为 ${nameOf(id).replace(/[A-Z]+$/, "")} 系列（具体型号不详）`;
    return { url: rec.u, caption: `${cap}${y ? ` · ${y}` : ""}`, exact: false, kind: "photo", depicts: rec.d };
  }
  return { url: F1_FALLBACK_CAR, caption: "暂无该车照片", exact: false, kind: "placeholder", depicts: null };
}

/** A chassis: its own photo, else (car page only, `family`) a captioned family photo, else the placeholder. */
export async function carImage(id: string, opts: { family?: boolean } = {}): Promise<Pic> {
  if (baseAsset("car", id)) return carPic(id, null);
  const ch = chassisRow(id);
  if (ch && ch.years.some((y) => y >= 2019 && y <= 2025) && ch.years.some((y) => knownOfficial(ch.t, y) === undefined)) await probeOfficial(ch.t);
  return carPic(id, official2026(id) || officialFor(id) ? null : await chassisPhoto(id), opts.family);
}
/** Sync variant for card grids: cached knowledge only; an unknown chassis is looked up in the background. */
export function carImageKnown(id: string, opts: { family?: boolean } = {}): Pic {
  if (baseAsset("car", id)) return carPic(id, null);
  if (official2026(id) || officialFor(id)) return carPic(id, null);
  const ch = chassisRow(id);
  if (ch && ch.years.some((y) => y >= 2019 && y <= 2025 && knownOfficial(ch.t, y) === undefined)) probeOfficial(ch.t).catch(() => {});
  const rec = knownChassisPhoto(id);
  if (rec === undefined) chassisPhoto(id).catch(() => {});
  return carPic(id, rec, opts.family);
}

/** Chassis a team raced in one year, most-raced first. */
function chassisOf(team: string, year: number) {
  return all<any>(`select sec.chassis_id id, count(distinct sed.driver_id) n from season_entrant_chassis sec
    left join season_entrant_driver sed on sed.year = sec.year and sed.entrant_id = sec.entrant_id and sed.constructor_id = sec.constructor_id and sed.test_driver = 0
    where sec.constructor_id = ? and sec.year = ? group by sec.chassis_id order by n desc`, team, year).map((r) => r.id as string);
}

/** team@Y: a photo of a chassis the team raced in Y (official art for the 2026 grid), else the captioned placeholder. */
export async function teamYearImage(team: string, year: number): Promise<Pic> {
  if (year >= 2019 && year <= 2025 && knownOfficial(team, year) === undefined) await probeOfficial(team);
  if (!(year === 2026 && team in TEAMS_2026) && !knownOfficial(team, year)?.x) {
    const ids = chassisOf(team, year);
    for (const id of ids) { const r = await chassisPhoto(id); if (r?.d && ids.includes(r.d)) break; }
  }
  return teamYearKnown(team, year);
}
/** Same from cached knowledge only (sync). */
export function teamYearKnown(team: string, year: number): Pic {
  const ids = chassisOf(team, year);
  if (year === 2026 && team in TEAMS_2026)
    return { url: teamCar(team, 1600)!, caption: `${nameOf(ids[0]) || "2026 赛车"} · 2026`, exact: true, kind: "official", depicts: ids[0] ?? null };
  const o = knownOfficial(team, year);
  if (o === undefined && year >= 2019 && year <= 2025) probeOfficial(team).catch(() => {});
  if (o?.x) return { url: o.u, caption: `${nameOf(o.d) || nameOf(ids[0])} · ${year}`, exact: true, kind: "official", depicts: o.d ?? ids[0] ?? null };
  for (const id of ids) {
    const rec = knownChassisPhoto(id);
    if (rec && rec.d && ids.includes(rec.d)) return { url: rec.u, caption: `${nameOf(rec.d)} · ${year}`, exact: true, kind: "photo", depicts: rec.d };
  }
  return { url: F1_FALLBACK_CAR, caption: `暂无 ${year} 年赛车照片`, exact: false, kind: "placeholder", depicts: null };
}

/** Chassis of a team by (fractional) race wins, then by seasons raced. */
function chassisByWins(team: string) {
  const wins = new Map(all<any>(`select sec.chassis_id id, sum(1.0 / (select count(*) from season_entrant_chassis s2 where s2.year = sec.year and s2.entrant_id = sec.entrant_id and s2.constructor_id = sec.constructor_id)) w
    from race_result rr join race r on r.id = rr.race_id
    join season_entrant_driver sed on sed.year = r.year and sed.driver_id = rr.driver_id and sed.constructor_id = rr.constructor_id
    join season_entrant_chassis sec on sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id
    where rr.constructor_id = ? and rr.position_number = 1 group by sec.chassis_id`, team).map((r) => [r.id as string, r.w as number]));
  return all<any>("select chassis_id id, count(distinct year) n, max(year) last from season_entrant_chassis where constructor_id = ? group by chassis_id", team)
    .sort((a, b) => (wins.get(b.id) ?? 0) - (wins.get(a.id) ?? 0) || b.n - a.n || b.last - a.last).map((r) => r.id as string);
}

/** A team without a year: representative = its most-winning chassis that has a photo, captioned 「Lotus 25 · 1964」. */
export async function teamImage(team: string, max = 12): Promise<Pic> {
  if (!(team in TEAMS_2026)) {
    if (all<any>("select 1 from season_entrant_constructor where constructor_id = ? and year between 2019 and 2025 limit 1", team).length) await probeOfficial(team);
    for (const id of chassisByWins(team).slice(0, max)) { if (officialFor(id)) break; const r = await chassisPhoto(id); if (r?.d === id) break; }
  }
  return teamImageKnown(team, max);
}
/** Same from cached knowledge only (sync). */
export function teamImageKnown(team: string, max = 12): Pic {
  if (team in TEAMS_2026) {
    const id = chassisOf(team, 2026)[0];
    return { url: teamCar(team, 1600)!, caption: `${nameOf(id) || "2026 赛车"} · 2026`, exact: false, kind: "official", depicts: id ?? null };
  }
  for (const id of chassisByWins(team).slice(0, max)) {
    const o = officialFor(id);
    if (o) return { url: o.u, caption: `${nameOf(id)} · ${mainYear(id)}`, exact: false, kind: "official", depicts: id };
    const rec = knownChassisPhoto(id);
    if (rec && rec.d === id) return { url: rec.u, caption: `${nameOf(id)} · ${photoYear(rec)}`, exact: false, kind: "photo", depicts: id };
  }
  return { url: F1_FALLBACK_CAR, caption: "暂无该车队赛车照片", exact: false, kind: "placeholder", depicts: null };
}

/** Page-safe wrappers: never hold a render for more than ~1.5 s. The full lookup keeps running in the background and
 *  is cached; meanwhile the answer is built from what is already known (exact or placeholder — never a guess). */
/** Never hold a navigation for a network lookup: give it ~30 ms (cache hits resolve instantly), else answer from what
 *  is already known now and let the lookup finish in the background for the next view (user: 导航点击非常卡顿). */
const within = <T,>(p: Promise<T>, fallback: () => T, ms = 30) =>
  Promise.race([p.catch(() => fallback()), new Promise<T>((r) => setTimeout(() => r(fallback()), ms))]);
export const teamImageFast = (team: string) => within(teamImage(team), () => teamImageKnown(team));
export const teamYearImageFast = (team: string, year: number) => within(teamYearImage(team, year), () => teamYearKnown(team, year));
export const carImageFast = (id: string, opts: { family?: boolean } = {}) => within(carImage(id, opts), () => carImageKnown(id, opts));
