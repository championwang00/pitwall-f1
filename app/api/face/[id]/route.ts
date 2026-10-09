import { periodFaceFast } from "@/lib/periodFace";

// GET /api/face/<driver-id>[?s=96][&year=2008] → redirect to that driver's photo FROM THAT SEASON (lib/periodFace.ts);
// without ?year the driver's latest season. No photo at all → F1's own official driver placeholder (never a drawn badge).
const F1_FALLBACK = "https://media.formula1.com/image/upload/c_fill,g_north,w_480,h_480/q_auto/common/f1/2026/fallback/driver/2026fallbackdriverright.webp";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const year = q.get("year") ? +q.get("year")! : undefined;
  const { url, final } = await periodFaceFast(id, year).catch(() => ({ url: null, final: false }));
  const cc = { "cache-control": final ? "public, max-age=86400" : "public, max-age=30" };
  return new Response(null, { status: 302, headers: { location: url ?? F1_FALLBACK, ...cc } });
}
