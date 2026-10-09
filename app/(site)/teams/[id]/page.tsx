import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import s from "@/components/entity/entity.module.css";
import t from "./team.module.css";
import { getConstructor, constructorSeasons, constructorLineage, getCountry } from "@/lib/f1";
import { all } from "@/lib/db";
import { cubeFor } from "@/lib/cube";
import { teams as tContent } from "@/lib/content";
import { teamColor, teamLogo, teamCar, flag, TEAMS_2026 } from "@/lib/assets";
import { TEAM_ZH, ENGINE_ZH, NAT_ZH } from "@/lib/names";
import { summary, wikiMap, wikiThumb } from "@/lib/wiki";
import { teamImageFast } from "@/lib/carImage";
import Cube from "@/components/cube/Cube";
import { zhName } from "@/lib/zh";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { teamTalk } from "@/lib/talk";
import { teamRecords } from "@/lib/records";
import { notes } from "@/lib/content";
import { StatRow } from "@/components/entity/Moments";
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
import EraSpan from "@/components/unit/EraSpan";
import YearBand, { YearMissing } from "@/components/unit/YearBand";
import TeamYear from "@/components/unit/TeamYear";
import { teamYearTalk } from "@/components/unit/yearTalk";
import u from "@/components/unit/unit.module.css";
import Icon from "@/components/ui/Icon";
import Breadcrumb, { subjectCrumbs } from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const c = getConstructor(id);
  if (!c) notFound();
  const content = tContent()[id];
  const { standings, chassis, drivers } = constructorSeasons(id);
  const lineage = constructorLineage(id);
  const cube = cubeFor({ team: id });
  const color = teamColor(id, "#47464c");
  const current = !!TEAMS_2026[id as keyof typeof TEAMS_2026];
  const zh = content?.nameZh ?? TEAM_ZH[id] ?? zhName.team(id);
  const tName = (tid: string, fallback?: string) => zhName.team(tid) ?? TEAM_ZH[tid] ?? fallback ?? tid;
  const country = getCountry(c.country_id);
  const wiki = content ? null : await summary(wikiMap().constructors[id]);

  // drivers' own championship result per year (to show how each driver did in this team's car)
  const dStand = all<any>(
    `select sds.year, sds.driver_id, sds.position_text pos, sds.points, sds.championship_won champ from season_driver_standing sds
     where sds.driver_id in (select driver_id from season_entrant_driver where constructor_id = ?)`, id);
  const dsMap = new Map(dStand.map((x) => [`${x.year}|${x.driver_id}`, x]));
  const winsBy = new Map<string, number>();
  for (const f of cube.rows) if (f.p === 1) winsBy.set(`${f.y}|${f.d}`, (winsBy.get(`${f.y}|${f.d}`) ?? 0) + 1);
  const driverTitles = all<any>(
    // a title counts for the team the champion drove for in his last race of that season
    `select count(*) n from season_driver_standing sds where sds.championship_won = 1 and (
       select rr.constructor_id from race_result rr join race r on r.id = rr.race_id
       where r.year = sds.year and rr.driver_id = sds.driver_id order by r.round desc limit 1) = ?`, id)[0]?.n ?? 0;

  const years = [...new Set([...chassis.map((x: any) => x.year), ...drivers.map((x: any) => x.year)])].sort((a, b) => b - a);
  const y0 = years.at(-1), y1 = years[0];
  const decMap = new Map<number, number[]>();
  for (const y of years) { const d = Math.floor(y / 10) * 10; decMap.set(d, [...(decMap.get(d) ?? []), y]); }
  const decades = [...decMap.entries()];
  const standingMap: Record<number, string> = Object.fromEntries(standings.map((x: any) => [x.year, x.posText]));
  const titleYears = standings.filter((x: any) => x.champ).map((x: any) => x.year);
  const roundsIn = new Map(all<any>("select r.year, max(r.round) n from race r where exists (select 1 from race_result rr where rr.race_id = r.id) group by r.year").map((r) => [r.year, r.n]));
  const fullSeason = (y: number, txt: string) => txt === `1-${roundsIn.get(y)}`;
  // honours as laurels in the hero; the stat row keeps the rest (and any zero honours as plain numbers)
  const honours = [
    c.total_championship_wins > 0 && <Laurel key="cc" tone="gold" size={52} top={`${c.total_championship_wins} 届`} bottom="车队冠军" />,
    driverTitles > 0 && <Laurel key="dc" tone="silver" size={52} top={`${driverTitles} 届`} bottom="车手冠军" />,
    c.total_race_wins > 0 && <Laurel key="w" tone={c.total_championship_wins > 0 || driverTitles > 0 ? "white" : "gold"} size={52} top={`${c.total_race_wins} 场`} bottom="分站冠军" />,
  ].filter(Boolean);
  const statItems = [
    { k: "Constructors' Titles", v: c.total_championship_wins, laurel: c.total_championship_wins > 0 },
    { k: "Drivers' Titles", v: driverTitles, laurel: driverTitles > 0 },
    { k: "Wins", v: c.total_race_wins, laurel: c.total_race_wins > 0 },
    { k: "1-2 Finishes", v: c.total_1_and_2_finishes },
    { k: "Poles", v: c.total_pole_positions },
    { k: "Podiums", v: c.total_podiums },
    { k: "Starts", v: c.total_race_starts },
  ].filter((x) => !x.laurel).map(({ k, v }) => ({ k, v }));
  // year layer (spec §4.2)
  const year = parseYear(sp.year);
  const ys = constructorYears(id);
  const ty = year && ys.includes(year) ? teamYear(id, year) : null;
  const yTalk = ty && year ? teamYearTalk(id, year, ty) : null;
  const near = year ? nearestYears(ys, year) : null;
  const yHref = (y: number) => `/teams/${id}?year=${y}`;
  const name = zh ?? c.name;
  // same outfit under another name that year (Brawn 2012 → Mercedes)
  const heir = year && !ty ? lineage.find((l: any) => l.id !== id && year >= l.year_from && year <= (l.year_to ?? 9999)) : null;
  const yLink = (y: number | undefined) => y ? <EntityLink kind="year" id={String(y)} className={t.yl}>{y}</EntityLink> : null;

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        {/* formula1.com team hero: the team colour is the surface (dark base + the official DRS-D halftone in the bright colour) */}
        <section className={`${s.hero} ${t.hero} f1-surface team-drs`} data-surface style={{ ["--surface" as any]: color, ["--c" as any]: color }}>
          <div className={s.heroIn}>
            <div className={s.heroText}>
              <div>
                <Breadcrumb flush items={subjectCrumbs("车队", "/teams", { label: name, href: `/teams/${id}`, kind: "team", id }, year)} />
                <div className={t.logoRow}>
                  {current && <span className={t.logo}><img src={teamLogo(id, 160) ?? ""} alt="" /></span>}
                  <h1 className={s.last} style={{ fontSize: c.name.length > 10 ? "clamp(34px, 4.2vw, 64px)" : undefined }}>{c.name}</h1>
                </div>
                {zh && <p className="cx">{zh}</p>}
                <p className="meta-line">
                  {flag(c.country_id) && <img src={flag(c.country_id)!} alt="" />}
                  {NAT_ZH[c.country_id] ?? country?.name}{content?.base ? ` · ${content.base}` : ""}{content?.founded ? ` · ${content.founded} 年起参赛` : ""}
                </p>
                {content?.tagline && <p className={s.tagline}><Linked text={content.tagline} skip={id} /></p>}
                {lineage.length > 1 && (
                  <p className={t.lineage}>
                    {lineage.map((l: any, i: number) => (
                      <span key={l.id + i}>
                        {i > 0 && <Icon name="chevron-right" size={16} className={t.arrow} />}
                        {/* each name in the lineage stands alone → logo chip (white logo on the team surface) */}
                        <Team id={l.id} name={tName(l.id, l.name)} size={18} onDark plain={l.id === id} />
                        <em>{yLink(l.year_from)}–{l.year_to ? yLink(l.year_to) : ""}</em>
                      </span>
                    ))}
                  </p>
                )}
                <EraSpan years={ys} />
                {ty && year && (
                  <p className={u.yLine}>
                    <span className={u.yBadge}>{year}</span>
                    {ty.line?.champ ? "车队冠军" : ty.line?.pos ? <>车队 P<b className="num">{ty.line.pos}</b></> : "未计排名"}
                    <span>·</span>{ty.cars.slice(0, 2).map((ch: any) => <Link key={ch.id} href={`/cars/${ch.id}`}>{ch.name}</Link>)}
                    <span>·</span>{[...new Set(ty.cars.map((ch: any) => ENGINE_ZH[ch.engine] ?? ch.engineName))].join(" / ")} 引擎
                  </p>
                )}
              </div>
              <div>
                {honours.length > 0 && <div className={t.honours}>{honours}</div>}
                <StatRow items={statItems} />
              </div>
            </div>
            <div className={t.carWrap}>
              {current ? (
                <ViewTransition name={`car-${id}`} share="morph" default="none">
                  <img className={t.car} src={teamCar(id, 1400) ?? ""} alt="" />
                </ViewTransition>
              ) : (
                <img className={s.photo} src={await teamImageFast(id)} alt="" />
              )}
            </div>
          </div>
        </section>

        <RailScope {...teamRail(id, year)} />

        {year && (
          <YearBand year={year} label="赛季" clearHref={`/teams/${id}`}
            sub={ty ? `${name} 的 ${year} 赛季：成绩、赛车、引擎与阵容` : undefined}>
            {ty ? <TeamYear id={id} year={year} t={ty} /> : (
              <YearMissing text={<>{name} {year} 年未参赛 · 出赛年份 {ys[0]}{ys.at(-1) !== ys[0] ? `–${ys.at(-1)}` : ""}{heir ? <>；这一年这支车队以 <Team id={heir.id} name={tName(heir.id, heir.name)} size={20} href={`/teams/${heir.id}?year=${year}`} /> 的名号参赛</> : null}</>} prev={near!.prev} next={near!.next} hrefFor={yHref}>
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

        {yTalk && year && (yTalk.notes.length + yTalk.auto.length > 0)
          ? <TalkingPoints auto={yTalk.auto} notes={yTalk.notes} title={`${year} 年解说要点`} subject={`${name} · ${year}`} skip={id} />
          : <TalkingPoints auto={teamTalk(id)} notes={notes.team(id)} subject={name} records={teamRecords(id)} skip={id} />}

        <section className="band band-paper">
          <div className="wrap">
            <div className="sec-head">
              <div><p className="kicker">Line-up</p><h2 className="cn-h2">历年阵容与赛车</h2></div>
            </div>
            <div className={t.years}>
              {decades.map(([dec, ys], i) => {
                const rows = ys.map((y) => {
                const cars = chassis.filter((x: any) => x.year === y);
                const ds = drivers.filter((x: any) => x.year === y);
                return (
                  <div key={y} className={`${t.yRow} ${y === year ? t.yOn : ""}`}>
                    <div className={t.yHead}>
                      <EntityLink kind="year" id={String(y)} href={yHref(y)} className={t.yYear} preview={false}>
                        <span className="num">{y}</span>
                        <em>{standingMap[y] ? `P${standingMap[y]}` : ""}</em>
                      </EntityLink>
                      {titleYears.includes(y) && <Laurel tone="gold" size={24} top={<span className={t.lt}>车队冠军</span>} title={`${y} 车队冠军`} />}
                    </div>
                    <div className={t.yCars}>
                      {cars.map((ch: any) => (
                        <Link key={ch.id} href={`/cars/${ch.id}`} className={t.yCar}>
                          <b className="lat">{ch.name}</b>
                          <span>{ENGINE_ZH[ch.engine] ?? ch.engineName} 引擎</span>
                        </Link>
                      ))}
                    </div>
                    <div className={t.yDrivers}>
                      {ds.map((dr: any) => {
                        const st = dsMap.get(`${y}|${dr.driver}`);
                        const w = winsBy.get(`${y}|${dr.driver}`);
                        return (
                          <EntityLink key={dr.driver} kind="driver" id={dr.driver} href={`/drivers/${dr.driver}?team=${id}&from=${y}&to=${y}`} className={`${t.yDriver} ${st?.champ ? t.yChamp : ""}`}>
                            <Person plain id={dr.driver} year={y} color={color} name={zhName.driver(dr.driver) ?? dr.name} size={26}
                              sub={<>{st ? `P${st.pos}` : "—"}{w ? ` · ${w} 胜` : ""}{dr.rounds_text && !fullSeason(y, dr.rounds_text) ? ` · 第 ${dr.rounds_text} 站` : ""}</>} />
                            {st?.champ ? <Laurel tone="gold" size={20} top={<span className={t.lt}>车手冠军</span>} title={`${y} 车手世界冠军`} /> : null}
                          </EntityLink>
                        );
                      })}
                    </div>
                  </div>
                );
              });
                return <div key={dec}><p className={t.dec}>{dec}s</p>{rows}</div>;
              }).reduce((acc: any[], el: any, i: number) => {
                if (i < 2) acc.push(el); else { if (i === 2) acc.push([]); acc[acc.length - 1].push(el); }
                return acc;
              }, []).map((el: any, i: number) => Array.isArray(el) ? (
                <details key="older" open={!!year && decades.slice(2).some(([, dys]) => dys.includes(year))}><summary className={t.dec}>更早 <em>{decades.slice(2).reduce((a, d) => a + d[1].length, 0)} 个赛季 · 展开</em></summary>{el}</details>
              ) : el)}
            </div>
          </div>
        </section>

        <section className="band band-white">
          <div className="wrap">
            <Cube key={year ?? "all"} data={cube} fixed="team" fixedId={id} standings={standingMap} defaultView="driver" title={`全部 ${cube.rows.length} 场出赛`}
              initial={{ driver: sp.driver, circuit: sp.circuit, from: year ?? (sp.from ? +sp.from : undefined), to: year ?? (sp.to ? +sp.to : undefined), view: (sp.view as any) || undefined }} />
          </div>
        </section>

        {(content || wiki) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><div><p className="kicker">History</p><h2 className="cn-h2">车队的故事</h2></div></div>
              <div className={s.twoCol}>
                <p className={s.bio}><Linked text={content?.bio ?? wiki?.extract ?? ""} skip={id} /></p>
                <aside className={s.sideBox}>
                  <h3>档案</h3>
                  <dl className={s.kv}>
                    {content?.base && <><dt>基地</dt><dd>{content.base}</dd></>}
                    <dt>出赛</dt><dd><span className="num">{yLink(y0)}–{yLink(y1)}</span> · <span className="num">{c.total_race_starts}</span> 场</dd>
                    {chassis.at(-1) && <><dt>最近赛车</dt><dd><Link href={`/cars/${chassis.at(-1).id}`}>{chassis.at(-1).name}</Link> · {ENGINE_ZH[chassis.at(-1).engine] ?? chassis.at(-1).engineName} 动力</dd></>}
                    <dt>车队冠军</dt><dd>{titleYears.length ? titleYears.map((y: number, i: number) => <span key={y}>{i > 0 && "、"}{yLink(y)}</span>) : "—"}</dd>
                    <dt>车手冠军</dt><dd><span className="num">{driverTitles}</span> 次</dd>
                  </dl>
                </aside>
              </div>
              {!content && wiki && <p className={s.src} style={{ marginTop: 12 }}><a href={wiki.content_urls?.desktop.page}>Wikipedia · {wiki.title}</a></p>}
              {content?.highlights && <div style={{ marginTop: 64 }}><LinkedMoments items={content.highlights} skip={id} /></div>}
              {content?.anecdotes && <div style={{ marginTop: 64 }}><LinkedAnecdotes items={content.anecdotes} skip={id} /></div>}
            </div>
          </section>
        )}
      </div>
    </ViewTransition>
  );
}
