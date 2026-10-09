import { nextRace, lastCompletedRace, getRaceByYearRound, raceResults, driverStandingsAfter, constructorStandingsAfter, seasonRaces, allSeasons } from "./f1";
import { weekendSessions } from "./openf1";
import { trackShape } from "./tracks";

export async function homeData() {
  const next = nextRace();
  const last = lastCompletedRace();
  const lastRace = getRaceByYearRound(last.year, last.round);
  const lastResults = raceResults(lastRace.id).slice(0, 10);
  const drivers = driverStandingsAfter(last.year);
  const teams = constructorStandingsAfter(last.year);
  const calendar = seasonRaces(next?.year ?? last.year);
  let weekend: Awaited<ReturnType<typeof weekendSessions>>[number] | null = null;
  try {
    const ws = await weekendSessions(next?.year ?? last.year);
    weekend = ws.find((w) => w.sessions.some((s) => s.session_name === "Race" && s.date_start.slice(0, 10) === next?.date)) ?? null;
  } catch {}
  const track = next ? trackShape(next.circuit_id) : null;
  const seasons = allSeasons();
  return { next, last, lastRace, lastResults, drivers, teams, calendar, weekend, track, seasons };
}
