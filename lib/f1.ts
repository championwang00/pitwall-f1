import { all, get } from "./db";

/* ───────────────────────── Types ───────────────────────── */

export type Driver = {
  id: string; name: string; first_name: string; last_name: string; full_name: string;
  abbreviation: string; permanent_number: string | null; date_of_birth: string; date_of_death: string | null;
  place_of_birth: string; country_of_birth_country_id: string; nationality_country_id: string;
  best_championship_position: number | null; best_race_result: number | null; best_starting_grid_position: number | null;
  total_championship_wins: number; total_race_entries: number; total_race_starts: number; total_race_wins: number;
  total_race_laps: number; total_podiums: number; total_points: number; total_pole_positions: number;
  total_fastest_laps: number; total_sprint_race_wins: number; total_driver_of_the_day: number; total_grand_slams: number;
};

export type Constructor = {
  id: string; name: string; full_name: string; country_id: string;
  best_championship_position: number | null; total_championship_wins: number; total_race_entries: number;
  total_race_starts: number; total_race_wins: number; total_1_and_2_finishes: number; total_podiums: number;
  total_points: number; total_pole_positions: number; total_fastest_laps: number;
};

export type Circuit = {
  id: string; name: string; full_name: string; previous_names: string | null; type: string; direction: string;
  place_name: string; country_id: string; latitude: number; longitude: number; length: number; turns: number;
  total_races_held: number;
};

/** One row of the cube: a single driver's result in a single race. */
export type Fact = {
  raceId: number; year: number; round: number; date: string; gp: string; gpName: string; circuit: string;
  driver: string; driverName: string; team: string; teamName: string; engine: string | null;
  pos: number | null; posText: string; grid: number | null; points: number; laps: number | null;
  retired: string | null; pole: number; fl: number; dotd: number;
};

/* ───────────────────────── Cube ───────────────────────── */

const FACT_SQL = `
select r.id raceId, r.year, r.round, r.date, r.grand_prix_id gp, gp.short_name gpName, r.circuit_id circuit,
  rr.driver_id driver, d.name driverName, rr.constructor_id team, c.name teamName, rr.engine_manufacturer_id engine,
  rr.position_number pos, rr.position_text posText, rr.grid_position_number grid, coalesce(rr.points,0) points,
  rr.laps, rr.reason_retired retired, coalesce(rr.pole_position,0) pole, coalesce(rr.fastest_lap,0) fl,
  coalesce(rr.driver_of_the_day,0) dotd
from race_result rr
join race r on r.id = rr.race_id
join grand_prix gp on gp.id = r.grand_prix_id
join driver d on d.id = rr.driver_id
join constructor c on c.id = rr.constructor_id`;

export type Slice = { driver?: string; team?: string; circuit?: string; year?: number; gp?: string };

/** Query the year × circuit × driver × team cube with any combination of fixed dimensions. */
export function facts(s: Slice): Fact[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (s.driver) { where.push("rr.driver_id = ?"); params.push(s.driver); }
  if (s.team) { where.push("rr.constructor_id = ?"); params.push(s.team); }
  if (s.circuit) { where.push("r.circuit_id = ?"); params.push(s.circuit); }
  if (s.year) { where.push("r.year = ?"); params.push(s.year); }
  if (s.gp) { where.push("r.grand_prix_id = ?"); params.push(s.gp); }
  const sql = `${FACT_SQL} ${where.length ? "where " + where.join(" and ") : ""} order by r.year, r.round, rr.position_display_order`;
  return all<Fact>(sql, ...params);
}

/* ───────────────────────── Entities ───────────────────────── */

export const getDriver = (id: string) => get<Driver>("select * from driver where id = ?", id);
export const getConstructor = (id: string) => get<Constructor>("select * from constructor where id = ?", id);
export const getCircuit = (id: string) => get<Circuit>("select * from circuit where id = ?", id);
export const getCountry = (id: string) => get<{ id: string; name: string; alpha2_code: string; demonym: string }>("select * from country where id = ?", id);

export function getRaceByYearRound(year: number, round: number) {
  return get<any>(
    `select r.*, gp.name gpName, gp.full_name gpFullName, gp.short_name gpShort, gp.country_id gpCountry,
      c.name circuitName, c.full_name circuitFullName, c.place_name, c.country_id circuitCountry
     from race r join grand_prix gp on gp.id = r.grand_prix_id join circuit c on c.id = r.circuit_id
     where r.year = ? and r.round = ?`, year, round);
}

