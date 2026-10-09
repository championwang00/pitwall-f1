import { carImageFast, teamImageFast, teamYearImageFast } from "@/lib/carImage";

// GET /api/carimg/<chassis-id>            → that chassis' own photo (exact) or F1's placeholder car
//     /api/carimg/<chassis-id>?family=1   → may fall back to a captioned family photo (car page only)
//     /api/carimg/team:<constructor-id>   → the team's representative car (most-winning chassis with a photo)
//     /api/carimg/team:<constructor-id>@<year> → a chassis the team raced that year, or the placeholder
// Answers within ~1.5 s from what is known; the full lookup keeps running and is cached for next time.
// Headers `x-img-status` (exact | representative | placeholder) and `x-img-caption` (URI-encoded) describe the pick.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await ctx.params).id);
  const family = new URL(req.url).searchParams.get("family") === "1";
  const m = /^team:([^@]+)(?:@(\d{4}))?$/.exec(id);
  const pic = m ? (m[2] ? await teamYearImageFast(m[1], +m[2]) : await teamImageFast(m[1])) : await carImageFast(id, { family });
  const status = pic.exact ? "exact" : pic.kind === "placeholder" ? "placeholder" : "representative";
  return new Response(null, {
    status: 302,
    headers: {
      location: pic.url,
      "cache-control": pic.kind === "placeholder" ? "public, max-age=30" : "public, max-age=86400",
      "x-img-status": status,
      "x-img-caption": encodeURIComponent(pic.caption ?? ""),
      "x-img-depicts": pic.depicts ?? "",
    },
  });
}
