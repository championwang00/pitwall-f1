import { ViewTransition } from "react";
import { permanentRedirect } from "next/navigation";
import s from "@/components/calendar/calendar.module.css";
import c from "@/components/season/cal.module.css";
import { seasonSchedule } from "@/lib/schedule";
import { all } from "@/lib/db";
import { gpZh } from "@/lib/names";
import { ScheduleCard, seasonPodiums, replayHref } from "@/lib/raceCards";
import NextRaceCard from "@/components/ui/NextRaceCard";
import Subscribe from "@/components/calendar/Subscribe";
import Globe from "@/components/calendar/Globe";
import EntityLink from "@/components/entity/EntityLink";
import Breadcrumb from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

/** /calendar — formula1.com Schedule: title + Add-to-calendar, the next race as the big photo card, every round as a
 *  race card (same component as /live and /seasons/[year]), the globe as a dark media card at the end. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ year?: string | string[] }> }) {
  const sp = await searchParams;
  const year = new Date().getUTCFullYear();
  // v5 §0.5.5: /calendar is this season only (it belongs to 实时); past seasons' calendars live in the year hub
  if (sp.year !== undefined) {
    const asked = Number(Array.isArray(sp.year) ? sp.year[0] : sp.year);
    permanentRedirect(Number.isInteger(asked) && asked !== year && asked >= 1950 ? `/seasons/${asked}/calendar` : "/calendar");
  }
  const sched = await seasonSchedule(year);
  const now = Date.now();
  const nextIdx = sched.findIndex((r) => !r.winner && r.sessions.some((x) => new Date(x.end).getTime() > now));
  const next = nextIdx >= 0 ? sched[nextIdx] : null;
  const podOf = seasonPodiums(year);
  const coords = new Map(all<any>("select id, latitude, longitude from circuit").map((x) => [x.id, x]));
  const stops = sched.map((r, i) => ({ round: r.round, lat: coords.get(r.circuit)?.latitude ?? 0, lon: coords.get(r.circuit)?.longitude ?? 0, label: gpZh(r.gp), done: !!r.winner, next: i === nextIdx }));

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div style={{ background: "var(--paper)" }}>
        <section className={c.pageHead}>
          <div>
            <Breadcrumb flush items={[{ label: "实时", href: "/live" }, { label: "赛历与日历订阅" }]} />
            <p className="kicker"><EntityLink kind="year" id={String(year)} className="hlink">{year}</EntityLink> FIA Formula One World Championship · Schedule</p>
            <h1 className={c.pageTitle}><EntityLink kind="year" id={String(year)}>{year}</EntityLink> 全年赛历 · <b>{sched.length}</b> 站</h1>
            <p className={c.sub}>所有时间按你所在时区显示</p>
          </div>
          <Subscribe year={year} light />
        </section>

        {next && (
          <section className={c.schedule} style={{ paddingTop: 8, paddingBottom: 0 }}>
            <div className={c.head}><div><p className="kicker">Next</p><h2 className={c.colHead}>下一站</h2></div></div>
            <NextRaceCard next={next} />
          </section>
        )}

        <section className={c.schedule}>
          <div className={c.head}><div><p className="kicker">All Rounds</p><h2 className="cn-h2">全部分站</h2></div><span className={c.sub}>点卡片看本站档案（未开赛的分站是前瞻）</span></div>
          <ol className={c.grid}>
            {sched.map((r, i) => (
              <ScheduleCard key={r.round} r={r} state={r.winner ? "done" : i === nextIdx ? "next" : "future"} podium={podOf(r.round)} replay={replayHref(r, now)} />
            ))}
          </ol>
        </section>

        <section className={c.globeWrap}>
          <div className={`${s.hero} ${c.globeCard}`}>
            <div className={s.globe}><Globe stops={stops} /></div>
            <div className={s.heroIn} style={{ padding: "48px 40px" }}>
              <p className="kicker">Season Map · <EntityLink kind="year" id={String(year)} className="hlink">{year}</EntityLink></p>
              <h2 className={c.globeTitle}><b>{sched.length}</b> 站，<b>{new Set(sched.map((r) => r.country)).size}</b> 个国家</h2>
              <p className={s.dek}>红线是已经跑完的行程，虚线是接下来的路。拖动地球查看。</p>
            </div>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
