import s from "./c.module.css";
import fs from "node:fs";
import path from "node:path";
import { homeData } from "@/lib/home";
import { teamColor, driverPortrait, trackMap, DRIVERS_2026 } from "@/lib/assets";
import { getDriver } from "@/lib/f1";
import Countdown from "@/components/ui/Countdown";
import Tunnel from "./Tunnel";

export const dynamic = "force-dynamic";

export default async function PocC() {
  const d = await homeData();
  const circuits = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/circuits.json"), "utf8"));
  const c = circuits[d.next?.circuit_id ?? ""];
  const rings = [...d.seasons].map((x: any) => ({ year: x.year, color: teamColor(x.champTeam, "#8a8a94"), races: x.races }));
  const champs = d.seasons.slice(0, 12);
  const sessions = d.weekend?.sessions ?? [];
  const upcoming = sessions.find((x) => new Date(x.date_start) > new Date()) ?? sessions[0];
  let fn = 0;
  return (
    <div className={s.root}>
      <section className={s.hero}>
        <Tunnel seasons={rings} />
        <header className={s.top}>
          <a className={s.brand} href="#">PITWALL<span>年鉴</span></a>
          <nav className={s.nav}>
            <a href="#">年份</a><a href="#">赛道</a><a href="#">车手</a><a href="#">车队</a><a href="#">赛车</a><a href="#" className={s.liveLink}>实时</a>
          </nav>
        </header>
        <div className={s.heroCopy}>
          <p className={s.kicker}>Formula 1 · 1950 — {d.last.year}</p>
          <h1 className={s.year}>{d.last.year}</h1>
          <p className={s.dek}>七十七个赛季，{d.seasons.reduce((a: number, x: any) => a + x.races, 0)} 场正赛。每一圈都是一个赛季，颜色是那一年冠军车队的颜色。</p>
        </div>
        {upcoming && (
          <div className={s.nextBox}>
            <span>第 {d.next?.round} 站 · {(d.next?.gpFullName ?? "").replace(/ Grand Prix$/, "")}</span>
            <Countdown to={upcoming.date_start} className={s.count} unitClassName={s.u} />
          </div>
        )}
      </section>

      <section className={s.strip}>
        {d.seasons.slice().reverse().map((x: any) => (
          <a key={x.year} href="#" className={s.tick} style={{ ["--c" as any]: teamColor(x.champTeam, "#5a5a64") }} title={`${x.year}`}>
            <i />
            {x.year % 10 === 0 && <span>{x.year}</span>}
          </a>
        ))}
      </section>

      <section className={s.editorial}>
        <div className={s.col1}>
          <p className={s.kicker2}>本周 · 第 {d.next?.round} 站</p>
          <h2 className={s.h2}>{c?.nameZh}</h2>
          <p className={s.lede}>{c?.summary}</p>
          <img className={s.map} src={trackMap(d.next?.circuit_id ?? "", 600) ?? ""} alt="" />
        </div>
        <ol className={s.moments}>
          {(c?.moments ?? []).map((m: any) => {
            fn++;
            return (
              <li key={m.year + m.title}>
                <span className={s.mYear}>{m.year}</span>
                <div>
                  <h3>{m.title}<sup>{fn}</sup></h3>
                  <p>{m.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <ol className={s.notes}>
          {(c?.moments ?? []).map((m: any, i: number) => (
            <li key={i}><sup>{i + 1}</sup> <a href={m.sources[0].url}>{m.sources[0].label}</a></li>
          ))}
        </ol>
      </section>

      <section className={s.champs}>
        <h2 className={s.h2}>最近十二位世界冠军</h2>
        <div className={s.champGrid}>
          {champs.map((x: any) => {
            const drv = getDriver(x.champ);
            const img = driverPortrait(x.champ, 300);
            return (
              <a key={x.year} href="#" className={s.champ} style={{ ["--c" as any]: teamColor(x.champTeam, "#5a5a64") }}>
                <span className={s.cYear}>{x.year}</span>
                {img ? <img src={img} alt="" /> : <span className={s.noImg} />}
                <b>{drv?.last_name}</b>
                <em>{DRIVERS_2026[x.champ]?.nameZh ?? drv?.name}</em>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
