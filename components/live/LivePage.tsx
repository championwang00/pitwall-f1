import Link from "next/link";
import { ViewTransition } from "react";
import l from "./livepage.module.css";
import h from "@/components/home/home.module.css";
import { driverStandingsAfter, constructorStandingsAfter } from "@/lib/f1";
import { trackShape } from "@/lib/tracks";
import { all } from "@/lib/db";
import { teamColor, flag, DRIVERS_2026, TEAMS_2026 } from "@/lib/assets";
import { gpZh, TEAM_ZH } from "@/lib/names";
import { SESSION_ZH } from "@/lib/openf1";
import { zhName } from "@/lib/zh";
import type { LiveState } from "@/lib/live";
import type { ScheduledRace } from "@/lib/schedule";
import { ScheduleCard, seasonPodiums, replayHref } from "@/lib/raceCards";
import LocalTime from "@/components/ui/LocalTime";
import Countdown from "@/components/ui/Countdown";
import Icon from "@/components/ui/Icon";
import { reliefInfo } from "@/components/three/relief";
import HomeTrack from "@/components/home/HomeTrack";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Team from "@/components/entity/Team";
import Laurel from "@/components/entity/Laurel";
import LiveTiming, { type Weekend } from "./LiveTiming";
import TimingHashRedirect from "./TimingHashRedirect";

const dn = (id: string, latin?: string) => DRIVERS_2026[id]?.nameZh ?? zhName.driver(id) ?? latin ?? id;
const tn = (id: string, latin?: string) => zhName.team(id) ?? TEAM_ZH[id] ?? TEAMS_2026[id as keyof typeof TEAMS_2026]?.short ?? latin ?? id;

export type PanelProps = {
  weekends: Weekend[]; initialKey: number | null; liveKey: number | null; fallbackKey: number | null;
  initialA: number | null; initialB: number | null; focus: boolean;
};

/** The page's one timing panel (spec §2.2: one LiveTiming instance per page). */
export function Panel(p: PanelProps & { archive?: { href: string; label: string } }) {
  if (!p.weekends.length || p.initialKey == null) {
    return (
      <section id="timing" className={l.section}>
        <div className={l.empty}>
          <span className="kicker">Timing</span>
          <h2 className="cn-h3">{p.weekends.length ? "这一站暂无计时数据" : "暂时无法获取 OpenF1 赛程"}</h2>
          <p>{p.weekends.length ? "OpenF1 从 2023 年起提供逐节计时。" : "OpenF1 接口没有响应，请稍后刷新。"}</p>
          {p.archive && <Link href={p.archive.href} className="btn btn-ink">{p.archive.label}</Link>}
        </div>
      </section>
    );
  }
  return <LiveTiming embedded id="timing" weekends={p.weekends} initialKey={p.initialKey} liveKey={p.liveKey} fallbackKey={p.fallbackKey} initialA={p.initialA} initialB={p.initialB} focus={p.focus} />;
}

/** each driver's team in a season (last race he started) → avatar background colour */
function teamsOf(year: number) {
  const m = new Map<string, string>();
  for (const x of all<any>("select rr.driver_id d, rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? order by r.round", year)) m.set(x.d, x.t);
  return m;
}

