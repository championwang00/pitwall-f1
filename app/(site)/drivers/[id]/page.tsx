import { entityOverview, overviewSource } from "@/lib/overview";
import Link from "next/link";
import { isLight } from "@/lib/color";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import s from "@/components/entity/entity.module.css";
import k from "./driver.module.css";
import { getDriver, driverSeasons, familyOf, teammates } from "@/lib/f1";
import { cubeFor } from "@/lib/cube";
import { drivers as dContent } from "@/lib/content";
import { driverNumberArt, teamColorAt, DRIVERS_2026 } from "@/lib/assets";
import { bilingualFast, wikiMap } from "@/lib/wiki";
import Cube from "@/components/cube/Cube";
import { LinkedMoments, LinkedAnecdotes } from "../LinkedMoments";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import { Linked } from "@/lib/linkify";
import { zhName } from "@/lib/zh";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { driverTalk } from "@/lib/talk";
import { driverRecords } from "@/lib/records";
import { notes } from "@/lib/content";
import { driverYears } from "@/lib/f1";
import { driverYear, parseYear, nearestYears } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import { driverRail } from "@/lib/railData";
import Team from "@/components/entity/Team";
import YearBand, { YearMissing } from "@/components/unit/YearBand";
import DriverYear from "@/components/unit/DriverYear";
import { driverYearTalk, driverPeriodTalk } from "@/components/unit/yearTalk";
import u from "@/components/unit/unit.module.css";
import ObjectHero from "@/components/entity/ObjectHero";
import o from "@/components/entity/objecthero.module.css";
import { driverHero, driverPicture, parsePeriod } from "@/lib/hero";
import { rangeOf, inRange, rangeLabel, rangeTitle, rangeItems, nearestOutside } from "@/lib/range";
import { periodFace, periodFaceKnown } from "@/lib/periodFace";
import YearSpan from "@/components/entity/YearSpan";

export const dynamic = "force-dynamic";

const FAMILY_ZH: Record<string, string> = {
  PARENT: "父亲 / 母亲", CHILD: "子女", SIBLING: "兄弟姐妹", HALF_SIBLING: "同父异母 / 同母异父", GRANDPARENT: "祖辈", GRANDCHILD: "孙辈",
  PARENTS_SIBLING: "叔伯舅", SIBLINGS_CHILD: "侄甥", PARENTS_SIBLINGS_CHILD: "堂表亲", GRANDPARENTS_SIBLING: "叔祖", SIBLINGS_GRANDCHILD: "侄孙",
  CHILD_IN_LAW: "女婿 / 儿媳", PARENT_IN_LAW: "岳父 / 公公", SIBLING_IN_LAW: "姻亲兄弟", SIBLINGS_CHILD_IN_LAW: "侄甥姻亲",
};

