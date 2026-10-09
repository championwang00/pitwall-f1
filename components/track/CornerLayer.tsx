"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CornerLayer, CornerPin, CornerSection } from "@/lib/corners";
import type { Mark, MarkPositions } from "@/components/three/Track3D";
import hv from "@/components/entity/hover.module.css";
import s from "./corner.module.css";

/**
 * Corner pins / labels / popover over a 3D track (IA spec §0.9.3). Track3D projects the marks every frame (after its
 * spin and pointer parallax) and calls `place`; this layer writes the DOM transforms directly — no React state per
 * frame, same pattern as the replay's A/B car tags. React only re-renders when a popover opens or closes.
 */

export type LayerMode = "corners" | "sectors" | "off";
export type Placer = (pos: MarkPositions) => void;
type Active = { type: "c" | "s"; key: string } | null;

const SECTOR_COLORS = ["#e10600", "#ffd800", "#00a1e8"];
const wrap = (t: number) => ((t % 1) + 1) % 1;
const mid = (x: CornerSection) => wrap(x.from + wrap(x.to - x.from) / 2);
const num = (n: string) => parseFloat(n) + (/[a-z]$/i.test(n) ? 0.5 : 0);
export const pinName = (k: CornerPin) => k.zh ?? k.name ?? null;

/** Marks Track3D should project: every corner (`c<n>`) and every section's middle (`s<id>`). */
export function cornerMarks(d: CornerLayer | null | undefined, withSections = true): Mark[] {
  if (!d) return [];
  return [
    ...d.corners.map((k) => ({ key: "c" + k.n, t: k.t })),
    ...(withSections ? d.sections.map((x) => ({ key: "s" + x.id, t: mid(x) })) : []),
  ];
}

/** A mode remembered per viewer (localStorage), with a different default on narrow screens. Read after mount only. */
export function useStoredMode<M extends string>(key: string, def: M, narrowDef: M, allowed: M[]): [M, (m: M) => void] {
  const [mode, setMode] = useState<M>(def);
  const allowedKey = allowed.join(",");
  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(key); } catch {}
    const ok = allowedKey.split(",");
    const narrow = window.matchMedia("(max-width: 760px)").matches;
    setMode((v && ok.includes(v) ? v : narrow ? narrowDef : def) as M);
  }, [key, def, narrowDef, allowedKey]);
  const set = useCallback((m: M) => {
    setMode(m);
    try { localStorage.setItem(key, m); } catch {}
  }, [key]);
  return [mode, set];
}

/** Keyboard focus only: a tap / click also focuses the button, but there the tap state owns the popover. */
export const kbd = (e: React.FocusEvent<HTMLElement>) => { try { return e.currentTarget.matches(":focus-visible"); } catch { return true; } };

/** ←/→ (and ↑/↓) move focus between the pins of one map, in corner order. */
function pinKeys(e: React.KeyboardEvent<HTMLElement>, onEsc: () => void) {
  if (e.key === "Escape") { onEsc(); e.preventDefault(); return; }
  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
  if (!d) return;
  const root = e.currentTarget.closest("[data-pins]");
  const pins = root ? [...root.querySelectorAll<HTMLElement>("[data-pin]")] : [];
  const i = pins.indexOf(e.currentTarget);
  if (i < 0 || !pins.length) return;
  pins[(i + d + pins.length) % pins.length].focus();
  e.preventDefault();
}

