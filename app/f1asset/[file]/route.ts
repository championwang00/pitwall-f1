import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Same-origin proxy for formula1.com design-system textures (its "DRS pattern" alpha masks used behind
// driver / team cards). CSS mask-image needs CORS, which www.formula1.com doesn't send. Cached under .cache/, never committed.
const BASE = "https://www.formula1.com/assets/driverTeam/_next/static/media/";
const ALLOWED: Record<string, string> = {
  "drs-g.webp": "DRS-G-2x~444bb8a2f38894fc.444bb8a2.webp", // driver card
  "drs-d.webp": "DRS-D-2x~b150f9485e396e0b.b150f948.webp", // team card
};

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const src = ALLOWED[file];
  if (!src) return new Response("not found", { status: 404 });
  const local = path.join(process.env.VERCEL ? os.tmpdir() : process.cwd(), process.env.VERCEL ? "pitwall/f1asset" : ".cache/f1asset", file);
  let buf: Buffer | null = null;
  try {
    buf = await fs.readFile(local);
  } catch {
    const r = await fetch(BASE + src, { headers: { "user-agent": "Mozilla/5.0" } }).catch(() => null);
    if (!r || !r.ok) return new Response("unavailable", { status: 404 });
    buf = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(path.dirname(local), { recursive: true });
    await fs.writeFile(local, buf);
  }
  return new Response(new Uint8Array(buf), { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" } });
}
