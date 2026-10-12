import { getRaceByYearRound, raceData } from "./f1";
import { DRIVERS_2026, teamColor } from "./assets";
import { zhName } from "./zh";
import type { ResultRow } from "./live";

/** Published F1DB classifications stay available when OpenF1's results or driver endpoints fail. */
export function publishedResults(year: number, round: number | null, session: string): ResultRow[] | null {
  if (round == null) return null;
  const race = getRaceByYearRound(year, round);
  if (!race) return null;
  const type: Record<string, string> = {
    Race: "RACE_RESULT", Sprint: "SPRINT_RACE_RESULT", Qualifying: "QUALIFYING_RESULT",
    "Sprint Qualifying": "SPRINT_QUALIFYING_RESULT", "Sprint Shootout": "SPRINT_QUALIFYING_RESULT",
    "Practice 1": "FREE_PRACTICE_1_RESULT", "Practice 2": "FREE_PRACTICE_2_RESULT", "Practice 3": "FREE_PRACTICE_3_RESULT",
  };
  if (!type[session]) return null;
  const rows = raceData(race.id, type[session]);
  if (!rows.length) return null;
  const quali = /Qualifying|Shootout/.test(session);
  const practice = session.startsWith("Practice");
  const seconds = (n: number | null) => n == null ? null : n / 1000;
  const best = [1, 2, 3].map((i) => Math.min(...rows.map((r) => r[`qualifying_q${i}_millis`] ?? Infinity)));
  const grid = quali ? raceData(race.id, session === "Qualifying" ? "STARTING_GRID_POSITION" : "SPRINT_STARTING_GRID_POSITION") : [];
  return rows.map((r) => ({
    pos: r.position_number, num: Number(r.driver_number), acr: r.abbreviation,
    latin: r.driverName, zh: DRIVERS_2026[r.driver_id]?.nameZh ?? zhName.driver(r.driver_id) ?? r.driverName,
    id: r.driver_id, color: teamColor(r.constructor_id),
    time: quali ? null : seconds(practice ? r.practice_time_millis : r.race_time_millis),
    gap: quali ? null : practice ? seconds(r.practice_gap_millis) : r.race_gap_laps ? `+${r.race_gap_laps} LAP` : seconds(r.race_gap_millis),
    q: quali ? [1, 2, 3].map((i) => seconds(r[`qualifying_q${i}_millis`])) : null,
    qGap: quali ? [1, 2, 3].map((i) => r[`qualifying_q${i}_millis`] == null ? null : seconds(r[`qualifying_q${i}_millis`] - best[i - 1])) : null,
    grid: grid.find((g) => g.driver_id === r.driver_id)?.position_number ?? null,
    laps: practice ? r.practice_laps : quali ? r.qualifying_laps : r.race_laps,
    points: practice || quali ? null : r.race_points,
    status: r.position_text === "DSQ" ? "DSQ" : r.position_text === "DNS" ? "DNS" : r.race_reason_retired ? "DNF" : null,
  }));
}
