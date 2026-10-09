import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, ViewTransition } from "react";
import e from "@/components/entity/entity.module.css";
import k from "./car.module.css";
import { getChassis, facts } from "@/lib/f1";
import { all } from "@/lib/db";
import { cars as carContent, regulations } from "@/lib/content";
import { teamCar, teamColor, TEAMS_2026 } from "@/lib/assets";
import { TEAM_ZH, ENGINE_ZH, gpZh } from "@/lib/names";
import { summary, searchTitle } from "@/lib/wiki";
import { carImageFast } from "@/lib/carImage";
import { StatRow } from "@/components/entity/Moments";
import WindTunnel from "@/components/three/WindTunnel";
import { resClassServer } from "@/lib/res";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import { Linked } from "@/lib/linkify";
import { zhName } from "@/lib/zh";
import RailScope from "@/components/season/RailScope";
import { carRail } from "@/lib/railData";
import Team from "@/components/entity/Team";
import Icon from "@/components/ui/Icon";
import Breadcrumb from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

const ASP_ZH: Record<string, string> = { NATURALLY_ASPIRATED: "自然吸气", TURBOCHARGED: "涡轮增压", SUPERCHARGED: "机械增压" };

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ch = getChassis(id);
  if (!ch) notFound();
  const c = carContent()[id];
  const years: number[] = ch.seasons.map((x: any) => x.year);
  const team = ch.constructor_id;
  const color = teamColor(team, "#8a8a94");
  const is2026 = years.includes(2026) && TEAMS_2026[team as keyof typeof TEAMS_2026];
  const img = is2026 ? teamCar(team, 1600) : null;
  let wiki = null;
  if (!img) {
    wiki = await summary(ch.full_name);
    if (!wiki) { const t = await searchTitle(`${ch.full_name} Formula One car`); wiki = await summary(t); }
  }
  // Results with this chassis: team results in its seasons; flag seasons where the team ran more than one chassis.
  const multi = new Set(all<any>(
    `select year from season_entrant_chassis where constructor_id = ? and year in (${years.map(() => "?").join(",") || "0"}) group by year having count(distinct chassis_id) > 1`,
    team, ...years).map((r) => r.year));
  const rows = years.flatMap((y) => facts({ team, year: y }));
  const races = [...new Map(rows.map((f) => [f.raceId, f])).values()];
  const best = (rid: number) => rows.filter((f) => f.raceId === rid).sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99))[0];
  const wins = rows.filter((f) => f.pos === 1).length;
  const pods = rows.filter((f) => f.pos && f.pos <= 3).length;
  const poles = rows.filter((f) => f.pole).length;
  const pts = rows.reduce((a, f) => a + f.points, 0);
  const sameTeam = all<any>(
    `select sec.year, sec.chassis_id id, chs.name from season_entrant_chassis sec join chassis chs on chs.id = sec.chassis_id
     where sec.constructor_id = ? and sec.year between ? and ? group by sec.year, sec.chassis_id order by sec.year`, team, (years[0] ?? 2000) - 5, (years.at(-1) ?? 2000) + 5);
  const reg = regulations();
  const era = reg?.eras?.filter((er: any) => years[0] >= er.years[0] && years[0] <= er.years[1]).sort((a: any, b: any) => (a.years[1] - a.years[0]) - (b.years[1] - b.years[0]))[0];
  const engine = ch.engines[0];
  const teamZh = zhName.team(team) ?? TEAM_ZH[team] ?? ch.constructorName;
  const yLink = (y: number, cls = k.yl) => <EntityLink key={y} kind="year" id={String(y)} href={`/seasons/${y}?team=${team}`} className={cls}>{y}</EntityLink>;
  // titles won with this car: constructors' title (only when it was the team's sole chassis that year)
  // and drivers' titles for champions who raced this chassis that season
  const ys = years.length ? years : [0];
  const cTitles = all<any>(`select year from season_constructor_standing where constructor_id = ? and championship_won = 1 and year in (${ys.map(() => "?").join(",")})`, team, ...ys)
    .map((r) => r.year as number).filter((y) => !multi.has(y));
  const dTitles = all<any>(`select year, driver_id id from season_driver_standing where championship_won = 1 and year in (${ys.map(() => "?").join(",")})`, ...ys)
    .filter((r) => ch.drivers.some((d: any) => d.year === r.year && d.id === r.id));
  const surname = (did: string, latin: string) => zhName.driver(did)?.split(/[·・]/).pop() ?? latin.split(" ").slice(-1)[0];

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope {...carRail(id)} />
        {/* the car = its team colour as the surface (formula1.com team hero: dark base + DRS-D halftone) */}
        <section className={`${k.hero} f1-surface team-drs`} data-surface style={{ ["--team" as any]: color, ["--c" as any]: color, ["--surface" as any]: color }}>
          <div className={k.heroIn}>
            <div className={k.text}>
              <Breadcrumb flush items={[{ label: "赛车", href: "/cars" }, { label: ch.name }]} />
              <h1 className={k.name}>{ch.name}</h1>
              {/* dek: the team stands alone → white logo chip on the team surface */}
              <p className={k.dek}><Team id={team} name={teamZh} size={24} onDark year={years.at(-1)} className={k.teamChip} /><span className={k.dekYears}>{years.length > 1 ? <>{yLink(years[0])}–{yLink(years.at(-1)!)}</> : years[0] ? yLink(years[0]) : null}</span></p>
              <p className={k.full}>{c?.nameEn ?? ch.full_name}</p>
              {engine && <p className={k.sub}><span className="kicker">Power Unit</span><span>{ENGINE_ZH[engine.id?.split("-")[0]] ?? ""} {engine.full_name}</span></p>}
              {(cTitles.length > 0 || dTitles.length > 0) && (
                <div className={k.honours}>
                  {cTitles.map((y) => <Laurel key={"c" + y} tone="gold" size={44} top={y} bottom="车队冠军" title={`${y} 车队冠军`} />)}
                  {dTitles.map((r) => (
                    <Laurel key={"d" + r.year + r.id} tone="gold" size={44} top={r.year} bottom={`${surname(r.id, ch.drivers.find((d: any) => d.id === r.id)?.name ?? r.id)} · 车手冠军`} title={`${r.year} 车手冠军`} />
                  ))}
                </div>
              )}
            </div>
            <div className={k.stage}>
              {img ? (
                <ViewTransition name={`car-${team}`} share="morph" default="none">
                  <div className={k.tunnel}><WindTunnel src={img} color={color} modes={!!is2026} alt={ch.full_name} /></div>
                </ViewTransition>
              ) : (
                <img className={k.photo} src={await carImageFast(id)} alt={ch.full_name} />
              )}
            </div>
            <StatRow items={[{ k: "Starts", v: races.length }, { k: "Wins", v: wins }, { k: "Podiums", v: pods }, { k: "Poles", v: poles }, { k: "Points", v: Math.round(pts) }]} />
            {multi.size > 0 && <p className={k.warn}>{[...multi].join("、")} 年车队同时使用多款底盘，以上为全队当季合计。</p>}
          </div>
        </section>

        <section className="band band-paper">
          <div className="wrap">
            <div className={k.grid}>
              <div>
                <div className="sec-head"><div><p className="kicker">Overview</p><h2 className="cn-h2">这是一辆怎样的车</h2></div></div>
                <p className={e.bio}><Linked text={c?.summary ?? wiki?.extract ?? "暂无档案。"} /></p>
                {!c && wiki && <p className={e.src} style={{ marginTop: 10 }}><a href={wiki.content_urls?.desktop.page}>Wikipedia · {wiki.title}</a></p>}
                {c?.innovations?.length ? (
                  <div style={{ marginTop: 40 }}>
                    <h3 className="cn-h3">技术亮点</h3>
                    <ul className={k.inno}>{c.innovations.map((x) => <li key={x}><Linked text={x} /></li>)}</ul>
                  </div>
                ) : null}
                {c?.record && <p className={k.record}><span className="kicker">战绩</span><span><Linked text={c.record} /></span></p>}
                {c?.sources && <p className={e.src} style={{ marginTop: 16 }}>{c.sources.map((x, i) => <a key={i} href={x.url} target="_blank" rel="noreferrer">{x.label}</a>)}</p>}
                {era && (
                  <div className={k.era}>
                    <span className="kicker">Era · <span className="num">{yLink(era.years[0], "")}{era.years[1] !== era.years[0] && <>–<Fragment key="to">{yLink(era.years[1], "")}</Fragment></>}</span></span>
                    <b>{era.title}</b>
                    <p><Linked text={era.summary} /></p>
                  </div>
                )}
              </div>
              <aside className={e.side}>
                <div className={e.sideBox}>
                  <h3>技术规格</h3>
                  <dl className={e.kv}>
                    {(c?.tech ?? []).map((t) => <Fragment key={t.label}><dt>{t.label}</dt><dd>{t.value}</dd></Fragment>)}
                    {!c?.tech?.length && engine && (
                      <>
                        <dt>引擎</dt><dd>{engine.full_name}</dd>
                        {engine.capacity && <><dt>排量</dt><dd><span className="num">{engine.capacity}</span> 升</dd></>}
                        {engine.configuration && <><dt>布局</dt><dd>{engine.configuration}</dd></>}
                        {engine.aspiration && <><dt>进气</dt><dd>{ASP_ZH[engine.aspiration] ?? engine.aspiration}</dd></>}
                      </>
                    )}
                  </dl>
                  {c?.designers?.length ? <p className={k.designers}>设计：{c.designers.join("、")}</p> : null}
                </div>
                <div className={e.sideBox}>
                  <h3>车手</h3>
                  <div className={k.people}>
                    {[...new Map(ch.drivers.map((d: any) => [d.id, d])).values()].map((d: any) => (
                      <EntityLink key={d.id} kind="driver" id={d.id} href={`/drivers/${d.id}?team=${team}&from=${years[0]}&to=${years.at(-1)}`} className={k.person}>
                        <Person plain id={d.id} year={years.at(-1)} color={color} name={zhName.driver(d.id) ?? d.name} size={36} sub={ch.drivers.filter((x: any) => x.id === d.id).map((x: any) => x.year).join(", ")} />
                        {dTitles.some((r) => r.id === d.id) && <Laurel tone="gold" size={20} top={<span className={k.lt}>车手冠军</span>} title="驾驶这台车夺得车手冠军" />}
                      </EntityLink>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            {is2026 && reg?.y2026?.specs && (
              <div style={{ marginTop: 72 }}>
                <div className="sec-head"><div><p className="kicker">Regulations</p><h2 className="cn-h2">2026 技术规则</h2></div><span className="sub">所有 2026 赛车共同遵循</span></div>
                <div className={k.specs}>
                  {reg.y2026.specs.map((x: any) => <div key={x.label}><span>{x.label}</span><b>{x.value}</b></div>)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="band band-white">
          <div className="wrap">
            <div className="sec-head"><div><p className="kicker">Races</p><h2 className="cn-h2">它的每一场比赛</h2></div><span className="sub">取两位车手中较好的名次</span></div>
            <div className={k.races}>
              {races.map((f) => {
                const b = best(f.raceId);
                return (
                  <div key={f.raceId} className={k.race} title={`${f.year} ${gpZh(f.gp)} · ${zhName.driver(b.driver) ?? b.driverName} · ${b.posText}`}>
                    <Link href={`/races/${f.year}/${f.round}`} className={resClassServer(b.pos, b.posText) + (b.pole ? " pole" : "") + (b.fl ? " fl" : "")}>{b.pos ?? "R"}</Link>
                    <span>
                      <Link href={`/races/${f.year}/${f.round}`} className={k.gp}><b>{gpZh(f.gp).replace("大奖赛", "")}</b></Link>
                      <em>{years.length > 1 && <><EntityLink kind="year" id={String(f.year)} className={k.yl}>{f.year}</EntityLink> · </>}<EntityLink kind="driver" id={b.driver} year={f.year} className={k.yl}>{surname(b.driver, b.driverName)}</EntityLink></em>
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 64 }}>
              <div className="sec-head"><div><p className="kicker">Lineage</p><h2 className="cn-h2">前后几代</h2></div></div>
              <div className={k.lineage}>
                {sameTeam.map((x: any) => (
                  <Link key={x.year + x.id} href={`/cars/${x.id}`} className={`${x.id === id ? k.cur : ""} lift`}>
                    <span className="num">{x.year}</span><b className="lat">{x.name}</b>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
