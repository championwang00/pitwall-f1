"use client";

import { preparedJSON } from "@/lib/preparedJSON";
import { useEffect, useState } from "react";
import s from "./live.module.css";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";

type Pt = { tag: string; title: string; text: string; src: string | null };
type Rec = { starts: number; wins: number; pods: number; poles: number; best: { pos: number; year: number } | null; last: { pos: number | null; pt: string; year: number } | null };
type D = { id: string; name: string; zh: string; rec: Rec | null; points: Pt[] } | null;
type Data = { circuit: string; circuitZh: string; circuitPoints: Pt[]; drivers: Record<string, D> };

const Y = ({ y }: { y: number }) => <EntityLink kind="year" id={String(y)} className="ilink">{y}</EntityLink>;

/** Commentator crib cards for the two compared drivers at this circuit. */
export default function LiveBrief({ circuit, a, b, year }: { circuit: string | undefined; a: string | undefined; b: string | undefined; year?: number | null }) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    if (!circuit) return;
    const acr = [a, b].filter(Boolean).join(",");
    let alive = true;
    preparedJSON(`/api/talk?circuit=${circuit}&acr=${acr}`).then((r) => { if (alive && r.ok) setData(r.data as Data); }).catch(() => {});
    return () => { alive = false; };
  }, [circuit, a, b]);
  if (!data) return null;
  const card = (acr: string | undefined, side: "A" | "B") => {
    const d = acr ? data.drivers[acr] : null;
    if (!d) return null;
    const r = d.rec;
    return (
      <div className={s.bCard} key={side}>
        <div className={s.bHead} style={{ alignItems: "center" }}><span className={s.bSide}>{side}</span><Person id={d.id} name={d.zh} latin={d.zh !== d.name ? d.name : null} size={36} year={year} /></div>
        <p className={s.bRec}>
          在<EntityLink kind="circuit" id={data.circuit} year={year} className="ilink">{data.circuitZh}</EntityLink>：{r && r.starts ? <>出赛 <b>{r.starts}</b> · 胜 <b>{r.wins}</b> · 领奖台 <b>{r.pods}</b> · 杆位 <b>{r.poles}</b>{r.best ? <> · 最好 <b>P{r.best.pos}</b>（<Y y={r.best.year} />）</> : null}{r.last ? <> · 上次 {r.last.pos ? <b>P{r.last.pos}</b> : "未完赛"}（<Y y={r.last.year} />）</> : null}</> : "第一次在这里出赛"}
        </p>
        <ul className={s.bList}>
          {d.points.map((p, i) => (
            <li key={i}><span>{p.tag}</span><b>{p.title}</b><p>{p.text}{p.src && <a href={p.src} target="_blank" rel="noreferrer"> 来源</a>}</p></li>
          ))}
        </ul>
      </div>
    );
  };
  return (
    <section className={s.brief}>
      <div className={s.briefHead}>
        <h3>解说卡</h3>
        <p>随对比车手切换；带“来源”的为核实过的报道，其余由 F1DB 计算</p>
        <a href={`/brief`} className={`link-arrow ${s.briefLink}`}>完整解说手册</a>
      </div>
      <div className={s.bGrid}>
        {card(a, "A")}
        {card(b, "B")}
        <div className={s.bCard}>
          <div className={s.bHead}><span className={s.bSide}>赛道</span><EntityLink kind="circuit" id={data.circuit} year={year} className="ilink"><b>{data.circuitZh}</b></EntityLink></div>
          <ul className={s.bList}>
            {data.circuitPoints.map((p, i) => <li key={i}><span>{p.tag}</span><b>{p.title}</b><p>{p.text}{p.src && <a href={p.src} target="_blank" rel="noreferrer"> 来源</a>}</p></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
