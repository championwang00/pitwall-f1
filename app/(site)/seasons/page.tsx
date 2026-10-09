import Link from "next/link";
import EntityLink from "@/components/entity/EntityLink";
import { ViewTransition } from "react";
import s from "@/components/index/index.module.css";
import n from "@/components/season/now.module.css";
import { allSeasons, lastCompletedRace, nextRace } from "@/lib/f1";
import { all } from "@/lib/db";
import { eras } from "@/lib/eras";
import { flag, teamColor } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { Linked } from "@/lib/linkify";
import Countdown from "@/components/ui/Countdown";
import { PodiumCells } from "@/components/ui/RaceCard";
import SeasonCards from "@/components/season/SeasonCards";

import RailScope from "@/components/season/RailScope";
import YearSpan from "@/components/entity/YearSpan";

export const dynamic = "force-dynamic";

/**
 * 历史 — root of the time tree (spec §3.1): one line per era (→ /eras/[id]), then era bands newest first,
 * each with its character and every season's champion. The current era opens with a "2026 现在" row.
 * No year controls here: the left rail is the only one.
 */
export default function SeasonsIndex() {
  const seasons = allSeasons();
  const list = eras();
  const latest = seasons[0].year;
  const nr = nextRace();
  const lr = lastCompletedRace();
  const podium = lr ? all<any>(`select rr.position_number pos, rr.driver_id id, d.name, d.abbreviation code, rr.time, rr.gap, rr.constructor_id team, r.grand_prix_id gp, r.round, r.year
    from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id where r.year = ? and r.round = ? and rr.position_number <= 3 order by rr.position_number`, lr.year, lr.round) : [];
  const nextStart = nr ? `${nr.date}T${nr.time ?? "12:00:00"}${nr.time?.endsWith("Z") ? "" : "Z"}` : null;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope header={{ title: `历史 · ${list.length} 个时代` }} current={null} />
        <header className={s.head}>
          <div className="wrap">
            <p className="kicker">Seasons</p>
            <h1 className={s.h1}>历史</h1>
            <p className={s.lede}><YearSpan from={1950} /> 年至今 {seasons.length} 个赛季，分成 {list.length} 个规则时代。每个时代先看它的技术特征，再看每一年的冠军；要去任意一年或任意时代，用左侧年份栏。</p>
          </div>
        </header>
        {list.map((er, i) => {
          const ys = seasons.filter((x: any) => x.year >= er.years[0] && x.year <= er.years[1]).map((x: any) => x.year as number);
          if (!ys.length) return null;
          return (
            <section key={er.id} id={er.id} className="band band-paper" style={{ paddingTop: 32, paddingBottom: 40, scrollMarginTop: "calc(var(--head-h) + 12px)" }}>
              <div className="wrap">
                <div className="sec-head">
                  <div>
                    <p className="kicker num"><YearSpan from={er.years[0]} to={er.years[1]} /></p>
                    <h2 className="cn-h2" style={{ marginTop: 6 }}><EntityLink kind="era" id={er.id}>{er.title}</EntityLink></h2>
                  </div>
                  <span className="sub" style={{ maxWidth: 620, lineHeight: 1.7 }}><Linked text={er.summary} /> <Link href={`/eras/${er.id}`} className="link-arrow">时代介绍</Link></span>
                </div>
                {i === 0 && ys.includes(latest) && (nr || podium.length > 0) && (
                  <div className={n.now}>
                    {nr && (
                      <EntityLink kind="race" id={`${nr.year}-${nr.round}`} className={`${n.card} lift`}>
                        <span className={n.label}>下一站 · 第 <span className="num">{nr.round}</span> 站</span>
                        <b className={n.name}>{flag(nr.country) && <img src={flag(nr.country)!} alt="" width={20} />}{gpZh(nr.grand_prix_id)}</b>
                        {nextStart && <Countdown to={nextStart} units="en" className={n.count} numClassName={n.num} unitClassName={n.unit} />}
                      </EntityLink>
                    )}
                    {podium.length > 0 && (
                      <div className={`${n.card} ${n.last} lift`}>
                        <Link href={`/races/${lr.year}/${lr.round}`} className="card-link" aria-label={gpZh(podium[0].gp)} tabIndex={-1} />
                        <div className="over-link">
                          <span className={n.label}>最新 · 第 <span className="num">{lr.round}</span> 站</span>
                          <b className={n.name}>{gpZh(podium[0].gp)}</b>
                          <PodiumCells podium={podium.map((p: any) => ({ pos: p.pos, driver: p.id, code: p.code ?? p.id.slice(0, 3).toUpperCase(), time: p.pos === 1 ? p.time : p.gap, color: teamColor(p.team, "#3a3a44"), year: lr.year }))} />
                        </div>
                      </div>
                    )}
                    <div className={n.links}>
                      <Link href="/live" className="btn btn-red">实时</Link>
                      <Link href={latest === new Date().getUTCFullYear() ? "/calendar" : `/seasons/${latest}/calendar`} className="btn btn-line">完整赛历</Link>
                    </div>
                  </div>
                )}
                <SeasonCards years={ys} />
              </div>
            </section>
          );
        })}
      </div>
    </ViewTransition>
  );
}
