import { createHash } from "node:crypto";
import { radioUrl, type Transcript } from "./radioTranscript";

export type CloudFailure = { attempts: number; at: string; retryAt?: string; error: string };
type Pack = { version: number; transcripts: Record<string, Transcript>; failures?: Record<string, CloudFailure> };
const TTL = 300_000;
const packs = new Map<string, { at: number; value: Pack }>();
const inflight = new Map<string, Promise<Pack>>();
const BASE = "https://raw.githubusercontent.com/championwang00/pitwall-f1/codex/radio-transcripts/sessions/";
export function cloudPackKey(url: string): string {
  return createHash("sha256").update(url.slice(0, url.indexOf("/TeamRadio/"))).digest("hex");
}
function valid(t: Transcript | undefined): t is Transcript {
  return !!t && typeof t.text === "string" && Array.isArray(t.segments) && t.segments.every(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start && typeof s.text === "string");
}
async function pack(key: string, fetcher: typeof fetch): Promise<Pack> {
  const old = packs.get(key);
  if (old && Date.now() - old.at < TTL) return old.value;
  const current = inflight.get(key);
  if (current) return current;
  const promise = (async () => {
    try {
      // Bypass an older GitHub CDN copy when our five-minute cache refreshes.
      const r = await fetcher(`${BASE}${key}.json?v=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!r.ok && r.status !== 404) throw new Error(`cloud radio ${r.status}`);
      const value = r.status === 404 ? { version: 1, transcripts: {} } : await r.json() as Pack;
      if (value.version !== 1 || !value.transcripts || typeof value.transcripts !== "object") throw new Error("invalid cloud radio pack");
      packs.set(key, { at: Date.now(), value });
      return value;
    } catch {
      // A temporary origin failure must never erase subtitles already read by this instance.
      return old?.value ?? { version: 1, transcripts: {} };
    } finally { inflight.delete(key); }
  })();
  inflight.set(key, promise);
  return promise;
}
export async function cloudTranscripts(urls: string[], fetcher: typeof fetch = fetch): Promise<Record<string, Transcript | null>> {
  const keys = new Map<string, Pack>();
  const allowed = [...new Set(urls)].filter(u => radioUrl(u));
  await Promise.all([...new Set(allowed.map(cloudPackKey))].map(async key => keys.set(key, await pack(key, fetcher))));
  return Object.fromEntries(allowed.map(url => { const t = keys.get(cloudPackKey(url))?.transcripts[url]; return [url, valid(t) ? t : null]; }));
}
export async function cloudFailure(url: string): Promise<CloudFailure | null> {
  return (await pack(cloudPackKey(url), fetch)).failures?.[url] ?? null;
}
