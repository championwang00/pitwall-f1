import t from "@/components/season/tab.module.css";
import c from "./circuit.module.css";
import { yearCircuits } from "@/lib/yearData";
import { all } from "@/lib/db";
import { teamColor } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import { weekendRange, type PodiumEntry } from "@/components/ui/RaceCard";
import CircuitCard from "./CircuitCard";

/**
 * 「Y 年的 N 条赛道」: every circuit used that year as formula1.com race-style cards (card → that year's race, name → circuit?year=Y) — where that year sits in each
 * circuit's own history, and that race's podium. One implementation for /seasons/Y/circuits, the top block of
 * /circuits (current season) and /circuits?year=Y (spec §4.7); links carry ?year=Y (§4.8).
 */
export default function YearCircuitsGrid({ year, heading = true }: { year: number; heading?: boolean }) {
  const { races, dropped } = yearCircuits(year);
  const cn = new Map(all<any>("select id, name from circuit").map((x) => [x.id, x.name]));
  const cname = (id: string) => zhName.circuit(id) ?? cn.get(id) ?? id;
  const pod = new Map<number, PodiumEntry[]>();
  for (const p of all<any>(`select r.round, rr.position_number pos, rr.driver_id driver, d.abbreviation code, rr.time, rr.gap, rr.constructor_id team
      from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
      where r.year = ? and rr.position_number <= 3 order by r.round, rr.position_number`, year))
    pod.set(p.round, [...(pod.get(p.round) ?? []), { pos: p.pos, driver: p.driver, code: p.code ?? p.driver.slice(0, 3).toUpperCase(), time: p.pos === 1 ? p.time : p.gap, color: teamColor(p.team, "#3a3a44"), year }]);
  const uniq = [...new Map(races.map((r: any) => [r.circuit, r])).values()];
  const fresh = uniq.filter((r: any) => r.isNew), back = uniq.filter((r: any) => r.returning), bye = uniq.filter((r: any) => r.farewell);
  // most specific unit: a circuit raced this year → that race; otherwise the circuit's page in this year's context
  const roundOf = new Map(races.map((r: any) => [r.circuit, r.round]));
  const linkList = (ids: string[]) => ids.map((id, i) => <span key={id}>{i ? "、" : ""}<EntityLink kind="circuit" id={id} href={roundOf.has(id) ? `/races/${year}/${roundOf.get(id)}` : `/circuits/${id}?year=${year}`} className="ilink">{cname(id)}</EntityLink></span>);
  return (
    <>
      {heading && <div className="sec-head"><div><p className="kicker">Circuits</p><h2 className="cn-h2">{year} 年的 {uniq.length} 条赛道</h2></div><span className="sub">点赛道看它这一年的比赛与它在哪些年份出现在锦标赛里</span></div>}
      {(fresh.length > 0 || back.length > 0 || dropped.length > 0 || bye.length > 0) && (
        <p className={t.summary}>
          {fresh.length > 0 && <span><b>首次登场</b> {linkList(fresh.map((r: any) => r.circuit))}</span>}
          {back.length > 0 && <span><b>回归</b> {linkList(back.map((r: any) => r.circuit))}</span>}
          {dropped.length > 0 && <span><b>较 <span className="num">{year - 1}</span> 年告别</b> {linkList(dropped)}</span>}
          {bye.length > 0 && <span><b>此后再未举办</b> {linkList(bye.map((r: any) => r.circuit))}</span>}
        </p>
      )}
      <ul className={c.grid}>
        {races.map((r: any) => (
          <CircuitCard key={r.round} id={r.circuit} name={cname(r.circuit)} href={`/races/${year}/${r.round}`} nameHref={`/circuits/${r.circuit}?year=${year}`} country={r.country}
            outline={year >= 2023 /* the official outline is today's layout */}
            label={`Round ${r.round}`}
            tag={r.isNew ? "首次登场" : r.returning ? "回归" : r.farewell ? "最后一次" : null} tagTone={r.isNew ? "red" : r.farewell ? "ink" : undefined}
            date={weekendRange(null, r.date)}
            sub={<>{gpZh(r.gp)} · {r.place_name}</>}
            stats={[{ v: <>{r.nth}<small className={t.of}>/{r.total}</small></>, k: "Races" }, { v: r.firstYear === r.lastYear ? r.firstYear : `${r.firstYear}–${r.lastYear}`, k: "Seasons" }]}
            podium={pod.get(r.round)} />
        ))}
      </ul>
    </>
  );
}
