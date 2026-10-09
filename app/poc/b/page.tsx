import s from "./b.module.css";
import { homeData } from "@/lib/home";
import { facts } from "@/lib/f1";
import { driverPortrait, teamColor, DRIVERS_2026, TEAMS_2026, flag } from "@/lib/assets";
import { SESSION_ZH } from "@/lib/openf1";
import Countdown from "@/components/ui/Countdown";
import LocalTime from "@/components/ui/LocalTime";
import TrackWall from "./TrackWall";

export const dynamic = "force-dynamic";

function cellClass(f: { pos: number | null; posText: string }) {
  if (!f.pos) return s.cDnf;
  if (f.pos === 1) return s.cWin;
  if (f.pos <= 3) return s.cPod;
  if (f.pos <= 10) return s.cPts;
  return s.cOut;
}

export default async function PocB() {
  const d = await homeData();
  const n = d.next;
  const sessions = d.weekend?.sessions ?? [];
  const upcoming = sessions.find((x) => new Date(x.date_start) > new Date()) ?? sessions[0];
  const season = facts({ year: d.last.year });
  const rounds = d.calendar;
  const byDriver = new Map<string, Map<number, (typeof season)[number]>>();
  for (const f of season) {
    if (!byDriver.has(f.driver)) byDriver.set(f.driver, new Map());
    byDriver.get(f.driver)!.set(f.round, f);
  }
  const leader = d.drivers[0]?.points ?? 0;
  return (
    <div className={s.root}>
      <header className={s.bar}>
        <a className={s.brand} href="#"><i />PITWALL</a>
        <nav className={s.modes}>
          {["年份", "赛道", "车手", "车队"].map((x, i) => <a key={x} className={i === 2 ? s.modeOn : undefined} href="#">{x}</a>)}
        </nav>
        <a className={s.live} href="#"><span className={s.dot} />实时计时</a>
        <a className={s.cal} href="#">赛历</a>
        <button className={s.k}>⌘K</button>
      </header>

      <section className={s.stage}>
        {d.track && <TrackWall points={d.track.points} />}
        <aside className={s.tower}>
          <div className={s.towerHead}>
            <span>积分榜</span>
            <em>R{d.last.round} · {d.last.year}</em>
          </div>
          <ol>
            {d.drivers.slice(0, 22).map((r: any) => (
              <li key={r.driver} style={{ ["--team" as any]: teamColor(r.team) }}>
                <span className={s.tPos}>{r.pos}</span>
                <span className={s.tBar} />
                <span className={s.tAbbr}>{r.abbreviation}</span>
                <span className={s.tGap}>{r.pos === 1 ? `${r.points}` : `-${leader - r.points}`}</span>
              </li>
            ))}
          </ol>
        </aside>
        <div className={s.lower}>
          <div className={s.lowerFlag}><img src={flag(n?.country) ?? ""} alt="" /></div>
          <div className={s.lowerMain}>
            <p className={s.lowerRound}>ROUND {n?.round} · 下一站</p>
            <h1 className={s.lowerTitle}>{(n?.gpFullName ?? "").replace(/ Grand Prix$/, "")}</h1>
            <p className={s.lowerCircuit}>{n?.circuitName} · {n?.length?.toFixed(3)} KM · {n?.turns} 弯 · 夜赛</p>
          </div>
          {upcoming && (
            <div className={s.lowerCount}>
              <span>{SESSION_ZH[upcoming.session_name]} 倒计时</span>
              <Countdown to={upcoming.date_start} className={s.count} unitClassName={s.u} />
            </div>
          )}
        </div>
        <ol className={s.sched}>
          {sessions.map((x) => (
            <li key={x.session_key} className={x.session_name === "Race" ? s.schedRace : undefined}>
              <b>{SESSION_ZH[x.session_name] ?? x.session_name}</b>
              <LocalTime iso={x.date_start} format="datetime" />
            </li>
          ))}
        </ol>
      </section>

      <section className={s.matrixSec}>
        <div className={s.secHead}>
          <h2>{d.last.year} 赛季 · 车手 × 分站</h2>
          <div className={s.legend}>
            <span className={s.cWin}>冠军</span><span className={s.cPod}>领奖台</span><span className={s.cPts}>积分</span><span className={s.cOut}>无积分</span><span className={s.cDnf}>退赛</span>
          </div>
        </div>
        <div className={s.matrix} style={{ gridTemplateColumns: `200px repeat(${rounds.length}, minmax(0,1fr)) 64px` }}>
          <div className={s.mCorner}>车手</div>
          {rounds.map((r: any) => (
            <div key={r.round} className={s.mHead} title={r.gpFullName}>
              <img src={flag(r.country) ?? ""} alt="" />
              <span>{r.round}</span>
            </div>
          ))}
          <div className={s.mHead}>PTS</div>
          {d.drivers.map((r: any) => (
            <div key={r.driver} className={s.mRow} style={{ ["--team" as any]: teamColor(r.team) }}>
              <div className={s.mName}>
                <img src={driverPortrait(r.driver, 64) ?? ""} alt="" />
                <span>{r.last_name}</span>
                <em>{DRIVERS_2026[r.driver]?.nameZh}</em>
              </div>
              {rounds.map((rd: any) => {
                const f = byDriver.get(r.driver)?.get(rd.round);
                return <div key={rd.round} className={`${s.mCell} ${f ? cellClass(f) : s.cNone}`}>{f ? (f.pos ?? "R") : ""}</div>;
              })}
              <div className={s.mPts}>{r.points}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.duel}>
        <div className={s.secHead}><h2>车队 · 积分</h2></div>
        <div className={s.teams}>
          {d.teams.map((t: any) => (
            <div key={t.team} className={s.team} style={{ ["--team" as any]: teamColor(t.team) }}>
              <span className={s.teamPos}>{t.pos}</span>
              <span className={s.teamName}>{TEAMS_2026[t.team as keyof typeof TEAMS_2026]?.short ?? t.name}</span>
              <span className={s.teamBar}><i style={{ width: `${(t.points / (d.teams[0]?.points || 1)) * 100}%` }} /></span>
              <span className={s.teamPts}>{t.points}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
