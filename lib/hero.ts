import { logoRev } from "@/lib/logoRev";
/**
 * Object heroes (IA spec v6 §0.6): ONE model for the first block of every object page, built by one constructor per
 * object type. Pages hand the model to <ObjectHero> (components/entity/ObjectHero.tsx) and only assemble the visual.
 *
 * The heart of it is the connection slot (⑦) — per the user's update, a row of 4 visual tiles (picture + name, each a
 * link) with a context line above it. Three states: overview (no ?year: the object's whole history as aggregates),
 * year (?year=Y: that season's facts) and period (?from&to from the rail's group headers). The cross-checks of §0.6.2
 * hold by construction (scripts/hero-check.mjs): driver / team / car read the same rows (driverYear / teamYear /
 * getChassis) and circuit / race / season read the same winner + chassisForTeamYear.
 *
 * No JSX here (plain .ts): the few React nodes (laurels, honours) are built with createElement.
 */
import { createElement as h, type ReactNode } from "react";
import { all, get } from "./db";
import {
  getDriver, getConstructor, getCircuit, getCountry, getChassis, facts, driverYears, constructorYears, circuitYears, constructorLineage,
  circuitRaces, lapRecord, chassisForTeamYear, seasonRaces, seasonDriverStandings, seasonConstructorStandings, driverStandingsAfter,
  constructorStandingsAfter, getRaceByYearRound, raceResults, raceData,
} from "./f1";
import { driverYear, teamYear, circuitYear, yearTeams } from "./yearData";
import { drivers as dContent, teams as tContent, circuits as cContent, cars as carContent } from "./content";
import * as assets from "./assets";
import { teamColor, teamColorAt, DRIVERS_2026, TEAMS_2026, teamCar, driverBust, teamLogo, raceCard } from "./assets";
import * as carImg from "./carImage";
import { driverHeroImage } from "./periodFace";
import { teamLogoAtKnown } from "./teamLogo";
import { NAT_ZH, TEAM_ZH, ENGINE_ZH, gpZh } from "./names";
import logos from "@/data/team-logos.json";
import { zhName } from "./zh";
import { eraById, eraFacts, type Era } from "./eras";
import { seasonSchedule } from "./schedule";
import { layoutSvg } from "./circuitImage";
import { raceReplayPath } from "./raceCards";
import { Linked } from "./linkify";
import { subjectCrumbs, type Crumb } from "@/components/shell/Breadcrumb";
import Laurel, { type Tone } from "@/components/entity/Laurel";
import Person from "@/components/entity/Person";
import EntityLink from "@/components/entity/EntityLink";
import YearSpan from "@/components/entity/YearSpan";
import LocalTime from "@/components/ui/LocalTime";
import o from "@/components/entity/objecthero.module.css";

/* ───────────────────────── model ───────────────────────── */

export type Chip =
  | { kind: "driver"; id: string; name: string; year?: number | null; color?: string | null; preview?: boolean }
  | { kind: "team"; id: string; name: string; year?: number | null; href?: string; plain?: boolean }
  | { kind: "car"; id: string; name: string; team: string; year: number; plain?: boolean }
  | { kind: "circuit"; id: string; name: string; year?: number | null; plain?: boolean }
  /** a season badge; `href` may point to /races/Y/R (still previews the season); `style: "link"` = underlined text */
  | { kind: "year"; year: number; href?: string; label?: string; style?: "badge" | "link"; plain?: boolean }
  | { kind: "engine"; id: string | null; name?: string | null; year?: number | null; self?: string }
  | { kind: "era"; id: string; title: string; preview?: boolean }
  | { kind: "link"; href: string; text: string }
  /** connective words (效力于 · 冠军 …) at 55%; `strong` = a value (P6, 188, 1:32.432) */
  | { kind: "text"; text: string; strong?: boolean; mono?: boolean }
  /** the year's title laurel at the end of L2; `top: ""` = branches only (after a person chip) */
  | { kind: "laurel"; tone: Tone; top: string; bottom?: string; title?: string }
  | { kind: "flag"; country: string }
  | { kind: "node"; node: ReactNode };

/** ⑦ (user update, overrides the text-only line): the connection slot is a row of 4 visual tiles — eyebrow label,
 *  picture (car / logo / faces / track outline / laurel), name or value. Each tile links to its unit (most specific). */
export type TilePerson = { id: string; name: string; short: string; year: number | null; color: string | null };
export type TilePic =
  | { kind: "faces"; people: TilePerson[] }
  | { kind: "logo"; team: string; url: string }
  | { kind: "car"; url: string; fit: "official" | "photo" | "placeholder"; caption?: string | null }
  | { kind: "outline"; circuit: string; url?: string }
  | { kind: "flag"; country: string }
  | { kind: "laurel"; top: string };
export type Tile = {
  label: string;
  /** whole-tile link (one subject); absent for multi-person tiles (each person links) and pure suppliers */
  href?: string;
  entity?: { kind: "driver" | "team" | "circuit" | "car" | "year"; id: string };
  pic?: TilePic;
  name: string;
  /** a value tile (P6, 24): the name is set as a big number */
  big?: boolean;
  sub?: string | string[];
  /** several people in one tile, each its own link */
  people?: TilePerson[];
  /** several teams in one tile (a career's teams), each its own link */
  teams?: { id: string; name: string; short: string; url: string | null; href: string }[];
};

export type HeroModel = {
  kind: "driver" | "team" | "circuit" | "car" | "season" | "race" | "era";
  id: string;
  /** the year context: a value = "this object in year Y"; null = all years */
  year: number | null;
  surface: "bleed" | "card";
  /** card only: "light" = white card (the era inside the year hub) */
  tone?: "color" | "light";
  /** identity colour (§1.4) */
  color: string;
  texture?: "halftone" | "drs" | "carbon" | "photo";
  photo?: string | null;
  crumbs: Crumb[];
  eyebrow?: string;
  display: { first?: string; last: string; numeral?: boolean; variant?: "person" | "wide" | "race" | "numeral" | "cn"; size?: string; logo?: string | null };
  cx?: ReactNode;
  cxStyle?: "cn" | "latin" | "official";
  meta: Chip[];
  lineage?: Chip[][];
  tagline?: string | null;
  traits?: string | null;
  /** id not linked inside the tagline (defaults to `id`) */
  skip?: string;
  /** ⑦ the context line above the tiles (year badge · race · date) */
  head?: Chip[];
  /** ⑦ the 4 tiles */
  tiles: Tile[];
  /** text lines after the tiles (extra facts) — or the whole ⑦ when there are no tiles (未参赛 / 未举办 / 尚未进行) */
  connection: Chip[][];
  /** ⑧ EraSpan input */
  eraYears: number[];
  laurels: ReactNode[];
  actions?: { label: string; href: string; icon?: string; tone?: "red" | "line" }[];
  stats: { k: string; v: ReactNode; sub?: string }[];
  visual?: ReactNode;
  visualKind?: "portrait" | "car" | "backdrop" | "panel" | "stage" | "logo";
  /** other ids that ARE this page's subject ("race:2026-17" on the circuit page in 2026): links to them get no popover */
  aliases?: string[];
};

/* ───────────────────────── thin adapters (image-accuracy pass lands in lib/assets · lib/carImage) ───────────────────────── */

/** A team's colour IN a given season (lib/assets `teamColorAt`: the livery of that year). */
export const colorAt = (team: string | null | undefined, year?: number | null, fallback = "#47464c"): string => teamColorAt(team, year ?? null, fallback);

type Pic = { url: string; caption: string | null; exact: boolean; kind: "official" | "photo" | "placeholder"; depicts?: string | null };
const asPic = (x: any): Pic => (typeof x === "string"
  ? { url: x, caption: null, exact: x !== carImg.F1_FALLBACK_CAR, kind: x === carImg.F1_FALLBACK_CAR ? "placeholder" : "photo" }
  : x);
/** One chassis' picture (exact or captioned; lib/carImage decides). */
export async function carPicture(id: string, family = true): Promise<Pic> {
  return asPic(await (carImg.carImageFast as any)(id, { family }));
}
/** A team in a season: a chassis it raced that year (or the captioned placeholder). */
export async function teamYearPicture(team: string, year: number): Promise<Pic> {
  const f = (carImg as any).teamYearImageFast as ((t: string, y: number) => Promise<any>) | undefined;
  return asPic(f ? await f(team, year) : await carImg.teamImageFast(team));
}
/** A team without a year: its representative picture (captioned when it is not the current car). */
export async function teamPicture(team: string): Promise<Pic> {
  return asPic(await carImg.teamImageFast(team));
}
/** Car chip thumbnail (sync, cached knowledge only): official 2026 side view, or a photo known to show exactly this chassis. */
export function carThumb(id: string, team: string, year?: number | null): { url: string; kind: "official" | "photo" } | null {
  if ((year === 2026 || get<any>("select 1 x from season_entrant_chassis where chassis_id = ? and year = 2026", id)) && team in TEAMS_2026)
    return { url: teamCar(team, 160)!, kind: "official" };
  const known = (carImg as any).carImageKnown as ((i: string) => any) | undefined;
  const p = known ? asPic(known(id)) : null;
  return p && p.exact && p.kind === "photo" ? { url: p.url, kind: "photo" } : null;
}
/** A team's logo valid in `year` (white variant for the identity colour). Uses the image agent's `teamLogoAt` from
 *  lib/assets or lib/carImage as soon as it exists ({url, caption, exact} or a string); until then /api/logo. */
export function teamLogoUrl(team: string, year?: number | null, w = 480, opts: { bg?: string | null; mono?: boolean } = {}): { url: string; caption: string | null } {
  // colour-first, high-res (lib/teamLogo teamLogoAtKnown): /api/logo whitens a mostly-dark logo only on a dark surface
  const r = teamLogoAtKnown(team, year ?? null, false, w);
  const v = opts.mono ? "white" : "auto";
  const bg = opts.bg ? `&bg=${opts.bg.replace(/^#/, "")}` : opts.mono ? "" : "&bg=15151e";
  return { url: `/api/logo/${team}?r=${logoRev()}&v=${v}${bg}&w=${w}${year ? `&year=${year}` : ""}`, caption: r.caption ?? null };
}
/** A driver's hero picture from THAT season (§1.5, lib/periodFace `driverHeroImage`: exact / captioned / placeholder). */
export const driverPicture = (id: string, year: number | null) => driverHeroImage(id, year);
/** Period face URL (lib/periodFace through /api/face). */
export const periodFace = (id: string, year: number, s = 600) => `/api/face/${id}?s=${s}&year=${year}`;

/* ───────────────────────── helpers ───────────────────────── */

let _cur: number | null = null;
/** The current (latest) season in the database. */
export const CURRENT = () => (_cur ??= (get<any>("select max(year) y from season")?.y as number) ?? new Date().getUTCFullYear());

