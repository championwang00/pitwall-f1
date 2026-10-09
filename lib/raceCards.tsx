import { all } from "@/lib/db";
import { raceCard, teamColor, trackMap, trackOutline } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { zhName } from "@/lib/zh";
import type { ScheduledRace } from "@/lib/schedule";
import LocalTime from "@/components/ui/LocalTime";
import RaceCard, { CardAction, SessionList, weekendRange, type PodiumEntry } from "@/components/ui/RaceCard";
import { SESSION_ZH } from "@/lib/openf1";

/**
 * One race-card system for every schedule on the site (/live, /seasons/[year], /calendar): a ScheduledRace →
 * <RaceCard> in the right state, with the podium, the replay / preview / add-to-calendar actions and the dates.
 */
type Pod = { round: number; pos: number; driver: string; code: string; team: string; time: string | null; gap: string | null; gap_laps: number | null };

export function seasonPodiums(year: number) {
  const rows = all<Pod>(`select r.round, rr.position_number pos, rr.driver_id driver, d.abbreviation code, rr.constructor_id team,
      rr.time, rr.gap, rr.gap_laps
    from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
    where r.year = ? and rr.position_number <= 3 order by r.round, rr.position_number`, year);
  return (round: number): PodiumEntry[] => rows.filter((p) => p.round === round).map((p) => ({
    pos: p.pos, driver: p.driver, code: p.code, year, color: teamColor(p.team, "#3a3a44"),
    time: p.pos === 1 ? p.time : p.gap ?? (p.gap_laps ? `+${p.gap_laps} Lap${p.gap_laps > 1 ? "s" : ""}` : null),
  }));
}

export const raceSession = (r: ScheduledRace) => r.sessions.find((x) => x.name === "Race");
export const raceDates = (r: ScheduledRace) => weekendRange(r.sessions[0]?.start, raceSession(r)?.start ?? `${r.date}T12:00:00Z`);

/** where ▶ goes for a finished race (OpenF1, 2023+): the year hub's 回放 tab on that race (IA spec v5 §0.5.5, S3). */
export function replayHref(r: ScheduledRace, now = Date.now()) {
  const s = raceSession(r);
  if (!s?.key || new Date(s.end).getTime() > now) return null;
  return `/seasons/${r.year}/replay?session=${s.key}`;
}

/** `sessions`: upcoming cards list every session (FP1 · Fri 16:30 …) instead of only the race time. */
export function ScheduleCard({ r, state, podium, replay, tag, sessions }: {
  r: ScheduledRace; state: "done" | "next" | "future"; podium?: PodiumEntry[]; replay?: string | null; tag?: string; sessions?: boolean;
}) {
  const href = `/races/${r.year}/${r.round}`;
  const race = raceSession(r);
  return (
    <RaceCard href={href} round={r.round} name={gpZh(r.gp)} latin={r.gpName} country={r.country} official={r.official}
      circuit={{ id: r.circuit, name: zhName.circuit(r.circuit) ?? r.circuitName }} dates={raceDates(r)} podium={podium} state={state} sprint={r.sprint}
      tag={tag ?? (state === "next" ? "下一站" : undefined)}
      photo={state === "next" ? raceCard(r.gp, 960) : null}
      outline={state === "future" ? trackOutline(r.circuit) ?? trackMap(r.circuit, 160) : null}
      when={state === "done" ? undefined
        : sessions && r.sessions.length ? <SessionTimes r={r} />
        : race ? <>正赛 <LocalTime iso={race.start} format="weekday" /> <LocalTime iso={race.start} format="time" /></> : "时间待定"}
      actions={state === "done"
        ? (replay ? <><CardAction href={replay} icon="play">计时回放</CardAction><CardAction href={href} icon="chevron-right">本站档案</CardAction></> : undefined)
        : <><CardAction href={href} icon="chevron-right">前瞻</CardAction><CardAction href={`/api/calendar?year=${r.year}&round=${r.round}&download=1`} icon="calendar-add" download>加入日历</CardAction></>} />
  );
}

function SessionTimes({ r }: { r: ScheduledRace }) {
  return (
    <SessionList rows={r.sessions.map((x) => ({
      key: x.name, name: SESSION_ZH[x.name] ?? x.name,
      when: <><LocalTime iso={x.start} format="weekday" /> <LocalTime iso={x.start} format="time" /></>,
      race: x.name === "Race",
    }))} />
  );
}