export default async function DriverPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const d = getDriver(id);
  if (!d) notFound();
  const c = dContent()[id];
  const { standings, entries } = driverSeasons(id);
  const cube = cubeFor({ driver: id });
  const fam = familyOf(id);
  const mates = teammates(id);
  const wiki = c ? null : await bilingualFast(wikiMap().drivers[id]);
  const numberArt = driverNumberArt(id);
  const zh = c?.nameZh ?? DRIVERS_2026[id]?.nameZh ?? zhName.driver(id);
  const tName = (team: string, fallback?: string) => zhName.team(team) ?? fallback ?? team;
  const dName = (did: string, fallback: string) => zhName.driver(did) ?? fallback;
  const years = entries.map((e: any) => e.year);
  const y0 = years[0], y1 = years.at(-1);

  // per-year career cells
  const byYear = new Map<number, { teams: any[]; st: any }>();
  for (const e of entries) {
    const cur = byYear.get(e.year) ?? { teams: [], st: standings.find((x: any) => x.year === e.year) };
    cur.teams.push(e);
    byYear.set(e.year, cur);
  }
  const standingMap: Record<number, string> = Object.fromEntries(standings.map((x: any) => [x.year, x.posText]));
  const mateByYear = new Map<number, any[]>();
  for (const m of mates) mateByYear.set(m.year, [...(mateByYear.get(m.year) ?? []), m]);
  // year layer (spec §4.1): ?year=Y inserts the 「Y 赛季」 band; the rail dims seasons he didn't race
  const year = parseYear(sp.year);
  // 时期 (?from&to, from the rail's group headers): the third state — a period of this same object
  const period = year ? null : parsePeriod(sp);
  // spec §0.7: every section under the hero reads only `range` (null = 总览, the only state with all-time content)
  const range = rangeOf(year, period);
  const ys = driverYears(id);
  const exists = !range || ys.some((y) => inRange(y, range));
  const dy = year && ys.includes(year) ? driverYear(id, year) : null;
  const yTalk = dy && year ? driverYearTalk(id, year, dy) : null;
  const near = year ? nearestYears(ys, year) : null;
  const yHref = (y: number) => `/drivers/${id}?year=${y}`;
  const pTalk = period ? driverPeriodTalk(id, period) : null;
  const cubeRows = range ? cube.rows.filter((f) => inRange(f.y, range)) : cube.rows;
  // a period's team-mates: each once, with the seasons inside the range (2008, 2009 / 2010–2012)
  const pMates = period ? [...new Map(mates.filter((m: any) => inRange(m.year, period)).map((m: any) => [m.id, m])).values()] : [];
  const mateYears = (mid: string, r: typeof range) => mates.filter((x: any) => x.id === mid && inRange(x.year, r)).map((x: any) => x.year).join(", ").replace(/(\d{4})(, \d{4})+, (\d{4})/, "$1–$3");
  // picture rule (lib/periodFace.ts driverHeroImage): ?year → that season's photo or the captioned placeholder;
  // no year → current bust / last season's photo / captioned reference photo
  // overview = all moments / anecdotes; ?year / ?from&to = only the range's (user rule)
  const moments = rangeItems(c?.highlights ?? [], range);
  const anecdotes = rangeItems(c?.anecdotes ?? [], range);
  // a period (?from&to) is that stint, so its picture must come from inside it (user: 迈凯伦时期要用迈凯伦时代的单人照):
  // the latest season of the range that already has a period photo; otherwise the range's last season (lookup starts,
  // captioned placeholder meanwhile) — never the current, other-team portrait
  const periodYear = period ? (() => {
    const inside = ys.filter((y: number) => inRange(y, period)).sort((a: number, b: number) => b - a);
    inside.forEach((y: number) => { if (periodFaceKnown(id, y) === undefined) periodFace(id, y).catch(() => {}); });
    return inside.find((y: number) => !!periodFaceKnown(id, y)) ?? inside[0] ?? period.to;
  })() : null;
  const hero = await driverPicture(id, dy ? year : periodYear);

  const heroModel = (await driverHero(id, year, period))!;

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <ObjectHero model={heroModel} visual={
          <>
            {/* the current race-number art belongs to the current season only — not to a past year or a past stint */}
            {numberArt && !period && (!dy || year === 2026) && <img className={o.numberArt} src={numberArt} alt="" />}
            <ViewTransition name={`driver-${id}`} share="morph" default="none">
              <img className={hero.kind === "cut" ? o.cut : o.periodPhoto} src={hero.url} alt={hero.caption ?? d.name} title={hero.caption ?? undefined}
                data-img-kind="driver" data-img-id={id} data-img-source-year={hero.sourceYear ?? ""} data-img-year={dy && year ? year : periodYear ?? ""} data-img-status={hero.exact ? "exact" : hero.kind === "placeholder" ? "placeholder" : "representative"} data-img-caption={hero.caption ?? ""} />
            </ViewTransition>
            {hero.caption && <span className="img-cap" style={{ bottom: 48 }}>{hero.caption}</span>}
          </>
        } />

        <RailScope {...driverRail(id, year)} />

        {year && (
          <YearBand year={year} label="赛季" skip={id}
            sub={dy ? `${zh ?? d.name} 的 ${year} 赛季：队友对比` : undefined}>
            {dy ? <DriverYear id={id} year={year} d={dy} name={zh ?? d.name} /> : (
              <YearMissing text={<><YearSpan from={year} /> 年未参赛 · 生涯 <YearSpan from={y0} to={y1} /></>} prev={near!.prev} next={near!.next} hrefFor={yHref} />
            )}
          </YearBand>
        )}
        {/* a period he never raced in (hand-typed ?from&to): hero + this band, nothing else */}
        {period && !exists && (
          <YearBand year={period.from} to={period.to} label="时期" skip={id}>
            <YearMissing text={<>{zh ?? d.name} <YearSpan from={period.from} to={period.to} /> 未参赛 · 出赛年份 <YearSpan from={ys[0]} to={ys.at(-1)} /></>} {...nearestOutside(ys, period)} hrefFor={yHref} />
          </YearBand>
        )}

        {exists && (<>
        {year ? (yTalk && (yTalk.notes.length + yTalk.auto.length > 0)
          ? <TalkingPoints auto={yTalk.auto} notes={yTalk.notes} title={`${year} 年解说要点`} subject={`${zh ?? d.name} · ${year}`} skip={id} year={year} />
          : null)
          // a period's points come from the period only; the 纪录簿 is all-time, so overview only
          : period && pTalk ? (pTalk.notes.length + pTalk.auto.length > 0
            ? <TalkingPoints auto={pTalk.auto} notes={pTalk.notes} title={`${heroModel.crumbs.at(-1)?.label} 解说要点`} subject={`${zh ?? d.name} · ${rangeLabel(period)}`} skip={id} />
            : null)
          : <TalkingPoints auto={driverTalk(id)} notes={notes.driver(id)} subject={zh ?? d.name} records={driverRecords(id)} skip={id} />}

        {/* ?year: the year band already is that season and the rail changes years, so no career grid */}
        {!year && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head">
                <div><p className="kicker">Career</p><h2 className="cn-h2">{rangeTitle(range, "每一个赛季", "的每一个赛季")}</h2></div>
              </div>
              <div className={s.career}>
                <div className={s.cGrid}>
                  {[...byYear.entries()].filter(([y]) => inRange(y, range)).map(([y, v]) => {
                    const st = v.st;
                    const t = v.teams[0];
                    const ms = mateByYear.get(y) ?? [];
                    const tc = teamColorAt(t.team, y, "#3a3a44"), light = isLight(tc);
                    return (
                      <div key={y} className={`${k.cell} lift on-color ${light ? "on-light" : ""} ${y === year ? u.cur : ""}`} style={{ ["--c" as any]: tc }}
                        title={ms.length ? `队友：${ms.map((m) => dName(m.id, m.name)).join("、")}` : undefined}>
                        <Link href={yHref(y)} className="card-link" aria-label={`${y} 赛季`} tabIndex={-1} scroll={false} />
                        <EntityLink kind="year" id={String(y)} href={range ? yHref(y) : `/seasons/${y}?driver=${id}`} className={k.cy}>{y}</EntityLink>
                        <span className={k.cpos}>{st ? <>P{st.posText}</> : "—"}{st?.champ ? <Laurel tone={light ? "ink" : "white"} onColor size={20} top={<span className={k.lt}>冠军</span>} title={`${y} 世界冠军`} /> : null}</span>
                        <span className={`${k.cteams} over-link`}>{v.teams.map((x: any) => <Team key={x.team} id={x.team} name={tName(x.team, x.teamName)} size={14} onDark={!light} year={y} />)}</span>
                        <span className={`${k.ccar} over-link`}>{v.teams.filter((x: any) => x.chassis).map((x: any) => (
                          <EntityLink key={x.team} kind="car" id={x.chassisIds?.split("|")[0]}>{x.chassis}</EntityLink>
                        ))}</span>
                        <span className={k.cpts}>{st ? `${st.points} 分` : ""}</span>
                      </div>
                    );
                  })}
                </div>
                {range && ![...byYear.keys()].some((y) => inRange(y, range)) && <p className={s.src}>这一时期没有记录</p>}
              </div>
              {/* 时期: its own team-mates (the overview lists them all beside 人物; ?year has 队友对比 in the band) — only when
                  there are more than the hero's 队友 tile shows (3), else it repeats the tile (spec §0.8.3) */}
              {period && pMates.length > 3 && (
                <div style={{ marginTop: 72 }}>
                  <div className="sec-head">
                    <div><p className="kicker">Team-mates</p><h2 className="cn-h2">{rangeLabel(period)} 的队友</h2></div>
                  </div>
                  <div className={k.people}>
                    {pMates.map((m: any) => <Person key={m.id} id={m.id} name={dName(m.id, m.name)} size={32} sub={mateYears(m.id, period)} />)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="band band-white">
          <div className="wrap">
            <Cube key={range ? rangeLabel(range) : "all"} data={range ? { ...cube, rows: cubeRows } : cube} fixed="driver" fixedId={id} standings={standingMap} range={range}
              title={year ? `${year} 赛季 ${cubeRows.length} 场比赛` : range ? `${rangeLabel(range)} ${cubeRows.length} 场比赛` : `全部 ${cube.rows.length} 场比赛`}
              initial={{ team: sp.team, circuit: sp.circuit, view: (sp.view as any) || undefined }} />
          </div>
        </section>

        {/* 人物 · F1 家族 · 历任队友 are all-time: overview only */}
        {!range && (c?.bio || wiki?.zh || wiki?.en || entityOverview("driver", id)) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className={s.twoCol}>
                <div>
                  <div className="sec-head"><div><p className="kicker">Biography</p><h2 className="cn-h2">人物</h2></div></div>
                  <p className={s.bio}><Linked text={c?.bio || wiki?.zh?.extract || entityOverview("driver", id) || ""} skip={id} /></p>
                  {!c?.bio && !wiki?.zh?.extract && <p className={s.src}><a href={overviewSource.url}>{overviewSource.label}</a></p>}
                  {/* Chinese only (user: 咋还有英文呢？翻译成中文): zh Wikipedia, else the Chinese F1DB overview — never the English extract */}
                  {!c && wiki?.zh?.extract && (
                    <p className={s.src} style={{ marginTop: 12 }}>
                      <a href={wiki.zh.content_urls?.desktop.page} target="_blank" rel="noreferrer">维基百科 · {wiki.zh.title}</a>
                    </p>
                  )}
                </div>
                <aside className={s.side}>
                  {fam.length > 0 && (
                    <div className={s.sideBox}>
                      <h3>F1 家族</h3>
                      <div className={k.people}>
                        {fam.map((f: any) => <Person key={f.id + f.type} id={f.id} name={dName(f.id, f.name)} size={32} sub={FAMILY_ZH[f.type] ?? f.type} />)}
                      </div>
                    </div>
                  )}
                  <div className={s.sideBox}>
                    <h3>历任队友</h3>
                    <div className={k.people}>
                      {[...new Map(mates.map((m: any) => [m.id, m])).values()].slice(-10).reverse().map((m: any) => (
                        <Person key={m.id} id={m.id} name={dName(m.id, m.name)} size={32} sub={mateYears(m.id, null)} />
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        )}

        {/* 高光 / 趣事: their own band, cut to the range */}
        {(moments.length > 0 || anecdotes.length > 0) && (
          <section className="band band-paper">
            <div className="wrap">
              {moments.length > 0 && <LinkedMoments items={moments} skip={id} title={!range ? "高光时刻" : range.from === range.to ? `${range.from} 年高光时刻` : `${rangeLabel(range)} 高光时刻`} />}
              {anecdotes.length > 0 && <div style={{ marginTop: moments.length ? 72 : 0 }}><LinkedAnecdotes items={anecdotes} skip={id} title={range ? `${rangeLabel(range)} · 你可能不知道` : "你可能不知道"} /></div>}
            </div>
          </section>
        )}
        </>)}
      </div>
    </ViewTransition>
  );
}
