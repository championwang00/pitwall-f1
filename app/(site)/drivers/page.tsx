import { ViewTransition } from "react";
import s from "@/components/index/index.module.css";
import { allDrivers, driverStandingsAfter, lastCompletedRace } from "@/lib/f1";
import { teamColor, flag, DRIVERS_2026, TEAMS_2026 } from "@/lib/assets";
import Explorer from "@/components/index/Explorer";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import g from "@/components/season/bigcard.module.css";
import DriverCard from "@/components/entity/DriverCard";
import Team from "@/components/entity/Team";
import { allSeasons } from "@/lib/f1";
import { parseYear } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import Breadcrumb from "@/components/shell/Breadcrumb";
import YearDriversGrid from "@/components/unit/YearDriversGrid";
import YearSpan from "@/components/entity/YearSpan";

export const dynamic = "force-dynamic";

export default async function DriversIndex({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  // ?year=Y switches the top block to 「Y 年的 N 位车手」 (spec §4.7); the current season keeps the portrait cards
  const latest = allSeasons()[0].year as number;
  const year = parseYear((await searchParams).year);
  const sliced = year && year !== latest ? year : null;
  const last = lastCompletedRace();
  const st = driverStandingsAfter(last.year);
  const grid = st.filter((d: any) => DRIVERS_2026[d.driver] && d.driver !== "yuki-tsunoda");
  const rows = allDrivers().map((d: any) => ({
    id: d.id, name: d.name, zh: zhName.driver(d.id), flag: flag(d.nat), y0: d.y0, y1: d.y1,
    stats: { starts: d.starts, wins: d.wins, pods: d.pods, poles: d.poles, titles: d.titles, pts: d.pts },
  }));
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <header className={s.head}>
          <div className="wrap">
            {year ? <Breadcrumb flush items={[{ label: "车手", href: "/drivers" }, { label: year, kind: "year", name: String(year) }]} /> : null}
            <p className="kicker">Drivers</p>
            <h1 className={s.h1}>车手</h1>
            <p className={s.lede}><YearSpan from={2026} /> 赛季的 22 位车手，以及 <YearSpan from={1950} /> 年以来全部 {rows.length} 位出赛过的车手。点进任何一位，按年份、赛道、车队展开他的全部比赛。</p>
          </div>
        </header>
        <RailScope labels="champ" pattern="/drivers?year={y}" header={{ title: "车手索引" }} current={year ?? null} />
        {sliced ? (
          <section className="band band-paper" style={{ paddingTop: 16 }}>
            <div className="wrap"><YearDriversGrid year={sliced} kicker="Season" /></div>
          </section>
        ) : (
        <section className="band band-paper" style={{ paddingTop: 16 }}>
          <div className="wrap">
            <div className="sec-head"><div><p className="kicker">Season</p><h2 className="cn-h2"><EntityLink kind="year" id={String(last.year)} className="ilink">{last.year}</EntityLink> 赛季的 {grid.length} 位车手</h2></div><span className="sub">按当前积分排序</span></div>
            <div className={g.grid}>
              {grid.map((d: any) => {
                const meta = DRIVERS_2026[d.driver];
                return (
                  <DriverCard key={d.driver} id={d.driver} name={meta.nameZh} latin={d.name} color={teamColor(meta.team)} morph={`driver-${d.driver}`}
                    meta={<Team id={meta.team} name={TEAMS_2026[meta.team].nameZh} size={16} onDark />}
                    stats={[{ v: `P${d.pos}`, k: "排名" }, { v: d.points, k: "积分" }]} />
                );
              })}
            </div>
          </div>
        </section>
        )}
        <section className="band band-white">
          <div className="wrap">
            <div className="sec-head"><h2 className="cn-h2">全部车手</h2><span className="sub">搜索中文或英文名；按年代筛选；点表头排序</span></div>
            <Explorer rows={rows} base="/drivers" faces placeholder="搜索：塞纳、Schumacher、Clark…" defaultSort="wins"
              cols={[{ k: "titles", label: "冠军" }, { k: "wins", label: "胜" }, { k: "pods", label: "领奖台" }, { k: "poles", label: "杆位" }, { k: "starts", label: "出赛" }, { k: "pts", label: "积分" }]}
              flags={[{ k: "champ", label: "只看世界冠军", test: "titles" }, { k: "winner", label: "只看分站冠军", test: "wins" }]} />
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
