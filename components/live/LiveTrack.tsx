"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Car } from "@/components/three/Track3D";
import { PALETTE_DARK } from "@/components/three/Track3D";
import { Clock, useClockT } from "./clock";
import { lapProgress, standings, type Model } from "./model";
import { buildCurve, dim, makeProjector, timeToDistance } from "./trackMath";
import s from "./live.module.css";

const Track3D = dynamic(() => import("@/components/three/Track3D"), { ssr: false });

type P3 = [number, number, number];
const CAM: P3 = [0, 10.5, 6.5];
const FIT = 5.3;
// the travelling "pulse" is decoration — paint it the colour of the asphalt so only the cars move
const PALETTE = { ...PALETTE_DARK, pulse: PALETTE_DARK.track };

export default function LiveTrack({
  model, clock, points, a, b, onPick, children,
}: {
  model: Model; clock: Clock; points: P3[] | null; a: number | null; b: number | null;
  onPick: (n: number) => void; children?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const tagA = useRef<HTMLDivElement>(null);
  const tagB = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ num: number; x: number; y: number; pos: number | null } | null>(null);
  const t4 = useClockT(clock, 4);

  const curve = useMemo(() => (points ? buildCurve(points) : null), [points]);
  const t2d = useMemo(() => (points ? timeToDistance(points) : null), [points]);
  const project = useMemo(() => (size.w && size.h ? makeProjector(size.w, size.h, CAM, FIT) : null), [size]);

  // grid slots for the pre-start: order of first position record
  const grid = useMemo(() => {
    const g = new Map<number, number>();
    for (const n of model.nums) g.set(n, model.drivers.get(n)!.pos[0]?.p ?? 20);
    return g;
  }, [model]);

  // which cars are on track right now (recoloured 4×/s; black + additive blending = invisible)
  const visible = useMemo(() => {
    const v = new Set<number>();
    for (const n of model.nums) if (lapProgress(model, model.drivers.get(n)!, t4, grid.get(n)!) != null) v.add(n);
    return [...v].sort((x, y) => x - y).join(",");
  }, [model, t4, grid]);

  const cars = useMemo(() => {
    const vis = new Set(visible.split(",").filter(Boolean).map(Number));
    const list: (Car & { num: number })[] = [];
    const focus = a != null || b != null;
    // seed positions at the current instant so a recolour never flashes cars at the line
    const at = (n: number) => {
      const f = lapProgress(model, model.drivers.get(n)!, clock.t, grid.get(n)!);
      return f != null && t2d ? t2d(f) : 0;
    };
    for (const n of model.nums) {
      const d = model.drivers.get(n)!;
      const on = vis.has(n);
      const sel = n === a || n === b;
      list.push({ num: n, t: at(n), color: !on ? "#000000" : sel || !focus ? d.color : dim(d.color, 0.5) });
    }
    for (const n of [a, b]) if (n != null && vis.has(n)) list.push({ num: n, t: at(n), color: model.drivers.get(n)!.color });
    return list;
  }, [model, visible, a, b, clock, grid, t2d]);

  // per-frame: move cars (mutating the array Track3D reads in its own frame loop) and pin the A/B tags
  const screen = useRef(new Map<number, [number, number]>());
  useEffect(() => {
    if (!curve || !t2d) return;
    const place = () => {
      const t = clock.t;
      const pts = screen.current;
      pts.clear();
      const tByNum = new Map<number, number>();
      for (const n of model.nums) {
        const f = lapProgress(model, model.drivers.get(n)!, t, grid.get(n)!);
        if (f == null) continue;
        const u = t2d(f);
        tByNum.set(n, u);
        if (project) pts.set(n, project(curve.getPointAt(((u % 1) + 1) % 1)));
      }
      for (const c of cars) { const u = tByNum.get(c.num); if (u != null) c.t = u; }
      // when A and B are nose to tail, drop B's label below its car so the two never overlap
      const pa = a != null ? pts.get(a) : undefined, pb = b != null ? pts.get(b) : undefined;
      tagB.current?.classList.toggle(s.below, !!(pa && pb && Math.abs(pa[0] - pb[0]) < 84 && Math.abs(pa[1] - pb[1]) < 30));
      for (const [ref, n] of [[tagA, a], [tagB, b]] as const) {
        const el = ref.current;
        if (!el) continue;
        const p = n != null ? pts.get(n) : undefined;
        if (!p) { el.style.opacity = "0"; continue; }
        el.style.opacity = "1";
        el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`;
      }
    };
    place();
    return clock.subscribe(place);
  }, [clock, model, curve, t2d, project, grid, a, b, cars]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nearest = (x: number, y: number) => {
    let best: number | null = null, bd = 18 * 18;
    for (const [n, p] of screen.current) {
      const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const sf = curve && project ? project(curve.getPointAt(0)) : null;
  const da = a != null ? model.drivers.get(a) : null;
  const db = b != null ? model.drivers.get(b) : null;
  const hd = hover ? model.drivers.get(hover.num) : null;

  return (
    <div className={s.trackBox} ref={box}>
      {points ? (
        <Track3D
          className={s.trackCanvas}
          points={points}
          palette={PALETTE}
          positions={cars}
          spin={0}
          camera={CAM}
          fit={FIT}
          lapSeconds={1e9}
          showSectors={false}
        />
      ) : (
        <div className={s.trackEmpty}>暂无该赛道的轮廓数据</div>
      )}
      {/* overlay sits above the canvas: keeps the scene still (no pointer parallax) so tags stay pinned */}
      <div
        className={s.trackOverlay}
        onPointerMove={(e) => {
          const [x, y] = local(e);
          const n = nearest(x, y);
          if (n == null) { if (hover) setHover(null); return; }
          const pos = hover?.num === n ? hover.pos : standings(model, clock.t).find((r) => r.num === n)?.pos ?? null;
          setHover({ num: n, x, y, pos });
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const [x, y] = local(e);
          const n = nearest(x, y);
          if (n != null) onPick(n);
        }}
        style={{ cursor: hover ? "pointer" : "default" }}
      >
        {sf && <span className={s.sfMark} style={{ transform: `translate(${sf[0]}px, ${sf[1]}px)` }} title="起终点线" />}
        {da && (
          <div ref={tagA} className={s.carTag} style={{ ["--c" as string]: da.color }}>
            <i /><span><b>A</b>{da.acr}</span>
          </div>
        )}
        {db && (
          <div ref={tagB} className={`${s.carTag} ${s.carTagB}`} style={{ ["--c" as string]: db.color }}>
            <i /><span><b>B</b>{db.acr}</span>
          </div>
        )}
        {hover && hd && hover.num !== a && hover.num !== b && (
          <div className={s.carHover} style={{ left: hover.x, top: hover.y, ["--c" as string]: hd.color }}>
            <b className="num">P{hover.pos ?? "–"}</b> {hd.acr} <span>点击设为对比车手</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
