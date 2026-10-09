import { ViewTransition } from "react";
import cal from "@/components/calendar/calendar.module.css";
import c from "@/components/season/cal.module.css";
import { seasonSchedule } from "@/lib/schedule";
import { all } from "@/lib/db";
import { gpZh } from "@/lib/names";
import NextRaceCard from "@/components/ui/NextRaceCard";
import { ScheduleCard, seasonPodiums, replayHref } from "@/lib/raceCards";
import Subscribe from "@/components/calendar/Subscribe";
import Globe from "@/components/calendar/Globe";

import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** 赛历 tab (Schedule, /seasons/Y/calendar since v5.1 — 总览 took /seasons/Y): the season race by race, formula1.com Schedule language on the light page surface.
 *  Current season = live calendar (Latest + Next, countdown, timing replays); past seasons = archive of race cards. */
export default async function YearCalendar({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  const sched = await seasonSchedule(year);
  const now = Date.now();
  const podOf = seasonPodiums(year);
  const nextIdx = sched.findIndex((r) => !r.winner && r.sessions.some((x) => new Date(x.end).getTime() > now));
  const next = nextIdx >= 0 ? sched[nextIdx] : null;
  const doneList = sched.filter((r) => r.winner);
  const latest = doneList.at(-1) ?? null;
  const replay = (r: (typeof sched)[number]) => replayHref(r, now);
  const coords = new Map(all<any>("select id, latitude, longitude from circuit").map((x) => [x.id, x]));
  const stops = sched.map((r, i) => ({ round: r.round, lat: coords.get(r.circuit)?.latitude ?? 0, lon: coords.get(r.circuit)?.longitude ?? 0, label: gpZh(r.gp), done: !!r.winner, next: i === nextIdx }));
  const hasReplays = sched.some((r) => replay(r));

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope header={{ title: `${year} 赛季 · 赛历` }} />
        {next && (
          <section className={c.feature}>
            {latest && (
              <div className={c.col}>
                <p className="kicker">Latest</p><h2 className={c.colHead}>最新一站</h2>
                <ol className={c.one}>
                  <ScheduleCard r={latest} state="done" podium={podOf(latest.round)} replay={replay(latest)} />
                </ol>
              </div>
            )}
            {next && (
              <div className={`${c.col} ${c.colWide}`}>
                <p className="kicker">Next</p><h2 className={c.colHead}>下一站</h2>
                <NextRaceCard next={next} />
              </div>
            )}
          </section>
        )}

        <section className={c.schedule}>
          <div className={c.head}>
            <div><h2 className="cn-h2">{year} 赛历 · {sched.length} 站</h2></div>
            <span className={c.sub}>{next ? <>已赛 <b>{doneList.length}</b> 站 · 时间按你所在时区显示</> : "赛季档案"}{hasReplays ? " · 带「计时回放」的分站可看逐圈回放" : ""}</span>
          </div>
          <ol className={c.grid}>
            {sched.map((r, i) => (
              <ScheduleCard key={r.round} r={r} state={r.winner ? "done" : i === nextIdx ? "next" : "future"} podium={podOf(r.round)} replay={replay(r)}
                tag={r === latest && next ? "最新" : undefined} />
            ))}
          </ol>
        </section>

        <section className={c.globeWrap}>
          <div className={`${cal.hero} ${c.globeCard}`}>
            <div className={cal.globe}><Globe stops={stops} /></div>
            <div className={cal.heroIn} style={{ padding: "48px 40px" }}>
              <p className="kicker">Season Map · {year}</p>
              <h2 className={c.globeTitle}><b>{sched.length}</b> 站，<b>{new Set(sched.map((r) => r.country)).size}</b> 个国家</h2>
              <p className={cal.dek}>红线是已经跑完的行程，虚线是接下来的路。拖动地球查看。</p>
              {next && <Subscribe year={year} />}
            </div>
          </div>
        </section>

      </div>
    </ViewTransition>
  );
}
