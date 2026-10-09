"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Replay/live clock (epoch ms). One rAF loop; subscribers decide how often they re-render. */
export class Clock {
  t = 0;
  t0 = 0;
  t1 = 1;
  playing = false;
  speed = 16;
  /** live mode: the clock tracks wall time minus `delay` */
  follow = false;
  delay = 6000;
  private subs = new Set<() => void>();
  private meta = new Set<() => void>();
  private raf = 0;
  private last = 0;
  private metaSnap = "";

  subscribe = (fn: () => void) => { this.subs.add(fn); return () => { this.subs.delete(fn); }; };
  subscribeMeta = (fn: () => void) => { this.meta.add(fn); return () => { this.meta.delete(fn); }; };
  getMeta = () => this.metaSnap;

  private emit() { for (const f of this.subs) f(); }
  private emitMeta() {
    const s = `${this.playing ? 1 : 0}|${this.speed}|${this.follow ? 1 : 0}`;
    if (s !== this.metaSnap) { this.metaSnap = s; for (const f of this.meta) f(); }
  }

  setRange(t0: number, t1: number, t?: number) {
    this.t0 = t0; this.t1 = Math.max(t0 + 1, t1);
    this.t = Math.min(this.t1, Math.max(this.t0, t ?? this.t));
    this.emitMeta(); this.emit();
  }
  seek(t: number) {
    if (this.follow) this.follow = false;
    this.t = Math.min(this.t1, Math.max(this.t0, t));
    this.emitMeta(); this.emit();
  }
  setSpeed(s: number) { this.speed = s; this.emitMeta(); }
  play() {
    if (this.t >= this.t1 - 500) this.t = this.t0;
    this.playing = true; this.follow = false; this.emitMeta(); this.loop();
  }
  pause() { this.playing = false; this.emitMeta(); this.emit(); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  goLive() { this.follow = true; this.playing = false; this.emitMeta(); this.loop(); }

  private loop() {
    if (this.raf) return;
    this.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(250, now - this.last);
      this.last = now;
      if (this.follow) {
        const target = Date.now() - this.delay;
        if (target > this.t1) this.t1 = target;
        this.t = Math.max(this.t0, target);
      } else if (this.playing) {
        this.t += dt * this.speed;
        if (this.t >= this.t1) { this.t = this.t1; this.playing = false; this.emitMeta(); }
      }
      this.emit();
      if (this.playing || this.follow) this.raf = requestAnimationFrame(step);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(step);
  }
  dispose() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.subs.clear(); this.meta.clear(); }
}

/** Clock time, re-rendering at most `fps` times per second (trailing update guaranteed). */
export function useClockT(clock: Clock, fps = 8) {
  const [t, setT] = useState(clock.t);
  useEffect(() => {
    let lastSet = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const gap = 1000 / fps;
    const push = () => { lastSet = performance.now(); timer = null; setT(clock.t); };
    push();
    const un = clock.subscribe(() => {
      const since = performance.now() - lastSet;
      if (since >= gap) { if (timer) { clearTimeout(timer); timer = null; } push(); }
      else if (!timer) timer = setTimeout(push, gap - since);
    });
    return () => { un(); if (timer) clearTimeout(timer); };
  }, [clock, fps]);
  return t;
}

export function useClockMeta(clock: Clock) {
  const snap = useSyncExternalStore(clock.subscribeMeta, clock.getMeta, () => "");
  const [p, s, f] = snap.split("|");
  return { playing: p === "1", speed: Number(s) || clock.speed, follow: f === "1" };
}
