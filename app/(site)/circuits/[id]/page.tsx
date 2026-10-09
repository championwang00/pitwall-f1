import { entityOverview, overviewSource } from "@/lib/overview";
import { reliefInfo } from "@/components/three/relief";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import s from "@/components/entity/entity.module.css";
import c from "./circuit.module.css";
import { getCircuit, circuitRaces } from "@/lib/f1";
import { cubeFor } from "@/lib/cube";
import { circuits as cContent } from "@/lib/content";
import { trackMap, teamColor, raceCard } from "@/lib/assets";
import { trackShape } from "@/lib/tracks";
import { cornerLayer, cornerNote } from "@/lib/corners";
import { gpZh } from "@/lib/names";
import { summary, wikiMap, bilingualFast } from "@/lib/wiki";
import Cube from "@/components/cube/Cube";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { circuitTalk } from "@/lib/talk";
import { circuitRecords } from "@/lib/records";
import { notes } from "@/lib/content";
import { Moments } from "@/components/entity/Moments";
import TrackField from "@/components/entity/TrackField";
import { zhName } from "@/lib/zh";
import { all } from "@/lib/db";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import { Linked } from "@/lib/linkify";
import YearStrip from "./YearStrip";
import { circuitYears } from "@/lib/f1";
import { circuitYear, parseYear, nearestYears } from "@/lib/yearData";
import { circuitImage } from "@/lib/circuitImage";
import RailScope from "@/components/season/RailScope";
import { circuitRail } from "@/lib/railData";
import Team from "@/components/entity/Team";
import YearBand, { YearMissing } from "@/components/unit/YearBand";
import CircuitYear from "@/components/unit/CircuitYear";
import { circuitYearTalk, circuitPeriodTalk } from "@/components/unit/yearTalk";
import ObjectHero from "@/components/entity/ObjectHero";
import { circuitHero, parsePeriod } from "@/lib/hero";
import { rangeOf, inRange, rangeLabel, rangeTitle, rangeItems, nearestOutside } from "@/lib/range";
import YearSpan from "@/components/entity/YearSpan";

export const dynamic = "force-dynamic";


