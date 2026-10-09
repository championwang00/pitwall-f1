import { teamColorAt } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import DriverCard from "@/components/entity/DriverCard";
import g from "@/components/season/bigcard.module.css";
import type { teamYear } from "@/lib/yearData";
import u from "./unit.module.css";

type T = ReturnType<typeof teamYear>;

/** Team page, ?year=Y (spec §4.2): the line-up as big driver cards. Standing, honours, car and engine are hero tiles /
 *  numbers, so they are not repeated here (spec §0.7 R2). */
export default function TeamYear({ id, year, t }: { id: string; year: number; t: T }) {
  const c = teamColorAt(id, year, "#3a3a44");
  return (
    <>
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
              stats={[{ v: dl?.pos ? `P${dl.pos}` : "—", k: "排名" }, { v: dl?.points ?? 0, k: "积分" }, ...(d.wins ? [{ v: d.wins, k: "胜场" }] : [{ v: d.podiums, k: "领奖台" }])]}
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