const T = (text: string | number, strong = false): Chip => ({ kind: "text", text: String(text), strong });
const DOT: Chip = { kind: "text", text: "·" };
const dn = (id: string, fb?: string | null) => zhName.driver(id) ?? fb ?? id;
const tn = (id: string, fb?: string | null) => zhName.team(id) ?? TEAM_ZH[id] ?? fb ?? id;
const cn = (id: string, fb?: string | null) => cContent()[id]?.nameZh ?? zhName.circuit(id) ?? fb ?? id;
/** join non-empty groups with " · " */
const join = (groups: (Chip[] | null | undefined | false)[], sep: Chip = DOT): Chip[] => {
  const out: Chip[] = [];
  for (const g of groups) { if (!g || !g.length) continue; if (out.length) out.push(sep); out.push(...g); }
  return out;
};
const lastTeamIn = (driver: string, year: number) =>
  get<any>("select rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = ? order by r.round desc limit 1", year, driver)?.t as string | undefined;

export const yearChip = (year: number, extra: Partial<Extract<Chip, { kind: "year" }>> = {}): Chip => ({ kind: "year", year, ...extra });
const person = (id: string, year: number | null | undefined, name?: string | null, team?: string | null, preview = true): Chip =>
  ({ kind: "driver", id, name: dn(id, name), year: year ?? null, color: team ? colorAt(team, year) : year ? colorAt(lastTeamIn(id, year), year) : null, preview });
const teamChip = (id: string, year: number | null | undefined, name?: string | null, plain = false): Chip => ({ kind: "team", id, name: tn(id, name), year: year ?? null, plain });
const carChip = (id: string, name: string, team: string, year: number): Chip => ({ kind: "car", id, name, team, year });
const carsOf = (team: string, year: number, max = 2) => chassisForTeamYear(team, year).slice(0, max).map((c: any) => carChip(c.id, c.name, team, year));
const raceChip = (year: number, round: number, gp: string): Chip => ({ kind: "year", year, href: `/races/${year}/${round}`, label: `第 ${round} 站 ${gpZh(gp)}`, style: "link" });
const range = (s?: string | null) => (s ? s.replace(/-/g, "–") : "");

/* tiles */
export const hasLogo = (t: string) => t in TEAMS_2026 || !!(logos as Record<string, string | null>)[t] || !!teamLogoAtKnown(t, null, false, 280).url;
const WORKS: Record<string, string> = { "red-bull-ford": "red-bull" };
const tp = (id: string, year: number | null, name?: string | null, team?: string | null): TilePerson =>
  ({ id, name: dn(id, name), short: dn(id, name).split(/[·・]/).pop()!.trim(), year, color: team ? colorAt(team, year) : year ? colorAt(lastTeamIn(id, year), year) : null });
function peopleTile(label: string, people: TilePerson[], sub?: string | string[]): Tile | null {
  if (!people.length) return null;
  const one = people[0];
  return people.length === 1
    ? { label, href: `/drivers/${one.id}${one.year ? `?year=${one.year}` : ""}`, entity: { kind: "driver", id: one.id }, pic: { kind: "faces", people }, name: one.name, sub }
    : { label, pic: { kind: "faces", people }, name: people.map((x) => x.short).join(" · "), people, sub };
}
/** a team: its logo (that year's version); a team with no logo on file → its country's flag, never a drawn badge */
function teamTile(label: string, team: string, year: number | null, name?: string | null, sub?: string | string[]): Tile {
  const country = hasLogo(team) ? null : (get<any>("select country_id c from constructor where id = ?", team)?.c as string | undefined);
  return { label, href: `/teams/${team}${year ? `?year=${year}` : ""}`, entity: { kind: "team", id: team },
    pic: hasLogo(team) ? { kind: "logo", team, url: teamLogoUrl(team, year, 280).url } : country ? { kind: "flag", country } : undefined, name: tn(team, name), sub };
}
async function carTile(label: string, id: string, name: string, sub?: string | string[], pic?: Pic | null): Promise<Tile> {
  const p = pic ?? await carPicture(id, false).catch(() => null);
  return { label, href: `/cars/${id}`, entity: { kind: "car", id }, pic: p ? { kind: "car", url: p.url, fit: p.kind, caption: p.exact ? null : p.caption } : undefined, name, sub };
}
function engineTile(label: string, maker: string | null | undefined, makerName: string | null | undefined, year: number | null, sub?: string | string[], self?: string): Tile | null {
  if (!maker) return null;
  const works = WORKS[maker] ?? maker;
  const isTeam = !!get<any>("select 1 x from constructor where id = ? and total_race_entries > 0", works);
  const raced = isTeam && year ? !!get<any>("select 1 x from season_entrant_constructor where constructor_id = ? and year = ?", works, year) : false;
  return { label, href: isTeam && works !== self ? `/teams/${works}${raced ? `?year=${year}` : ""}` : undefined, entity: isTeam && works !== self ? { kind: "team", id: works } : undefined,
    pic: hasLogo(works) ? { kind: "logo", team: works, url: teamLogoUrl(works, year, 280).url } : undefined, name: ENGINE_ZH[maker] ?? makerName ?? maker, sub };
}
const valueTile = (label: string, value: string, sub: string | string[] | undefined, href: string, laurel?: string | null): Tile =>
  ({ label, href, pic: laurel ? { kind: "laurel", top: laurel } : undefined, name: value, big: true, sub });
const circuitTile = (label: string, circuit: string, year: number | null, sub?: string): Tile =>
  ({ label, href: `/circuits/${circuit}${year ? `?year=${year}` : ""}`, entity: { kind: "circuit", id: circuit }, pic: { kind: "outline", circuit }, name: cn(circuit), sub });
const tiles_ = (xs: (Tile | null | undefined | false)[]) => xs.filter(Boolean) as Tile[];
/** "目前 · 1 胜 · 298 分" etc. for a team in a season (+ the value "P4") */
function teamStanding(team: string, year: number) {
  const line = yearTeams(year).find((t) => t.id === team);
  if (!line) return null;
  const pt = line.pos == null && !line.live ? get<any>("select position_text t from season_constructor_standing where constructor_id = ? and year = ?", team, year)?.t : null;
  const champ = !line.live ? seasonDriverStandings(year).find((x: any) => x.champ) : null;
  return {
    value: year < 1958 ? "—" : line.pos != null ? `P${line.pos}` : pt ?? "—",
    sub: year < 1958 ? `1958 年前无车队锦标赛 · ${line.wins ?? 0} 胜` : `${line.live ? "目前" : "年终"} · ${line.wins ?? 0} 胜 · ${line.points ?? 0} 分`,
    champ: !!line.champ && year >= 1958, live: !!line.live, wins: line.wins ?? 0, points: line.points ?? 0,
    driverChamp: champ && lastTeamIn(champ.driver, year) === team ? { id: champ.driver as string, name: champ.name as string } : null,
  };
}



/* overview (all-years) aggregates — the user's rule: the object's home page summarises its whole history */
const yearLink = (y: number, href: string): Chip => ({ kind: "year", year: y, href, style: "link" });
/** most-winning chassis (else most-raced) among results matching `where` (rr.* / r.* columns) */
function topChassis(where: string, ...args: unknown[]) {
  const q = (wins: boolean) => get<any>(`select sec.chassis_id id, ch.name, ch.constructor_id team, max(r.year) year, count(*) n from race_result rr join race r on r.id = rr.race_id
    join season_entrant_driver sed on sed.year = r.year and sed.driver_id = rr.driver_id and sed.constructor_id = rr.constructor_id and sed.test_driver = 0
    join season_entrant_chassis sec on sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id
    join chassis ch on ch.id = sec.chassis_id where ${where} ${wins ? "and rr.position_number = 1" : ""} group by sec.chassis_id order by n desc, year desc limit 1`, ...args);
  const w = q(true);
  return w ? { ...w, unit: "胜" } : (() => { const s = q(false); return s ? { ...s, unit: "场" } : null; })();
}
/** best circuit by wins (else podiums, else starts) among results matching `where` */
function topCircuit(where: string, ...args: unknown[]) {
  for (const [cond, unit] of [["rr.position_number = 1", "胜"], ["rr.position_number <= 3", "次领奖台"], ["1 = 1", "场"]] as const) {
    const r = get<any>(`select r.circuit_id id, count(*) n from race_result rr join race r on r.id = rr.race_id where ${where} and ${cond} group by r.circuit_id order by n desc limit 1`, ...args);
    if (r) return { id: r.id as string, n: r.n as number, unit };
  }
  return null;
}
async function driverOverviewTiles(id: string, titles: number): Promise<Tile[]> {
  const champYears = all<any>("select year from season_driver_standing where driver_id = ? and championship_won = 1 order by year", id).map((r) => r.year as number);
  const best = get<any>("select year, position_number pos from season_driver_standing where driver_id = ? and position_number is not null order by position_number, year desc limit 1", id);
  const teamsRows = all<any>("select constructor_id t, min(year) a, max(year) b from season_entrant_driver where driver_id = ? and test_driver = 0 group by constructor_id order by a", id);
  const car = topChassis("rr.driver_id = ?", id);
  const circ = topCircuit("rr.driver_id = ?", id);
  return tiles_([
    titles > 0
      ? valueTile("世界冠军", `${titles} 届`, champYears.length > 4 ? `${champYears.slice(0, 2).join("、")} … ${champYears.at(-1)}` : champYears.join("、"), `/drivers/${id}?year=${champYears.at(-1)}`, "世界冠军")
      : best ? valueTile("最佳排名", `P${best.pos}`, `${best.year} 赛季`, `/drivers/${id}?year=${best.year}`) : null,
    teamsRows.length ? {
      label: "效力车队", name: `${teamsRows.length} 支车队`,
      teams: teamsRows.map((r) => ({ id: r.t, name: tn(r.t), short: tn(r.t), url: hasLogo(r.t) ? teamLogoUrl(r.t, r.b, 200).url : null, href: `/teams/${r.t}?year=${r.b}` })),
      sub: teamsRows.map((r) => tn(r.t)).join(" → "),
    } as Tile : null,
    car ? await carTile("代表赛车", car.id, car.name, `${car.n} ${car.unit} · ${tn(car.team)}`) : null,
    circ ? circuitTile("最擅长赛道", circ.id, null, `${circ.n} ${circ.unit}`) : null,
  ]);
}
async function teamOverviewTiles(id: string, cTitles: number, dTitles: number): Promise<Tile[]> {
  const lastTitle = get<any>("select max(year) y from season_constructor_standing where constructor_id = ? and championship_won = 1", id)?.y as number | undefined;
  const best = get<any>("select year, position_number pos from season_constructor_standing where constructor_id = ? and position_number is not null order by position_number, year desc limit 1", id);
  const legend = get<any>("select rr.driver_id id, count(*) n, max(r.year) y from race_result rr join race r on r.id = rr.race_id where rr.constructor_id = ? and rr.position_number = 1 group by rr.driver_id order by n desc, y desc limit 1", id)
    ?? get<any>("select rr.driver_id id, count(*) n, max(r.year) y, 0 w from race_result rr join race r on r.id = rr.race_id where rr.constructor_id = ? group by rr.driver_id order by n desc limit 1", id);
  const car = topChassis("rr.constructor_id = ?", id);
  const circ = topCircuit("rr.constructor_id = ?", id);
  return tiles_([
    cTitles > 0 || dTitles > 0
      ? valueTile("冠军", `${cTitles} 届`, `车手冠军 ${dTitles} 届`, `/teams/${id}${lastTitle ? `?year=${lastTitle}` : ""}`, cTitles > 0 ? "车队冠军" : "车手冠军")
      : best ? valueTile("最佳排名", `P${best.pos}`, `${best.year} 赛季`, `/teams/${id}?year=${best.year}`) : null,
    legend ? peopleTile(legend.w === 0 ? "出赛最多" : "传奇车手", [tp(legend.id, legend.y, null, id)], legend.w === 0 ? `${legend.n} 场` : `${legend.n} 胜`) : null,
    car ? await carTile("代表赛车", car.id, car.name, `${car.n} ${car.unit}`, await (async () => {
      // no photo of this chassis yet: the team's representative picture, captioned with what it shows (「Lotus 25 · 1964」)
      const p = await carPicture(car.id, false).catch(() => null);
      return p && p.kind !== "placeholder" ? p : asPic(carImg.teamImageKnown(id));
    })()) : null,
    circ ? circuitTile("最擅长赛道", circ.id, null, `${circ.n} ${circ.unit}`) : null,
  ]);
}

