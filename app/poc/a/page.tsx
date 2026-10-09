import s from "./a.module.css";
import { homeData } from "@/lib/home";
import { driverPortrait, raceCard, teamColor, teamLogo, teamCar, trackMap, DRIVERS_2026, TEAMS_2026, flag } from "@/lib/assets";
import { SESSION_ZH } from "@/lib/openf1";
import Countdown from "@/components/ui/Countdown";
import LocalTime from "@/components/ui/LocalTime";
import TrackHero from "./TrackHero";

export const dynamic = "force-dynamic";

export default async function PocA() {
  const d = await homeData();
  const n = d.next;
  const sessions = d.weekend?.sessions ?? [];
  const upcoming = sessions.find((x) => new Date(x.date_start) > new Date()) ?? sessions[0];
  const podium = d.lastResults.slice(0, 3);
  return (
    <div className={s.root}>
      <header className={s.mast}>
        <div className={s.mastInner}>
          <a className={s.brand} href="#">
            <span className={s.slash} aria-hidden />
            PITWALL
          </a>
          <nav className={s.nav}>
            {["实时", "赛历", "年份", "赛道", "车手", "车队", "赛车"].map((x, i) => (
              <a key={x} className={i === 0 ? s.navLive : undefined} href="#">{x}</a>
            ))}
          </nav>
          <button className={s.search}>搜索车手、车队、赛道、年份<kbd>⌘K</kbd></button>
        </div>
        {upcoming && (
          <div className={s.ticker}>
            <div className={s.mastInner}>
              <span className={s.tickerPlace}><img src={flag(n?.country) ?? ""} alt="" />{d.weekend?.meeting.location ?? n?.place_name}</span>
              <b className={s.tickerSession}>{SESSION_ZH[upcoming.session_name] ?? upcoming.session_name}</b>
              <Countdown to={upcoming.date_start} className={s.tickerCount} unitClassName={s.unit} />
            </div>
          </div>
        )}
      </header>

      <section className={s.hero}>
        <div className={s.heroPhoto} style={{ backgroundImage: `url(${raceCard(n?.grand_prix_id ?? "", 1600)})` }}>
          <div className={s.heroShade} />
          <div className={s.heroText}>
            <p className={s.eyebrow}>第 {n?.round} 站 · 下一站</p>
            <h1 className={s.heroTitle}>{(n?.gpFullName ?? "").replace(/ Grand Prix$/, "")}</h1>
            <p className={s.heroSub}>{n?.official_name}</p>
            <ol className={s.sessions}>
              {sessions.map((x) => (
                <li key={x.session_key}>
                  <span>{SESSION_ZH[x.session_name] ?? x.session_name}</span>
                  <LocalTime iso={x.date_start} format="weekday" className={s.dow} />
                  <LocalTime iso={x.date_start} format="date" />
                  <LocalTime iso={x.date_start} format="time" className={s.time} />
                </li>
              ))}
            </ol>
            <div className={s.ctaRow}>
              <a className={s.ctaRed} href="#">加入日历</a>
              <a className={s.ctaGhost} href="#">实时计时</a>
            </div>
          </div>
        </div>
        <div className={s.heroTrack}>
          {d.track && <TrackHero points={d.track.points} />}
          <div className={s.trackMeta}>
            <div><b>{n?.length?.toFixed(3)}</b><span>公里 / 圈</span></div>
            <div><b>{n?.turns}</b><span>个弯角</span></div>
            <div><b>{n?.scheduled_laps ?? n?.laps}</b><span>圈</span></div>
          </div>
          <p className={s.trackNote}>{n?.circuitName} · 遥测还原 {d.track?.year} 排位最快圈 · 高度 ×4</p>
        </div>
      </section>

      <section className={s.paper}>
        <div className={s.wrap}>
          <div className={s.secHead}>
            <h2 className={s.h2}>上一站</h2>
            <p className={s.secSub}>{d.lastRace.official_name}</p>
          </div>
          <div className={s.podium}>
            {podium.map((r: any, i: number) => {
              const meta = DRIVERS_2026[r.driver_id];
              const col = teamColor(r.constructor_id);
              return (
                <a key={r.driver_id} className={s.podCard} style={{ ["--team" as any]: col }} href="#">
                  <span className={s.podPos}>{i + 1}</span>
                  <div className={s.podName}>
                    <span>{r.driverName.split(" ").slice(0, -1).join(" ")}</span>
                    <b>{r.driverName.split(" ").slice(-1)}</b>
                    <em>{meta?.nameZh} · {TEAMS_2026[r.constructor_id as keyof typeof TEAMS_2026]?.short}</em>
                  </div>
                  <img className={s.podImg} src={driverPortrait(r.driver_id, 480) ?? ""} alt="" />
                  <span className={s.podTime}>{i === 0 ? r.time : r.gap}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className={s.paper2}>
        <div className={s.wrap}>
          <div className={s.secHead}>
            <h2 className={s.h2}>积分榜</h2>
            <p className={s.secSub}>{d.last.year} 赛季 · 第 {d.last.round} 站后</p>
          </div>
          <div className={s.standGrid}>
            <ol className={s.standList}>
              {d.drivers.slice(0, 10).map((r: any) => {
                const max = d.drivers[0].points || 1;
                return (
                  <li key={r.driver} style={{ ["--team" as any]: teamColor(r.team) }}>
                    <span className={s.sPos}>{r.pos}</span>
                    <img src={driverPortrait(r.driver, 96) ?? ""} alt="" className={s.sImg} />
                    <span className={s.sName}><b>{r.last_name}</b><em>{DRIVERS_2026[r.driver]?.nameZh}</em></span>
                    <span className={s.sBar}><i style={{ width: `${(r.points / max) * 100}%` }} /></span>
                    <span className={s.sPts}>{r.points}</span>
                  </li>
                );
              })}
            </ol>
            <ol className={s.teamList}>
              {d.teams.map((t: any) => (
                <li key={t.team} style={{ ["--team" as any]: teamColor(t.team) }}>
                  <span className={s.sPos}>{t.pos}</span>
                  <span className={s.tLogo}><img src={teamLogo(t.team, 64) ?? ""} alt="" /></span>
                  <span className={s.sName}><b>{TEAMS_2026[t.team as keyof typeof TEAMS_2026]?.short ?? t.name}</b></span>
                  <span className={s.sPts}>{t.points}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className={s.dark}>
        <div className={s.wrap}>
          <div className={s.secHead}>
            <h2 className={`${s.h2} ${s.h2Light}`}>从任一维度进入</h2>
            <p className={s.secSubLight}>年份 × 赛道 × 车手 × 车队，1950 — 2026 全部 {d.seasons.reduce((a: number, x: any) => a + x.races, 0)} 场正赛</p>
          </div>
          <div className={s.units}>
            <a className={s.unit} href="#">
              <span className={s.unitK}>年份</span>
              <span className={s.unitBig}>1950<br />2026</span>
              <span className={s.unitN}>{d.seasons.length} 个赛季</span>
            </a>
            <a className={s.unit} href="#">
              <span className={s.unitK}>赛道</span>
              <img className={s.unitTrack} src={trackMap("monaco", 400) ?? ""} alt="" />
              <span className={s.unitN}>78 条赛道</span>
            </a>
            <a className={s.unit} href="#">
              <span className={s.unitK}>车手</span>
              <div className={s.unitFaces}>
                {["lewis-hamilton", "max-verstappen", "charles-leclerc", "lando-norris"].map((x) => <img key={x} src={driverPortrait(x, 200) ?? ""} alt="" />)}
              </div>
              <span className={s.unitN}>917 位车手</span>
            </a>
            <a className={s.unit} href="#">
              <span className={s.unitK}>车队</span>
              <img className={s.unitCar} src={teamCar("ferrari", 800) ?? ""} alt="" />
              <span className={s.unitN}>187 支车队 · 1153 台赛车</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
