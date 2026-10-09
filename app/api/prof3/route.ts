import { nextSession } from "@/lib/schedule";
import { allSeasons } from "@/lib/f1";
export async function GET() {
  const o: Record<string, number> = {};
  const t = async (k: string, f: () => unknown) => { const a = performance.now(); await f(); o[k] = Math.round(performance.now() - a); };
  await t("nextSession", () => nextSession());
  await t("allSeasons", () => allSeasons());
  return Response.json(o);
}
