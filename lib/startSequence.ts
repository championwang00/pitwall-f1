export const START_SEQUENCE_KEY = "pitwall-grid-in-progress";
export type StartSequence = { lit: number; progress: number; changedAt: number };

export function readStartSequence(storage: Pick<Storage, "getItem">, now = Date.now()): StartSequence | null {
  try {
    const saved = JSON.parse(storage.getItem(START_SEQUENCE_KEY) ?? "null") as StartSequence | null;
    if (!saved || !Number.isInteger(saved.lit) || saved.lit < 0 || saved.lit > 5
      || !Number.isFinite(saved.progress) || saved.progress < 0 || saved.progress > saved.lit * 20
      || !Number.isFinite(saved.changedAt) || saved.changedAt > now || now - saved.changedAt > 10 * 60_000) return null;
    return saved;
  } catch { return null; }
}