export function seasonRaces(year: number) {
  return all<any>(
    `select r.id, r.year, r.round, r.date, r.time, r.grand_prix_id gp, gp.short_name gpName, gp.name gpFullName, gp.country_id country,
      r.circuit_id circuit, c.name circuitName, c.place_name, r.official_name, r.sprint_race_date, r.laps, r.distance,
      (select driver_id from race_result where race_id = r.id and position_number = 1) winner,
      (select constructor_id from race_result where race_id = r.id and position_number = 1) winnerTeam,
      (select driver_id from race_result where race_id = r.id and pole_position = 1) pole
     from race r join grand_prix gp on gp.id = r.grand_prix_id join circuit c on c.id = r.circuit_id
     where r.year = ? order by r.round`, year);
}

export function lastCompletedRace() {
  return get<any>(`select r.year, r.round from race r where exists (select 1 from race_result rr where rr.race_id = r.id) order by r.year desc, r.round desc limit 1`)!;
}

export function nextRace(today = new Date().toISOString().slice(0, 10)) {
  return get<any>(
    `select r.*, gp.short_name gpName, gp.name gpFullName, gp.country_id country, c.name circuitName, c.place_name, c.length, c.turns
     from race r join grand_prix gp on gp.id = r.grand_prix_id join circuit c on c.id = r.circuit_id
     where r.date >= ? order by r.date limit 1`, today);
}

/* ───────────────────────── Standings ───────────────────────── */

export function driverStandingsAfter(year: number, round?: number) {
  const race = round
    ? get<any>("select id from race where year = ? and round = ?", year, round)
    : get<any>("select r.id from race r where r.year = ? and exists (select 1 from race_driver_standing s where s.race_id = r.id) order by r.round desc limit 1", year);
  if (!race) return [];
  return all<any>(
    `select s.position_number pos, s.position_text posText, s.driver_id driver, d.name, d.last_name, d.abbreviation, d.permanent_number,
      d.nationality_country_id nat, s.points, s.championship_won champ,
      (select rr.constructor_id from race_result rr join race r2 on r2.id = rr.race_id where rr.driver_id = s.driver_id and r2.year = ? order by r2.round desc limit 1) team,
      (select count(*) from race_result rr join race r2 on r2.id = rr.race_id where rr.driver_id = s.driver_id and r2.year = ? and rr.position_number = 1) wins
     from race_driver_standing s join driver d on d.id = s.driver_id where s.race_id = ? order by s.position_display_order`, year, year, race.id);
}

export function constructorStandingsAfter(year: number) {
  const race = get<any>("select r.id from race r where r.year = ? and exists (select 1 from race_constructor_standing s where s.race_id = r.id) order by r.round desc limit 1", year);
  if (!race) return [];
  return all<any>(
    `select s.position_number pos, s.position_text posText, s.constructor_id team, c.name, s.points, s.championship_won champ, s.engine_manufacturer_id engine
     from race_constructor_standing s join constructor c on c.id = s.constructor_id where s.race_id = ? order by s.position_display_order`, race.id);
}

export function seasonDriverStandings(year: number) {
  return all<any>(
    `select s.position_number pos, s.position_text posText, s.driver_id driver, d.name, s.points, s.championship_won champ
     from season_driver_standing s join driver d on d.id = s.driver_id where s.year = ? order by s.position_display_order`, year);
}

export function seasonConstructorStandings(year: number) {
  return all<any>(
    `select s.position_number pos, s.position_text posText, s.constructor_id team, c.name, s.engine_manufacturer_id engine, s.points, s.championship_won champ
     from season_constructor_standing s join constructor c on c.id = s.constructor_id where s.year = ? order by s.position_display_order`, year);
}

/* ───────────────────────── Per-entity aggregates ───────────────────────── */

/** Season rows for a driver: team(s), chassis, engine, championship result. */
export function driverSeasons(id: string) {
  const standings = all<any>("select year, position_number pos, position_text posText, points, championship_won champ from season_driver_standing where driver_id = ?", id);
  const entries = all<any>(
    `select sed.year, sed.constructor_id team, c.name teamName, sed.engine_manufacturer_id engine, em.name engineName, sed.rounds_text,
       (select group_concat(ch.name, ' / ') from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id
          where sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id) chassis,
       (select group_concat(sec.chassis_id, '|') from season_entrant_chassis sec
          where sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id) chassisIds
     from season_entrant_driver sed join constructor c on c.id = sed.constructor_id
     left join engine_manufacturer em on em.id = sed.engine_manufacturer_id
     where sed.driver_id = ? and sed.test_driver = 0 order by sed.year`, id);
  return { standings, entries };
}

