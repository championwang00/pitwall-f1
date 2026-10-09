import type { NextRequest } from "next/server";
import { cachedJSON } from "@/lib/cache";

/**
 * Same-origin proxy to OpenF1 with the shared disk+memory cache.
 *   /api/openf1/laps?session_key=11731            -> https://api.openf1.org/v1/laps?session_key=11731
 * TTL: `?ttl=<seconds>|forever` wins; otherwise it is decided from the session's scheduled end
 *   (ended >3h ago -> forever, >1h -> 60s, else 5s — delayed races can run well past date_end).
 * Upstream "No results" (404) becomes [] so clients never have to special-case empty sessions.
 */

const BASE = "https://api.openf1.org/v1";
const ENDPOINTS = new Set([
  "sessions", "meetings", "drivers", "laps", "intervals", "position", "stints", "pit", "race_control", "weather",
  "team_radio", "session_result", "starting_grid", "championship_drivers", "championship_teams", "overtakes", "car_data", "location",
]);

export const dynamic = "force-dynamic";

async function ttlForSession(key: string | null): Promise<number> {
  if (!key) return 300;
  if (!/^\d+$/.test(key)) return 5; // "latest"
  try {
    const s = await cachedJSON<{ date_end: string }[] | null>(`${BASE}/sessions?session_key=${key}`, 3600);
    const end = s?.[0]?.date_end ? Date.parse(s[0].date_end) : NaN;
    if (!Number.isFinite(end)) return 5;
    const since = Date.now() - end;
    if (since > 3 * 3600e3) return Infinity;
    if (since > 3600e3) return 60;
    return 5;
  } catch {
    return 5;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const ep = path.join("/");
  if (!ENDPOINTS.has(path[0]) || path.length > 1) return Response.json({ error: "unknown endpoint" }, { status: 404 });

  // Keep the raw query (OpenF1 filters look like `date>2026-…`), minus proxy-only params.
  const raw = new URL(req.url).search.replace(/^\?/, "");
  let ttlParam: string | null = null;
  let sessionKey: string | null = null;
  const parts = raw.split("&").filter(Boolean).filter((p) => {
    const [k, v = ""] = p.split("=");
    if (k === "ttl") { ttlParam = decodeURIComponent(v); return false; }
    if (k === "session_key") sessionKey = decodeURIComponent(v);
    return true;
  });
  const url = `${BASE}/${ep}${parts.length ? "?" + parts.join("&") : ""}`;

  let ttl: number;
  if (ttlParam === "forever") ttl = Infinity;
  else if (ttlParam && Number.isFinite(+ttlParam)) ttl = Math.max(2, +ttlParam);
  else ttl = await ttlForSession(sessionKey);

  try {
    const data = await cachedJSON(url, ttl);
    const cc = ttl === Infinity ? "public, max-age=3600, s-maxage=31536000" : ttl >= 60 ? `public, max-age=${Math.min(ttl, 300)}` : "no-store";
    return Response.json(data ?? [], { headers: { "cache-control": cc, "x-pitwall-ttl": String(ttl) } });
  } catch (e) {
    const status = Number(String((e as Error)?.message || "").match(/^(\d{3})\b/)?.[1]) || 502;
    const pass = status === 401 || status === 403 || status === 429;
    return Response.json(
      { error: pass ? "upstream_refused" : "upstream_error", status },
      { status: pass ? status : 502, headers: { "cache-control": "no-store" } },
    );
  }
}
