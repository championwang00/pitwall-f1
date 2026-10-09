/** Result-cell class for server components (mirrors resClass in the cube). */
export function resClassServer(pos: number | null, text: string) {
  if (pos == null) return /^(DNS|DNQ|DNPQ|EX|DSQ|DQ)$/.test(text) ? "res out" : "res dnf";
  if (pos === 1) return "res p1";
  if (pos <= 3) return "res pod";
  if (pos <= 10) return "res pts";
  return "res out";
}
