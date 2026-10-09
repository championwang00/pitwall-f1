import { all, get } from "./db";
import { allSeasons, circuitLayouts, constructorLineage, teamChassisByYear } from "./f1";
import { teamColor, teamColorAt } from "./assets";
import { ENGINE_ZH } from "./names";
import { zhName } from "./zh";
import type { Scope, RailRow, RailGroup } from "@/components/season/railStore";

/**
 * Subject timelines for the global year rail (spec v4 §1.2.3–1.2.5): pages spread one of these into <RailScope>.
 * Rows are newest-first by the rail itself; groups are the subject's own phases.
 */

const latest = () => allSeasons()[0].year as number;
const inProgress = (y: number) => y === latest() && !allSeasons()[0].champ;
const surname = (id: string | null | undefined) => {
  if (!id) return "";
  const zh = zhName.driver(id);
  return zh ? zh.split(/[·・]/).pop()! : get<any>("select last_name n from driver where id = ?", id)?.n ?? id;
};
const span = (ys: number[]) => (ys.length ? (ys[0] === ys.at(-1) ? `${ys[0]}` : `${ys[0]}–${ys.at(-1)}`) : "");

/** Merge consecutive years with the same key into groups (newest first). */
function stints<T extends string>(byYear: [number, T][], mk: (key: T, from: number, to: number) => RailGroup, maxGap = 1): RailGroup[] {
  const out: RailGroup[] = [];
  let cur: { key: T; from: number; to: number } | null = null;
  for (const [y, k] of byYear.sort((a, b) => a[0] - b[0])) {
    if (cur && cur.key === k && y - cur.to <= maxGap) cur.to = y;
    else { if (cur) out.push(mk(cur.key, cur.from, cur.to)); cur = { key: k, from: y, to: y }; }
  }
  if (cur) out.push(mk(cur.key, cur.from, cur.to));
  return out.reverse();
}

/* ─────────────────────────── driver ─────────────────────────── */

export function driverRail(id: string, year?: number | null): Scope {
  const seasons = all<any>(`select r.year,
      (select rr2.constructor_id from race_result rr2 join race r2 on r2.id = rr2.race_id where r2.year = r.year and rr2.driver_id = ? order by r2.round desc limit 1) team,
      count(distinct rr.constructor_id) teams, sum(rr.position_number = 1) wins
    from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? group by r.year order by r.year`, id, id);
  const st = new Map(all<any>("select year, position_number pos, position_text posText, championship_won champ from season_driver_standing where driver_id = ?", id).map((r) => [r.year, r]));
  const rows: Record<number, RailRow> = {};
  let titles = 0;
  for (const s of seasons) {
    const x = st.get(s.year);
    const live = inProgress(s.year);
    if (x?.champ) titles++;
    rows[s.year] = {
      color: teamColorAt(s.team, s.year, "#606066"),
      label: x ? (x.pos ? `P${x.pos}` : x.posText ?? "—") : "—",
      sub: [s.wins ? `${s.wins}胜` : "", s.teams > 1 ? `${s.teams} 队` : ""].filter(Boolean).join(" · ") || undefined,
      laurel: x?.champ ? "gold" : live && x?.pos === 1 ? "red" : undefined,
      live,
    };
  }
  const years = seasons.map((s) => s.year as number);
  const groups = stints(seasons.map((s) => [s.year, s.team as string]), (t, from, to) => ({
    id: `${t}-${from}`, title: zhName.team(t) ?? t, from, to, href: `/drivers/${id}?from=${from}&to=${to}`, color: teamColorAt(t, from, "#606066"),
  }));
  return {
    only: true, years, rows, groups, current: year ?? null,
    header: { title: zhName.driver(id) ?? get<any>("select name from driver where id = ?", id)?.name ?? id, sub: `${span(years)} · ${years.length} 季${titles ? ` · ${titles} 冠` : ""}`, href: `/drivers/${id}` },
    home: { label: zhName.driver(id) ?? get<any>("select name from driver where id = ?", id)?.name ?? id, href: `/drivers/${id}`, sub: "总览" },
    pattern: `/drivers/${id}?year={y}`, gap: "{a}–{b} · 未参赛",
  };
}

