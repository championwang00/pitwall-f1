import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/shell/Breadcrumb";
import { ViewTransition } from "react";
import b from "./brief.module.css";
import { getRaceByYearRound, driverStandingsAfter, constructorStandingsAfter, lastCompletedRace } from "@/lib/f1";
import { circuitTalk } from "@/lib/talk";
import { driverRecordsAt, teamRecordsAt, lastRaceAt } from "@/lib/brief";
import { circuitRecords } from "@/lib/records";
import { seasonSchedule } from "@/lib/schedule";
import { notes, circuits as cContent, momentsFor } from "@/lib/content";
import { teamColor, flag } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Team from "@/components/entity/Team";
import Icon from "@/components/ui/Icon";
import { SESSION_ZH } from "@/lib/openf1";
import Laurel from "@/components/entity/Laurel";
import DriverCard from "@/components/entity/DriverCard";
import { isLight } from "@/lib/color";
import { Linked } from "@/lib/linkify";
import LocalTime from "@/components/ui/LocalTime";
import TalkingPoints from "@/components/entity/TalkingPoints";
import PrintButton from "./PrintButton";
import RailScope from "@/components/season/RailScope";
import { briefRail } from "@/lib/railData";

export const dynamic = "force-dynamic";


/** 解说手册 = one race's document (IA spec v5 §0.5.4): /races/Y/R/brief, a child of the race hub. /brief redirects here. */
export default async function BriefPage({ params }: { params: Promise<{ year: string; round: string }> }) {
  const { year: ys, round: rs } = await params;
  const year = +ys, round = +rs;
  const race = getRaceByYearRound(year, round);
  if (!race) notFound();
  const gp = gpZh(race.grand_prix_id);
  const cid = race.circuit_id;
  const cz = cContent()[cid];
  const last = lastCompletedRace();
  // standings going into this race: latest for the current season, otherwise after the previous round of that year
  const pre = year === last.year ? undefined : Math.max(1, round - 1);
  const standings = pre ? driverStandingsAfter(year, pre) : driverStandingsAfter(last.year);
  const teams = constructorStandingsAfter(year === last.year ? last.year : year);
  const sched = (await seasonSchedule(year)).find((r) => r.round === round);
  const lr = lastRaceAt(cid, { year, round });
  const lrMoments = lr ? momentsFor({ year: lr.race.year, circuit: cid }) : [];
  const drivers = standings.map((d: any) => d.driver);
  const recs = driverRecordsAt(cid, drivers, pre ? year : 9999);
  const trecs = teamRecordsAt(cid, teams.map((t: any) => t.team), pre ? year : 9999);
  const leader = standings[0], p2 = standings[1];
  const left = year === last.year ? (await seasonSchedule(last.year)).filter((r) => !r.winner) : (await seasonSchedule(year)).filter((r) => r.round >= round);
  const maxLeft = left.length * 25 + left.filter((r) => r.sprint).length * 8;
  const dNote = (id: string) => notes.driver(id).find((n) => n.tag === "故事线") ?? notes.driver(id)[0];
  const seasonNotes = notes.season(year).slice(0, 6);
  const hasNotes = drivers.some((id: string) => !!dNote(id));
  const dn = (id: string, name?: string) => zhName.driver(id) ?? name ?? id;
  const tn = (id: string, name?: string) => zhName.team(id) ?? name ?? id;
  const D = (id: string, name: string | undefined, size = 24, sub?: string, team?: string) => <Person id={id} year={year} name={dn(id, name)} size={size} sub={sub} color={team ? teamColor(team) : undefined} />;
  const Y = (y: number, r?: number, children?: React.ReactNode, className = "ilink") =>
    <EntityLink kind="year" id={String(y)} href={r ? `/races/${y}/${r}` : undefined} className={className}>{children ?? y}</EntityLink>;
  const nameOf = new Map(standings.map((d: any) => [d.driver, d.name]));
  const teamLeader = teams[0];

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div className={b.page}>
        <RailScope {...briefRail(year, round)} />
        <header className={b.head}>
          <div className="wrap">
            <Breadcrumb flush items={[
              { label: "历史", href: "/seasons" },
              { label: year, kind: "year", id: String(year), href: `/seasons/${year}`, name: String(year) },
              { label: <>第 <span className="num">{round}</span> 站 {gp}</>, href: `/races/${year}/${round}`, name: `第 ${round} 站 ${gp}` },
              { label: "解说手册" },
            ]} />
            <div className={b.headRow}>
              <div>
                <p className="kicker">Commentator Brief · Round {round} · {Y(year)}</p>
                <h1 className={b.title}>{gpZh(race.grand_prix_id)}</h1>
                <p className="meta-line">{flag(race.circuitCountry) && <img src={flag(race.circuitCountry)!} alt="" />}<EntityLink kind="circuit" id={cid} year={year} className={b.u}>{zhName.circuit(cid) ?? race.circuitName}</EntityLink><span>{race.place_name}</span><span className={b.facts}><b>{race.course_length}</b> 公里 × <b>{race.scheduled_laps ?? race.laps}</b> 圈 · <b>{race.turns}</b> 个弯</span></p>
              </div>
              <div className={b.actions}>
                <PrintButton />
                <Link href={`/races/${year}/${round}`} className="btn btn-line">本站档案<Icon name="chevron-right" size={16} /></Link>
                <Link href="/live" className="btn btn-line"><Icon name="live-timing" size={16} />实时计时</Link>
              </div>
            </div>
            {sched && (
              <ol className={b.sessions}>
                {sched.sessions.map((x) => (
                  <li key={x.name} className={x.name === "Race" ? b.sRace : undefined}>
                    <span>{SESSION_ZH[x.name] ?? x.name}</span>
                    <span className={b.sWhen}><LocalTime iso={x.start} format="weekday" /> <LocalTime iso={x.start} format="date" className={b.sDate} /></span>
                    <LocalTime iso={x.start} format="time" className={b.sTime} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </header>

        <TalkingPoints auto={circuitTalk(cid)} notes={notes.circuit(cid)} subject={cz?.nameZh ?? race.circuitName} title="赛道要点" records={circuitRecords(cid)} year={year} skipRace={`${year}/${round}`} />

        <section className="band band-paper">
          <div className="wrap">
            <div className={b.two}>
              {lr && (
                <div>
                  <p className="kicker">Last time here</p>
                  <h2 className="cn-h2">{Y(lr.race.year, lr.race.round, undefined, b.hy2)} {gpZh(race.grand_prix_id)}</h2>
                  <div className={b.podCards}>
                    {lr.top.map((x: any) => (
                      <DriverCard key={x.id} id={x.id} year={lr.race.year} size="sm" color={teamColor(x.team, "#3a3a44")}
                        name={dn(x.id, x.name)} kicker={x.pos ? `P${x.pos}` : "—"}
                        laurels={x.pos === 1 ? [{ top: "冠军" }] : []}
                        meta={<span className={b.podMeta}><Team id={x.team} name={tn(x.team)} size={16} year={lr.race.year} onDark={!isLight(teamColor(x.team, "#3a3a44"))} /><span className={b.time}>{x.pos === 1 ? x.time : x.gap}</span></span>} />
                    ))}
                  </div>
                  <div className={b.small}>
                    {lr.pole && <span className={b.hon}><Laurel tone="red" size={26} top="杆位" />{D(lr.pole.id, lr.pole.name, 22)}</span>}
                    {lr.fl && <span className={b.hon}><Laurel tone="purple" size={26} top="最快圈" bottom={lr.fl.time} />{D(lr.fl.id, lr.fl.name, 22)}</span>}
                  </div>
                  {lrMoments.map((m, i) => (
                    <div key={i} className={b.story}><b><Linked text={m.title} skip={cid} year={lr.race.year} /></b><p><Linked text={m.text} skip={cid} year={lr.race.year} /></p><p className={b.src}>{m.sources.map((x, j) => <a key={j} href={x.url}>{x.label}</a>)}</p></div>
                  ))}
                  {Y(lr.race.year, lr.race.round, `${lr.race.year} 年完整成绩`, "link-arrow")}
                </div>
              )}
              <div>
                <p className="kicker">Standings</p>
                <h2 className="cn-h2">冠军形势</h2>
                {(leader || teamLeader) && (
                  <div className={b.leaders}>
                    {leader && <span className={b.hon}><Laurel tone="gold" size={34} top="车手积分领跑" bottom={`${leader.points} 分`} />{D(leader.driver, leader.name, 28, undefined, leader.team)}</span>}
                    {teamLeader && <span className={b.hon}><Laurel tone="gold" size={34} top="车队积分领跑" bottom={`${teamLeader.points} 分`} /><Team id={teamLeader.team} name={tn(teamLeader.team, teamLeader.name)} size={24} year={year} badge /></span>}
                  </div>
                )}
                {leader && p2 && <p className={b.math}><EntityLink kind="driver" id={leader.driver} year={year} className="ilink">{dn(leader.driver, leader.name)}</EntityLink> 领先 <EntityLink kind="driver" id={p2.driver} year={year} className="ilink">{dn(p2.driver, p2.name)}</EntityLink> <b className="num">{leader.points - p2.points}</b> 分；还剩 <b className="num">{left.length}</b> 站，最多 <b className="num">{maxLeft}</b> 分可争。</p>}
                <table className={`tbl row-hover ${b.stand}`}>
                  <thead><tr><th>名次</th><th>车手</th><th className="r">积分</th></tr></thead>
                  <tbody>
                    {standings.slice(0, 8).map((d: any) => (
                      <tr key={d.driver}>
                        <td className="num">{d.pos}</td><td>{D(d.driver, d.name, 24, undefined, d.team)}</td><td className="r">{d.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="band band-paper">
          <div className="wrap">
            <div className="sec-head"><h2 className="cn-h2">每位车手在<EntityLink kind="circuit" id={cid} year={year} className="ilink">{zhName.circuit(cid) ?? race.circuitName}</EntityLink></h2><span className="sub">按当前积分排序；历史成绩点开即那一年</span></div>
            <div className={b.tableWrap}>
              <table className={`tbl ${b.table}`}>
                <thead><tr><th>车手</th><th className="r">出赛</th><th className="r">胜</th><th className="r">领奖台</th><th className="r">杆位</th><th>最好</th><th>历年</th>{hasNotes && <th>一句话</th>}</tr></thead>
                <tbody>
                  {recs.map((r) => {
                    const st = standings.find((s: any) => s.driver === r.id);
                    const n = dNote(r.id);
                    return (
                      <tr key={r.id}>
                        <td>
                          {D(r.id, st?.name ?? nameOf.get(r.id), 28, `${st?.abbreviation ?? ""} · P${st?.pos ?? "—"}`, st?.team)}
                        </td>
                        <td className="r num">{r.starts || <span className={b.debut}>首次</span>}</td>
                        <td className={`r num ${r.wins ? "" : b.zero}`}>{r.wins}</td>
                        <td className={`r num ${r.pods ? "" : b.zero}`}>{r.pods}</td>
                        <td className={`r num ${r.poles ? "" : b.zero}`}>{r.poles}</td>
                        <td className="num">{r.best ? Y(r.best.year, r.best.round, <>P{r.best.pos} <em>{r.best.year}</em></>) : "—"}</td>
                        <td><span className={b.hist}>{r.history.map((h) => <EntityLink key={`${h.year}-${h.round}`} kind="year" id={String(h.year)} href={`/races/${h.year}/${h.round}`} className={h.pos === 1 ? b.hWin : h.pos && h.pos <= 3 ? b.hPod : !h.pos ? b.hDnf : ""}><span className={b.hy}>{String(h.year).slice(2)}</span>{h.pos ?? "R"}</EntityLink>)}</span></td>
                        {hasNotes && <td className={b.note}>{n ? <a href={`#note-${r.id}`}>{n.title}</a> : ""}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {hasNotes && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><h2 className="cn-h2">车手故事线</h2><span className="sub"><Linked text="每人一条，来自核实过的 2026 报道" /></span></div>
              <ol className={b.storyGrid}>
                {recs.map((r) => {
                  const n = dNote(r.id);
                  const st = standings.find((x: any) => x.driver === r.id);
                  if (!n) return null;
                  return (
                    <li key={r.id} id={`note-${r.id}`} className="lift">
                      <Link href={`/drivers/${r.id}?year=${year}`} className="card-link" aria-label={dn(r.id, st?.name ?? nameOf.get(r.id))} tabIndex={-1} />
                      <span className={`${b.storyWho} over-link on-color ${isLight(teamColor(st?.team, "#3a3a44")) ? "on-light" : ""}`} style={{ ["--c" as any]: teamColor(st?.team, "#3a3a44") }}>
                        <Person id={r.id} year={year} name={dn(r.id, st?.name ?? nameOf.get(r.id))} size={40} sub={`P${st?.pos ?? "—"}`} color={teamColor(st?.team, "#3a3a44")} />
                      </span>
                      <div className={`${b.storyBody} over-link`}>
                        <b><Linked text={n.title} skip={r.id} year={year} /></b>
                        <p><Linked text={n.text} skip={r.id} year={year} /> <a href={n.sources[0]?.url} className={b.noteSrc}>来源</a></p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        <section className="band band-paper">
          <div className="wrap">
            <div className={b.two}>
              <div>
                <h2 className="cn-h2">车队在这里</h2>
                <table className={`tbl row-hover ${b.teamTbl}`} style={{ marginTop: 12 }}>
                  <thead><tr><th>车队</th><th className="r">出赛</th><th className="r">胜</th><th className="r">领奖台</th><th className="r">上次最好</th></tr></thead>
                  <tbody>
                    {trecs.sort((a, c) => c.wins - a.wins || c.pods - a.pods).map((t) => (
                      <tr key={t.id}>
                        <td><Team id={t.id} name={tn(t.id)} size={20} year={year} badge /></td>
                        <td className="r">{t.races}</td>
                        <td className={`r ${t.wins ? "" : b.zero}`}>{t.wins}</td>
                        <td className={`r ${t.pods ? "" : b.zero}`}>{t.pods}</td>
                        <td className="r mute">{t.last ? <>P{t.last.best === 99 ? "—" : t.last.best} {Y(t.last.year, t.last.round, undefined, b.lastY)}</> : <span className={b.debut}>首次</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {seasonNotes.length > 0 && (
                <div>
                  <h2 className="cn-h2">{Y(year, undefined, undefined, b.hy2)} 赛季看点</h2>
                  <ol className={b.notes}>
                    {seasonNotes.map((n, i) => (
                      <li key={i}><span className={b.tag}>{n.tag}</span><b><Linked text={n.title} year={year} /></b><p><Linked text={n.text} year={year} /></p><p className={b.src}>{n.sources.map((x, j) => <a key={j} href={x.url}>{x.label}</a>)}</p></li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
