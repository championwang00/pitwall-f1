"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { CF, CubeData, Dim } from "@/lib/cube";
import s from "./cube.module.css";
import EntityLink, { EntityHref } from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import Laurel from "@/components/entity/Laurel";
import type { Range } from "@/lib/range";

type View = Dim | "matrix";
type Filters = { year?: never; driver?: string; team?: string; circuit?: string; from?: number; to?: number };
type Metric = "best" | "points" | "wins";

const DIM_ZH: Record<Dim, string> = { year: "年份", circuit: "赛道", driver: "车手", team: "车队" };
const VIEW_ZH: Record<View, string> = { year: "按年份", circuit: "按赛道", driver: "按车手", team: "按车队", matrix: "矩阵" };
const keyOf: Record<Dim, (f: CF) => string> = { year: (f) => String(f.y), circuit: (f) => f.c, driver: (f) => f.d, team: (f) => f.t };

export function resClass(f: Pick<CF, "p" | "x">) {
  if (f.p == null) return /^(DNS|DNQ|DNPQ|EX|DSQ|DQ)$/.test(f.x) ? "res out" : "res dnf";
  if (f.p === 1) return "res p1";
  if (f.p <= 3) return "res pod";
  if (f.p <= 10) return "res pts";
  return "res out";
}
const stripClass = (f: CF) => (f.p === 1 ? s.sWin : f.p != null && f.p <= 3 ? s.sPod : f.p != null && f.p <= 10 ? s.sPts : s.sOut);
const label = (f: CF) => (f.p != null ? String(f.p) : f.x === "DNF" || f.x === "NC" ? "R" : f.x.slice(0, 2));

type Stat = { key: string; n: number; wins: number; pods: number; poles: number; fl: number; pts: number; best: number | null; avg: number | null; dnf: number; y0: number; y1: number; rows: CF[]; teams: Set<string> };

function stats(rows: CF[], dim: Dim): Stat[] {
  const m = new Map<string, Stat>();
  for (const f of rows) {
    const k = keyOf[dim](f);
    let st = m.get(k);
    if (!st) { st = { key: k, n: 0, wins: 0, pods: 0, poles: 0, fl: 0, pts: 0, best: null, avg: null, dnf: 0, y0: f.y, y1: f.y, rows: [], teams: new Set() }; m.set(k, st); }
    st.n++; st.rows.push(f); st.teams.add(f.t);
    if (f.p === 1) st.wins++;
    if (f.p != null && f.p <= 3) st.pods++;
    st.poles += f.po; st.fl += f.fl; st.pts += f.pt;
    if (f.p != null) st.best = st.best == null ? f.p : Math.min(st.best, f.p);
    if (f.p == null) st.dnf++;
    st.y0 = Math.min(st.y0, f.y); st.y1 = Math.max(st.y1, f.y);
  }
  for (const st of m.values()) {
    const fin = st.rows.filter((r) => r.p != null);
    st.avg = fin.length ? fin.reduce((a, r) => a + (r.p as number), 0) / fin.length : null;
  }
  return [...m.values()];
}

