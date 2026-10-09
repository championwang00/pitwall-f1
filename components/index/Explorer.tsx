"use client";

import { useMemo, useState } from "react";
import EntityLink, { type Kind } from "@/components/entity/EntityLink";
import s from "./index.module.css";
import Icon from "@/components/ui/Icon";

export type Row = { id: string; name: string; zh?: string | null; flag?: string | null; y0: number | null; y1: number | null; stats: Record<string, number>; color?: string; sub?: string; logo?: boolean };
type Col = { k: string; label: string };

const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Searchable, sortable, era-filterable list used by the driver / team / circuit index pages. */
export default function Explorer({ rows, cols, base, placeholder, defaultSort, flags = [], latinFirst = false, faces = false }: {
  rows: Row[]; cols: Col[]; base: string; placeholder: string; defaultSort: string;
  flags?: { k: string; label: string; test: string }[];
  /** People: Latin name leads (complete coverage), Chinese follows when known. */
  latinFirst?: boolean;
  /** People: show a small face before the name (person = face + name). */
  faces?: boolean;
}) {
  const kind: Kind = base.includes("driver") ? "driver" : base.includes("team") ? "team" : base.includes("circuit") ? "circuit" : "year";
  const [q, setQ] = useState("");
  const [era, setEra] = useState<number | null>(null);
  const [flag, setFlag] = useState<string | null>(null);
  const [sort, setSort] = useState(defaultSort);
  const [n, setN] = useState(60);
  const decades = useMemo(() => {
    const ds = new Set<number>();
    for (const r of rows) if (r.y0 != null && r.y1 != null) for (let d = Math.floor(r.y0 / 10) * 10; d <= r.y1; d += 10) ds.add(d);
    return [...ds].sort();
  }, [rows]);
  const list = useMemo(() => {
    const t = norm(q.trim());
    return rows
      .filter((r) => !t || norm(r.name).includes(t) || (r.zh ?? "").includes(q.trim()) || r.id.includes(t))
      .filter((r) => era == null || (r.y0 != null && r.y1 != null && r.y0 <= era + 9 && r.y1 >= era))
      .filter((r) => !flag || (r.stats[flags.find((f) => f.k === flag)!.test] ?? 0) > 0)
      .sort((a, b) => (b.stats[sort] ?? 0) - (a.stats[sort] ?? 0) || (a.id < b.id ? -1 : 1));
  }, [rows, q, era, flag, sort, flags]);
  return (
    <div className={s.explorer}>
      <div className={s.controls}>
        <input className={s.search} value={q} onChange={(e) => { setQ(e.target.value); setN(60); }} placeholder={placeholder} />
        <div className={s.decades}>
          <button className={era == null ? s.on : undefined} onClick={() => setEra(null)}>全部年代</button>
          {decades.map((d) => <button key={d} className={era === d ? s.on : undefined} onClick={() => { setEra(d); setN(60); }}>{String(d).slice(2)}s</button>)}
        </div>
        {flags.map((f) => <button key={f.k} className={`chip ${flag === f.k ? s.flagOn : ""}`} onClick={() => setFlag(flag === f.k ? null : f.k)}>{f.label}</button>)}
        <span className={s.count}>{list.length} 条</span>
      </div>
      <div className={`${s.tableWrap} ${s.tableCard}`}>
        <table className="tbl row-hover">
          <thead>
            <tr>
              <th>名称</th><th>年份</th>
              {cols.map((c) => <th key={c.k} className={`r ${s.sortTh} ${sort === c.k ? s.sorted : ""}`} onClick={() => setSort(c.k)}><span className={s.thIn}>{c.label}{sort === c.k && <Icon name="chevron-down" size={14} />}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {list.slice(0, n).map((r) => (
              <tr key={r.id}>
                <td>
                  <EntityLink kind={kind} id={r.id} preview={false} className={s.name}>
                    {faces && <img className={`avatar ${s.face}`} src={`/api/face/${r.id}?v=3&s=48`} alt="" loading="lazy" width={24} height={24} />}
                    {r.logo && <span className={s.badge} style={{ background: r.color }}><img src={`/api/logo/${r.id}?r=3&v=white`} alt="" loading="lazy" /></span>}
                    {r.flag && <img className={s.flag} src={r.flag} alt="" width={20} />}
                    {latinFirst ? <><b className="lat">{r.name}</b>{r.zh && <span>{r.zh}</span>}</> : r.zh ? <><b>{r.zh}</b><span className="lat">{r.name}</span></> : <b className="lat">{r.name}</b>}
                    {r.sub && <em>{r.sub}</em>}
                  </EntityLink>
                </td>
                <td className="num mute">{r.y0 == null ? "—" : (
                  <>
                    <EntityLink kind="year" id={String(r.y0)} className={s.yLink}>{r.y0}</EntityLink>
                    {r.y1 != null && r.y1 !== r.y0 && <>–<EntityLink kind="year" id={String(r.y1)} className={s.yLink}>{r.y1}</EntityLink></>}
                  </>
                )}</td>
                {cols.map((c) => <td key={c.k} className={`r num ${!r.stats[c.k] ? s.zero : ""}`}>{Number.isInteger(r.stats[c.k]) ? r.stats[c.k] : Math.round(r.stats[c.k] ?? 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > n && <button className={`btn btn-line ${s.more}`} onClick={() => setN(n + 120)}>再显示 {Math.min(120, list.length - n)} 条</button>}
    </div>
  );
}
