import CarRaceGallery from "@/components/cars/CarRaceGallery";
import { raceLivery, seasonLiveryPhoto } from "@/lib/carLiveries";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, ViewTransition } from "react";
import e from "@/components/entity/entity.module.css";
import k from "./car.module.css";
import { getChassis, facts } from "@/lib/f1";
import { all } from "@/lib/db";
import { cars as carContent, regulations } from "@/lib/content";
import { teamCar, teamColorAt, TEAMS_2026, trackOutline } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { summary, bilingualFast } from "@/lib/wiki";
import { carImageFast } from "@/lib/carImage";
import WindTunnel from "@/components/three/WindTunnel";
import { resClassServer } from "@/lib/res";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import { Linked } from "@/lib/linkify";
import { zhName } from "@/lib/zh";
import RailScope from "@/components/season/RailScope";
import { carRail } from "@/lib/railData";
import ObjectHero from "@/components/entity/ObjectHero";
import o from "@/components/entity/objecthero.module.css";
import { carHero } from "@/lib/hero";
import { entityOverview, overviewSource } from "@/lib/overview";
import YearSpan from "@/components/entity/YearSpan";

export const dynamic = "force-dynamic";


export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ch = getChassis(id);
  if (!ch) notFound();
  const c = carContent()[id];
  const years: number[] = ch.seasons.map((x: any) => x.year);
  const team = ch.constructor_id;
  const color = teamColorAt(team, years[0], "#8a8a94");
  const is2026 = years.includes(2026) && TEAMS_2026[team as keyof typeof TEAMS_2026];
  const img = is2026 ? teamCar(team, 1600) : null;
  const pic = img ? null : await carImageFast(id, { family: true });
  // the Chinese article only (user: 咋还有英文呢？翻译成中文) — else the Chinese F1DB overview; never waits on Wikipedia
  const wiki = !c?.summary ? (await bilingualFast(ch.full_name)).zh : null;
  // Results with this chassis: team results in its seasons; flag seasons where the team ran more than one chassis.
  const multi = new Set(all<any>(
    `select year from season_entrant_chassis where constructor_id = ? and year in (${years.map(() => "?").join(",") || "0"}) group by year having count(distinct chassis_id) > 1`,
    team, ...years).map((r) => r.year));
  const rows = years.flatMap((y) => facts({ team, year: y }));
  const races = [...new Map(rows.map((f) => [f.raceId, f])).values()];
  const seasonPhotos = new Map([...new Set(years)].map(year => [year, seasonLiveryPhoto(id, year)]));
  const best = (rid: number) => rows.filter((f) => f.raceId === rid).sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99))[0];
  const sameTeam = all<any>(
    `select sec.year, sec.chassis_id id, chs.name from season_entrant_chassis sec join chassis chs on chs.id = sec.chassis_id
     where sec.constructor_id = ? and sec.year between ? and ? group by sec.year, sec.chassis_id order by sec.year`, team, (years[0] ?? 2000) - 5, (years.at(-1) ?? 2000) + 5);
  const reg = regulations();
  // the era is the hero's 所属时代 → /eras/[id] (spec §0.8.6): no era summary here
  const tech = !!c?.tech?.length;
  const driversBox = years.length > 1 || new Set(ch.drivers.map((d: any) => d.id)).size > 2;
  const aside = tech || driversBox;
  // titles won with this car: constructors' title (only when it was the team's sole chassis that year)
  // and drivers' titles for champions who raced this chassis that season
  const ys = years.length ? years : [0];
  const dTitles = all<any>(`select year, driver_id id from season_driver_standing where championship_won = 1 and year in (${ys.map(() => "?").join(",")})`, ...ys)
    .filter((r) => ch.drivers.some((d: any) => d.year === r.year && d.id === r.id));
  const surname = (did: string, latin: string) => zhName.driver(did)?.split(/[·・]/).pop() ?? latin.split(" ").slice(-1)[0];

  const heroModel = carHero(id)!;
  // the backdrop's look is inline (one cover image, no tiling, the fade from the left) so it can never render half-styled
  const fade = "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.55) 22%, #000 48%)";
  const BG: React.CSSProperties = { position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", WebkitMaskImage: fade, maskImage: fade };
  // where the picture goes: the 3D wind tunnel keeps its full-width stage; a photo becomes the right-hand backdrop;
  // a side view / placeholder stands in the right column
  const photoBg = !img && pic?.kind === "photo";
  heroModel.visualKind = img ? "stage" : photoBg ? "backdrop" : "car";
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope {...carRail(id)} />
        {/* the car = its team colour as the surface (formula1.com team hero: dark base + DRS-D halftone) */}
        <ObjectHero model={heroModel} visual={
          <>
              {img ? (
                <ViewTransition name={`car-${team}`} share="morph" default="none">
                  <div className={o.tunnel}><WindTunnel src={img} color={color} modes={!!is2026} alt={ch.full_name} /></div>
                </ViewTransition>
              ) : (
                // picture rule (lib/carImage.ts): this chassis' own photo; else a captioned family photo; else the captioned placeholder
                // a cut-out side view stands in the right column; a photo (cannot be cut out) fills the right side as the
                // background, fading into the team colour from the left (user: 车应该在右边…整个图片当背景，左边渐变蒙过去)
                <div className={`img-slot ${photoBg ? o.carBg : ""}`} data-img-kind="car" data-img-id={id} data-img-year={years.length === 1 ? years[0] : ""}
                  data-img-status={pic!.exact ? "exact" : pic!.kind === "placeholder" ? "placeholder" : "representative"} data-img-caption={pic!.caption ?? ""} data-img-depicts={pic!.depicts ?? ""}
                  style={photoBg ? { ...BG, backgroundImage: `url("${pic!.url}")` } : { display: "contents" }} role={photoBg ? "img" : undefined} aria-label={photoBg ? pic!.caption ?? ch.full_name : undefined}>
                  {!photoBg && <img className={o.carImg} src={pic!.url} alt={pic!.caption ?? ch.full_name} />}
                  {pic!.caption && <span className="img-cap">{pic!.caption}</span>}
                </div>
              )}
          </>
        }>
            {multi.size > 0 && <p className={o.note}>{[...multi].map((y, i) => <Fragment key={y}>{i > 0 && "、"}<YearSpan from={y} /></Fragment>)} 年车队同时使用多款底盘，以上为全队当季合计。</p>}
        </ObjectHero>

        <section className={`band band-paper ${k.overviewBand}`}>
          <div className="wrap">
            <div className={k.grid} style={aside ? undefined : { gridTemplateColumns: "minmax(0, 1fr)" }}>
              <div>
                <div className="sec-head"><div><p className="kicker">Overview</p><h2 className="cn-h2">这是一辆怎样的车</h2></div></div>
                <p className={e.bio}><Linked text={c?.summary || wiki?.extract || entityOverview("car", id) || ch.full_name} year={years.length === 1 ? years[0] : null} /></p>
                {!c?.summary && !wiki?.extract && <p className={e.src} style={{ marginTop: 10 }}><a href={overviewSource.url}>{overviewSource.label}</a></p>}
                {!c && wiki?.extract && <p className={e.src} style={{ marginTop: 10 }}><a href={wiki.content_urls?.desktop.page}>维基百科 · {wiki.title}</a></p>}
                {c?.innovations?.length ? (
                  <div style={{ marginTop: 40 }}>
                    <h3 className="cn-h3">技术亮点</h3>
                    <ul className={k.inno}>{c.innovations.map((x) => <li key={x}><Linked text={x} year={years.length === 1 ? years[0] : null} /></li>)}</ul>
                  </div>
                ) : null}
                {c?.record && <p className={k.record}><span className="kicker">战绩</span><span><Linked text={c.record} year={years.length === 1 ? years[0] : null} /></span></p>}
                {c?.sources && <p className={e.src} style={{ marginTop: 16 }}>{c.sources.map((x, i) => <a key={i} href={x.url} target="_blank" rel="noreferrer">{x.label}</a>)}</p>}
              </div>
              {aside && <aside className={e.side}>
                {/* the engine string is the hero's 引擎 tile (spec §0.8.6): only curated specs earn a box */}
                {tech && <div className={e.sideBox}>
                  <h3>技术规格</h3>
                  <dl className={e.kv}>
                    {c!.tech!.map((t) => <Fragment key={t.label}><dt>{t.label}</dt><dd>{t.value}</dd></Fragment>)}
                  </dl>
                  {c?.designers?.length ? <p className={k.designers}>设计：{c.designers.join("、")}</p> : null}
                </div>}
                {/* one season with two drivers = the hero's 车手 tile; several seasons or a third driver add something */}
                {driversBox && <div className={e.sideBox}>
                  <h3>车手</h3>
                  <div className={k.people}>
                    {[...new Map(ch.drivers.map((d: any) => [d.id, d])).values()].map((d: any) => (
                      <EntityLink key={d.id} kind="driver" id={d.id} href={`/drivers/${d.id}?team=${team}&from=${years[0]}&to=${years.at(-1)}`} className={k.person}>
                        <Person plain id={d.id} year={years.at(-1)} color={color} name={zhName.driver(d.id) ?? d.name} size={36} sub={ch.drivers.filter((x: any) => x.id === d.id).map((x: any) => x.year).join(", ")} />
                        {dTitles.some((r) => r.id === d.id) && <Laurel tone="gold" size={20} top={<span className={k.lt}>车手冠军</span>} title="驾驶这台车夺得车手冠军" />}
                      </EntityLink>
                    ))}
                  </div>
                </div>}
              </aside>}
            </div>

            {is2026 && reg?.y2026?.specs && (
              <div style={{ marginTop: 72 }}>
                <div className="sec-head"><div><p className="kicker">Regulations</p><h2 className="cn-h2"><YearSpan from={2026} /> 技术规则</h2></div><span className="sub"><Linked text="所有 2026 赛车共同遵循" /></span></div>
                <div className={k.specs}>
                  {reg.y2026.specs.map((x: any) => <div key={x.label}><span>{x.label}</span><b><Linked text={x.value} year={2026} /></b></div>)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={`band band-white ${k.racesBand}`}>
          <div className="wrap">
            <div className="sec-head"><div><p className="kicker">{ch.full_name || ch.name} · Races &amp; Liveries</p><h2 className="cn-h2">每场比赛与涂装</h2></div></div>
            <CarRaceGallery races={races.map((f) => {
              const b = best(f.raceId);
              const livery = raceLivery(id, f.year, f.round, seasonPhotos.get(f.year) ?? null);
              return { year: f.year, round: f.round, gp: gpZh(f.gp).replace("大奖赛", ""), circuit: f.circuit,
                circuitName: zhName.circuit(f.circuit) ?? f.circuit, outline: trackOutline(f.circuit, f.year, f.round),
                driver: b.driver, driverName: surname(b.driver, b.driverName), position: b.pos, positionText: b.posText,
                resultClass: resClassServer(b.pos, b.posText) + (b.pole ? " pole" : "") + (b.fl ? " fl" : ""),
                livery: livery?.livery ?? null, photo: livery?.photo ?? null };
            })} />

            <div style={{ marginTop: 64 }}>
              <div className="sec-head"><div><p className="kicker">Lineage</p><h2 className="cn-h2">前后几代</h2></div></div>
              <div className={k.lineage}>
                {sameTeam.map((x: any) => (
                  <EntityLink key={x.year + x.id} kind="car" id={x.id} className={`${x.id === id ? k.cur : ""} lift`}>
                    <span className="num">{x.year}</span><b className="lat">{x.name}</b>
                  </EntityLink>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
