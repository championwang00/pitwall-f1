import { reliefInfo } from "@/components/three/relief";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import s from "@/components/entity/entity.module.css";
import c from "./circuit.module.css";
import { getCircuit, circuitRaces, circuitLayouts, lapRecord, getCountry } from "@/lib/f1";
import { cubeFor } from "@/lib/cube";
import { circuits as cContent } from "@/lib/content";
import { trackMap, flag, teamColor, raceCard } from "@/lib/assets";
import { trackShape } from "@/lib/tracks";
import { gpZh, NAT_ZH, TEAM_ZH } from "@/lib/names";
import { summary, wikiMap, wikiThumb } from "@/lib/wiki";
import Cube from "@/components/cube/Cube";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { circuitTalk } from "@/lib/talk";
import { circuitRecords } from "@/lib/records";
import { notes } from "@/lib/content";
import { Moments, StatRow } from "@/components/entity/Moments";
import TrackField from "@/components/entity/TrackField";
import { zhName } from "@/lib/zh";
import { all } from "@/lib/db";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import { Linked } from "@/lib/linkify";
import YearStrip from "./YearStrip";
import { circuitYears } from "@/lib/f1";
import { circuitYear, parseYear, nearestYears } from "@/lib/yearData";
import { seasonSchedule } from "@/lib/schedule";
import RailScope from "@/components/season/RailScope";
import { circuitRail } from "@/lib/railData";
import Team from "@/components/entity/Team";
import EraSpan from "@/components/unit/EraSpan";
import YearBand, { YearMissing } from "@/components/unit/YearBand";
import CircuitYear from "@/components/unit/CircuitYear";
import { circuitYearTalk } from "@/components/unit/yearTalk";
import u from "@/components/unit/unit.module.css";
import Icon from "@/components/ui/Icon";
import Breadcrumb, { subjectCrumbs } from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

const TYPE_ZH: Record<string, string> = { STREET: "街道赛", RACE: "永久赛道", ROAD: "公路赛道" };

