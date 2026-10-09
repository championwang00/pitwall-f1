import fs from "node:fs";
import path from "node:path";

export type TrackShape = { circuit: string; year: number; points: [number, number, number][] };

/** Downsampled, centred track outline from real telemetry (see scripts/build-tracks.mjs). */
export function trackShape(circuitId: string, maxPts = 260): TrackShape | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/tracks", circuitId + ".json"), "utf8"));
    const pts: [number, number, number][] = raw.points;
    const step = Math.max(1, Math.floor(pts.length / maxPts));
    const out = pts.filter((_, i) => i % step === 0);
    return { circuit: circuitId, year: raw.year, points: out };
  } catch {
    return null;
  }
}
