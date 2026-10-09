import fs from "node:fs";
import path from "node:path";
import { all, get } from "./db";
import { DRIVERS_2026, TEAMS_2026, driverBust } from "./assets";
import { wikiThumb } from "./wiki";

/**
 * A driver's photo FOR A GIVEN SEASON — never a photo in another team's kit.
 * 1. 2026 grid → official 2026 portrait
 * 2. official F1 season portraits (2025 new CDN; 2015, 2019–2024 legacy "<Y>Drivers/<surname>")
 * 3. Wikimedia Commons "Category:<Full name> in <year>" (best-scoring file)
 *    (all Commons picks favour solo portraits: group shots / podiums / "A and B" titles are rejected)
 * 4. nothing from that season → his most recent photo (2026 portrait or Wikipedia lead photo)
 * Results are cached in data/period-faces.json.
 */
const FILE = path.join(process.cwd(), "data/period-faces.json");
let store: Record<string, string | null> | null = null;
const load = () => (store ??= (() => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } })());
const save = () => { try { fs.writeFileSync(FILE, JSON.stringify(load(), null, 0)); } catch {} };
const inflight = new Map<string, Promise<string | null>>();
const UA = { "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" };
const CDN = "https://media.formula1.com/image/upload";

/** Commons rate-limits hard: one request at a time, ≥1.1 s apart, back off on 429; a 429 aborts the lookup (not cached). */
class Throttled extends Error {}
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
function commonsFetch(url: string): Promise<any> {
  const run = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = Math.max(0, lastCall + 1100 - Date.now());
      if (wait) await new Promise((r) => setTimeout(r, wait));
      lastCall = Date.now();
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12000) });
      if (r.status === 429) { await new Promise((res) => setTimeout(res, 4000 * (attempt + 1))); continue; }
      if (!r.ok) return null;
      return r.json();
    }
    throw new Throttled();
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

async function ok(url: string) {
  try {
    const r = await fetch(url, { method: "GET", headers: UA, signal: AbortSignal.timeout(8000) });
    const len = +(r.headers.get("content-length") ?? 0);
    const good = r.ok && /image/.test(r.headers.get("content-type") ?? "") && (len === 0 || len > 4000);
    r.body?.cancel().catch(() => {});
    return good;
  } catch { return false; }
}

const ascii = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function teamIn(id: string, year: number) {
  return get<any>("select rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = ? order by r.round desc limit 1", year, id)?.t as string | undefined;
}

async function official(id: string, year: number, d: any) {
  if (year === 2026 && DRIVERS_2026[id]) return driverBust(id, 480, 560);
  if (year === 2025 && DRIVERS_2026[id]) {
    const t = teamIn(id, 2025) as keyof typeof TEAMS_2026 | undefined;
    const slug = t === ("kick-sauber" as any) || t === ("sauber" as any) ? "kicksauber" : t && TEAMS_2026[t]?.slug;
    const code = DRIVERS_2026[id].code;
    if (slug) {
      const u = `${CDN}/c_fill,g_north,w_480,h_560/q_auto/v1740000001/common/f1/2025/${slug}/${code}/2025${slug}${code}right.webp`;
      if (await ok(u)) return u;
    }
  }
  if (year === 2015 || (year >= 2019 && year <= 2024)) {
    const u = `${CDN}/f_auto,c_limit,q_auto,w_640/content/dam/fom-website/drivers/${year}Drivers/${ascii(d.last_name)}`;
    // the legacy folder is keyed by surname only — guard against namesakes (Schumacher, Verstappen…) by checking they raced that year alone
    const namesakes = all<any>("select count(distinct rr.driver_id) n from race_result rr join race r on r.id = rr.race_id join driver dd on dd.id = rr.driver_id where r.year = ? and dd.last_name = ?", year, d.last_name)[0]?.n ?? 0;
    if (namesakes <= 1 && (await ok(u))) return u;
  }
  return null;
}

/** Group shots read as noise on a big card: penalise titles that name several people or a crowd scene. */
const MULTI = /\b(and|with|vs\.?|und|e|y|et)\b|&|,|podium|team ?mates?|grid|crew|mechanics|drivers|parade|start|crash|accident|pit ?lane|p[oó]dio|podi|siegerehrung/i;
const SOLO = /cropped|portrait|headshot|head ?shot|close-?up|press|interview|\(\d+\)\s*\(cropped\)/i;
let surnames: string[] | null = null;
/** Other drivers' surnames (≥5 letters) — a file named after two drivers is a two-person photo ("SchumiAlonso", "Webber and Vettel"). */
const others = () => (surnames ??= [...new Set(all<any>("select last_name n from driver").map((r) => ascii(r.n)).filter((n) => n.length >= 5))]);
function soloScore(title: string, w: number, h: number, last: string) {
  let sc = 0;
  const t = ascii(title), me = ascii(last);
  if (others().some((n) => n !== me && !me.includes(n) && !n.includes(me) && t.includes(n))) sc -= 8;
  if (/schumi/i.test(title) && me !== "schumacher") sc -= 8;
  if (BAD.test(title)) sc -= 10;
  if (MULTI.test(title.replace(/\.[a-z]+$/i, ""))) sc -= 6;
  if (SOLO.test(title)) sc += 5;
  if (ascii(title).includes(ascii(last))) sc += 2;
  if (h >= w * 0.95) sc += 3; else if (w > h * 1.3) sc -= 2; // portrait orientation ≈ one person
  if (w < 300) sc -= 3;
  return sc;
}

