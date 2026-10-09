"use client";
// Client side of the team-radio transcripts: a tiny shared store + a fetch queue that never runs more than 2 requests
// (the server itself runs one Whisper job at a time). Visible rows ask for theirs; the clip being played jumps the queue.
import { useSyncExternalStore } from "react";

export type Segment = { start: number; end: number; text: string };
export type Transcript = { text: string; segments: Segment[] };
export type TxState = { st: "idle" | "queued" | "loading" | "done" | "error"; t?: Transcript };

const MAX = 2;
const store = new Map<string, TxState>();
const subs = new Set<() => void>();
let version = 0;
const queue: string[] = [];
let running = 0;
const urgentSet = new Set<string>();

function emit() { version++; for (const f of subs) f(); }
function set(url: string, v: TxState) { store.set(url, v); emit(); }

export function txOf(url: string): TxState { return store.get(url) ?? { st: "idle" }; }

/** Re-render whenever any transcript changes. */
export function useTxVersion() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => 0);
}

/** One cache-only lookup for a whole session, so already-transcribed clips show text immediately. */
const peeked = new Set<string>();
export async function peekAll(urls: string[]) {
  const todo = urls.filter((u) => !peeked.has(u) && !store.has(u));
  if (!todo.length) return;
  todo.forEach((u) => peeked.add(u));
  for (let i = 0; i < todo.length; i += 200) {
    try {
      const r = await fetch("/api/radio/transcript", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls: todo.slice(i, i + 200) }) });
      if (!r.ok) continue;
      const data = (await r.json()) as Record<string, Transcript | null>;
      let changed = false;
      for (const [u, t] of Object.entries(data)) if (t && txOf(u).st !== "done") { store.set(u, { st: "done", t }); changed = true; }
      if (changed) emit();
    } catch { /* offline: rows just ask one by one */ }
  }
}

const ctl = new Map<string, AbortController>();

function load(url: string, urgent: boolean) {
  const c = new AbortController();
  ctl.get(url)?.abort();
  ctl.set(url, c);
  running++;
  set(url, { st: "loading" });
  fetch(`/api/radio/transcript?url=${encodeURIComponent(url)}${urgent ? "&p=1" : ""}`, { signal: c.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((t: Transcript) => set(url, { st: "done", t: { text: t.text ?? "", segments: t.segments ?? [] } }))
    .catch(() => { if (!c.signal.aborted) set(url, { st: "error" }); })
    .finally(() => { running--; if (ctl.get(url) === c) ctl.delete(url); pump(); });
}

function pump() {
  while (running < MAX && queue.length) {
    const url = queue.shift()!;
    load(url, urgentSet.has(url));
  }
}

/** Ask for a transcript. `urgent` (the clip now playing) goes to the front of the queue. */
export function want(url: string, urgent = false) {
  const cur = txOf(url).st;
  if (cur === "done") return;
  if (cur === "loading") {
    // already being fetched as a background row: re-ask as urgent so the server moves the job up
    if (urgent && !urgentSet.has(url)) { urgentSet.add(url); load(url, true); }
    return;
  }
  if (cur === "queued") {
    if (urgent) { const i = queue.indexOf(url); if (i >= 0) queue.splice(i, 1); urgentSet.add(url); load(url, true); }
    return;
  }
  // idle, or a failed attempt being retried; the playing clip never waits for a slot
  if (urgent) { urgentSet.add(url); load(url, true); return; }
  queue.push(url);
  set(url, { st: "queued" });
  pump();
}

/** A row scrolled out of view before its turn: give the slot to something visible. */
export function unwant(url: string) {
  if (urgentSet.has(url)) return;
  const i = queue.indexOf(url);
  if (i >= 0) { queue.splice(i, 1); set(url, { st: "idle" }); return; }
  // in flight: let go of it (the server drops the job if it has not started; a started one still lands in its cache)
  const c = ctl.get(url);
  if (c && txOf(url).st === "loading") { c.abort(); set(url, { st: "idle" }); }
}
