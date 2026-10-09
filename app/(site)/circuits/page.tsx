import { ViewTransition } from "react";
import s from "@/components/index/index.module.css";
import { allCircuits, seasonRaces } from "@/lib/f1";
import { flag } from "@/lib/assets";
import Explorer from "@/components/index/Explorer";
import { zhName } from "@/lib/zh";
import { allSeasons } from "@/lib/f1";
import { parseYear } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import Breadcrumb from "@/components/shell/Breadcrumb";
import YearCircuitsGrid from "@/components/unit/YearCircuitsGrid";

export const dynamic = "force-dynamic";

export default async function CircuitsIndex({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  // ?year=Y switches the top block to 「Y 年的 N 条赛道」 (spec §4.7)
  const year = allSeasons()[0].year as number;
  const picked = parseYear((await searchParams).year);
  const sliced = picked && picked !== year ? picked : null;
  const cal = seasonRaces(year);
  const rows = allCircuits().map((c: any) => ({
    id: c.id, name: c.full_name, zh: zhName.circuit(c.id), flag: flag(c.country_id), y0: c.y0, y1: c.y1, sub: c.place_name,
    stats: { races: c.total_races_held, length: c.length, turns: c.turns },
  }));
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <header className={s.head}>
          <div className="wrap">
            {picked ? <Breadcrumb flush items={[{ label: "赛道", href: "/circuits" }, { label: picked, kind: "year", name: String(picked) }]} /> : null}
            <p className="kicker">Circuits</p>
            <h1 className={s.h1}>赛道</h1>
            <p className={s.lede}>{year} 赛季的 {cal.length} 站，以及 1950 年以来举办过 F1 正赛的全部 {rows.length} 条赛道。赛道页列出历届冠军，并能按车手、车队看谁最擅长这里。</p>
          </div>
        </header>
        <RailScope labels="rounds" pattern="/circuits?year={y}" header={{ title: "赛道索引" }} current={picked ?? null} />
        <section className="band band-paper" style={{ paddingTop: 16 }}>
          <div className="wrap"><YearCircuitsGrid year={sliced ?? year} /></div>
        </section>
        <section className="band band-white">
          <div className="wrap">
            <div className="sec-head"><h2 className="cn-h2">全部赛道</h2></div>
            <Explorer rows={rows} base="/circuits" placeholder="搜索：纽博格林、Monza、铃鹿…" defaultSort="races"
              cols={[{ k: "races", label: "正赛场数" }, { k: "length", label: "KM" }, { k: "turns", label: "弯角" }]} />
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