/* ─────────────────────────── team ─────────────────────────── */

/** Each season's main engine (most race starts) for a constructor. */
function engineByYear(team: string): [number, string][] {
  return all<any>(`select r.year, rr.engine_manufacturer_id e, count(*) n from race_result rr join race r on r.id = rr.race_id
    where rr.constructor_id = ? group by r.year, e order by r.year, n desc`, team)
    .filter((r, i, xs) => i === 0 || xs[i - 1].year !== r.year).map((r) => [r.year, r.e as string]);
}

function teamRows(team: string) {
  const res = all<any>(`select r.year, sum(rr.position_number = 1) wins from race_result rr join race r on r.id = rr.race_id
    where rr.constructor_id = ? group by r.year`, team);
  const st = new Map(all<any>("select year, position_number pos, championship_won champ from season_constructor_standing where constructor_id = ?", team).map((r) => [r.year, r]));
  const rows: Record<number, RailRow> = {};
  let titles = 0;
  for (const r of res) {
    const x = st.get(r.year);
    const live = inProgress(r.year);
    if (x?.champ) titles++;
    rows[r.year] = {
      color: teamColorAt(team, r.year, "#606066"),
      label: x?.pos ? `P${x.pos}` : "—",
      sub: r.wins ? `${r.wins}胜` : undefined,
      laurel: x?.champ ? "gold" : live && x?.pos === 1 ? "red" : undefined,
      live,
    };
  }
  return { years: res.map((r) => r.year as number), rows, titles };
}

/**
 * Rail rule (user): every rail entry stays INSIDE the current object. A group header opens this object's summary for
 * that period (?from&to), never another page; `slice=false` (car rail: each year is its own car) makes headers labels.
 */
function teamGroups(team: string, slice = true): RailGroup[] {
  const range = (from: number, to: number) => (slice ? `/teams/${team}?from=${from}&to=${to}` : undefined);
  const engines = stints(engineByYear(team), (e, from, to) => ({
    id: `eng-${e}-${from}`, title: `${ENGINE_ZH[e] ?? get<any>("select name from engine_manufacturer where id = ?", e)?.name ?? e} 引擎`, from, to,
    href: range(from, to),
  }));
  // predecessors / successors as title-only rows in the chain (Mercedes ← Brawn ← Honda ← BAR ← Tyrrell):
  // the same lineage seen from this team's page, so they open this team's view of that period
  const lineage = constructorLineage(team).filter((l: any) => l.id !== team).map((l: any) => ({
    id: `lin-${l.id}`, title: `${zhName.team(l.id) ?? l.name} 时期`, from: l.year_from, to: l.year_to ?? latest(), href: range(l.year_from, l.year_to ?? latest()), color: teamColor(l.id, "#606066"),
  }));
  return [...engines, ...lineage];
}

export function teamRail(id: string, year?: number | null): Scope {
  const { years, rows, titles } = teamRows(id);
  return {
    only: true, years, rows, groups: teamGroups(id), current: year ?? null,
    header: { title: zhName.team(id) ?? id, sub: `${span(years)} · ${years.length} 季${titles ? ` · ${titles} 冠` : ""}`, href: `/teams/${id}` },
    home: { label: zhName.team(id) ?? id, href: `/teams/${id}`, sub: "总览" },
    pattern: `/teams/${id}?year={y}`, gap: "{a}–{b} · 未参赛",
  };
}

/* ─────────────────────────── circuit / race / brief ─────────────────────────── */

