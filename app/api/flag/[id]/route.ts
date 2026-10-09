import FLAGS from "@/data/f1-flags.json";
import COUNTRY_A2 from "@/data/countries.json";

// GET /api/flag/<f1db-country-id> → formula1.com's own circular country flag (vector, from its icon library,
// extracted by scripts/build-f1-flags.py). Countries F1 has no flag for (Rhodesia, East Germany…) redirect
// to the flagcdn bitmap, which CSS crops to the same circle.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const f = (FLAGS as Record<string, { vb: string; svg: string }>)[id];
  if (f) {
    let inner = f.svg;
    // F1's China asset is a small rectangle on a white disc (unlike every other round flag) and vanishes at 20 px:
    // keep F1's own stars, but let the red field fill the disc like the other flags.
    if (id === "china") inner = inner.replace(/<path d="M28\.5081 55\.4193[^"]*" fill="white"\/>/, "").replace(/<rect x="5\.46648" y="12\.3679" width="46\.03" height="30\.6935" fill="#EE1C25"\/>/, '<circle cx="28.5" cy="27.72" r="27.7" fill="#EE1C25"/>');
    const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.vb}" fill="none">${inner}</svg>`;
    return new Response(body, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=604800" } });
  }
  const a2 = (COUNTRY_A2 as Record<string, string>)[id];
  if (a2) return new Response(null, { status: 302, headers: { location: `https://flagcdn.com/w80/${a2}.png`, "cache-control": "public, max-age=604800" } });
  return new Response("no flag", { status: 404 });
}