/** The popover body: hover-card type (hover.module.css), 260 px, no colour top. */
export function CornerPopBody({ data, active }: { data: CornerLayer; active: NonNullable<Active> }) {
  if (active.type === "c") {
    const k = data.corners.find((x) => x.n === active.key);
    if (!k) return null;
    const title = pinName(k);
    const stats: { v: string | number; k: string }[] = [];
    if (k.speed != null) stats.push({ v: k.speed, k: "最低 km/h" });
    if (k.gear != null) stats.push({ v: k.gear, k: "挡位" });
    if (k.sector) stats.push({ v: `S${k.sector}`, k: "计时段" });
    const chip = data.approx;
    return (
      <>
        <div className={s.popHead}>
          <b><em>T{k.n}</em>{title ? ` · ${title}` : ""}</b>
          {k.zh && k.name && k.name !== k.zh && <span>{k.name}</span>}
        </div>
        {k.note && <p className={hv.blurb}>{k.note}</p>}
        {stats.length > 0 || chip ? (
          <dl className={hv.stats}>
            {stats.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}
            {chip && <span className={s.chip}>位置约略</span>}
          </dl>
        ) : <div style={{ height: 14 }} />}
      </>
    );
  }
  const x = data.sections.find((q) => q.id === active.key);
  if (!x) return null;
  return (
    <>
      <div className={s.popHead}>
        <b>{x.zh ?? x.name}</b>
        {x.zh && x.name && <span>{x.name}</span>}
      </div>
      {x.note && <p className={hv.blurb}>{x.note}</p>}
      <dl className={hv.stats}>
        <div><dd>T{x.fromN}–T{x.toN}</dd><dt>{x.kind === "straight" ? "区间" : "弯角"}</dt></div>
        {x.len > 0 && <div><dd>{x.len.toLocaleString("en-US")}</dd><dt>长度 米</dt></div>}
      </dl>
    </>
  );
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const hit = (a: Box, b: Box, m = 4) => a.x0 < b.x1 + m && b.x0 < a.x1 + m && a.y0 < b.y1 + m && b.y0 < a.y1 + m;
type Side = "r" | "l" | "tr" | "br" | "tl" | "bl" | "c" | "cb";

/** Label box for a side of anchor p (label w × h). Corner labels sit beside their pin; section labels over / under the middle. */
function boxAt(side: Side, p: [number, number, number], w: number, h: number): Box {
  const [x, y] = p;
  switch (side) {
    case "r": return { x0: x + 13, y0: y - h / 2, x1: x + 13 + w, y1: y + h / 2 };
    case "l": return { x0: x - 13 - w, y0: y - h / 2, x1: x - 13, y1: y + h / 2 };
    case "tr": return { x0: x + 6, y0: y - 10 - h, x1: x + 6 + w, y1: y - 10 };
    case "br": return { x0: x + 6, y0: y + 10, x1: x + 6 + w, y1: y + 10 + h };
    case "tl": return { x0: x - 6 - w, y0: y - 10 - h, x1: x - 6, y1: y - 10 };
    case "bl": return { x0: x - 6 - w, y0: y + 10, x1: x - 6, y1: y + 10 + h };
    case "c": return { x0: x - w / 2, y0: y - 14 - h, x1: x + w / 2, y1: y - 14 };
    case "cb": return { x0: x - w / 2, y0: y + 14, x1: x + w / 2, y1: y + 14 + h };
  }
}
const CORNER_SIDES: Side[] = ["r", "l", "tr", "br", "tl", "bl"];
const SECTION_SIDES: Side[] = ["c", "cb", "r", "l"];

/** Boxes of the hero's text column (its text lines, pictures and tiles) in the overlay's frame: labels never cover them. */
function textObstacles(root: HTMLElement): Box[] {
  const col = root.closest("[data-hero]")?.querySelector("[data-hero-text]");
  if (!col) return [];
  const o = root.getBoundingClientRect();
  const out: Box[] = [];
  const add = (r: DOMRect) => { if (r.width && r.height) out.push({ x0: r.left - o.left, y0: r.top - o.top, x1: r.right - o.left, y1: r.bottom - o.top }); };
  const range = document.createRange();
  const walk = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.textContent?.trim()) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) add(r);
  }
  for (const el of col.querySelectorAll<HTMLElement>("*")) {
    if (el.tagName === "IMG" || el.tagName === "svg") { add(el.getBoundingClientRect()); continue; }
    const cs = getComputedStyle(el);
    if ((cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || cs.backgroundImage !== "none" || cs.boxShadow !== "none") add(el.getBoundingClientRect());
  }
  return out.filter((b) => b.x1 > 0);
}

/**
 * Interactive layer for the circuit / race hero (`TrackField`). `placeRef` is filled with the per-frame placer.
 * `labels` = named corners + sections (the 「弯角」 mode); pins are always drawn when the layer is on.
 */
