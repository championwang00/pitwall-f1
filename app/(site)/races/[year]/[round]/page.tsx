import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import r from "./race.module.css";
import e from "@/components/entity/entity.module.css";
import { getRaceByYearRound, raceResults, raceData, neighbours, chassisForTeamYear, driverStandingsAfter, circuitRaces } from "@/lib/f1";
import { seasonSchedule } from "@/lib/schedule";
import { momentsFor } from "@/lib/content";
import { teamColor, flag, raceCard, trackMap, driverPortrait } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { isLight } from "@/lib/color";
import { bilingual, wikiMap } from "@/lib/wiki";
import { drivers as dContent } from "@/lib/content";
import { trackShape } from "@/lib/tracks";
import TrackField from "@/components/entity/TrackField";
import { zhName } from "@/lib/zh";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { raceTalk, circuitTalk } from "@/lib/talk";
import { notes } from "@/lib/content";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import Team from "@/components/entity/Team";
import RailScope from "@/components/season/RailScope";
import Icon from "@/components/ui/Icon";
import { PodiumCells } from "@/components/ui/RaceCard";
import { raceRail } from "@/lib/railData";
import { Linked } from "@/lib/linkify";
import Breadcrumb from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

const RETIRED_ZH: Record<string, string> = {
  Engine: "引擎", Accident: "事故", Collision: "碰撞", Gearbox: "变速箱", "Spun off": "打滑离场", Suspension: "悬挂", Electrical: "电气",
  Transmission: "传动", Brakes: "刹车", Clutch: "离合器", "Collision damage": "碰撞损坏", Hydraulics: "液压", "Fuel system": "燃油系统",
  Turbo: "涡轮", Overheating: "过热", Ignition: "点火系统", "Oil leak": "漏油", Throttle: "油门", "Out of fuel": "燃油耗尽", Halfshaft: "半轴",
  "Oil pressure": "机油压力", Wheel: "车轮", "Fuel pump": "燃油泵", Withdrew: "退出", Handling: "操控问题", Differential: "差速器", Tyre: "轮胎",
  "Fuel leak": "燃油泄漏", Steering: "转向", "Power unit": "动力单元", Radiator: "散热器", Puncture: "爆胎", "Wheel bearing": "轮毂轴承",
  "Water leak": "漏水", "Fuel pressure": "燃油压力", Exhaust: "排气", Driveshaft: "传动轴", Alternator: "发电机", Injection: "喷油系统",
  Physical: "体能原因", Chassis: "底盘", Injury: "受伤", "Accident in practice": "练习赛事故", "Technical infringements": "技术违规",
  Magneto: "磁电机", "Push start": "推车起步", Battery: "电池", Axle: "车轴", Fire: "起火", Spin: "打滑", "Car underweight": "车重不足",
  "Fatal accident": "致命事故", "Power loss": "动力丧失", "Oil pump": "机油泵", Mechanical: "机械故障", Distributor: "分电器", "Oil pipe": "油管",
  Vibrations: "振动", "Accident damage": "事故损坏", "Water pressure": "水压", Unwell: "身体不适", Unfit: "身体状况不允许", Retirement: "退赛",
  "Rear wing": "尾翼", "Broken wing": "翼片损坏", "Wheel nut": "轮毂螺母", "Illegal car change": "违规换车", Undertray: "底板",
  "Received outside assistance": "接受外部协助", "Injury in practice": "练习赛受伤", "Illegal skid block wear": "滑块磨损违规",
  Retired: "退赛", Disqualified: "取消成绩", Damage: "损坏", "Did not start": "未起步", Electronics: "电子系统", "Water pump": "水泵",
  "Cooling system": "冷却系统", Pneumatics: "气动系统", Brake: "刹车", Debris: "碎片", "Front wing": "前翼", Vibration: "振动",
};

