import { ViewTransition } from "react";
import s from "@/components/index/index.module.css";
import { allConstructors, constructorStandingsAfter, lastCompletedRace } from "@/lib/f1";
import { all } from "@/lib/db";
import { teamCar, teamColor, flag, TEAMS_2026 } from "@/lib/assets";
import logos from "@/data/team-logos.json";
import TeamCard from "@/components/index/TeamCard";
import { TEAM_ZH, ENGINE_ZH } from "@/lib/names";
import Explorer from "@/components/index/Explorer";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import { allSeasons } from "@/lib/f1";
import { parseYear } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import Breadcrumb from "@/components/shell/Breadcrumb";
import YearTeamsGrid from "@/components/unit/YearTeamsGrid";
import Engine from "@/components/entity/Engine";
import YearSpan from "@/components/entity/YearSpan";

export const dynamic = "force-dynamic";

export default async function TeamsIndex({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  // ?year=Y switches the top block to 「Y 年的 N 支车队」 (spec §4.7)
  const latest = allSeasons()[0].year as number;
  const year = parseYear((await searchParams).year);
  const sliced = year && year !== latest ? year : null;
  const last = lastCompletedRace();
  const st = constructorStandingsAfter(last.year);
  const drivers = all<any>("select sed.constructor_id team, sed.driver_id id, d.first_name f, d.last_name l from season_entrant_driver sed join driver d on d.id = sed.driver_id where sed.year = ? and sed.test_driver = 0", last.year);
  const rows = allConstructors().map((c: any) => ({
    id: c.id, name: c.name, zh: zhName.team(c.id), flag: flag(c.country), y0: c.y0, y1: c.y1, color: teamColor(c.id, "#3a3a44"), logo: c.id in TEAMS_2026 || !!(logos as Record<string, string | null>)[c.id],
    stats: { titles: c.titles, wins: c.wins, poles: c.poles, pods: c.pods, starts: c.starts },
  }));
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <header className={s.head}>
          <div className="wrap">
            {year ? <Breadcrumb flush items={[{ label: "车队", href: "/teams" }, { label: year, kind: "year", name: String(year) }]} /> : null}
            <p className="kicker">Teams</p>
            <h1 className={s.h1}>车队</h1>
            <p className={s.lede}><YearSpan from={2026} /> 赛季 11 支车队，以及 <YearSpan from={1950} /> 年以来全部 {rows.length} 个车队名号。车队页按年份列出车手、赛车与引擎，并能按车手、赛道展开全部比赛。</p>
          </div>
        </header>
        <RailScope labels="champTeam" pattern="/teams?year={y}" header={{ title: "车队索引" }} current={year ?? null} />
        {sliced ? (
          <section className="band band-paper" style={{ paddingTop: 16 }}>
            <div className="wrap"><YearTeamsGrid year={sliced} kicker="Season" /></div>
          </section>
        ) : (
        <section className="band band-paper" style={{ paddingTop: 16 }}>
          <div className="wrap">
            <div className="sec-head"><div><p className="kicker">Season</p><h2 className="cn-h2"><EntityLink kind="year" id={String(last.year)} className="ilink">{last.year}</EntityLink> 赛季的 {st.length} 支车队</h2></div><span className="sub">按当前车队积分排序</span></div>
            <div className={s.teamCards}>
              {st.map((t: any) => (
                <TeamCard key={t.team} id={t.team} name={zhName.team(t.team) ?? TEAM_ZH[t.team] ?? t.name} latin={t.name} color={teamColor(t.team)}
                  href={`/teams/${t.team}`} year={last.year} car={teamCar(t.team, 800)} morph={`car-${t.team}`}
                  drivers={drivers.filter((d: any) => d.team === t.team).map((d: any) => ({ id: d.id, first: d.f, last: d.l }))}
                  stats={[{ v: `P${t.pos}`, k: "排名" }, { v: t.points, k: "积分" }]}
                  honour={<span className={s.teamEngine}><Engine id={t.engine} year={last.year} /> 动力</span>} />
              ))}
            </div>
          </div>
        </section>
        )}
        <section className="band band-white">
          <div className="wrap">
            <div className="sec-head"><h2 className="cn-h2">全部车队</h2><span className="sub">同一支车队在不同名号下分别统计；车队页会标出前身与后继</span></div>
            <Explorer rows={rows} base="/teams" placeholder="搜索：莲花、Brabham、Tyrrell…" defaultSort="wins"
              cols={[{ k: "titles", label: "车队冠军" }, { k: "wins", label: "胜" }, { k: "poles", label: "杆位" }, { k: "pods", label: "领奖台" }, { k: "starts", label: "出赛" }]}
              flags={[{ k: "champ", label: "只看冠军车队", test: "titles" }]} />
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