/* ───────────────────────── 时期 (?from=Y1&to=Y2): the third state, a period of the same object ───────────────────────── */

/**
 * The range a hero's lower half (eras · laurels · stats) summarises (user: 左边导航是哪个阶段，就要看哪个阶段的事情；
 * 整体阶段只有在总览的时候出现): ?year → that season, ?from&to → that period, overview → null = all-time.
 * The all-time tagline is an overview-only line.
 */
const scopeOf = (year: number | null, period: Period | null): Period | null => (year ? { from: year, to: year } : period);
const inScope = (ys: number[], r: Period | null) => (r ? ys.filter((y) => y >= r.from && y <= r.to) : ys);
/** a team's results over a range (constructors' / drivers' titles, wins, 1-2s, poles, podiums, starts) */
export function teamTotals(team: string, r: Period) {
  const x = get<any>(`select count(distinct r.id) starts, count(distinct case when rr.position_number = 1 then r.id end) wins,
      coalesce(sum(rr.position_number <= 3), 0) podiums, count(distinct case when rr.pole_position = 1 then r.id end) poles
    from race_result rr join race r on r.id = rr.race_id where rr.constructor_id = ? and r.year between ? and ?`, team, r.from, r.to) ?? {};
  const oneTwo = get<any>(`select count(*) n from (select rr.race_id from race_result rr join race r on r.id = rr.race_id
    where rr.constructor_id = ? and r.year between ? and ? and rr.position_number in (1, 2) group by rr.race_id having count(*) = 2)`, team, r.from, r.to)?.n ?? 0;
  const cc = get<any>("select count(*) n from season_constructor_standing where constructor_id = ? and championship_won = 1 and year between ? and ?", team, r.from, r.to)?.n ?? 0;
  const dc = get<any>(`select count(*) n from season_driver_standing sds where sds.championship_won = 1 and sds.year between ? and ? and (
     select rr.constructor_id from race_result rr join race r on r.id = rr.race_id where r.year = sds.year and rr.driver_id = sds.driver_id order by r.round desc limit 1) = ?`, r.from, r.to, team)?.n ?? 0;
  return { cc, dc, wins: x.wins ?? 0, oneTwo, poles: x.poles ?? 0, podiums: x.podiums ?? 0, starts: x.starts ?? 0 };
}
/** a driver's results over a range */
export function driverTotals(id: string, r: Period) {
  const x = get<any>(`select count(distinct r.id) starts, coalesce(sum(rr.position_number = 1), 0) wins, coalesce(sum(rr.position_number <= 3), 0) podiums,
      coalesce(sum(coalesce(rr.pole_position, 0)), 0) poles, coalesce(sum(coalesce(rr.fastest_lap, 0)), 0) fl
    from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year between ? and ?`, id, r.from, r.to) ?? {};
  const st = get<any>("select coalesce(sum(points), 0) pts, coalesce(sum(championship_won), 0) titles from season_driver_standing where driver_id = ? and year between ? and ?", id, r.from, r.to) ?? {};
  return { titles: st.titles ?? 0, wins: x.wins ?? 0, podiums: x.podiums ?? 0, poles: x.poles ?? 0, fl: x.fl ?? 0, starts: x.starts ?? 0, points: st.pts ?? 0 };
}

export type Period = { from: number; to: number };
/** ?from&to → a period (both valid seasons, from ≤ to); only meaningful without ?year */
export function parsePeriod(sp: Record<string, string | string[] | undefined>): Period | null {
  const n = (v: string | string[] | undefined) => { const x = Array.isArray(v) ? v[0] : v; return x && /^\d{4}$/.test(x) ? +x : null; };
  const from = n(sp.from), to = n(sp.to);
  return from && to && from <= to && from >= 1950 && to <= CURRENT() ? { from, to } : null;
}
const spanText = (p: Period) => (p.from === p.to ? `${p.from}` : `${p.from}–${p.to}`);
/** items of a period: a `year` field inside it, else a season written in the title / text inside it */
export function forPeriod<T extends { year?: number | null; title?: string; text?: string }>(items: T[], p: Period | null): T[] {
  if (!p) return items;
  return items.filter((x) => x.year != null ? x.year >= p.from && x.year <= p.to
    : (`${x.title ?? ""} ${x.text ?? ""}`.match(/(19|20)\d{2}/g) ?? []).some((y) => +y >= p.from && +y <= p.to));
}
/** results summary over a period for `where` (rr.* / r.*) */
function rangeStats(where: string, p: Period, ...args: unknown[]) {
  return get<any>(`select count(distinct r.id) starts, sum(rr.position_number = 1) wins, sum(rr.position_number <= 3) podiums, sum(coalesce(rr.pole_position, 0)) poles
    from race_result rr join race r on r.id = rr.race_id where ${where} and r.year between ? and ?`, ...args, p.from, p.to) ?? { starts: 0, wins: 0, podiums: 0, poles: 0 };
}
const recordTile = (label: string, s: any): Tile =>
  ({ label, name: `${s.wins ?? 0} 胜`, big: true, sub: [`${s.podiums ?? 0} 次领奖台 · ${s.poles ?? 0} 杆`, `${s.starts ?? 0} 场`] });
/** period crumbs: section › subject › 「X 时期」 */
const periodCrumbs = (section: string, sectionHref: string, subject: { label: string; href: string; kind: "driver" | "team" | "circuit"; id: string }, label: string): Crumb[] =>
  [{ label: section, href: sectionHref }, { label: subject.label, href: subject.href, kind: subject.kind, id: subject.id }, { label }];

async function driverPeriod(id: string, p: Period) {
  const team = get<any>("select rr.constructor_id t, count(*) n from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year between ? and ? group by rr.constructor_id order by n desc limit 1", id, p.from, p.to)?.t as string | undefined;
  const teams = all<any>("select distinct constructor_id t from season_entrant_driver where driver_id = ? and test_driver = 0 and year between ? and ?", id, p.from, p.to);
  const label = `${teams.length === 1 && team ? tn(team) : spanText(p)}时期`;
  const car = topChassis("rr.driver_id = ? and r.year between ? and ?", id, p.from, p.to);
  const st = rangeStats("rr.driver_id = ?", p, id);
  const best = get<any>("select year, position_number pos, championship_won champ from season_driver_standing where driver_id = ? and year between ? and ? and position_number is not null order by position_number, year desc limit 1", id, p.from, p.to);
  const titles = all<any>("select year from season_driver_standing where driver_id = ? and championship_won = 1 and year between ? and ? order by year", id, p.from, p.to).map((r) => r.year as number);
  const mates = all<any>(`select m.driver_id id, m.constructor_id t, count(distinct m.race_id) n, max(r.year) y from race_result me
    join race_result m on m.race_id = me.race_id and m.constructor_id = me.constructor_id and m.driver_id <> me.driver_id
    join race r on r.id = me.race_id where me.driver_id = ? and r.year between ? and ? group by m.driver_id order by n desc, y desc`, id, p.from, p.to);
  void st;
  const tiles = tiles_([
    team ? teamTile("车队", team, p.to, null, teams.length > 1 ? `另 ${teams.length - 1} 支车队` : spanText(p)) : null,
    car ? await carTile("代表赛车", car.id, car.name, `${car.n} ${car.unit}`) : null,
    peopleTile("队友", mates.slice(0, 3).map((m: any) => tp(m.id, m.y, null, m.t)), mates.length > 3 ? `共 ${mates.length} 人` : undefined),
    best ? valueTile("最佳排名", `P${best.pos}`, titles.length ? `世界冠军 ${titles.join("、")}` : `${best.year} 赛季`, `/drivers/${id}?year=${best.year}`, titles.length ? "世界冠军" : null) : null,
  ]);
  return { label, team, tiles };
}
async function teamPeriod(id: string, p: Period) {
  // a lineage period (Mercedes page, 2009 = Brawn GP): the same outfit under its name of that time
  const lin = constructorLineage(id).find((l: any) => l.id !== id && l.year_from <= p.from && (l.year_to ?? 9999) >= p.to);
  const subject: string = lin?.id ?? id;
  const engine = get<any>("select engine_manufacturer_id e, em.name, count(*) n from season_entrant_constructor sec left join engine_manufacturer em on em.id = sec.engine_manufacturer_id where sec.constructor_id = ? and sec.year between ? and ? group by e order by n desc limit 1", subject, p.from, p.to);
  const label = lin ? `${tn(id)}车系 · ${tn(lin.id, lin.name)}时期` : engine?.e ? `${ENGINE_ZH[engine.e] ?? engine.name ?? engine.e} 引擎时期` : `${spanText(p)} 时期`;
  const car = topChassis("rr.constructor_id = ? and r.year between ? and ?", subject, p.from, p.to);
  const st = rangeStats("rr.constructor_id = ?", p, subject);
  const cTitles = all<any>("select year from season_constructor_standing where constructor_id = ? and championship_won = 1 and year between ? and ? order by year", subject, p.from, p.to).map((r) => r.year as number);
  const dTitles = all<any>(`select sds.year from season_driver_standing sds where sds.championship_won = 1 and sds.year between ? and ? and (
     select rr.constructor_id from race_result rr join race r on r.id = rr.race_id where r.year = sds.year and rr.driver_id = sds.driver_id order by r.round desc limit 1) = ?`, p.from, p.to, subject).map((r) => r.year as number);
  const best = get<any>("select year, position_number pos from season_constructor_standing where constructor_id = ? and year between ? and ? and position_number is not null order by position_number, year desc limit 1", subject, p.from, p.to);
  // the period's drivers, most starts first (user: 这块为啥会缺少车手信息); faces from their last season here
  const ds = all<any>(`select rr.driver_id id, count(distinct rr.race_id) n, max(r.year) y from race_result rr join race r on r.id = rr.race_id
    where rr.constructor_id = ? and r.year between ? and ? group by rr.driver_id order by n desc, y desc`, subject, p.from, p.to);
  void st;
  const tiles = tiles_([
    peopleTile("车手", ds.slice(0, 4).map((x: any) => tp(x.id, x.y, null, subject)), ds.length > 4 ? `共 ${ds.length} 人出赛` : undefined),
    car ? await carTile("代表赛车", car.id, car.name, `${car.n} ${car.unit}`) : null,
    lin ? teamTile("前身", lin.id, p.to, lin.name, spanText(p)) : engineTile("引擎", engine?.e, engine?.name, p.to, spanText(p), id),
    cTitles.length || dTitles.length
      ? valueTile("冠军", `${cTitles.length} 届`, [`车队冠军 ${cTitles.join("、") || "—"}`, `车手冠军 ${dTitles.join("、") || "—"}`], `/teams/${subject}?year=${(cTitles.at(-1) ?? dTitles.at(-1))!}`, cTitles.length ? "车队冠军" : "车手冠军")
      : best ? valueTile("最佳排名", `P${best.pos}`, `${best.year} 赛季`, `/teams/${subject}?year=${best.year}`) : null,
  ]);
  return { label, tiles, subject };
}
async function circuitPeriod(id: string, p: Period) {
  const lay = get<any>(`select r.circuit_layout_id id, cl.length, cl.turns, count(*) n from race r left join circuit_layout cl on cl.id = r.circuit_layout_id
    where r.circuit_id = ? and r.year between ? and ? and r.circuit_layout_id is not null group by r.circuit_layout_id order by n desc limit 1`, id, p.from, p.to);
  const races = circuitRaces(id).filter((r: any) => r.year >= p.from && r.year <= p.to);
  const top = (key: "winner" | "pole") => {
    const m = new Map<string, { n: number; y: number }>();
    for (const r of races) { const k = r[key]; if (!k) continue; const x = m.get(k) ?? { n: 0, y: 0 }; x.n++; x.y = Math.max(x.y, r.year); m.set(k, x); }
    const e = [...m.entries()].sort((a, b) => b[1].n - a[1].n || b[1].y - a[1].y)[0];
    return e ? { id: e[0], n: e[1].n, y: e[1].y } : null;
  };
  const w = top("winner"), po = top("pole");
  const rec = lay?.id ? lapRecord(id, lay.id) : null;
  const n = lay?.id ? (lay.id.match(/-(\d+)$/)?.[1] ?? "") : "";
  const label = lay?.id ? `布局 ${n} 时期` : `${spanText(p)} 时期`;
  const tiles = tiles_([
    lay?.id ? { label: "布局", href: `/circuits/${id}?year=${p.to}`, entity: { kind: "circuit", id }, pic: { kind: "outline", circuit: id, url: layoutSvg(lay.id) },
      name: `布局 ${n}`, sub: spanText(p) } as Tile : null,
    w ? peopleTile("夺冠最多", [tp(w.id, w.y)], `${w.n} 胜`) : null,
    po ? peopleTile("杆位最多", [tp(po.id, po.y)], `${po.n} 杆`) : null,
    rec ? peopleTile("圈速纪录", [tp(rec.driver_id, rec.year, rec.name)], [rec.time, `${rec.year}`]) : null,
  ]);
  return { label, tiles, held: races.filter((r: any) => r.winner).length, length: lay?.length as number | undefined, turns: lay?.turns as number | undefined };
}

