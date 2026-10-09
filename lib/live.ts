import { nextRace, lastCompletedRace, getRaceByYearRound } from "./f1";
import { weekendSessions } from "./openf1";
import { seasonSchedule, type ScheduledRace, type Sess } from "./schedule";
import type { SessionLite, Weekend } from "@/components/live/LiveTiming";

/**
 * /live state machine (IA spec §2.1).
 * - live:      a session is running (5 min before start → 60 min after end)
 * - weekend:   between two sessions of the same meeting
 * - between:   season in progress, between two race weekends
 * - preseason: this season's calendar is known but nothing has run yet
 * - offseason: this season is over and the next one isn't published
 */
export type Phase = "live" | "weekend" | "between" | "preseason" | "offseason";
export const PHASES: Phase[] = ["live", "weekend", "between", "preseason", "offseason"];

const LIVE_BEFORE = 5 * 60e3;
const LIVE_AFTER = 60 * 60e3;

/** OpenF1 sessions of one season, grouped per race weekend, in the shape LiveTiming takes. */
export async function timingWeekends(year: number): Promise<Weekend[]> {
  try {
    const raw = await weekendSessions(year);
    return raw.map(({ meeting, sessions }) => ({
      meeting_key: meeting.meeting_key,
      meeting_name: meeting.meeting_name,
      circuit_short_name: meeting.circuit_short_name,
      sessions: sessions.map((x) => ({
        session_key: x.session_key, session_name: x.session_name, session_type: x.session_type,
        date_start: x.date_start, date_end: x.date_end, circuit_short_name: x.circuit_short_name,
        meeting_key: x.meeting_key, meeting_name: meeting.meeting_name, country_name: x.country_name,
        location: x.location, gmt_offset: x.gmt_offset,
      })),
    }));
  } catch {
    return [];
  }
}

const isDone = (x: SessionLite, now: number) => Date.parse(x.date_end) + LIVE_AFTER < now;
const isLive = (x: SessionLite, now: number) => Date.parse(x.date_start) - LIVE_BEFORE <= now && now <= Date.parse(x.date_end) + LIVE_AFTER;

/** Last finished session of a season (any kind), and the last finished race. */
export function doneSessions(weekends: Weekend[], now = Date.now()) {
  const done = weekends.flatMap((w) => w.sessions).filter((x) => isDone(x, now)).sort((a, b) => a.date_start.localeCompare(b.date_start));
  return { latest: done[done.length - 1] ?? null, race: done.filter((x) => x.session_name === "Race").pop() ?? null };
}

export type LiveState = {
  phase: Phase;
  /** the phase the clock says, before any ?debugPhase= override */
  realPhase: Phase;
  /** season the hero belongs to (the next race's season) */
  year: number;
  nextRace: any | null;
  nextSession: (Sess & { round: number }) | null;
  liveSession: SessionLite | null;
  latestDoneSession: SessionLite | null;
  /** last finished race (f1db): always the "上一站" block */
  lastRace: { year: number; round: number; race: any };
  /** hero season schedule (OpenF1 session keys where known) */
  schedule: ScheduledRace[];
  /** OpenF1 weekends for the replay panel's season (= latestDoneSession's season) */
  weekends: Weekend[];
  panelYear: number;
  /** last finished race session in the panel season: the fallback when a live feed is refused */
  fallbackSession: SessionLite | null;
};

export async function liveState(opts: { debugPhase?: string | null; debugLive?: string | null } = {}): Promise<LiveState> {
  const now = Date.now();
  const next = nextRace() ?? null;
  const lastRef = lastCompletedRace();
  const lastRace = { year: lastRef.year as number, round: lastRef.round as number, race: getRaceByYearRound(lastRef.year, lastRef.round) };
  const year: number = next?.year ?? lastRace.year;

  const [schedule, weekendsThis] = await Promise.all([seasonSchedule(year).catch(() => [] as ScheduledRace[]), timingWeekends(year)]);
  const all = weekendsThis.flatMap((w) => w.sessions);

  let liveSession = all.find((x) => isLive(x, now)) ?? null;
  // dev-only: ?debugLive=<session_key> exercises the live/poll/fallback branch without a real live session
  if (process.env.NODE_ENV !== "production" && opts.debugLive) liveSession = all.find((x) => String(x.session_key) === String(opts.debugLive)) ?? liveSession;

  // replay panel season: this one if anything has run, else the previous season (preseason)
  let weekends = weekendsThis;
  let panelYear = year;
  let { latest: latestDoneSession, race: fallbackSession } = doneSessions(weekendsThis, now);
  if (!latestDoneSession && !liveSession && year > 2023) {
    const prev = await timingWeekends(year - 1);
    const d = doneSessions(prev, now);
    if (d.latest) { weekends = prev; panelYear = year - 1; latestDoneSession = d.latest; fallbackSession = d.race; }
  }

  let nextSession: LiveState["nextSession"] = null;
  for (const r of schedule) {
    const x = r.sessions.find((s) => Date.parse(s.end) > now);
    if (x) { nextSession = { ...x, round: r.round }; break; }
  }

  const meetingOf = (key: number | null | undefined) => (key == null ? null : all.find((x) => x.session_key === key)?.meeting_key ?? null);
  const realPhase: Phase =
    liveSession ? "live"
    : nextSession && latestDoneSession && meetingOf(nextSession.key) != null && meetingOf(nextSession.key) === latestDoneSession.meeting_key ? "weekend"
    : lastRace.year < year ? "preseason"
    : !next ? "offseason"
    : "between";

  const debug = process.env.NODE_ENV !== "production" && opts.debugPhase && (PHASES as string[]).includes(opts.debugPhase) ? (opts.debugPhase as Phase) : null;
  const phase = debug ?? realPhase;
  // debug "live" without a running session: treat the next session as live (the panel then waits for its first laps)
  if (phase === "live" && !liveSession && nextSession?.key) liveSession = all.find((x) => x.session_key === nextSession!.key) ?? null;

  return { phase, realPhase, year, nextRace: next, nextSession, liveSession, latestDoneSession, lastRace, schedule, weekends, panelYear, fallbackSession };
}
