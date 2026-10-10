import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import l from "./livepage.module.css";
import h from "@/components/home/home.module.css";
import { driverStandingsAfter, constructorStandingsAfter } from "@/lib/f1";
import { trackShape } from "@/lib/tracks";
import { cornerLayer } from "@/lib/corners";
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
import EntityLink, { EntityHref } from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Team from "@/components/entity/Team";
import Laurel from "@/components/entity/Laurel";
import LiveTiming, { type Weekend } from "./LiveTiming";
import TimingHashRedirect from "./TimingHashRedirect";
import RoundStrip from "./RoundStrip";
import WeekendResults, { WeekendResultsLive } from "./WeekendResults";
import Breadcrumb, { type Crumb } from "@/components/shell/Breadcrumb";

const dn = (id: string, latin?: string) => DRIVERS_2026[id]?.nameZh ?? zhName.driver(id) ?? latin ?? id;
const tn = (id: string, latin?: string) => zhName.team(id) ?? TEAM_ZH[id] ?? TEAMS_2026[id as keyof typeof TEAMS_2026]?.short ?? latin ?? id;

export type PanelProps = {
  weekends: Weekend[]; initialKey: number | null; liveKey: number | null; fallbackKey: number | null;
  initialA: number | null; initialB: number | null; focus: boolean;
};

/** The page's one timing panel (spec §2.2: one LiveTiming instance per page). `crumbs`: the panel is the whole page (a
 *  race's replay page, v5.1) — it carries the breadcrumb, an h1 and the 「返回本站档案」 link (`archive`). */
export function Panel(p: PanelProps & { archive?: { href: string; label: string }; crumbs?: Crumb[] }) {
  if (!p.weekends.length || p.initialKey == null) {
    return (
      <section id="timing" className={l.section}>
        {p.crumbs && <Breadcrumb flush items={[...p.crumbs, { label: "回放" }]} />}
        <div className={l.empty}>
          <span className="kicker">Timing</span>
          <h2 className="cn-h3">{p.weekends.length ? "这一站暂无计时数据" : "暂时无法获取 OpenF1 赛程"}</h2>
          <p>{p.weekends.length ? "OpenF1 从 2023 年起提供逐节计时。" : "OpenF1 接口没有响应，请稍后刷新。"}</p>
          {p.archive && <Link href={p.archive.href} className="btn btn-ink">{p.archive.label}</Link>}
        </div>
      </section>
    );
  }
  return <LiveTiming embedded={!p.crumbs} id="timing" weekends={p.weekends} initialKey={p.initialKey} liveKey={p.liveKey} fallbackKey={p.fallbackKey} initialA={p.initialA} initialB={p.initialB} focus={p.focus}
    crumbs={p.crumbs} archive={p.crumbs ? p.archive : undefined} />;
}

/** each driver's team in a season (last race he started) → avatar background colour */
function teamsOf(year: number) {
  const m = new Map<string, string>();
  for (const x of all<any>("select rr.driver_id d, rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? order by r.round", year)) m.set(x.d, x.t);
  return m;
}

