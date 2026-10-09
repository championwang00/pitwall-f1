import { all } from "./db";
import { seasonDriverStandings, seasonConstructorStandings, driverStandingsAfter, constructorStandingsAfter, seasonRaces } from "./f1";

/** Per-driver line for one season: team(s), results, standing, rookie / farewell flags. */
export function yearDrivers(year: number) {
  const live = seasonRaces(year).some((r: any) => !r.winner);
  const stand = new Map((live ? driverStandingsAfter(year) : seasonDriverStandings(year)).map((s: any) => [s.driver, s]));
  const rows = all<any>(`select rr.driver_id id, d.name, d.nationality_country_id nat,
      count(*) starts, sum(rr.position_number = 1) wins, sum(rr.position_number <= 3) podiums, sum(rr.pole_position) poles, min(rr.position_number) best,
      group_concat(distinct rr.constructor_id) teams,
      (select rr2.constructor_id from race_result rr2 join race r2 on r2.id = rr2.race_id where r2.year = ? and rr2.driver_id = rr.driver_id order by r2.round desc limit 1) team,
      (select min(r3.year) from race_result rr3 join race r3 on r3.id = rr3.race_id where rr3.driver_id = rr.driver_id) first,
      (select max(r3.year) from race_result rr3 join race r3 on r3.id = rr3.race_id where rr3.driver_id = rr.driver_id) last
    from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
    where r.year = ? group by rr.driver_id`, year, year);
  return rows.map((r) => ({ ...r, teams: String(r.teams ?? "").split(","), pos: stand.get(r.id)?.pos ?? null, points: stand.get(r.id)?.points ?? 0, champ: !!stand.get(r.id)?.champ, live }))
    .sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999) || b.starts - a.starts);
}

/** Per-team line for one season: standing, chassis, engine, drivers. */
export function yearTeams(year: number) {
  const live = seasonRaces(year).some((r: any) => !r.winner);
  const stand = new Map((live ? constructorStandingsAfter(year) : seasonConstructorStandings(year)).map((s: any) => [s.team, s]));
  const rows = all<any>(`select rr.constructor_id id, c.name, c.country_id country,
      count(distinct r.id) races, sum(rr.position_number = 1) wins, sum(rr.position_number <= 3) podiums,
      group_concat(distinct rr.engine_manufacturer_id) engines,
      (select group_concat(distinct sec.chassis_id) from season_entrant_chassis sec where sec.year = r.year and sec.constructor_id = rr.constructor_id) chassis
    from race_result rr join race r on r.id = rr.race_id join constructor c on c.id = rr.constructor_id
    where r.year = ? group by rr.constructor_id`, year);
  return rows.map((r) => ({ ...r, engines: String(r.engines ?? "").split(","), chassis: r.chassis ? String(r.chassis).split(",") : [], pos: stand.get(r.id)?.pos ?? null, points: stand.get(r.id)?.points ?? 0, champ: !!stand.get(r.id)?.champ, live }))
    .sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999) || b.races - a.races);
}

/** Circuits of one season with their place in each circuit's own history. */
export function yearCircuits(year: number) {
  const races = seasonRaces(year);
  const hist = all<any>("select circuit_id c, year from race order by year");
  const years = new Map<string, number[]>();
  for (const h of hist) years.set(h.c, [...(years.get(h.c) ?? []), h.year]);
  const prevSet = new Set(all<any>("select circuit_id c from race where year = ?", year - 1).map((r) => r.c));
  const nextSet = new Set(all<any>("select circuit_id c from race where year = ?", year + 1).map((r) => r.c));
  const hasNext = all<any>("select 1 from race where year = ? limit 1", year + 1).length > 0;
  return {
    races: races.map((r: any) => {
      const ys = [...new Set(years.get(r.circuit) ?? [])];
      return { ...r, nth: ys.filter((y) => y <= year).length, total: ys.length, firstYear: ys[0], lastYear: ys.at(-1), isNew: ys[0] === year, returning: !prevSet.has(r.circuit) && ys[0] !== year, farewell: hasNext && !nextSet.has(r.circuit) && ys.at(-1) === year };
    }),
    dropped: [...prevSet].filter((c) => !races.some((r: any) => r.circuit === c)),
  };
}

/* ───────────── One subject × one year (the 「Y 赛季」 band on unit pages, spec §4.1–4.3) ───────────── */

/** Parse ?year=: a 4-digit season inside F1 history, else null. */
export function parseYear(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s || !/^\d{4}$/.test(s)) return null;
  const y = +s;
  const r = all<any>("select min(year) a, max(year) b from season")[0];
  return y >= r.a && y <= r.b ? y : null;
}

/** Closest years before / after `year` in which the subject exists. */
export function nearestYears(years: number[], year: number) {
  return { prev: [...years].reverse().find((y) => y < year) ?? null, next: years.find((y) => y > year) ?? null };
}

