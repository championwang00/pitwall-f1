import { periodFaceFast, driverPhotoKnown, latestYear } from "@/lib/periodFace";

// The same season selection as heroes and cards: exact year, then a captioned nearest same-team year.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const y = Number(new URL(req.url).searchParams.get("year"));
  const year = Number.isInteger(y) && y >= 1950 && y <= 2100 ? y : latestYear(id) ?? 2026;
  await periodFaceFast(id, year).catch(() => null);
  const pic = driverPhotoKnown(id, year);
  const status = pic.exact ? "exact" : pic.kind === "placeholder" ? "placeholder" : "team-near";
  return new Response(null, { status: 302, headers: {
    location: pic.url,
    "cache-control": pic.exact ? "public, max-age=86400" : "public, max-age=30",
    "x-img-status": status,
    "x-img-year": pic.sourceYear ? String(pic.sourceYear) : "",
    "x-img-caption": encodeURIComponent(pic.caption ?? ""),
  } });
}
