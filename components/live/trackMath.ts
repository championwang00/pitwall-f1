import * as THREE from "three";

type P3 = [number, number, number];

/** Shared with Track3D so overlay labels land on the cars. */
export { trackCurve as buildCurve } from "@/components/three/relief";

/**
 * The outline is one real lap sampled at a constant rate, so sample index ≈ elapsed lap time.
 * Returns f(timeFraction) -> distance fraction, which makes cars slow down in corners like the real thing.
 */
export function timeToDistance(points: P3[]) {
  const n = points.length;
  const cum = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const a = points[i - 1], b = points[i % n];
    cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const total = cum[n] || 1;
  return (f: number) => {
    const x = (((f % 1) + 1) % 1) * n;
    const i = Math.floor(x), r = x - i;
    return (cum[i] + (cum[Math.min(n, i + 1)] - cum[i]) * r) / total;
  };
}

/** Mirrors Track3D's FitCamera (spin 0, pointer at rest). Returns world→screen projector for car markers. */
export function makeProjector(w: number, h: number, dir: P3, radius: number, fovDeg = 38, y = -0.3) {
  const cam = new THREE.PerspectiveCamera(fovDeg, w / Math.max(1, h), 0.1, 1000);
  const aspect = w / Math.max(1, h);
  const vfov = (fovDeg * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const fov = Math.min(vfov, hfov);
  const dist = radius / Math.sin(fov / 2);
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(dist);
  cam.position.set(d.x, d.y + y, d.z);
  cam.lookAt(0, y, 0);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3();
  return (p: THREE.Vector3): [number, number] => {
    v.set(p.x, p.y + 0.09, p.z).project(cam);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
}

export function dim(hex: string, k: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return "#" + c.getHexString();
}
