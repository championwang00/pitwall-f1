import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Proxies the official F1 fonts from formula1.com (which sends no CORS header) for local use.
// Files are cached under .cache/ and never committed. Falls back to 404 so CSS uses Titillium Web.
// URLs follow https://www.formula1.com/s/fonts.css (its `./fonts/<dir>/<file>` relative paths).
const ALLOWED: Record<string, string> = {
  "Formula1-Regular.woff2": "formula1", "Formula1-Bold.woff2": "formula1", "Formula1-Black.woff2": "formula1",
  "Formula1-Italic.woff2": "formula1", "Formula1-Wide.woff2": "formula1", "Formula1-Year.woff2": "formula1",
  "KHInterferenceF1-Regular.woff2": "kh-interference-f1", "KHInterferenceF1-Bold.woff2": "kh-interference-f1",
  "KHInterference-Regular.woff2": "kh-interference", "KHInterference-Bold.woff2": "kh-interference",
};

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const dir = ALLOWED[file];
  if (!dir) return new Response("not found", { status: 404 });
  const local = path.join(process.env.VERCEL ? os.tmpdir() : process.cwd(), process.env.VERCEL ? "pitwall/fonts" : ".cache/fonts", file);
  let buf: Buffer | null = null;
  try {
    buf = await fs.readFile(local);
  } catch {
    const r = await fetch(`https://www.formula1.com/s/fonts/${dir}/${file}`, {
      headers: { "user-agent": "Mozilla/5.0" },
    }).catch(() => null);
    if (!r || !r.ok) return new Response("unavailable", { status: 404 });
    buf = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(path.dirname(local), { recursive: true });
    await fs.writeFile(local, buf);
  }
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable" },
  });
}