/* ───────────────────────── 车手 ───────────────────────── */

export async function driverHero(id: string, year: number | null, period: Period | null = null): Promise<HeroModel | null> {
  const d = getDriver(id);
  if (!d) return null;
  const c = dContent()[id];
  const zh = c?.nameZh ?? DRIVERS_2026[id]?.nameZh ?? zhName.driver(id);
  const nat = getCountry(d.nationality_country_id);
  const ys = driverYears(id);
  const y0 = ys[0], y1 = ys.at(-1);
  const cur = CURRENT();
  const sig = get<any>("select constructor_id t, count(*) n from race_result where driver_id = ? group by constructor_id order by n desc limit 1", id)?.t as string | undefined;
  // signature team = where they started most races (current drivers: their current team)
  let color = teamColor(DRIVERS_2026[id]?.team ?? sig, "#47464c");

  // ⑦ the year this hero speaks about: the given year; else the current season for an active driver; else his last
  const Y = year;
  let connection: Chip[][] = [];
  let head: Chip[] | undefined;
  let tiles: Tile[] = [];
  let periodLabel: string | null = null;
  if (year && !ys.includes(year)) {
    connection = [[yearChip(year), T("年未参赛"), DOT, T("生涯"),
      ...(y0 ? [yearChip(y0, { href: `/drivers/${id}?year=${y0}`, style: "link" })] : []), T("–"),
      ...(y1 ? [yearChip(y1, { href: `/drivers/${id}?year=${y1}`, style: "link" })] : [])]];
  } else if (!year && period) {
    const pd = await driverPeriod(id, period);
    head = [T(pd.label, true), DOT, yearLink(period.from, `/drivers/${id}?year=${period.from}`), ...(period.to !== period.from ? [T("–"), yearLink(period.to, `/drivers/${id}?year=${period.to}`)] : [])];
    tiles = pd.tiles;
    if (pd.team) color = colorAt(pd.team, period.to, "#47464c");
    periodLabel = pd.label;
  } else if (!year) {
    // overview = the whole career (user rule: the home page summarises; a year shows that year)
    head = [T("总览 · 生涯"), DOT, ...(y0 ? [yearLink(y0, `/drivers/${id}?year=${y0}`), T("–"), yearLink(y1!, `/drivers/${id}?year=${y1}`)] : [])];
    tiles = await driverOverviewTiles(id, d.total_championship_wins);
  } else if (Y) {
    const yy = Y;
    const mode = "in" as "in" | "last";
    const dy = driverYear(id, yy);
    if (year) color = colorAt(dy.entries.at(-1)?.team ?? sig, yy, "#47464c");
    const e = dy.entries.at(-1);
    const car = e?.cars[0];
    const live = !!dy.line?.live;
    const st = get<any>("select position_number pos, position_text posText, points, championship_won champ from season_driver_standing where driver_id = ? and year = ?", id, yy);
    const pos = live ? dy.line?.pos : st?.pos ?? null;
    const posText = live ? null : st?.posText ?? null;
    const pts = live ? dy.line?.points : st?.points;
    const starts = get<any>("select count(*) n from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year = ?", id, yy)?.n ?? 0;
    const ts = e ? teamStanding(e.team, yy) : null;
    head = mode === "in" ? [yearChip(yy), T(live ? "赛季 · 进行中" : "赛季")] : [T("最后参赛"), yearChip(yy)];
    tiles = tiles_([
      car ? await carTile("赛车", car.id, car.name, e.engine ? `${ENGINE_ZH[e.engine] ?? e.engineName ?? ""} 引擎` : undefined) : null,
      e ? teamTile("车队", e.team, yy, e.teamName, dy.entries.length > 1
        ? dy.entries.map((x: any) => `${tn(x.team, x.teamName)} 第 ${range(x.rounds_text)} 站`)
        : ts && yy >= 1958 ? `车队 ${ts.value}` : undefined) : null,
      peopleTile("队友", dy.mates.slice(0, 2).map((m: any) => tp(m.id, yy, m.name, m.team)), dy.mates.length > 2 ? `等 ${dy.mates.length} 人` : undefined),
      valueTile("排名", pos != null ? `P${pos}` : posText ?? "—",
        pos != null || posText ? `${live ? "目前" : "年终"} · ${pts ?? 0} 分` : `${starts} 场出赛 · 未计排名`,
        `/seasons/${yy}/standings`, st?.champ && !live ? "世界冠军" : null),
    ]);
  }

  const age = d.date_of_death ? null : Math.floor((Date.now() - new Date(d.date_of_birth).getTime()) / 3.15576e10);
  // a season / period shows his age THEN (at the season's mid-point, 1 July), not today's
  const ageOn = (y: number) => Math.floor((Date.parse(`${y}-07-01`) - Date.parse(d.date_of_birth)) / 3.15576e10);
  const seasonAge = (r: Period) => (r.from === r.to ? `${r.from} 赛季 ${ageOn(r.from)} 岁` : `${spanText(r)} 赛季 ${ageOn(r.from)}–${ageOn(r.to)} 岁`);
  // lower half follows the state: overview = career, ?year = that season, ?from&to = that period
  const R = scopeOf(year, period);
  const t = R ? driverTotals(id, R) : { titles: d.total_championship_wins, wins: d.total_race_wins, podiums: d.total_podiums, poles: d.total_pole_positions, fl: d.total_fastest_laps, starts: d.total_race_starts, points: d.total_points };
  // a single season's standing / title is already the 排名 tile: no laurels there
  const laurels = year ? [] : [
    t.titles > 0 && h(Laurel, { key: "wc", tone: "gold", size: 52, top: `${t.titles} 届`, bottom: "世界冠军" }),
    t.wins > 0 && h(Laurel, { key: "w", tone: t.titles > 0 ? "white" : "gold", size: 52, top: `${t.wins} 场`, bottom: "分站冠军" }),
    t.poles > 0 && h(Laurel, { key: "p", tone: "silver", size: 52, top: `${t.poles} 次`, bottom: "杆位" }),
    t.podiums > 0 && h(Laurel, { key: "pod", tone: "bronze", size: 52, top: `${t.podiums} 次`, bottom: "领奖台" }),
  ].filter(Boolean) as ReactNode[];
  const asLaurel = (n: number) => !year && n > 0;
  // the stat row keeps whatever is not already shown as a laurel (zeros stay as plain numbers)
  const stats = R && t.starts === 0 ? [] : [
    { k: "世界冠军", v: t.titles, laurel: asLaurel(t.titles) || !!year || !!R },
    { k: "胜场", v: t.wins, laurel: asLaurel(t.wins) },
    { k: "领奖台", v: t.podiums, laurel: asLaurel(t.podiums) },
    { k: "杆位", v: t.poles, laurel: asLaurel(t.poles) },
    { k: "最快圈", v: t.fl },
    { k: "出赛", v: t.starts },
    // a single season's points are the 排名 tile's 「年终 · N 分」 (spec §0.8.3)
    { k: "积分", v: Math.round(t.points), laurel: !!year },
    ...(!R && d.total_grand_slams > 0 ? [{ k: "大满贯", v: d.total_grand_slams }] : []),
  ].filter((x: any) => !x.laurel).map(({ k, v }) => ({ k, v }));
  const n = d.last_name.length;
  return {
    kind: "driver", id, year, surface: "bleed", color, texture: "halftone", visualKind: "portrait",
    crumbs: periodLabel ? periodCrumbs("车手", "/drivers", { label: zh ?? d.name ?? id, href: `/drivers/${id}`, kind: "driver", id }, periodLabel)
      : subjectCrumbs("车手", "/drivers", { label: zh ?? d.name ?? id, href: `/drivers/${id}`, kind: "driver", id }, year),
    display: { first: d.first_name, last: d.last_name, variant: "person", size: n > 9 ? "clamp(36px, 4.4vw, 68px)" : n > 6 ? "clamp(40px, 5.4vw, 82px)" : undefined },
    cx: zh,
    meta: [{ kind: "flag", country: d.nationality_country_id },
      T(`${NAT_ZH[d.nationality_country_id] ?? nat?.name ?? ""} · ${d.date_of_birth}${R ? "" : d.date_of_death ? ` — ${d.date_of_death}` : ` · ${age} 岁`}${R ? ` · ${seasonAge(R)}` : ""}${d.place_of_birth ? ` · 生于 ${d.place_of_birth}` : ""}`)],
    tagline: R ? null : c?.tagline ?? null,
    head, tiles, connection, eraYears: inScope(ys, R), laurels, stats,
  };
}