export function CornerOverlay({ data, labels, placeRef, onHighlight, dark = false }: {
  data: CornerLayer; labels: boolean; placeRef: React.MutableRefObject<Placer | null>;
  onHighlight?: (h: [number, number] | null) => void; dark?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const last = useRef<MarkPositions | null>(null);
  const [hover, setHover] = useState<Active>(null);
  const [focus, setFocus] = useState<Active>(null);
  const [tap, setTap] = useState<Active>(null);
  const [esc, setEsc] = useState(false);
  const active: Active = hover ?? (focus && !esc ? focus : null) ?? tap;
  const activeRef = useRef<Active>(null);
  activeRef.current = active;
  const popId = `cpop-${data.circuit}`;

  // label candidates: named corners (a run of the same name keeps its first corner only) + sections; priority = lower
  // corner number first, a section just ahead of its own first corner
  const cands = useMemo(() => {
    const out: { key: string; prio: number; kind: "c" | "s" }[] = [];
    data.corners.forEach((k, i) => {
      if (!k.zh && !k.name) return;
      // Degner 1 → Degner 2, Lesmo 1 → Lesmo 2 count as one run too
      const p = data.corners[i - 1], base = (x?: string) => x?.replace(/\s*\d+$/, "");
      if (p && ((k.name && base(p.name) === base(k.name)) || (k.zh && p.zh === k.zh))) return;
      // iconic corners (data `star`) are labelled first, then by corner number (user: 130R 没有名字)
      out.push({ key: "c" + k.n, prio: (k.star ? -1000 : 0) + num(k.n), kind: "c" });
    });
    for (const x of data.sections) out.push({ key: "s" + x.id, prio: num(x.fromN) - 0.5, kind: "s" });
    return out.sort((a, b) => a.prio - b.prio);
  }, [data]);

  // corners inside each section (its popover keeps clear of them)
  const secPins = useMemo(() => new Map(data.sections.map((x) => [x.id, data.corners.filter((k) => k.n === x.fromN || k.n === x.toN || wrap(k.t - x.from) <= wrap(x.to - x.from)).map((k) => k.n)])), [data]);

  // which labels show + on which side: recomputed ≤ 4×/s (labels fade, so a cull never pops)
  const shown = useRef(new Map<string, Side>());
  const size = useRef(new Map<string, [number, number]>());
  const lastCull = useRef(0);
  const narrow = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => { narrow.current = mq.matches; lastCull.current = 0; };
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // the hero's text column, in this overlay's frame (recomputed on resize / font load, not per cull)
  const avoid = useRef<Box[] | null>(null);
  const avoidAt = useRef(0);
  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const reset = () => { avoid.current = null; lastCull.current = 0; };
    const ro = new ResizeObserver(reset);
    ro.observe(r);
    document.fonts?.ready.then(reset).catch(() => {});
    return () => ro.disconnect();
  }, []);

  const cull = useCallback((pos: MarkPositions, W: number, H: number) => {
    const next = new Map<string, Side>();
    if (labels && !narrow.current && root.current) {
      // late layout (images, chips) settles within seconds: refresh the text boxes every 2 s at most
      if (!avoid.current || performance.now() - avoidAt.current > 2000) { avoid.current = textObstacles(root.current); avoidAt.current = performance.now(); }
      const taken: (Box & { ax: number; ay: number })[] = [];
      const pins: [string, Box][] = [];
      for (const k of data.corners) {
        const p = pos.get("c" + k.n);
        if (p) pins.push(["c" + k.n, { x0: p[0] - 9, y0: p[1] - 9, x1: p[0] + 9, y1: p[1] + 9 }]);
      }
      for (const c of cands) {
        const p = pos.get(c.key), el = els.current.get("l" + c.key);
        if (!p || !el) continue;
        const w = el.offsetWidth, h = el.offsetHeight;
        size.current.set(c.key, [w, h]);
        // two anchors too close to tell apart: only the lower corner number keeps its label (§0.9.3 ②). The spec says
        // 44 px; 32 here because label boxes, other pins and the hero text are obstacles as well, and at 44 the tight
        // complexes (Suzuka's crossover, Monaco's harbour) lost labels that had free space beside them
        if (taken.some((t) => Math.hypot(t.ax - p[0], t.ay - p[1]) < 32)) continue;
        for (const side of c.kind === "s" ? SECTION_SIDES : CORNER_SIDES) {
          const b = boxAt(side, p, w, h);
          if (b.x0 < 4 || b.y0 < 4 || b.x1 > W - 4 || b.y1 > H - 4) continue;
          if (taken.some((t) => hit(t, b))) continue;
          if (pins.some(([key, pb]) => (c.kind === "s" || key !== c.key) && hit(pb, b, 1))) continue;
          if (avoid.current.some((a) => hit(a, b, 6))) continue;
          taken.push({ ...b, ax: p[0], ay: p[1] });
          next.set(c.key, side);
          break;
        }
      }
    }
    for (const c of cands) {
      const el = els.current.get("l" + c.key);
      if (!el) continue;
      if (next.has(c.key)) el.setAttribute("data-show", ""); else el.removeAttribute("data-show");
    }
    shown.current = next;
  }, [cands, data.corners, labels]);

  const place = useCallback<Placer>((pos) => {
    last.current = pos;
    const r = root.current;
    if (!r) return;
    const W = r.clientWidth, H = r.clientHeight;
    const now = performance.now();
    if (now - lastCull.current > 250) { lastCull.current = now; cull(pos, W, H); }
    for (const [key, p] of pos) {
      const pin = els.current.get(key);
      if (pin) pin.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`;
      const el = els.current.get("l" + key);
      if (!el) continue;
      const side = shown.current.get(key);
      if (!side) continue;
      const [w, h] = size.current.get(key) ?? [el.offsetWidth, el.offsetHeight];
      const b = boxAt(side, p, w, h);
      el.style.transform = `translate(${b.x0.toFixed(1)}px, ${b.y0.toFixed(1)}px)`;
      if (p[2] > 0) el.setAttribute("data-back", ""); else el.removeAttribute("data-back");
    }
    r.removeAttribute("data-pending");
    // popover follows its pin (the map spins slowly): right of the pin, flipped left / up at the edges
    const a = activeRef.current, el = pop.current;
    if (a && el) {
      const p = pos.get(a.type + a.key);
      if (!p) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      const rect = r.getBoundingClientRect();
      // a section's card stands beside the whole stretch (its pins + middle), never over the highlighted ribbon
      let bx0 = p[0], bx1 = p[0], by0 = p[1], by1 = p[1];
      if (a.type === "s") for (const n of secPins.get(a.key) ?? []) {
        const q = pos.get("c" + n);
        if (q) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]); }
      }
      const side = a.type === "s" ? shown.current.get("s" + a.key) : undefined, ls = size.current.get("s" + a.key);
      if (side && ls) { const b = boxAt(side, p, ls[0], ls[1]); bx0 = Math.min(bx0, b.x0); bx1 = Math.max(bx1, b.x1); by0 = Math.min(by0, b.y0); by1 = Math.max(by1, b.y1); }
      const right = window.innerWidth - 8 - rect.left;
      let x = bx1 + 16, y = a.type === "s" ? (by0 + by1) / 2 - h / 2 : p[1] - 12;
      if (x + w > W - 4 || x + w > right) x = bx0 - 16 - w;
      if (a.type === "s" && x < 8 - rect.left) { x = (bx0 + bx1) / 2 - w / 2; y = by1 + 16 > H - 4 - h ? by0 - 16 - h : by1 + 16; }
      if (y + h > H - 4) y = (a.type === "s" ? by0 : p[1] + 12) - h - (a.type === "s" ? 16 : 0);
      if (a.type === "c" && x < 8 - rect.left) {
        // neither side fits (phone width): centre it under the pin, or over it near the bottom
        x = p[0] - w / 2;
        y = p[1] + 14 + h > H - 4 ? p[1] - 14 - h : p[1] + 14;
      }
      x = Math.max(8 - rect.left, Math.min(x, window.innerWidth - 8 - rect.left - w));
      y = Math.max(4, y);
      // the card lives in <body> (fixed): above the hero's text column, never clipped by the hero's overflow
      el.style.transform = `translate(${(rect.left + x).toFixed(1)}px, ${(rect.top + y).toFixed(1)}px)`;
    }
  }, [cull, secPins]);
  useEffect(() => { placeRef.current = place; return () => { placeRef.current = null; }; }, [place, placeRef]);
  // re-cull right away when labels toggle or the popover opens (its first frame needs a position)
  useLayoutEffect(() => { lastCull.current = 0; if (last.current) place(last.current); }, [labels, active?.key, active?.type, place]);

  // highlight the hovered / focused section on the ribbon
  useEffect(() => {
    const x = active?.type === "s" ? data.sections.find((q) => q.id === active.key) : null;
    onHighlight?.(x ? [x.from, x.to] : null);
  }, [active?.type, active?.key, data.sections, onHighlight]);

  // touch: a tap elsewhere closes the tapped popover
  useEffect(() => {
    if (!tap) return;
    const off = (e: PointerEvent) => { if (!(e.target as Element).closest?.("[data-pin],[data-sec]")) setTap(null); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [tap]);

  const reg = (key: string) => (el: HTMLElement | null) => { if (el) els.current.set(key, el); else els.current.delete(key); };
  const enter = (a: Active) => (e: React.PointerEvent) => { if (e.pointerType !== "touch") setHover(a); };
  const leave = (e: React.PointerEvent) => { if (e.pointerType !== "touch") setHover(null); };
  const toggle = (a: NonNullable<Active>) => () => {
    if (!window.matchMedia("(hover: none)").matches) return;
    setTap((t) => (t && t.key === a.key && t.type === a.type ? null : a));
  };

  return (
    <div ref={root} className={`${s.root} ${dark ? s.dark : ""}`} data-pins="" data-pending="">
      {data.corners.map((k) => {
        const a = { type: "c" as const, key: k.n };
        const on = active?.type === "c" && active.key === k.n;
        const nm = pinName(k);
        return (
          <button key={k.n} ref={reg("c" + k.n)} type="button" className={s.pin} data-pin="" data-wide={k.n.length > 2 ? "" : undefined} data-on={on ? "" : undefined}
            aria-label={`T${k.n}${nm ? " " + nm : ""}`} aria-describedby={on ? popId : undefined}
            onPointerEnter={enter(a)} onPointerLeave={leave} onClick={toggle(a)}
            onFocus={(e) => { setEsc(false); if (kbd(e)) setFocus(a); }} onBlur={() => setFocus(null)}
            onKeyDown={(e) => pinKeys(e, () => { setEsc(true); setTap(null); setHover(null); })}>
            {k.n}
          </button>
        );
      })}
      {cands.filter((c) => c.kind === "c").map((c) => {
        const k = data.corners.find((x) => "c" + x.n === c.key)!;
        return (
          // the label belongs to its pin: hover opens the same popover, never a separate tab stop
          <span key={c.key} ref={reg("l" + c.key)} className={s.label} aria-hidden onPointerEnter={enter({ type: "c", key: k.n })} onPointerLeave={leave}>
            {k.zh ? <><b>{k.zh}</b>{k.name && k.name !== k.zh && <span>{k.name}</span>}</> : <b className="lat">{k.name}</b>}
          </span>
        );
      })}
      {data.sections.map((x) => {
        const a = { type: "s" as const, key: x.id };
        const on = active?.type === "s" && active.key === x.id;
        return (
          <button key={x.id} ref={reg("ls" + x.id)} type="button" className={s.section} data-sec="" data-on={on ? "" : undefined}
            aria-label={x.zh ?? x.name} aria-describedby={on ? popId : undefined}
            onPointerEnter={enter(a)} onPointerLeave={leave} onClick={toggle(a)}
            onFocus={(e) => { setEsc(false); if (kbd(e)) setFocus(a); }} onBlur={() => setFocus(null)}
            onKeyDown={(e) => { if (e.key === "Escape") { setEsc(true); setTap(null); setHover(null); } }}>
            <i />{x.zh ?? x.name}
          </button>
        );
      })}
      {active && createPortal(
        <div ref={pop} id={popId} role="tooltip" className={`${hv.card} ${s.float} ${dark ? s.floatDark : ""}`}>
          <CornerPopBody data={data} active={active} />
        </div>,
        document.body,
      )}
    </div>
  );
}

/** 弯角 · 分段 · 关 (hero) or 弯角 · 关 (replay). 分段 only appears once the real S1/S2/S3 boundaries are built — a control
 *  that cannot be used is not shown at all (user: 这个分段为啥点不了). */
export function CornerLegend({ mode, setMode, data, modes, className }: {
  mode: LayerMode; setMode: (m: LayerMode) => void; data: CornerLayer; modes: LayerMode[]; className?: string;
}) {
  const label: Record<LayerMode, string> = { corners: "弯角", sectors: "分段", off: "关" };
  const list = modes.filter((m) => (m !== "corners" || data.corners.length > 0) && (m !== "sectors" || !!data.sectors));
  return (
    <div className={`${s.legend} ${className ?? ""}`}>
      {mode === "sectors" && data.sectors && (
        <span className={s.key} aria-hidden>
          {SECTOR_COLORS.map((c, i) => <span key={c} style={{ ["--k" as string]: c }}><i />S{i + 1}</span>)}
        </span>
      )}
      <div className="seg" role="group" aria-label="赛道图层">
        {list.map((m) => {
          return (
            <button key={m} type="button" className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>{label[m]}</button>
          );
        })}
      </div>
    </div>
  );
}

/** /live banner: number pins only — static, quiet, inside the banner's link (no interactive children). */
export function StaticPins({ pins, placeRef }: { pins: { n: string; t: number }[]; placeRef: React.MutableRefObject<Placer | null> }) {
  const root = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    placeRef.current = (pos) => {
      for (const [key, p] of pos) {
        const el = els.current.get(key);
        if (el) el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`;
      }
      root.current?.removeAttribute("data-pending");
    };
    return () => { placeRef.current = null; };
  }, [placeRef]);
  return (
    <div ref={root} className={`${s.root} ${s.static}`} aria-hidden data-pending="">
      {pins.map((k) => (
        <span key={k.n} ref={(el) => { if (el) els.current.set("c" + k.n, el); else els.current.delete("c" + k.n); }} className={s.pin} data-wide={k.n.length > 2 ? "" : undefined}>{k.n}</span>
      ))}
    </div>
  );
}

export { pinKeys, s as cornerStyles };
