import { teamLogoAtKnown } from "@/lib/teamLogo";
import { baseAsset } from "@/lib/baseAssets";
import { entityOverview, overviewSource } from "@/lib/overview";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import s from "@/components/entity/entity.module.css";
import t from "./team.module.css";
import { getConstructor, constructorSeasons, constructorLineage } from "@/lib/f1";
import { all } from "@/lib/db";
import { cubeFor } from "@/lib/cube";
import { teams as tContent } from "@/lib/content";
import { teamColorAt } from "@/lib/assets";
import { TEAM_ZH, ENGINE_ZH } from "@/lib/names";
import { summary, wikiMap, bilingualFast } from "@/lib/wiki";
import Cube from "@/components/cube/Cube";
import { zhName } from "@/lib/zh";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { teamTalk } from "@/lib/talk";
import { teamRecords } from "@/lib/records";
import { notes } from "@/lib/content";
import { LinkedMoments, LinkedAnecdotes } from "../../drivers/LinkedMoments";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import { Linked } from "@/lib/linkify";
import { constructorYears } from "@/lib/f1";
import { teamYear, parseYear, nearestYears } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import { teamRail } from "@/lib/railData";
import Team from "@/components/entity/Team";
import YearBand, { YearMissing } from "@/components/unit/YearBand";
import TeamYear from "@/components/unit/TeamYear";
import { teamYearTalk, teamPeriodTalk } from "@/components/unit/yearTalk";
import u from "@/components/unit/unit.module.css";
import ObjectHero from "@/components/entity/ObjectHero";
import o from "@/components/entity/objecthero.module.css";
import { teamHero, teamLogoUrl, hasLogo, parsePeriod } from "@/lib/hero";
import { rangeOf, inRange, rangeLabel, rangeTitle, rangeItems, nearestOutside } from "@/lib/range";
import YearSpan from "@/components/entity/YearSpan";

/** the 纪录簿 minus the hero's 传奇车手 / 出赛最多 tile (spec §0.8.4): the most-wins driver when the team has won, else the most-starts one */
const teamRecordsShown = (id: string) => {
  const rs = teamRecords(id);
  const won = rs.some((r) => r.label === "为车队赢得最多");
  return rs.filter((r) => r.label !== "为车队赢得最多" && (won || r.label !== "为车队出赛最多"));
};

