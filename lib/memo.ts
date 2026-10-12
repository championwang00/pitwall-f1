import { databaseRevision } from "./db";
/** DB-derived values expire immediately when a verified release is activated. */
export function memo<A extends unknown[], R>(fn: (...a: A) => R, ttlMs = 30 * 60e3, revision = databaseRevision): (...a: A) => R {
  const m = new Map<string, { t: number; v: R }>();
  let previousRevision = revision();
  return (...a: A) => {
    const currentRevision = revision();
    if (previousRevision !== currentRevision) { m.clear(); previousRevision = currentRevision; }
    const k = JSON.stringify(a);
    const hit = m.get(k);
    if (hit && Date.now() - hit.t < ttlMs) return hit.v;
    const v = fn(...a);
    m.set(k, { t: Date.now(), v });
    return v;
  };
}
