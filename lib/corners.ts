import fs from "node:fs";
import path from "node:path";

/**
 * Corner pins and named sections for the 3D track maps (IA spec §0.9). Two prebuilt files, read synchronously at request
 * time (same pattern as lib/tracks.ts — never the network):
 *   data/corners/<id>.json  built by scripts/build-corners.mjs: corner centres as `t` = distance fraction along the
 *                           telemetry lap in data/tracks (the parameter Track3D and the replay cars already use);
 *   content/corners.json    curated names / Chinese notes / sections, keyed by corner number ("1", "12A").
 * Both carry the F1DB layout id; a map drawn for another layout never gets these pins (§0.9.5).
 */

export type CornerPin = {
  n: string;
  t: number;
  /** an iconic corner (130R, Eau Rouge, Parabolica…): its label wins over lower-numbered ones when space is short */
  star?: boolean;
  name?: string;
  zh?: string;
  note?: string;
  speed?: number;
  gear?: number;
  /** timing sector (1–3); only when the real S1/S2/S3 boundaries were built */
  sector?: 1 | 2 | 3;
};

export type CornerSection = {
  id: string;
  kind: "corners" | "straight";
  /** distance fractions; `to < from` when the section crosses the timing line */
  from: number;
  to: number;
  /** corner numbers it spans (for 「T2–T4」) */
  fromN: string;
  toN: string;
  name?: string;
  zh?: string;
  note?: string;
  /** length in metres, rounded to 10 m */
  len: number;
};

export type CornerLayer = {
  circuit: string;
  layout: string | null;
  /** year of the telemetry lap the 3D model is built from */
  year: number;
  /** year MultiViewer sampled the corner positions (null = manual / none) */
  mvYear: number | null;
  source: "multiviewer" | "manual" | null;
  /** corner positions estimated by hand from curvature (no MultiViewer data) */
  approx: boolean;
  corners: CornerPin[];
  sections: CornerSection[];
  /** distance fractions where S1 and S2 end; null until OpenF1 answered `npm run corners` */
  sectors: [number, number] | null;
};

const PAD = 0.006;
const wrap = (t: number) => ((t % 1) + 1) % 1;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function sectorOf(t: number, sectors: [number, number] | null): 1 | 2 | 3 | undefined {
  if (!sectors) return undefined;
  return t < sectors[0] ? 1 : t < sectors[1] ? 2 : 3;
}

let content: Record<string, any> | null = null;
function curated(id: string) {
  if (!content) {
    try { content = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/corners.json"), "utf8")).circuits ?? {}; }
    catch { content = {}; }
  }
  return content![id] ?? null;
}

/** Lap length in metres from the telemetry outline (OpenF1 x/y are decimetres). */
function lapMetres(id: string): number | null {
  try {
    const pts: [number, number, number][] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/tracks", id + ".json"), "utf8")).points;
    let L = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    return L / 10;
  } catch { return null; }
}

/**
 * The corner layer for a circuit, or null when there is no built file — or when `layoutId` is given and is not the
 * layout the pins were built for (a historic outline never gets today's numbering).
 */
export function cornerLayer(circuitId: string, layoutId?: string | null): CornerLayer | null {
  let data: any;
  try { data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/corners", circuitId + ".json"), "utf8")); }
  catch { return null; }
  if (layoutId && data.layout && layoutId !== data.layout) return null;
  const cur = curated(circuitId);
  // curated names belong to one layout too: a mismatch drops the names, never misplaces them
  const same = !!cur && (!cur.layout || cur.layout === data.layout);
  const names: Record<string, any> = same ? cur.corners ?? {} : {};
  const sectors: [number, number] | null = Array.isArray(data.sectors) && data.sectors.length === 2 ? [data.sectors[0], data.sectors[1]] : null;

  const corners: CornerPin[] = (data.corners ?? []).map((k: any) => {
    const c = names[k.n] ?? {};
    const pin: CornerPin = { n: String(k.n), t: k.t };
    if (c.name) pin.name = c.name;
    if (c.star) pin.star = true;
    if (c.zh) pin.zh = c.zh;
    if (c.note) pin.note = c.note;
    if (k.speed != null) pin.speed = k.speed;
    if (k.gear != null) pin.gear = k.gear;
    const s = sectorOf(k.t, sectors);
    if (s) pin.sector = s;
    return pin;
  });

  const at = new Map(corners.map((k) => [k.n, k.t]));
  const L = lapMetres(circuitId);
  const sections: CornerSection[] = [];
  for (const s of (same ? cur.sections : null) ?? []) {
    const a = at.get(String(s.from)), b = at.get(String(s.to));
    if (a == null || b == null) continue;
    const from = s.kind === "straight" ? wrap(a + PAD) : wrap(a - PAD);
    const to = s.kind === "straight" ? wrap(b - PAD) : wrap(b + PAD);
    const span = wrap(to - from);
    sections.push({
      id: s.id, kind: s.kind === "straight" ? "straight" : "corners", from: r4(from), to: r4(to), fromN: String(s.from), toN: String(s.to),
      ...(s.name ? { name: s.name } : {}), ...(s.zh ? { zh: s.zh } : {}), ...(s.note ? { note: s.note } : {}),
      len: L ? Math.round((span * L) / 10) * 10 : 0,
    });
  }

  return {
    circuit: circuitId,
    layout: data.layout ?? null,
    year: data.lapYear,
    mvYear: data.mvYear ?? null,
    source: data.source ?? null,
    approx: data.source === "manual" || corners.some((k: any, i: number) => data.corners[i]?.approx),
    corners,
    sections,
    sectors,
  };
}

/** The sentence appended to the hero's 3D note (§0.9.3 ⑧). */
export function cornerNote(c: CornerLayer | null): string | null {
  if (!c) return null;
  if (!c.corners.length) return "弯角数据待补";
  const where = c.source === "manual" ? "弯角位置按遥测曲率估算" : `弯角位置来自 MultiViewer（${c.mvYear ?? c.year} 年采样）`;
  return c.sectors ? `${where}；分段为该圈 S1/S2/S3 边界` : where;
}