const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function Cube({
  data, fixed, fixedId, defaultView, initial, title = "维度透视", standings, only, range,
}: {
  data: CubeData; fixed: Dim; fixedId: string; defaultView?: View; initial?: Partial<Filters & { view: View }>; title?: string;
  /** Restrict the available views (e.g. a circuit page has its own per-year winners table). */
  only?: View[];
  /** Optional championship result per year (driver/team pages) */
  standings?: Record<number, string>;
  /** The page state (spec §0.7.4): `data` is already cut to it. Locks the years — no year select, no from/to in the URL —
   *  and cross-object links open the other object in the same range. */
  range?: Range | null;
}) {
  const others = (["year", "circuit", "team", "driver"] as Dim[]).filter((d) => d !== fixed);
  // a single season (spec §0.8.3 D2): one row per round is the useful view, so 按赛道 leads; a view that would be a
  // single group (按年份 = the season itself, 按车队 for a one-team year) adds nothing and is hidden — the matrix stays
  const single = !!range && range.from === range.to;
  const views: View[] = (only ?? [...others, "matrix"]).filter((v) => !single || v === "matrix" || new Set(data.rows.map(keyOf[v as Dim])).size > 1);
  const def: View = single && views.includes("circuit") ? "circuit" : defaultView && views.includes(defaultView) ? defaultView : views[0];
  const [view, setView] = useState<View>(initial?.view && views.includes(initial.view) ? initial.view : def);
  const [flt, setFlt] = useState<Filters>({ driver: initial?.driver, team: initial?.team, circuit: initial?.circuit, ...(range ? {} : { from: initial?.from, to: initial?.to }) });
  const [sort, setSort] = useState<{ k: keyof Stat | "label"; dir: 1 | -1 }>({ k: "label", dir: 1 });
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [mRow, setMRow] = useState<Dim>(fixed === "year" ? "driver" : "year");
  const [mCol, setMCol] = useState<Dim>(fixed === "circuit" ? "driver" : fixed === "year" ? "circuit" : "circuit");
  const [metric, setMetric] = useState<Metric>("best");

  const years = useMemo(() => [...new Set(data.rows.map((r) => r.y))].sort((a, b) => a - b), [data.rows]);
  const rows = useMemo(
    () => data.rows.filter((f) =>
      (!flt.driver || f.d === flt.driver) && (!flt.team || f.t === flt.team) && (!flt.circuit || f.c === flt.circuit) &&
      (!flt.from || f.y >= flt.from) && (!flt.to || f.y <= flt.to)),
    [data.rows, flt]
  );

  // keep URL in sync so any slice is shareable
  useEffect(() => {
    const u = new URL(window.location.href);
    // a locked range keeps the address bar's own ?year / ?from&to
    for (const k of range ? (["driver", "team", "circuit"] as const) : (["driver", "team", "circuit", "from", "to"] as const)) {
      const v = flt[k];
      if (v) u.searchParams.set(k, String(v)); else u.searchParams.delete(k);
    }
    if (view !== def) u.searchParams.set("view", view); else u.searchParams.delete("view");
    if (u.toString() !== window.location.href) window.history.replaceState(window.history.state, "", u.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flt, view]);

  const total = useMemo(() => stats(rows, fixed)[0], [rows, fixed]);

  const nameOf = (dim: Dim, id: string) => {
    if (dim === "year") return { zh: id, lat: "" };
    if (dim === "driver") { const n = data.names.driver[id]; return { zh: n?.[1] ?? n?.[0] ?? id, lat: n?.[1] ? n[0] : "" }; }
    if (dim === "team") { const n = data.names.team[id]; return { zh: n?.[1] ?? n?.[0] ?? id, lat: n?.[1] ? n[0] : "" }; }
    const n = data.names.circuit[id];
    return { zh: n?.[1] ?? n?.[0] ?? id, lat: n?.[1] ? n[0] : "" };
  };
  const href = (dim: Dim, id: string) => {
    const q = new URLSearchParams({ [fixed]: fixedId, ...(range && dim !== "year" ? { from: String(range.from), to: String(range.to) } : {}) });
    if (dim === "year") return `/seasons/${id}?${fixed === "driver" || fixed === "team" ? q : ""}`;
    return `/${dim === "driver" ? "drivers" : dim === "team" ? "teams" : "circuits"}/${id}?${fixed !== "year" ? q : `from=${fixedId}&to=${fixedId}`}`;
  };
  const raceHref = (f: CF) => `/races/${f.y}/${f.n}`;
  const raceTitle = (f: CF) => `${f.y} ${data.names.gp[f.g] ?? f.g} · ${data.names.driver[f.d]?.[1] ?? data.names.driver[f.d]?.[0]} · ${data.names.team[f.t]?.[1] ?? data.names.team[f.t]?.[0]} · ${f.p ? "第 " + f.p : f.x}`;

  const filterOptions = (dim: Dim) => {
    const m = new Map<string, number>();
    for (const f of data.rows) m.set(keyOf[dim](f), (m.get(keyOf[dim](f)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  };

  const groupRows = useMemo(() => {
    if (view === "matrix") return [];
    const st = stats(rows, view);
    const lab = (x: Stat) => (view === "year" ? x.key : nameOf(view, x.key).zh);
    return st.sort((a, b) => {
      if (sort.k === "label") {
        if (view === "year") return (Number(a.key) - Number(b.key)) * sort.dir;
        return (b.n - a.n) * sort.dir || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
      }
      const av = (a[sort.k] as number | null) ?? 999, bv = (b[sort.k] as number | null) ?? 999;
      return (av - bv) * sort.dir || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, view, sort]);

  const th = (k: keyof Stat, text: string, desc = true) => (
    <th className={`r ${s.sortable} ${sort.k === k ? s.sorted : ""}`} onClick={() => setSort({ k, dir: sort.k === k ? (sort.dir === 1 ? -1 : 1) : desc ? -1 : 1 })}>
      {text}{sort.k === k ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );

  if (range && !data.rows.length) return (
    <section className={s.cube}>
      <div className={s.head}><div><h2 className="cn-h2">{title}</h2></div></div>
      <p className={s.empty}>{range.from === range.to ? `${range.from} 赛季没有出赛记录` : "这一时期没有出赛记录"}</p>
    </section>
  );

  return (
    <section className={s.cube}>
      <div className={s.head}>
        <div>
          <h2 className="cn-h2">{title}</h2>
          <p className={s.sub}>按{views.filter((v) => v !== "matrix").map((v) => DIM_ZH[v as Dim]).join("、")}展开，或用矩阵交叉查看；点任意一格进入那一站。</p>
        </div>
        <div className="seg" role="tablist">
          {views.map((v) => (
            <button key={v} className={v === view ? "on" : undefined} onClick={() => { setView(v); setOpen(null); setShowAll(false); setSort({ k: "label", dir: 1 }); }}>
              {VIEW_ZH[v]}
            </button>
          ))}
        </div>
      </div>

      <div className={s.filters}>
        {others.filter((d) => d !== "year").map((d) => (
          <label key={d} className={`${s.select} ${flt[d as "driver"] ? s.selOn : ""}`}>
            <span>{DIM_ZH[d]}</span>
            <select value={flt[d as "driver"] ?? ""} onChange={(e) => setFlt({ ...flt, [d]: e.target.value || undefined })}>
              <option value="">全部</option>
              {filterOptions(d).map((id) => <option key={id} value={id}>{nameOf(d, id).zh}{nameOf(d, id).lat ? ` · ${nameOf(d, id).lat}` : ""}</option>)}
            </select>
          </label>
        ))}
        {fixed !== "year" && !range && years.length > 1 && (
          <label className={`${s.select} ${flt.from || flt.to ? s.selOn : ""}`}>
            <span>年份</span>
            <select value={flt.from ?? ""} onChange={(e) => setFlt({ ...flt, from: e.target.value ? +e.target.value : undefined })}>
              <option value="">{years[0]}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <i>—</i>
            <select value={flt.to ?? ""} onChange={(e) => setFlt({ ...flt, to: e.target.value ? +e.target.value : undefined })}>
              <option value="">{years[years.length - 1]}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        )}
        {(flt.driver || flt.team || flt.circuit || flt.from || flt.to) && (
          <button className={s.reset} onClick={() => setFlt({})}>清除筛选</button>
        )}
        {/* the unfiltered total is the hero's number row again (spec §0.8.2): only a filtered subtotal is new information */}
        {total && (flt.driver || flt.team || flt.circuit) && (
          <p className={s.total}>
            <b className="num">{total.n}</b> 场 · <b className="num">{total.wins}</b> 胜 · <b className="num">{total.pods}</b> 领奖台 · <b className="num">{total.poles}</b> 杆位 · <b className="num">{fmtPts(total.pts)}</b> 分
          </p>
        )}
      </div>

      {(view === "year" || view === "matrix") && <p className={s.legend}>
        <span><i className="res p1" />冠军</span><span><i className="res pod" />领奖台</span><span><i className="res pts" />积分</span>
        <span><i className="res out" />无积分</span><span><i className="res dnf" />退赛</span>
        <span><i className="res pts pole" />杆位</span><span><i className="res pts fl" />最快圈</span>
      </p>}

      {view !== "matrix" ? (
        <div className={s.tableWrap}>
          <table className={`tbl ${s.table}`}>
            <thead>
              <tr>
                <th className={`${s.sortable} ${sort.k === "label" ? s.sorted : ""}`} onClick={() => setSort({ k: "label", dir: sort.k === "label" ? (sort.dir === 1 ? -1 : 1) : 1 })}>{DIM_ZH[view]}</th>
                {view === "year" && fixed !== "team" && <th>车队</th>}
                {view === "year" && standings && <th className="r">总成绩</th>}
                {view !== "year" && <th>年份</th>}
                {th("n", "出赛")}
                {th("wins", "胜")}
                {th("pods", "领奖台")}
                {th("poles", "杆位")}
                {th("pts", "积分")}
                {th("best", "最佳", false)}
                {th("avg", "平均完赛", false)}
                <th className={s.stripHead}>{view === "year" ? "逐场" : ""}</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? groupRows : groupRows.slice(0, 20)).map((g) => {
                const nm = nameOf(view as Dim, g.key);
                const isOpen = open === g.key;
                const teamIds = [...g.teams];
                return (
                  <Fragment key={g.key}>
                    <tr className={isOpen ? s.openRow : undefined}>
                      <td className={s.labelCell}>
                        <EntityLink kind={view as Dim} id={g.key} href={href(view as Dim, g.key)} className={s.label} style={view === "team" ? { ["--team" as any]: data.names.team[g.key]?.[2] } : undefined}>
                          {view === "team" && <i className={s.swatch} />}
                          {view === "year" ? <span className="num">{g.key}</span>
                            : view === "driver" ? <Person plain id={g.key} name={nm.zh} latin={nm.lat || null} size={24} />
                            : <><b>{nm.zh}</b>{nm.lat && <span className="lat">{nm.lat}</span>}</>}
                        </EntityLink>
                      </td>
                      {view === "year" && fixed !== "team" && (
                        <td>
                          <span className={s.teams}>
                            {teamIds.map((t) => (
                              <EntityLink key={t} kind="team" id={t} className={s.teamChip} style={{ ["--team" as any]: data.names.team[t]?.[2] }}>
                                <i />{data.names.team[t]?.[1] ?? data.names.team[t]?.[0]}
                              </EntityLink>
                            ))}
                          </span>
                        </td>
                      )}
                      {view === "year" && standings && (
                        <td className="r num">
                          {standings[+g.key] === "1" && +g.key < new Date().getFullYear()
                            ? <span className={s.champ}><Laurel tone="gold" size={30} top="冠军" title={`${g.key} 年冠军`} /></span>
                            : standings[+g.key] ? `P${standings[+g.key]}` : "—"}
                        </td>
                      )}
                      {view !== "year" && (
                        <td className="num mute">
                          <EntityLink kind="year" id={String(g.y0)} href={href("year", String(g.y0))} className={s.yLink}>{g.y0}</EntityLink>
                          {g.y0 !== g.y1 && <>–<EntityLink kind="year" id={String(g.y1)} href={href("year", String(g.y1))} className={s.yLink}>{String(g.y1).slice(2)}</EntityLink></>}
                        </td>
                      )}
                      <td className="r num">{g.n}</td>
                      <td className={`r num ${g.wins ? s.hi : s.zero}`}>{g.wins}</td>
                      <td className={`r num ${g.pods ? "" : s.zero}`}>{g.pods}</td>
                      <td className={`r num ${g.poles ? "" : s.zero}`}>{g.poles}</td>
                      <td className="r num">{fmtPts(g.pts)}</td>
                      <td className="r num">{g.best ?? "—"}</td>
                      <td className="r num mute">{g.avg ? g.avg.toFixed(1) : "—"}</td>
                      {view !== "year" && (
                        <td className={s.stripCell}><button className={s.expand} onClick={() => setOpen(isOpen ? null : g.key)} aria-expanded={isOpen}>{isOpen ? "收起" : `逐场 ${g.n}`}</button></td>
                      )}
                      {view === "year" ? (
                        <td className={s.stripCell}>
                          <button className={s.strip} onClick={() => setOpen(isOpen ? null : g.key)} aria-expanded={isOpen} title="展开逐场成绩">
                            {g.rows.slice(0, 26).map((f, i) => <i key={i} className={stripClass(f)} />)}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    {isOpen && (
                      <tr className={s.detailRow}>
                        <td colSpan={20}>
                          <div className={s.races}>
                            {g.rows.map((f, i) => {
                              // result chip → race page; GP name previews the circuit, year the season, name the driver
                              const gp = <EntityLink kind="circuit" id={f.c} href={raceHref(f)}>{data.names.gp[f.g]}</EntityLink>;
                              const drv = <EntityLink kind="driver" id={f.d}>{data.names.driver[f.d]?.[1] ?? data.names.driver[f.d]?.[0]}</EntityLink>;
                              return (
                                <div key={i} className={s.race} title={raceTitle(f)}>
                                  <Link href={raceHref(f)} className={`${resClass(f)}${f.po ? " pole" : ""}${f.fl ? " fl" : ""}`}>{label(f)}</Link>
                                  <span className={s.raceMeta}>
                                    <b>{view === "year" ? gp : <EntityLink kind="year" id={String(f.y)} href={raceHref(f)}>{f.y}</EntityLink>}</b>
                                    <em>{view === "year" ? (fixed === "driver" ? "" : drv) : gp}{fixed !== "driver" && view !== "year" ? <> · {drv}</> : null}</em>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!groupRows.length && <p className={s.empty}>该筛选组合下没有比赛记录。</p>}
          {groupRows.length > 20 && (
            <button className={`btn btn-line ${s.more}`} onClick={() => setShowAll(!showAll)}>
              {showAll ? "收起" : `显示全部 ${groupRows.length} 行`}
            </button>
          )}
        </div>
      ) : (
        <Matrix rows={rows} data={data} fixed={fixed} rowDim={mRow} colDim={mCol} metric={metric}
          setRow={setMRow} setCol={setMCol} setMetric={setMetric} others={others} nameOf={nameOf} raceHref={raceHref} raceTitle={raceTitle} />
      )}

    </section>
  );
}

function Matrix({ rows, data, fixed, rowDim, colDim, metric, setRow, setCol, setMetric, others, nameOf, raceHref, raceTitle }: {
  rows: CF[]; data: CubeData; fixed: Dim; rowDim: Dim; colDim: Dim; metric: Metric;
  setRow: (d: Dim) => void; setCol: (d: Dim) => void; setMetric: (m: Metric) => void; others: Dim[];
  nameOf: (d: Dim, id: string) => { zh: string; lat: string }; raceHref: (f: CF) => string; raceTitle: (f: CF) => string;
}) {
  const rd = rowDim === colDim ? others.find((d) => d !== colDim)! : rowDim;
  const order = (dim: Dim) => {
    const m = new Map<string, { n: number; first: number; firstRound: number }>();
    for (const f of rows) {
      const k = keyOf[dim](f);
      const e = m.get(k) ?? { n: 0, first: f.y, firstRound: f.n };
      e.n++;
      if (f.y < e.first || (f.y === e.first && f.n < e.firstRound)) { e.first = f.y; e.firstRound = f.n; }
      m.set(k, e);
    }
    const arr = [...m.entries()];
    if (dim === "year") return arr.map((a) => a[0]).sort();
    if (dim === "circuit" && fixed === "year") return arr.sort((a, b) => a[1].firstRound - b[1].firstRound).map((a) => a[0]);
    return arr.sort((a, b) => b[1].n - a[1].n).map((a) => a[0]);
  };
  const rIds = order(rd), cIds = order(colDim);
  const cell = new Map<string, CF[]>();
  for (const f of rows) {
    const k = keyOf[rd](f) + "|" + keyOf[colDim](f);
    const a = cell.get(k) ?? [];
    a.push(f);
    cell.set(k, a);
  }
  const best = (a: CF[]) => a.reduce((b, f) => (f.p != null && (b.p == null || f.p < b.p) ? f : b), a[0]);
  const colLabel = (id: string) => {
    if (colDim === "year") return id.slice(2);
    if (colDim === "circuit" && fixed === "year") {
      const f = rows.find((x) => x.c === id)!;
      return String(f?.n ?? "");
    }
    const n = nameOf(colDim, id);
    return n.zh.length > 4 ? n.zh.slice(0, 4) : n.zh;
  };
  return (
    <div>
      <div className={s.mControls}>
        <label className={s.select}><span>行</span>
          <select value={rd} onChange={(e) => setRow(e.target.value as Dim)}>{others.map((d) => <option key={d} value={d}>{DIM_ZH[d]}</option>)}</select>
        </label>
        <label className={s.select}><span>列</span>
          <select value={colDim} onChange={(e) => setCol(e.target.value as Dim)}>{others.map((d) => <option key={d} value={d}>{DIM_ZH[d]}</option>)}</select>
        </label>
        <div className="seg">
          {(["best", "points", "wins"] as Metric[]).map((m) => (
            <button key={m} className={metric === m ? "on" : undefined} onClick={() => setMetric(m)}>{m === "best" ? "最佳名次" : m === "points" ? "积分" : "胜场"}</button>
          ))}
        </div>
      </div>
      <div className={s.mScroll}>
        <div className={s.matrix} style={{ gridTemplateColumns: `minmax(150px, 190px) repeat(${cIds.length}, 30px)` }}>
          <div className={s.mCorner}>{DIM_ZH[rd]} \ {DIM_ZH[colDim]}</div>
          {cIds.map((c) => {
            // a season's circuit columns are rounds → open that race, preview the circuit
            const f = colDim === "circuit" && fixed === "year" ? rows.find((x) => x.c === c) : undefined;
            return (
              <EntityLink key={c} kind={colDim} id={c} href={f ? raceHref(f) : undefined} className={s.mHead}>
                <span>{colLabel(c)}</span>
              </EntityLink>
            );
          })}
          {rIds.map((r) => {
            const nm = nameOf(rd, r);
            return (
              <Fragment key={r}>
                <EntityLink kind={rd} id={r} className={s.mRowHead} style={rd === "team" ? { ["--team" as any]: data.names.team[r]?.[2] } : undefined}>
                  {rd === "team" && <i className={s.swatch} />}
                  {rd === "year" ? <span className="num">{r}</span>
                    : rd === "driver" ? <Person plain id={r} name={nm.zh} latin={nm.lat || null} size={20} />
                    : <><b>{nm.zh}</b>{nm.lat && <span className="lat">{nm.lat}</span>}</>}
                </EntityLink>
                {cIds.map((c) => {
                  const a = cell.get(r + "|" + c);
                  if (!a) return <div key={c} className={s.mEmpty} />;
                  if (metric === "best") {
                    const b = best(a);
                    const content = <span className={`${resClass(b)}${b.po ? " pole" : ""}${b.fl ? " fl" : ""}`}>{label(b)}</span>;
                    return a.length === 1 ? (
                      <EntityHref key={c} href={raceHref(b)} title={raceTitle(b)} className={s.mCell}>{content}</EntityHref>
                    ) : (
                      <span key={c} title={`${a.length} 场，最佳：${raceTitle(b)}`} className={s.mCell}>{content}</span>
                    );
                  }
                  const v = metric === "points" ? a.reduce((x, f) => x + f.pt, 0) : a.filter((f) => f.p === 1).length;
                  return (
                    <span key={c} className={s.mCell} title={`${nameOf(rd, r).zh} × ${nameOf(colDim, c).zh}：${metric === "points" ? fmtPts(v) + " 分" : v + " 胜"}`}>
                      <span className={`res ${v ? (metric === "wins" ? "p1" : v >= 18 ? "pod" : "pts") : "out"}`}>{v ? (metric === "points" ? Math.round(v) : v) : "·"}</span>
                    </span>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
