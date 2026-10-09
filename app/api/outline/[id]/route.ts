import { get } from "@/lib/db";
import { layoutSvg } from "@/lib/circuitImage";

/** One circuit-season layout source for chips, cards and detail pages; round disambiguates double headers. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const year = Number(q.get("year"));
  const round = q.get("round") ? Number(q.get("round")) : null;
  if (!Number.isInteger(year) || year < 1950 || year > 2100) return new Response(null, { status: 400 });
  const row = get<{ layout: string }>(`select circuit_layout_id layout from race where circuit_id = ? and year = ?
    and circuit_layout_id is not null ${round ? "and round = ?" : ""} order by round limit 1`,
    ...[id, year, ...(round ? [round] : [])]);
  if (!row) return new Response(null, { status: 404 });
  return new Response(null, { status: 302, headers: {
    location: layoutSvg(row.layout, q.get("variant") === "white" ? "white" : "black"),
    "cache-control": "public, max-age=86400", "x-circuit-layout": row.layout,
  } });
}
