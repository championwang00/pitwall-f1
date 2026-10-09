import { liveState, timingWeekends, doneSessions } from "@/lib/live";
import { CIRCUIT_ID } from "@/components/live/names";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const state = await liveState();
  const askedYear = Number(query.get("year"));
  const year = askedYear >= 2023 && askedYear <= state.year ? askedYear : state.panelYear;
  const weekends = year === state.panelYear ? state.weekends : await timingWeekends(year);
  const done = doneSessions(weekends);
  const requested = weekends.flatMap((w) => w.sessions).find((s) => s.session_key === Number(query.get("session")) && Date.parse(s.date_end) + 3600000 < Date.now());
  const session = requested ?? done.race ?? done.latest;
  const track = session ? CIRCUIT_ID[session.circuit_short_name] ?? null : null;
  const routes = [
    `/seasons/${year}/replay`,
    ...(session ? [`/seasons/${year}/replay?session=${session.session_key}`] : []),
    `/races/${state.lastRace.year}/${state.lastRace.round}`,
    `/races/${state.lastRace.year}/${state.lastRace.round}/brief`,
  ];
  return Response.json({ session, year, track, nextTrack: state.nextRace?.circuit_id ?? null, routes }, { headers: { "cache-control": "public, max-age=60" } });
}