export default async function CircuitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ci = getCircuit(id);
  if (!ci) notFound();
  const content = cContent()[id];
  const races = circuitRaces(id);
  const layouts = circuitLayouts(id);
  const latest = races[0];
  const rec = lapRecord(id, latest?.layout);
  const cube = cubeFor({ circuit: id });
  const shape = trackShape(id, 320);
  const map = trackMap(id, 900);
  const country = getCountry(ci.country_id);
  const wiki = await summary(wikiMap().circuits[id]);
  const onCalendar = races.some((r: any) => r.year >= 2026);
  const storyPhoto = onCalendar ? raceCard(latest.gp, 1200) : wiki?.originalimage?.source ?? null;
  const storyCaption = onCalendar ? "图片：formula1.com" : wiki ? `图片：Wikipedia · ${wiki.title}` : "";
  const y0 = races.at(-1)?.year, y1 = races[0]?.year;
  const winsBy = new Map<string, number>();
  for (const r of races) if (r.winner) winsBy.set(r.winner, (winsBy.get(r.winner) ?? 0) + 1);
  const king = [...winsBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const kingName = races.find((r: any) => r.winner === king?.[0])?.winnerName;
  // honours: every driver tied on the most wins / poles here
  const top = (m: Map<string, number>) => { const max = Math.max(0, ...m.values()); return { max, ids: [...m.entries()].filter(([, n]) => n === max).map(([k]) => k).slice(0, 3) }; };
  const polesBy = new Map<string, number>();
  for (const r of races) if (r.pole) polesBy.set(r.pole, (polesBy.get(r.pole) ?? 0) + 1);
  const winKing = top(winsBy), poleKing = top(polesBy);
  const nameOf = new Map<string, string>();
  for (const r of races) { if (r.winner) nameOf.set(r.winner, r.winnerName); if (r.pole) nameOf.set(r.pole, r.poleName); }
  // fastest-lap driver per race (circuitRaces only carries the name)
  const flBy = new Map(all<any>(
    `select fl.race_id id, fl.driver_id d from fastest_lap fl join race r on r.id = fl.race_id where r.circuit_id = ? and fl.position_number = 1`, id,
  ).map((x) => [x.id as number, x.d as string]));
  const dn = (d: string, name?: string) => zhName.driver(d) ?? name ?? nameOf.get(d) ?? d;
  // year layer (spec §4.3): ?year=Y → 「Y 年在这里」; the rail dims the years it wasn't held
  const year = parseYear(sp.year);
  const ys = circuitYears(id);
  const cy = year && ys.includes(year) ? circuitYear(id, year) : null;
  const yTalk = cy && year ? circuitYearTalk(id, year, cy, ys.filter((y) => y <= year).length) : null;
  const near = year ? nearestYears(ys, year) : null;
  const yHref = (y: number) => `/circuits/${id}?year=${y}`;
  const cname = content?.nameZh ?? zhName.circuit(id) ?? ci.name;
  const replay: Record<number, string | null> = {};
  if (cy && year && year >= 2023) {
    const sched = await seasonSchedule(year).catch(() => []);
    for (const r of cy) {
      const race = sched.find((x) => x.round === r.round)?.sessions.find((x) => x.name === "Race");
      replay[r.round] = race?.key && new Date(race.end).getTime() < Date.now() ? `/seasons/${year}/replay?session=${race.key}` : null;
    }
  }
  const decMap = new Map<number, any[]>();
  for (const r of races) { const d = Math.floor(r.year / 10) * 10; decMap.set(d, [...(decMap.get(d) ?? []), r]); }
  const decades = [...decMap.entries()];

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <section className={c.hero}>
          <div className={c.heroIn}>
            <div className={c.text}>
              <Breadcrumb flush items={subjectCrumbs("赛道", "/circuits", { label: cname, href: `/circuits/${id}`, kind: "circuit", id }, year)} />
              <h1 className={c.title} style={{ fontSize: ci.name.length > 10 ? "clamp(32px, 3.8vw, 56px)" : undefined }}>{ci.name}</h1>
              <p className="cx">{content?.nameZh ?? ci.full_name}</p>
              <p className="meta-line">
                {flag(ci.country_id) && <img src={flag(ci.country_id)!} alt="" />}
                {NAT_ZH[ci.country_id] ?? country?.name} · {ci.place_name} · {TYPE_ZH[ci.type] ?? ci.type} · {ci.direction === "CLOCKWISE" ? "顺时针" : "逆时针"}
              </p>
              {content?.tagline && <p className={s.tagline}><Linked text={content.tagline} skip={id} /></p>}
              {content?.traits && <p className={c.traits}><Linked text={content.traits.join(" / ")} skip={id} /></p>}
              <EraSpan years={ys} />
              {cy && year && cy[0] && (
                <p className={u.yLine}>
                  <span className={u.yBadge}>{year}</span>
                  <Link href={`/races/${year}/${cy[0].round}`}>{gpZh(cy[0].gp)}</Link>
                  {cy[0].podium[0] && <><span>· 冠军</span><Person id={cy[0].podium[0].id} year={year} color={cy[0].podium[0].team ? teamColor(cy[0].podium[0].team) : null} name={dn(cy[0].podium[0].id, cy[0].podium[0].name)} size={24} /></>}
                </p>
              )}
              <div style={{ marginTop: 32 }}>
                <StatRow items={[
                  { k: "Circuit Length", sub: "km", v: ci.length?.toFixed(3) },
                  { k: "Turns", v: ci.turns },
                  { k: "Races", v: ci.total_races_held },
                  { k: "First Grand Prix", v: y0 },
                ]} />
              </div>
              {(winKing.max > 0 || poleKing.max > 0 || rec) && (
                <div className={c.honours}>
                  {winKing.max > 0 && (
                    <div className={c.hon}>
                      <Laurel tone="gold" size={38} top={`${winKing.max} 胜`} bottom={winKing.max > 1 ? "赛道之王" : races.filter((r: any) => r.winner).length === 1 ? "唯一冠军" : "胜场最多"} />
                      {winKing.ids.map((d) => <Person key={d} id={d} name={dn(d)} size={28} year={year} />)}
                    </div>
                  )}
                  {poleKing.max > 0 && (
                    <div className={c.hon}>
                      <Laurel tone="red" size={38} top={`${poleKing.max} 杆`} bottom={races.filter((r: any) => r.pole).length === 1 ? "唯一杆位" : "杆位最多"} />
                      {poleKing.ids.map((d) => <Person key={d} id={d} name={dn(d)} size={28} year={year} />)}
                    </div>
                  )}
                  {rec && (
                    <div className={c.hon}>
                      <Laurel tone="purple" size={38} top="圈速纪录" bottom={rec.time} />
                      <span className={c.recWho}>
                        <Person id={rec.driver_id} name={dn(rec.driver_id, rec.name)} size={28} />
                        <EntityLink kind="year" id={String(rec.year)} href={`/races/${rec.year}/${rec.round}`} className={c.recYear}>{rec.year}</EntityLink>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={c.track}>
            {shape ? (
              <ViewTransition name={`track-${id}`} share="morph" default="none">
                <div className={c.canvas}><TrackField points={shape.points} /></div>
              </ViewTransition>
            ) : wiki?.thumbnail ? (
              <img className={c.map} src={wikiThumb(wiki.thumbnail.source, 960)} alt="" style={{ filter: "invert(1)" }} />
            ) : null}
          </div>
          {shape && <p className={c.note}>3D 模型由 {shape.year} 年排位赛最快圈的真实遥测坐标重建；真实高度落差 {reliefInfo(shape.points).meters} 米，3D 中放大 {reliefInfo(shape.points).factor}× 以便看清起伏；移动鼠标改变视角</p>}
        </section>

        <RailScope {...circuitRail(id, year)} />

        {year && (
          <YearBand year={year} label="年在这里" clearHref={`/circuits/${id}`}
            sub={cy ? `${cname} 的 ${year} 年：领奖台、杆位、最快圈与这一年的故事` : undefined}>
            {cy ? <CircuitYear year={year} races={cy} replay={replay} /> : (
              <YearMissing text={<>{cname} {year} 年未举办 F1 世锦赛分站 · 举办年份 {y0}–{y1}，共 {ys.length} 个年份</>} prev={near!.prev} next={near!.next} hrefFor={yHref} />
            )}
          </YearBand>
        )}

        {yTalk && year && (yTalk.notes.length + yTalk.auto.length > 0)
          ? <TalkingPoints auto={yTalk.auto} notes={yTalk.notes} title={`${year} 年解说要点`} subject={`${cname} · ${year}`} skip={id} />
          : <TalkingPoints auto={circuitTalk(id)} notes={notes.circuit(id)} subject={content?.nameZh ?? ci.name} records={circuitRecords(id)} />}

        <section className="band band-paper">
          <div className="wrap">
            <div className="sec-head">
              <div><p className="kicker">Results</p><h2 className="cn-h2">历届比赛</h2></div>
              <span className="sub">{races.filter((r: any) => r.winner).length} 场 · {y0}–{y1}{king && <> · 胜场最多：<EntityLink kind="driver" id={king[0]} className="ilink">{dn(king[0], kingName)}</EntityLink>（{king[1]} 胜）</>}</span>
            </div>
            <YearStrip current={year} races={races.map((r: any) => ({ year: r.year, round: r.round, gp: gpZh(r.gp), team: r.winnerTeam, color: r.winnerTeam ? teamColor(r.winnerTeam) : null, winner: r.winner ? dn(r.winner, r.winnerName) : null }))} />
            <div className={c.list}>
              <div className={c.lHead}><span>年份</span><span>冠军</span><span>车队</span><span>发车位</span><span>杆位</span><span>最快圈</span></div>
              {(() => {
                const row = (r: any) => (
                  <div key={r.id} className={`${c.lRow} ${r.year === year ? c.lOn : ""}`}>
                    <EntityLink kind="year" id={String(r.year)} href={`/races/${r.year}/${r.round}`} className={`num ${c.lYear}`}>{r.year}</EntityLink>
                    <span className={c.lWin}>{r.winner ? <Person id={r.winner} year={r.year} color={r.winnerTeam ? teamColor(r.winnerTeam) : null} name={dn(r.winner, r.winnerName)} size={24} /> : <EntityLink kind="year" id={String(r.year)} href={`/races/${r.year}/${r.round}`} className="ilink">即将举行</EntityLink>}</span>
                    <span className={c.lTeam}>{r.winnerTeam ? <Team id={r.winnerTeam} year={r.year} name={zhName.team(r.winnerTeam) ?? r.winnerTeamName} size={20} badge /> : ""}</span>
                    <span className="num">{r.winnerGrid ? (r.winnerGrid === 1 ? "杆位" : `P${r.winnerGrid}`) : "—"}</span>
                    <span>{r.pole ? <Person id={r.pole} year={r.year} name={dn(r.pole, r.poleName)} size={24} /> : "—"}</span>
                    <span>{flBy.get(r.id) ? <><Person id={flBy.get(r.id)!} year={r.year} name={dn(flBy.get(r.id)!, r.flName)} size={24} /> <em className={c.flTime}>{r.flTime}</em></> : r.flName ? <>{r.flName} <em className={c.flTime}>{r.flTime}</em></> : "—"}</span>
                  </div>
                );
                const recent = decades.slice(0, 2), older = decades.slice(2);
                return (
                  <>
                    {recent.map(([dec, rs]) => <div key={dec} className={c.dec}><p className={c.decLabel}>{dec}s</p>{rs.map(row)}</div>)}
                    {older.length > 0 && (
                      <details className={c.dec} open={!!year && older.some(([, rs]) => rs.some((r: any) => r.year === year))}>
                        <summary className={c.decLabel}>更早 <em>{older.reduce((a, d) => a + d[1].length, 0)} 场 · {older.at(-1)![0]}s–{older[0][0]}s · 展开</em></summary>
                        {older.map(([dec, rs]) => <div key={dec}><p className={c.decLabel}>{dec}s</p>{rs.map(row)}</div>)}
                      </details>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        <section className="band band-white">
          <div className="wrap">
            <Cube key={year ?? "all"} data={cube} fixed="circuit" fixedId={id} only={["driver", "team", "matrix"]} title="谁最擅长这里"
              initial={{ driver: sp.driver, team: sp.team, from: year ?? (sp.from ? +sp.from : undefined), to: year ?? (sp.to ? +sp.to : undefined), view: (sp.view as any) || undefined }} />
          </div>
        </section>

        {(content || wiki) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><div><p className="kicker">History</p><h2 className="cn-h2">这里的故事</h2></div></div>
              <div className={c.storyRow}>
                <div>
                  <p className={s.bio}><Linked text={content?.summary ?? wiki?.extract ?? ""} skip={id} /></p>
                  {map && (
                    <figure className={c.officialMap}>
                      <img src={map} alt={`${ci.name} 官方赛道图`} />
                      <figcaption>官方赛道图 · 弯角编号、计时段与超车区</figcaption>
                    </figure>
                  )}
                </div>
                {storyPhoto && <figure className={c.storyPhoto}><img src={storyPhoto} alt="" /><figcaption>{storyCaption}</figcaption></figure>}
              </div>
              {content?.moments && <div style={{ marginTop: 64 }}><Moments items={content.moments} title="这里发生过" /></div>}
            </div>
          </section>
        )}
      </div>
    </ViewTransition>
  );
}
