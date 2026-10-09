/**
 * Wikimedia Commons access shared by every picture resolver (driver faces, chassis photos).
 * Commons rate-limits hard: one request at a time, ≥1.1 s apart, back off on 429; a 429 run aborts the lookup
 * with `Throttled` (the caller must not cache that as "no photo").
 */
export class Throttled extends Error {}
import { slot, pause, pausedUntil, ok as wmOk } from "./wmGate";
const UA = { "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" };
// shared by every module instance in the process (Next dev bundles routes and pages separately)
const G = ((globalThis as any).__pitwallCommons ??= { chain: Promise.resolve() as Promise<unknown>, lastCall: 0, blockedUntil: 0, queued: 0 }) as
  { chain: Promise<unknown>; lastCall: number; blockedUntil: number; queued: number };
G.blockedUntil ??= 0; G.queued ??= 0;
/** Only requests made through `commonsFetch` may reach the Commons API: superseded module instances (dev hot reloads)
 *  can still hold queued lookups from older code — those are answered "429" locally instead of hammering the API. */
const PW = Symbol.for("pitwall.commons");
if (!(globalThis as any).__pitwallFetchGuard) {
  const orig = globalThis.fetch;
  (globalThis as any).__pitwallFetchGuard = true;
  globalThis.fetch = ((input: any, init?: any) => {
    const u = typeof input === "string" ? input : input?.url ?? String(input);
    if (/^https:\/\/commons\.wikimedia\.org\/w\/api\.php/.test(u) && !init?.[PW]) return Promise.resolve(new Response(null, { status: 429, headers: { "retry-after": "1" } }));
    return orig(input, init);
  }) as typeof fetch;
}
/** Pages must never build a long Commons backlog (each request is ≥1.2 s apart): beyond this many waiting requests a
 *  lookup is refused as Throttled (not cached, retried on a later view). The manifest build script raises it. */
const MAX_QUEUE = +(process.env.COMMONS_QUEUE_MAX ?? 12);
const GAP = 1200;

export function commonsFetch(url: string): Promise<any> {
  if (G.queued >= MAX_QUEUE || pausedUntil() > Date.now()) return Promise.reject(new Throttled());
  const run = async () => {
    try {
      if (pausedUntil() > Date.now()) throw new Throttled();
      await slot().catch(() => { throw new Throttled(); });
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12000), [PW]: true } as RequestInit);
      if (r.status === 429) { pause(+(r.headers.get("retry-after") ?? 0)); throw new Throttled(); } // everyone stops (lib/wmGate)
      if (r.status >= 500) throw new Throttled(); // server trouble = "could not ask", never "no photo"
      if (!r.ok) return null;
      const j = await r.json();
      if (j?.error) throw new Throttled(); // API-level error (e.g. maxlag / ratelimited)
      wmOk();
      return j;
    } finally { G.queued--; }
  };
  G.queued++;
  const p = G.chain.then(run, run);
  G.chain = p.catch(() => {});
  return p;
}

export type CommonsFile = { title: string; url: string; width: number; height: number; mime: string; categories: string[]; description: string };

const API = "https://commons.wikimedia.org/w/api.php?action=query&format=json";
const PROPS = "&prop=imageinfo|categories&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=ImageDescription&iiurlwidth=960&clshow=!hidden&cllimit=max";
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

function files(j: any): CommonsFile[] {
  return (Object.values(j?.query?.pages ?? {}) as any[])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((f) => {
      const ii = f.imageinfo?.[0];
      if (!ii) return null;
      return {
        title: f.title as string, url: (ii.thumburl ?? ii.url) as string, width: ii.width, height: ii.height, mime: ii.mime ?? "",
        categories: (f.categories ?? []).map((c: any) => String(c.title).replace(/^Category:/, "")),
        description: strip(ii.extmetadata?.ImageDescription?.value ?? ""),
      };
    })
    .filter((f): f is CommonsFile => !!f && /jpeg|png|webp/.test(f.mime));
}

/** Files of one category (`Category:X in 1988`), with their categories and description. */
export async function categoryFiles(cat: string, limit = 40) {
  return files(await commonsFetch(`${API}&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=${limit}${PROPS}`));
}

/** Full-text search in the File namespace. */
export async function searchFiles(q: string, limit = 20) {
  return files(await commonsFetch(`${API}&generator=search&gsrnamespace=6&gsrlimit=${limit}&gsrsearch=${encodeURIComponent(q)}${PROPS}`));
}

/** Metadata of known files (up to 50 per call) — used to re-check cached picks. */
export async function fileInfo(titles: string[]) {
  return files(await commonsFetch(`${API}&titles=${encodeURIComponent(titles.join("|"))}${PROPS}`));
}

/** "File:Foo_bar.jpg" from any upload / thumb URL. */
export function fileTitleOf(url: string) {
  const m = /\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/.exec(url);
  return m ? "File:" + decodeURIComponent(m[1]).replace(/_/g, " ") : null;
}

/** A 4-digit F1-era year written in a file name ("1988", "19690801", "Monza_2004"). */
export function fileYear(name: string): number | null {
  const m = /(?:^|[^0-9])(19[5-9]\d|20[0-3]\d)(?:[01]\d[0-3]\d)?(?![0-9])/.exec(decodeURIComponent(name));
  return m ? +m[1] : null;
}
