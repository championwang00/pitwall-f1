import Link from "next/link";
import EntityLink from "@/components/entity/EntityLink";
import Icon from "@/components/ui/Icon";
import { teamColorAt, flag } from "@/lib/assets";
import { gpZh, gapZh } from "@/lib/names";
import { zhName } from "@/lib/zh";
import DriverCard from "@/components/entity/DriverCard";
import Team from "@/components/entity/Team";
import { type Tone } from "@/components/entity/Laurel";
import type { circuitYear } from "@/lib/yearData";
import u from "./unit.module.css";

type R = ReturnType<typeof circuitYear>;
const POD: [Tone, string][] = [["gold", "冠军"], ["silver", "亚军"], ["bronze", "季军"]];

/** Circuit page, ?year=Y (spec §4.3): that year's race here — podium and the link to the full race. Pole and fastest
 *  lap are the hero's tiles (spec §0.7 R2); ▶ 计时回放 is the hero's action button (spec §0.8.5). */
export default function CircuitYear({ year, races }: { year: number; races: R }) {
  const dn = (id: string, name: string) => zhName.driver(id) ?? name;
  return (
    <>
      {races.map((r) => (
        <div key={r.id} className={u.race}>
          {/* station · round · date · laps are the hero's connection line; a second race that year still needs its name */}
          {races.length > 1 && <div className={u.raceHead}>
            <h3>{flag(r.country) && <img src={flag(r.country)!} alt="" width={24} />}<EntityLink kind="race" id={`${year}-${r.round}`}>{gpZh(r.gp)}</EntityLink></h3>
            <span className={u.raceMeta}><b>第 <span className="num">{r.round}</span> 站</b><time className="t-s">{r.date}</time>{r.laps ? <em><span className="num">{r.laps}</span> 圈</em> : null}</span>
          </div>}
          {r.podium.length > 0 ? (
            <div className={u.podium}>
              {r.podium.map((p: any, i: number) => (
                <DriverCard key={p.id} id={p.id} year={year} color={teamColorAt(p.team, year, "#3a3a44")} href={`/drivers/${p.id}?year=${year}`}
                  name={dn(p.id, p.name)} latin={zhName.driver(p.id) ? p.name : null}
                  kicker={`P${i + 1}`} laurels={[{ top: POD[i][1] }]}
                  meta={<Team id={p.team} name={zhName.team(p.team) ?? p.team} size={16} onDark year={year} />}
                  stats={[{ v: <span className="t-s">{i === 0 ? p.time ?? "—" : gapZh(p.gap) ?? "—"}</span>, k: i === 0 ? "用时" : "差距" }, ...(p.grid ? [{ v: `P${p.grid}`, k: "发车位" }] : [])]} />
              ))}
            </div>
          ) : <p className={u.sub}>这一站还没有比赛结果。</p>}
          <div className={u.actions}>
            <Link href={`/races/${year}/${r.round}`} className={u.full}>完整单场<Icon name="chevron-right" size={16} /></Link>
          </div>
        </div>
      ))}
    </>
  );
}