/* ───────── the next race: the original /live hero banner (user: keep it), F1 type + icons ───────── */
function NextRaceHero({ st, standings, standingsRound }: { st: LiveState; standings: any[]; standingsRound: number }) {
  const next = st.nextRace;
  const wk = st.schedule.find((r) => r.round === next?.round);
  const now = Date.now();
  const live = st.phase === "live";
  const liveName = st.liveSession ? SESSION_ZH[st.liveSession.session_name] ?? st.liveSession.session_name : null;
  const upcoming = wk?.sessions.find((x) => new Date(x.end).getTime() > now);
  const shape = next ? trackShape(next.circuit_id, 320) : null;
  const place = (next?.gpFullName ?? "").replace(/ Grand Prix$/, "");
  return (
    <section className={`${h.hero} ${live ? h.heroLive : ""}`}>
      {shape && (
        <ViewTransition name={`track-${next?.circuit_id}`} share="morph" default="none">
          <div className={h.track}><HomeTrack points={shape.points} /></div>
        </ViewTransition>
      )}
      <div className={h.heroGrid}>
        <div className={h.heroMain}>
          <p className={h.round}>Round {next?.round} · {next && <EntityLink kind="year" id={String(next.year)} className={h.heroLink}>{next.year}</EntityLink>}{wk?.sprint ? " · 冲刺赛周末" : ""}</p>
          <h1 className={`${h.place} ${l.placeFit}`} style={{ ["--len" as any]: Math.max(6, place.length) }} /* fits its column: wide font ≈ 1.45em per letter, see livepage.module.css */>{place}</h1>
          <p className="cx">{gpZh(next?.grand_prix_id ?? "")}</p>
          <p className="meta-line">{flag(next?.country) && <img src={flag(next?.country)!} alt="" />}{next ? <EntityLink kind="circuit" id={next.circuit_id} href={`/races/${next.year}/${next.round}`} className={h.heroLink}>{zhName.circuit(next.circuit_id) ?? next.circuitName}</EntityLink> : null} · {next?.place_name}</p>
          {live ? (
            <div className={h.count}>
              <a href="#timing" className={h.liveTag}><i />进行中 · {liveName}</a>
            </div>
          ) : upcoming && (
            <div className={h.count}>
              <span className={h.countLabel}>{SESSION_ZH[upcoming.name] ?? upcoming.name} 倒计时</span>
              <Countdown to={upcoming.start} units="en" className={h.countNum} unitClassName={h.countUnit} />
            </div>
          )}
          <ol className={h.sessions}>
            {wk?.sessions.map((x) => (
              <li key={x.name} className={`${x === upcoming ? h.sNext : ""} ${x.name === "Race" ? h.sRace : ""} ${new Date(x.end).getTime() < now ? h.sPast : ""}`}>
                <span>{SESSION_ZH[x.name] ?? x.name}</span>
                <LocalTime iso={x.start} format="weekday" className={h.sDow} />
                <LocalTime iso={x.start} format="time" className={h.sTime} />
              </li>
            ))}
          </ol>
          <div className={h.ctas}>
            <a className="btn btn-red" href={`/api/calendar?year=${next?.year}&round=${next?.round}&download=1`}><Icon name="calendar-add" size={18} />加入日历</a>
            <Link className="btn btn-line" href={`/races/${next?.year}/${next?.round}`}>本站前瞻<Icon name="chevron-right" size={16} /></Link>
            <Link className="btn btn-line" href={`/races/${next?.year}/${next?.round}/brief`}>本站解说手册</Link>
          </div>
        </div>
        {!live && <StandingsTower standings={standings} year={st.lastRace.year} round={standingsRound} />}
      </div>
      {shape && !live && (
        <p className={h.trackNote}>
          {next && <EntityLink kind="circuit" id={next.circuit_id} href={`/races/${next.year}/${next.round}`} className={h.heroLink}>{zhName.circuit(next.circuit_id) ?? next.circuitName}<Icon name="chevron-right" size={14} style={{ verticalAlign: "-2px" }} /></EntityLink>}
          <span><b className="num">{next?.length?.toFixed(3)}</b> km · <b className="num">{next?.turns}</b> 个弯 · 高度落差 <b className="num">{reliefInfo(shape.points).meters}</b> 米（3D 中放大 {reliefInfo(shape.points).factor}×）· 由 {shape.year} 排位赛最快圈真实遥测重建</span>
        </p>
      )}
    </section>
  );
}

/** Drivers' standings top 10 (hero right column; under the panel while a session is live). */
function StandingsTower({ standings, year, round, inline }: { standings: any[]; year: number; round: number; inline?: boolean }) {
  if (!standings.length) return null;
  const team = teamsOf(year);
  return (
    <aside className={`${h.rail} ${inline ? h.railInline : ""}`}>
      <div className={h.railHead}><b>车手积分</b><span>AFTER R{round} · PTS</span></div>
      <ol className={h.tower}>
        {standings.slice(0, 10).map((d: any) => (
          <li key={d.driver}>
            <span className={h.tPos}>{d.pos}</span>
            <Person id={d.driver} year={year} color={teamColor(team.get(d.driver), "#3a3a44")} name={dn(d.driver, d.last_name)} size={22} className={h.tName} />
            <span className={h.tGap}>{d.points}</span>
          </li>
        ))}
      </ol>
      <EntityLink kind="year" id={String(year)} href={`/seasons/${year}/standings`} className={h.railMore}>完整积分榜<Icon name="chevron-right" size={14} style={{ verticalAlign: "-2px" }} /></EntityLink>
    </aside>
  );
}

