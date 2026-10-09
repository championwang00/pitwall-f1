import { permanentRedirect, redirect } from "next/navigation";
import { seasonSchedule } from "@/lib/schedule";
import { replayHref, sessionReplayHref } from "@/lib/raceCards";
import ReplayTab from "@/components/season/ReplayTab";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => { const n = Number(one(v)); return Number.isFinite(n) && n > 0 ? n : null; };

/**
 * /seasons/Y/replay — the year hub's 回放 tab (IA spec v5.1 §0.5): an INDEX of this season's replayable rounds; each card
 * opens that race's replay page (/races/Y/R/replay). No timing viewer here.
 * ?session=K (old deep link) → the replay page of the race weekend that owns K, keeping a / b.
 */
export default async function ReplayIndexPage({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<SP> }) {
  const year = +(await params).year;
  const sp = await searchParams;
  const latest = new Date().getUTCFullYear();
  // OpenF1 covers 2023 onwards; anything else has no replay → the season itself (§0.5.5)
  if (!(year >= 2023 && year <= latest)) permanentRedirect(`/seasons/${year}`);
  const asked = num(sp.session);
  if (asked) {
    const extra = new URLSearchParams();
    for (const k of ["a", "b"]) { const v = one(sp[k]); if (v) extra.set(k, v); }
    const to = await sessionReplayHref(year, asked, extra);
    if (to) permanentRedirect(to);
  }
  const schedule = await seasonSchedule(year).catch(() => []);
  const known = schedule.some((r) => r.sessions.some((x) => x.key));
  const now = Date.now();
  // OpenF1 answered but nothing has run yet this season → the season page (temporary: it will have replays)
  if (known && !schedule.some((r) => replayHref(r, now))) redirect(`/seasons/${year}`);
  return <ReplayTab year={year} schedule={schedule} now={now} />;
}
