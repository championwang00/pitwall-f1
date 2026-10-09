import { all, get } from "./db";
import { getChassis, getDriver, getConstructor, getCircuit } from "./f1";
import { zhName } from "./zh";
import { NAT_ZH } from "./names";

export const overviewSource = { label: "F1DB · 参赛与成绩档案", url: "https://github.com/f1db/f1db" };
const span = (a: number, b: number) => a === b ? `${a} 年` : `${a}–${b} 年`;
/** A factual offline introduction when editorial/Wikipedia text is unavailable. No invented history or specifications. */
export function entityOverview(kind: "car" | "driver" | "team" | "circuit", id: string): string | null {
  if (kind === "car") {
    const ch = getChassis(id);
    if (!ch) return null;
    const years = [...new Set<number>(ch.seasons.map((x: any) => x.year))];
    const name = ch.full_name || ch.name;
    const team = zhName.team(ch.constructor_id) ?? ch.constructorName;
    const drivers = [...new Map(ch.drivers.map((d: any) => [d.id, zhName.driver(d.id) ?? d.name])).values()];
    const engines = [...new Set<string>(ch.seasons.map((s: any) => s.engineName).filter(Boolean))];
    return [`${name} 是${team}用于${years.length ? span(years[0], years.at(-1)!) : "F1 世界锦标赛"}的赛车。`,
      engines.length ? `搭载${engines.join("、")}动力单元。` : "",
      drivers.length ? `该时期的参赛车手包括${drivers.slice(0, 6).join("、")}${drivers.length > 6 ? "等" : ""}。` : ""].join("");
  }
  if (kind === "driver") {
    const d = getDriver(id); if (!d) return null;
    const name = zhName.driver(id) ?? d.name;
    const years = get<{ a: number; b: number }>("select min(r.year) a, max(r.year) b from race_result rr join race r on r.id=rr.race_id where rr.driver_id=?", id);
    const origin = NAT_ZH[d.nationality_country_id];
    return [`${name}${origin ? `是${origin}车手` : "是一名赛车手"}。`,
      years?.a ? `在${span(years.a, years.b)}参加 F1 世界锦标赛，累计${d.total_race_starts}次正赛起步。` : d.date_of_birth ? `出生于${d.date_of_birth}。` : "",
      d.total_race_wins ? `取得${d.total_race_wins}场分站胜利、${d.total_podiums}次领奖台。` : d.total_podiums ? `取得${d.total_podiums}次领奖台。` : "",
      d.total_championship_wins ? `共夺得${d.total_championship_wins}次车手世界冠军。` : ""].join("");
  }
  if (kind === "team") {
    const t = getConstructor(id); if (!t) return null;
    const yrs = get<{ a: number; b: number }>("select min(year) a,max(year) b from season_entrant_constructor where constructor_id=?", id);
    return [`${zhName.team(id) ?? t.name}是一支${NAT_ZH[t.country_id] ?? ""}赛车队。`, yrs?.a ? `在${span(yrs.a, yrs.b)}的 F1 世界锦标赛参赛档案中使用这一车队名称。` : "",
      `累计取得${t.total_race_wins}场分站胜利、${t.total_pole_positions}个杆位${t.total_championship_wins ? `，夺得${t.total_championship_wins}次车队世界冠军` : ""}。`].join("");
  }
  const c = getCircuit(id); if (!c) return null;
  const yrs = get<{ a: number; b: number }>("select min(year) a,max(year) b from race where circuit_id=? and exists(select 1 from race_result where race_id=race.id)", id);
  return [`${zhName.circuit(id) ?? c.name}位于${NAT_ZH[c.country_id] ?? ""}${c.place_name ? `的${c.place_name}` : ""}。`,
    c.length ? `赛道全长${c.length.toFixed(3)}公里${c.turns ? `，共${c.turns}个弯` : ""}。` : "",
    yrs?.a ? `在${span(yrs.a, yrs.b)}举办过 F1 世界锦标赛比赛。` : ""].join("");
}
