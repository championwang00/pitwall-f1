import { teamLogoAny } from "@/lib/teamLogo";

// GET /api/logo/<constructor-id>[?v=white] → redirect to the team's real logo; 404 when none is known
// (callers show the name only — no drawn monogram). White variant falls back to the colour logo.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const white = new URL(req.url).searchParams.get("v") === "white";
  const url = (await teamLogoAny(id, white).catch(() => null)) ?? (white ? await teamLogoAny(id).catch(() => null) : null);
  if (url) return new Response(null, { status: 302, headers: { location: url, "cache-control": "public, max-age=86400" } });
  return new Response("no logo", { status: 404, headers: { "cache-control": "public, max-age=3600" } });
}