/** Season rows for a constructor: drivers, chassis, engine, championship result. */
export function constructorSeasons(id: string) {
  const standings = all<any>("select year, position_number pos, position_text posText, points, championship_won champ from season_constructor_standing where constructor_id = ?", id);
  const chassis = all<any>(
    `select sec.year, sec.chassis_id id, ch.name, sec.engine_manufacturer_id engine, em.name engineName
     from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id left join engine_manufacturer em on em.id = sec.engine_manufacturer_id
     where sec.constructor_id = ? group by sec.year, sec.chassis_id order by sec.year`, id);
  const drivers = all<any>(
    `select sed.year, sed.driver_id driver, d.name, sed.rounds_text from season_entrant_driver sed join driver d on d.id = sed.driver_id
     where sed.constructor_id = ? and sed.test_driver = 0 group by sed.year, sed.driver_id order by sed.year`, id);
  return { standings, chassis, drivers };
}

export function constructorLineage(id: string) {
  return all<any>(
    `select cc.other_constructor_id id, c.name, cc.year_from, cc.year_to from constructor_chronology cc
     join constructor c on c.id = cc.other_constructor_id where cc.constructor_id = ? order by cc.position_display_order`, id);
}

export function familyOf(id: string) {
  return all<any>(
    `select f.other_driver_id id, d.name, f.type from driver_family_relationship f join driver d on d.id = f.other_driver_id where f.driver_id = ?`, id);
}

/* ───────────────────────── Chassis ───────────────────────── */

export function getChassis(id: string) {
  const ch = get<any>("select ch.*, c.name constructorName from chassis ch join constructor c on c.id = ch.constructor_id where ch.id = ?", id);
  if (!ch) return null;
  const seasons = all<any>(
    `select distinct sec.year, sec.engine_manufacturer_id engine, em.name engineName from season_entrant_chassis sec
     left join engine_manufacturer em on em.id = sec.engine_manufacturer_id where sec.chassis_id = ? order by sec.year`, id);
  const drivers = all<any>(
    `select distinct sed.year, sed.driver_id id, d.name from season_entrant_chassis sec
     join season_entrant_driver sed on sed.year = sec.year and sed.entrant_id = sec.entrant_id and sed.constructor_id = sec.constructor_id and sed.test_driver = 0
     join driver d on d.id = sed.driver_id where sec.chassis_id = ? order by sed.year`, id);
  const engines = all<any>(
    `select distinct e.id, e.name, e.full_name, e.capacity, e.configuration, e.aspiration from season_entrant_engine see
     join engine e on e.id = see.engine_id join season_entrant_chassis sec on sec.year = see.year and sec.entrant_id = see.entrant_id and sec.constructor_id = see.constructor_id
     where sec.chassis_id = ?`, id);
  return { ...ch, seasons, drivers, engines };
}

export function chassisForTeamYear(team: string, year: number) {
  return all<any>("select distinct sec.chassis_id id, ch.name from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id where sec.constructor_id = ? and sec.year = ?", team, year);
}

/* ───────────────────────── Race detail ───────────────────────── */

export function raceResults(raceId: number) {
  return all<any>(
    `select rr.*, d.name driverName, d.abbreviation, d.nationality_country_id nat, c.name teamName
     from race_result rr join driver d on d.id = rr.driver_id join constructor c on c.id = rr.constructor_id
     where rr.race_id = ? order by rr.position_display_order`, raceId);
}

export function raceData(raceId: number, type: string) {
  return all<any>(
    `select rd.*, d.name driverName, d.abbreviation, c.name teamName from race_data rd
     join driver d on d.id = rd.driver_id join constructor c on c.id = rd.constructor_id
     where rd.race_id = ? and rd.type = ? order by rd.position_display_order`, raceId, type);
}

export function raceTypes(raceId: number) {
  return all<{ type: string }>("select distinct type from race_data where race_id = ?", raceId).map((r) => r.type);
}

/* ───────────────────────── Index / search ───────────────────────── */

