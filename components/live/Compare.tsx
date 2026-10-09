"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, useClockT } from "./clock";
import { fmtLap, type Driver, type Lap, type Model } from "./model";
import { COMPOUND } from "./names";
import Icon from "@/components/ui/Icon";
import s from "./live.module.css";

type Pt = { n: number; v: number; clean: boolean; pitIn: boolean; pitOut: boolean; neutral: boolean };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function rgb(hex: string) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mixWhite(hex: string, k: number) {
  const [r, g, b] = rgb(hex).map((c) => Math.round(c + (255 - c) * k));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
function near(a: string, b: string) {
  const x = rgb(a), y = rgb(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 70;
}

function niceStep(range: number, target = 5) {
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 300];
  return steps.find((st) => range / st <= target) ?? 600;
}
const fmtAxisLap = (v: number, step: number) => {
  const m = Math.floor(v / 60), sec = v - m * 60;
  const ss = step < 1 ? sec.toFixed(1).padStart(4, "0") : String(Math.round(sec)).padStart(2, "0");
  return m ? `${m}:${ss}` : ss;
};
const sign = (v: number, d = 3) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(d);

function series(d: Driver | null, t: number): Pt[] {
  if (!d) return [];
  const out: Pt[] = [];
  for (const l of d.laps) if (l.dur && l.tEnd != null && l.tEnd <= t) out.push({ n: l.n, v: l.dur, clean: l.clean, pitIn: l.pitIn, pitOut: l.pitOut, neutral: l.neutral });
  return out;
}

type Geo = { w: number; h: number; L: number; R: number; T: number; B: number; x: (n: number) => number; xMax: number };

function XAxis({ g, every }: { g: Geo; every: number }) {
  const ticks: number[] = [];
  for (let n = every; n <= g.xMax; n += every) ticks.push(n);
  return (
    <g className={s.axis}>
      <line x1={g.L} x2={g.w - g.R} y1={g.h - g.B} y2={g.h - g.B} />
      {[1, ...ticks].map((n) => (
        <text key={n} x={g.x(n)} y={g.h - g.B + 15} textAnchor="middle">{n}</text>
      ))}
    </g>
  );
}

function Bands({ g, model, yTop, yBot }: { g: Geo; model: Model; yTop: number; yBot: number }) {
  // Faint full-height tint + a solid 4px cap on the plot's top edge; labels sit above the plot and never overlap.
  let lastLabel = -Infinity;
  return (
    <g>
      {model.periods.map((p, i) => {
        if (p.lapFrom == null || p.lapTo == null) return null;
        const x1 = Math.max(g.L, g.x(p.lapFrom - 0.5)), x2 = Math.min(g.w - g.R, g.x(p.lapTo + 0.5));
        if (x2 <= x1) return null;
        const showLabel = x1 - lastLabel > 30;
        if (showLabel) lastLabel = x1;
        return (
          <g key={i} className={p.kind === "RED" ? s.bandRed : s.bandSc}>
            <rect x={x1} y={yTop} width={x2 - x1} height={yBot - yTop} />
            <rect className={s.bandCap} x={x1} y={yTop} width={Math.max(2, x2 - x1)} height={4} />
            {showLabel && <text x={x1} y={yTop - 5}>{p.kind === "RED" ? "红旗" : p.kind}</text>}
          </g>
        );
      })}
    </g>
  );
}

export default function Compare({
  model, clock, a, b, setA, setB, order, zh,
}: {
  model: Model; clock: Clock; a: number | null; b: number | null; setA: (n: number) => void; setB: (n: number) => void;
  order: number[]; zh: (n: number) => string;
}) {
  const t = useClockT(clock, 4);
  const A = a != null ? model.drivers.get(a) ?? null : null;
  const B = b != null ? model.drivers.get(b) ?? null : null;
  const doneA = A ? A.laps.filter((l) => l.tEnd != null && l.tEnd <= t).length : 0;
  const doneB = B ? B.laps.filter((l) => l.tEnd != null && l.tEnd <= t).length : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sa = useMemo(() => series(A, t), [A, doneA]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sb = useMemo(() => series(B, t), [B, doneB]);

  const cA = A?.color ?? "#ffffff";
  const sameColour = !!(A && B && near(A.color, B.color));
  const cB = B ? (sameColour ? mixWhite(B.color, 0.6) : B.color) : "#8a8a94";
  const race = model.kind === "race";

  const xMax = Math.max(race ? model.totalLaps : 0, A?.laps.length ? A.laps[A.laps.length - 1].n : 0, B?.laps.length ? B.laps[B.laps.length - 1].n : 0, 5);

  // gap per lap: B's lap-end minus A's lap-end (positive = B behind)
  const gaps = useMemo(() => {
    if (!A || !B || !race) return [] as { n: number; v: number }[];
    const out: { n: number; v: number }[] = [];
    for (const la of A.laps) {
      if (la.tEnd == null || la.tEnd > t) continue;
      const lb = B.lapBy.get(la.n);
      if (!lb || lb.tEnd == null || lb.tEnd > t || la.cEnd == null || lb.cEnd == null) continue;
      out.push({ n: la.n, v: (lb.cEnd - la.cEnd) / 1000 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A, B, race, doneA, doneB]);

  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  useEffect(() => { setPinned(null); }, [a, b, model.session.session_key]);

  const lastCommon = gaps.length ? gaps[gaps.length - 1].n : (() => {
    const setB = new Set(sb.map((p) => p.n));
    const c = sa.filter((p) => setB.has(p.n));
    return c.length ? c[c.length - 1].n : null;
  })();

  // session bests up to t (for purple marks in the sector table)
  const bests = useMemo(() => {
    const bs: [number, number, number, number] = [Infinity, Infinity, Infinity, Infinity];
    for (const d of model.drivers.values()) for (const l of d.laps) {
      if (l.tEnd == null || l.tEnd > t) continue;
      l.s.forEach((v, i) => { if (v != null && v < bs[i]) bs[i] = v; });
      if (l.dur && !l.pitOut && !(race && l.n === 1) && l.dur < bs[3]) bs[3] = l.dur;
    }
    return bs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, Math.floor(t / 4000), race]);

  const bestOf = (d: Driver | null) => {
    let best: Lap | null = null;
    if (!d) return null;
    for (const l of d.laps) if (l.dur && l.tEnd != null && l.tEnd <= t && !l.pitOut && !(race && l.n === 1) && (!best || l.dur < best.dur!)) best = l;
    return best;
  };
  const bestA = bestOf(A), bestB = bestOf(B);

  const [mode, setMode] = useState<"lap" | "best">(race ? "lap" : "best");
  useEffect(() => { setMode(race ? "lap" : "best"); }, [race]);
  const selN = pinned ?? lastCommon;
  const lapA = mode === "best" && pinned == null ? bestA : selN != null ? A?.lapBy.get(selN) ?? null : null;
  const lapB = mode === "best" && pinned == null ? bestB : selN != null ? B?.lapBy.get(selN) ?? null : null;

  const both = sa.filter((p) => p.clean && sb.find((q) => q.n === p.n && q.clean));
  const meanDelta = both.length ? both.reduce((acc, p) => acc + (sb.find((q) => q.n === p.n)!.v - p.v), 0) / both.length : null;
  const gapNow = gaps.length ? gaps[gaps.length - 1] : null;

  const pick = (which: "a" | "b") => (e: React.ChangeEvent<HTMLSelectElement>) => (which === "a" ? setA : setB)(Number(e.target.value));
  const opts = order.map((n) => model.drivers.get(n)!).filter(Boolean);

  return (
    <section className={s.compare} aria-label="双车手对比">
      <div className={s.cmpHead}>
        <div>
          <p className="kicker">Compare</p>
          <h2 className={s.cmpTitle}>选两位车手，看圈速差距</h2>
        </div>
        <div className={s.pickers}>
          <label className={s.picker} style={{ ["--c" as string]: cA }}>
            <em className={s.tagA}>A</em>
            {A?.headshot && <img src={A.headshot} alt="" />}
            <select value={a ?? ""} onChange={pick("a")} aria-label="车手 A">
              {opts.map((d) => <option key={d.num} value={d.num} disabled={d.num === b}>{d.acr} · {zh(d.num)}</option>)}
            </select>
          </label>
          <span className={s.vs}>VS</span>
          <label className={s.picker} style={{ ["--c" as string]: cB }}>
            <em className={s.tagB}>B</em>
            {B?.headshot && <img src={B.headshot} alt="" />}
            <select value={b ?? ""} onChange={pick("b")} aria-label="车手 B">
              {opts.map((d) => <option key={d.num} value={d.num} disabled={d.num === a}>{d.acr} · {zh(d.num)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {A && B && (
        <div className={s.stats}>
          {race && (
            <div className={s.stat}>
              <span>当前差距{gapNow ? ` · 第 ${gapNow.n} 圈` : ""}</span>
              <b className="num">{gapNow ? Math.abs(gapNow.v).toFixed(3) : "—"}<small>s</small></b>
              <em>{gapNow ? `${gapNow.v >= 0 ? B.acr : A.acr} 落后` : "等待两人完成同一圈"}</em>
            </div>
          )}
          <div className={s.stat}>
            <span>干净圈平均差 · {both.length} 圈</span>
            <b className="num">{meanDelta != null ? Math.abs(meanDelta).toFixed(3) : "—"}<small>s/lap</small></b>
            <em>{meanDelta != null ? `${meanDelta >= 0 ? A.acr : B.acr} 更快` : "暂无可比圈"}</em>
          </div>
          <div className={s.stat}>
            <span>最快圈</span>
            <b className={`num ${s.pair}`}>
              <i style={{ color: bestA && bestA.dur === bests[3] ? "var(--purple)" : undefined }}>{fmtLap(bestA?.dur)}</i>
              <small> / </small>
              <i style={{ color: bestB && bestB.dur === bests[3] ? "var(--purple)" : undefined }}>{fmtLap(bestB?.dur)}</i>
            </b>
            <em>{A.acr} / {B.acr}</em>
          </div>
          {race && (
            <div className={s.stat}>
              <span>进站次数</span>
              <b className="num">{A.pits.filter((p) => p.lane != null && p.t - p.lane * 1000 <= t).length}<small> / </small>{B.pits.filter((p) => p.lane != null && p.t - p.lane * 1000 <= t).length}</b>
              <em>{A.acr} / {B.acr}</em>
            </div>
          )}
        </div>
      )}

      <div className={s.cmpGrid}>
        <div className={s.charts}>
          <LapChart model={model} sa={sa} sb={sb} cA={cA} cB={cB} dashB={sameColour} xMax={xMax} hover={hover} setHover={setHover} sel={selN} onPick={(n) => { setPinned(n); setMode("lap"); }} A={A} B={B} gaps={gaps} />
          {race ? (
            <GapChart model={model} gaps={gaps} cA={cA} cB={cB} xMax={xMax} hover={hover} setHover={setHover} sel={selN} onPick={(n) => { setPinned(n); setMode("lap"); }} A={A} B={B} />
          ) : (
            <p className={s.note}>排位赛与练习赛没有同场追逐，差距图仅在正赛 / 冲刺赛中显示。</p>
          )}
        </div>
        <div className={s.sideCol}>
        <SectorTable
          A={A} B={B} lapA={lapA} lapB={lapB} cA={cA} cB={cB} bests={bests}
          title={mode === "best" && pinned == null ? "各自最快圈" : selN != null ? `第 ${selN} 圈` : "—"}
          mode={mode} setMode={(m) => { setMode(m); if (m === "best") setPinned(null); }}
          canStep={selN != null} step={(d) => { const n = (selN ?? 1) + d; if (n >= 1 && n <= xMax) { setPinned(n); setMode("lap"); } }}
          follow={pinned == null} onFollow={() => setPinned(null)} race={race}
        />
        {A && B && <Strategy drivers={[[A, "A"], [B, "B"]]} xMax={xMax} t={t} />}
        </div>
      </div>
    </section>
  );
}

function Strategy({ drivers, xMax, t }: { drivers: [Driver, "A" | "B"][]; xMax: number; t: number }) {
  const ticks: number[] = [];
  for (let n = xMax > 40 ? 10 : 5; n < xMax; n += xMax > 40 ? 10 : 5) ticks.push(n);
  return (
    <div className={s.strategy}>
      <div className={s.secHead}><h3>轮胎策略 <small>截至回放时刻</small></h3></div>
      {drivers.map(([d, tag]) => {
        let cur = 0;
        for (const l of d.laps) if (l.start <= t) cur = l.n; else break;
        const segs = d.stints
          .filter((st) => (st.lap_start ?? 1) <= cur)
          .map((st) => ({ from: st.lap_start ?? 1, to: Math.min(st.lap_end ?? cur, cur), c: COMPOUND[st.compound ?? ""], age: st.tyre_age_at_start ?? 0, n: st.stint_number }));
        return (
          <div key={tag} className={s.stRow}>
            <span className={s.stName}><em className={tag === "A" ? s.tagA : s.tagB}>{tag}</em><b className="lat">{d.acr}</b></span>
            <div className={s.stBar}>
              {segs.map((g) => {
                const w = ((g.to - g.from + 1) / xMax) * 100;
                return (
                  <span
                    key={g.n}
                    className={s.stSeg}
                    style={{ left: `${((g.from - 1) / xMax) * 100}%`, width: `${w}%`, ["--tc" as string]: g.c?.c ?? "#5f5f69" }}
                    title={`${g.c?.zh ?? "未知"} · 第 ${g.from}–${g.to} 圈${g.age ? ` · 起始胎龄 ${g.age}` : ""}`}
                  >
                    {w > 7 && <i className="lat">{g.c?.l ?? "?"}</i>}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className={s.stAxis}>
        <span />
        <div>{[1, ...ticks.filter((n) => xMax - n >= 4), xMax].map((n) => <b key={n} style={{ left: `${((n - 0.5) / xMax) * 100}%` }}>{n}</b>)}</div>
      </div>
    </div>
  );
}

function Tip({ g, n, hoverX, A, B, sa, sb, cA, cB, gap }: { g: Geo; n: number; hoverX: number; A: Driver; B: Driver; sa: Pt[]; sb: Pt[]; cA: string; cB: string; gap?: number }) {
  const pa = sa.find((p) => p.n === n), pb = sb.find((p) => p.n === n);
  const note = (p?: Pt) => (p ? [p.pitIn && "进站", p.pitOut && "出站", p.neutral && "中断", n === 1 && "首圈"].filter(Boolean).join(" ") : "");
  const left = hoverX > g.w * 0.62;
  return (
    <div className={s.tip} style={{ left: left ? undefined : hoverX + 12, right: left ? g.w - hoverX + 12 : undefined }}>
      <p>第 <b className="num">{n}</b> 圈</p>
      <p><i style={{ background: cA }} />{A.acr}<b className="num">{fmtLap(pa?.v)}</b><small>{note(pa)}</small></p>
      <p><i style={{ background: cB }} />{B.acr}<b className="num">{fmtLap(pb?.v)}</b><small>{note(pb)}</small></p>
      {pa && pb && <p className={s.tipD}>圈速差 <b className="num">{sign(pb.v - pa.v)}</b></p>}
      {gap != null && <p className={s.tipD}>{gap >= 0 ? `${B.acr} 落后` : `${B.acr} 领先`} <b className="num">{Math.abs(gap).toFixed(3)}</b></p>}
    </div>
  );
}

function geo(w: number, h: number, xMax: number, L = 52, R = 14, T = 18, B = 26): Geo {
  const x = (n: number) => L + ((n - 1) / Math.max(1, xMax - 1)) * (w - L - R);
  return { w, h, L, R, T, B, x, xMax };
}

function hoverHandlers(g: Geo, maxN: number, setHover: (n: number | null) => void, onPick: (n: number) => void, setX: (x: number) => void) {
  const toN = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    setX(px);
    const n = Math.round(1 + ((px - g.L) / Math.max(1, g.w - g.L - g.R)) * (g.xMax - 1));
    return Math.max(1, Math.min(maxN, n));
  };
  return {
    onPointerMove: (e: React.PointerEvent<SVGRectElement>) => setHover(toN(e)),
    onPointerDown: (e: React.PointerEvent<SVGRectElement>) => { const n = toN(e); setHover(n); onPick(n); },
    onPointerLeave: () => setHover(null),
  };
}

function LapChart({ model, sa, sb, cA, cB, dashB, xMax, hover, setHover, sel, onPick, A, B, gaps }: {
  model: Model; sa: Pt[]; sb: Pt[]; cA: string; cB: string; dashB: boolean; xMax: number; hover: number | null; setHover: (n: number | null) => void;
  sel: number | null; onPick: (n: number) => void; A: Driver | null; B: Driver | null; gaps: { n: number; v: number }[];
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hx, setHx] = useState(0);
  const h = 280;
  const g = geo(w || 600, h, xMax);
  const all = [...sa, ...sb];
  const clean = all.filter((p) => p.clean).map((p) => p.v);
  const vals = (clean.length >= 2 ? clean : all.map((p) => p.v)).sort((x, y) => x - y);
  let lo = vals.length ? vals[0] : 90, hi = vals.length ? vals[vals.length - 1] : 100;
  // robust top: keep the racing pace readable, let wet / traffic laps leave the chart (drawn as ▲)
  if (vals.length >= 6) {
    const mid = vals[vals.length >> 1];
    hi = Math.min(hi, mid + Math.max(4, (mid - lo) * 3));
  }
  const pad = Math.max(0.25, (hi - lo) * 0.08);
  lo -= pad; hi += pad;
  const clip = `lc${model.session.session_key}`;
  const step = niceStep(hi - lo, 5);
  const y = (v: number) => g.T + (1 - (v - lo) / (hi - lo)) * (h - g.T - g.B);
  const yTicks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push(+v.toFixed(3));
  const maxN = Math.max(1, ...all.map((p) => p.n));

  const path = (pts: Pt[]) => {
    let d = "";
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p.clean) continue;
      const prev = pts[i - 1];
      d += (prev && prev.clean && prev.n === p.n - 1 ? "L" : "M") + g.x(p.n).toFixed(1) + " " + y(p.v).toFixed(1);
    }
    return d;
  };
  const marks = (pts: Pt[], c: string) =>
    pts.filter((p) => !p.clean).map((p) => {
      const over = p.v > hi;
      const cx = g.x(p.n), cy = over ? g.T + 4 : y(p.v);
      return over
        ? <path key={p.n} d={`M${cx - 3.5} ${cy + 3}L${cx} ${cy - 3}L${cx + 3.5} ${cy + 3}Z`} fill={c} opacity={0.45} />
        : <circle key={p.n} cx={cx} cy={cy} r={3} fill="none" stroke={c} strokeWidth={1.25} opacity={0.55} />;
    });
  const pitMarks = (pts: Pt[], c: string, dy: number) => pts.filter((p) => p.pitIn).map((p) => (
    <text key={p.n} x={g.x(p.n)} y={h - g.B - dy} textAnchor="middle" className={s.pitMark} fill={c}>P</text>
  ));
  const hv = hover != null && hover <= maxN ? hover : null;
  const H = hoverHandlers(g, maxN, setHover, onPick, setHx);

  return (
    <div className={s.chart} ref={ref}>
      <div className={s.chartHead}>
        <h3>圈速</h3>
        <p><span><i className={s.lgLine} />干净圈</span><span><i className={s.lgRing} />进站 / 中断 / 首圈</span><span><i className={s.lgTri} />超出范围</span></p>
      </div>
      {w > 0 && (
        <svg width={w} height={h} className={s.svg}>
          <Bands g={g} model={model} yTop={g.T} yBot={h - g.B} />
          <g className={s.gl}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={g.L} x2={w - g.R} y1={y(v)} y2={y(v)} />
                <text x={g.L - 8} y={y(v) + 4} textAnchor="end">{fmtAxisLap(v, step)}</text>
              </g>
            ))}
          </g>
          <XAxis g={g} every={xMax > 40 ? 10 : 5} />
          {sel != null && <line className={s.selLine} x1={g.x(sel)} x2={g.x(sel)} y1={g.T} y2={h - g.B} />}
          <defs><clipPath id={clip}><rect x={g.L} y={g.T} width={Math.max(0, w - g.L - g.R)} height={h - g.T - g.B} /></clipPath></defs>
          {marks(sa, cA)}{marks(sb, cB)}
          <g clipPath={`url(#${clip})`}>
            <path d={path(sa)} fill="none" stroke={cA} strokeWidth={1.75} strokeLinejoin="round" />
            <path d={path(sb)} fill="none" stroke={cB} strokeWidth={1.75} strokeLinejoin="round" strokeDasharray={dashB ? "5 3" : undefined} />
          </g>
          {model.kind !== "race" && [[sa, cA], [sb, cB]].map(([pts, c], i) => (pts as Pt[]).filter((p) => p.clean && p.v <= hi).map((p) => (
            <circle key={`d${i}-${p.n}`} cx={g.x(p.n)} cy={y(p.v)} r={3} fill={c as string} />
          )))}
          {[[sa, cA], [sb, cB]].map(([pts, c], i) => (pts as Pt[]).filter((p) => p.clean && p.v > hi).map((p) => {
            const cx = g.x(p.n), cy = g.T + 4;
            return <path key={`${i}-${p.n}`} d={`M${cx - 3.5} ${cy + 3}L${cx} ${cy - 3}L${cx + 3.5} ${cy + 3}Z`} fill={c as string} opacity={0.8} />;
          }))}
          {pitMarks(sa, cA, 4)}{pitMarks(sb, cB, 15)}
          {hv != null && (
            <g>
              <line className={s.cross} x1={g.x(hv)} x2={g.x(hv)} y1={g.T} y2={h - g.B} />
              {[[sa, cA], [sb, cB]].map(([pts, c], i) => {
                const p = (pts as Pt[]).find((q) => q.n === hv);
                if (!p || p.v > hi) return null;
                return <circle key={i} cx={g.x(hv)} cy={y(p.v)} r={4} fill={c as string} stroke="#0e0e14" strokeWidth={2} />;
              })}
            </g>
          )}
          <rect x={g.L} y={g.T} width={Math.max(0, w - g.L - g.R)} height={h - g.T - g.B} fill="transparent" {...H} />
        </svg>
      )}
      {hv != null && A && B && <Tip g={g} n={hv} hoverX={hx} A={A} B={B} sa={sa} sb={sb} cA={cA} cB={cB} gap={gaps.find((q) => q.n === hv)?.v} />}
      {!all.length && <p className={s.chartEmpty}>回放时间之前还没有完成的计时圈</p>}
    </div>
  );
}

function GapChart({ model, gaps, cA, cB, xMax, hover, setHover, sel, onPick, A, B }: {
  model: Model; gaps: { n: number; v: number }[]; cA: string; cB: string; xMax: number; hover: number | null; setHover: (n: number | null) => void;
  sel: number | null; onPick: (n: number) => void; A: Driver | null; B: Driver | null;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [, setHx] = useState(0);
  const h = 200;
  const g = geo(w || 600, h, xMax);
  const vs = gaps.map((p) => p.v);
  let lo = Math.min(0, ...vs), hi = Math.max(0, ...vs);
  if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
  const pad = (hi - lo) * 0.1;
  lo -= pad; hi += pad;
  const step = niceStep(hi - lo, 4);
  const y = (v: number) => g.T + (1 - (v - lo) / (hi - lo)) * (h - g.T - g.B);
  const yTicks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push(+v.toFixed(3));
  const y0 = y(0);
  let line = "";
  gaps.forEach((p, i) => { line += (i && gaps[i - 1].n === p.n - 1 ? "L" : "M") + g.x(p.n).toFixed(1) + " " + y(p.v).toFixed(1); });
  const area = gaps.length > 1 ? `M${g.x(gaps[0].n)} ${y0}` + gaps.map((p) => `L${g.x(p.n).toFixed(1)} ${y(p.v).toFixed(1)}`).join("") + `L${g.x(gaps[gaps.length - 1].n)} ${y0}Z` : "";
  const maxN = Math.max(1, ...gaps.map((p) => p.n));
  const hv = hover != null && hover <= maxN ? hover : null;
  const hp = hv != null ? gaps.find((p) => p.n === hv) : null;
  const H = hoverHandlers(g, maxN, setHover, onPick, setHx);
  const id = `gap${model.session.session_key}`;

  return (
    <div className={s.chart} ref={ref}>
      <div className={s.chartHead}>
        <h3>差距 <small>B 相对 A · 累计圈时，每圈冲线时</small></h3>
        {A && B && <p><span><i className={s.lgBox} style={{ background: cA }} />{A.acr} 在前</span><span><i className={s.lgBox} style={{ background: cB }} />{B.acr} 在前</span></p>}
      </div>
      {w > 0 && (
        <svg width={w} height={h} className={s.svg}>
          <defs>
            <clipPath id={`${id}a`}><rect x={0} y={0} width={w} height={Math.max(0, y0)} /></clipPath>
            <clipPath id={`${id}b`}><rect x={0} y={y0} width={w} height={Math.max(0, h - y0)} /></clipPath>
          </defs>
          <Bands g={g} model={model} yTop={g.T} yBot={h - g.B} />
          <g className={s.gl}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={g.L} x2={w - g.R} y1={y(v)} y2={y(v)} className={v === 0 ? s.zero : undefined} />
                <text x={g.L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(step < 1 ? 1 : 0)}</text>
              </g>
            ))}
          </g>
          <XAxis g={g} every={xMax > 40 ? 10 : 5} />
          {area && <path d={area} fill={cA} opacity={0.16} clipPath={`url(#${id}a)`} />}
          {area && <path d={area} fill={cB} opacity={0.16} clipPath={`url(#${id}b)`} />}
          {sel != null && <line className={s.selLine} x1={g.x(sel)} x2={g.x(sel)} y1={g.T} y2={h - g.B} />}
          <path d={line} fill="none" stroke="#f2f2f5" strokeWidth={1.6} strokeLinejoin="round" />
          {hv != null && (
            <g>
              <line className={s.cross} x1={g.x(hv)} x2={g.x(hv)} y1={g.T} y2={h - g.B} />
              {hp && <circle cx={g.x(hv)} cy={y(hp.v)} r={4} fill={hp.v >= 0 ? cA : cB} stroke="#0e0e14" strokeWidth={2} />}
              {hp && (
                <text x={g.x(hv) + (g.x(hv) > w * 0.8 ? -8 : 8)} y={y(hp.v) - 8} textAnchor={g.x(hv) > w * 0.8 ? "end" : "start"} className={s.gapVal}>
                  {sign(hp.v)}
                </text>
              )}
            </g>
          )}
          <rect x={g.L} y={g.T} width={Math.max(0, w - g.L - g.R)} height={h - g.T - g.B} fill="transparent" {...H} />
        </svg>
      )}
      {!gaps.length && <p className={s.chartEmpty}>两位车手完成同一圈后显示差距</p>}
    </div>
  );
}

function SectorTable({ A, B, lapA, lapB, cA, cB, bests, title, mode, setMode, canStep, step, follow, onFollow, race }: {
  A: Driver | null; B: Driver | null; lapA: Lap | null; lapB: Lap | null; cA: string; cB: string; bests: number[]; title: string;
  mode: "lap" | "best"; setMode: (m: "lap" | "best") => void; canStep: boolean; step: (d: number) => void; follow: boolean; onFollow: () => void; race: boolean;
}) {
  if (!A || !B) return <div className={s.sectors} />;
  const rows: { k: string; a: number | null; b: number | null; best?: number; speed?: boolean }[] = [
    { k: "S1", a: lapA?.s[0] ?? null, b: lapB?.s[0] ?? null, best: bests[0] },
    { k: "S2", a: lapA?.s[1] ?? null, b: lapB?.s[1] ?? null, best: bests[1] },
    { k: "S3", a: lapA?.s[2] ?? null, b: lapB?.s[2] ?? null, best: bests[2] },
    { k: "Lap", a: lapA?.dur ?? null, b: lapB?.dur ?? null, best: bests[3] },
    { k: "测速点", a: lapA?.st ?? null, b: lapB?.st ?? null, speed: true },
  ];
  return (
    <div className={s.sectors}>
      <div className={s.secHead}>
        <h3>分段对比 <small>{title}</small></h3>
        <div className={s.secCtl}>
          <div className="seg">
            <button type="button" className={mode === "lap" ? "on" : ""} onClick={() => setMode("lap")}>同一圈</button>
            <button type="button" className={mode === "best" ? "on" : ""} onClick={() => setMode("best")}>最快圈</button>
          </div>
          {mode === "lap" && (
            <div className={s.stepper}>
              <button type="button" onClick={() => step(-1)} disabled={!canStep} aria-label="上一圈"><Icon name="chevron-left" size={18} /></button>
              <button type="button" onClick={() => step(1)} disabled={!canStep} aria-label="下一圈"><Icon name="chevron-right" size={18} /></button>
              {!follow && <button type="button" className={s.followBtn} onClick={onFollow}>最新</button>}
            </div>
          )}
        </div>
      </div>
      <table className={s.secTbl}>
        <thead>
          <tr><th /><th style={{ color: cA }}>{A.acr}</th><th style={{ color: cB }}>{B.acr}</th><th>B − A</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = r.a != null && r.b != null ? r.b - r.a : null;
            const fasterA = d != null && (r.speed ? d < 0 : d > 0);
            const fasterB = d != null && (r.speed ? d > 0 : d < 0);
            const f = (v: number | null) => (v == null ? "—" : r.speed ? `${v}` : r.k === "Lap" ? fmtLap(v) : v.toFixed(3));
            const isBest = (v: number | null) => !r.speed && v != null && r.best != null && Math.abs(v - r.best) < 1e-6;
            return (
              <tr key={r.k} className={r.k === "Lap" ? s.secLap : undefined}>
                <th>{r.k}{r.speed && <small> km/h</small>}</th>
                <td><span className={isBest(r.a) ? s.purple : undefined}>{f(r.a)}</span></td>
                <td><span className={isBest(r.b) ? s.purple : undefined}>{f(r.b)}</span></td>
                <td style={{ color: fasterA ? cA : fasterB ? cB : undefined }}>
                  {d == null ? "—" : r.speed ? (d > 0 ? "+" : d < 0 ? "−" : "±") + Math.abs(d) : sign(d)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={s.secNote}>
        {race ? "B − A 为负表示 B 更快；颜色标出该项更快的车手。" : "排位赛默认对比两人各自的最快圈。"}紫色为截至当前回放时刻的全场最快。
        {lapA?.pitOut || lapB?.pitOut ? " 该圈含出站圈。" : ""}
        {lapA?.neutral || lapB?.neutral ? " 该圈处于安全车 / 中断期间。" : ""}
      </p>
    </div>
  );
}
