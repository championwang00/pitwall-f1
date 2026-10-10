import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { liveState } from "@/lib/live";
import LivePage, { type PanelProps } from "@/components/live/LivePage";
import { sessionReplayHref } from "@/lib/raceCards";

export const metadata: Metadata = {
  title: "实时 · PITWALL",
  description: "下一站倒计时与 3D 赛道、本赛季每一站（领奖台与计时回放入口）；节次进行中时显示实时计时。",
};

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => { const n = Number(one(v)); return Number.isFinite(n) && n > 0 ? n : null; };

/** a / b of an old replay deep link (session goes into the path's owner) */
function ab(sp: SP) {
  const q = new URLSearchParams();
  for (const k of ["a", "b"]) { const v = one(sp[k]); if (v) q.set(k, v); }
  return q;
}

/**
 * /live = this season's "now" (IA spec v5 S4): next-race hero + this season's race cards; the timing panel only while a
 * session is live. Old replay deep links move to the race that owns the session (v5.1 §0.5.5):
 * ?year=Y&session=K → /races/Y/R/replay?session=K[&a&b]; ?year=Y alone → /seasons/Y/replay (2023 ≤ Y ≤ this season) or
 * /seasons/Y; ?session=K (not the live one) → its race's replay page; ?a&b alone → /seasons/{this season}/replay.
 */
export default async function Live({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // results: false — the weekend's classifications stream in under <Suspense> (LivePage), the page never waits on OpenF1
  const st = await liveState({ debugPhase: one(sp.debugPhase) ?? null, debugLive: one(sp.debugLive) ?? null, debugWeekend: one(sp.debugWeekend) ?? null, results: false });
  const asked = num(sp.session);
  const askedYear = num(sp.year);
  const live = st.phase === "live" ? st.liveSession : null;

  if (askedYear) {
    if (!(askedYear >= 2023 && askedYear <= st.year)) permanentRedirect(`/seasons/${askedYear}`);
    permanentRedirect((asked && await sessionReplayHref(askedYear, asked, ab(sp))) || `/seasons/${askedYear}/replay`);
  }
  if (asked && asked !== live?.session_key) {
    permanentRedirect((await sessionReplayHref(st.year, asked, ab(sp))) || (await sessionReplayHref(st.year - 1, asked, ab(sp))) || `/seasons/${st.year}/replay`);
  }
  if (!asked && !live && (sp.a || sp.b)) permanentRedirect(`/seasons/${st.year}/replay`);

  const panel: PanelProps = {
    weekends: st.weekends,
    initialKey: live?.session_key ?? null,
    liveKey: live?.session_key ?? null,
    // only this weekend's own finished session — never another Grand Prix
    fallbackKey: st.weekendDone?.session_key ?? null,
    initialA: num(sp.a), initialB: num(sp.b),
    focus: !!asked && live?.session_key === asked,
  };
  return <LivePage st={st} panel={panel} />;
}
