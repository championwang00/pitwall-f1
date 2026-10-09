import Link from "next/link";
import { teamColor, teamCar, TEAMS_2026 } from "@/lib/assets";
import { ENGINE_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import DriverCard from "@/components/entity/DriverCard";
import Laurel from "@/components/entity/Laurel";
import g from "@/components/season/bigcard.module.css";
import type { teamYear } from "@/lib/yearData";
import u from "./unit.module.css";

type T = ReturnType<typeof teamYear>;

/** Team page, ?year=Y (spec §4.2): standing + honours, the car(s), the line-up as big driver cards. */
export default function TeamYear({ id, year, t }: { id: string; year: number; t: T }) {
  const c = teamColor(id, "#3a3a44");
  const l = t.line;
  const engines = [...new Set(t.cars.map((x: any) => ENGINE_ZH[x.engine] ?? x.engineName))];
  const champ = t.drivers.find((d) => d.line?.champ);
  return (
    <>
      <div className={u.teamStats}>
        {l?.champ && <Laurel tone="gold" size={52} top={<span className="num">{year}</span>} bottom="车队冠军" />}
        {champ && <Laurel tone="silver" size={52} top={zhName.driver(champ.id)?.split(/[·・]/).pop() ?? champ.name} bottom="车手冠军" />}
        <span className={u.stat}><b>{l?.pos ? `P${l.pos}` : "—"}</b><span>{year < 1958 ? "1958 年前无车队锦标赛" : "Pos"}</span></span>
        <span className={u.stat}><b>{l?.points ?? 0}</b><span>PTS</span></span>
        <span className={u.stat}><b>{l?.wins ?? 0}</b><span>Wins</span></span>
        <span className={u.stat}><b>{l?.podiums ?? 0}</b><span>Podiums</span></span>
        {t.oneTwo > 0 && <span className={u.stat}><b>{t.oneTwo}</b><span>1-2</span></span>}
        <span className={u.stat}><b>{l?.races ?? 0}</b><span>Races</span></span>
      </div>

      <h3 className={u.h3}>赛车与引擎</h3>
      <div className={u.cars}>
        {t.cars.map((ch: any) => {
          const img = year === 2026 && TEAMS_2026[id as keyof typeof TEAMS_2026] ? teamCar(id, 700) : null;
          return (
            <Link key={ch.id} href={`/cars/${ch.id}`} className={`${u.car} f1-surface team-drs lift`} style={{ ["--c" as any]: c }}>
              <b className="lat">{ch.name}</b>
              <span>{ENGINE_ZH[ch.engine] ?? ch.engineName} 引擎</span>
              {img && <img src={img} alt="" />}
            </Link>
          );
        })}
        {t.cars.length === 0 && <p className={u.sub}>F1DB 没有这一年的底盘记录。{engines.join(" / ")}</p>}
      </div>

      <h3 className={u.h3}>阵容 · <span className="num">{t.drivers.length}</span> 位车手</h3>
      <div className={g.grid}>
        {t.drivers.map((d) => {
          const dl = d.line;
          return (
            <DriverCard key={d.id} id={d.id} year={year} color={c} href={`/drivers/${d.id}?year=${year}`}
              name={zhName.driver(d.id) ?? d.name} latin={zhName.driver(d.id) ? d.name : null}
              kicker={year === 2026 ? undefined : d.num ?? undefined}
              laurels={dl?.champ ? [{ top: "世界冠军" }] : []}
              meta={<>为本队出赛 <span className="num">{d.starts}</span> 站 · 最好 <span className="num">P{d.best ?? "—"}</span></>}
              stats={[{ v: dl?.pos ? `P${dl.pos}` : "—", k: "Pos" }, { v: dl?.points ?? 0, k: "PTS" }, ...(d.wins ? [{ v: d.wins, k: "Wins" }] : [{ v: d.podiums, k: "Podiums" }])]}
              chips={[
                ...(dl && dl.teams.length > 1 ? [{ label: "赛季中转队" }] : []),
                ...(dl?.first === year ? [{ label: "新秀赛季", solid: true }] : []),
              ]} />
          );
        })}
      </div>
    </>
  );
}