function circuitBase(id: string) {
  const races = all<any>(`select r.year, r.round, r.circuit_layout_id layout, w.driver_id winner, w.constructor_id team
    from race r left join race_result w on w.race_id = r.id and w.position_number = 1 where r.circuit_id = ? order by r.year, r.round`, id);
  const rows: Record<number, RailRow> = {};
  const count = new Map<number, number>();
  for (const r of races) count.set(r.year, (count.get(r.year) ?? 0) + 1);
  for (const r of races) {
    if (rows[r.year]) continue; // first race of the year represents it
    rows[r.year] = {
      color: teamColorAt(r.team, r.year, "#3a3a44"),
      label: r.winner ? surname(r.winner) : "未赛",
      sub: (count.get(r.year) ?? 1) > 1 ? `×${count.get(r.year)}` : undefined,
      live: !r.winner,
    };
  }
  const layouts = new Map(circuitLayouts(id).map((l: any, i: number) => [l.id, { n: i + 1, ...l }]));
  const groups = stints(races.map((r) => [r.year, (r.layout ?? "?") as string]), (lid, from, to) => {
    const l: any = layouts.get(lid);
    return { id: `lay-${lid}-${from}`, title: l ? `布局 ${l.n} · ${l.length} km · ${l.turns} 弯` : "布局", from, to };
  }, Infinity); // a layout interrupted by a cancelled year (Monaco 2020) is still one layout
  const years = [...new Set(races.map((r) => r.year as number))];
  const first = new Map<number, number>();
  for (const r of races) if (!first.has(r.year)) first.set(r.year, r.round);
  return { years, rows, groups, first, n: races.length };
}

export function circuitRail(id: string, year?: number | null): Scope {
  const b = circuitBase(id);
  // a layout group opens the circuit in the layout's first year
  const groups = b.groups.map((g) => ({ ...g, href: `/circuits/${id}?from=${g.from}&to=${g.to}` })); // this circuit, that layout's period
  return {
    only: true, years: b.years, rows: b.rows, groups, current: year ?? null,
    header: { title: zhName.circuit(id) ?? get<any>("select name from circuit where id = ?", id)?.name ?? id, sub: `${span(b.years)} · ${b.n} 届`, href: `/circuits/${id}` },
    home: { label: zhName.circuit(id) ?? get<any>("select name from circuit where id = ?", id)?.name ?? id, href: `/circuits/${id}`, sub: "总览" },
    pattern: `/circuits/${id}?year={y}`, gap: "{a}–{b} · 未举办",
  };
}

export function raceRail(year: number, round: number): Scope {
  const c = get<any>("select circuit_id c from race where year = ? and round = ?", year, round)?.c;
  if (!c) return {};
  const b = circuitBase(c);
  const nth = all<any>("select count(*) n from race where circuit_id = ? and (year < ? or (year = ? and round <= ?))", c, year, year, round)[0].n;
  // a layout group opens this circuit in that layout's period, as on the circuit's own rail (user: 尽量都还是可点的)
  const groups = b.groups.map((g) => ({ ...g, href: `/circuits/${c}?from=${g.from}&to=${g.to}` }));
  return {
    only: true, years: b.years, rows: b.rows, groups, current: year,
    header: { title: `${zhName.circuit(c) ?? get<any>("select name from circuit where id = ?", c)?.name ?? c} · 第 ${nth} 届`, sub: `${span(b.years)} · ${b.n} 届`, href: `/circuits/${c}` },
    // the rail's first row, as on every object page: this circuit's overview (user: 为啥这里没有总览)
    home: { label: zhName.circuit(c) ?? get<any>("select name from circuit where id = ?", c)?.name ?? c, href: `/circuits/${c}`, sub: "总览" },
    map: Object.fromEntries([...b.first].map(([y, r]) => [y, `/races/${y}/${r}`])), gap: "{a}–{b} · 未举办",
  };
}

/** The rail on a race's replay page (v5.1): the race rail, each year → that circuit's replay when OpenF1 has it
 *  (2023+, already run), else that year's race page. */