export const dynamic = "force-dynamic";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const c = getConstructor(id);
  if (!c) notFound();
  const content = tContent()[id];
  // year layer (spec §4.2)
  const year = parseYear(sp.year);
  // 时期 (?from&to, from the rail's group headers): the third state — a period of this same object
  const period = year ? null : parsePeriod(sp);
  const lineage = constructorLineage(id);
  // a predecessor's period (红牛车系 · 捷豹时期): the sections under the hero read that outfit's own records (as the hero does)
  const pred = period && !constructorYears(id).some((y) => y >= period.from && y <= period.to)
    ? lineage.find((l: any) => l.id !== id && l.year_from <= period.from && (l.year_to ?? 9999) >= period.to) : null;
  const did: string = pred?.id ?? id;
  const { standings, chassis, drivers } = constructorSeasons(did);
  const cube = cubeFor({ team: did });
  const zh = content?.nameZh ?? TEAM_ZH[id] ?? zhName.team(id);
  const tName = (tid: string, fallback?: string) => zhName.team(tid) ?? TEAM_ZH[tid] ?? fallback ?? tid;
  // the Chinese article only (never the English extract); never waits on Wikipedia (lib/wiki bilingualFast)
  const wiki = content ? null : (await bilingualFast(wikiMap().constructors[id])).zh;

  // drivers' own championship result per year (to show how each driver did in this team's car)
  const dStand = all<any>(
    `select sds.year, sds.driver_id, sds.position_text pos, sds.points, sds.championship_won champ from season_driver_standing sds
     where sds.driver_id in (select driver_id from season_entrant_driver where constructor_id = ?)`, did);
  const dsMap = new Map(dStand.map((x) => [`${x.year}|${x.driver_id}`, x]));
  const winsBy = new Map<string, number>();
  for (const f of cube.rows) if (f.p === 1) winsBy.set(`${f.y}|${f.d}`, (winsBy.get(`${f.y}|${f.d}`) ?? 0) + 1);

  const years = [...new Set([...chassis.map((x: any) => x.year), ...drivers.map((x: any) => x.year)])].sort((a, b) => b - a);
  const decMap = new Map<number, number[]>();
  for (const y of years) { const d = Math.floor(y / 10) * 10; decMap.set(d, [...(decMap.get(d) ?? []), y]); }
  const decades = [...decMap.entries()];
  const standingMap: Record<number, string> = Object.fromEntries(standings.map((x: any) => [x.year, x.posText]));
  const titleYears = standings.filter((x: any) => x.champ).map((x: any) => x.year);
  const roundsIn = new Map(all<any>("select r.year, max(r.round) n from race r where exists (select 1 from race_result rr where rr.race_id = r.id) group by r.year").map((r) => [r.year, r.n]));
  const fullSeason = (y: number, txt: string) => txt === `1-${roundsIn.get(y)}`;
  // spec §0.7: every section under the hero reads only `range` (null = 总览, the only state with all-time content)
  const range = rangeOf(year, period);
  const ys = constructorYears(did);
  // a predecessor's period (红牛车系 · 捷豹时期) is this outfit too: it "raced" then under its earlier name
  const exists = !range || ys.some((y) => inRange(y, range))
    || lineage.some((l: any) => l.id !== id && constructorYears(l.id).some((y: number) => inRange(y, range)));
  const ty = year && ys.includes(year) ? teamYear(id, year) : null;
  const yTalk = ty && year ? teamYearTalk(id, year, ty) : null;
  const near = year ? nearestYears(ys, year) : null;
  const yHref = (y: number) => `/teams/${id}?year=${y}`;
  const pTalk = period ? teamPeriodTalk(id, period) : null;
  const cubeRows = range ? cube.rows.filter((f) => inRange(f.y, range)) : cube.rows;
  // rows are car entries (two per race): the title counts races, matching the hero's 「N 场」
  const raceCount = (rows: typeof cube.rows) => new Set(rows.map((f) => f.r)).size;
  const name = zh ?? c.name;
  // same outfit under another name that year (Brawn 2012 → Mercedes)
  const heir = year && !ty ? lineage.find((l: any) => l.id !== id && year >= l.year_from && year <= (l.year_to ?? 9999)) : null;
  const rangeYears = range ? years.filter((y) => inRange(y, range)) : years;
  // one season of the line-up table (overview decades and a period's list share it)
  const row = (y: number) => {
    const cars = chassis.filter((x: any) => x.year === y);
    const ds = drivers.filter((x: any) => x.year === y);
    return (
      <div key={y} className={`${t.yRow} ${y === year ? t.yOn : ""}`}>
        <div className={t.yHead}>
          <EntityLink kind="year" id={String(y)} href={yHref(y)} className={t.yYear}>
            <span className="num">{y}</span>
            <em>{standingMap[y] ? `P${standingMap[y]}` : ""}</em>
          </EntityLink>
          {titleYears.includes(y) && <Laurel tone="gold" size={24} top={<span className={t.lt}>车队冠军</span>} title={`${y} 车队冠军`} />}
        </div>
        <div className={t.yCars}>
          {cars.map((ch: any) => (
            <EntityLink key={ch.id} kind="car" id={ch.id} className={t.yCar}>
              <b className="lat">{ch.name}</b>
              <span>{ENGINE_ZH[ch.engine] ?? ch.engineName} 引擎</span>
            </EntityLink>
          ))}
        </div>
        <div className={t.yDrivers}>
          {ds.map((dr: any) => {
            const st = dsMap.get(`${y}|${dr.driver}`);
            const w = winsBy.get(`${y}|${dr.driver}`);
            return (
              <EntityLink key={dr.driver} kind="driver" id={dr.driver} href={`/drivers/${dr.driver}?team=${id}&from=${y}&to=${y}`} className={`${t.yDriver} ${st?.champ ? t.yChamp : ""}`}>
                <Person plain id={dr.driver} year={y} color={teamColorAt(id, y, "#47464c")} name={zhName.driver(dr.driver) ?? dr.name} size={26}
                  sub={<>{st ? `P${st.pos}` : "—"}{w ? ` · ${w} 胜` : ""}{dr.rounds_text && !fullSeason(y, dr.rounds_text) ? ` · 第 ${dr.rounds_text} 站` : ""}</>} />
                {st?.champ ? <Laurel tone="gold" size={20} top={<span className={t.lt}>车手冠军</span>} title={`${y} 车手世界冠军`} /> : null}
              </EntityLink>
            );
          })}
        </div>
      </div>
    );
  };
  // the team hero's picture = its logo valid in the context year (user rule: no car here — the car is the 赛车 tile)
  const heroYear = ty && year ? year : null;
  // overview = all moments / anecdotes; ?year / ?from&to = only the range's (user rule)
  const moments = rangeItems(content?.highlights ?? [], range);
  const anecdotes = rangeItems(content?.anecdotes ?? [], range);
  const heroModel = (await teamHero(id, year, period))!;
  // colour vs mono is decided by contrast against what the logo sits on: the right half of the team-colour hero
  const heroBg = (() => {
    const n = parseInt(/^#?([0-9a-f]{6})/i.exec(heroModel.color ?? "")?.[1] ?? "15151e", 16);
    return [16, 8, 0].map((sh) => Math.round(((n >> sh) & 255) * 0.7).toString(16).padStart(2, "0")).join("");
  })();
  const logo = hasLogo(id) ? teamLogoUrl(id, heroYear ?? period?.to, 900, { bg: heroBg }) : null;
  // only F1's 96 px mark known (no reviewed / high-res file yet): shown at most 2× its size, never stretched blurry to 420 px
  const logoSmall = !!logo && !baseAsset("team", id, heroYear ?? period?.to ?? null) && !!teamLogoAtKnown(id, heroYear ?? period?.to ?? null, false, 900).small;

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <ObjectHero model={heroModel} visual={
          <span className="img-slot" data-img-kind="team-logo" data-img-id={id} data-img-year={heroYear ?? ""} data-img-caption={logo?.caption ?? ""} style={{ display: "contents" }}>
            {logo ? <img className={`${o.bigLogo} ${logoSmall ? o.bigLogoSmall : ""}`} src={logo.url} alt={name} /> : <span className={o.bigName}>{c.name}</span>}
            {logo?.caption && <span className="img-cap">{logo.caption}</span>}
          </span>
        } />

        <RailScope {...teamRail(id, year)} />

        {year && (
          <YearBand year={year} label="赛季" skip={id}
            sub={ty ? `${name} 的 ${year} 赛季：阵容与每位车手的成绩` : undefined}>
            {ty ? <TeamYear id={id} year={year} t={ty} /> : (
              <YearMissing text={<>{name} <YearSpan from={year} /> 年未参赛 · 出赛年份 <YearSpan from={ys[0]} to={ys.at(-1)} />{heir ? <>；这一年这支车队以 <Team id={heir.id} name={tName(heir.id, heir.name)} size={20} href={`/teams/${heir.id}?year=${year}`} /> 的名号参赛</> : null}</>} prev={near!.prev} next={near!.next} hrefFor={yHref}>
                {lineage.length > 1 && (
                  <div className={u.lineage}>
                    <b>同一支车队的不同名号</b>
                    {lineage.filter((l: any) => l.id !== id).map((l: any, i: number) => (
                      <span key={l.id + i}>
                        <Team id={l.id} name={tName(l.id, l.name)} size={22} href={`/teams/${l.id}?year=${year}`} />
                        <em>{l.year_from}–{l.year_to ?? ""}</em>
                      </span>
                    ))}
                  </div>
                )}
              </YearMissing>
            )}
          </YearBand>
        )}

        {/* a period it never raced in (hand-typed ?from&to): hero + this band, nothing else */}
        {period && !exists && (
          <YearBand year={period.from} to={period.to} label="时期" skip={id}>
            <YearMissing text={<>{name} <YearSpan from={period.from} to={period.to} /> 未参赛 · 出赛年份 <YearSpan from={ys[0]} to={ys.at(-1)} /></>} {...nearestOutside(ys, period)} hrefFor={yHref} />
          </YearBand>
        )}

        {exists && (<>
        {year ? (yTalk && (yTalk.notes.length + yTalk.auto.length > 0)
          ? <TalkingPoints auto={yTalk.auto} notes={yTalk.notes} title={`${year} 年解说要点`} subject={`${name} · ${year}`} skip={id} year={year} />
          : null)
          // a period's points come from the period only; the 纪录簿 is all-time, so overview only
          : period && pTalk ? (pTalk.notes.length + pTalk.auto.length > 0
            ? <TalkingPoints auto={pTalk.auto} notes={pTalk.notes} title={`${heroModel.crumbs.at(-1)?.label} 解说要点`} subject={`${name} · ${rangeLabel(period)}`} skip={id} />
            : null)
          : <TalkingPoints auto={teamTalk(id)} notes={notes.team(id)} subject={name} records={teamRecordsShown(id)} skip={id} />}

        {/* ?year: the year band's line-up cards already are that season, so no line-up table */}
        {!year && (
        <section className="band band-paper">
          <div className="wrap">
            <div className="sec-head">
              <div><p className="kicker">Line-up</p><h2 className="cn-h2">{rangeTitle(range, "历年阵容与赛车", "阵容与赛车")}</h2></div>
            </div>
            <div className={t.years}>
              {!range ? decades.map(([dec, ys]) => {
                const rows = ys.map(row);
                return <div key={dec}><p className={t.dec}>{dec}s</p>{rows}</div>;
              }).reduce((acc: any[], el: any, i: number) => {
                if (i < 2) acc.push(el); else { if (i === 2) acc.push([]); acc[acc.length - 1].push(el); }
                return acc;
              }, []).map((el: any, i: number) => Array.isArray(el) ? (
                <details key="older" open={!!year && decades.slice(2).some(([, dys]) => dys.includes(year))}><summary className={t.dec}>更早 <em>{decades.slice(2).reduce((a, d) => a + d[1].length, 0)} 个赛季 · 展开</em></summary>{el}</details>
              ) : el)
                // 时期: only its seasons — a flat list up to 15, else decade labels, all open (no 「更早」 fold)
                : rangeYears.length <= 15 ? rangeYears.map(row)
                : decades.filter(([, dys]) => dys.some((y) => inRange(y, range))).map(([dec, dys]) => <div key={dec}><p className={t.dec}>{dec}s</p>{dys.filter((y) => inRange(y, range)).map(row)}</div>)}
              {range && !rangeYears.length && <p className={t.dec}>这一时期没有记录</p>}
            </div>
          </div>
        </section>
        )}

        <section className="band band-white">
          <div className="wrap">
            <Cube key={range ? rangeLabel(range) : "all"} data={range ? { ...cube, rows: cubeRows } : cube} fixed="team" fixedId={id} standings={standingMap} defaultView="driver" range={range}
              title={year ? `${year} 赛季 ${raceCount(cubeRows)} 站出赛` : range ? `${rangeLabel(range)} ${raceCount(cubeRows)} 站出赛` : `全部 ${raceCount(cube.rows)} 站出赛`}
              initial={{ driver: sp.driver, circuit: sp.circuit, view: (sp.view as any) || undefined }} />
          </div>
        </section>

        {/* 车队的故事 is all-time: overview only (a range's titles / starts are in the hero's numbers) */}
        {!range && (content || wiki || entityOverview("team", id)) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><div><p className="kicker">History</p><h2 className="cn-h2">车队的故事</h2></div></div>
              {/* no 档案 box: base · years · starts · latest car · titles are the hero and the line-up (spec §0.8.4) */}
              <p className={s.bio}><Linked text={content?.bio || wiki?.extract || entityOverview("team", id) || ""} skip={id} /></p>
                  {!content?.bio && !wiki?.extract && <p className={s.src}><a href={overviewSource.url}>{overviewSource.label}</a></p>}
              {!content && wiki?.extract && <p className={s.src} style={{ marginTop: 12 }}><a href={wiki.content_urls?.desktop.page}>维基百科 · {wiki.title}</a></p>}
            </div>
          </section>
        )}

        {/* 高光 / 趣事: their own band, cut to the range */}
        {(moments.length > 0 || anecdotes.length > 0) && (
          <section className="band band-paper">
            <div className="wrap">
              {moments.length > 0 && <LinkedMoments items={moments} skip={id} title={!range ? "高光时刻" : range.from === range.to ? `${range.from} 年高光时刻` : `${rangeLabel(range)} 高光时刻`} />}
              {anecdotes.length > 0 && <div style={{ marginTop: moments.length ? 64 : 0 }}><LinkedAnecdotes items={anecdotes} skip={id} title={range ? `${rangeLabel(range)} · 你可能不知道` : "你可能不知道"} /></div>}
            </div>
          </section>
        )}
        </>)}
      </div>
    </ViewTransition>
  );
}
