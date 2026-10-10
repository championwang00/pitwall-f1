import { liveState, timingWeekends, doneSessions } from "@/lib/live";
import { CIRCUIT_ID } from "@/components/live/names";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const state = await liveState({ results: false });
  const askedYear = Number(query.get("year"));
  const year = askedYear >= 2023 && askedYear <= state.year ? askedYear : state.panelYear;
  const weekends = year === state.panelYear ? state.weekends : await timingWeekends(year);
  const done = doneSessions(weekends);
  const requested = weekends.flatMap((w) => w.sessions).find((s) => s.session_key === Number(query.get("session")) && Date.parse(s.date_end) + 3600000 < Date.now());
  // the red-lights loader preloads THIS weekend's latest finished session first (Singapore sprint qualifying on
  // Friday night) — the replay a visitor is most likely to open — else the season's last race
  const weekendLatest = year === state.panelYear ? state.meetingDone.at(-1) : undefined;
  const thisWeekend = weekendLatest ? weekends.flatMap((w) => w.sessions).find((s) => s.session_key === weekendLatest.session_key) : undefined;
  const session = requested ?? thisWeekend ?? done.race ?? done.latest;
  // the loader prepares both: the current weekend's latest finished session AND the last race (user: 加载的是最近一场和当前一场该有的数据)
  const sessions = [session, done.race ?? done.latest].filter((x, i, a): x is NonNullable<typeof x> => !!x && a.findIndex((y) => y?.session_key === x.session_key) === i);
  const ownerOf = (k: number) => weekends.find((w) => w.sessions.some((x) => x.session_key === k))?.race ?? null;
  const track = session ? CIRCUIT_ID[session.circuit_short_name] ?? null : null;
  // a session's replay is a child of its race (v5.1): /races/Y/R/replay?session=K
  const owner = session ? weekends.find((w) => w.sessions.some((x) => x.session_key === session.session_key))?.race : null;
  const routes = [
    `/seasons/${year}/replay`,
    ...sessions.flatMap((x) => { const o = ownerOf(x.session_key); return o ? [`${o}/replay?session=${x.session_key}`] : []; }),
    `/races/${state.lastRace.year}/${state.lastRace.round}`,
    `/races/${state.lastRace.year}/${state.lastRace.round}/brief`,
  ];
  return Response.json({ session, sessions, year, track, nextTrack: state.nextRace?.circuit_id ?? null, routes }, { headers: { "cache-control": "public, max-age=60" } });
}