export default async function RacePage({ params }: { params: Promise<{ year: string; round: string }> }) {
  const { year: ys, round: rs } = await params;
  const year = +ys, round = +rs;
  const race = getRaceByYearRound(year, round);
  if (!race) notFound();
  const results = raceResults(race.id);
  const quali = raceData(race.id, "QUALIFYING_RESULT");
  const fl = raceData(race.id, "FASTEST_LAP");
  const pits = raceData(race.id, "PIT_STOP");
  const dotd = raceData(race.id, "DRIVER_OF_THE_DAY_RESULT");
  const sprint = raceData(race.id, "SPRINT_RACE_RESULT");
  const qLaps = quali.some((q: any) => q.qualifying_laps);
  const nb = neighbours(year, round, race.circuit_id);
  const moments = momentsFor({ year, circuit: race.circuit_id }).concat(
    momentsFor({ year, gp: race.grand_prix_id }).filter((m) => m.circuit !== race.circuit_id)
  );
  const uniq = [...new Map(moments.map((m) => [m.kind + m.subject + m.title, m])).values()];
  const wiki = await bilingual(wikiMap().races[`${year}-${round}`]);
  const standings = results.length ? driverStandingsAfter(year, round).slice(0, 10) : [];
  const winner = results[0];
  const podium = results.filter((x: any) => x.position_number && x.position_number <= 3);
  const winCar = winner ? chassisForTeamYear(winner.constructor_id, year) : [];
  const photo = year >= 2026 ? raceCard(race.grand_prix_id, 1600) : null;
  const wikiImg = wiki.en?.originalimage?.source ?? wiki.en?.thumbnail?.source;
  // a real photograph for the story column: the official 2026 race card, else the article's lead image if it isn't a track diagram
  const storyImg = photo ?? (wikiImg && !/\.svg|circuit|track|layout/i.test(wikiImg) ? wikiImg : null);
  const shape = trackShape(race.circuit_id, 300);
  const map = trackMap(race.circuit_id, 700);
  const dz = dContent();
  const zhOf = (id: string, name: string) => zhName.driver(id) ?? name;
  const teamOf = (id: string, name?: string) => zhName.team(id) ?? name ?? id;
  /** A driver as face + name (Latin name underneath when we show the Chinese one). */
  /** A driver as a formula1.com avatar (portrait on his team colour) + name (Latin underneath when we show the Chinese one). */
  const P = (id: string, name: string, size = 24, latin = true, team?: string | null) => (
    <Person id={id} year={year} name={zhOf(id, name)} latin={latin && zhName.driver(id) ? name : null} size={size} color={team ? teamColor(team) : null} />
  );
  const teamById = new Map<string, string>(results.map((x: any) => [x.driver_id, x.constructor_id]));
  const second = results.find((x: any) => x.position_number === 2);
  const third = results.find((x: any) => x.position_number === 3);
  const pole = results.find((x: any) => x.pole_position);
  const slam = results.find((x: any) => x.grand_slam);
  const hatTrick = winner && !slam && winner.pole_position && winner.fastest_lap ? winner : null;
  const poleQ = pole ? quali.find((q: any) => q.driver_id === pole.driver_id) : null;
  const poleTime = poleQ ? poleQ.qualifying_q3 ?? poleQ.qualifying_q2 ?? poleQ.qualifying_q1 ?? poleQ.qualifying_time : null;
  // race honours grouped by driver, so a hat-trick shows one face with all its laurels
  const honours: { id: string; name: string; badges: React.ReactNode[] }[] = [];
  const honour = (who: any, node: React.ReactNode) => {
    if (!who) return;
    let h = honours.find((x) => x.id === who.driver_id);
    if (!h) honours.push((h = { id: who.driver_id, name: who.driverName, badges: [] }));
    h.badges.push(node);
  };
  if (results.length) {
    honour(slam, <Laurel key="slam" tone="gold" size={34} top="大满贯" bottom="杆位·冠军·最快圈·全程领跑" />);
    honour(hatTrick, <Laurel key="hat" tone="gold" size={34} top="帽子戏法" bottom="杆位·冠军·最快圈" />);
    honour(pole, <Laurel key="pole" tone="red" size={34} top="杆位" bottom={poleTime ?? undefined} />);
    honour(fl[0], <Laurel key="fl" tone="purple" size={34} top="最快圈" bottom={fl[0]?.fastest_lap_time} />);
    honour(dotd[0], <Laurel key="dotd" tone="white" size={34} top="车手之日" bottom={dotd[0]?.driver_of_the_day_percentage ? `${dotd[0].driver_of_the_day_percentage}%` : undefined} />);
  }
  const upcoming = !results.length;
  const story = wiki.zh?.extract ?? wiki.en?.extract;

  // the year rail on a race page = this circuit through time (spec §1.2 route table)
  // ▶ timing replay: OpenF1 has every session from 2023 on
  let replayKey: number | null = null;
  if (year >= 2023 && !upcoming) {
    try { replayKey = (await seasonSchedule(year)).find((x) => x.round === round)?.sessions.find((x) => x.name === "Race")?.key ?? null; } catch {}
  }

  const circuitZh = zhName.circuit(race.circuit_id) ?? race.circuitName;
  const podEntry = (x: any) => ({ pos: x.position_number, driver: x.driver_id, code: x.abbreviation ?? x.driverName.split(" ").pop().slice(0, 3).toUpperCase(), time: x.gap ?? x.time ?? null, color: teamColor(x.constructor_id, "#3a3a44"), year });

  return (
    <ViewTransition enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page" }} exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page" }} default="none">
      <div>
        <RailScope {...raceRail(year, round)} />
        {/* formula1.com race hub hero: a dark media surface (official race photo from 2026 on), official name in Formula1 caps */}
        <section className={r.hero}>
          {photo && <div className={r.photo} style={{ backgroundImage: `url(${photo})` }} />}
          <div className={r.heroIn}>
            <div className={r.text}>
              <Breadcrumb tone="dark" flush items={[
                { label: "历史", href: "/seasons" },
                { label: year, kind: "year", id: String(year), href: `/seasons/${year}`, name: String(year) },
                { label: <>第 <span className="num">{round}</span> 站 {gpZh(race.grand_prix_id)}</>, name: `第 ${round} 站 ${gpZh(race.grand_prix_id)}` },
              ]} />
              <h1 className={r.title}>
                <ViewTransition name={`year-${year}`} share="morph" default="none"><span className={r.year}>{year}</span></ViewTransition>
                <span className={r.gp}>{gpZh(race.grand_prix_id)}</span>
              </h1>
              <p className={r.official}>{race.official_name}</p>
              <p className={r.meta}>
                {flag(race.circuitCountry) && <img src={flag(race.circuitCountry)!} alt="" width={20} />}
                <span className={r.date}>{race.date}</span>
                <EntityLink kind="circuit" id={race.circuit_id} year={year} className="ilink">{circuitZh}</EntityLink>
                {race.place_name !== race.circuitName && <span>{race.place_name}</span>}
                {race.laps ? <span className={r.laps}><b>{race.laps}</b> 圈 · <b>{race.distance}</b> km</span> : null}
              </p>
              <p className={r.ctas}>
                {replayKey && <Link href={`/seasons/${year}/replay?session=${replayKey}`} className="btn btn-red"><Icon name="play" size={16} />计时回放</Link>}
                <Link href={`/races/${year}/${round}/brief`} className="btn btn-line">解说手册</Link>
              </p>
              {winner && (() => {
                const tc = teamColor(winner.constructor_id, "#3a3a44");
                return (
                  /* the winner as a formula1.com driver card: dark team colour + DRS halftone, period portrait bleeding off the right */
                  <div className={`${r.winner} f1-surface lift`} style={{ ["--c" as any]: tc }} data-surface>
                    <Link href={`/drivers/${winner.driver_id}?year=${year}`} className="card-link" aria-label={zhOf(winner.driver_id, winner.driverName)} tabIndex={-1} />
                    <img className={r.winFace} src={`/api/face/${winner.driver_id}?v=3&s=280&year=${year}`} alt="" />
                    <span className={`${r.winText} over-link`}>
                      <Laurel tone="white" onColor size={40} top="冠军" bottom="P1" />
                      <EntityLink kind="driver" id={winner.driver_id} year={year} className={r.winName} preview={false}>
                        {zhName.driver(winner.driver_id) && <span className={r.winLatin}>{winner.driverName}</span>}
                        {zhOf(winner.driver_id, winner.driverName)}
                      </EntityLink>
                      <span className={r.winDek}>
                        <Team year={year} id={winner.constructor_id} name={teamOf(winner.constructor_id, winner.teamName)} size={20} onDark />
                        {winCar[0] && <Link href={`/cars/${winCar[0].id}`} className="ilink">{winCar[0].name}</Link>}
                        <span>{winner.grid_position_number === 1 ? "杆位起步" : <>第 <span className="num">{winner.grid_position_text ?? "—"}</span> 位起步</>}</span>
                        {winner.time && <span className={r.winTime}>{winner.time}</span>}
                      </span>
                    </span>
                  </div>
                );
              })()}
              {(second || third) && <PodiumCells dark className={r.podium} podium={[second, third].filter(Boolean).map(podEntry)} />}
              {honours.length > 0 && (
                <div className={r.honours}>
                  {honours.map((h) => (
                    <div key={h.id} className={r.hon}>
                      <span className={r.honLaurels}>{h.badges}</span>
                      {P(h.id, h.name, 24, false, teamById.get(h.id))}
                    </div>
                  ))}
                </div>
              )}
              {upcoming && <p className={r.upcoming}>本站尚未进行。<EntityLink kind="year" id={String(year)} className="ilink">查看 {year} 赛程与日历订阅</EntityLink></p>}
            </div>
            {!upcoming ? (
              /* timing-tower style top ten (the full table is below) */
              <div className={r.tower}>
                <p className={r.towerHead}><span>正赛前十</span><span><b>{race.laps}</b> 圈</span></p>
                <ol className="row-hover">
                  {results.slice(0, 10).map((x: any) => (
                    <li key={x.driver_id} className={r.tRow}>
                      <span className={r.tPos}>{x.position_text}</span>
                      {P(x.driver_id, x.driverName, 24, false, x.constructor_id)}
                      <span className={r.tTeam}><Team year={year} id={x.constructor_id} name={teamOf(x.constructor_id, x.teamName)} size={20} badge onDark /></span>
                      <span className={r.tGap}>{x.position_number === 1 ? x.time : x.gap ?? x.time ?? x.reason_retired}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className={r.visual}>
                {shape ? <div className={r.canvas}><TrackField points={shape.points} lap={20} /></div> : map ? <img className={r.map} src={map} alt="" /> : null}
              </div>
            )}
          </div>
        </section>

        {/* round pager (this season) + the race's dimensions — a light formula1.com sub-bar, F1 chevrons */}
        <nav className={r.cross} aria-label="分站翻页">
          <div className="wrap">
            <div className={r.crossIn}>
              {nb.prev ? (
                <EntityLink kind="year" id={String(nb.prev.year)} href={`/races/${nb.prev.year}/${nb.prev.round}`} className={r.pg} preview={false}>
                  <Icon name="chevron-left" size={20} /><span><em>上一站</em><b>{gpZh(nb.prev.gp)}</b></span>
                </EntityLink>
              ) : <span className={r.pgNone} />}
              <div className={r.dims}>
                <EntityLink kind="year" id={String(year)} className={r.dim}><span className="num">{year}</span> 赛季</EntityLink>
                <EntityLink kind="circuit" id={race.circuit_id} year={year} className={r.dim}>{circuitZh}</EntityLink>
                {winner && P(winner.driver_id, winner.driverName, 20, false, winner.constructor_id)}
                {winner && <Team year={year} id={winner.constructor_id} name={teamOf(winner.constructor_id, winner.teamName)} size={18} />}
                {winCar.map((c: any) => <Link key={c.id} href={`/cars/${c.id}`} className={r.dim}>{c.name}</Link>)}
              </div>
              {nb.next ? (
                <EntityLink kind="year" id={String(nb.next.year)} href={`/races/${nb.next.year}/${nb.next.round}`} className={`${r.pg} ${r.pgNext}`} preview={false}>
                  <span><em>下一站</em><b>{gpZh(nb.next.gp)}</b></span><Icon name="chevron-right" size={20} />
                </EntityLink>
              ) : <span className={r.pgNone} />}
            </div>
          </div>
        </nav>

        <TalkingPoints
          auto={upcoming ? circuitTalk(race.circuit_id) : raceTalk(race.id)}
          notes={notes.circuit(race.circuit_id).filter((n) => upcoming || n.year === year)}
          subject={`${year} ${gpZh(race.grand_prix_id)}`}
          title={upcoming ? "赛前解说要点" : "解说要点"}
        />

        {(story || uniq.length > 0) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className={r.storyGrid}>
                <div className={r.storyTop}>
                <div className={r.storyCard}>
                  <p className="kicker">那年这里发生了什么</p>
                  {story ? (
                    <>
                      {!wiki.zh && wiki.en && <p className={r.enNote}>这一站暂无中文维基条目，以下为英文维基摘要</p>}
                      <p className={r.story} lang={wiki.zh ? "zh" : "en"}><Linked text={story} skipRace={`${year}/${round}`} /></p>
                      {wiki.zh && wiki.en && (
                        <details className={r.en}>
                          <summary><Icon name="chevron-down" size={16} />英文维基摘要（通常更详细）</summary>
                          <p lang="en">{wiki.en.extract}</p>
                        </details>
                      )}
                      <p className={e.src}>
                        {wiki.zh && <a href={wiki.zh.content_urls?.desktop.page} target="_blank" rel="noreferrer">维基百科 · {wiki.zh.title}</a>}
                        {wiki.en && <a href={wiki.en.content_urls?.desktop.page} target="_blank" rel="noreferrer">Wikipedia · {wiki.en.title}</a>}
                      </p>
                    </>
                  ) : <p className={r.story}>暂无综述。</p>}
                </div>
                {!upcoming && (storyImg || shape || map) && (
                  <div className={`${r.storyVis} ${storyImg ? r.storyVisPhoto : ""} lift`}>
                    <Link href={`/circuits/${race.circuit_id}?year=${year}`} className="card-link" aria-label={circuitZh} tabIndex={-1} />
                    {storyImg ? <img className={r.storyImg} src={storyImg} alt="" /> : shape ? <div className={r.canvas}><TrackField points={shape.points} lap={20} /></div> : map ? <img className={r.map} src={map} alt="" /> : null}
                    <span className={`${r.storyVisCap} over-link`}>
                      <span className="kicker">Circuit</span>
                      <EntityLink kind="circuit" id={race.circuit_id} year={year} preview={false}>{circuitZh} · 这条赛道的全部比赛<Icon name="chevron-right" size={18} /></EntityLink>
                    </span>
                  </div>
                )}
                </div>
                {uniq.length > 0 && (
                  <div className={r.notes}>
                    <div><p className="kicker">Moments</p><h2 className="cn-h2">百科中的这一站</h2></div>
                    {uniq.map((m, i) => (
                      <article key={i} className={r.note}>
                        {m.kind === "driver"
                          ? <span className={r.noteSubj}><span className="kicker">车手</span>{P(m.subject, m.subjectName, 20, false, teamById.get(m.subject))}</span>
                          : m.kind === "team"
                            ? <span className={r.noteSubj}><span className="kicker">车队</span><Team year={year} id={m.subject} name={m.subjectName} size={18} /></span>
                            : <span className={r.noteSubj}><span className="kicker">赛道</span><EntityLink kind="circuit" id={m.subject} year={year} className="ilink">{m.subjectName}</EntityLink></span>}
                        <h3 className="cn-h3">{m.title}</h3>
                        <p><Linked text={m.text} skip={m.subject} skipRace={`${year}/${round}`} /></p>
                        <p className={e.src}>{m.sources.map((x, j) => <a key={j} href={x.url} target="_blank" rel="noreferrer">{x.label}</a>)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!upcoming && (
          <section className="band band-white">
            <div className="wrap">
              <div className={r.resGrid}>
                <div>
                  <div className="sec-head"><div><p className="kicker">Results</p><h2 className="cn-h2">正赛成绩</h2></div><span className="sub">悬停车手 / 车队看简介，点击进入其页面</span></div>
                  <div className={r.tblCard}>
                    <table className={`tbl row-hover ${r.tbl}`}>
                      <thead><tr><th>名次</th><th>车手</th><th className={r.hideS}>车队</th><th className={`r ${r.hideS}`}>圈数</th><th className="r">用时 / 状态</th><th className={`r ${r.hideS}`}>发车</th><th className="r">积分</th></tr></thead>
                      <tbody>
                        {results.map((x: any) => {
                          const gain = x.grid_position_number && x.position_number ? x.grid_position_number - x.position_number : null;
                          return (
                            <tr key={x.driver_id + x.position_display_order}>
                              <td className={`num ${r.posCell}`}>{x.position_number ?? <span className={r.dnfTag}>{x.position_text}</span>}</td>
                              <td>
                                <span className={r.drvCell}>
                                  {P(x.driver_id, x.driverName, 20, true, x.constructor_id)}
                                  {x.pole_position ? <span className={`${r.tag} ${r.tagPole}`}>杆位</span> : null}
                                  {x.fastest_lap ? <span className={`${r.tag} ${r.tagFl}`}>最快圈</span> : null}
                                  {x.driver_of_the_day ? <span className={r.tag}>车手之日</span> : null}
                                </span>
                              </td>
                              <td className={r.hideS}><Team year={year} id={x.constructor_id} name={teamOf(x.constructor_id, x.teamName)} size={20} badge /></td>
                              <td className={`r num mute ${r.hideS}`}>{x.laps ?? ""}</td>
                              <td className={`r ${r.time}`}>{x.position_number ? (x.position_number === 1 ? x.time : x.gap ?? x.time ?? "") : <span className={r.retired}>{RETIRED_ZH[x.reason_retired] ?? x.reason_retired ?? x.position_text}</span>}</td>
                              <td className={`r num ${r.hideS}`}>{x.grid_position_text ?? ""}{gain ? <em className={gain > 0 ? r.up : r.down}>{gain > 0 ? `+${gain}` : gain}</em> : null}</td>
                              <td className="r num">{x.points || ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <aside className={r.aside}>
                  {standings.length > 0 && (
                    <div className={e.sideBox}>
                      <h3>本站后车手积分榜</h3>
                      <ol className={`${r.mini} row-hover`}>
                        {standings.map((x: any) => (
                          <li key={x.driver}>
                            <span className="num">{x.pos}</span>{P(x.driver, x.name, 20, false, teamById.get(x.driver))}<b className="num">{x.points}</b>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {fl[0] && (
                    <div className={e.sideBox}>
                      <h3>最快圈</h3>
                      <p className={r.flLine}>{P(fl[0].driver_id, fl[0].driverName, 24, false, fl[0].constructor_id ?? teamById.get(fl[0].driver_id))}<span><b>{fl[0].fastest_lap_time}</b>{fl[0].fastest_lap_lap ? <em>第 {fl[0].fastest_lap_lap} 圈</em> : null}</span></p>
                    </div>
                  )}
                  {dotd[0] && (
                    <div className={e.sideBox}>
                      <h3>车手之日（票选）</h3>
                      {dotd.slice(0, 3).map((x: any) => <p key={x.driver_id} className={r.flLine}>{P(x.driver_id, x.driverName, 24, false, x.constructor_id ?? teamById.get(x.driver_id))} <b className={r.pct}>{x.driver_of_the_day_percentage}%</b></p>)}
                    </div>
                  )}
                </aside>
              </div>

              {quali.length > 0 && (
                <div className={r.block}>
                  <div className="sec-head"><div><p className="kicker">Qualifying</p><h2 className="cn-h2">排位赛</h2></div></div>
                  <div className={r.tblCard}>
                    <table className={`tbl row-hover ${r.tbl}`}>
                      <thead><tr><th>名次</th><th>车手</th><th className={r.hideS}>车队</th><th className="r">{quali[0].qualifying_q1 ? "Q1" : "成绩"}</th>{quali[0].qualifying_q1 && <><th className={`r ${r.hideS}`}>Q2</th><th className="r">Q3</th></>}{qLaps && <th className={`r ${r.hideS}`}>圈数</th>}</tr></thead>
                      <tbody>
                        {quali.map((q: any) => (
                          <tr key={q.driver_id + q.position_display_order}>
                            <td className={`num ${r.posCell}`}>{q.position_text}</td>
                            <td><span className={r.drvCell}>{P(q.driver_id, q.driverName, 20, true, q.constructor_id)}{q.position_number === 1 && <span className={`${r.tag} ${r.tagPole}`}>杆位</span>}</span></td>
                            <td className={r.hideS}><Team year={year} id={q.constructor_id} name={teamOf(q.constructor_id, q.teamName)} size={20} badge /></td>
                            <td className={`r ${r.time}`}>{q.qualifying_q1 ?? q.qualifying_time ?? ""}</td>
                            {quali[0].qualifying_q1 && <><td className={`r ${r.time} ${r.hideS}`}>{q.qualifying_q2 ?? ""}</td><td className={`r ${r.time}`}>{q.qualifying_q3 ?? ""}</td></>}
                            {qLaps && <td className={`r num mute ${r.hideS}`}>{q.qualifying_laps ?? ""}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {sprint.length > 0 && (
                <div className={r.block}>
                  <div className="sec-head"><div><p className="kicker">Sprint</p><h2 className="cn-h2">冲刺赛</h2></div></div>
                  <div className={r.sprint}>
                    {sprint.slice(0, 8).map((x: any) => (
                      <span key={x.driver_id} className={r.sChip}><b className="num">{x.position_text}</b>{P(x.driver_id, x.driverName, 20, false, x.constructor_id)}<span className={r.sTeam}><Team year={year} id={x.constructor_id} name={teamOf(x.constructor_id, x.teamName)} size={20} badge /></span>{x.race_points ? <em><span className="num">{x.race_points}</span> 分</em> : null}</span>
                    ))}
                  </div>
                </div>
              )}

              {pits.length > 0 && (
                <div className={r.block}>
                  <div className="sec-head"><div><p className="kicker">Pit Stops</p><h2 className="cn-h2">进站</h2></div><span className="sub"><span className="num">{pits.length}</span> 次</span></div>
                  <div className={r.pitCard}>
                    <div className={r.pits} style={{ ["--lap10" as any]: `${(10 / (race.laps || 1)) * 100}%` }}>
                      {results.filter((x: any) => pits.some((p: any) => p.driver_id === x.driver_id)).map((x: any) => (
                        <div key={x.driver_id} className={r.pitRow} style={{ ["--team" as any]: teamColor(x.constructor_id) }}>
                          <span className={r.pitName}>{P(x.driver_id, x.driverName, 20, false, x.constructor_id)}</span>
                          <span className={r.pitLane}>
                            {pits.filter((p: any) => p.driver_id === x.driver_id).map((p: any) => (
                              <i key={p.pit_stop_stop} style={{ left: `${(p.pit_stop_lap / (race.laps || 1)) * 100}%` }} title={`第 ${p.pit_stop_lap} 圈 · ${p.pit_stop_time}`} />
                            ))}
                          </span>
                        </div>
                      ))}
                      <div className={r.pitAxis}><span>第 1 圈</span><span>第 {race.laps} 圈</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </ViewTransition>
  );
}
