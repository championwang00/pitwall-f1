import sharp from "sharp";
import { baseAsset } from "@/lib/baseAssets";
import { teamLogoAny, teamLogoAtKnown } from "@/lib/teamLogo";
import { teamLogo, TEAMS_2026 } from "@/lib/assets";

// GET /api/logo/<constructor-id>[?year=Y][&w=480][&v=white|auto][&bg=<hex>]
//   → the team's logo (as it was in Y), high-resolution and in COLOUR (lib/teamLogo teamLogoAt: Wikidata / Wikipedia
//     SVGs by year; F1's 96 px per-season logos only when w ≤ 80).
//   v=auto / v=white: colour when it is readable on `bg` (the surface it is drawn on; default dark), else mono.
//   Readable = WCAG 1.4.11 graphics contrast: at least half of the logo's ink (opaque pixels, measured on the real
//   file) reaches 3:1 against bg (user: 对比度足够优先彩色，不够用单色). Mono = white on dark surfaces, ink on light.
//   404 when no logo is known (callers show the name only). Headers: x-img-status exact | current, x-logo colour | mono.
const UA = { "user-agent": "PITWALL-local-demo/1.0 (personal, non-commercial)" };

const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lumOf = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hexLum = (hex: string) => { const n = parseInt(hex.replace(/^#/, "").slice(0, 6), 16); return lumOf((n >> 16) & 255, (n >> 8) & 255, n & 255); };

/** a logo printed on its own box or white plate (the "white frame"): never shown as-is (user: 白框太丑) */
const boxCache = new Map<string, Promise<boolean>>();
function boxed(url: string) {
  if (!boxCache.has(url)) boxCache.set(url, (async () => {
    const buf = await fetchBytes(url);
    if (!buf) return false;
    const { data, info } = await sharp(buf).resize(64, 64, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // no transparency at all, or the emblem sits on a white plate (F1's 2019–24 Red Bull logo: a white rounded square)
    let clear = 0, solid = 0, white = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      if (data[i * 4 + 3] < 128) { clear++; continue; }
      solid++;
      if (data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235) white++;
    }
    return clear < info.width * info.height * 0.02 || (solid > 0 && white / solid > 0.35 && solid > info.width * info.height * 0.5);
  })().catch(() => false));
  return boxCache.get(url)!;
}

/** luminance histogram (64 bins) of a logo's opaque pixels, cached per source */
const inkCache = new Map<string, Promise<number[] | null>>();
const bytesCache = new Map<string, Promise<Buffer | null>>();
const fetchBytes = (url: string) => {
  if (!bytesCache.has(url)) bytesCache.set(url, fetch(url, { headers: UA, signal: AbortSignal.timeout(12000) })
    .then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null)).catch(() => null));
  return bytesCache.get(url)!;
};
function ink(url: string) {
  if (!inkCache.has(url)) inkCache.set(url, (async () => {
    const buf = await fetchBytes(url);
    if (!buf) return null;
    const { data, info } = await sharp(buf, { density: 96 }).resize(96, 96, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const bins = new Array(64).fill(0);
    let opaque = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const a = data[i * 4 + 3];
      if (a < 128) continue;
      opaque++;
      bins[Math.min(63, Math.floor(lumOf(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) * 64))]++;
    }
    // a fully opaque raster is a logo on its own box, not ink on our surface: no verdict (keep colour)
    return opaque > 0 && opaque < info.width * info.height * 0.98 ? bins : null;
  })().catch(() => null));
  return inkCache.get(url)!;
}
/** share of the ink reaching 3:1 against the surface */
const readable = (bins: number[], bg: number) => {
  const total = bins.reduce((a, b) => a + b, 0);
  const ok = bins.reduce((a, n, i) => a + (ratio((i + 0.5) / 64, bg) >= 3 ? n : 0), 0);
  return total ? ok / total : 1;
};

/** a badge carries its own contrast (Kick Sauber: green K on a black disc) — dark AND light ink, each ≥ 15 %: flattening
 *  it to one colour would erase the mark, so it stays in colour on any surface */
const badge = (bins: number[]) => {
  const total = bins.reduce((a, b) => a + b, 0) || 1;
  const dark = bins.slice(0, 4).reduce((a, b) => a + b, 0) / total, light = bins.slice(26).reduce((a, b) => a + b, 0) / total;
  return dark >= 0.15 && light >= 0.15;
};

/** a plated logo with its white plate lifted off (near-white → transparent, softly): an in-memory source keyed `unplate:<url>` */
function unplate(url: string) {
  const k = `unplate:${url}`;
  if (!bytesCache.has(k)) bytesCache.set(k, (async () => {
    const buf = await fetchBytes(url);
    if (!buf) return null;
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < info.width * info.height; i++) {
      const m = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (m > 200) data[i * 4 + 3] = Math.round(data[i * 4 + 3] * Math.max(0, (240 - m) / 40));
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
  })().catch(() => null));
  return k;
}

/** the same logo in one flat colour (alpha kept), PNG at width w */
const monoCache = new Map<string, Promise<Buffer | null>>();
function mono(url: string, w: number, white: boolean) {
  const k = `${url}|${w}|${white}`;
  if (!monoCache.has(k)) monoCache.set(k, (async () => {
    const buf = await fetchBytes(url);
    if (!buf) return null;
    const alpha = await sharp(buf, { density: 300 }).resize({ width: w, withoutEnlargement: false }).ensureAlpha().extractChannel(3).toBuffer();
    const meta = await sharp(alpha).metadata();
    const c = white ? 255 : 28;
    return sharp({ create: { width: meta.width!, height: meta.height!, channels: 3, background: { r: c, g: c, b: white ? 255 : 37 } } })
      .joinChannel(alpha).png().toBuffer();
  })().catch(() => null));
  return monoCache.get(k)!;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const v = q.get("v");
  const w = Math.min(1600, Math.max(64, +(q.get("w") ?? 480) || 480));
  const year = q.get("year") ? +q.get("year")! : null;
  const bgHex = (q.get("bg") ?? "").replace(/^#/, "");
  const reviewed = baseAsset("team", id, year);
  if (reviewed) return new Response(null, { status: 302, headers: {
    location: reviewed.darkUrl && (!/^[0-9a-f]{6}$/i.test(bgHex) || hexLum(bgHex) < 0.35) ? reviewed.darkUrl : reviewed.url, "cache-control": "public, max-age=86400",
    "x-img-status": reviewed.exact ? "exact" : "current", "x-logo": "colour",
  } });
  const pic = teamLogoAtKnown(id, year, false, w);
  const headers = { "cache-control": "public, max-age=3600", "x-img-status": pic.exact ? "exact" : "current" };
  let src = pic.url;
  if (!src) {
    const url = await teamLogoAny(id, false, w).catch(() => null);
    src = url ? url.replace(/([?&]width=)\d+/, `$1${Math.max(w, 640)}`) : null;
  }
  if (src && (await boxed(src))) {
    // boxed file: F1's own per-season logo, then the high-res catalog one, then F1's current one — the first unboxed;
    // none (AlphaTauri, Kick Sauber 2019–24 are all on white plates) → the same file with its plate lifted off
    const alts = [teamLogoAtKnown(id, year, false, 80).url, teamLogoAtKnown(id, year, false, 480).url, id in TEAMS_2026 ? teamLogo(id, 160, "color") : null]
      .filter((u, i, a): u is string => !!u && u !== src && a.indexOf(u) === i);
    let pick: string | null = null;
    for (const u of alts) if (!(await boxed(u))) { pick = u; break; }
    src = pick ?? unplate(src);
    // the substitute is F1's CURRENT logo: not that season's (picture rule) — say so
    if (pick && year && year !== 2026 && /\/common\/f1\/2026\//.test(pick)) headers["x-img-status"] = "current";
  }
  if (!src) return new Response("no logo", { status: 404, headers: { "cache-control": "public, max-age=3600" } });

  if (v === "auto" || v === "white") {
    const bg = /^[0-9a-f]{6}$/i.test(bgHex) ? hexLum(bgHex) : hexLum("15151e");
    const bins = await ink(src);
    if (bins && readable(bins, bg) < 0.5 && !badge(bins)) {
      // white or dark ink, whichever stands out more on this surface
      const white = ratio(1, bg) >= ratio(hexLum("1c1c25"), bg);
      const png = await mono(src, w, white);
      if (png) return new Response(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png", "x-logo": "mono", "x-logo-src": src.slice(0, 300) } });
    }
  }
  if (src.startsWith("unplate:")) {
    const png = await fetchBytes(src);
    if (!png) return new Response("no logo", { status: 404 });
    return new Response(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png", "x-logo": "colour" } });
  }
  return new Response(null, { status: 302, headers: { ...headers, location: src, "x-logo": "colour" } });
}
