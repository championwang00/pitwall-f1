import { permanentRedirect } from "next/navigation";
import { timingWeekends, doneSessions } from "@/lib/live";
import { seasonSchedule } from "@/lib/schedule";
import type { PanelProps } from "@/components/live/LivePage";
import ReplayTab from "@/components/season/ReplayTab";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => { const n = Number(one(v)); return Number.isFinite(n) && n > 0 ? n : null; };

/** /seasons/Y/replay[?session=K][&a&b] — timing replay as a tab of the year hub (IA spec v5 §0.5.4 / P0-11). */
export default async function ReplayTabPage({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<SP> }) {
  const year = +(await params).year;
  const sp = await searchParams;
  const latest = new Date().getUTCFullYear();
  // OpenF1 covers 2023 onwards; anything else has no replay → the season itself (§0.5.5)
  if (!(year >= 2023 && year <= latest)) permanentRedirect(`/seasons/${year}`);
  const [weekends, schedule] = await Promise.all([timingWeekends(year), seasonSchedule(year).catch(() => [])]);
  const { race, latest: last } = doneSessions(weekends);
  // nothing has run yet this season (OpenF1 reachable but no finished session) → the season page
  if (weekends.length && !last) permanentRedirect(`/seasons/${year}`);
  const asked = num(sp.session);
  const all = weekends.flatMap((w) => w.sessions);
  const initial = all.find((x) => x.session_key === asked) ?? race ?? last;
  const panel: PanelProps = {
    weekends, initialKey: initial?.session_key ?? null, liveKey: null, fallbackKey: race?.session_key ?? null,
    initialA: num(sp.a), initialB: num(sp.b), focus: !!asked && initial?.session_key === asked,
  };
  return <ReplayTab year={year} latest={latest} schedule={schedule} panel={panel} />;
}
