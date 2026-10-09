/** Tiny in-process memo for pure DB-derived computations (talking points, records): F1DB only changes on `npm run update-data`. */
export function memo<A extends unknown[], R>(fn: (...a: A) => R, ttlMs = 30 * 60e3): (...a: A) => R {
  const m = new Map<string, { t: number; v: R }>();
  return (...a: A) => {
    const k = JSON.stringify(a);
    const hit = m.get(k);
    if (hit && Date.now() - hit.t < ttlMs) return hit.v;
    const v = fn(...a);
    m.set(k, { t: Date.now(), v });
    return v;
  };
}
