import Link from "next/link";
import l from "@/components/live/livepage.module.css";
import type { ScheduledRace } from "@/lib/schedule";
import { ScheduleCard, seasonPodiums, replayHref } from "@/lib/raceCards";
import RailScope from "./RailScope";

/** The rail on the 回放 tab (§1.2.5): history tree, 2023+ rows say ▶ 回放 and stay on this tab; older years open the season. */
function replayRail(year: number, latest: number) {
  const ys = Array.from({ length: latest - 2023 + 1 }, (_, i) => 2023 + i);
  return {
    current: year,
    map: Object.fromEntries(ys.map((y) => [y, `/seasons/${y}/replay`])),
    fallback: "/seasons/{y}",
    rows: Object.fromEntries(ys.map((y) => [y, { sub: "▶ 回放" }])),
  };
}

/**
 * 回放 = the year hub's eighth tab (IA spec v5.1 §0.5): an index of the season's replayable rounds as the standard race
 * cards — each card (and its ▶) opens THAT race's replay page /races/Y/R/replay; 「本站档案」 opens the race. The timing
 * viewer itself lives only on the race's replay page (user: a replay is a child of its race, not a season-wide page).
 */
export default function ReplayTab({ year, schedule, now }: { year: number; schedule: ScheduledRace[]; now: number }) {
  const latest = new Date(now).getUTCFullYear();
  const rows = schedule.map((r) => ({ r, href: replayHref(r, now) })).filter((x): x is { r: ScheduledRace; href: string } => !!x.href);
  const pod = seasonPodiums(year);
  return (
    <div data-page="replay-index">
      <RailScope {...replayRail(year, latest)} />
      <section className={l.section}>
        <div className={l.head}>
          <div><p className="kicker">Replay · OpenF1</p><h2 className="cn-h2">{year} 赛季 · 可回放分站</h2></div>
          <span className={l.sub}>{rows.length ? <>共 <b>{rows.length}</b> 站 · 点一站进入它的计时回放（练习赛、排位赛、冲刺赛、正赛）</> : "OpenF1 暂时没有响应，稍后刷新"}</span>
        </div>
        {rows.length ? (
          <ol className={l.grid}>
            {rows.map(({ r, href }) => <ScheduleCard key={r.round} r={r} state="done" podium={pod(r.round)} replay={href} href={href} />)}
          </ol>
        ) : (
          <div className={l.empty}><Link href={`/seasons/${year}`} className="btn btn-ink">{year} 赛季</Link></div>
        )}
      </section>
    </div>
  );
}
