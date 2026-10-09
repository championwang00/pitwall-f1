import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const DIR = process.env.VERCEL ? path.join(os.tmpdir(), "pitwall/http") : path.join(process.cwd(), ".cache/http");
const mem = new Map<string, { t: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const lastHit = new Map<string, number>();

// Polite per-host spacing (Jolpica allows ~4 req/s burst, 500/h)
const GAP: Record<string, number> = { "api.jolpi.ca": 300, "api.openf1.org": 120 };

async function spaced(host: string) {
  const gap = GAP[host] ?? 0;
  if (!gap) return;
  const now = Date.now();
  const next = Math.max(now, (lastHit.get(host) ?? 0) + gap);
  lastHit.set(host, next);
  if (next > now) await new Promise((r) => setTimeout(r, next - now));
}

/** Fetch JSON with an in-memory + on-disk cache. ttl in seconds; Infinity = keep forever. */
export async function cachedJSON<T = any>(url: string, ttl: number, init?: RequestInit): Promise<T> {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const m = mem.get(key);
  if (m && Date.now() - m.t < ttl * 1000) return m.data as T;
  const file = path.join(DIR, key + ".json");
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    if (Date.now() - raw.t < ttl * 1000) {
      mem.set(key, raw);
      return raw.data as T;
    }
  } catch {}
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = (async () => {
    const host = new URL(url).host;
    let lastErr: unknown;
    for (let i = 0; i < 3; i++) {
      await spaced(host);
      try {
        const r = await fetch(url, { ...init, headers: { "user-agent": "pitwall-f1-demo/0.1", ...(init?.headers || {}) }, cache: "no-store" });
        if (r.status === 404) return null;
        if (r.status === 401 || r.status === 403) { const e: any = new Error(`${r.status} ${url}`); e.status = r.status; e.fatal = true; throw e; }
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        const data = await r.json();
        const entry = { t: Date.now(), data };
        mem.set(key, entry);
        // short-lived (live) responses stay in memory only
        if (ttl >= 60) {
          await fs.mkdir(DIR, { recursive: true });
          await fs.writeFile(file, JSON.stringify(entry));
        }
        return data;
      } catch (e: any) {
        lastErr = e;
        if (e?.fatal) break;
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
    // stale fallback
    try {
      const raw = JSON.parse(await fs.readFile(file, "utf8"));
      return raw.data;
    } catch {}
    throw lastErr;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p as Promise<T>;
}
