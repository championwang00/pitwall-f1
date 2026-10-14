import seed from "@/content/news.seed.json";
import type { Note } from "./content";
import type { Livery } from "./carLiveries";
export type NewsLivery = Livery & { chassis: string; year: number; rounds: number[] };
type Pack = { version: number; notes: Note[]; liveries: NewsLivery[]; updatedAt?: string };
let current: Pack = seed as Pack;
let checked = 0;
let pending: Promise<void> | undefined;
export function cloudNotes(): Note[] { return current.notes; }
export function cloudLiveries(): NewsLivery[] { return current.liveries; }
export function validPack(p: unknown): p is Pack {
  const x=p as Pack;
  return !!x && x.version===1 && Array.isArray(x.notes) && Array.isArray(x.liveries) && x.notes.every(n=>typeof n.title==='string' && typeof n.text==='string' && Array.isArray(n.sources) && n.sources.every(s=>/^https:\/\//.test(s.url)) && (!n.photo || (/^https:\/\/raw.githubusercontent.com\/championwang00\/pitwall-f1\/codex\/editorial-news\/images\/[a-f0-9]+\.webp$/.test(n.photo.url) && n.photo.bytes<=180000))) && x.liveries.every(v=>typeof v.chassis==='string' && Number.isInteger(v.year) && Array.isArray(v.rounds) && v.rounds.every(r=>Number.isInteger(r)&&r>0));
}
export async function ensureFreshEditorial(fetcher: typeof fetch = fetch): Promise<void> {
  if (Date.now()-checked<60000) return;
  if(pending)return pending;
  pending=(async()=>{try {
    const r=await fetcher(`https://raw.githubusercontent.com/championwang00/pitwall-f1/codex/editorial-news/news.json?v=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!r.ok)throw Error('news unavailable');const p=await r.json();if(!validPack(p))throw Error('invalid news');if(!current.updatedAt || !p.updatedAt || Date.parse(p.updatedAt)>=Date.parse(current.updatedAt)) current=p;
  }catch { /* Keep the last valid news and compressed photos during a source outage. */ }
  finally {checked=Date.now();pending=undefined;}})();
  return pending;
}
export function recentNews(year: number, now=Date.now()): Note[] {
  return cloudNotes().filter(n=>n.year===year && n.publishedAt && Date.parse(n.publishedAt)<=now && now-Date.parse(n.publishedAt)<=45*86400000).sort((a,b)=>(b.publishedAt??'').localeCompare(a.publishedAt??''));
}

/** Publication recency cannot establish which race a story belongs to. */
export function liveNews(year: number, round: number | null, now=Date.now(), entries: Note[]=cloudNotes()): { race: Note[]; social: Note[] } {
  const recent=entries.filter(n=>n.year===year && n.publishedAt && Date.parse(n.publishedAt)<=now && now-Date.parse(n.publishedAt)<=45*86400000 && (!n.validUntil || Date.parse(n.validUntil)>=now));
  const kind=(n: Note)=>n.newsKind ?? seed.notes.find(s=>s.topic===n.topic)?.newsKind ?? (n.tag==='车手装备' ? 'equipment' : n.tag==='新涂装' ? 'livery' : n.tag==='场外动态' ? 'social' : null);
  const race=round===null ? [] : recent.filter(n=>(kind(n)==='equipment' || kind(n)==='livery') && ((n.race?.year===year && n.race.round===round) || n.related?.races?.includes(`${year}/${round}`)));
  const social=recent.filter(n=>kind(n)==='social');
  return {race,social};
}