/* ───────────────────────── 车队 ───────────────────────── */

/** Team@Y tiles: 赛车 · 车手 · 引擎 · 排名 */
async function teamTiles(id: string, Y: number): Promise<Tile[]> {
  const ty = teamYear(id, Y);
  const ds = ty.drivers;
  let car = ty.cars[0];
  // the first chassis has no exact picture (Lotus 1994: 107C) → the team@Y picture of a chassis it raced that year (109)
  let carPic = car ? await carPicture(car.id, false).catch(() => null) : null;
  if (car && !carPic?.exact) {
    const alt = asPic(carImg.teamYearKnown(id, Y));
    const other = alt.exact && alt.depicts ? ty.cars.find((c: any) => c.id === alt.depicts) : null;
    if (other) { car = other; carPic = alt; }
  }
  const rest = ty.cars.filter((c: any) => c.id !== car?.id);
  const ts = teamStanding(id, Y);
  return tiles_([
    car ? await carTile("赛车", car.id, car.name, rest.length ? `另有 ${rest.map((c: any) => c.name).join("、")}` : undefined, carPic) : null,
    peopleTile("车手", ds.slice(0, 2).map((x: any) => tp(x.id, Y, x.name, id)), ds.length > 2 ? `共 ${ds.length} 人出赛` : undefined),
    engineTile("引擎", car?.engine, car?.engineName, Y, ty.cars.filter((c: any) => c.engine && c.engine !== car?.engine).map((c: any) => `另 ${ENGINE_ZH[c.engine] ?? c.engineName}`)[0], id),
    ts ? valueTile("排名", ts.value, [ts.sub, ...(ts.driverChamp ? [`车手冠军 ${dn(ts.driverChamp.id, ts.driverChamp.name).split(/[·・]/).pop()}`] : [])], `/seasons/${Y}/standings`, ts.champ ? "车队冠军" : ts.driverChamp ? "车手冠军" : null) : null,
  ]);
}

/** drivers' titles won in this team's car (the champion's last race of the season) */
const driverTitlesOf = (id: string) => (all<any>(
  `select count(*) n from season_driver_standing sds where sds.championship_won = 1 and (
     select rr.constructor_id from race_result rr join race r on r.id = rr.race_id
     where r.year = sds.year and rr.driver_id = sds.driver_id order by r.round desc limit 1) = ?`, id)[0]?.n ?? 0) as number;

export async function teamHero(id: string, year: number | null, period: Period | null = null): Promise<HeroModel | null> {
  const c = getConstructor(id);
  if (!c) return null;
  const content = tContent()[id];
  const zh = content?.nameZh ?? TEAM_ZH[id] ?? zhName.team(id);
  const name = zh ?? c.name;
  const lineage = constructorLineage(id);
  const ys = constructorYears(id);
  const cur = CURRENT();
  const current = id in TEAMS_2026;
  const active = ys.at(-1) === cur;
  const Y = year;
  let connection: Chip[][] = [];
  let head: Chip[] | undefined;
  let tiles: Tile[] = [];
  let periodLabel: string | null = null;
  let periodColor: string | null = null;
  let periodSubject = id;
  if (year && !ys.includes(year)) {
    connection = [[yearChip(year), T("年未参赛"), DOT, T("出赛"),
      ...(ys[0] ? [yearChip(ys[0], { href: `/teams/${id}?year=${ys[0]}`, style: "link" })] : []), T("–"),
      ...(ys.at(-1) ? [yearChip(ys.at(-1)!, { href: `/teams/${id}?year=${ys.at(-1)}`, style: "link" })] : [])]];
  } else if (!year && period) {
    const pd = await teamPeriod(id, period);
    head = [T(pd.label, true), DOT, yearLink(period.from, `/teams/${pd.subject}?year=${period.from}`), ...(period.to !== period.from ? [T("–"), yearLink(period.to, `/teams/${pd.subject}?year=${period.to}`)] : [])];
    tiles = pd.tiles;
    periodLabel = pd.label;
    periodColor = colorAt(pd.subject, period.to);
    periodSubject = pd.subject;
  } else if (!year) {
    head = [T("总览 · 历史"), DOT, T("出赛"), ...(ys.length ? [yearLink(ys[0], `/teams/${id}?year=${ys[0]}`), T("–"), yearLink(ys.at(-1)!, `/teams/${id}?year=${ys.at(-1)}`)] : [])];
    tiles = await teamOverviewTiles(id, c.total_championship_wins, driverTitlesOf(id));
  } else if (Y) {
    const yy = Y;
    const live = yearTeams(yy).find((t) => t.id === id)?.live;
    head = Y ? [yearChip(yy), T(live ? "赛季 · 进行中" : "赛季")] : [T("最后参赛"), yearChip(yy)];
    tiles = await teamTiles(id, yy);
  }

  // lower half follows the state: overview = all-time, ?year = that season, ?from&to = that period (of the period's own outfit)
  const R = scopeOf(year, period);
  const t = R ? teamTotals(periodSubject, R)
    : { cc: c.total_championship_wins, dc: driverTitlesOf(id), wins: c.total_race_wins, oneTwo: c.total_1_and_2_finishes, poles: c.total_pole_positions, podiums: c.total_podiums, starts: c.total_race_starts };
  // a single season's standing / title is already the 排名 tile: no laurels there
  const laurels = year ? [] : [
    t.cc > 0 && h(Laurel, { key: "cc", tone: "gold", size: 52, top: `${t.cc} 届`, bottom: "车队冠军" }),
    t.dc > 0 && h(Laurel, { key: "dc", tone: "silver", size: 52, top: `${t.dc} 届`, bottom: "车手冠军" }),
    t.wins > 0 && h(Laurel, { key: "w", tone: t.cc > 0 || t.dc > 0 ? "white" : "gold", size: 52, top: `${t.wins} 场`, bottom: "分站冠军" }),
  ].filter(Boolean) as ReactNode[];
  const stats = R && t.starts === 0 ? [] : [
    { k: "车队冠军", v: t.cc, laurel: !!year || t.cc > 0 || !!R },
    { k: "车手冠军", v: t.dc, laurel: !!year || t.dc > 0 || !!R },
    // a single season's wins are the 排名 tile's 「年终 · N 胜」 (spec §0.8.4)
    { k: "胜场", v: t.wins, laurel: (!year && t.wins > 0) || !!year },
    { k: "一二名", v: t.oneTwo },
    { k: "杆位", v: t.poles },
    { k: "领奖台", v: t.podiums },
    { k: "出赛", v: t.starts },
  ].filter((x) => !x.laurel).map(({ k, v }) => ({ k, v }));
  const founded = content?.founded;
  return {
    kind: "team", id, year, surface: "bleed", color: periodColor ?? (year ? colorAt(id, year) : teamColor(id, "#47464c")), texture: "drs", visualKind: "logo",
    crumbs: periodLabel ? periodCrumbs("车队", "/teams", { label: name, href: `/teams/${id}`, kind: "team", id }, periodLabel)
      : subjectCrumbs("车队", "/teams", { label: name, href: `/teams/${id}`, kind: "team", id }, year),
    display: { last: c.name, variant: "wide", size: c.name.length > 10 ? "clamp(34px, 4.2vw, 64px)" : "clamp(40px, 5.2vw, 80px)" },
    cx: zh,
    meta: [{ kind: "flag", country: c.country_id }, T(`${NAT_ZH[c.country_id] ?? getCountry(c.country_id)?.name ?? ""}${content?.base ? ` · ${content.base}` : ""}`),
      // 「N 年起参赛」 and the lineage chain are the team's whole history: overview only (user: 单年里面…不应该展示这些总信息)
      ...(founded && !R ? (typeof founded === "number" || /^\d{4}$/.test(String(founded))
        ? [T(" · "), { kind: "node", node: h(YearSpan, { from: +founded }) } as Chip, T(" 年起参赛")]
        : [T(` · ${founded} 年起参赛`)]) : [])],
    lineage: !R && lineage.length > 1 ? lineage.map((l: any) => [
      teamChip(l.id, null, l.name, l.id === id),
      { kind: "node", node: h("em", null, h(YearSpan, { from: l.year_from }), "–", l.year_to ? h(YearSpan, { from: l.year_to }) : "") },
    ]) : undefined,
    tagline: R ? null : content?.tagline ?? null,
    head, tiles, connection, eraYears: inScope(ys, R), laurels, stats,
  };
}

/* ───────────────────────── 赛道 ───────────────────────── */

const TYPE_ZH: Record<string, string> = { STREET: "街道赛", RACE: "永久赛道", ROAD: "公路赛道" };
const SESSION_ZH: Record<string, string> = { "Practice 1": "一练", "Practice 2": "二练", "Practice 3": "三练", "Sprint Qualifying": "冲刺排位", Sprint: "冲刺赛", Qualifying: "排位赛", Race: "正赛" };

/** ▶ replay path of a finished 2023+ race (OpenF1 session key), else null */
async function replayOf(year: number, round: number): Promise<string | null> {
  if (year < 2023) return null;
  try {
    const race = (await seasonSchedule(year)).find((x) => x.round === round)?.sessions.find((x) => x.name === "Race");
    return race?.key && new Date(race.end).getTime() < Date.now() ? raceReplayPath(year, round, race.key) : null;
  } catch { return null; }
}
async function sessionsOf(year: number, round: number): Promise<Chip[]> {
  try {
    const r = (await seasonSchedule(year)).find((x) => x.round === round);
    return join((r?.sessions ?? []).map((s) => [T(SESSION_ZH[s.name] ?? s.name), { kind: "node", node: h("b", { className: o.v }, h(LocalTime, { iso: s.start, format: "datetime" })) } as Chip]));
  } catch { return []; }
}
/** 冠军 [P] · [Team] · [Car] · 杆位 [P] · 最快圈 [P] {time} — one race's result line (circuit@Y and race page share it) */
function resultChips(year: number, w: { id: string; name?: string; team: string } | null, pole: { id: string; name?: string; team?: string } | null, fl: { id: string; name?: string; team?: string; time?: string } | null): Chip[] {
  return join([
    w ? [T("冠军"), person(w.id, year, w.name, w.team)] : null,
    w ? [teamChip(w.team, year)] : null,
    w ? carsOf(w.team, year, 1) : null,
    pole ? [T("杆位"), person(pole.id, year, pole.name, pole.team)] : null,
    fl ? [T("最快圈"), person(fl.id, year, fl.name, fl.team), ...(fl.time ? [{ kind: "text", text: fl.time, strong: true, mono: true } as Chip] : [])] : null,
  ]);
}

