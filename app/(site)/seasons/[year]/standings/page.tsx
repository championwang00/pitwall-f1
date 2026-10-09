import { ViewTransition } from "react";
import y from "../season.module.css";
import { seasonRaces, seasonDriverStandings, seasonConstructorStandings, driverStandingsAfter, constructorStandingsAfter, pointsProgression } from "@/lib/f1";
import { cubeFor } from "@/lib/cube";
import { teamColor } from "@/lib/assets";
import { ENGINE_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import Cube from "@/components/cube/Cube";
import PointsChart from "@/components/season/PointsChart";
import Team from "@/components/entity/Team";
import t from "@/components/season/tab.module.css";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";

import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** 积分榜 tab: title fight chart, driver × round matrix, both championships. */
export default async function YearStandings({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<Record<string, string>> }) {
  const year = +(await params).year;
  const sp = await searchParams;
  const races = seasonRaces(year);
  const live = races.some((r: any) => !r.winner);
  const dStand = live ? driverStandingsAfter(year) : seasonDriverStandings(year);
  const cStand = live ? constructorStandingsAfter(year) : seasonConstructorStandings(year);
  const cube = cubeFor({ year });
  const zhOf = (id: string, n: string) => zhName.driver(id) ?? n;
  const lastTeam = new Map<string, string>();
  for (const f of cube.rows) lastTeam.set(f.d, f.t);

  const prog = pointsProgression(year);
  const top = dStand.slice(0, 5).map((x: any) => x.driver);
  const maxRound = Math.max(0, ...prog.map((p: any) => p.round));
  const series = top.map((id: string) => {
    const pts: number[] = [];
    for (let r = 1; r <= maxRound; r++) pts.push(prog.find((p: any) => p.round === r && p.driver === id)?.points ?? pts[pts.length - 1] ?? 0);
    const d = dStand.find((x: any) => x.driver === id);
    return { id, name: zhOf(id, d?.name ?? id), color: teamColor(lastTeam.get(id), "#606066"), pts };
  });
  const seen = new Map<string, number>();
  for (const sr of series) { const n = seen.get(sr.color) ?? 0; seen.set(sr.color, n + 1); if (n) sr.color = sr.color + "99"; }
  const labels = races.slice(0, maxRound).map((r: any) => `R${r.round}`);
  const medal = (pos: number, champ: boolean) => champ ? <Laurel tone="gold" size={26} top="冠军" /> : !live && pos === 2 ? <Laurel tone="silver" size={26} top="亚军" /> : !live && pos === 3 ? <Laurel tone="bronze" size={26} top="季军" /> : null;

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope header={{ title: `${year} 赛季 · 积分榜` }} />
        {series.length > 0 && maxRound > 1 && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><div><p className="kicker">Standings</p><h2 className="cn-h2">冠军之争</h2></div><span className="sub">前五名的累计积分，逐站</span></div>
              <div className={t.card}><PointsChart series={series} rounds={maxRound} labels={labels} /></div>
            </div>
          </section>
        )}

        <section className="band band-paper">
          <div className="wrap">
            <div className={y.twoTables}>
              <div>
                <div className="sec-head"><div><p className="kicker">Drivers</p><h2 className="cn-h2">车手积分榜</h2></div>{live && <span className="sub">截至目前</span>}</div>
                <div className={t.card}>
                  <table className="tbl row-hover">
                    <thead><tr><th>名次</th><th>车手</th><th>车队</th><th /><th style={{ textAlign: "right" }}>PTS</th></tr></thead>
                    <tbody>
                      {dStand.map((d: any) => {
                        const tm = lastTeam.get(d.driver);
                        return (
                          <tr key={d.driver}>
                            <td className="num" style={{ width: 48 }}>{d.posText}</td>
                            <td><Person id={d.driver} year={year} color={teamColor(tm, "#3a3a44")} name={zhOf(d.driver, d.name)} size={24} /></td>
                            <td>{tm && <Team id={tm} year={year} badge size={20} name={zhName.team(tm) ?? cube.names.team[tm]?.[0] ?? tm} />}</td>
                            <td>{medal(d.pos, !!d.champ)}</td>
                            <td className="r num">{d.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="sec-head"><div><p className="kicker">Teams</p><h2 className="cn-h2">车队积分榜</h2></div></div>
                {cStand.length ? (
                  <div className={t.card}>
                    <table className="tbl row-hover">
                      <thead><tr><th>名次</th><th>车队</th><th>引擎</th><th /><th style={{ textAlign: "right" }}>PTS</th></tr></thead>
                      <tbody>
                        {cStand.map((c: any) => (
                          <tr key={c.team}>
                            <td className="num" style={{ width: 48 }}>{c.posText}</td>
                            <td><Team id={c.team} year={year} badge size={20} name={zhName.team(c.team) ?? c.name} /></td>
                            <td className="mute">{ENGINE_ZH[c.engine] ?? c.engine}</td>
                            <td>{medal(c.pos, !!c.champ)}</td>
                            <td className="r num">{c.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="mute"><span className="num">1958</span> 年之前没有车队总冠军。</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="band band-paper">
          <div className="wrap">
            <Cube data={cube} fixed="year" fixedId={String(year)} only={["matrix", "driver", "team"]} defaultView="matrix" title={`${year} 赛季成绩`}
              initial={{ driver: sp.driver, team: sp.team, circuit: sp.circuit, view: (sp.view as any) || undefined }} />
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
