import { allSeasons } from "@/lib/f1";
import { all } from "@/lib/db";
import { regulations } from "@/lib/content";
import { teamColor, teamColorAt } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import { Suspense } from "react";
import YearRail, { type RailEra } from "./YearRail";
import s from "./rail.module.css";

/** Left year rail + content: shared by the season hub and single-race pages so the year is always one click away. */
export default function YearShell({ children }: { children: React.ReactNode }) {
  const seasons = allSeasons(); // newest first
  const leaders = new Map(all<any>("select year, driver_id id from season_driver_standing where position_number = 1").map((r) => [r.year, r.id]));
  const surname = (id: string | null) => {
    if (!id) return null;
    const zh = zhName.driver(id);
    return zh ? zh.split(/[·・]/).pop()! : all<any>("select last_name n from driver where id = ?", id)[0]?.n ?? null;
  };
  // the champion's (or leader's) own team that year → row colour; plus the per-section label columns (spec v4 §1.2.4)
  const champTeamOf = new Map(all<any>(`select s.year, (select rr.constructor_id from race_result rr join race r on r.id = rr.race_id
      where r.year = s.year and rr.driver_id = s.driver_id order by r.round desc limit 1) t
    from season_driver_standing s where s.position_number = 1`).map((r) => [r.year, r.t as string]));
  const champCar = new Map(all<any>(`select s.year, (select ch.name from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id
      where sec.year = s.year and sec.constructor_id = (select rr.constructor_id from race_result rr join race r on r.id = rr.race_id
        where r.year = s.year and rr.driver_id = s.driver_id order by r.round desc limit 1) limit 1) car
    from season_driver_standing s where s.position_number = 1`).map((r) => [r.year, r.car as string | null]));
  const eras: RailEra[] = [];
  const list = (regulations()?.eras ?? []).slice().sort((a: any, b: any) => b.years[0] - a.years[0]);
  for (const er of list) {
    const ys = seasons.filter((x: any) => x.year >= er.years[0] && x.year <= er.years[1] && !eras.some((e) => e.years.some((y) => y.year === x.year)));
    if (!ys.length) continue;
    eras.push({
      id: er.id, title: er.title, summary: er.summary ?? "", from: er.years[0], to: er.years[1],
      years: ys.map((x: any) => ({
        year: x.year,
        color: teamColorAt(champTeamOf.get(x.year), x.year, "#8a8a94"),
        champ: surname(x.champ ?? leaders.get(x.year) ?? null),
        champTeam: x.champTeam ? zhName.team(x.champTeam) ?? x.champTeam : champTeamOf.get(x.year) ? zhName.team(champTeamOf.get(x.year)!) : null,
        champCar: champCar.get(x.year) ?? null,
        rounds: `${x.races} 站`,
        live: !x.champ,
      })),
    });
  }
  return (
    <div className={s.shell}>
      <Suspense fallback={<nav className={s.rail} />}><YearRail eras={eras} latest={seasons[0].year} /></Suspense>
      <div className={s.main}>{children}</div>
    </div>
  );
}