type Who = { id: string; name?: string | null; team?: string | null };
/** One race's tiles: 冠军 · 车队 · 赛车 · 杆位 (circuit@Y labels them 冠军车队 / 冠军赛车 / 杆位 / 最快圈) */
/** the pole of a race weekend's qualifying (time) and, on sprint weekends, of the sprint qualifying */
function polesOf(raceId: number) {
  const q = get<any>("select driver_id id, constructor_id team, qualifying_q3, qualifying_q2, qualifying_q1, qualifying_time from race_data where race_id = ? and type = 'QUALIFYING_RESULT' and position_number = 1", raceId);
  const sq = get<any>("select driver_id id, constructor_id team from race_data where race_id = ? and type = 'SPRINT_QUALIFYING_RESULT' and position_number = 1", raceId)
    ?? get<any>("select driver_id id, constructor_id team from race_data where race_id = ? and type = 'SPRINT_STARTING_GRID_POSITION' and position_number = 1", raceId);
  return { time: q ? q.qualifying_q3 ?? q.qualifying_q2 ?? q.qualifying_q1 ?? q.qualifying_time ?? null : null, sprint: sq as { id: string; team: string } | null };
}
/** One race's tiles: 冠军 · 车队 · 赛车 · 杆位 (circuit@Y: 冠军车队 / 冠军赛车). 杆位 = exactly one person (the pole
 *  sitter); the sprint pole (sprint weekends only) and the fastest lap are separate labelled text lines in that tile. */
async function raceTiles(raceId: number, year: number, w: Who & { team: string; time?: string | null }, pole: Who | null, fl: (Who & { time?: string | null }) | null, mode: "circuit" | "race"): Promise<Tile[]> {
  const car = chassisForTeamYear(w.team, year)[0];
  const P = (x: Who) => tp(x.id, year, x.name, x.team);
  const pq = polesOf(raceId);
  const last = pole ? peopleTile("杆位", [P(pole)], [
    // the race page's 杆位 laurel carries the pole time (user D1: the laurel stays, the duplicate goes)
    ...(pq.time && mode === "circuit" ? [pq.time] : []),
    ...(pq.sprint ? [`冲刺杆位 ${P(pq.sprint).short}`] : []),
    ...(fl && mode === "circuit" ? [`最快圈 ${P(fl).short} ${fl.time ?? ""}`.trim()] : []),
  ]) : null;
  return tiles_([
    peopleTile("冠军", [P(w)], w.time ?? undefined),
    teamTile(mode === "race" ? "车队" : "冠军车队", w.team, year),
    car ? await carTile(mode === "race" ? "赛车" : "冠军赛车", car.id, car.name) : null,
    last,
  ]);
}

export async function circuitHero(id: string, year: number | null, period: Period | null = null): Promise<HeroModel | null> {
  const ci = getCircuit(id);
  if (!ci) return null;
  const content = cContent()[id];
  const races = circuitRaces(id);
  const ys = circuitYears(id);
  const cur = CURRENT();
  const name = cn(id, ci.name);
  let connection: Chip[][] = [];
  let head: Chip[] | undefined;
  let tiles: Tile[] = [];
  let actions: HeroModel["actions"] = [];
  const teamOf = (raceId: number, driver: string) => get<any>("select constructor_id t from race_result where race_id = ? and driver_id = ? limit 1", raceId, driver)?.t as string | undefined;
  let periodLabel: string | null = null;
  let layout: { length?: number; turns?: number } | null = null;
  if (!year && period) {
    const pd = await circuitPeriod(id, period);
    periodLabel = pd.label;
    layout = { length: pd.length, turns: pd.turns };
    head = [T(pd.label, true), DOT, yearLink(period.from, `/circuits/${id}?year=${period.from}`), ...(period.to !== period.from ? [T("–"), yearLink(period.to, `/circuits/${id}?year=${period.to}`)] : []), DOT, T("举办"), T(pd.held, true), T("届")];
    tiles = pd.tiles;
  } else if (year) {
    if (!ys.includes(year)) {
      const prev = [...ys].reverse().find((y) => y < year), next = ys.find((y) => y > year);
      connection = [[yearChip(year), T("年未举办"), DOT, T("最近"),
        ...(prev ? [yearChip(prev, { href: `/circuits/${id}?year=${prev}`, style: "link" })] : []), ...(prev && next ? [T("/")] : []),
        ...(next ? [yearChip(next, { href: `/circuits/${id}?year=${next}`, style: "link" })] : [])]];
    } else {
      for (const [k, r] of circuitYear(id, year).entries()) {
        const w = r.podium[0];
        const line: Chip[] = [yearChip(year), raceChip(year, r.round, r.gp), DOT, { kind: "text", text: r.date, strong: true, mono: true }];
        const pole = r.pole ? { id: r.pole.id, name: r.pole.name, team: r.pole.team } : null;
        const fl = r.fl ? { id: r.fl.id, name: r.fl.name, team: teamOf(r.id, r.fl.id), time: r.fl.time } : null;
        if (k === 0) {
          // the first (usually only) race of that year here: head line + tiles
          head = line;
          if (w) tiles = await raceTiles(r.id, year, { id: w.id, name: w.name, team: w.team, time: w.time }, pole, fl, "circuit");
          else connection.push([T("尚未进行"), DOT, ...(await sessionsOf(year, r.round))]);
        } else {
          // a second race the same year (2020 Spielberg): one text line
          connection.push([...line, DOT, ...(w ? resultChips(year, { id: w.id, name: w.name, team: w.team }, pole, fl) : [T("尚未进行")])]);
        }
        if (!actions.length) {
          const rp = w ? await replayOf(year, r.round) : null;
          actions = [...(rp ? [{ label: "计时回放", href: rp, icon: "play", tone: "red" as const }] : []), { label: "解说手册", href: `/races/${year}/${r.round}/brief`, tone: "line" as const }];
        }
      }
    }
  } else {
    // overview = this circuit's whole history (user rule): most wins / most poles / most successful team / lap record
    const last = races.find((r: any) => r.winner);
    const next = seasonRaces(cur).find((r: any) => r.circuit === id && !r.winner);
    const held = races.filter((r: any) => r.winner);
    head = [T("总览 · 历史"), DOT, T("举办"), T(held.length, true), T("届"),
      ...(held.length ? [yearLink(held.at(-1).year, `/circuits/${id}?year=${held.at(-1).year}`), T("–"), yearLink(held[0].year, `/circuits/${id}?year=${held[0].year}`)] : []),
      ...(last ? [DOT, T("最近"), raceChip(last.year, last.round, last.gp)] : []),
      ...(next ? [DOT, T("下一次"), { kind: "year", year: cur, href: `/races/${cur}/${next.round}`, label: `${cur} 第 ${next.round} 站`, style: "link" } as Chip] : [])];
    const count = (key: "winner" | "pole" | "winnerTeam") => {
      const m = new Map<string, { n: number; y: number }>();
      for (const r of races) { const k = r[key]; if (!k) continue; const x = m.get(k) ?? { n: 0, y: 0 }; x.n++; x.y = Math.max(x.y, r.year); m.set(k, x); }
      const max = Math.max(0, ...[...m.values()].map((x) => x.n));
      const top = [...m.entries()].filter(([, x]) => x.n === max).sort((a, b) => b[1].y - a[1].y);
      return top.length ? { id: top[0][0], n: max, y: top[0][1].y, tied: top.length } : null;
    };
    const w = count("winner"), p = count("pole"), t = count("winnerTeam");
    const rec = lapRecord(id, races[0]?.layout);
    tiles = tiles_([
      w ? peopleTile("夺冠最多", [tp(w.id, w.y)], `${w.n} 胜${w.tied > 1 ? ` · 并列 ${w.tied} 人` : ""}`) : null,
      p ? peopleTile("杆位最多", [tp(p.id, p.y)], `${p.n} 杆${p.tied > 1 ? ` · 并列 ${p.tied} 人` : ""}`) : null,
      t ? teamTile("最成功车队", t.id, null, null, `${t.n} 胜`) : null,
      rec ? peopleTile("圈速纪录", [tp(rec.driver_id, rec.year, rec.name)], [rec.time, `${rec.year}`]) : null,
    ]);
  }

  // ⑨ honours: every driver tied on the most wins / poles here, and the lap record
  const top = (m: Map<string, number>) => { const max = Math.max(0, ...m.values()); return { max, ids: [...m.entries()].filter(([, n]) => n === max).map(([k]) => k).slice(0, 3) }; };
  const winsBy = new Map<string, number>(), polesBy = new Map<string, number>(), nameOf = new Map<string, string>();
  for (const r of races) {
    if (r.winner) { winsBy.set(r.winner, (winsBy.get(r.winner) ?? 0) + 1); nameOf.set(r.winner, r.winnerName); }
    if (r.pole) { polesBy.set(r.pole, (polesBy.get(r.pole) ?? 0) + 1); nameOf.set(r.pole, r.poleName); }
  }
  const winKing = top(winsBy), poleKing = top(polesBy);
  const rec = lapRecord(id, races[0]?.layout);
  const P = (d: string, y?: number | null, nm?: string) => h(Person, { key: d, id: d, name: dn(d, nm ?? nameOf.get(d)), size: 28, year: y ?? null });
  const laurels: ReactNode[] = [];
  if (winKing.max > 0) laurels.push(h("div", { key: "w", className: o.hon },
    h(Laurel, { tone: "gold", size: 38, top: `${winKing.max} 胜`, bottom: winKing.max > 1 ? "赛道之王" : races.filter((r: any) => r.winner).length === 1 ? "唯一冠军" : "胜场最多" }),
    ...winKing.ids.map((d) => P(d, year))));
  if (poleKing.max > 0) laurels.push(h("div", { key: "p", className: o.hon },
    h(Laurel, { tone: "red", size: 38, top: `${poleKing.max} 杆`, bottom: races.filter((r: any) => r.pole).length === 1 ? "唯一杆位" : "杆位最多" }),
    ...poleKing.ids.map((d) => P(d, year))));
  if (rec) laurels.push(h("div", { key: "r", className: o.hon },
    h(Laurel, { tone: "purple", size: 38, top: "圈速纪录", bottom: rec.time }),
    h("span", { className: o.recWho }, P(rec.driver_id, rec.year, rec.name),
      h(EntityLink, { kind: "year", id: String(rec.year), href: `/races/${rec.year}/${rec.round}`, className: o.textLink, children: String(rec.year) }))));
  const R = scopeOf(year, period);
  return {
    kind: "circuit", id, year, surface: "bleed", color: "#15151e", texture: "carbon", visualKind: "backdrop",
    // the circuit in a year IS that year's race here (user: 赛道页面 hover 出现了赛道的信息…不对)
    aliases: year ? all<any>("select round from race where year = ? and circuit_id = ?", year, id).map((r) => `race:${year}-${r.round}`) : [],
    crumbs: periodLabel ? periodCrumbs("赛道", "/circuits", { label: name, href: `/circuits/${id}`, kind: "circuit", id }, periodLabel)
      : subjectCrumbs("赛道", "/circuits", { label: name, href: `/circuits/${id}`, kind: "circuit", id }, year),
    display: { last: ci.name, variant: "wide", size: ci.name.length > 10 ? "clamp(32px, 3.8vw, 56px)" : "clamp(36px, 4.6vw, 68px)" },
    cx: content?.nameZh ?? ci.full_name,
    meta: [{ kind: "flag", country: ci.country_id },
      T(`${NAT_ZH[ci.country_id] ?? getCountry(ci.country_id)?.name ?? ""} · ${ci.place_name} · ${TYPE_ZH[ci.type] ?? ci.type} · ${ci.direction === "CLOCKWISE" ? "顺时针" : "逆时针"}`)],
    tagline: R ? null : content?.tagline ?? null,
    // the direction is already in the meta line (spec §0.8.5)
    traits: content?.traits?.filter((t: string) => !/顺时针|逆时针/.test(t)).join(" / ") || null,
    // all-time honours (赛道之王 / 圈速纪录) are the overview's tiles; a season or period shows its own tiles only
    head, tiles, connection, eraYears: inScope(ys, R), laurels: [], actions,
    // 举办 N 届 · first–last are the head line (spec §0.8.5); a period measures its own layout
    stats: [
      { k: "赛道长度", sub: "km", v: (layout?.length ?? ci.length)?.toFixed(3) },
      { k: "弯道", v: layout?.turns ?? ci.turns },
    ],
  };
}

