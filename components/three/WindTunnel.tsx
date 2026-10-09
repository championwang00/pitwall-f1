"use client";

import { useEffect, useRef, useState } from "react";
import s from "./wind.module.css";

/**
 * Flow-visualisation over the official side-view car cut-out: streaks travel nose → tail and are
 * deflected around the car's silhouette (read from the PNG alpha). "直道模式 / 弯道模式" mimics the
 * 2026 active-aero states: corner mode bends the flow harder and curls it off the rear wing.
 */
export default function WindTunnel({ src, color = "#ffffff", modes = false, alt = "" }: { src: string; color?: string; modes?: boolean; alt?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [mode, setMode] = useState<"straight" | "corner">("corner");
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const c = cvs.current!, im = img.current!, w = wrap.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0, top: Float32Array, bot: Float32Array, W = 0, H = 0, ox = 0, oy = 0, iw = 0, ih = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    type P = { x: number; y: number; lane: number; v: number; life: number };
    let ps: P[] = [];

    const measure = () => {
      const r = w.getBoundingClientRect();
      W = r.width; H = r.height;
      c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ir = im.getBoundingClientRect();
      ox = ir.left - r.left; oy = ir.top - r.top; iw = ir.width; ih = ir.height;
      // silhouette envelope per canvas column
      top = new Float32Array(Math.ceil(W)).fill(-1); bot = new Float32Array(Math.ceil(W)).fill(-1);
      if (!im.naturalWidth) return;
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(iw)); off.height = Math.max(1, Math.round(ih));
      const o = off.getContext("2d")!;
      try {
        o.drawImage(im, 0, 0, off.width, off.height);
        const data = o.getImageData(0, 0, off.width, off.height).data;
        for (let x = 0; x < off.width; x++) {
          let t = -1, b = -1;
          for (let y = 0; y < off.height; y++) if (data[(y * off.width + x) * 4 + 3] > 60) { if (t < 0) t = y; b = y; }
          const cx = Math.round(x + ox);
          if (cx >= 0 && cx < top.length && t >= 0) { top[cx] = t + oy; bot[cx] = b + oy; }
        }
      } catch { /* tainted canvas: run without deflection */ }
      ps = Array.from({ length: Math.round(W * 0.9) }, () => spawn(Math.random() * W));
    };
    const spawn = (x: number): P => { const lane = Math.random() * H; return { x, y: lane, lane, v: 2.2 + Math.random() * 2.4, life: 0 }; };

    const onLoad = () => measure();
    if (im.complete) measure(); else im.addEventListener("load", onLoad);
    const ro = new ResizeObserver(measure);
    ro.observe(w);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      const corner = modeRef.current === "corner";
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      for (const p of ps) {
        const px = p.x, py = p.y;
        const speed = p.v * (corner ? 1 : 1.45);
        p.x -= speed;
        const look = Math.round(p.x - 26);
        let target = p.lane;
        if (top && look >= 0 && look < top.length && top[look] >= 0) {
          const t = top[look], b = bot[look], m = (t + b) / 2, pad = corner ? 16 : 8;
          if (p.lane > t - 40 && p.lane < b + 40) target = p.lane < m ? t - pad - (m - p.lane) * 0.12 : b + pad;
        }
        // rear-wing upwash in corner mode: the car's left ~12%
        if (corner && iw && p.x < ox + iw * 0.12 && p.x > ox - 120 && p.lane < oy + ih * 0.5) target -= (ox + iw * 0.12 - p.x) * 0.22;
        p.y += (target - p.y) * (corner ? 0.09 : 0.06);
        p.life++;
        const near = top && look >= 0 && look < top.length && top[look] >= 0 && Math.abs(p.y - top[look]) < 24;
        ctx.strokeStyle = near ? color : "rgba(255,255,255,0.22)";
        ctx.globalAlpha = near ? 0.55 : 0.5;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x, p.y); ctx.stroke();
        if (p.x < -20) Object.assign(p, spawn(W + Math.random() * 60));
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); im.removeEventListener("load", onLoad); };
  }, [src, color]);

  return (
    <div className={s.wrap} ref={wrap}>
      <canvas ref={cvs} className={s.flow} aria-hidden />
      <img ref={img} src={src} alt={alt} crossOrigin="anonymous" className={s.car} />
      {modes && (
        <div className={s.modes}>
          <span>2026 主动空气动力学</span>
          <div className="seg">
            <button className={mode === "corner" ? "on" : undefined} onClick={() => setMode("corner")}>弯道模式 · 高下压力</button>
            <button className={mode === "straight" ? "on" : undefined} onClick={() => setMode("straight")}>直道模式 · 低阻力</button>
          </div>
        </div>
      )}
    </div>
  );
}