export function searchIndex() {
  const drivers = all<any>("select id, name, nationality_country_id c, total_race_starts s, total_race_wins w, total_championship_wins t, (select min(year) from season_entrant_driver where driver_id = driver.id) y0, (select max(year) from season_entrant_driver where driver_id = driver.id) y1 from driver");
  const teams = all<any>("select id, name, country_id c, total_race_wins w, total_championship_wins t, (select min(year) from season_entrant_constructor where constructor_id = constructor.id) y0, (select max(year) from season_entrant_constructor where constructor_id = constructor.id) y1 from constructor");
  const circuits = all<any>("select id, name, place_name p, country_id c, total_races_held n from circuit");
  const cars = all<any>("select ch.id, ch.full_name name, ch.constructor_id team, (select min(year) from season_entrant_chassis where chassis_id = ch.id) y0 from chassis ch");
  return { drivers, teams, circuits, cars };
}

export function allSeasons() {
  return all<any>(
    `select s.year, (select driver_id from season_driver_standing where year = s.year and championship_won = 1) champ,
      (select constructor_id from season_constructor_standing where year = s.year and championship_won = 1) champTeam,
      (select count(*) from race where year = s.year) races
     from season s order by s.year desc`);
}

export function countryNames() {
  const rows = all<any>("select id, name, alpha2_code a2 from country");
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

export function roundOf(year: number, gp: string | null, circuit?: string | null) {
  if (gp) {
    const r = get<any>("select round from race where year = ? and grand_prix_id = ?", year, gp);
    if (r) return r.round as number;
  }
  if (circuit) {
    const r = get<any>("select round from race where year = ? and circuit_id = ?", year, circuit);
    if (r) return r.round as number;
  }
  return null;
}

export function teammates(id: string) {
  return all<any>(
    `select distinct sed2.year, sed2.driver_id id, d.name from season_entrant_driver sed
     join season_entrant_driver sed2 on sed2.year = sed.year and sed2.constructor_id = sed.constructor_id and sed2.entrant_id = sed.entrant_id and sed2.driver_id != sed.driver_id and sed2.test_driver = 0
     join driver d on d.id = sed2.driver_id where sed.driver_id = ? and sed.test_driver = 0 order by sed2.year`, id);
}

export function circuitRaces(circuitId: string) {
  return all<any>(
    `select r.id, r.year, r.round, r.date, r.grand_prix_id gp, r.laps, r.circuit_layout_id layout, r.course_length,
      w.driver_id winner, wd.name winnerName, w.constructor_id winnerTeam, wc.name winnerTeamName, w.grid_position_number winnerGrid, w.time winTime,
      (select driver_id from race_result where race_id = r.id and pole_position = 1) pole,
      (select d.name from race_result x join driver d on d.id = x.driver_id where x.race_id = r.id and x.pole_position = 1) poleName,
      (select fl.time from fastest_lap fl where fl.race_id = r.id and fl.position_number = 1) flTime,
      (select d.name from fastest_lap fl join driver d on d.id = fl.driver_id where fl.race_id = r.id and fl.position_number = 1) flName
     from race r
     left join race_result w on w.race_id = r.id and w.position_number = 1
     left join driver wd on wd.id = w.driver_id left join constructor wc on wc.id = w.constructor_id
     where r.circuit_id = ? order by r.year desc, r.round desc`, circuitId);
}

export function circuitLayouts(circuitId: string) {
  return all<any>("select * from circuit_layout where circuit_id = ? order by id", circuitId);
}

export function lapRecord(circuitId: string, layoutId: string | null) {
  if (!layoutId) return null;
  return get<any>(
    `select fl.time, fl.time_millis, d.name, fl.driver_id, r.year, r.round from fastest_lap fl join race r on r.id = fl.race_id join driver d on d.id = fl.driver_id
     where r.circuit_id = ? and r.circuit_layout_id = ? and fl.time_millis is not null order by fl.time_millis limit 1`, circuitId, layoutId);
}

/** Cumulative driver points after each round of a season (for the title-fight chart). */
export function pointsProgression(year: number) {
  return all<any>(
    `select r.round, s.driver_id driver, s.points from race_driver_standing s join race r on r.id = s.race_id where r.year = ? order by r.round`, year);
}

export function neighbours(year: number, round: number, circuit: string) {
  const prev = get<any>("select year, round, grand_prix_id gp from race where (year = ? and round = ?) ", year, round - 1);
  const next = get<any>("select year, round, grand_prix_id gp from race where (year = ? and round = ?) ", year, round + 1);
  const prevHere = get<any>("select year, round from race where circuit_id = ? and (year < ? ) order by year desc, round desc limit 1", circuit, year);
  const nextHere = get<any>("select year, round from race where circuit_id = ? and (year > ? ) order by year, round limit 1", circuit, year);
  return { prev, next, prevHere, nextHere };
}

export function pitStops(raceId: number) {
  return all<any>(`select p.*, d.name driverName from pit_stop p join driver d on d.id = p.driver_id where p.race_id = ? order by p.lap, p.time_millis`, raceId);
}

export function allDrivers() {
  return all<any>(
    `select d.id, d.name, d.last_name, d.nationality_country_id nat, d.date_of_birth dob, d.total_race_starts starts, d.total_race_wins wins,
      d.total_podiums pods, d.total_pole_positions poles, d.total_championship_wins titles, d.total_points pts,
      (select min(year) from season_entrant_driver where driver_id = d.id and test_driver = 0) y0,
      (select max(year) from season_entrant_driver where driver_id = d.id and test_driver = 0) y1
     from driver d where d.total_race_entries > 0 order by d.total_race_wins desc, d.total_race_starts desc`);
}

export function allConstructors() {
  return all<any>(
    `select c.id, c.name, c.country_id country, c.total_race_starts starts, c.total_race_wins wins, c.total_championship_wins titles,
      c.total_pole_positions poles, c.total_podiums pods,
      (select min(year) from season_entrant_constructor where constructor_id = c.id) y0,
      (select max(year) from season_entrant_constructor where constructor_id = c.id) y1
     from constructor c where c.total_race_entries > 0 order by c.total_race_wins desc, c.total_race_starts desc`);
}

export function allCircuits() {
  return all<any>(
    `select c.*, (select min(year) from race where circuit_id = c.id) y0, (select max(year) from race where circuit_id = c.id) y1
     from circuit c order by c.total_races_held desc`);
}

/** Every race both drivers started, with both results side by side. */
export function headToHead(a: string, b: string) {
  return all<any>(
    `select r.year, r.round, r.grand_prix_id gp, r.circuit_id circuit,
       ra.position_number aPos, ra.position_text aText, ra.constructor_id aTeam, ra.grid_position_number aGrid, ra.points aPts,
       rb.position_number bPos, rb.position_text bText, rb.constructor_id bTeam, rb.grid_position_number bGrid, rb.points bPts
     from race r join race_result ra on ra.race_id = r.id and ra.driver_id = ? join race_result rb on rb.race_id = r.id and rb.driver_id = ?
     order by r.year, r.round`, a, b);
}

/** Races held on this calendar day (month-day) in previous years. */
export function onThisDay(mmdd = new Date().toISOString().slice(5, 10)) {
  return all<any>(
    `select r.year, r.round, r.grand_prix_id gp, r.circuit_id circuit, d.name winner, rr.driver_id winnerId, rr.constructor_id team, (select name from constructor where id = rr.constructor_id) teamName
     from race r left join race_result rr on rr.race_id = r.id and rr.position_number = 1 left join driver d on d.id = rr.driver_id
     where substr(r.date, 6, 5) = ? and rr.driver_id is not null order by r.year desc`, mmdd);
}

/* ───────────────────────── Years a subject exists (global year rail masks) ───────────────────────── */

/** Seasons a driver was entered as a race driver (not test / reserve). */
export function driverYears(id: string): number[] {
  return all<any>("select distinct year from season_entrant_driver where driver_id = ? and test_driver = 0 order by year", id).map((r) => r.year as number);
}

/** Seasons a constructor was entered. */
export function constructorYears(id: string): number[] {
  return all<any>("select distinct year from season_entrant_constructor where constructor_id = ? order by year", id).map((r) => r.year as number);
}

/** Seasons a circuit hosted at least one World Championship race. */
export function circuitYears(id: string): number[] {
  return all<any>("select distinct year from race where circuit_id = ? order by year", id).map((r) => r.year as number);
}

/** One chassis per season for a constructor (the one it raced most that year). */
export function teamChassisByYear(team: string): { year: number; id: string; name: string }[] {
  return all<any>(
    `select sec.year, sec.chassis_id id, ch.name, count(*) n from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id
     where sec.constructor_id = ? group by sec.year, sec.chassis_id order by sec.year, n desc`, team)
    .filter((r, i, xs) => i === 0 || xs[i - 1].year !== r.year);
}
