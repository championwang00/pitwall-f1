/** Shared by first-entry preparation and replay consumers; live polling bypasses it. */
export type PreparedJSON = { ok: boolean; status: number; data: unknown };
const entries = new Map<string, { until: number; promise: Promise<PreparedJSON>; value?: PreparedJSON }>();
const TTL = 60 * 60 * 1000;

export function preparedJSON(url: string, reuse = true): Promise<PreparedJSON> {
  const cached = entries.get(url);
  if (reuse && cached && cached.until > Date.now()) return cached.promise;
  const request = (async (): Promise<PreparedJSON> => {
    try {
      const response = await fetch(url, { cache: reuse ? "force-cache" : "no-store", signal: AbortSignal.timeout(20000) });
      return { ok: response.ok, status: response.status, data: await response.json() };
    } catch { return { ok: false, status: 0, data: null }; }
  })();
  if (reuse) {
    if (entries.size >= 80) entries.delete(entries.keys().next().value!);
    entries.set(url, { until: Date.now() + TTL, promise: request });
    void request.then((result) => {
      // Refusals and outages must be retried instead of becoming a cached empty replay.
      const entry = entries.get(url);
      if (entry?.promise !== request) return;
      if (!result.ok) entries.delete(url);
      else entry.value = result;
    });
  }
  return request;
}

export function peekPreparedJSON(url: string): PreparedJSON | undefined {
  const entry = entries.get(url);
  return entry && entry.until > Date.now() ? entry.value : undefined;
}
