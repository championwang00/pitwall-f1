import { nextRace, lastCompletedRace, getRaceByYearRound } from "./f1";
import { weekendSessions } from "./openf1";
import { seasonSchedule, type ScheduledRace, type Sess } from "./schedule";
import type { SessionLite, Weekend } from "@/components/live/LiveTiming";
import { CIRCUIT_ID } from "@/components/live/names";
import { all } from "./db";
import { cachedJSON } from "./cache";
import { raceReplayPath } from "./raceCards";
import { DRIVERS_2026, teamColor } from "./assets";
import { radioPerson } from "@/components/live/radioPeople";
import { zhName } from "./zh";
import type { Driver, RawDriver, RawResult } from "@/components/live/model";

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
const LIVE_AFTER = 15 * 60e3; // a session stops being 「进行中」 15 min after its scheduled end (was 60: FP1 read 进行中 long after it ended)

/** OpenF1 sessions of one season, grouped per race weekend, in the shape LiveTiming takes. */
export async function timingWeekends(year: number): Promise<Weekend[]> {
  try {
    const raw = await weekendSessions(year);
    return raw.map(({ meeting, sessions }) => ({
      meeting_key: meeting.meeting_key,
      meeting_name: meeting.meeting_name,
      circuit_short_name: meeting.circuit_short_name,
      race: raceHref(year, meeting.circuit_short_name, sessions.at(-1)?.date_start),
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

/** The f1db race of an OpenF1 meeting (same circuit that year, nearest date) → /races/Y/R, for the timing header link. */
function raceHref(year: number, short: string, date?: string): string | null {
  const c = CIRCUIT_ID[short];
  if (!c) return null;
  const rs = all<any>("select round, date from race where year = ? and circuit_id = ?", year, c);
  if (!rs.length) return null;
  const t = date ? Date.parse(date) : 0;
  const r = rs.sort((a, b) => Math.abs(Date.parse(a.date) - t) - Math.abs(Date.parse(b.date) - t))[0];
  return `/races/${year}/${r.round}`;
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
  /** last finished race session in the panel season (replay hub use) */
  fallbackSession: SessionLite | null;
  /** OpenF1 actually serves the live session's timing (free tier refuses live data: 401) — only then is 进行中 a link */
  liveFeed: boolean;
  /** last finished session of the live session's OWN weekend (FP1 while sprint quali runs): the only fallback the
   *  live panel may switch to — never another Grand Prix (user: 点击进行中的新加坡比赛，应该去当前赛道) */
  weekendDone: SessionLite | null;
  /** the current weekend's (liveSession ?? nextSession) sessions past their scheduled end, newest first, each with its
   *  OpenF1 classification when published (rows: null = 数据整理中) and a replay link only when OpenF1 serves its laps */
  meetingDone: DoneSession[];
  /** the weekend's OpenF1 meeting and its F1DB round (for `weekendResults`, streamed in after the page) */
  meetingKey: number | null;
  meetingRound: number | null;
};

/* ───────── this weekend's finished sessions (/live 「本站已结束节次」) ───────── */

export type DoneKind = "practice" | "quali" | "race";
export type ResultRow = {
  pos: number | null; num: number; acr: string; latin: string; zh: string;
  /** F1DB driver id (face + link); null = unmapped → plain name */
  id: string | null; color: string;
  /** practice: best lap (s) · race: total time (s) · quali: null (see q) */
  time: number | null;
  /** to the leader: seconds, or OpenF1's "+1 LAP" string */
  gap: number | string | null;
  /** quali: best lap of Q1 / Q2 / Q3 (s) and the gap to the fastest in each */
  q: (number | null)[] | null; qGap: (number | null)[] | null;
  /** quali: starting grid slot of the race it sets (OpenF1 starting_grid), when published */
  grid: number | null;
  laps: number | null; points: number | null; status: "DNF" | "DNS" | "DSQ" | null;
};
export type DoneSession = SessionLite & { kind: DoneKind; rows: ResultRow[] | null; replay: string | null };

const OF1 = "https://api.openf1.org/v1";
const RESULTS_BUDGET = 2500; // ms: never hold the page on a slow OpenF1 — whatever is not back by then reads 数据整理中
const kindOf = (name: string): DoneKind => /practice/i.test(name) ? "practice" : /qualifying|shootout/i.test(name) ? "quali" : "race";
const within = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
/** fresh sessions refetch every 60 s (penalties, late publication); settled ones (>3 h, data in) much less often */
const settled = (x: SessionLite) => Date.now() - Date.parse(x.date_end) > 3 * 3600e3;

type DoneIn = SessionLite & { /** quali only: the race-type session whose grid it sets (SQ → Sprint, Q → Race) */ gridFor?: number };
type GridRow = { session_key: number; driver_number: number; position: number };

/** OpenF1 driver → site person: F1DB id via the F1.com image code (radioPeople), checked against F1DB, else the
 *  season's entrant by acronym / number; Chinese name; F1DB team (colour) */
function sitePerson(d: RawDriver, year: number) {
  const p = radioPerson({ num: d.driver_number, acr: d.name_acronym, name: d.full_name, team: d.team_name ?? "", headshot: d.headshot_url } as Driver, d.driver_number);
  let id: string | null = p.id;
  if (!DRIVERS_2026[id] && !all("select 1 from driver where id = ?", id).length) {
    const r = all<{ id: string; n: string | null }>(
      "select d.id, d.permanent_number n from season_entrant_driver sed join driver d on d.id = sed.driver_id where sed.year = ? and (d.abbreviation = ? or d.permanent_number = ?)",
      year, d.name_acronym, String(d.driver_number));
    id = (r.find((x) => x.n === String(d.driver_number)) ?? r[0])?.id ?? null;
  }
  const zh = (id && (DRIVERS_2026[id]?.nameZh ?? zhName.driver(id))) || p.zh;
  return { id, zh, latin: p.latin, color: p.teamId ? teamColor(p.teamId) : d.team_colour ? `#${d.team_colour}` : "#606066" };
}

const fin = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** one finished session → classification rows (null = OpenF1 has not published it) + replay link (null = laps not served) */
async function sessionDone(x: DoneIn, year: number, round: number | null, grid: Promise<GridRow[] | null>) {
  const ttl = settled(x) ? 1800 : 60;
  const [res, drv, laps] = await Promise.all([
    cachedJSON<RawResult[] | null>(`${OF1}/session_result?session_key=${x.session_key}`, ttl).catch(() => null),
    cachedJSON<RawDriver[] | null>(`${OF1}/drivers?session_key=${x.session_key}`, 3600).catch(() => null),
    // the replay panel's own request (same URL + TTL policy as /api/openf1): a link only when it will load — and it warms that cache
    cachedJSON<unknown[] | null>(`${OF1}/laps?session_key=${x.session_key}`, settled(x) ? Infinity : 60).catch(() => null),
  ]);
  const replay = round != null && Array.isArray(laps) && laps.length > 0 && Array.isArray(drv) && drv.length > 0 ? raceReplayPath(year, round, x.session_key) : null;
  // warm everything else the replay panel loads (fire and forget), so 「计时回放」 opens instantly the first time too
  if (replay) for (const ep of ["intervals", "position", "stints", "pit", "race_control", "weather", "team_radio"])
    cachedJSON(`${OF1}/${ep}?session_key=${x.session_key}`, settled(x) ? Infinity : 60).catch(() => null);
  if (!Array.isArray(res) || !res.length) return { rows: null, replay };
  const kind = kindOf(x.session_name);
  const byNum = new Map((Array.isArray(drv) ? drv : []).map((d) => [d.driver_number, d]));
  const g = kind === "quali" ? (await grid) ?? [] : [];
  // the grid this quali sets: rows keyed to the quali itself or to the race-type session right after it
  const gridOf = new Map(g.filter((r) => r.session_key === x.session_key || r.session_key === x.gridFor).map((r) => [r.driver_number, r.position]));
  const rows: ResultRow[] = [...res]
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((r) => {
      const d = byNum.get(r.driver_number);
      const who = d ? sitePerson(d, year) : null;
      const q = Array.isArray(r.duration) ? (r.duration as unknown[]).map(fin) : null;
      return {
        pos: r.position, num: r.driver_number, acr: d?.name_acronym ?? String(r.driver_number),
        latin: who?.latin ?? `#${r.driver_number}`, zh: who?.zh ?? `#${r.driver_number}`, id: who?.id ?? null, color: who?.color ?? "#606066",
        time: q ? null : fin(r.duration),
        gap: q ? null : typeof r.gap_to_leader === "string" ? r.gap_to_leader : fin(r.gap_to_leader),
        q, qGap: Array.isArray(r.gap_to_leader) ? (r.gap_to_leader as unknown[]).map(fin) : null,
        grid: gridOf.get(r.driver_number) ?? null,
        laps: r.number_of_laps ?? null, points: kind === "race" ? r.points ?? 0 : null,
        status: r.dsq ? "DSQ" : r.dns ? "DNS" : r.dnf ? "DNF" : null,
      };
    });
  return { rows, replay };
}

/** results memo per session (bounds OpenF1 traffic to one round per TTL whatever the page traffic; 404s are not cached by cachedJSON) */
const doneMemo = new Map<number, { at: number; v: { rows: ResultRow[] | null; replay: string | null } }>();
const doneFlight = new Map<number, Promise<{ rows: ResultRow[] | null; replay: string | null }>>();

async function meetingResults(sessions: DoneIn[], meetingKey: number, year: number, round: number | null, budget = RESULTS_BUDGET): Promise<DoneSession[]> {
  const out = sessions.map((x) => ({ ...x, kind: kindOf(x.session_name), rows: null as ResultRow[] | null, replay: null as string | null }));
  const memoOk = (k: number, x: SessionLite) => { const m = doneMemo.get(k); return m && Date.now() - m.at < (settled(x) && m.v.rows && m.v.replay ? 1800e3 : 60e3) ? m.v : null; };
  let grid: Promise<GridRow[] | null> | null = null;
  const gridOnce = () => (grid ??= cachedJSON<GridRow[] | null>(`${OF1}/starting_grid?meeting_key=${meetingKey}`, 60).catch(() => null));
  const fetchDone = (x: (typeof out)[number]) => {
    let p = doneFlight.get(x.session_key);
    if (!p) {
      p = sessionDone(x, year, round, x.kind === "quali" ? gridOnce() : Promise.resolve(null))
        .then((v) => { doneMemo.set(x.session_key, { at: Date.now(), v }); return v; })
        .finally(() => doneFlight.delete(x.session_key));
      doneFlight.set(x.session_key, p);
    }
    return p;
  };
  await Promise.all(out.map(async (x) => {
    const hit = memoOk(x.session_key, x);
    // stale-while-revalidate: an expired answer is served at once and refreshed behind the page (no 2.5 s wait each minute)
    // — but only a stale answer WITH results: a stale "not published yet" is refetched now. On serverless (Vercel) the
    // background refresh may never finish once the response is sent, so a stale null would stick for good.
    const prev = doneMemo.get(x.session_key)?.v;
    const stale = hit ? null : prev?.rows ? prev : null;
    if (stale) fetchDone(x).catch(() => {});
    const v = hit ?? stale ?? await within(fetchDone(x), budget);
    if (!v) return; // timed out: 数据整理中 now; the fetch keeps going and fills the cache for the next load
    x.rows = v.rows; x.replay = v.replay;
  }));
  return out.reverse(); // newest first
}

/** does OpenF1 serve this session's laps right now? (cached 60 s; a refusal or an empty feed = no) */
const feedCache = new Map<number, { at: number; ok: boolean }>();
async function feedOk(key: number): Promise<boolean> {
  const c = feedCache.get(key);
  if (c && Date.now() - c.at < 60e3) return c.ok;
  // stale-while-revalidate: answer with the last probe now, re-probe in the background
  // (only a stale "available": a stale "refused" is re-probed now — on serverless a background probe may never finish)
  if (c?.ok) { feedCache.set(key, { at: Date.now() - 50e3, ok: c.ok }); probeFeed(key).catch(() => {}); return c.ok; }
  return probeFeed(key);
}
async function probeFeed(key: number): Promise<boolean> {
  let ok = false;
  try {
    const r = await fetch(`https://api.openf1.org/v1/laps?session_key=${key}&lap_number=1`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    const rows = r.ok ? await r.json().catch(() => null) : null;
    ok = Array.isArray(rows) && rows.length > 0;
  } catch { ok = false; }
  feedCache.set(key, { at: Date.now(), ok });
  return ok;
}

export async function liveState(opts: { debugPhase?: string | null; debugLive?: string | null; debugWeekend?: string | null;
  /** false: skip this weekend's OpenF1 classifications (callers that never render them, e.g. /api/initial-load) */
  results?: boolean } = {}): Promise<LiveState> {
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

  const liveFeed = phase === "live" && liveSession ? await feedOk(liveSession.session_key) : false;
  const weekendDone = liveSession
    ? all.filter((x) => x.meeting_key === liveSession!.meeting_key && x.session_key !== liveSession!.session_key && isDone(x, now)).sort((a, b) => a.date_start.localeCompare(b.date_start)).pop() ?? null
    : null;

  // this weekend = the live session's meeting, else the next session's; dev-only ?debugWeekend=<meeting_key> points at a past one
  let meetingKey = liveSession?.meeting_key ?? meetingOf(nextSession?.key);
  if (process.env.NODE_ENV !== "production" && opts.debugWeekend && all.some((x) => String(x.meeting_key) === String(opts.debugWeekend))) meetingKey = Number(opts.debugWeekend);
  const mine = meetingKey == null ? [] : all.filter((x) => x.meeting_key === meetingKey).sort((a, b) => a.date_start.localeCompare(b.date_start));
  // past its scheduled end = finished (the hero already reads 「刚结束」 then), even inside the 15-min overrun window
  const ended = mine.filter((x) => Date.parse(x.date_end) < now).map((x) => {
    // the race-type session a quali sets the grid for (SQ → Sprint, Q → Race)
    const gridFor = kindOf(x.session_name) === "quali" ? mine.find((y) => y.date_start > x.date_start && kindOf(y.session_name) === "race")?.session_key : undefined;
    return { ...x, gridFor };
  });
  const round = schedule.find((r) => r.sessions.some((s) => mine.some((x) => x.session_key === s.key)))?.round ?? null;
  const meetingDone = !ended.length || meetingKey == null ? []
    : opts.results === false ? ended.map((x) => ({ ...x, kind: kindOf(x.session_name), rows: null, replay: null }))
    : await meetingResults(ended, meetingKey, year, round);

  return { phase, realPhase, year, nextRace: next, nextSession, liveSession, latestDoneSession, lastRace, schedule, weekends, panelYear, fallbackSession, liveFeed, weekendDone, meetingDone, meetingKey: meetingKey ?? null, meetingRound: round };
}

/**
 * This weekend's classifications, for the /live section streamed in under <Suspense> (the page itself never waits for
 * OpenF1): a generous budget, so a cold serverless instance fetching from scratch shows the results instead of a
 * premature 数据整理中. `st` comes from liveState({ results: false }).
 */
export async function weekendResults(st: LiveState, budget = 15000): Promise<DoneSession[]> {
  if (!st.meetingDone.length || st.meetingKey == null) return [];
  return meetingResults(st.meetingDone, st.meetingKey, st.year, st.meetingRound, budget);
}
