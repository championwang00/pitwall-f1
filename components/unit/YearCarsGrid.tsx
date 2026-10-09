import s from "@/components/index/index.module.css";
import { yearTeams } from "@/lib/yearData";
import { all } from "@/lib/db";
import { teamCar, teamColor, TEAMS_2026 } from "@/lib/assets";
import { ENGINE_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import CarCard, { carPicture } from "@/components/index/CarCard";

/** 「Y 年的 N 台赛车」: every chassis raced that year as car cards, by constructors' position (/seasons/Y/cars and /cars?year=Y, spec §4.7). */
export default function YearCarsGrid({ year, heading = true }: { year: number; heading?: boolean }) {
  const ts = yearTeams(year);
  const rows = all<any>(
    `select sec.constructor_id team, sec.chassis_id id, ch.name, sec.engine_manufacturer_id engine, em.name engineName, group_concat(distinct sed.driver_id) drivers
     from season_entrant_chassis sec join chassis ch on ch.id = sec.chassis_id left join engine_manufacturer em on em.id = sec.engine_manufacturer_id
     left join season_entrant_driver sed on sed.year = sec.year and sed.entrant_id = sec.entrant_id and sed.constructor_id = sec.constructor_id and sed.test_driver = 0
     where sec.year = ? group by sec.constructor_id, sec.chassis_id`, year);
  const order = new Map(ts.map((t, i) => [t.id, i]));
  const cars = rows.filter((r) => order.has(r.team)).sort((a, b) => order.get(a.team)! - order.get(b.team)!);
  const line = new Map(ts.map((t) => [t.id, t]));
  const ids = [...new Set(cars.flatMap((r) => String(r.drivers ?? "").split(",").filter(Boolean)))];
  const dname = new Map(ids.length ? all<any>(`select id, name from driver where id in (${ids.map(() => "?").join(",")})`, ...ids).map((d) => [d.id, d.name]) : []);
  return (
    <>
      {heading && <div className="sec-head"><div><p className="kicker">Cars</p><h2 className="cn-h2">{year} 年的 {cars.length} 台赛车</h2></div><span className="sub">按车队积分排序；点赛车看它的成绩与技术档案</span></div>}
      <div className={s.carGrid}>
        {cars.map((r) => {
          const official = year === 2026 && r.team in TEAMS_2026 ? teamCar(r.team, 700) : null;
          const t = line.get(r.team);
          const ds = String(r.drivers ?? "").split(",").filter(Boolean).slice(0, 4);
          return (
            <CarCard key={r.team + r.id} id={r.id} name={r.name} team={r.team} teamName={zhName.team(r.team) ?? r.team} color={teamColor(r.team, "#3a3a44")} year={year}
              img={official ?? carPicture(r.id, r.team)} photo={!official}
              rank={t?.pos ? <span className={s.carRank}>P{t.pos}{t.champ ? " · 车队冠军" : ""}</span> : null}
              engine={<>{ENGINE_ZH[r.engine] ?? r.engineName ?? r.engine} 引擎</>}
              drivers={ds.map((d) => ({ id: d, name: zhName.driver(d) ?? dname.get(d) ?? d }))} />
          );
        })}
      </div>
    </>
  );
}
