import { cached, radioUrl, transcribe } from "@/lib/radioTranscript";

// GET  /api/radio/transcript?url=<OpenF1 recording_url>[&p=1]  → {text, segments[{start,end,text}]}
//      transcribes locally with Whisper on first request (one job at a time; p=1 = the clip being played, jumps the queue).
// POST /api/radio/transcript {urls: string[]}                   → {[url]: transcript | null} — cache lookup only, never transcribes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const url = radioUrl(q.get("url"));
  if (!url) return Response.json({ error: "url must be an OpenF1 team-radio mp3 on livetiming.formula1.com" }, { status: 400 });
  if (process.env.VERCEL && !cached(url)) return Response.json({ error: "transcript_not_prepared" }, { status: 503 });
  try {
    const t = await transcribe(url, q.get("p") === "1", req.signal);
    return Response.json({ text: t.text, segments: t.segments }, { headers: { "cache-control": "public, max-age=86400" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "transcription failed" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
  const urls = Array.isArray(body?.urls) ? body.urls.slice(0, 500) : [];
  const out: Record<string, { text: string; segments: unknown[] } | null> = {};
  for (const raw of urls) {
    const url = typeof raw === "string" ? radioUrl(raw) : null;
    if (!url) continue;
    const t = cached(url);
    out[url] = t ? { text: t.text, segments: t.segments } : null;
  }
  return Response.json(out, { headers: { "cache-control": "no-store" } });
}
