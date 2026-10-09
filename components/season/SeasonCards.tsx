import Link from "next/link";
import s from "./bigcard.module.css";
import { allSeasons } from "@/lib/f1";
import { all } from "@/lib/db";
import { teamColor, teamColorAt } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import DriverCard from "@/components/entity/DriverCard";
import Team from "@/components/entity/Team";

/**
 * One formula1.com driver card per season: the year as the big Formula1 Digits numeral, the champion (or the points
 * leader while the season runs) in HIS team colour and photo of THAT year, title laurel. Card → the season;
 * the driver and teams inside are mentions (hover intro, year-context links).
 */
export default function SeasonCards({ years, current, tab = "" }: { years: number[]; current?: number; tab?: string }) {
  const seasons = allSeasons();
  const names = new Map(all<any>("select id, name from driver").map((d) => [d.id, d.name]));
  const tnames = new Map(all<any>("select id, name from constructor").map((d) => [d.id, d.name]));
  const nth = new Map<number, number>();
  const tally = new Map<string, number>();
  for (const y of [...seasons].sort((a: any, b: any) => a.year - b.year)) {
    if (!y.champ) continue;
    tally.set(y.champ, (tally.get(y.champ) ?? 0) + 1);
    nth.set(y.year, tally.get(y.champ)!);
  }
  const ys = seasons.filter((x: any) => years.includes(x.year));
  const who = (y: any) => y.champ ?? all<any>("select driver_id id from season_driver_standing where year = ? and position_number = 1", y.year)[0]?.id;
  const teamOf = (year: number, id: string) => all<any>(
    "select rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = ? order by r.round desc limit 1", year, id)[0]?.t as string | undefined;
  const tn = (id: string) => zhName.team(id) ?? tnames.get(id) ?? id;

  return (
    <div className={s.grid}>
      {ys.map((y: any) => {
        const id = who(y);
        const href = `/seasons/${y.year}${tab}`;
        if (!id) return <Link key={y.year} href={href} className={`${s.card} f1-surface lift`}><span className={s.kicker}>{y.year}</span></Link>;
        const team = teamOf(y.year, id);
        return (
          <DriverCard key={y.year} id={id} year={y.year} color={teamColorAt(team, y.year, "#3a3a44")} href={href} nameHref={`/drivers/${id}?year=${y.year}`}
            preview label={`${y.year} 赛季`} className={`${s.season} ${y.year === current ? s.cur : ""}`}
            name={zhName.driver(id) ?? names.get(id) ?? id} latin={names.get(id)}
            kicker={y.year}
            laurels={[y.champ ? { top: <>第 <span className="num">{nth.get(y.year)}</span> 冠</>, bottom: "世界冠军" } : { top: "积分领跑", bottom: "赛季进行中" }]}
            meta={<div className={s.teamsLine}>
              {team && <Team id={team} name={tn(team)} size={16} onDark year={y.year} />}
              {y.champTeam && y.champTeam !== team && <Team id={y.champTeam} name={tn(y.champTeam)} size={16} onDark year={y.year} sub="车队冠军" />}
            </div>}
            chips={y.champ && y.champTeam && y.champTeam === team ? [{ label: "双冠" }] : undefined}
            stats={[{ v: y.races, k: "分站" }]} />
        );
      })}
    </div>
  );
}
