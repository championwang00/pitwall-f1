import { teamColorAt } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import Person from "@/components/entity/Person";
import type { driverYear } from "@/lib/yearData";
import u from "./unit.module.css";

type D = ReturnType<typeof driverYear>;

/** Driver page, ?year=Y (spec §4.1): the team-mate comparison. The season card (team · car · engine · laurel · numbers ·
 *  portrait) is gone — the hero shows all of it (spec §0.7 R2); the round-by-round strip is gone too — the 透视 below
 *  defaults to 按赛道 in a single season, one row per round (spec §0.8.3 D2). */
export default function DriverYear({ id, year, d, name }: { id: string; year: number; d: D; name: string }) {
  const l = d.line;
  const team = l?.team ?? d.entries[0]?.team;
  const c = teamColorAt(team, year, "#3a3a44");
  return (
    <>
      {d.mates.length === 0 ? <p className={u.sub}>本季无同队队友</p> : (
        <>
          <h3 className={u.h3}>队友对比</h3>
          <div className={u.mates}>
            {d.mates.map((m) => (
              <div key={m.id} className={u.mate}>
                <div className={u.side}>
                  <Person id={id} year={year} color={c} name={name} size={40} preview={false} />
                  <small>{l?.pos ? `P${l.pos} · ` : ""}{l?.points ?? 0} 分</small>
                </div>
                <div className={u.h2h} title={`同队同场 ${m.n} 站`}>
                  <b className={m.aheadRace >= m.behindRace ? u.win : u.lose}>{m.aheadRace}</b><span>正赛名次</span><b className={m.behindRace >= m.aheadRace ? u.win : u.lose}>{m.behindRace}</b>
                  <b className={m.aheadGrid >= m.behindGrid ? u.win : u.lose}>{m.aheadGrid}</b><span>发车位</span><b className={m.behindGrid >= m.aheadGrid ? u.win : u.lose}>{m.behindGrid}</b>
                </div>
                <div className={`${u.side} ${u.right}`}>
                  <Person id={m.id} year={year} color={c} name={zhName.driver(m.id) ?? m.name} size={40} />
                  <small>{m.line?.pos ? `P${m.line.pos} · ` : ""}{m.line?.points ?? 0} 分 · 同场 {m.n} 站</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
