import { notFound } from "next/navigation";
import y from "./season.module.css";
import { seasonRaces } from "@/lib/f1";
import { all } from "@/lib/db";
import YearTabs from "@/components/season/YearTabs";
import YearCrumbs from "@/components/season/YearCrumbs";
import { seasonSchedule, type ScheduledRace } from "@/lib/schedule";
import { replayHref } from "@/lib/raceCards";

export const dynamic = "force-dynamic";

/** 回放 tab (v5.1 §0.5): 2023 ≤ Y ≤ this season, OpenF1 timing. `rounds` = finished races with a replay (the tab's
 *  count; 0 → no tab). The tab is an index of those races; each opens /races/Y/R/replay. */
async function replayIndex(year: number) {
  if (year < 2023 || year > new Date().getUTCFullYear()) return { rounds: 0 };
  const sched: ScheduledRace[] = await seasonSchedule(year).catch(() => []);
  return { rounds: sched.filter((r) => !!replayHref(r)).length };
}

export default async function YearLayout({ params, children }: { params: Promise<{ year: string }>; children: React.ReactNode }) {
  const { year: ys } = await params;
  const year = +ys;
  const races = seasonRaces(year);
  if (!races.length) notFound();
  const counts = all<any>(`select count(distinct r.circuit_id) c, count(distinct rr.driver_id) d, count(distinct rr.constructor_id) t
    from race r left join race_result rr on rr.race_id = r.id where r.year = ?`, year)[0];
  const replay = await replayIndex(year);

  /* Year hub (v5.1, user: 「导航放到最上面 … 总览是整体介绍，点 tab 显示对应内容」): the tab bar is the page's first block
     (breadcrumb inside it, sticky), then ONLY the selected tab's content. The season card + 赛季综述 live on 总览. */
  return (
    <div className={y.page}>
      <YearTabs year={year} crumbs={<YearCrumbs year={year} />}
        counts={{ calendar: races.length, circuits: counts.c, drivers: counts.d, teams: counts.t, ...(replay.rounds ? { replay: replay.rounds } : {}) }} />
      {children}
    </div>
  );
}
