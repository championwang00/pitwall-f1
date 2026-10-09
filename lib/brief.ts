import { all, get } from "./db";

/** Each driver's record at one circuit (for the commentator brief). */
export function driverRecordsAt(circuit: string, drivers: string[], beforeYear = 9999) {
  if (!drivers.length) return [];
  const rows = all<any>(
    `select rr.driver_id id, r.year, r.round, rr.position_number pos, rr.position_text pt, rr.grid_position_number grid, rr.pole_position pole
     from race_result rr join race r on r.id = rr.race_id
     where r.circuit_id = ? and r.year < ? and rr.driver_id in (${drivers.map(() => "?").join(",")}) order by r.year`, circuit, beforeYear, ...drivers);
  return drivers.map((id) => {
    const mine = rows.filter((r) => r.id === id);
    const fin = mine.filter((r) => r.pos);
    const best = fin.sort((a, b) => a.pos - b.pos)[0];
    const last = mine.at(-1);
    return {
      id, starts: mine.length, wins: mine.filter((r) => r.pos === 1).length, pods: mine.filter((r) => r.pos && r.pos <= 3).length,
      poles: mine.filter((r) => r.pole).length, best: best ? { pos: best.pos, year: best.year, round: best.round } : null,
      last: last ? { pos: last.pos, pt: last.pt, year: last.year, round: last.round } : null,
      history: mine.map((r) => ({ year: r.year, round: r.round, pos: r.pos, pt: r.pt })),
    };
  });
}

export function teamRecordsAt(circuit: string, teams: string[], beforeYear = 9999) {
  if (!teams.length) return [];
  const rows = all<any>(
    `select rr.constructor_id id, r.year, r.round, min(coalesce(rr.position_number, 99)) best from race_result rr join race r on r.id = rr.race_id
     where r.circuit_id = ? and r.year < ? and rr.constructor_id in (${teams.map(() => "?").join(",")}) group by rr.constructor_id, r.id order by r.year`, circuit, beforeYear, ...teams);
  return teams.map((id) => {
    const mine = rows.filter((r) => r.id === id);
    return { id, races: mine.length, wins: mine.filter((r) => r.best === 1).length, pods: mine.filter((r) => r.best <= 3).length, last: mine.at(-1) ?? null };
  });
}

/** Most recent completed race at this circuit, optionally strictly before a given race. */
export function lastRaceAt(circuit: string, before?: { year: number; round: number }) {
  const by = before?.year ?? 9999, br = before?.round ?? 999;
  const r = get<any>(
    `select r.* from race r where r.circuit_id = ? and (r.year < ? or (r.year = ? and r.round < ?))
       and exists (select 1 from race_result rr where rr.race_id = r.id) order by r.year desc, r.round desc limit 1`, circuit, by, by, br);
  if (!r) return null;
  const top = all<any>(
    `select rr.driver_id id, d.name, rr.constructor_id team, rr.position_number pos, rr.grid_position_number grid, rr.time, rr.gap from race_result rr join driver d on d.id = rr.driver_id
     where rr.race_id = ? order by rr.position_display_order limit 3`, r.id);
  const pole = get<any>("select rr.driver_id id, d.name from race_result rr join driver d on d.id = rr.driver_id where rr.race_id = ? and rr.pole_position = 1", r.id);
  const fl = get<any>("select fl.driver_id id, d.name, fl.time from fastest_lap fl join driver d on d.id = fl.driver_id where fl.race_id = ? and fl.position_number = 1", r.id);
  return { race: r, top, pole, fl };
}
