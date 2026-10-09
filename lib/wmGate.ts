import fs from "node:fs";
import path from "node:path";

/**
 * One gate for every Wikimedia API call (Wikipedia, Wikidata, Commons) in every process (dev server bundles, build
 * scripts): requests are serialized ≥ 1.1 s apart, and a 429 pauses ALL of them — recorded in .cache/wikimedia-pause
 * so other processes stop too — for Retry-After (at least 60 s, doubling on repeats). While paused a call fails fast
 * with WmPaused; callers treat that as "could not ask" (never cached as "no photo").
 */
export class WmPaused extends Error { name = "WmPaused"; }
const FILE = path.join(process.cwd(), ".cache/wikimedia-pause");
const G = ((globalThis as any).__pitwallWm ??= { next: 0, chain: Promise.resolve() as Promise<unknown>, read: 0, until: 0, strikes: 0 }) as
  { next: number; chain: Promise<unknown>; read: number; until: number; strikes: number };
const GAP = 1100;

export const isWikimedia = (url: string) => /^https:\/\/([a-z-]+\.)?(wikipedia\.org|wikidata\.org|commons\.wikimedia\.org)\//.test(url) && !/Special:FilePath/.test(url);

export function pausedUntil(): number {
  if (Date.now() - G.read > 2000) {
    G.read = Date.now();
    try { G.until = Math.max(G.until, +fs.readFileSync(FILE, "utf8") || 0); } catch {}
  }
  return G.until;
}
export function pause(retryAfterS?: number) {
  G.strikes = Math.min(G.strikes + 1, 5);
  const ms = Math.max((retryAfterS ?? 0) * 1000, 60_000 * 2 ** (G.strikes - 1));
  G.until = Math.max(G.until, Date.now() + ms);
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, String(G.until)); } catch {}
}
export const ok = () => { G.strikes = Math.max(0, G.strikes - 1); };

/** Wait for this call's slot in the serialized queue (fails fast while paused). */
export function slot(): Promise<void> {
  const run = async () => {
    if (pausedUntil() > Date.now()) throw new WmPaused();
    const wait = G.next - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (pausedUntil() > Date.now()) throw new WmPaused();
    G.next = Date.now() + GAP;
  };
  const p = G.chain.then(run, run);
  G.chain = p.catch(() => {});
  return p;
}
