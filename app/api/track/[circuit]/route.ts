import type { NextRequest } from "next/server";
import { trackShape } from "@/lib/tracks";
import { CIRCUIT_ID } from "@/components/live/names";

/** Track outline for the 3D map. Accepts an F1DB circuit id ("sepang") or an OpenF1 circuit_short_name ("Kuala Lumpur"). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ circuit: string }> }) {
  const { circuit } = await ctx.params;
  const name = decodeURIComponent(circuit);
  const id = /^[a-z0-9-]+$/.test(name) ? name : CIRCUIT_ID[name];
  const shape = id ? trackShape(id, 420) : null;
  if (!shape) return Response.json({ error: "no track outline" }, { status: 404 });
  return Response.json(shape, { headers: { "cache-control": "public, max-age=86400" } });
}
