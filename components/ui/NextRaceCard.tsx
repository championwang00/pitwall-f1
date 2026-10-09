import Link from "next/link";
import n from "./nextrace.module.css";
import { flag, raceCard } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { SESSION_ZH } from "@/lib/openf1";
import { zhName } from "@/lib/zh";
import type { ScheduledRace } from "@/lib/schedule";
import { raceDates } from "@/lib/raceCards";
import LocalTime from "./LocalTime";
import Countdown from "./Countdown";
import Icon from "./Icon";
import { GoogleLink } from "@/components/calendar/Subscribe";
import EntityLink from "@/components/entity/EntityLink";

/**
 * The next race as formula1.com's "up next" photo card (official race-card photo, black fades), widened to carry the
 * countdown (session code | KH Interference digits), the buttons and the session times. Shared by /seasons/[year] and /calendar.
 */
export default function NextRaceCard({ next }: { next: ScheduledRace }) {
  const now = Date.now();
  const nextSession = next.sessions.find((x) => new Date(x.end).getTime() > now);
  const dates = raceDates;
  return (
    <div className={n.nextCard}>
      {/* the race photo IS this race: the whole card opens it (stretched .card-link; buttons / links inside keep theirs) */}
      <Link href={`/races/${next.year}/${next.round}`} className="card-link" aria-label={gpZh(next.gp)} tabIndex={-1} />
      {raceCard(next.gp, 1600) && <img className={n.nextPhoto} src={raceCard(next.gp, 1600)!} alt="" />}
      <span className={n.nextFade} />
      <div className={`${n.nextIn} over-link`}>
        <div className={n.nextMain}>
          <span className={n.nextRound} data-kicker>Round {next.round}{next.sprint && <em>冲刺赛周末</em>}</span>
          <h3 className={n.nextTitle}>
            {flag(next.country) && <img src={flag(next.country)!} alt="" />}
            <EntityLink kind="race" id={`${next.year}-${next.round}`}>{gpZh(next.gp)}</EntityLink>
          </h3>
          <p className={n.nextMeta}>
            <span className={n.nextDates}>{dates(next)}</span>
            <EntityLink kind="circuit" id={next.circuit} year={next.year} className={n.nextCirc}>{zhName.circuit(next.circuit) ?? next.circuitName}</EntityLink>
            <span>{next.place}</span>
          </p>
          {nextSession && (
            <div className={n.count}>
              <b>{SESSION_ZH[nextSession.name] ?? nextSession.name}</b>
              <span className={n.countSep} />
              {new Date(nextSession.start).getTime() > now
                ? <Countdown to={nextSession.start} units="en" className={n.countNum} numClassName={n.countDigits} unitClassName={n.countUnit} />
                : <Link href="/live" className={n.liveNow}><i />直播中 · 打开实时计时</Link>}
            </div>
          )}
          <div className={n.nextBtns}>
            <Link className="btn btn-red" href={`/races/${next.year}/${next.round}/brief`}>本站解说手册</Link>
            <Link className={`btn ${n.btnGhost}`} href={`/races/${next.year}/${next.round}`}>本站前瞻<Icon name="chevron-right" size={16} /></Link>
            <a className={`btn ${n.btnGhost}`} href={`/api/calendar?year=${next.year}&round=${next.round}&download=1`}><Icon name="calendar-add" size={16} />加入日历 .ics</a>
          </div>
        </div>
        <ol className={n.sessions}>
          {next.sessions.map((x) => (
            <li key={x.name} className={x === nextSession ? n.sessOn : new Date(x.end).getTime() < now ? n.sessPast : undefined}>
              <b>{SESSION_ZH[x.name] ?? x.name}</b>
              <LocalTime iso={x.start} format="weekday" className={n.sDow} />
              <LocalTime iso={x.start} format="date" className={n.sDate} />
              <LocalTime iso={x.start} format="time" className={n.sTime} />
              <GoogleLink title={`F1 · ${gpZh(next.gp)} · ${SESSION_ZH[x.name] ?? x.name}`} start={x.start} end={x.end} location={`${next.circuitName}, ${next.place}`} details={`第 ${next.round} 站`} />
            </li>
          ))}
        </ol>
      </div>
    </div>

  );
}
