import { preparedJSON } from "./preparedJSON";
import { buildModel, ENDPOINTS, type Raw } from "@/components/live/model";
import type { SessionLite } from "@/components/live/LiveTiming";

/** Prepare exactly the URLs the replay consumes, not an unused copy of its data. */
export async function preloadReplay(report: (fraction: number) => void, prefetch: (routes: string[]) => void) {
  const query = new URLSearchParams();
  const year = location.pathname.match(/^\/(?:seasons\/(\d+)|races\/(\d+)\/\d+)\/replay/)?.slice(1).find(Boolean);
  if (year) query.set("year", year);
  const asked = new URLSearchParams(location.search).get("session");
  if (asked) query.set("session", asked);
  // the plan changes as the weekend runs (a new session finishes): always fresh, never the force-cached copy
  const response = await preparedJSON(`/api/initial-load?${query}`, false);
  if (!response.ok) throw new Error("Initial replay plan unavailable");
  const plan = response.data as { session: SessionLite | null; sessions?: SessionLite[]; year: number; track: string | null; nextTrack: string | null; routes: string[] };
  // every session the plan names: this weekend's latest finished one and the last race (the primary is the first)
  const all = plan.sessions?.length ? plan.sessions : plan.session ? [plan.session] : [];
  prefetch(plan.routes);
  report(0.05);
  const jobs: (() => Promise<unknown>)[] = [
    () => import("@/components/live/LiveTiming"),
    () => import("@/components/three/Track3D"),
    ...all.flatMap((x) => ENDPOINTS.map((ep) => () => preparedJSON(`/api/openf1/${ep}?session_key=${x.session_key}`))),
    ...Array.from(new Set([...all.map((x) => x.circuit_short_name), plan.nextTrack].filter(Boolean))).map((track) => () => preparedJSON(`/api/track/${encodeURIComponent(track!)}?v=corners1`)),
  ];
  let completed = 0;
  let next = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try { await job(); } catch {} finally { report(0.05 + 0.75 * ++completed / jobs.length); }
    }
  }));
  if (plan.session && plan.track) {
    const results = await Promise.all(ENDPOINTS.map((ep) => preparedJSON(`/api/openf1/${ep}?session_key=${plan.session!.session_key}`)));
    const raw = Object.fromEntries(ENDPOINTS.map((ep, i) => [ep, Array.isArray(results[i].data) ? results[i].data : []])) as Raw;
    const model = buildModel(plan.session, raw);
    const acrs = model.finalOrder.slice(0, 2).map((n) => model.drivers.get(n)?.acr).filter(Boolean).join(",");
    const avatars = raw.drivers.map((d) => d.headshot_url).filter((url): url is string => Boolean(url)).slice(0, 22);
    const talk = await preparedJSON(`/api/talk?circuit=${plan.track}&acr=${acrs}`);
    const people = talk.ok ? Object.values((talk.data as { drivers: Record<string, { id: string } | null> }).drivers).filter((d): d is { id: string } => Boolean(d)) : [];
    const urls = [...avatars, ...people.map((person) => `/api/face/${person.id}?v=3&s=36&year=${plan.year}`)];
    const extras = urls.map(async (url) => { const image = new Image(); image.src = url; await image.decode(); });
    extras.push(import("@/components/live/radioTranscripts").then(({ peekAll }) => peekAll(raw.team_radio.map((clip) => clip.recording_url).filter(Boolean))));
    let extraDone = 0;
    await Promise.allSettled(extras.map((job) => job.finally(() => report(0.8 + 0.2 * ++extraDone / Math.max(1, extras.length)))));
  }
  report(1);
}
