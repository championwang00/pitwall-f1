import t from "@/components/season/tab.module.css";
import g from "@/components/season/bigcard.module.css";
import { yearDrivers } from "@/lib/yearData";
import { teamColor } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import DriverCard from "@/components/entity/DriverCard";
import Team from "@/components/entity/Team";
import { all } from "@/lib/db";

/**
 * 「Y 年的 N 位车手」: everyone who raced that year, by championship position, as formula1.com driver cards
 * (surface = his team colour THAT year, period portrait). One implementation for /seasons/Y/drivers and the top
 * block of /drivers?year=Y (spec §4.7). Links carry the year context (§4.8): card → /drivers/<id>?year=Y, team → /teams/<id>?year=Y.
 */
export default function YearDriversGrid({ year, heading = true }: { year: number; heading?: boolean }) {
  const ds = yearDrivers(year);
  const rookies = ds.filter((d) => d.first === year);
  const winners = ds.filter((d) => d.wins > 0);
  const live = ds[0]?.live;
  const tname = new Map(all<any>("select distinct c.id, c.name from constructor c join season_entrant_constructor sec on sec.constructor_id = c.id where sec.year = ?", year).map((c) => [c.id, c.name]));
  // the race number he carried (last race of the year) — the big numeral on the card, like F1's number art
  const num = new Map(all<any>(`select rr.driver_id id, rr.driver_number n from race_result rr join race r on r.id = rr.race_id
    where r.year = ? and r.round = (select max(r2.round) from race_result rr2 join race r2 on r2.id = rr2.race_id where r2.year = r.year and rr2.driver_id = rr.driver_id)`, year).map((r) => [r.id, r.n]));
  return (
    <>
      {heading && <div className="sec-head"><div><p className="kicker">Drivers</p><h2 className="cn-h2">{year} 年的 {ds.length} 位车手</h2></div><span className="sub">按{live ? "当前" : "最终"}积分排名</span></div>}
      <p className={t.summary}>
        <span><b>{winners.length}</b> 位分站冠军</span>
        <span><b>{rookies.length}</b> 位新秀</span>
        <span><b>{ds.filter((d) => d.teams.length > 1).length}</b> 位赛季中换过车队</span>
      </p>
      <div className={g.grid}>
        {ds.map((d) => {
          const c = teamColor(d.team, "#3a3a44");
          const laurels = d.champ ? [{ top: "世界冠军" }]
            : !live && d.pos === 2 ? [{ top: "亚军" }] : !live && d.pos === 3 ? [{ top: "季军" }] : [];
          return (
            <DriverCard key={d.id} id={d.id} year={year} size="sm" color={c} href={`/drivers/${d.id}?year=${year}`}
              name={zhName.driver(d.id) ?? d.name} latin={zhName.driver(d.id) ? d.name : null}
              kicker={year === 2026 ? undefined : num.get(d.id) ?? undefined} laurels={laurels}
              meta={<div className={t.dteams}>{d.teams.map((id: string) => <Team key={id} id={id} name={zhName.team(id) ?? tname.get(id) ?? id} size={16} onDark href={`/teams/${id}?year=${year}`} />)}</div>}
              stats={[
                { v: d.pos ? `P${d.pos}` : "—", k: "Pos" },
                { v: d.points, k: "PTS" },
                ...(d.wins ? [{ v: d.wins, k: "Wins" }] : d.podiums ? [{ v: d.podiums, k: "Podium" }] : [{ v: d.starts, k: "Races" }]),
              ]}
              chips={[
                ...(d.first === year ? [{ label: "新秀赛季", solid: true }] : []),
                ...(d.last === year && !live && d.first !== year ? [{ label: <>最后一个赛季 · <span className="num">{d.first}–{d.last}</span></> }] : []),
              ]} />
          );
        })}
      </div>
    </>
  );
}
