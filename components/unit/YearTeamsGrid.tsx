import Link from "next/link";
import s from "@/components/index/index.module.css";
import { yearTeams, yearDrivers } from "@/lib/yearData";
import { teamColor, teamCar, TEAMS_2026 } from "@/lib/assets";
import { ENGINE_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import { all } from "@/lib/db";
import Laurel from "@/components/entity/Laurel";
import TeamCard from "@/components/index/TeamCard";

/**
 * 「Y 年的 N 支车队」: constructors of the year as formula1.com team cards — line-up, car (official side view for the
 * current grid) or the year's numbers, chassis and engine. One implementation for /seasons/Y/teams and the top block
 * of /teams?year=Y (spec §4.7); links carry ?year=Y (§4.8).
 */
export default function YearTeamsGrid({ year, heading = true }: { year: number; heading?: boolean }) {
  const ts = yearTeams(year);
  const ds = yearDrivers(year);
  const ids = [...new Set(ts.flatMap((tm) => tm.chassis))];
  const chassisName = new Map(ids.length ? all<any>(`select id, name from chassis where id in (${ids.map(() => "?").join(",")})`, ...ids).map((c) => [c.id, c.name]) : []);
  const dIds = ds.map((d) => d.id);
  const nm = new Map(dIds.length ? all<any>(`select id, first_name f, last_name l from driver where id in (${dIds.map(() => "?").join(",")})`, ...dIds).map((d) => [d.id, d]) : []);
  const live = ts[0]?.live;
  return (
    <>
      {heading && <div className="sec-head"><div><p className="kicker">Teams</p><h2 className="cn-h2">{year} 年的 {ts.length} 支车队</h2></div><span className="sub">{year < 1958 ? "1958 年前未设车队锦标赛，按出赛排序" : `按${live ? "当前" : "最终"}车队积分排名`}</span></div>}
      <div className={s.teamCards}>
        {ts.map((tm) => {
          const drivers = ds.filter((d) => d.teams.includes(tm.id));
          const car = year === 2026 && tm.id in TEAMS_2026 ? teamCar(tm.id, 800) : null;
          return (
            <TeamCard key={tm.id} id={tm.id} name={zhName.team(tm.id) ?? tm.name} latin={zhName.team(tm.id) ? tm.name : null}
              color={teamColor(tm.id, "#3a3a44")} href={`/teams/${tm.id}?year=${year}`} year={year} car={car}
              drivers={drivers.slice(0, 4).map((d) => ({ id: d.id, first: nm.get(d.id)?.f ?? "", last: nm.get(d.id)?.l ?? d.name }))}
              more={drivers.length > 4 ? drivers.length - 4 : undefined}
              stats={tm.pos ? [{ v: `P${tm.pos}`, k: "Pos" }, { v: tm.points, k: "PTS" }, { v: tm.wins, k: "Wins" }] : [{ v: tm.races, k: "Races" }, { v: tm.wins, k: "Wins" }]}
              honour={tm.champ ? <Laurel tone="white" onColor size={30} top="车队冠军" /> : null}
              sub={<>
                {tm.chassis.slice(0, 3).map((ch: string, i: number) => <span key={ch}>{i ? " / " : ""}<Link href={`/cars/${ch}`} className="lat">{chassisName.get(ch) ?? ch}</Link></span>)}
                {tm.chassis.length > 0 && " · "}{tm.engines.map((e: string) => ENGINE_ZH[e] ?? e).join(" / ")} 引擎
              </>} />
          );
        })}
      </div>
    </>
  );
}