/* ───────────────────────── 赛车 ───────────────────────── */

export function carHero(id: string): HeroModel | null {
  const ch = getChassis(id);
  if (!ch) return null;
  const c = carContent()[id];
  const years: number[] = ch.seasons.map((x: any) => x.year);
  const team: string = ch.constructor_id;
  const y0 = years[0], y1 = years.at(-1);
  const ys = years.length ? years : [0];
  // seasons where the team ran more than one chassis: the constructors' title is not this car's alone
  const multi = new Set(all<any>(
    `select year from season_entrant_chassis where constructor_id = ? and year in (${ys.map(() => "?").join(",")}) group by year having count(distinct chassis_id) > 1`, team, ...ys).map((r) => r.year as number));
  const rows = years.flatMap((y) => facts({ team, year: y }));
  const races = new Set(rows.map((f) => f.raceId));
  // drivers of THIS chassis, by starts in the team's car in those seasons
  const starts = new Map<string, number>();
  for (const f of rows) if (ch.drivers.some((d: any) => d.id === f.driver && d.year === f.year)) starts.set(f.driver, (starts.get(f.driver) ?? 0) + 1);
  const drivers = [...new Map(ch.drivers.map((d: any) => [d.id, d])).values()]
    .sort((a: any, b: any) => (starts.get(b.id) ?? 0) - (starts.get(a.id) ?? 0)).slice(0, 4) as any[];
  const lastYearOf = (did: string) => Math.max(...ch.drivers.filter((x: any) => x.id === did).map((x: any) => x.year));
  const maker: string | undefined = ch.seasons.find((s: any) => s.engine)?.engine ?? undefined;
  const engine = ch.engines[0];
  const makerName = maker ? get<any>("select name from engine_manufacturer where id = ?", maker)?.name as string | undefined : undefined;
  const engineDetail = engine?.full_name && makerName && engine.full_name.startsWith(makerName) ? engine.full_name.slice(makerName.length).trim() : engine?.full_name ?? "";
  const designers = c?.designers?.length ? c.designers.join("、") : null;

  const champs = new Map(all<any>(`select year, driver_id id from season_driver_standing where championship_won = 1 and year in (${ys.map(() => "?").join(",")})`, ...ys)
    .filter((r) => ch.drivers.some((d: any) => d.year === r.year && d.id === r.id)).map((r) => [r.year as number, r.id as string]));
  // ⑦ tiles: 车队 · 车手 · 引擎 · 战绩 (newest season first)
  const seasons = [...years].reverse().map((y) => ({ y, ts: teamStanding(team, y) })).filter((x) => x.ts);
  const best = seasons[0];
  const head: Chip[] = y0 ? [yearChip(y0), ...(y1 && y1 !== y0 ? [T("–"), yearChip(y1)] : []), T(years.length > 1 ? `${years.length} 个赛季` : "赛季")] : [];
  const tiles = tiles_([
    teamTile("车队", team, y1 ?? null, ch.constructorName, y0 ? (y1 && y1 !== y0 ? `${y0}–${y1}` : `${y0}`) : undefined),
    peopleTile("车手", drivers.slice(0, 2).map((d: any) => tp(d.id, lastYearOf(d.id), d.name, team)), new Set(ch.drivers.map((d: any) => d.id)).size > 2 ? `共 ${new Set(ch.drivers.map((d: any) => d.id)).size} 人` : undefined),
    engineTile("引擎", maker, makerName, y1 ?? null, engineDetail || undefined),
    // the stat row carries every number (spec §0.8.6): the sub only says which season and whether it is final
    best ? valueTile("战绩", best.ts!.value, seasons.slice(0, 2).map((x) => (x.y < 1958 ? `${x.y} 无车队锦标赛` : `${x.y} ${x.ts!.live ? "目前" : "年终"}`)), `/seasons/${best.y}/standings`,
      best.ts!.champ && !multi.has(best.y) ? "车队冠军" : champs.get(best.y) ? "车手冠军" : null) : null,
  ]);

  // ⑨ titles won with this car (constructors' only when it was the team's sole chassis that year)
  const cTitles = all<any>(`select year from season_constructor_standing where constructor_id = ? and championship_won = 1 and year in (${ys.map(() => "?").join(",")})`, team, ...ys)
    .map((r) => r.year as number).filter((y) => !multi.has(y));
  const surname = (did: string, latin: string) => zhName.driver(did)?.split(/[·・]/).pop() ?? latin.split(" ").slice(-1)[0];
  const laurels: ReactNode[] = [
    ...cTitles.map((y) => h(Laurel, { key: "c" + y, tone: "gold", size: 44, top: h(YearSpan, { from: y }), bottom: "车队冠军", title: `${y} 车队冠军` })),
    ...[...champs.entries()].map(([y, did]) => h(Laurel, { key: "d" + y + did, tone: "gold", size: 44, top: h(YearSpan, { from: y }), title: `${y} 车手冠军`,
      bottom: h("span", null, h(EntityLink, { kind: "driver", id: did, year: y, className: "hlink", children: surname(did, ch.drivers.find((d: any) => d.id === did)?.name ?? did) }), " · 车手冠军") })),
  ];
  const wins = rows.filter((f) => f.pos === 1).length;
  const pods = rows.filter((f) => f.pos && f.pos <= 3).length;
  const poles = rows.filter((f) => f.pole).length;
  // points = the constructors' standings (they include sprint points; summing race_result does not)
  const pts = years.reduce((a, y) => a + (yearTeams(y).find((t) => t.id === team)?.points ?? 0), 0);
  return {
    kind: "car", id, year: null, surface: "bleed", color: colorAt(team, y0, "#8a8a94"), texture: "drs", visualKind: "stage",
    crumbs: [{ label: "赛车", href: "/cars" }, { label: ch.name }],
    display: { last: ch.name, variant: "wide", size: "clamp(48px, 7vw, 108px)" },
    cx: (c?.nameEn ?? ch.full_name).toUpperCase(), cxStyle: "latin",
    // the engine is the 引擎 tile (spec §0.8.6): the meta line only names the designers
    meta: designers ? [T(`设计 ${designers}`)] : [],
    head, tiles, connection: [], eraYears: years, laurels,
    stats: [{ k: "出赛", v: races.size }, { k: "胜场", v: wins }, { k: "领奖台", v: pods }, { k: "杆位", v: poles }, { k: "积分", v: Math.round(pts * 10) / 10 }],
  };
}

/* ───────────────────────── 年份（赛季卡） ───────────────────────── */

export async function seasonHero(year: number): Promise<HeroModel> {
  const races = seasonRaces(year);
  const done = races.filter((r: any) => r.winner);
  const live = done.length < races.length;
  const dStand = live ? driverStandingsAfter(year) : seasonDriverStandings(year);
  const cStand = live ? constructorStandingsAfter(year) : seasonConstructorStandings(year);
  const champ = live ? null : dStand.find((x: any) => x.champ) ?? null;
  const champTeam = live ? null : cStand.find((x: any) => x.champ) ?? null;
  const leader = dStand[0];
  const hero = champ ?? leader;
  const heroId: string | undefined = hero?.driver;
  const heroTeam = heroId ? lastTeamIn(heroId, year) : undefined;
  const nth = champ ? all<any>("select count(*) n from season_driver_standing where driver_id = ? and championship_won = 1 and year <= ?", champ.driver, year)[0].n : 0;
  const teamNth = champTeam ? all<any>("select count(*) n from season_constructor_standing where constructor_id = ? and championship_won = 1 and year <= ?", champTeam.team, year)[0].n : 0;
  // ⑦ tiles: 车手冠军 · 车队冠军 · 冠军赛车 · 分站 (in progress: 积分领跑 · 车队领跑 · 领跑赛车 · 分站)
  let connection: Chip[][] = [];
  let tiles: Tile[] = [];
  const winners = new Set(done.map((r: any) => r.winner)).size;
  if (champ || leader) {
    const lt = (champTeam ?? cStand[0]) as any;
    const second = dStand[1];
    const car = heroTeam ? chassisForTeamYear(heroTeam, year)[0] : null;
    const ltCar = lt && lt.team !== heroTeam ? chassisForTeamYear(lt.team, year)[0] : null;
    tiles = tiles_([
      peopleTile(champ ? "车手冠军" : "积分领跑", [tp(hero.driver, year, hero.name, heroTeam)],
        // the wins and the margin are the only facts the old 赛季综述 paragraph added (spec §0.8.7)
        [`${hero.points} 分 · ${hero.wins ?? done.filter((r: any) => r.winner === hero.driver).length} 胜${heroTeam ? ` · ${tn(heroTeam)}` : ""}`, ...(second ? [`领先 ${tp(second.driver, year, second.name).short} +${Math.round((hero.points - second.points) * 10) / 10}`] : [])]),
      lt ? teamTile(champ ? "车队冠军" : "车队领跑", lt.team, year, lt.name, `${lt.points} 分`) : null,
      car ? await carTile(champ ? "冠军赛车" : "领跑赛车", car.id, car.name, ltCar ? `车队冠军赛车 ${ltCar.name}` : tn(heroTeam!)) : null,
      valueTile("分站", `${races.length} 站`, live ? [`已赛 ${done.length} 站`, `${winners} 位分站冠军`] : `${winners} 位分站冠军`, `/seasons/${year}/calendar`),
    ]);
  } else {
    const r1 = races[0];
    connection = [[T("赛季尚未开始"), ...(r1 ? [DOT, T("首站"), raceChip(year, 1, r1.gp), { kind: "text", text: r1.date, strong: true, mono: true } as Chip] : [])]];
  }
  const laurels: ReactNode[] = champ
    ? [h(Laurel, { key: "d", tone: "white", onColor: true, size: 46, top: `第 ${nth} 冠`, bottom: "车手世界冠军" }),
      // the team is the 车队冠军 tile: the laurel only says which title it is
      ...(champTeam ? [h(Laurel, { key: "c", tone: "white", onColor: true, size: 46, top: `第 ${teamNth} 座`, bottom: "车队冠军" })] : [])]
    : leader ? [h(Laurel, { key: "l", tone: "white", onColor: true, size: 46, top: "积分领跑", bottom: `已赛 ${done.length} / ${races.length} 站` })] : [];
  return {
    kind: "season", id: String(year), year, surface: "card", color: colorAt(heroTeam, year, "#e10600"),
    crumbs: [],
    eyebrow: champ ? "世界冠军" : leader ? `积分领先 · 第 ${done.length} / ${races.length} 站` : "赛季",
    display: { last: String(year), variant: "numeral", numeral: true },
    // no number row: 分站 / 分站冠军 are the tiles, 车手 / 车队 counts the tab bar (spec §0.8.7)
    meta: [], tiles, connection, eraYears: [year], laurels,
    stats: [],
  };
}
/** The champion / leader of a season and the picture from THAT season (for the season card's visual). */
export function seasonFace(year: number) {
  const races = seasonRaces(year);
  const live = races.some((r: any) => !r.winner);
  const st = live ? driverStandingsAfter(year) : seasonDriverStandings(year);
  const hero = (live ? null : st.find((x: any) => x.champ)) ?? st[0];
  if (!hero) return null;
  const team = lastTeamIn(hero.driver, year);
  const cutOk = year >= 2025 && DRIVERS_2026[hero.driver] && (year === CURRENT() || DRIVERS_2026[hero.driver].team === team);
  return { id: hero.driver as string, name: getDriver(hero.driver)?.name ?? hero.name, live, cut: !!cutOk, src: cutOk ? driverBust(hero.driver, 640, 760)! : periodFace(hero.driver, year) };
}

