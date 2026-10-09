import { ViewTransition } from "react";
import s from "@/components/index/index.module.css";
import { all } from "@/lib/db";
import { cars as carContent } from "@/lib/content";
import { teamCar, teamColor, TEAMS_2026 } from "@/lib/assets";
import { TEAM_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import { Linked } from "@/lib/linkify";
import { allSeasons } from "@/lib/f1";
import { parseYear } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import Breadcrumb from "@/components/shell/Breadcrumb";
import YearCarsGrid from "@/components/unit/YearCarsGrid";
import CarCard, { carPicture } from "@/components/index/CarCard";

export const dynamic = "force-dynamic";

export default async function CarsIndex({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  // ?year=Y switches the top block to 「Y 年的 N 台赛车」 (spec §4.7); the current season keeps the curated 2026 cards
  const latest = allSeasons()[0].year as number;
  const year = parseYear((await searchParams).year);
  const sliced = year && year !== latest ? year : null;
  const cc = carContent();
  const ids = Object.keys(cc);
  const meta = new Map(all<any>(`select ch.id, ch.name, ch.constructor_id team, (select min(year) from season_entrant_chassis where chassis_id = ch.id) y from chassis ch where ch.id in (${ids.map(() => "?").join(",")})`, ...ids).map((r) => [r.id, r]));
  const current = ids.filter((id) => meta.get(id)?.y === 2026);
  const classics = ids.filter((id) => meta.get(id)?.y !== 2026).sort((a, b) => (meta.get(a)?.y ?? 0) - (meta.get(b)?.y ?? 0));
  const card = (id: string) => {
    const m = meta.get(id);
    const official = m?.y === 2026 && TEAMS_2026[m.team as keyof typeof TEAMS_2026] ? teamCar(m.team, 700) : null;
    return (
      <CarCard key={id} id={id} name={m?.name ?? id} team={m?.team} teamName={m?.team ? zhName.team(m.team) ?? TEAM_ZH[m.team] ?? m.team : null}
        color={teamColor(m?.team, "#3a3a44")} year={m?.y} img={official ?? carPicture(id, m?.team)} photo={!official} morph={official ? `car-${m.team}` : undefined}
        summary={<Linked text={cc[id].summary} skip={m?.team} />} />
    );
  };
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <header className={s.head}>
          <div className="wrap">
            {year ? <Breadcrumb flush items={[{ label: "赛车", href: "/cars" }, { label: year, kind: "year", name: String(year) }]} /> : null}
            <p className="kicker">Cars</p>
            <h1 className={s.h1}>赛车</h1>
            <p className={s.lede}>赛车挂在「车队 × 年份」上：每支车队每年至少一台底盘。这里是 2026 年的 11 台新规赛车，以及改变过 F1 的经典赛车；其余 1100 多台可从车队页的年份表进入。</p>
          </div>
        </header>
        <RailScope labels="champCar" pattern="/cars?year={y}" header={{ title: "赛车索引" }} current={year ?? null} />
        <section className="band band-paper" style={{ paddingTop: 16 }}>
          <div className="wrap">
            {sliced ? <YearCarsGrid year={sliced} /> : <>
            <div className="sec-head"><div><p className="kicker">Season 2026</p><h2 className="cn-h2">2026 新规赛车</h2></div><span className="sub">更小、更轻，前后翼可在直道 / 弯道模式间切换</span></div>
            <div className={s.carGrid}>{current.map(card)}</div>
            </>}
          </div>
        </section>
        <section className="band band-white">
          <div className="wrap">
            <div className="sec-head"><div><p className="kicker">Classics</p><h2 className="cn-h2">经典赛车</h2></div><span className="sub">按年代排列</span></div>
            <div className={s.carGrid}>{classics.map(card)}</div>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
