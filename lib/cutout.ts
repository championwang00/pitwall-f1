import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
 * Person cutouts (user: 单人照能抠图，就把这个图抠掉，把这个人留下来). A single-person photo is run through
 * tools/cutout (Apple Vision "lift subject", on-device) once and cached as a transparent PNG. Never blocks a render:
 * `cutoutKnown` answers from the cache and queues unknown photos in the background; until a cutout exists the
 * original photo is used. Group / podium shots and far shots are refused by the tool and keep the original.
 */
const DIR = path.join(process.cwd(), ".cache", "cutouts");
const MANIFEST = path.join(DIR, "manifest.json");
const TOOL = path.join(process.cwd(), "tools", "cutout");
const HOSTS = new Set(["media.formula1.com", "upload.wikimedia.org", "thumb.wikimedia.org", "commons.wikimedia.org", "res.cloudinary.com"]);

type State = "ok" | "no";
let store: Record<string, State> | null = null;
const load = () => {
  if (store) return store;
  try { store = JSON.parse(readFileSync(MANIFEST, "utf8")); } catch { store = {}; }
  return store!;
};
const save = () => { try { mkdirSync(DIR, { recursive: true }); writeFileSync(MANIFEST, JSON.stringify(store)); } catch {} };

export const cutoutKey = (src: string) => createHash("sha1").update(src).digest("hex").slice(0, 16);
export const cutoutFile = (key: string) => path.join(DIR, `${key}.png`);
/** a remote photo on a known image host, or a local asset under public/assets (curated historical portraits) */
const LOCAL = /^\/assets\/[\w./-]+\.(webp|png|jpe?g)$/i;
export const cutoutAllowed = (src: string) => { if (LOCAL.test(src) && !src.includes("..")) return true; try { return HOSTS.has(new URL(src).hostname); } catch { return false; } };

const queue: string[] = [];
const inFlight = new Map<string, Promise<State>>();
let running = 0;
const MAX = 2;

function run(input: string, out: string) {
  return new Promise<boolean>((res) => execFile(TOOL, [input, out], { timeout: 20000 }, (err) => res(!err)));
}

async function work(src: string): Promise<State> {
  const key = cutoutKey(src);
  const tmp = path.join(DIR, `${key}.src`);
  try {
    mkdirSync(DIR, { recursive: true });
    if (LOCAL.test(src)) writeFileSync(tmp, readFileSync(path.join(process.cwd(), "public", src)));
    else {
      const r = await fetch(src, { headers: { "user-agent": "PITWALL-local-demo/1.0 (personal, non-commercial)" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return "no";
      writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
    }
    return (await run(tmp, cutoutFile(key))) && existsSync(cutoutFile(key)) ? "ok" : "no";
  } catch {
    return "no";
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

function pump() {
  while (running < MAX && queue.length) {
    const src = queue.shift()!;
    running++;
    const p = work(src).then((st) => { load()[src] = st; save(); return st; }).finally(() => { running--; inFlight.delete(src); pump(); });
    inFlight.set(src, p);
  }
}

/** Cutout for `src`, waiting for it (route use). null = no cutout (refused / failed / not allowed). */
export function cutout(src: string): Promise<string | null> {
  if (!cutoutAllowed(src) || !existsSync(TOOL)) return Promise.resolve(null);
  const st = load()[src];
  if (st) return Promise.resolve(st === "ok" && existsSync(cutoutFile(cutoutKey(src))) ? cutoutFile(cutoutKey(src)) : null);
  if (!inFlight.has(src) && !queue.includes(src)) queue.push(src);
  pump();
  if (!inFlight.has(src)) {
    // still queued behind others: wait for it to start
    return new Promise((res) => { const t = setInterval(() => { const p = inFlight.get(src); const st = load()[src];
      if (p || st) { clearInterval(t); res((p ?? Promise.resolve(st as State)).then((x) => (x === "ok" ? cutoutFile(cutoutKey(src)) : null))); } }, 100); });
  }
  return (inFlight.get(src) ?? Promise.resolve<State>("no")).then((s) => (s === "ok" ? cutoutFile(cutoutKey(src)) : null));
}

/** Sync, cache-only: the cutout's URL if one exists; undefined while unknown (queued in the background); null if refused. */
export function cutoutKnown(src: string): string | null | undefined {
  if (!cutoutAllowed(src)) return null;
  const st = load()[src];
  if (st === "ok") return `/api/cutout?u=${encodeURIComponent(src)}`;
  if (st === "no") return null;
  if (!inFlight.has(src) && !queue.includes(src) && existsSync(TOOL)) { queue.push(src); pump(); }
  return undefined;
}
