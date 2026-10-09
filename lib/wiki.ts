import fs from "node:fs";
import path from "node:path";
import { cachedJSON } from "./cache";

type WikiMap = { drivers: Record<string, string>; constructors: Record<string, string>; circuits: Record<string, string>; races: Record<string, string> };
let map: WikiMap | null = null;
export function wikiMap(): WikiMap {
  if (!map) map = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/wiki.json"), "utf8"));
  return map!;
}

export type WikiSummary = { title: string; extract: string; thumbnail?: { source: string; width: number; height: number }; originalimage?: { source: string }; content_urls?: { desktop: { page: string } }; lang: string };

const FOREVER = 60 * 60 * 24 * 365;

export async function summary(title: string | null | undefined, lang: "en" | "zh" = "en"): Promise<WikiSummary | null> {
  if (!title) return null;
  try {
    const t = encodeURIComponent(title.replace(/ /g, "_"));
    const r = await cachedJSON<any>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${t}`, FOREVER, lang === "zh" ? { headers: { "accept-language": "zh-cn" } } : undefined);
    if (!r || r.type === "disambiguation" || !r.extract) return null;
    return { ...r, lang };
  } catch {
    return null;
  }
}

/** Chinese Wikipedia title for an English title, via langlinks. */
export async function zhTitle(enTitle: string | null | undefined): Promise<string | null> {
  if (!enTitle) return null;
  try {
    const r = await cachedJSON<any>(
      `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=zh&redirects=1&format=json&titles=${encodeURIComponent(enTitle)}`,
      FOREVER
    );
    const pages = r?.query?.pages || {};
    const p: any = Object.values(pages)[0];
    return p?.langlinks?.[0]?.["*"] ?? null;
  } catch {
    return null;
  }
}

/** Prefer Chinese summary, fall back to English. */
export async function bilingual(enTitle: string | null | undefined) {
  const [en, zt] = await Promise.all([summary(enTitle, "en"), zhTitle(enTitle)]);
  const zh = zt ? await summary(zt, "zh") : null;
  return { en, zh };
}

/**
 * Never let Wikipedia hold up a page (user: 年份导航点击起来还是很慢): a known answer returns at once; an unknown one
 * waits at most `ms` (enough for a disk-cache hit), then the page renders without it while the lookup finishes in the
 * background for the next visit. A failure (e.g. Wikimedia 429) is retried on a later visit, never awaited.
 */
type Bi = Awaited<ReturnType<typeof bilingual>>;
const EMPTY: Bi = { en: null, zh: null };
const biMemo = new Map<string, Bi | Promise<Bi>>();
export async function bilingualFast(enTitle: string | null | undefined, ms = 150): Promise<Bi> {
  if (!enTitle) return EMPTY;
  let v = biMemo.get(enTitle);
  if (v && !(v instanceof Promise)) return v;
  if (!v) {
    v = bilingual(enTitle).then((r) => { biMemo.set(enTitle, r); return r; }, () => { biMemo.delete(enTitle); return EMPTY; });
    biMemo.set(enTitle, v);
  }
  return Promise.race([v, new Promise<Bi>((r) => setTimeout(() => r(EMPTY), ms))]);
}

export async function driverImage(id: string): Promise<string | null> {
  const s = await summary(wikiMap().drivers[id]);
  if (!s) return null;
  const o = (s as any).originalimage;
  // Wikimedia refuses thumbnails larger than the original, so only upscale the thumb URL when the source is big enough.
  if (o?.width && o.width >= 500 && s.thumbnail) return wikiThumb(s.thumbnail.source, 500);
  return o?.source ?? s.thumbnail?.source ?? null;
}

/** Best-effort Wikipedia title lookup by free text (used for chassis articles). */
export async function searchTitle(q: string): Promise<string | null> {
  try {
    const r = await cachedJSON<any>(`https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(q)}`, FOREVER);
    return r?.query?.search?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

/** Wikimedia only serves a fixed set of thumbnail widths (other sizes return HTTP 400); snap to one of them. */
const THUMB_WIDTHS = [250, 330, 500, 960, 1280];
export function wikiThumb(src: string, want: number) {
  const w = THUMB_WIDTHS.find((x) => x >= want) ?? THUMB_WIDTHS.at(-1)!;
  return src.replace(/\/\d+px-/, `/${w}px-`);
}
