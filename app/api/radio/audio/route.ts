import { radioUrl } from "@/lib/radioTranscript";

// GET /api/radio/audio?url=<OpenF1 recording_url> — same-origin pass-through of a team-radio mp3.
// livetiming.formula1.com sends no CORS headers, and Web Audio's AnalyserNode only reads same-origin (or CORS) media:
// proxying is what lets the TEAM RADIO overlay draw the real audio level. Range requests are forwarded for seeking.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = radioUrl(new URL(req.url).searchParams.get("url"));
  if (!url) return new Response("bad url", { status: 400 });
  const range = req.headers.get("range");
  const r = await fetch(url, { headers: range ? { range } : {}, signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!r || !r.ok || !r.body) return new Response("upstream error", { status: 502 });
  const h = new Headers({ "content-type": "audio/mpeg", "cache-control": "public, max-age=604800, immutable", "accept-ranges": "bytes" });
  for (const k of ["content-length", "content-range", "etag", "last-modified"]) { const v = r.headers.get(k); if (v) h.set(k, v); }
  return new Response(r.body, { status: r.status, headers: h });
}