export function raceReplayRail(year: number, round: number): Scope {
  const s = raceRail(year, round);
  if (!s.map) return s;
  const today = new Date().toISOString().slice(0, 10);
  const to = (href: string) => {
    const m = href.match(/^\/races\/(\d+)\/(\d+)$/);
    if (!m || +m[1] < 2023) return href;
    const d = get<any>("select date from race where year = ? and round = ?", +m[1], +m[2])?.date as string | undefined;
    return d && d < today ? `${href}/replay` : href;
  };
  const map = Object.fromEntries(Object.entries(s.map).map(([y, href]) => [y, to(href)]));
  const groups = s.groups?.map((g) => ({ ...g, href: g.href && to(g.href) }));
  return { ...s, map, groups };
}

export function briefRail(year: number, round: number): Scope {
  const s = raceRail(year, round);
  if (!s.map) return s;
  const map = Object.fromEntries(Object.entries(s.map).map(([y, href]) => [y, `${href}/brief`]));
  const groups = s.groups; // layout groups open the circuit's period, the same from a brief
  return { ...s, map, groups, header: s.header && { ...s.header, title: `解说手册 · ${s.header.title.split(" · ")[0]}` } };
}

/* ─────────────────────────── car ─────────────────────────── */

export function carRail(chassisId: string): Scope {
  const ch = get<any>("select constructor_id t from season_entrant_chassis where chassis_id = ? order by year desc limit 1", chassisId);
  if (!ch) return {};
  const team = ch.t as string;
  const { years, rows } = teamRows(team);
  const cars = teamChassisByYear(team);
  const carOf = new Map(cars.map((c) => [c.year, c]));
  for (const y of years) {
    const c = carOf.get(y);
    if (rows[y]) rows[y] = { ...rows[y], sub: rows[y].label !== "—" ? rows[y].label : undefined, label: c?.name ?? "—" };
  }
  const mine = all<any>("select distinct year from season_entrant_chassis where chassis_id = ? order by year desc", chassisId);
  return {
    only: true, years, rows, current: mine[0]?.year ?? null,
    // a car's rail groups open the team in that period (engine stint / predecessor name), user: 这个和下面的为啥不能点
    groups: teamGroups(team),
    header: { title: `${zhName.team(team) ?? team}的赛车`, sub: span(years), href: `/teams/${team}` },
    map: Object.fromEntries(years.filter((y) => carOf.has(y)).map((y) => [y, `/cars/${carOf.get(y)!.id}`])),
    fallback: `/teams/${team}?year={y}`, gap: "{a}–{b} · 未参赛",
  };
}

/* ─────────────────────────── compare ─────────────────────────── */

export function compareRail(a: string, b: string, year?: number | null): Scope {
  const A = driverRail(a), B = driverRail(b);
  const years = [...new Set([...(A.years ?? []), ...(B.years ?? [])])].sort();
  const rows: Record<number, RailRow> = {};
  for (const y of years) {
    const ra = A.rows?.[y], rb = B.rows?.[y];
    rows[y] = {
      color: ra?.color ?? rb?.color, color2: rb?.color ?? ra?.color,
      label: `${ra?.label ?? "—"} · ${rb?.label ?? "—"}`,
      laurel: ra?.laurel === "gold" || rb?.laurel === "gold" ? "gold" : undefined,
      half: !ra || !rb, live: ra?.live || rb?.live,
    };
  }
  const both = years.filter((y) => A.rows?.[y] && B.rows?.[y]);
  return {
    only: true, years, rows, current: year ?? null,
    header: { title: `${A.header?.title} vs ${B.header?.title}`, sub: both.length ? `${span(both)} 同场` : "从未同场", href: `/compare?a=${a}&b=${b}` },
    pattern: `/compare?a=${a}&b=${b}&year={y}`,
  };
}
