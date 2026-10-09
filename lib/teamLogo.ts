import fs from "node:fs";
import path from "node:path";
import { teamLogo } from "./assets";
import { wikiMap } from "./wiki";

/**
 * Logo for any constructor: 2026 grid → official F1 logo; otherwise the team's Wikidata logo (P154) from Commons;
 * otherwise null (caller draws a monogram in team colour). Cached in data/team-logos.json.
 */
const FILE = path.join(process.cwd(), "data/team-logos.json");
let store: Record<string, string | null> | null = null;
let mtime = 0;
const load = () => {
  try { const m = fs.statSync(FILE).mtimeMs; if (!store || m !== mtime) { store = JSON.parse(fs.readFileSync(FILE, "utf8")); mtime = m; } } catch { store ??= {}; }
  return store!;
};
const UA = { "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" };
let last = 0;
async function get(url: string) {
  const wait = Math.max(0, last + 700 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
  if (r.status === 429) throw new Error("throttled");
  return r.ok ? r.json() : null;
}
const inflight = new Map<string, Promise<string | null>>();

export async function teamLogoAny(id: string, white = false): Promise<string | null> {
  const official = teamLogo(id, 160, white ? "white" : "color");
  if (official) return official;
  const s = load();
  if (id in s) return s[id];
  if (inflight.has(id)) return inflight.get(id)!;
  const p = (async () => {
    try {
      const title = wikiMap().constructors?.[id];
      if (!title) return null;
      const pp: any = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&redirects=1&titles=${encodeURIComponent(title)}`);
      const qid = (Object.values(pp?.query?.pages ?? {})[0] as any)?.pageprops?.wikibase_item;
      let file: string | null = null;
      if (qid) {
        const c: any = await get(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P154`);
        file = c?.claims?.P154?.[0]?.mainsnak?.datavalue?.value ?? null;
      }
      const url = file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=160` : null;
      load()[id] = url;
      fs.writeFileSync(FILE, JSON.stringify(load()));
      return url;
    } catch { return null; } // throttled / offline: not cached, retried next time
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}
