import t from "@/components/season/tab.module.css";
import c from "./circuit.module.css";
import { yearCircuits } from "@/lib/yearData";
import { all } from "@/lib/db";
import { gpZh } from "@/lib/names";
import { zhName } from "@/lib/zh";
import Link from "next/link";
import EntityLink from "@/components/entity/EntityLink";
import { weekendRange } from "@/components/ui/RaceCard";
import CircuitCard from "./CircuitCard";
import YearSpan from "@/components/entity/YearSpan";

/**
 * 「Y 年的 N 条赛道」: every circuit used that year as formula1.com race-style cards (card + name → the circuit in that year, the GP name → that
 * year's race: a circuit is clicked to reach the circuit, user: 点击某条赛道为啥会去历史) — where that year sits in each
 * circuit's own history (no podium: that is the 赛历 tab's card — spec §0.8.7). One implementation for /seasons/Y/circuits, the top block of
 * /circuits (current season) and /circuits?year=Y (spec §4.7); links carry ?year=Y (§4.8).
 */
/** `kicker`: the index page passes 「Season」; a year-hub tab passes nothing — the tab bar is its kicker (spec §0.8.7) */
export default function YearCircuitsGrid({ year, heading = true, kicker = null }: { year: number; heading?: boolean; kicker?: string | null }) {
  const { races, dropped } = yearCircuits(year);
  const cn = new Map(all<any>("select id, name from circuit").map((x) => [x.id, x.name]));
  const cname = (id: string) => zhName.circuit(id) ?? cn.get(id) ?? id;
  const uniq = [...new Map(races.map((r: any) => [r.circuit, r])).values()];
  const fresh = uniq.filter((r: any) => r.isNew), back = uniq.filter((r: any) => r.returning), bye = uniq.filter((r: any) => r.farewell);
  // a circuit name → that circuit in the year it is about (dropped ones: the year before, when they last raced)
  const linkList = (ids: string[], y = year) => ids.map((id, i) => <span key={id}>{i ? "、" : ""}<EntityLink kind="circuit" id={id} year={y} className="ilink">{cname(id)}</EntityLink></span>);
  return (
    <>
      {heading && <div className="sec-head"><div>{kicker && <p className="kicker">{kicker}</p>}<h2 className="cn-h2"><YearSpan from={year} /> 年的 {uniq.length} 条赛道</h2></div><span className="sub">点赛道看它这一年的比赛与它在哪些年份出现在锦标赛里</span></div>}
      {(fresh.length > 0 || back.length > 0 || dropped.length > 0 || bye.length > 0) && (
        <p className={t.summary}>
          {fresh.length > 0 && <span><b>首次登场</b> {linkList(fresh.map((r: any) => r.circuit))}</span>}
          {back.length > 0 && <span><b>回归</b> {linkList(back.map((r: any) => r.circuit))}</span>}
          {dropped.length > 0 && <span><b>较 <span className="num"><YearSpan from={year - 1} /></span> 年告别</b> {linkList(dropped, year - 1)}</span>}
          {bye.length > 0 && <span><b>此后再未举办</b> {linkList(bye.map((r: any) => r.circuit))}</span>}
        </p>
      )}
      <ul className={c.grid}>
        {races.map((r: any) => (
          <CircuitCard year={year} round={r.round} key={r.round} id={r.circuit} name={cname(r.circuit)} href={`/circuits/${r.circuit}?year=${year}`} country={r.country}
            outline={year >= 2023 /* the official outline is today's layout */}
            label={`Round ${r.round}`}
            tag={r.isNew ? "首次登场" : r.returning ? "回归" : r.farewell ? "最后一次" : null} tagTone={r.isNew ? "red" : r.farewell ? "ink" : undefined}
            date={weekendRange(null, r.date)}
            sub={<><EntityLink kind="race" id={`${year}-${r.round}`} className="hlink">{gpZh(r.gp)}</EntityLink> · {r.place_name}</>}
            stats={[{ v: <>{r.nth}<small className={t.of}>/{r.total}</small></>, k: "届次" }, { v: <YearSpan from={r.firstYear} to={r.lastYear} />, k: "年份" }]} />
        ))}
      </ul>
    </>
  );
}
