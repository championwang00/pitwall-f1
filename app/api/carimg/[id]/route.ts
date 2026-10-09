import { carImage, chassisPhoto, teamImage, F1_FALLBACK_CAR } from "@/lib/carImage";

// GET /api/carimg/<chassis-id>  (or /api/carimg/team:<constructor-id>) → redirect to a real photo of that car / team car.
// Answers within ~1.5 s with the best known picture; the full lookup keeps running and is cached for next time.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const isTeam = id.startsWith("team:");
  const job = isTeam ? teamImage(id.slice(5)) : carImage(id);
  const url = await Promise.race([job, new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
  const final = !!url && url !== F1_FALLBACK_CAR;
  return new Response(null, { status: 302, headers: { location: url ?? F1_FALLBACK_CAR, "cache-control": final ? "public, max-age=86400" : "public, max-age=30" } });
}