/* ───────────────────────── 单场 ───────────────────────── */

export async function raceHero(year: number, round: number): Promise<HeroModel | null> {
  const race = getRaceByYearRound(year, round);
  if (!race) return null;
  const results = raceResults(race.id);
  const upcoming = !results.length;
  const winner = results[0];
  const pole = results.find((x: any) => x.pole_position);
  const fl = raceData(race.id, "FASTEST_LAP")[0];
  const circuitZh = zhName.circuit(race.circuit_id) ?? race.circuitName;
  const L1: Chip[] = join([
    [yearChip(year, { label: `${year} 赛季` }), T(`第 ${round} 站`)],
    [{ kind: "circuit", id: race.circuit_id, name: circuitZh, year }],
    [{ kind: "text", text: race.date, strong: true, mono: true }],
    race.laps ? [T(race.laps, true), T("圈"), T(race.distance, true), T("km")] : null,
  ]);
  const tiles = upcoming ? [] : await raceTiles(race.id, year, { id: winner.driver_id, name: winner.driverName, team: winner.constructor_id, time: winner.time },
    pole ? { id: pole.driver_id, name: pole.driverName, team: pole.constructor_id } : null, null, "race");
  const tail: Chip[][] = upcoming
    ? [[T("尚未进行"), DOT, T("查看"), yearChip(year, { style: "link" }), T("赛程与日历订阅")]]
    : [];
  const replay = upcoming ? null : await replayOf(year, round);
  // ⑨ race honours grouped by driver (a hat-trick = one face with all its laurels)
  const honours: { id: string; name: string; team: string; badges: ReactNode[] }[] = [];
  if (!upcoming) {
    const quali = raceData(race.id, "QUALIFYING_RESULT");
    const dotd = raceData(race.id, "DRIVER_OF_THE_DAY_RESULT");
    const slam = results.find((x: any) => x.grand_slam);
    const hat = winner && !slam && winner.pole_position && winner.fastest_lap ? winner : null;
    const poleQ = pole ? quali.find((q: any) => q.driver_id === pole.driver_id) : null;
    const poleTime = poleQ ? poleQ.qualifying_q3 ?? poleQ.qualifying_q2 ?? poleQ.qualifying_q1 ?? poleQ.qualifying_time : null;
    const add = (who: any, node: ReactNode) => {
      if (!who) return;
      let x = honours.find((y) => y.id === who.driver_id);
      if (!x) honours.push((x = { id: who.driver_id, name: who.driverName, team: who.constructor_id, badges: [] }));
      x.badges.push(node);
    };
    add(slam, h(Laurel, { key: "slam", tone: "gold", size: 34, top: "大满贯", bottom: "杆位·冠军·最快圈·全程领跑" }));
    add(hat, h(Laurel, { key: "hat", tone: "gold", size: 34, top: "帽子戏法", bottom: "杆位·冠军·最快圈" }));
    add(pole, h(Laurel, { key: "pole", tone: "red", size: 34, top: "杆位", bottom: poleTime ?? undefined }));
    add(fl, h(Laurel, { key: "fl", tone: "purple", size: 34, top: "最快圈", bottom: fl?.fastest_lap_time ? `${fl.fastest_lap_time}${fl.fastest_lap_lap ? ` · 第 ${fl.fastest_lap_lap} 圈` : ""}` : undefined }));
    add(dotd[0], h(Laurel, { key: "dotd", tone: "white", size: 34, top: "车手之日", bottom: dotd[0]?.driver_of_the_day_percentage ? `${dotd[0].driver_of_the_day_percentage}%` : undefined }));
  }
  const teamById = new Map<string, string>(results.map((x: any) => [x.driver_id, x.constructor_id]));
  return {
    kind: "race", id: `${year}/${round}`, year, surface: "bleed",
    color: upcoming ? "#15151e" : colorAt(winner.constructor_id, year, "#15151e"),
    texture: "photo", photo: year >= 2026 ? raceCard(race.grand_prix_id, 1600) : null, visualKind: upcoming ? "backdrop" : "panel",
    crumbs: [
      { label: "历史", href: "/seasons" },
      { label: year, kind: "year", id: String(year), href: `/seasons/${year}`, name: String(year) },
      { label: h("span", null, "第 ", h("span", { className: "num" }, round), " 站 ", gpZh(race.grand_prix_id)), name: `第 ${round} 站 ${gpZh(race.grand_prix_id)}` },
    ],
    display: { first: String(year), last: gpZh(race.grand_prix_id), variant: "race" },
    cx: race.official_name ? h(Linked, { text: race.official_name, skipRace: `${year}/${round}` }) : null, cxStyle: "official",
    meta: [], head: L1, tiles, connection: tail, eraYears: [year],
    laurels: honours.map((x) => h("div", { key: x.id, className: o.hon }, h("span", { className: o.honLaurels }, ...x.badges),
      h(Person, { id: x.id, year, name: dn(x.id, x.name), size: 24, color: colorAt(teamById.get(x.id) ?? x.team, year) }))),
    actions: [...(replay ? [{ label: "计时回放", href: replay, icon: "play", tone: "red" as const }] : []), { label: "解说手册", href: `/races/${year}/${round}/brief`, tone: "line" as const }],
    stats: [],
  };
}

/* ───────────────────────── 时代 ───────────────────────── */

/** The era's winningest chassis: race wins credited through the entrant's chassis that season (fractional when an
 *  entrant ran several chassis that year, so nothing is double counted). Hybrid era → Mercedes F1 W07 · 19. */
export function eraTopChassis(a: number, b: number): { id: string; name: string; team: string; year: number; wins: number } | null {
  const r = get<any>(`select sec.chassis_id id, ch.name, ch.constructor_id team, max(r.year) year,
      sum(1.0 / (select count(*) from season_entrant_chassis s2 where s2.year = sec.year and s2.entrant_id = sec.entrant_id and s2.constructor_id = sec.constructor_id)) w
    from race_result rr join race r on r.id = rr.race_id
    join season_entrant_driver sed on sed.year = r.year and sed.driver_id = rr.driver_id and sed.constructor_id = rr.constructor_id and sed.test_driver = 0
    join season_entrant_chassis sec on sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id
    join chassis ch on ch.id = sec.chassis_id
    where r.year between ? and ? and rr.position_number = 1 group by sec.chassis_id order by w desc limit 1`, a, b);
  return r ? { id: r.id, name: r.name, team: r.team, year: r.year, wins: Math.round(r.w) } : null;
}

export async function eraHero(era: Era | string, full = true): Promise<HeroModel | null> {
  const er = typeof era === "string" ? eraById(era) : era;
  if (!er) return null;
  const f = eraFacts(er);
  const [a, b] = er.years;
  const topT = f.titlesT[0]?.[0] ?? f.winsT[0]?.id;
  const lastIn = (id: string) => get<any>("select r.year y, rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year between ? and ? order by r.year desc, r.round desc limit 1", id, a, b) as { y: number; t: string } | undefined;
  const champD = f.titlesD[0], champT = f.titlesT[0];
  const dl = champD ? lastIn(champD[0]) : undefined;
  const lastTeamYear = (t: string) => get<any>("select max(year) y from season_entrant_constructor where constructor_id = ? and year between ? and ?", t, a, b)?.y as number | undefined;
  const top = eraTopChassis(a, b);
  const circ = f.circuits[0];
  const head: Chip[] = [yearChip(a), T("–"), yearChip(b), DOT, T(f.years.length, true), T("季"), DOT, T(f.races, true), T("场")];
  // ⑦ tiles: 统治车手 · 统治车队 · 代表赛车 · 代表赛道
  const tiles = tiles_([
    champD ? peopleTile("统治车手", [tp(champD[0], dl?.y ?? null, null, dl?.t)], `${champD[1]} 冠`) : null,
    champT ? teamTile("统治车队", champT[0], lastTeamYear(champT[0]) ?? null, null, `${champT[1]} 冠`) : null,
    top ? await carTile("代表赛车", top.id, top.name, `${top.wins} 胜 · ${tn(top.team)}`) : null,
    circ ? circuitTile("代表赛道", circ.id, null, `${circ.n} 届`) : null,
  ]);
  return {
    kind: "era", id: er.id, year: null, surface: "card", tone: full ? "color" : "light", color: teamColor(topT, "#15151e"),
    crumbs: full ? [{ label: "历史", href: "/seasons" }, { label: er.title }] : [],
    display: { last: er.title, variant: "cn" },
    meta: [], tagline: er.summary, skip: "",
    head, tiles, connection: [], eraYears: [], laurels: [],
    // 赛季 / 分站 are the head line 「A – B · N 季 · M 场」 (spec §0.8.8)
    stats: [
      { k: "赛道", v: f.circuits.length },
      { k: "车手冠军", v: f.titlesD.length },
    ],
  };
}

/** Content under the hero follows the year rule (user): overview → everything; ?year=Y → only items of Y
 *  (a `year` field, else Y written in the title / text). */
export function forYear<T extends { year?: number | null; title?: string; text?: string }>(items: T[], year: number | null): T[] {
  if (!year) return items;
  const y = String(year);
  return items.filter((x) => (x.year != null ? x.year === year : `${x.title ?? ""} ${x.text ?? ""}`.includes(y)));
}