/* ───────── the next race: the original /live hero banner (user: keep it), F1 type + icons ───────── */
function NextRaceHero({ st, standings, standingsRound, after }: { st: LiveState; standings: any[]; standingsRound: number;
  /** this weekend's results: inside the black banner, since they belong to this race (user: 内容要放到黑色区块内) */
  after?: React.ReactNode }) {
  const next = st.nextRace;
  const wk = st.schedule.find((r) => r.round === next?.round);
  const now = Date.now();
  const live = st.phase === "live";
  const liveName = st.liveSession ? SESSION_ZH[st.liveSession.session_name] ?? st.liveSession.session_name : null;
  const liveLabel = st.liveSession && Date.parse(st.liveSession.date_end) < now ? `${liveName} · 刚结束` : `进行中 · ${liveName}`;
  const upcoming = wk?.sessions.find((x) => new Date(x.end).getTime() > now);
  const shape = next ? trackShape(next.circuit_id, 320) : null;
  // corner numbers on the banner track (spec §0.9.3 ⑨): static pins only, also during live sessions (D7)
  const pins = next ? cornerLayer(next.circuit_id, null)?.corners.map((k) => ({ n: k.n, t: k.t })) ?? null : null;
  const place = (next?.gpFullName ?? "").replace(/ Grand Prix$/, "");
  return (
    // this banner is the current race: links to it get no popover (HoverLayer reads data-page-subject)
    <section className={`${h.hero} ${live ? h.heroLive : ""}`} data-page-subject={next ? `race:${next.year}-${next.round}` : undefined}>
      {/* the banner proper: the 3D track and the track note are positioned against this box, not the whole section */}
      <div className={h.heroTop}>
      {shape && (
        <ViewTransition name={`track-${next?.circuit_id}`} share="morph" default="none">
          {/* the 3D track is a picture of the circuit → the circuit in this year (a circuit leads to 赛道, the GP name to the race) */}
          <EntityHref href={`/circuits/${next?.circuit_id}?year=${next?.year}`} className={`${h.track} pic-link`} aria-label={`${gpZh(next?.grand_prix_id ?? "")} · 赛道`}><HomeTrack points={shape.points} pins={pins} /></EntityHref>
        </ViewTransition>
      )}
      <div className={h.heroGrid}>
        <div className={h.heroMain}>
          <p className={h.round} data-kicker>Round {next?.round} · {next && <EntityLink kind="year" id={String(next.year)} className={h.heroLink}>{next.year}</EntityLink>}{wk?.sprint ? " · 冲刺赛周末" : ""}</p>
          <h1 className={`${h.place} ${l.placeFit}`} style={{ ["--len" as any]: Math.max(6, place.length) }} /* fits its column: wide font ≈ 1.45em per letter, see livepage.module.css */>{place}</h1>
          <p className="cx">{next ? <EntityLink kind="race" id={`${next.year}-${next.round}`} className="hlink">{gpZh(next.grand_prix_id)}</EntityLink> : null}</p>
          <p className="meta-line">{flag(next?.country) && <img src={flag(next?.country)!} alt="" />}{next ? <EntityLink kind="circuit" id={next.circuit_id} year={next.year} className={h.heroLink}>{zhName.circuit(next.circuit_id) ?? next.circuitName}</EntityLink> : null}{next?.place_name && next.place_name.toLowerCase() !== place.toLowerCase() ? <> · {next.place_name}</> : null}</p>
          {live ? (
            <div className={h.count}>
              {/* a link only when there is live timing to land on (user: 如果不能跳转，你就不要给跳转) */}
              {/* past its scheduled end (the 15-min overrun window): 刚结束, not 进行中 */}
              {st.liveFeed
                ? <a href="#timing" className={h.liveTag}><i />{liveLabel}</a>
                : <span className={h.liveTag} title="OpenF1 免费接口不提供实时计时，本节次结束后可看回放"><i />{liveLabel}</span>}
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
        {/* the standings stay in the banner's right column in every phase (user: 恢复原来在顶部 banner 右边) */}
        <StandingsTower standings={standings} year={st.lastRace.year} round={standingsRound} />
      </div>
      {shape && !live && (
        <p className={h.trackNote}>
          {next && <EntityLink kind="circuit" id={next.circuit_id} year={next.year} className={h.heroLink}>{zhName.circuit(next.circuit_id) ?? next.circuitName}<Icon name="chevron-right" size={14} style={{ verticalAlign: "-2px" }} /></EntityLink>}
          <span><b className="num">{next?.length?.toFixed(3)}</b> km · <b className="num">{next?.turns}</b> 个弯 · 高度落差 <b className="num">{reliefInfo(shape.points).meters}</b> 米（3D 中放大 {reliefInfo(shape.points).factor}×）· 由 {shape.year ? <ShapeYear year={shape.year} circuit={next?.circuit_id} /> : null} 排位赛最快圈真实遥测重建</span>
        </p>
      )}
      </div>
      {after}
    </section>
  );
}

/** "由 2025 排位赛…": the telemetry year → that year's race at this circuit (or the season when it did not race there) */
function ShapeYear({ year, circuit }: { year: number; circuit?: string }) {
  const r = circuit ? all<any>("select round from race where year = ? and circuit_id = ?", year, circuit)[0]?.round : null;
  return <EntityLink kind="year" id={String(year)} href={r ? `/races/${year}/${r}` : undefined} className={h.heroLink}>{year}</EntityLink>;
}

/** Drivers' standings top 10 (hero right column; under the panel while a session is live). */
function StandingsTower({ standings, year, round, inline }: { standings: any[]; year: number; round: number; inline?: boolean }) {
  if (!standings.length) return null;
  const team = teamsOf(year);
  return (
    <aside className={`${h.rail} ${inline ? h.railInline : ""}`}>
      <div className={h.railHead}><b>车手积分</b><span>第 {round} 站后</span></div>
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
            {d && <span className={h.champ}><Laurel tone="gold" size={34} top="车手冠军" bottom={`${d.points} 分`} /><Person id={d.driver} year={year} name={dn(d.driver, d.name)} size={36} /></span>}
            {t && <span className={h.champ}><Laurel tone="gold" size={34} top="车队冠军" bottom={`${t.points} 分`} /><Team id={t.team} year={year} name={tn(t.team, t.name)} size={36} onDark /></span>}
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
export function RoundCards({ year, schedule, title, nextRound, calendar = true, weekend = false }: { year: number; schedule: ScheduledRace[]; title: React.ReactNode; nextRound?: number | null; calendar?: boolean;
  /** the next round's weekend is under way (its card reads 本周 · 进行中, not 下一站) */
  weekend?: boolean }) {
  if (!schedule.length) return null;
  const pod = seasonPodiums(year);
  const done = schedule.filter((r) => r.winner).length;
  const latest = schedule.filter((r) => r.winner).at(-1)?.round;
  // the strip opens on the current race: this weekend's / the next one, else (season over) the last one
  const focus = Math.max(0, schedule.findIndex((r) => r.round === (nextRound ?? latest)));
  return (
    <section className={l.section}>
      <div className={l.head}><div><p className="kicker"><EntityLink kind="year" id={String(year)} className="hlink">{year}</EntityLink> Season · {schedule.length} Rounds</p><h2 className="cn-h2">{title}</h2></div><span className={l.sub}>已赛 <b>{done}</b> 站 · 时间按你所在时区显示{calendar && <> · <Link href="/calendar" className={l.subLink}>全年赛历与订阅<Icon name="chevron-right" size={14} /></Link></>}</span></div>
      <RoundStrip focus={focus}>
        {schedule.map((r) => r.winner
          ? <ScheduleCard key={r.round} r={r} state="done" podium={pod(r.round)} replay={replayHref(r)} tag={r.round === latest && nextRound ? "上一站" : undefined} />
          : r.round === nextRound
            // its session times are the banner's own table right above: not repeated on the card (spec §0.8)
            ? <ScheduleCard key={r.round} r={r} state="next" tag={weekend ? "本周 · 进行中" : "下一站"} />
            : <ScheduleCard key={r.round} r={r} state="future" sessions tag="未开始" />)}
      </RoundStrip>
    </section>
  );
}

/**
 * /live (IA spec v5 §0.5.4, S4): the next-race hero banner → [the timing panel right under it while a session is
 * live] → this season's rounds as race cards. Nothing else: past sessions replay on their race's page (/races/Y/R/replay).
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
          : <NextRaceHero st={st} standings={standings} standingsRound={st.lastRace.round} after={
            // streamed: the banner renders at once, the classifications fill in when OpenF1 answers
            <Suspense fallback={<WeekendResults sessions={[...st.meetingDone].reverse()} year={st.year} dark loading />}>
              <WeekendResultsLive st={st} dark />
            </Suspense>
          } />}
        {((live && st.liveFeed) || panel.focus) && <div className={l.panelTop}><Panel {...panel} archive={archive} /></div>}
        <RoundCards year={st.year} schedule={st.schedule} title={<><EntityLink kind="year" id={String(st.year)} className="hlink">{st.year}</EntityLink> 赛季 · 全部分站</>} nextRound={off ? null : next.round} weekend={st.phase === "live" || st.phase === "weekend"} />
      </div>
    </ViewTransition>
  );
}
