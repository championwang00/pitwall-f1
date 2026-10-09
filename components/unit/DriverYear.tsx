import Link from "next/link";
import { teamColor, flag } from "@/lib/assets";
import { gpZh, ENGINE_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import Person from "@/components/entity/Person";
import Team from "@/components/entity/Team";
import Laurel from "@/components/entity/Laurel";
import type { driverYear } from "@/lib/yearData";
import u from "./unit.module.css";

type D = ReturnType<typeof driverYear>;

/** Driver page, ?year=Y (spec §4.1): season card, round-by-round strip, team-mate comparison. */
export default function DriverYear({ id, year, d, name }: { id: string; year: number; d: D; name: string }) {
  const l = d.line;
  const team = l?.team ?? d.entries[0]?.team;
  const c = teamColor(team, "#3a3a44");
  const tName = (t: string, fb?: string) => zhName.team(t) ?? fb ?? t;
  const posLabel = (r: any) => (r.pos ? `P${r.pos}` : r.posText === "DNS" ? "未起步" : r.posText === "DNQ" || r.posText === "DNPQ" ? "未晋级" : r.posText === "DSQ" ? "取消" : "退赛");
  const cls = (r: any) => (!r ? u.out : r.pos === 1 ? u.p1 : r.pos === 2 ? u.p2 : r.pos === 3 ? u.p3 : r.points > 0 ? u.pts : !r.pos ? u.dnf : "");
  return (
    <>
      <div className={`${u.season} f1-surface`} style={{ ["--c" as any]: c }}>
        <div className={u.sBody}>
          <div className={u.sKick}>
            {d.entries.map((e: any) => (
              <span key={e.team} style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Team id={e.team} name={tName(e.team, e.teamName)} size={26} onDark href={`/teams/${e.team}?year=${year}`} />
                {e.cars.map((ch: any) => <Link key={ch.id} href={`/cars/${ch.id}`} className="lat">{ch.name}</Link>)}
                <em>{ENGINE_ZH[e.engine] ?? e.engineName} 引擎{d.entries.length > 1 && e.rounds_text ? ` · 第 ${e.rounds_text} 站` : ""}</em>
              </span>
            ))}
          </div>
          {l?.champ && <span><Laurel tone="white" onColor size={44} top={<span className="num">{year}</span>} bottom="世界冠军" /></span>}
          <div className={u.stats}>
            <span className={u.stat}><b>{l?.pos ? `P${l.pos}` : "—"}</b><span>Pos</span></span>
            <span className={u.stat}><b>{l?.points ?? 0}</b><span>PTS</span></span>
            <span className={u.stat}><b>{l?.wins ?? 0}</b><span>Wins</span></span>
            <span className={u.stat}><b>{l?.podiums ?? 0}</b><span>Podiums</span></span>
            <span className={u.stat}><b>{l?.poles ?? 0}</b><span>Poles</span></span>
            <span className={u.stat}><b>{l?.starts ?? 0}</b><span>Races</span></span>
          </div>
        </div>
        <div className={u.sPhoto}><img src={`/api/face/${id}?v=3&s=320&year=${year}`} alt={name} /></div>
      </div>

      <h3 className={u.h3}>逐站成绩</h3>
      <div className={u.strip}>
        {d.rounds.map((r) => {
          const res = r.res;
          return (
            <Link key={r.round} href={`/races/${year}/${r.round}`} className={`${u.rc} ${r.done ? cls(res) : u.out}`} title={`第 ${r.round} 站 · ${gpZh(r.gp)}${res ? ` · ${posLabel(res)}${res.grid ? ` · 第 ${res.grid} 位起步` : ""}` : r.done ? " · 未出赛" : " · 未开赛"}`}>
              {res?.pole ? <i title="杆位">杆</i> : null}
              <em>R{r.round}</em>
              {flag(r.country) ? <img src={flag(r.country)!} alt="" width={16} /> : <span style={{ height: 16 }} />}
              <b>{!r.done ? "·" : res ? (res.pos ? res.pos : posLabel(res)) : "—"}</b>
            </Link>
          );
        })}
      </div>
      <p className={u.legend}>
        <span><i style={{ background: "#c9a227" }} />冠军</span><span><i style={{ background: "#b8bec4" }} />亚军</span><span><i style={{ background: "#b0703a" }} />季军</span>
        <span><i style={{ background: "var(--carbon)" }} />得分</span><span><i style={{ background: "#fff" }} />未得分 / 退赛</span><span>「杆」= 杆位发车</span>
      </p>

      {d.mates.length > 0 && (
        <>
          <h3 className={u.h3}>队友对比</h3>
          <div className={u.mates}>
            {d.mates.map((m) => (
              <div key={m.id} className={u.mate}>
                <div className={u.side}>
                  <Person id={id} year={year} color={c} name={name} size={40} preview={false} />
                  <small>{l?.pos ? `P${l.pos} · ` : ""}{l?.points ?? 0} PTS</small>
                </div>
                <div className={u.h2h} title={`同队同场 ${m.n} 站`}>
                  <b className={m.aheadRace >= m.behindRace ? u.win : u.lose}>{m.aheadRace}</b><span>正赛名次</span><b className={m.behindRace >= m.aheadRace ? u.win : u.lose}>{m.behindRace}</b>
                  <b className={m.aheadGrid >= m.behindGrid ? u.win : u.lose}>{m.aheadGrid}</b><span>发车位</span><b className={m.behindGrid >= m.aheadGrid ? u.win : u.lose}>{m.behindGrid}</b>
                </div>
                <div className={`${u.side} ${u.right}`}>
                  <Person id={m.id} year={year} color={c} name={zhName.driver(m.id) ?? m.name} size={40} />
                  <small>{m.line?.pos ? `P${m.line.pos} · ` : ""}{m.line?.points ?? 0} PTS · 同场 {m.n} 站</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
