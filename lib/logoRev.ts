import fs from "node:fs";
import path from "node:path";

/**
 * Cache key for /api/logo URLs: changes whenever the logo data or the route's rules change, so a browser never keeps
 * serving a logo we have since replaced (the URLs are cached for an hour). Server-only (reads file times).
 */
let memo: { at: number; v: string } | null = null;
export function logoRev(): string {
  if (memo && Date.now() - memo.at < 5000) return memo.v;
  let t = 0;
  try { t = Math.max(t, fs.statSync(path.join(process.cwd(), "data", "base-assets.json")).mtimeMs); } catch {}
  try { t = Math.max(t, fs.statSync(path.join(process.cwd(), "data", "team-logos-year.json")).mtimeMs); } catch {}
  try { t = Math.max(t, fs.statSync(path.join(process.cwd(), "lib", "teamLogo.ts")).mtimeMs); } catch {}
  try { t = Math.max(t, fs.statSync(path.join(process.cwd(), "app", "api", "logo", "[id]", "route.ts")).mtimeMs); } catch {}
  memo = { at: Date.now(), v: Math.floor(t / 1000).toString(36) };
  return memo.v;
}
