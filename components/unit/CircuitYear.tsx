import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { teamColor, flag } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { zhName } from "@/lib/zh";
import DriverCard from "@/components/entity/DriverCard";
import Person from "@/components/entity/Person";
import Team from "@/components/entity/Team";
import Laurel, { type Tone } from "@/components/entity/Laurel";
import type { circuitYear } from "@/lib/yearData";
import u from "./unit.module.css";

type R = ReturnType<typeof circuitYear>;
const POD: [Tone, string][] = [["gold", "冠军"], ["silver", "亚军"], ["bronze", "季军"]];

/** Circuit page, ?year=Y (spec §4.3): that year's race here — podium, pole, fastest lap, full race, ▶ replay (2023+). */
export default function CircuitYear({ year, races, replay }: { year: number; races: R; replay: Record<number, string | null> }) {
  const dn = (id: string, name: string) => zhName.driver(id) ?? name;
  return (
    <>
      {races.map((r) => (
        <div key={r.id} className={u.race}>
          <div className={u.raceHead}>
            <h3>{flag(r.country) && <img src={flag(r.country)!} alt="" width={24} />}<Link href={`/races/${year}/${r.round}`}>{gpZh(r.gp)}</Link></h3>
            <span className={u.raceMeta}><b>Round {r.round}</b><time className="t-s">{r.date}</time>{r.laps ? <em><span className="num">{r.laps}</span> 圈</em> : null}</span>
          </div>
          {r.podium.length > 0 ? (
            <div className={u.podium}>
              {r.podium.map((p: any, i: number) => (
                <DriverCard key={p.id} id={p.id} year={year} color={teamColor(p.team, "#3a3a44")} href={`/drivers/${p.id}?year=${year}`}
                  name={dn(p.id, p.name)} latin={zhName.driver(p.id) ? p.name : null}
                  kicker={`P${i + 1}`} laurels={[{ top: POD[i][1] }]}
                  meta={<Team id={p.team} name={zhName.team(p.team) ?? p.team} size={16} onDark year={year} />}
                  stats={[{ v: <span className="t-s">{i === 0 ? p.time ?? "—" : p.gap ?? "—"}</span>, k: i === 0 ? "Time" : "Gap" }, ...(p.grid ? [{ v: `P${p.grid}`, k: "Grid" }] : [])]} />
              ))}
            </div>
          ) : <p className={u.sub}>这一站还没有比赛结果。</p>}
          <div className={u.extras}>
            {r.pole && <span className={u.extra}><Laurel tone="red" size={34} top="杆位" /><Person id={r.pole.id} year={year} name={dn(r.pole.id, r.pole.name)} size={30} /></span>}
            {r.fl && <span className={u.extra}><Laurel tone="purple" size={34} top="最快圈" /><Person id={r.fl.id} year={year} name={dn(r.fl.id, r.fl.name)} size={30} /><em className="t-s">{r.fl.time}</em></span>}
          </div>
          <div className={u.actions}>
            <Link href={`/races/${year}/${r.round}`} className={u.full}>完整单场<Icon name="chevron-right" size={16} /></Link>
            {replay[r.round] && <Link href={replay[r.round]!} className={u.replay}><Icon name="play" size={16} />计时回放</Link>}
          </div>
        </div>
      ))}
    </>
  );
}
