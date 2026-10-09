import fs from "node:fs";
import path from "node:path";
import { all, get } from "./db";
import { teamCar, TEAMS_2026 } from "./assets";
import { summary, searchTitle, wikiMap, wikiThumb } from "./wiki";

/**
 * Every car and every team gets a real picture (user: 每个单元都要有图, never a drawn placeholder):
 * official F1 2026 car → the chassis' Wikipedia lead photo → the team's best-documented chassis → the team article photo
 * → F1's own official placeholder car. Results cached in data/car-images.json.
 */
export const F1_FALLBACK_CAR = "https://media.formula1.com/image/upload/c_lfill,w_1200/q_auto/common/f1/2026/fallback/car/2026fallbackcarright.webp";
const FILE = path.join(process.cwd(), "data/car-images.json");
let store: Record<string, string | null> | null = null;
const load = () => (store ??= (() => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } })());
const save = () => { try { fs.writeFileSync(FILE, JSON.stringify(load())); } catch {} };

const photo = (s: any) => {
  const t = s?.thumbnail?.source as string | undefined;
  if (!t || /\.svg/i.test(t) || /logo/i.test(t)) return null;
  return s.originalimage?.width && s.originalimage.width < 960 ? s.originalimage.source : wikiThumb(t, 960);
};

/** Real photo of one chassis, or null. */
export async function chassisPhoto(id: string): Promise<string | null> {
  const k = `c:${id}`;
  if (k in load()) return load()[k];
  const ch = get<any>("select full_name, name, constructor_id t from chassis where id = ?", id);
  if (!ch) return null;
  const years = all<any>("select distinct year from season_entrant_chassis where chassis_id = ?", id).map((r) => r.year);
  let url: string | null = years.includes(2026) && ch.t in TEAMS_2026 ? teamCar(ch.t, 1600) : null;
  if (!url) url = photo(await summary(ch.full_name).catch(() => null));
  if (!url) url = photo(await summary(await searchTitle(`${ch.full_name} Formula One car`).catch(() => null)).catch(() => null));
  load()[k] = url;
  save();
  return url;
}

export async function carImage(id: string): Promise<string> {
  const own = await chassisPhoto(id);
  if (own) return own;
  const t = get<any>("select constructor_id t from chassis where id = ?", id)?.t;
  return (t && (await teamImage(t))) || F1_FALLBACK_CAR;
}

/** Picture for a team: its car (official 2026, else its most-raced documented chassis), else the team article photo. */
export async function teamImage(team: string): Promise<string> {
  if (team in TEAMS_2026) return teamCar(team, 1600)!;
  const k = `t:${team}`;
  if (load()[k]) return load()[k]!;
  const chassis = all<any>(`select sec.chassis_id id, count(*) n from season_entrant_chassis sec
    join race r on r.year = sec.year join race_result rr on rr.race_id = r.id and rr.constructor_id = sec.constructor_id and rr.position_number = 1
    where sec.constructor_id = ? group by sec.chassis_id order by n desc limit 4`, team);
  let url: string | null = null;
  for (const c of chassis) { url = await chassisPhoto(c.id); if (url) break; }
  if (!url) url = photo(await summary(wikiMap().constructors?.[team]).catch(() => null));
  if (url) { load()[k] = url; save(); }
  return url ?? F1_FALLBACK_CAR;
}

/** Page-safe wrappers: never hold a render for more than ~1.5 s; the lookup keeps running and is cached for next time. */
const within = <T,>(p: Promise<T>, fallback: T, ms = 1500) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
export const teamImageFast = (team: string) => within(teamImage(team), F1_FALLBACK_CAR);
export const carImageFast = (id: string) => within(carImage(id), F1_FALLBACK_CAR);