const BAD = /\b(f\d{3,4}|mp4[-\w]*|fw\d+\w*|b19\d|enzo|laferrari|testarossa|road ?car|on track|at the wheel|cockpit|chassis|livery|helmet)\b|trophy|copa|helm|signature|autograph|firma|statue|wax|museum|poster|stamp|logo|map|grave|tomb|memorial|plaque|model|lego|livery|_car_|replica/i;
async function commons(name: string, year: number, last: string) {
  const cat = `Category:${name} in ${year}`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=40&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=500`;
  try {
    const j: any = await commonsFetch(url);
    const files = Object.values(j?.query?.pages ?? {}) as any[];
    const lastA = ascii(last);
    const scored = files
      .map((f) => {
        const ii = f.imageinfo?.[0];
        if (!ii || !/jpeg|png|webp/.test(ii.mime ?? "")) return null;
        return { sc: soloScore(f.title, ii.width, ii.height, last), url: ii.thumburl ?? ii.url };
      })
      .filter(Boolean) as { sc: number; url: string }[];
    scored.sort((a, b) => b.sc - a.sc);
    return scored[0] && scored[0].sc >= 0 ? scored[0].url : null;
  } catch (e) { if (e instanceof Throttled) throw e; return null; }
}

/** Full-text Commons search ("<Name> <year> <team>") when no per-year category exists. */
async function commonsSearch(name: string, year: number, last: string, team?: string) {
  const q = `"${name}" ${year}${team ? " " + team : ""} filetype:bitmap`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(q)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=500`;
  try {
    const j: any = await commonsFetch(url);
    const lastA = ascii(last);
    const files = (Object.values(j?.query?.pages ?? {}) as any[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    let best: { sc: number; url: string } | null = null;
    for (const f of files) {
      const ii = f.imageinfo?.[0];
      const t: string = f.title;
      if (!ii || !/jpeg|png|webp/.test(ii.mime ?? "") || BAD.test(t)) continue;
      // the file name itself must carry the surname AND the year, otherwise it's a guess
      if (!ascii(t).includes(lastA) || !t.includes(String(year))) continue;
      const sc = soloScore(t, ii.width, ii.height, last);
      if (!best || sc > best.sc) best = { sc, url: ii.thumburl ?? ii.url };
    }
    return best && best.sc >= 0 ? best.url : null;
  } catch (e) { if (e instanceof Throttled) throw e; return null; }
}

/** Last resort (user's rule): his most recent photo — official 2026 portrait, else the Wikipedia lead photo. */
async function latestPhoto(id: string) {
  if (DRIVERS_2026[id]) return driverBust(id, 480, 560);
  try {
    const { summary, wikiMap } = await import("./wiki");
    const s: any = await summary(wikiMap().drivers[id]);
    const thumb = s?.thumbnail?.source;
    if (!thumb || /\.svg/i.test(thumb)) return null;
    return s.originalimage?.width && s.originalimage.width < 500 ? s.originalimage.source : wikiThumb(thumb, 500);
  } catch { return null; }
}

/** Last season the driver raced — the default "year" when a page has no year context. */
export function latestYear(id: string) {
  return get<any>("select max(r.year) y from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ?", id)?.y as number | undefined;
}

/** Non-blocking variant for HTTP handlers: cached answer if known, otherwise start the lookup in the background
 *  and return the instant best guess (official / latest photo) so a page full of faces never queues on Commons. */
export async function periodFaceFast(id: string, year?: number): Promise<{ url: string | null; final: boolean }> {
  const y = year ?? latestYear(id) ?? 2026;
  const s = load();
  if (`${id}:${y}` in s) return { url: s[`${id}:${y}`], final: true };
  const d = get<any>("select id, name, first_name, last_name, full_name from driver where id = ?", id);
  if (d) {
    const off = await Promise.race([official(id, y, d).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 2500))]); // F1 CDN only
    if (off) { load()[`${id}:${y}`] = off; save(); return { url: off, final: true }; }
  }
  periodFace(id, year).catch(() => {}); // fill the cache for next time
  const quick = await Promise.race([latestPhoto(id), new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
  return { url: quick, final: false };
}

export async function periodFace(id: string, year?: number): Promise<string | null> {
  const y = year ?? latestYear(id) ?? 2026;
  const key = `${id}:${y}`;
  const s = load();
  if (key in s) return s[key];
  if (inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
   try {
    const d = get<any>("select id, name, first_name, last_name, full_name from driver where id = ?", id);
    if (!d) return null;
    // only years the driver actually raced make sense; otherwise use the nearest raced year
    const raced = all<any>("select distinct r.year y from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? order by r.year", id).map((r) => r.y as number);
    const yy = raced.includes(y) || !raced.length ? y : raced.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
    let url = await official(id, yy, d);
    if (!url) url = await commons(d.name, yy, d.last_name);
    if (!url && d.full_name && d.full_name !== d.name) url = await commons(d.full_name, yy, d.last_name);
    if (!url) {
      const t = teamIn(id, yy);
      const tn = t ? get<any>("select name from constructor where id = ?", t)?.name : undefined;
      url = (await commonsSearch(d.name, yy, d.last_name, tn)) ?? (await commonsSearch(d.name, yy, d.last_name));
    }
    if (!url) {
      // same team in an adjacent year is still the right kit
      const t = teamIn(id, yy);
      for (const dy of [-1, 1, -2, 2]) {
        if (url || !raced.includes(yy + dy) || teamIn(id, yy + dy) !== t) continue;
        url = (await official(id, yy + dy, d)) ?? (await commons(d.name, yy + dy, d.last_name));
      }
    }
    if (!url) url = await latestPhoto(id);
    load()[key] = url;
    save();
    return url;
   } catch (e) {
    if (e instanceof Throttled) return latestPhoto(id); // temporary, retried on a later request
    throw e;
   }
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
