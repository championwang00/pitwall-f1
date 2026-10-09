import { all } from "@/lib/db";
import { circuitTalk, driverTalk } from "@/lib/talk";
import { driverRecordsAt } from "@/lib/brief";
import { notes, drivers as dContent, circuits as cContent } from "@/lib/content";
import { DRIVERS_2026 } from "@/lib/assets";

// GET /api/talk?circuit=marina-bay&acr=VER,ANT — commentator cards for the live page.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const circuit = u.searchParams.get("circuit") ?? "";
  const acrs = (u.searchParams.get("acr") ?? "").split(",").filter(Boolean).slice(0, 4);
  const year = all<any>("select max(year) y from season_entrant_driver")[0].y;
  const byAcr = new Map(all<any>(
    `select d.id, d.abbreviation acr, d.name from season_entrant_driver sed join driver d on d.id = sed.driver_id where sed.year = ? and sed.test_driver = 0 group by d.id`, year,
  ).map((r) => [r.acr, r]));
  const ids = acrs.map((a) => byAcr.get(a)?.id).filter(Boolean) as string[];
  const recs = circuit ? driverRecordsAt(circuit, ids) : [];
  const drivers = Object.fromEntries(acrs.map((a) => {
    const d = byAcr.get(a);
    if (!d) return [a, null];
    const curated = notes.driver(d.id).slice(0, 2);
    const auto = driverTalk(d.id).filter((t) => t.tag !== "下一站").slice(0, 3);
    return [a, {
      id: d.id, name: d.name, zh: dContent()[d.id]?.nameZh ?? DRIVERS_2026[d.id]?.nameZh ?? d.name,
      rec: recs.find((r) => r.id === d.id) ?? null,
      points: [...curated.map((n) => ({ tag: n.tag, title: n.title, text: n.text, src: n.sources[0]?.url ?? null })), ...auto.map((t) => ({ tag: t.tag, title: t.title, text: t.text, src: null }))].slice(0, 4),
    }];
  }));
  const ct = circuit ? [...notes.circuit(circuit).slice(0, 2).map((n) => ({ tag: n.tag, title: n.title, text: n.text, src: n.sources[0]?.url ?? null })), ...circuitTalk(circuit).slice(0, 4).map((t) => ({ tag: t.tag, title: t.title, text: t.text, src: null }))] : [];
  return Response.json({ circuit, circuitZh: cContent()[circuit]?.nameZh ?? circuit, circuitPoints: ct.slice(0, 5), drivers });
}
