import Link from "next/link";
import s from "./home.module.css";
import { facts, seasonRaces, driverStandingsAfter } from "@/lib/f1";
import { flag, DRIVERS_2026 } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { resClassServer } from "@/lib/res";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import ReplayButton from "@/components/live/ReplayButton";

/**
 * Driver × round grid for one season, every cell links to that race.
 * `replay` (round → OpenF1 race session key): a ▶ row under the flags; on /live it switches the timing panel.
 * Rounds still to run are shown as preview columns (→ /races/Y/R).
 */
export default function SeasonGrid({ year, replay }: { year: number; replay?: Record<number, number> }) {
  const rows = facts({ year });
  const races = seasonRaces(year);
  const standings = driverStandingsAfter(year);
  const by = new Map<string, (typeof rows)[number]>();
  for (const f of rows) by.set(`${f.driver}|${f.round}`, f);
  const done = races.filter((r: any) => r.winner);
  const todo = races.filter((r: any) => !r.winner);
  const cols = `minmax(150px, 190px) repeat(${done.length}, minmax(26px, 1fr))${todo.length ? ` repeat(${todo.length}, minmax(18px, .6fr))` : ""} 52px`;
  return (
    <div className={s.gridWrap}>
      <div className={s.grid} style={{ gridTemplateColumns: cols }}>
        <div className={s.gCorner}>车手 \ 分站</div>
        {done.map((r: any) => (
          <EntityLink key={r.round} kind="race" id={`${year}-${r.round}`} className={s.gHead}>
            <img src={flag(r.country) ?? ""} alt={gpZh(r.gp)} /><span>{r.round}</span>
          </EntityLink>
        ))}
        {todo.map((r: any) => (
          <EntityLink key={r.round} kind="race" id={`${year}-${r.round}`} className={`${s.gHead} ${s.gHeadTodo}`}>
            <img src={flag(r.country) ?? ""} alt={gpZh(r.gp)} /><span>{r.round}</span>
          </EntityLink>
        ))}
        <div className={s.gHead}><span>积分</span></div>
        {replay && (
          <div className={s.gRow}>
            <div className={s.gReplayLabel}>计时回放</div>
            {done.map((r: any) => replay[r.round]
              ? <ReplayButton key={r.round} sessionKey={replay[r.round]} year={year} round={r.round} className={s.gPlay} title={`回放 · ${year} ${gpZh(r.gp)} 正赛`} />
              : <span key={r.round} />)}
            {todo.map((r: any) => <span key={r.round} />)}
            <span />
          </div>
        )}
        {standings.map((d: any) => (
          <div key={d.driver} className={s.gRow}>
            <div className={s.gName}>
              <span className="num">{d.pos}</span>
              <Person id={d.driver} year={year} name={DRIVERS_2026[d.driver]?.nameZh ?? zhName.driver(d.driver) ?? d.last_name} size={20} className={s.gPerson} sub={d.abbreviation} />
            </div>
            {done.map((r: any) => {
              const f = by.get(`${d.driver}|${r.round}`);
              if (!f) return <span key={r.round} className="res none" />;
              return (
                <EntityLink key={r.round} kind="race" id={`${year}-${r.round}`} title={`${gpZh(r.gp)} · ${f.posText}`}
                  className={`${resClassServer(f.pos, f.posText)}${f.pole ? " pole" : ""}${f.fl ? " fl" : ""}`}>{f.pos ?? "R"}</EntityLink>
              );
            })}
            {todo.map((r: any) => <span key={r.round} className={s.gFuture} />)}
            <span className={s.gPts}>{d.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
