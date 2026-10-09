import Link from "next/link";
import { isLight } from "@/lib/color";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import s from "@/components/entity/entity.module.css";
import k from "./driver.module.css";
import { getDriver, driverSeasons, familyOf, teammates, getCountry } from "@/lib/f1";
import { cubeFor } from "@/lib/cube";
import { drivers as dContent } from "@/lib/content";
import { driverBust, driverNumberArt, teamColor, flag, DRIVERS_2026 } from "@/lib/assets";
import { driverImage, bilingual, wikiMap } from "@/lib/wiki";
import { NAT_ZH } from "@/lib/names";
import Cube from "@/components/cube/Cube";
import { StatRow } from "@/components/entity/Moments";
import { LinkedMoments, LinkedAnecdotes } from "../LinkedMoments";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import { Linked } from "@/lib/linkify";
import { zhName } from "@/lib/zh";
import HeroField from "@/components/entity/HeroField";
import TalkingPoints from "@/components/entity/TalkingPoints";
import { driverTalk } from "@/lib/talk";
import { driverRecords } from "@/lib/records";
import { notes } from "@/lib/content";
import { driverYears } from "@/lib/f1";
import { driverYear, parseYear, nearestYears } from "@/lib/yearData";
import RailScope from "@/components/season/RailScope";
import { driverRail } from "@/lib/railData";
import Team from "@/components/entity/Team";
import EraSpan from "@/components/unit/EraSpan";
import YearBand, { YearMissing } from "@/components/unit/YearBand";
import DriverYear from "@/components/unit/DriverYear";
import { driverYearTalk } from "@/components/unit/yearTalk";
import u from "@/components/unit/unit.module.css";
import Icon from "@/components/ui/Icon";
import Breadcrumb, { subjectCrumbs } from "@/components/shell/Breadcrumb";

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
  const nat = getCountry(d.nationality_country_id);
  const lastTeam = entries.at(-1)?.team ?? null;
  // signature team = where they started most races (current drivers: their 2026 team)
  const starts = new Map<string, number>();
  for (const f of cube.rows) starts.set(f.t, (starts.get(f.t) ?? 0) + 1);
  const sig = [...starts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? lastTeam;
  const color = teamColor(DRIVERS_2026[id]?.team ?? sig, "#47464c");
  const cut = driverBust(id, 860, 1000);
  const photo = cut ? null : await driverImage(id);
  const wiki = c ? null : await bilingual(wikiMap().drivers[id]);
  const numberArt = driverNumberArt(id);
  const zh = c?.nameZh ?? DRIVERS_2026[id]?.nameZh ?? zhName.driver(id);
  const tName = (team: string, fallback?: string) => zhName.team(team) ?? fallback ?? team;
  const dName = (did: string, fallback: string) => zhName.driver(did) ?? fallback;
  // honours shown as laurels in the hero (only the non-zero ones, at most four)
  const honours = [
    d.total_championship_wins > 0 && <Laurel key="wc" tone="gold" size={52} top={`${d.total_championship_wins} 届`} bottom="世界冠军" />,
    d.total_race_wins > 0 && <Laurel key="w" tone={d.total_championship_wins > 0 ? "white" : "gold"} size={52} top={`${d.total_race_wins} 场`} bottom="分站冠军" />,
    d.total_pole_positions > 0 && <Laurel key="p" tone="silver" size={52} top={`${d.total_pole_positions} 次`} bottom="杆位" />,
    d.total_podiums > 0 && <Laurel key="pod" tone="bronze" size={52} top={`${d.total_podiums} 次`} bottom="领奖台" />,
  ].filter(Boolean);
  // the stat row keeps whatever is not already shown as a laurel (zeros stay as plain numbers)
  const statItems = [
    { k: "World Titles", v: d.total_championship_wins, laurel: d.total_championship_wins > 0 },
    { k: "Wins", v: d.total_race_wins, laurel: d.total_race_wins > 0 },
    { k: "Podiums", v: d.total_podiums, laurel: d.total_podiums > 0 },
    { k: "Poles", v: d.total_pole_positions, laurel: d.total_pole_positions > 0 },
    { k: "Fastest Laps", v: d.total_fastest_laps },
    { k: "Starts", v: d.total_race_starts },
    { k: "Points", v: Math.round(d.total_points) },
    ...(d.total_grand_slams > 0 ? [{ k: "Grand Slams", v: d.total_grand_slams }] : []),
  ].filter((x: any) => !x.laurel).map(({ k, v }) => ({ k, v }));
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
  const ys = driverYears(id);
  const dy = year && ys.includes(year) ? driverYear(id, year) : null;
  const yTalk = dy && year ? driverYearTalk(id, year, dy) : null;
  const near = year ? nearestYears(ys, year) : null;
  const yHref = (y: number) => `/drivers/${id}?year=${y}`;
  const age = d.date_of_death
    ? null
    : Math.floor((Date.now() - new Date(d.date_of_birth).getTime()) / 3.15576e10);

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <section className={s.hero} data-surface style={{ ["--surface" as any]: color }}>
          <div className={s.heroBg}><HeroField color={color} /></div>
          <div className={s.heroIn}>
            <div className={s.heroText}>
              <div>
                <Breadcrumb flush items={subjectCrumbs("车手", "/drivers", { label: zh ?? d.name ?? id, href: `/drivers/${id}`, kind: "driver", id }, year)} />
                <h1 style={{ marginTop: 24 }} className={k.h1}>
                  <span className={s.first}>{d.first_name}</span>
                  <span className={`${s.last} ${k.fit}`} style={{ ["--n" as any]: d.last_name.length, display: "block", fontSize: d.last_name.length > 9 ? "clamp(36px, 4.4vw, 68px)" : d.last_name.length > 6 ? "clamp(40px, 5.4vw, 82px)" : undefined }}>{d.last_name}</span>
                </h1>
                {zh && <p className="cx">{zh}</p>}
                <p className="meta-line">
                  {flag(d.nationality_country_id) && <img src={flag(d.nationality_country_id)!} alt="" />}
                  {NAT_ZH[d.nationality_country_id] ?? nat?.name} · {d.date_of_birth}{d.date_of_death ? ` — ${d.date_of_death}` : ` · ${age} 岁`}{d.place_of_birth ? ` · 生于 ${d.place_of_birth}` : ""}
                </p>
                {c?.tagline && <p className={s.tagline}><Linked text={c.tagline} skip={id} /></p>}
                {lastTeam && (
                  /* dek: the team stands alone here → logo chip (white logo on the dark team surface), soft-pill hover */
                  <p className={k.dek}>
                    <span>{y1 === 2026 ? <><EntityLink kind="year" id="2026" className={k.heroLink}>2026</EntityLink> 效力于</> : "最后效力于"}</span>
                    <Team id={lastTeam} name={tName(lastTeam, entries.at(-1)?.teamName)} size={22} onDark year={y1} />
                    {entries.at(-1)?.chassis && <span>赛车 <Link href={`/cars/${entries.at(-1)?.chassisIds?.split("|")[0]}`} className={k.heroLink}>{entries.at(-1)?.chassis}</Link></span>}
                  </p>
                )}
                <EraSpan years={ys} />
                {dy && year && (
                  <p className={u.yLine}>
                    <span className={u.yBadge}>{year}</span>
                    {dy.entries.map((e: any) => (
                      <Team key={e.team} id={e.team} name={tName(e.team, e.teamName)} size={20} onDark href={`/teams/${e.team}?year=${year}`} />
                    ))}
                    {dy.entries.flatMap((e: any) => e.cars).slice(0, 2).map((ch: any) => <Link key={ch.id} href={`/cars/${ch.id}`}>{ch.name}</Link>)}
                    <span>·</span>{dy.line?.champ ? "世界冠军" : dy.line?.pos ? <>{dy.line.live ? "目前" : "年终"} P<b className="num">{dy.line.pos}</b></> : "未计排名"}
                    <span>·</span><b className="num">{dy.line?.points ?? 0}</b> 分
                  </p>
                )}
                {honours.length > 0 && <div className={k.honours}>{honours}</div>}
              </div>
              <StatRow items={statItems} />
            </div>
            <div className={s.portrait}>
              {numberArt && <img className={s.numberArt} src={numberArt} alt="" />}
              <ViewTransition name={`driver-${id}`} share="morph" default="none">
                {cut ? <img className={s.cut} src={cut} alt={d.name} /> : photo ? <img className={s.photo} src={photo} alt={d.name} /> : <span />}
              </ViewTransition>
            </div>
          </div>
        </section>

        <RailScope {...driverRail(id, year)} />

        {year && (
          <YearBand year={year} label="赛季" clearHref={`/drivers/${id}`}
            sub={dy ? `${zh ?? d.name} 的 ${year} 赛季：车队、赛车、逐站成绩与队友对比` : undefined}>
            {dy ? <DriverYear id={id} year={year} d={dy} name={zh ?? d.name} /> : (
              <YearMissing text={<>{year} 年未参赛 · 生涯 {y0}–{y1}</>} prev={near!.prev} next={near!.next} hrefFor={yHref} />
            )}
          </YearBand>
        )}

        {yTalk && year && (yTalk.notes.length + yTalk.auto.length > 0)
          ? <TalkingPoints auto={yTalk.auto} notes={yTalk.notes} title={`${year} 年解说要点`} subject={`${zh ?? d.name} · ${year}`} skip={id} />
          : <TalkingPoints auto={driverTalk(id)} notes={notes.driver(id)} subject={zh ?? d.name} records={driverRecords(id)} skip={id} />}

        <section className="band band-paper">
          <div className="wrap">
            <div className="sec-head">
              <div><p className="kicker">Career</p><h2 className="cn-h2">每一个赛季</h2></div>
            </div>
            <div className={s.career}>
              <div className={s.cGrid}>
                {[...byYear.entries()].map(([y, v]) => {
                  const st = v.st;
                  const t = v.teams[0];
                  const ms = mateByYear.get(y) ?? [];
                  const tc = teamColor(t.team, "#3a3a44"), light = isLight(tc);
                  return (
                    <div key={y} className={`${k.cell} lift on-color ${light ? "on-light" : ""} ${y === year ? u.cur : ""}`} style={{ ["--c" as any]: tc }}
                      title={ms.length ? `队友：${ms.map((m) => dName(m.id, m.name)).join("、")}` : undefined}>
                      <Link href={yHref(y)} className="card-link" aria-label={`${y} 赛季`} tabIndex={-1} scroll={false} />
                      <EntityLink kind="year" id={String(y)} href={`/seasons/${y}?driver=${id}`} className={k.cy} preview={false}>{y}</EntityLink>
                      <span className={k.cpos}>{st ? <>P{st.posText}</> : "—"}{st?.champ ? <Laurel tone={light ? "ink" : "white"} onColor size={20} top={<span className={k.lt}>冠军</span>} title={`${y} 世界冠军`} /> : null}</span>
                      <span className={`${k.cteams} over-link`}>{v.teams.map((x: any) => <Team key={x.team} id={x.team} name={tName(x.team, x.teamName)} size={14} onDark={!light} year={y} />)}</span>
                      <span className={`${k.ccar} over-link`}>{v.teams.filter((x: any) => x.chassis).map((x: any) => (
                        <Link key={x.team} href={`/cars/${x.chassisIds?.split("|")[0]}`}>{x.chassis}</Link>
                      ))}</span>
                      <span className={k.cpts}>{st ? `${st.points} 分` : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="band band-white">
          <div className="wrap">
            <Cube key={year ?? "all"} data={cube} fixed="driver" fixedId={id} standings={standingMap} title={`全部 ${cube.rows.length} 场比赛`}
              initial={{ team: sp.team, circuit: sp.circuit, from: year ?? (sp.from ? +sp.from : undefined), to: year ?? (sp.to ? +sp.to : undefined), view: (sp.view as any) || undefined }} />
          </div>
        </section>

        {(c?.highlights?.length || c?.bio || wiki?.zh || wiki?.en) && (
          <section className="band band-paper">
            <div className="wrap">
              <div className={s.twoCol}>
                <div>
                  <div className="sec-head"><div><p className="kicker">Biography</p><h2 className="cn-h2">人物</h2></div></div>
                  <p className={s.bio}><Linked text={c?.bio ?? wiki?.zh?.extract ?? wiki?.en?.extract ?? ""} skip={id} /></p>
                  {!c && (wiki?.zh || wiki?.en) && (
                    <p className={s.src} style={{ marginTop: 12 }}>
                      <a href={(wiki.zh ?? wiki.en)!.content_urls?.desktop.page} target="_blank" rel="noreferrer">Wikipedia · {(wiki.zh ?? wiki.en)!.title}</a>
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
                        <Person key={m.id} id={m.id} name={dName(m.id, m.name)} size={32}
                          sub={mates.filter((x: any) => x.id === m.id).map((x: any) => x.year).join(", ").replace(/(\d{4})(, \d{4})+, (\d{4})/, "$1–$3")} />
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
              {c?.highlights && <div style={{ marginTop: 72 }}><LinkedMoments items={c.highlights} skip={id} /></div>}
              {c?.anecdotes && <div style={{ marginTop: 72 }}><LinkedAnecdotes items={c.anecdotes} skip={id} /></div>}
            </div>
          </section>
        )}
      </div>
    </ViewTransition>
  );
}
