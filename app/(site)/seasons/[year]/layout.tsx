import { notFound } from "next/navigation";
import y from "./season.module.css";
import { seasonRaces, seasonDriverStandings, seasonConstructorStandings, driverStandingsAfter, constructorStandingsAfter, getDriver } from "@/lib/f1";
import { all } from "@/lib/db";
import { teamColor, driverBust } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import Team from "@/components/entity/Team";
import Person from "@/components/entity/Person";
import Laurel, { LaurelRow } from "@/components/entity/Laurel";
import YearTabs from "@/components/season/YearTabs";
import SeasonOverview from "@/components/season/SeasonOverview";
import YearCrumbs from "@/components/season/YearCrumbs";
import { seasonSchedule, type ScheduledRace } from "@/lib/schedule";
import { replayHref } from "@/lib/raceCards";
import { gpZh } from "@/lib/names";
import { SESSION_ZH } from "@/lib/openf1";

export const dynamic = "force-dynamic";

/** 回放 tab (v5 §0.5.4): 2023 ≤ Y ≤ this season, OpenF1 timing. `rounds` = finished races with a replay (the tab's
 *  count; 0 → no tab), `sessions` = session key → "巴林大奖赛 · 正赛" for the breadcrumb's last crumb. */
async function replayIndex(year: number) {
  const sessions: Record<number, string> = {};
  if (year < 2023 || year > new Date().getUTCFullYear()) return { rounds: 0, sessions };
  const sched: ScheduledRace[] = await seasonSchedule(year).catch(() => []);
  for (const r of sched) for (const x of r.sessions) if (x.key) sessions[x.key] = `${gpZh(r.gp)} · ${SESSION_ZH[x.name] ?? x.name}`;
  return { rounds: sched.filter((r) => !!replayHref(r)).length, sessions };
}

export default async function YearLayout({ params, children }: { params: Promise<{ year: string }>; children: React.ReactNode }) {
  const { year: ys } = await params;
  const year = +ys;
  const races = seasonRaces(year);
  if (!races.length) notFound();
  const done = races.filter((r: any) => r.winner);
  const live = done.length < races.length;
  const dStand = live ? driverStandingsAfter(year) : seasonDriverStandings(year);
  const cStand = live ? constructorStandingsAfter(year) : seasonConstructorStandings(year);
  const champ = live ? null : dStand.find((x: any) => x.champ) ?? null;
  const champTeam = live ? null : cStand.find((x: any) => x.champ) ?? null;
  const leader = dStand[0];
  const hero = champ ?? leader;
  const heroId: string | undefined = hero?.driver;
  const name = (id: string, n?: string) => zhName.driver(id) ?? n ?? id;
  // §1.5: the photo from THAT season (period face), never a later / civilian one
  const portrait = heroId ? (year >= 2025 ? driverBust(heroId, 640, 760) : `/api/face/${heroId}?s=600&year=${year}`) : null;
  const heroDriver = heroId ? getDriver(heroId) : null;
  const heroTeam = heroId ? all<any>("select constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = ? order by r.round desc limit 1", year, heroId)[0]?.t : null;
  // nth title for the champion
  const nth = champ ? all<any>("select count(*) n from season_driver_standing where driver_id = ? and championship_won = 1 and year <= ?", champ.driver, year)[0].n : 0;
  const teamNth = champTeam ? all<any>("select count(*) n from season_constructor_standing where constructor_id = ? and championship_won = 1 and year <= ?", champTeam.team, year)[0].n : 0;
  const counts = all<any>(`select count(distinct r.circuit_id) c, count(distinct rr.driver_id) d, count(distinct rr.constructor_id) t
    from race r left join race_result rr on rr.race_id = r.id where r.year = ?`, year)[0];

  const replay = await replayIndex(year);
  const heroColor = teamColor(heroTeam, "#e10600");
  const stats = [
    { k: "Rounds", v: races.length, sub: live ? `已赛 ${done.length}` : undefined },
    { k: "Winners", v: new Set(done.map((r: any) => r.winner)).size },
    { k: "Drivers", v: counts.d },
    { k: "Teams", v: counts.t },
  ];

  /* Year hub hero — one light page system (formula1.com): paper page, the season as ONE big identity card in the
     champion's (or leader's) team colour with F1's own DRS texture, the champion portrait bleeding off its right edge. */
  return (
    <div className={y.page}>
      <section className={y.top}>
        <div className={`${y.hero} f1-surface`} style={{ ["--c" as any]: heroColor }}>
          <div className={y.text}>
            <YearCrumbs year={year} sessions={replay.sessions} />
            <span className={y.kick}>{champ ? "World Champion" : leader ? `Championship Leader · Round ${done.length} / ${races.length}` : "Season"}</span>
            <h1 className={y.year}>{year}</h1>
            <LaurelRow>
              {champ ? (
                <>
                  <Laurel tone="white" onColor size={46} top={`第 ${nth} 冠`} bottom="车手世界冠军" />
                  {champTeam && <Laurel tone="white" onColor size={46} top={zhName.team(champTeam.team) ?? champTeam.name} bottom={`第 ${teamNth} 座车队冠军`} />}
                </>
              ) : leader ? (
                <Laurel tone="white" onColor size={46} top="积分领跑" bottom={`已赛 ${done.length} / ${races.length} 站`} />
              ) : null}
            </LaurelRow>
            <div className={y.dek}>
              {champ ? (
                <>
                  <span className={y.dekItem}><em>Champion</em><Person id={champ.driver} year={year} color={heroColor} name={name(champ.driver, champ.name)} size={36} className={y.chip} /></span>
                  {champTeam && <span className={y.dekItem}><em>Constructors</em><Team id={champTeam.team} year={year} name={zhName.team(champTeam.team) ?? champTeam.name} onDark size={24} className={y.chip} /></span>}
                </>
              ) : leader ? (
                <>
                  <span className={y.dekItem}><em>Leader</em><Person id={leader.driver} year={year} color={heroColor} name={name(leader.driver, leader.name)} size={36} className={y.chip} /><b className={y.pts}>{leader.points}<i>PTS</i></b></span>
                  {dStand[1] && <span className={y.dekItem}><em>Gap</em><b className={y.pts}>+{leader.points - dStand[1].points}<i>PTS</i></b><span className={y.over}>领先 <EntityLink kind="driver" id={dStand[1].driver} year={year} className={y.overName}>{name(dStand[1].driver, dStand[1].name)}</EntityLink></span></span>}
                </>
              ) : <span className={y.dekItem}>赛季尚未开始</span>}
            </div>
            <dl className={y.stats}>
              {stats.map((x) => (
                <div key={x.k}><dd>{x.v}</dd><dt>{x.k}{x.sub && <span>{x.sub}</span>}</dt></div>
              ))}
            </dl>
          </div>
          {portrait && (
            <figure className={year >= 2025 ? y.cut : y.photo}>
              <img src={portrait} alt="" />
              <figcaption>{live ? "Leader" : "Champion"} · {heroDriver?.name}</figcaption>
            </figure>
          )}
        </div>
      </section>
      <SeasonOverview year={year} />
      <YearTabs year={year} counts={{ "": races.length, circuits: counts.c, drivers: counts.d, teams: counts.t, ...(replay.rounds ? { replay: replay.rounds } : {}) }} />
      {children}
    </div>
  );
}
