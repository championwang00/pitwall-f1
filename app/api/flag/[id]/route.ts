import FLAGS from "@/data/f1-flags.json";
import COUNTRY_A2 from "@/data/countries.json";

// GET /api/flag/<f1db-country-id> → formula1.com's own circular country flag (vector, from its icon library,
// extracted by scripts/build-f1-flags.py). Countries F1 has no flag for (Rhodesia, East Germany…) redirect
// to the flagcdn bitmap, which CSS crops to the same circle.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const f = (FLAGS as Record<string, { vb: string; svg: string }>)[id];
  if (f) {
    const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.vb}" fill="none">${f.svg}</svg>`;
    return new Response(body, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=604800" } });
  }
  const a2 = (COUNTRY_A2 as Record<string, string>)[id];
  if (a2) return new Response(null, { status: 302, headers: { location: `https://flagcdn.com/w80/${a2}.png`, "cache-control": "public, max-age=604800" } });
  return new Response("no flag", { status: 404 });
}