/* ───────── offseason: the season is over and the next calendar isn't out ───────── */
function SeasonOverHero({ year, standings, teams }: { year: number; standings: any[]; teams: any[] }) {
  const d = standings[0], t = teams[0];
  return (
    <section className={h.hero}>
      <div className={h.heroGrid} style={{ minHeight: 420 }}>
        <div className={h.heroMain}>
          <p className={h.round}><EntityLink kind="year" id={String(year)} className={h.heroLink}>{year}</EntityLink> 赛季</p>
          <h1 className={h.place} style={{ fontSize: "min(72px, 12vw)" }}>赛季结束</h1>
          <div className={h.champs}>
            {d && <span className={h.champ}><Laurel tone="gold" size={34} top="车手冠军" bottom={`${d.points} PTS`} /><Person id={d.driver} year={year} name={dn(d.driver, d.name)} size={36} /></span>}
            {t && <span className={h.champ}><Laurel tone="gold" size={34} top="车队冠军" bottom={`${t.points} PTS`} /><Team id={t.team} year={year} name={tn(t.team, t.name)} size={36} onDark /></span>}
          </div>
          <div className={h.ctas}>
            <Link className="btn btn-red" href={`/seasons/${year}/standings`}>赛季回顾</Link>
            <Link className="btn btn-line" href="/calendar">全年赛历与订阅</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A season's rounds as race cards in calendar order: finished = podium cells (+ ▶ Replay), the next one highlighted
 *  (photo card), the rest upcoming with their session times. Every card opens /races/Y/R. */
export function RoundCards({ year, schedule, title, nextRound, calendar = true }: { year: number; schedule: ScheduledRace[]; title: React.ReactNode; nextRound?: number | null; calendar?: boolean }) {
  if (!schedule.length) return null;
  const pod = seasonPodiums(year);
  const done = schedule.filter((r) => r.winner).length;
  const latest = schedule.filter((r) => r.winner).at(-1)?.round;
  return (
    <section className={l.section}>
      <div className={l.head}><div><p className="kicker">{year} Season · {schedule.length} Rounds</p><h2 className="cn-h2">{title}</h2></div><span className={l.sub}>已赛 <b>{done}</b> 站 · 时间按你所在时区显示{calendar && <> · <Link href="/calendar" className={l.subLink}>全年赛历与订阅<Icon name="chevron-right" size={14} /></Link></>}</span></div>
      <ol className={l.grid}>
        {schedule.map((r) => r.winner
          ? <ScheduleCard key={r.round} r={r} state="done" podium={pod(r.round)} replay={replayHref(r)} tag={r.round === latest && nextRound ? "最新" : undefined} />
          : <ScheduleCard key={r.round} r={r} state={r.round === nextRound ? "next" : "future"} sessions />)}
      </ol>
    </section>
  );
}

/**
 * /live (IA spec v5 §0.5.4, S4): the next-race hero banner → [the timing panel right under it while a session is
 * live] → this season's rounds as race cards. Nothing else: past sessions replay in the year hub (/seasons/Y/replay).
 */
export default function LivePage({ st, panel }: { st: LiveState; panel: PanelProps }) {
  const next = st.nextRace;
  const live = st.phase === "live";
  const off = st.phase === "offseason" || !next;
  const standings = driverStandingsAfter(st.lastRace.year);
  const archive = { href: `/races/${st.lastRace.year}/${st.lastRace.round}`, label: "看这一站的档案" };
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div data-page="live" data-phase={st.phase} className={l.page}>
        <TimingHashRedirect year={st.year} />
        {/* replaying a past session (▶ deep link): the viewer is focused on that race — no next-race banner (user) */}
        {panel.focus && !live ? null : off
          ? <SeasonOverHero year={st.lastRace.year} standings={standings} teams={constructorStandingsAfter(st.lastRace.year)} />
          : <NextRaceHero st={st} standings={standings} standingsRound={st.lastRace.round} />}
        {(live || panel.focus) && <div className={l.panelTop}><Panel {...panel} archive={archive} /></div>}
        {live && <div className={l.section}><StandingsTower standings={standings} year={st.lastRace.year} round={st.lastRace.round} inline /></div>}
        <RoundCards year={st.year} schedule={st.schedule} title={<>{st.year} 赛季 · 全部分站</>} nextRound={off ? null : next.round} />
      </div>
    </ViewTransition>
  );
}