/** A driver's season: line, every round of the calendar with his result, team-mates head to head. */
export function driverYear(id: string, year: number) {
  const line = yearDrivers(year).find((d) => d.id === id) ?? null;
  const entries = all<any>(
    `select sed.constructor_id team, c.name teamName, sed.engine_manufacturer_id engine, em.name engineName, sed.rounds_text,
       (select group_concat(sec.chassis_id, '|') from season_entrant_chassis sec where sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id) chassisIds,
       (select group_concat(ch.name, '|') from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id where sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id) chassis
     from season_entrant_driver sed join constructor c on c.id = sed.constructor_id left join engine_manufacturer em on em.id = sed.engine_manufacturer_id
     where sed.driver_id = ? and sed.year = ? and sed.test_driver = 0 group by sed.constructor_id`, id, year)
    .map((e) => ({ ...e, cars: e.chassisIds ? String(e.chassisIds).split("|").map((cid: string, i: number) => ({ id: cid, name: String(e.chassis).split("|")[i] })) : [] }));
  const results = all<any>(
    `select r.round, rr.position_number pos, rr.position_text posText, rr.grid_position_number grid, rr.points, rr.pole_position pole, rr.fastest_lap fl, rr.constructor_id team, rr.reason_retired retired
     from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year = ? order by r.round, rr.position_display_order`, id, year);
  const byRound = new Map<number, any>();
  for (const r of results) if (!byRound.has(r.round)) byRound.set(r.round, r);
  const rounds = seasonRaces(year).map((r: any) => ({ round: r.round, gp: r.gp, country: r.country, circuit: r.circuit, date: r.date, done: !!r.winner, res: byRound.get(r.round) ?? null }));
  const all1 = yearDrivers(year);
  const mates = all<any>(
    `select rr2.driver_id id, d.name, rr.constructor_id team, count(*) n,
       sum(coalesce(rr.position_number, 999) < coalesce(rr2.position_number, 999)) aheadRace,
       sum(coalesce(rr2.position_number, 999) < coalesce(rr.position_number, 999)) behindRace,
       sum(rr.grid_position_number is not null and rr2.grid_position_number is not null and rr.grid_position_number < rr2.grid_position_number) aheadGrid,
       sum(rr.grid_position_number is not null and rr2.grid_position_number is not null and rr2.grid_position_number < rr.grid_position_number) behindGrid
     from race_result rr join race r on r.id = rr.race_id
     join race_result rr2 on rr2.race_id = rr.race_id and rr2.constructor_id = rr.constructor_id and rr2.driver_id != rr.driver_id
     join driver d on d.id = rr2.driver_id
     where rr.driver_id = ? and r.year = ? group by rr2.driver_id order by n desc limit 4`, id, year)
    .map((m) => ({ ...m, line: all1.find((d) => d.id === m.id) ?? null }));
  const firstWin = all<any>("select min(r.year * 100 + r.round) k from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and rr.position_number = 1", id)[0]?.k as number | null;
  const comeback = results.filter((r) => r.pos && r.grid).sort((a, b) => (b.grid - b.pos) - (a.grid - a.pos))[0] ?? null;
  return { line, entries, rounds, mates, firstWinRound: firstWin && Math.floor(firstWin / 100) === year ? firstWin % 100 : null, comeback: comeback && comeback.grid - comeback.pos >= 5 ? comeback : null };
}

/** A constructor's season: standing, cars, engines, and each driver's results in THIS team's car. */
export function teamYear(id: string, year: number) {
  const line = yearTeams(year).find((t) => t.id === id) ?? null;
  const cars = all<any>(
    `select distinct sec.chassis_id id, ch.name, sec.engine_manufacturer_id engine, em.name engineName from season_entrant_chassis sec
     join chassis ch on ch.id = sec.chassis_id left join engine_manufacturer em on em.id = sec.engine_manufacturer_id where sec.constructor_id = ? and sec.year = ?`, id, year);
  const ds = yearDrivers(year);
  const drivers = all<any>(
    `select rr.driver_id id, d.name, count(*) starts, sum(rr.position_number = 1) wins, sum(rr.position_number <= 3) podiums, sum(rr.pole_position) poles,
       min(rr.position_number) best, sum(coalesce(rr.points, 0)) pts, max(rr.driver_number) num
     from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where rr.constructor_id = ? and r.year = ? group by rr.driver_id order by starts desc, pts desc`, id, year)
    .map((d) => ({ ...d, line: ds.find((x) => x.id === d.id) ?? null }));
  const oneTwo = all<any>(
    `select count(*) n from race r where r.year = ? and (select count(*) from race_result rr where rr.race_id = r.id and rr.constructor_id = ? and rr.position_number in (1, 2)) = 2`, year, id)[0]?.n ?? 0;
  return { line, cars, drivers, oneTwo };
}

/** What happened at a circuit in a year: the race(s), podium, pole, fastest lap. */
export function circuitYear(id: string, year: number) {
  const races = all<any>(
    `select r.id, r.round, r.date, r.grand_prix_id gp, gp.country_id country, r.laps, r.official_name from race r join grand_prix gp on gp.id = r.grand_prix_id where r.circuit_id = ? and r.year = ? order by r.round`, id, year);
  return races.map((r) => ({
    ...r,
    podium: all<any>(
      `select rr.position_number pos, rr.driver_id id, d.name, rr.constructor_id team, rr.time, rr.gap, rr.grid_position_number grid
       from race_result rr join driver d on d.id = rr.driver_id where rr.race_id = ? and rr.position_number <= 3 order by rr.position_number`, r.id),
    pole: all<any>(`select rr.driver_id id, d.name, rr.constructor_id team from race_result rr join driver d on d.id = rr.driver_id where rr.race_id = ? and rr.pole_position = 1`, r.id)[0] ?? null,
    fl: all<any>(`select fl.driver_id id, d.name, fl.time from fastest_lap fl join driver d on d.id = fl.driver_id where fl.race_id = ? and fl.position_number = 1`, r.id)[0] ?? null,
  }));
}