export default async function CircuitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ci = getCircuit(id);
  if (!ci) notFound();
  const content = cContent()[id];
  const races = circuitRaces(id);
  const latest = races[0];
  const cube = cubeFor({ circuit: id });
  const shape = trackShape(id, 320);
  const map = trackMap(id, 900);
  // the Chinese article only (never the English extract); never waits on Wikipedia (lib/wiki bilingualFast)
  const wiki = (await bilingualFast(wikiMap().circuits[id])).zh;
  const onCalendar = races.some((r: any) => r.year >= 2026);
  const storyPhoto = onCalendar ? raceCard(latest.gp, 1200) : wiki?.originalimage?.source ?? null;
  const storyCaption = onCalendar ? "图片：formula1.com" : wiki ? `图片：Wikipedia · ${wiki.title}` : "";
  const y0 = races.at(-1)?.year, y1 = races[0]?.year;
  // year layer (spec §4.3): ?year=Y → 「Y 年在这里」; the rail dims the years it wasn't held
  const year = parseYear(sp.year);
  // 时期 (?from&to, from the rail's group headers): the third state — a period of this same object
  const period = year ? null : parsePeriod(sp);
  // spec §0.7: every section under the hero reads only `range` (null = 总览, the only state with all-time content)
  const range = rangeOf(year, period);
  const rRaces = races.filter((r: any) => inRange(r.year, range));
  const nameOf = new Map<string, string>();
  for (const r of races) { if (r.winner) nameOf.set(r.winner, r.winnerName); if (r.pole) nameOf.set(r.pole, r.poleName); }
  // fastest-lap driver per race (circuitRaces only carries the name)
  const flBy = new Map(all<any>(
    `select fl.race_id id, fl.driver_id d from fastest_lap fl join race r on r.id = fl.race_id where r.circuit_id = ? and fl.position_number = 1`, id,
  ).map((x) => [x.id as number, x.d as string]));
  const dn = (d: string, name?: string) => zhName.driver(d) ?? name ?? nameOf.get(d) ?? d;
  const ys = circuitYears(id);
  const exists = !range || ys.some((y) => inRange(y, range));
  const pTalk = period ? circuitPeriodTalk(id, period) : null;
  const cubeRows = range ? cube.rows.filter((f) => inRange(f.y, range)) : cube.rows;
  const moments = rangeItems(content?.moments ?? [], range);
  const cy = year && ys.includes(year) ? circuitYear(id, year) : null;
  const pic = circuitImage(id, cy ? year : period ? period.to : null);
  // corner pins only on the telemetry layout (spec §0.9.5): a historic outline never gets today's numbering
  const corners = pic?.kind === "shape" ? cornerLayer(id, pic.layout) : null;
  const yTalk = cy && year ? circuitYearTalk(id, year, cy, ys.filter((y) => y <= year).length) : null;
  const near = year ? nearestYears(ys, year) : null;
  const yHref = (y: number) => `/circuits/${id}?year=${y}`;
  const cname = content?.nameZh ?? zhName.circuit(id) ?? ci.name;
  const decMap = new Map<number, any[]>();
  for (const r of rRaces) { const d = Math.floor(r.year / 10) * 10; decMap.set(d, [...(decMap.get(d) ?? []), r]); }
  const decades = [...decMap.entries()];

  const heroModel = (await circuitHero(id, year, period))!;

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <ObjectHero model={heroModel} visual={
          <>
          {/* picture rule (lib/circuitImage.ts): with ?year the layout raced THAT year — the 3D telemetry model only when it
              is the same layout, else F1DB's outline of that year's layout, captioned */}
          <div className="img-slot" data-img-kind="circuit" data-img-id={id} data-img-year={year ?? ""} data-img-status={pic ? (pic.exact ? "exact" : "representative") : "none"} data-img-caption={pic?.caption ?? ""} data-img-src={pic?.kind === "svg" ? pic.url : ""}>
            {pic?.kind === "shape" ? (
              <ViewTransition name={`track-${id}`} share="morph" default="none">
                {/* year context: the track picture opens that year's race here (global link rule); without a year it is
                    the page's own subject */}
                {/* the link wraps only the canvas inside TrackField, so the corner pins are never nested in it */}
                <div className={c.canvas}>
                  <TrackField points={pic.shape.points} corners={corners} link={year && cy?.[0] ? { kind: "race", id: `${year}-${cy[0].round}` } : undefined} />
                </div>
              </ViewTransition>
            ) : pic?.kind === "svg" ? (
              year && cy?.[0]
                ? <EntityLink kind="race" id={`${year}-${cy[0].round}`} className={`${c.canvas} pic-link`}><img className={c.map} src={pic.url} alt={pic.caption ?? ""} style={{ filter: "none", padding: "48px 40px 72px" , boxSizing: "border-box" }} /></EntityLink>
                : <img className={c.map} src={pic.url} alt={pic.caption ?? ""} style={{ filter: "none", padding: "48px 40px 72px", boxSizing: "border-box" }} />
            ) : null}
            {pic?.caption && <span className="img-cap" style={{ bottom: 20, right: 24 }}>{pic.caption}</span>}
          </div>
          </>
        } after={
          <>
          {pic?.kind === "shape" && shape && <p className={c.note}>3D 模型由 {(() => { const r = races.find((x: any) => x.year === shape.year); return <EntityLink kind="year" id={String(shape.year)} href={r ? `/races/${r.year}/${r.round}` : undefined} className="hlink">{shape.year}</EntityLink>; })()} 年排位赛最快圈的真实遥测坐标重建；真实高度落差 {reliefInfo(shape.points).meters} 米，3D 中放大 {reliefInfo(shape.points).factor}× 以便看清起伏；移动鼠标改变视角{cornerNote(corners) ? `；${cornerNote(corners)}` : ""}</p>}
          </>
        } />

        <RailScope {...circuitRail(id, year)} />

        {year && (
          <YearBand year={year} label="年在这里" skip={id}
            sub={cy ? `${cname} 的 ${year} 年：领奖台与完整单场` : undefined}>
            {cy ? <CircuitYear year={year} races={cy} /> : (
              <YearMissing text={<>{cname} <YearSpan from={year} /> 年未举办 F1 世锦赛分站 · 举办年份 <YearSpan from={y0} to={y1} />，共 {ys.length} 个年份</>} prev={near!.prev} next={near!.next} hrefFor={yHref} />
            )}
          </YearBand>
        )}

        {/* a period with no race here (hand-typed ?from&to): hero + this band, nothing else */}
        {period && !exists && (
          <YearBand year={period.from} to={period.to} label="时期" skip={id}>
            <YearMissing text={<>{cname} <YearSpan from={period.from} to={period.to} /> 未举办 F1 世锦赛分站 · 举办年份 <YearSpan from={y0} to={y1} />，共 {ys.length} 个年份</>} {...nearestOutside(ys, period)} hrefFor={yHref} />
          </YearBand>
        )}

        {exists && (<>
        {year ? (yTalk && (yTalk.notes.length + yTalk.auto.length > 0)
          ? <TalkingPoints auto={yTalk.auto} notes={yTalk.notes} title={`${year} 年解说要点`} subject={`${cname} · ${year}`} skip={id} year={year} />
          : null)
          // a period's points come from the period only; the 纪录簿 is all-time, so overview only
          : period && pTalk ? (pTalk.notes.length + pTalk.auto.length > 0
            ? <TalkingPoints auto={pTalk.auto} notes={pTalk.notes} title={`${heroModel.crumbs.at(-1)?.label} 解说要点`} subject={`${content?.nameZh ?? ci.name} · ${rangeLabel(period)}`} skip={id} />
            : null)
          : <TalkingPoints auto={circuitTalk(id)} notes={notes.circuit(id)} subject={content?.nameZh ?? ci.name} records={circuitRecords(id).filter((r) => r.label !== "杆位最多")} skip={id} />}

        {/* ?year: the year band is that year's race here, so no results table */}
        {!year && (
        <section className="band band-paper">
          <div className="wrap">
            <div className="sec-head">
              <div><p className="kicker">Results</p><h2 className="cn-h2">{rangeTitle(range, "历届比赛", "的比赛")}</h2></div>
              {/* no 「N 场 · A–B · 胜场最多」 sub: the hero's head line and 夺冠最多 tile say it (spec §0.8.5) */}
            </div>
            <YearStrip current={year} races={rRaces.map((r: any) => ({ year: r.year, round: r.round, gp: gpZh(r.gp), team: r.winnerTeam, color: r.winnerTeam ? teamColor(r.winnerTeam) : null, winner: r.winner ? dn(r.winner, r.winnerName) : null }))} />
            <div className={c.list}>
              <div className={c.lHead}><span>年份</span><span>冠军</span><span>车队</span><span>发车位</span><span>杆位</span><span>最快圈</span></div>
              {(() => {
                const row = (r: any) => (
                  <div key={r.id} className={`${c.lRow} ${r.year === year ? c.lOn : ""}`}>
                    <EntityLink kind="year" id={String(r.year)} href={range ? yHref(r.year) : `/races/${r.year}/${r.round}`} className={`num ${c.lYear}`}>{r.year}</EntityLink>
                    <span className={c.lWin}>{r.winner ? <Person id={r.winner} year={r.year} color={r.winnerTeam ? teamColor(r.winnerTeam) : null} name={dn(r.winner, r.winnerName)} size={24} /> : <EntityLink kind="year" id={String(r.year)} href={`/races/${r.year}/${r.round}`} className="ilink">即将举行</EntityLink>}</span>
                    <span className={c.lTeam}>{r.winnerTeam ? <Team id={r.winnerTeam} year={r.year} name={zhName.team(r.winnerTeam) ?? r.winnerTeamName} size={20} badge /> : ""}</span>
                    <span className="num">{r.winnerGrid ? (r.winnerGrid === 1 ? "杆位" : `P${r.winnerGrid}`) : "—"}</span>
                    <span>{r.pole ? <Person id={r.pole} year={r.year} name={dn(r.pole, r.poleName)} size={24} /> : "—"}</span>
                    <span>{flBy.get(r.id) ? <><Person id={flBy.get(r.id)!} year={r.year} name={dn(flBy.get(r.id)!, r.flName)} size={24} /> <em className={c.flTime}>{r.flTime}</em></> : r.flName ? <>{r.flName} <em className={c.flTime}>{r.flTime}</em></> : "—"}</span>
                  </div>
                );
                // 时期: no 「更早」 fold; decade labels only when the range spans two decades or more
                if (range) return decades.length > 1
                  ? decades.map(([dec, rs]) => <div key={dec} className={c.dec}><p className={c.decLabel}>{dec}s</p>{rs.map(row)}</div>)
                  : rRaces.length ? <div className={c.dec}>{rRaces.map(row)}</div> : <p className={c.decLabel}>这一时期没有记录</p>;
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
        )}

        {/* ?year: one race, nobody "best at it" — the podium is in the year band */}
        {!year && (
          <section className="band band-white">
            <div className="wrap">
              <Cube key={range ? rangeLabel(range) : "all"} data={range ? { ...cube, rows: cubeRows } : cube} fixed="circuit" fixedId={id} only={["driver", "team", "matrix"]} range={range}
                title={rangeTitle(range, "谁最擅长这里", "谁最擅长这里")}
                initial={{ driver: sp.driver, team: sp.team, view: (sp.view as any) || undefined }} />
            </div>
          </section>
        )}

        {/* 这里的故事 (summary · official map · photo) is all-time: overview only */}
        {!range && (content || wiki || entityOverview("circuit", id)) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><div><p className="kicker">History</p><h2 className="cn-h2">这里的故事</h2></div></div>
              <div className={c.storyRow}>
                <div>
                  <p className={s.bio}><Linked text={content?.summary || wiki?.extract || entityOverview("circuit", id) || ""} skip={id} /></p>
                  {!content?.summary && !wiki?.extract && <p className={s.src}><a href={overviewSource.url}>{overviewSource.label}</a></p>}
                  {map && (
                    <figure className={c.officialMap}>
                      <img src={map} alt={`${ci.name} 官方赛道图`} />
                      <figcaption>官方赛道图 · 弯角编号、计时段与超车区</figcaption>
                    </figure>
                  )}
                </div>
                {storyPhoto && <figure className={c.storyPhoto}><img src={storyPhoto} alt="" /><figcaption>{storyCaption}</figcaption></figure>}
              </div>
            </div>
          </section>
        )}

        {/* 这里发生过: its own band, cut to the range */}
        {moments.length > 0 && (
          <section className="band band-paper">
            <div className="wrap">
              <Moments items={moments} title={!range ? "这里发生过" : range.from === range.to ? `${range.from} 年这里发生过` : `${rangeLabel(range)} 这里发生过`} />
            </div>
          </section>
        )}
        </>)}
      </div>
    </ViewTransition>
  );
}
