import { readFileSync } from "node:fs";
import { cutout, cutoutAllowed } from "@/lib/cutout";

// GET /api/cutout?u=<photo url> → that single-person photo with the background removed (lib/cutout, Apple Vision,
// cached PNG). A photo the tool refuses (group / far shot) or a failure → 302 to the original photo.
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") ?? "";
  if (!cutoutAllowed(u)) return new Response("bad source", { status: 400 });
  const file = await cutout(u).catch(() => null);
  if (!file) return new Response(null, { status: 302, headers: { location: u, "cache-control": "public, max-age=300", "x-cutout": "no" } });
  return new Response(new Uint8Array(readFileSync(file)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=604800", "x-cutout": "ok" } });
}
