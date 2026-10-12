import { cached, radioUrl, transcribe } from "@/lib/radioTranscript";
import { cloudFailure, cloudTranscripts } from "@/lib/cloudRadioTranscripts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const url = radioUrl(q.get("url"));
  if (!url) return Response.json({ error: "url must be an OpenF1 team-radio mp3 on livetiming.formula1.com" }, { status: 400 });
  const hit = cached(url) ?? (await cloudTranscripts([url]))[url];
  if (hit) return Response.json({ text: hit.text, segments: hit.segments }, { headers: { "cache-control": "public, max-age=86400" } });
  if (process.env.VERCEL) {
    const failure = await cloudFailure(url);
    return Response.json({ status: failure ? "retrying" : "pending", retryAfter: 30 }, { status: 202, headers: { "retry-after": "30", "cache-control": "no-store" } });
  }
  try {
    const t = await transcribe(url, q.get("p") === "1", req.signal);
    return Response.json({ text: t.text, segments: t.segments }, { headers: { "cache-control": "public, max-age=86400" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "transcription failed" }, { status: 502 });
  }
}

/** Cache-only session lookup. Directory packs deduplicate origin reads for hundreds of clips. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
  const urls = (Array.isArray(body?.urls) ? body.urls.slice(0, 500) : []).flatMap(raw => typeof raw === "string" && radioUrl(raw) ? [radioUrl(raw)!] : []);
  const missing = urls.filter(url => !cached(url));
  const cloud = await cloudTranscripts(missing);
  return Response.json(Object.fromEntries(urls.map(url => { const t = cached(url) ?? cloud[url]; return [url, t ? { text: t.text, segments: t.segments } : null]; })), { headers: { "cache-control": "no-store" } });
}
