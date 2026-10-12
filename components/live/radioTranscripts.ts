"use client";
import { useSyncExternalStore } from "react";

export type Segment = { start: number; end: number; text: string; zh?: string; speaker?: string; speakerSource?: string; voiceId?: string; voiceSimilarity?: number; voiceReferenceId?: string };
export type Transcript = { text: string; textZh?: string; segments: Segment[]; translationStatus?: "pending" | "complete"; voiceStatus?: "pending" | "needs-reference" | "complete" | "unavailable" };
export type TxState = { st: "idle" | "queued" | "loading" | "pending" | "done" | "error"; t?: Transcript; retrying?: boolean };
const MAX = 2;
const store = new Map<string, TxState>();
const subs = new Set<() => void>();
let version = 0;
const queue: string[] = [];
let running = 0;
const visible = new Set<string>();
const urgentSet = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const attempts = new Map<string, number>();
const ctl = new Map<string, AbortController>();
function emit() { version++; for (const f of subs) f(); }
function set(url: string, v: TxState) { store.set(url, v); emit(); }
function complete(url: string) { const x = txOf(url); return x.st === "done" && x.t?.translationStatus !== "pending"; }
function active(url: string) { return visible.has(url) || urgentSet.has(url); }
export function txOf(url: string): TxState { return store.get(url) ?? { st: "idle" }; }
export function useTxVersion() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
}
const peeked = new Set<string>();
export async function peekAll(urls: string[]) {
  const todo = urls.filter(u => !peeked.has(u) && !complete(u));
  todo.forEach(u => peeked.add(u));
  for (let i = 0; i < todo.length; i += 200) {
    const batch = todo.slice(i, i + 200);
    try {
      const r = await fetch("/api/radio/transcript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls: batch }) });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json() as Record<string, Transcript | null>;
      for (const [u, t] of Object.entries(data)) if (t && typeof t.text === "string" && Array.isArray(t.segments)) {
        clearTimeout(timers.get(u)); timers.delete(u);
        set(u, { st: "done", t });
        if (t.translationStatus === "pending") retry(u, 30);
      }
    } catch { batch.forEach(u => peeked.delete(u)); }
  }
}
function retry(url: string, after: number) {
  if (!active(url) || timers.has(url)) return;
  const n = (attempts.get(url) ?? 0) + 1;
  attempts.set(url, n);
  const delay = Math.min(120, Math.max(1, after) * Math.min(4, 2 ** (n - 1)));
  timers.set(url, setTimeout(() => {
    timers.delete(url);
    if (active(url) && !complete(url)) enqueue(url);
  }, delay * 1000));
}
function load(url: string) {
  const c = new AbortController();
  ctl.set(url, c); running++;
  if (txOf(url).st !== "done") set(url, { st: "loading" });
  fetch(`/api/radio/transcript?url=${encodeURIComponent(url)}${urgentSet.has(url) ? "&p=1" : ""}`, { signal: c.signal })
    .then(async r => {
      const data = await r.json();
      if (c.signal.aborted || complete(url)) return;
      if (r.status === 202) {
        if (txOf(url).st !== "done") set(url, { st: "pending", retrying: data.status === "retrying" });
        retry(url, Number(data.retryAfter) || Number(r.headers.get("retry-after")) || 30);
        return;
      }
      if (!r.ok || typeof data.text !== "string" || !Array.isArray(data.segments)) throw new Error(String(r.status));
      set(url, { st: "done", t: data });
      if (data.translationStatus === "pending") retry(url, Number(data.retryAfter) || 30); else attempts.delete(url);
    })
    .catch(() => { if (!c.signal.aborted && !complete(url)) { if (txOf(url).st !== "done") set(url, { st: "error" }); retry(url, 30); } })
    .finally(() => {
      running--;
      if (ctl.get(url) === c) ctl.delete(url);
      if (c.signal.aborted && active(url) && !complete(url)) enqueue(url);
      pump();
    });
}
function pump() {
  while (running < MAX && queue.length) {
    const url = queue.shift()!;
    if (active(url) && !complete(url)) load(url);
  }
}
function enqueue(url: string) {
  if (complete(url) || ctl.has(url)) return;
  const i = queue.indexOf(url);
  if (i >= 0) queue.splice(i, 1);
  if (urgentSet.has(url)) queue.unshift(url); else queue.push(url);
  if (txOf(url).st !== "done") set(url, { st: "queued" }); pump();
}
/** Visible rows and the open audio card retain polling until they leave the screen. */
export function want(url: string, urgent = false) {
  if (urgent) urgentSet.add(url); else visible.add(url);
  if (complete(url) || ctl.has(url) || timers.has(url)) return;
  enqueue(url);
}
export function unwant(url: string, urgent = false) {
  if (urgent) urgentSet.delete(url); else visible.delete(url);
  if (active(url)) return;
  clearTimeout(timers.get(url)); timers.delete(url); attempts.delete(url);
  const i = queue.indexOf(url); if (i >= 0) queue.splice(i, 1);
  ctl.get(url)?.abort();
  if (txOf(url).st !== "done") set(url, { st: "idle" });
}
