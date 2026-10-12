/** Classifications can arrive after the chequered flag. Missing results do not mean a future race. */
export function raceFinished(r: { winner?: string | null; date: string; sessions: { name: string; end: string }[] }, now = Date.now()) {
  if (r.winner) return true;
  const race = r.sessions.find((s) => s.name === "Race");
  return Date.parse(race?.end ?? `${r.date}T23:59:59Z`) < now;
}
