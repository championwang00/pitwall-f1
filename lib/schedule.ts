import { seasonRaces } from "./f1";
import { weekendSessions } from "./openf1";

export type Sess = { key: number | null; name: string; start: string; end: string };
export type ScheduledRace = {
  round: number; year: number; gp: string; gpName: string; circuit: string; circuitName: string; place: string; country: string;
  date: string; sprint: boolean; winner: string | null; winnerTeam: string | null; meetingKey: number | null; official: string; sessions: Sess[];
};

function f1dbSessions(r: any): Sess[] {
  const mk = (name: string, d?: string | null, t?: string | null, mins = 60): Sess | null => {
    if (!d) return null;
    const start = new Date(`${d}T${t || "12:00"}:00Z`);
    return { key: null, name, start: start.toISOString(), end: new Date(start.getTime() + mins * 60000).toISOString() };
  };
  return [
    mk("Practice 1", r.free_practice_1_date, r.free_practice_1_time),
    mk("Practice 2", r.free_practice_2_date, r.free_practice_2_time),
    mk("Practice 3", r.free_practice_3_date, r.free_practice_3_time),
    mk("Sprint Qualifying", r.sprint_qualifying_date, r.sprint_qualifying_time, 45),
    mk("Sprint", r.sprint_race_date, r.sprint_race_time, 45),
    mk("Qualifying", r.qualifying_date, r.qualifying_time),
    mk("Race", r.date, r.time, 120),
  ].filter(Boolean) as Sess[];
}

export async function seasonSchedule(year: number): Promise<ScheduledRace[]> {
  const races = seasonRaces(year);
  let weekends: Awaited<ReturnType<typeof weekendSessions>> = [];
  try { weekends = await weekendSessions(year); } catch {}
  return races.map((r: any) => {
    const w = weekends.find((w) => w.sessions.some((s) => s.session_name === "Race" && s.date_start.slice(0, 10) === r.date));
    const sessions: Sess[] = w
      ? w.sessions.map((s) => ({ key: s.session_key, name: s.session_name, start: s.date_start, end: s.date_end }))
      : f1dbSessions(r);
    return {
      round: r.round, year, gp: r.gp, gpName: r.gpFullName, circuit: r.circuit, circuitName: r.circuitName, place: r.place_name,
      country: r.country, date: r.date, sprint: !!r.sprint_race_date || sessions.some((s) => s.name === "Sprint"),
      winner: r.winner, winnerTeam: r.winnerTeam, meetingKey: w?.meeting.meeting_key ?? null, official: r.official_name, sessions,
    };
  });
}

export async function nextSession() {
  const year = new Date().getUTCFullYear();
  const sched = await seasonSchedule(year);
  const now = Date.now();
  for (const r of sched) for (const s of r.sessions) {
    if (new Date(s.end).getTime() > now) return { name: s.name, start: s.start, end: s.end, gp: r.gp, country: r.country, round: r.round, year };
  }
  return null;
}
