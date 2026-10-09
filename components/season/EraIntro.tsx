import Link from "next/link";
import t from "./tab.module.css";
import e from "./era.module.css";
import c from "@/components/unit/circuit.module.css";
import { eras, eraFacts, type Era } from "@/lib/eras";
import { teamColor } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import { all } from "@/lib/db";
import { Linked } from "@/lib/linkify";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import YearSpan from "@/components/entity/YearSpan";
import Team from "@/components/entity/Team";
import Icon from "@/components/ui/Icon";
import CircuitCard from "@/components/unit/CircuitCard";
import SeasonCards from "./SeasonCards";
import ObjectHero from "@/components/entity/ObjectHero";
import { eraHero } from "@/lib/hero";

/**
 * One regulation era: what defined it, its key events, every season's champion, its circuits and dominators.
 * One light surface system (formula1.com): paper page, white cards; the era itself is the only identity card
 * (`full` = /eras/[id]: the dominant team's colour + F1 DRS texture; inside the year hub's Era tab it is a white card,
 * since the year hero above already carries the colour).
 */
export default async function EraIntro({ era, current, full = true }: { era: Era; current?: number; full?: boolean }) {
  const f = eraFacts(era);
  const names = new Map(all<any>("select id, name from driver").map((d) => [d.id, d.name]));
  const list = eras();
  const i = list.findIndex((x) => x.id === era.id);
  const newer = list[i - 1], older = list[i + 1];
  const events = full ? f.events : f.events.slice(0, 4);
  const [a, b] = era.years;
  // a driver inside the era: his last season in it → that year's photo, team colour and year-context link
  const lastIn = (id: string) => all<any>("select r.year y, rr.constructor_id t from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year between ? and ? order by r.year desc, r.round desc limit 1", id, a, b)[0] as { y: number; t: string } | undefined;
  const cinfo = new Map(f.circuits.length ? all<any>(`select id, name, country_id country, place_name place from circuit where id in (${f.circuits.map(() => "?").join(",")})`, ...f.circuits.map((x: any) => x.id)).map((x) => [x.id, x]) : []);

  return (
    <div className={e.page}>
      <section className={e.top}>
        {/* the era card = ObjectHero on the card surface (IA spec v6 §0.6, P0-21): the dominant team's colour, or a
            white card inside the year hub (whose own hero already carries the colour) */}
        <ObjectHero model={(await eraHero(era, full))!} />
      </section>

      <section className={e.band}>
        <div className="wrap">
          <div className={t.eraHead}>
            <div>
              <div className="sec-head"><div><p className="kicker">Moments</p><h2 className="cn-h2">这个时代值得说的</h2></div><span className="sub">{f.events.length} 条，均可溯源</span></div>
              {events.length ? (
                <ol className={e.events}>
                  {events.map((n, k) => (
                    <li key={k}>
                      <EntityLink kind="year" id={String(n.year)} className={e.evYear}>{n.year}</EntityLink>
                      <div>
                        <b><Linked text={n.title} year={n.year} /></b>
                        <p><Linked text={n.text} year={n.year} /></p>
                        {n.sources?.[0] && <a className={e.src} href={n.sources[0].url} target="_blank" rel="noreferrer">{n.sources[0].label}<Icon name="external-link" size={12} /></a>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="mute">这个时代的故事线还在整理中；先看下面每一年的冠军与这一时代的规则。</p>}
            </div>
            <div>
              <div className="sec-head"><h2 className="cn-h2">关键规则</h2></div>
              <ol className={t.rules}>{(era.keyRules ?? []).map((r, k) => <li key={k}><Linked text={r} /></li>)}</ol>
              {era.sources?.length ? <p className={t.sources}>来源：{era.sources.map((x, k) => <a key={k} href={x.url} target="_blank" rel="noreferrer">{x.label}</a>)}</p> : null}
              <div className="sec-head" style={{ marginTop: 40 }}><div><p className="kicker">Wins</p><h2 className="cn-h2">分站胜场</h2></div></div>
              <div className={e.tables}>
                <table className={`tbl row-hover ${e.tbl}`}>
                  <thead><tr><th>车手</th><th style={{ textAlign: "right" }}>胜场</th></tr></thead>
                  <tbody>
                    {f.winsD.map((w: any) => {
                      const l = lastIn(w.id);
                      return <tr key={w.id}><td><Person id={w.id} name={zhName.driver(w.id) ?? names.get(w.id) ?? w.id} size={24} year={l?.y} color={teamColor(l?.t, "#3a3a44")} /></td><td className="r">{w.n}</td></tr>;
                    })}
                  </tbody>
                </table>
                <table className={`tbl row-hover ${e.tbl}`}>
                  <thead><tr><th>车队</th><th style={{ textAlign: "right" }}>胜场</th></tr></thead>
                  <tbody>
                    {f.winsT.map((w: any) => <tr key={w.id}><td><Team id={w.id} name={zhName.team(w.id) ?? w.id} size={24} badge /></td><td className="r">{w.n}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={e.band}>
        <div className="wrap">
          <div className="sec-head"><div><p className="kicker">World Champions</p><h2 className="cn-h2">{f.years.length} 个赛季的冠军</h2></div><span className="sub">点卡片进入那一年</span></div>
          <SeasonCards years={f.years} current={current} />
        </div>
      </section>

      {full && (
        <section className={e.band}>
          <div className="wrap">
            <div className="sec-head"><div><p className="kicker">Circuits</p><h2 className="cn-h2">这个时代的 {f.circuits.length} 条赛道</h2></div><span className="sub">标签：在这个时代首次登场 / 在这个时代告别</span></div>
            <ul className={c.grid}>
              {f.circuits.map((x: any) => {
                const ci = cinfo.get(x.id);
                const isNew = x.everFirst >= a, bye = x.everLast <= b && x.everLast < 2026;
                return (
                  <CircuitCard key={x.id} id={x.id} name={zhName.circuit(x.id) ?? ci?.name ?? x.id} href={`/circuits/${x.id}`} country={ci?.country}
                    tag={isNew ? "首次登场" : bye ? "告别" : null} tagTone={isNew ? "red" : bye ? "ink" : undefined}
                    sub={ci?.place} outline={x.last >= 2023}
                    stats={[{ v: x.n, k: "场次" }, { v: <YearSpan from={x.first} to={x.last} />, k: "年份" }]} />
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <nav className={`wrap ${e.pager}`}>
        {older ? <EntityLink kind="era" id={older.id} className={e.pg}><Icon name="arrow-left" size={20} /><span><em className="num">{older.years[0]}–{older.years[1]}</em><b>{older.title}</b></span></EntityLink> : <span />}
        {newer ? <EntityLink kind="era" id={newer.id} className={`${e.pg} ${e.pgNext}`}><span><em className="num">{newer.years[0]}–{newer.years[1]}</em><b>{newer.title}</b></span><Icon name="arrow-right" size={20} /></EntityLink> : <span />}
      </nav>
    </div>
  );
}
