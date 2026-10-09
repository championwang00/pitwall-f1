import * as THREE from "three";

/**
 * Elevation handling shared by Track3D and the live track maths.
 * OpenF1 positions are in decimetres; real relief ranges from ~2 m (Jeddah) to ~100 m (Spa),
 * so a fixed exaggeration leaves street circuits flat. Instead every circuit is scaled so its
 * highest point sits at a readable height, the flattest ones getting the most exaggeration.
 */
export type P3 = [number, number, number];

/** Circular moving average on z — exaggeration ×80 would otherwise turn 10 cm quantisation into steps. */
export function smoothZ(points: P3[], win = 7): P3[] {
  const n = points.length, h = Math.floor(win / 2);
  return points.map(([x, y], i) => {
    let sum = 0;
    for (let k = -h; k <= h; k++) sum += points[(i + k + n) % n][2];
    return [x, y, sum / win] as P3;
  });
}

/** World-unit height of the tallest point for a 10-unit-wide track: hilly tracks up to 1.1, flat ones at least 0.55. */
export function reliefTarget(dzMeters: number) {
  return Math.min(1.1, 0.55 + Math.sqrt(Math.max(0, dzMeters)) * 0.055);
}

/** Exaggeration factor applied to z (after scaling the track to 10 units wide). */
export function reliefScale(points: P3[], s: number) {
  const zs = points.map((p) => p[2]);
  const dz = Math.max(...zs) - Math.min(...zs);
  if (dz < 1e-6) return 0;
  return reliefTarget(dz / 10) / (dz * s);
}

/** Real elevation range in metres and how much the 3D view exaggerates it (vs. true horizontal scale). */
export function reliefInfo(points: P3[]) {
  const sm = smoothZ(points);
  const xs = sm.map((p) => p[0]), ys = sm.map((p) => p[1]), zs = sm.map((p) => p[2]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const dz = Math.max(...zs) - Math.min(...zs);
  return { meters: Math.round(dz / 10), factor: Math.round(reliefScale(sm, 10 / span)) };
}

/** The one track curve used by every 3D view: 10 units wide, centred, z smoothed and relief-scaled. `boost` multiplies the auto relief. */
export function trackCurve(raw: P3[], boost = 1) {
  const points = smoothZ(raw);
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]), zs = points.map((p) => p[2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const s = 10 / Math.max(maxX - minX, maxY - minY);
  const k = reliefScale(points, s) * boost;
  const v: THREE.Vector3[] = [];
  for (const [x, y, z] of points) {
    const p = new THREE.Vector3((x - cx) * s, (z - minZ) * s * k, -(y - cy) * s);
    if (!v.length || v[v.length - 1].distanceTo(p) > 0.02) v.push(p);
  }
  if (v.length > 3 && v[0].distanceTo(v[v.length - 1]) < 0.05) v.pop();
  return new THREE.CatmullRomCurve3(v, true, "centripetal", 0.5);
}
