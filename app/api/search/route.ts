import { searchIndex, allSeasons } from "@/lib/f1";
import { drivers as dContent, teams as tContent, circuits as cContent } from "@/lib/content";
import { DRIVERS_2026 } from "@/lib/assets";
import { TEAM_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";

export const dynamic = "force-static";

export async function GET() {
  const idx = searchIndex();
  const dz = dContent(), tz = tContent(), cz = cContent();
  const items = [
    ...idx.drivers.map((d: any) => ({
      kind: "driver", id: d.id, title: d.name, zh: zhName.driver(d.id) ?? undefined,
      meta: `${d.y0 ?? ""}${d.y1 && d.y1 !== d.y0 ? "–" + d.y1 : ""} · ${d.s} 场${d.w ? ` · ${d.w} 胜` : ""}${d.t ? ` · ${d.t} 冠` : ""}`,
      score: d.s * 4 + d.w * 40 + d.t * 400 + (d.y1 === 2026 ? 3000 : 0), href: `/drivers/${d.id}`,
    })),
    ...idx.teams.map((t: any) => ({
      kind: "team", id: t.id, title: t.name, zh: zhName.team(t.id) ?? undefined,
      meta: `${t.y0 ?? ""}–${t.y1 ?? ""}${t.w ? ` · ${t.w} 胜` : ""}${t.t ? ` · ${t.t} 冠` : ""}`,
      score: t.w * 20 + t.t * 200 + (t.y1 === 2026 ? 3000 : 0), href: `/teams/${t.id}`,
    })),
    ...idx.circuits.map((c: any) => ({ kind: "circuit", id: c.id, title: c.name, zh: zhName.circuit(c.id) ?? undefined, meta: `${c.p} · ${c.n} 场`, score: c.n * 30, href: `/circuits/${c.id}` })),
    ...idx.cars.map((c: any) => ({ kind: "car", id: c.id, title: c.name, meta: `${c.y0 ?? ""}`, score: 0, href: `/cars/${c.id}` })),
    ...allSeasons().map((y: any) => ({ kind: "year", id: String(y.year), title: `${y.year} 赛季`, meta: `${y.races} 站`, score: y.year === 2026 ? 2000 : 10, href: `/seasons/${y.year}` })),
  ];
  return Response.json(items);
}
