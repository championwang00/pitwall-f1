import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { liveState } from "@/lib/live";
import LivePage, { type PanelProps } from "@/components/live/LivePage";

export const metadata: Metadata = {
  title: "实时 · PITWALL",
  description: "下一站倒计时与 3D 赛道、本赛季每一站（领奖台与计时回放入口）；节次进行中时显示实时计时。",
};

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => { const n = Number(one(v)); return Number.isFinite(n) && n > 0 ? n : null; };

/** keep session / a / b when moving a replay deep link to the year hub */
function replayQuery(sp: SP) {
  const q = new URLSearchParams();
  for (const k of ["session", "a", "b"]) { const v = one(sp[k]); if (v) q.set(k, v); }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * /live = this season's "now" (IA spec v5 S4): next-race hero + this season's race cards; the timing panel only while a
 * session is live. Old replay deep links move to the year hub (§0.5.5):
 * ?year=Y → /seasons/Y/replay[?session&a&b] (2023 ≤ Y ≤ this season) or /seasons/Y; ?session=K (not the live one) / ?a&b →
 * /seasons/{this season}/replay?….
 */
export default async function Live({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const st = await liveState({ debugPhase: one(sp.debugPhase) ?? null, debugLive: one(sp.debugLive) ?? null });
  const asked = num(sp.session);
  const askedYear = num(sp.year);
  const live = st.phase === "live" ? st.liveSession : null;

  if (askedYear) permanentRedirect(askedYear >= 2023 && askedYear <= st.year ? `/seasons/${askedYear}/replay${replayQuery(sp)}` : `/seasons/${askedYear}`);
  if ((asked && asked !== live?.session_key) || (!asked && !live && (sp.a || sp.b))) permanentRedirect(`/seasons/${st.year}/replay${replayQuery(sp)}`);

  const panel: PanelProps = {
    weekends: st.weekends,
    initialKey: live?.session_key ?? null,
    liveKey: live?.session_key ?? null,
    fallbackKey: st.fallbackSession?.session_key ?? null,
    initialA: num(sp.a), initialB: num(sp.b),
    focus: !!asked && live?.session_key === asked,
  };
  return <LivePage st={st} panel={panel} />;
}
