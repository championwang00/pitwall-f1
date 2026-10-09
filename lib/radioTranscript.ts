// Team-radio speech-to-text, done locally: OpenF1 only ships the audio (livetiming.formula1.com/static/.../TeamRadio/*.mp3).
// mp3 → ffmpeg (16 kHz mono, voice band-pass, loudness-normalised) → OpenAI Whisper CLI → {text, segments}.
// Results are cached for good in data/radio-transcripts.json, keyed by recording URL. Server-only.
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { textScore } from "./radioSpeakerText";

export type Segment = { start: number; end: number; text: string; speaker?: "driver" | "team"; spk?: "voice" };
export type Transcript = { text: string; segments: Segment[]; model: string; at: string; v: number };
/** Format of newly generated transcripts; readable older records remain available. */
const VERSION = 3; // v3: sentence-level lines + speaker (voice clustering within the clip, labelled by phrasing)

const FILE = path.join(process.cwd(), "data/radio-transcripts.json");
const MODELS = path.join(os.homedir(), ".cache/whisper");
const bin = (name: string) => [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`].find((p) => fs.existsSync(p)) ?? name;
/** `small` reads noisy radio clearly better than `base` (measured on 2026 Hungary clips) at ~3–8 s per clip on this Mac. */
const MODEL = process.env.RADIO_WHISPER_MODEL || (fs.existsSync(path.join(MODELS, "small.pt")) ? "small" : "base");
const JOB_TIMEOUT = 150_000;
const MAX_BYTES = 8 * 1024 * 1024;

/** Only OpenF1's static radio host, only its TeamRadio mp3s. */
export function radioUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.hostname !== "livetiming.formula1.com") return null;
    if (!u.pathname.startsWith("/static/") || !/\/TeamRadio\/[\w.-]+\.mp3$/i.test(u.pathname) || u.pathname.includes("..")) return null;
    if (u.search || u.hash || u.username || u.port) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// ── cache file (in memory, re-read when the file changes on disk) ──
type Store = Record<string, Transcript>;
type Job = { url: string; p: Promise<Transcript>; run: () => void; waiters: number; reject: (e: unknown) => void };
type State = { mtime: number; data: Store; queue: Job[]; busy: boolean; inflight: Map<string, Job> };
const G = globalThis as unknown as { __radioTx2?: State };
const st: State = (G.__radioTx2 ??= { mtime: -1, data: {}, queue: [], busy: false, inflight: new Map() } as State);

function store(): Store {
  try {
    const m = fs.statSync(FILE).mtimeMs;
    if (m !== st.mtime) { st.data = JSON.parse(fs.readFileSync(FILE, "utf8")); st.mtime = m; }
  } catch { /* no file yet */ }
  return st.data;
}
async function save(url: string, t: Transcript) {
  const data = { ...store(), [url]: t };
  const tmp = FILE + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(data, null, 0));
  await fsp.rename(tmp, FILE);
  st.data = data;
  st.mtime = fs.statSync(FILE).mtimeMs;
}

export function cached(url: string): Transcript | null {
  const t = store()[url];
  // Older records still contain valid timed text. A speaker-format upgrade must
  // not erase subtitles on hosts that cannot run the local Whisper pipeline.
  return t && typeof t.text === "string" && Array.isArray(t.segments)
    && t.segments.every((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && typeof s.text === "string") ? t : null;
}

// ── one whisper job at a time, process-wide (survives HMR via globalThis) ──
function pump() {
  if (st.busy) return;
  const job = st.queue.shift();
  if (!job) return;
  st.busy = true;
  job.run();
}

/**
 * Cached transcript, or queue a job and wait for it. `urgent` (the clip being played) jumps the queue.
 * `signal`: when every request waiting on a job that has not started yet goes away (row scrolled off, page closed),
 * the job is dropped instead of burning a Whisper run nobody will read.
 */
export function transcribe(url: string, urgent = false, signal?: AbortSignal): Promise<Transcript> {
  const hit = cached(url);
  if (hit) return Promise.resolve(hit);
  let job = st.inflight.get(url);
  if (job) {
    if (urgent) { // bump a still-waiting job to the front
      const i = st.queue.indexOf(job);
      if (i > 0) st.queue.unshift(...st.queue.splice(i, 1));
    }
  } else {
    let resolve!: (t: Transcript) => void, reject!: (e: unknown) => void;
    const p = new Promise<Transcript>((res, rej) => { resolve = res; reject = rej; });
    p.catch(() => {});
    const j: Job = {
      url, p, waiters: 0, reject,
      run: () => {
        work(url)
          .then(async (t) => { await save(url, t); resolve(t); }, reject)
          .finally(() => { st.inflight.delete(url); st.busy = false; pump(); });
      },
    };
    job = j;
    st.inflight.set(url, j);
    if (urgent) st.queue.unshift(j); else st.queue.push(j);
  }
  const j = job;
  j.waiters++;
  signal?.addEventListener("abort", () => {
    j.waiters--;
    const i = st.queue.indexOf(j);
    if (j.waiters <= 0 && i >= 0) { st.queue.splice(i, 1); st.inflight.delete(url); j.reject(new Error("cancelled")); }
  }, { once: true });
  pump();
  return j.p;
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // argument array, no shell: nothing in the URL or paths can be interpreted
    const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}` };
    const p = spawn(cmd, args, { cwd, env, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (b) => { if (err.length < 4000) err += b; });
    const kill = setTimeout(() => p.kill("SIGKILL"), JOB_TIMEOUT);
    p.on("error", (e) => { clearTimeout(kill); reject(e); });
    p.on("close", (code) => { clearTimeout(kill); code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited ${code}: ${err.slice(-400)}`)); });
  });
}

type WWord = { word: string; start: number; end: number };
type WSeg = { start: number; end: number; text: string; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number; words?: WWord[] };
const FILLER = /^\s*(you|thank you\.?|thanks( for watching)?[.!]?|\.+|…)\s*$/i;

async function work(url: string): Promise<Transcript> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "radio-"));
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!r.ok) throw new Error(`audio ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("audio too large");
    const mp3 = path.join(dir, "clip.mp3"), wav = path.join(dir, "clip.wav");
    await fsp.writeFile(mp3, buf);
    // radio is band-limited and often quiet: band-pass + loudnorm lets Whisper hear the first words too
    await run(bin("ffmpeg"), ["-v", "error", "-y", "-i", mp3, "-ac", "1", "-ar", "16000", "-af", "highpass=f=200,lowpass=f=3800,loudnorm", wav], dir);
    await run(bin("whisper"), [
      wav, "--model", MODEL, "--model_dir", MODELS, "--language", "en", "--task", "transcribe",
      "--output_format", "json", "--output_dir", dir, "--fp16", "False", "--verbose", "False", "--condition_on_previous_text", "False",
      "--word_timestamps", "True",
    ], dir);
    const out = JSON.parse(await fsp.readFile(path.join(dir, "clip.json"), "utf8")) as { segments?: WSeg[] };
    // drop Whisper's usual hallucinations on silence / clicks
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const segments = (out.segments ?? [])
      .filter((s) => !((s.no_speech_prob ?? 0) > 0.6 && (s.avg_logprob ?? 0) < -0.5)) // silence / clicks
      .filter((s) => (s.avg_logprob ?? 0) > -1.2) // Whisper guessing (it already fell back to high temperature)
      .filter((s) => (s.compression_ratio ?? 0) < 2.4 && !FILLER.test(s.text) && !/[^\x00-\u024f\u2018-\u201d\u2026]/.test(s.text)) // loops, fillers, non-Latin garbage
      .filter((s, i, a) => s.text.trim() && (i === 0 || norm(s.text) !== norm(a[i - 1].text))); // repeated-line loops
    const lines = await diarize(mp3, sentences(segments), names(url), dir);
    return { text: lines.map((s) => s.text).join(" "), segments: lines, model: MODEL, at: new Date().toISOString(), v: VERSION };
  } finally {
    fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}


// ── who speaks: driver (helmet mic, engine behind him) vs team (pit-wall headset) ─────────────────────────────

/** Whisper segments often hold both voices ("Copy, checking. I think…"): cut them into sentences / turns using word times. */
function sentences(segs: WSeg[]): Segment[] {
  const words = segs.flatMap((s) => s.words ?? []);
  if (!words.length) return segs.map((s) => ({ start: +s.start.toFixed(2), end: +s.end.toFixed(2), text: s.text.trim() }));
  const out: Segment[] = [];
  let cur: WWord[] = [];
  const flush = () => { if (cur.length) out.push({ start: +cur[0].start.toFixed(2), end: +cur[cur.length - 1].end.toFixed(2), text: cur.map((w) => w.word).join("").trim() }); cur = []; };
  words.forEach((w, i) => {
    const gap = i ? w.start - words[i - 1].end : 0;
    // a turn usually starts after a pause, or with a radio acknowledgement
    if (cur.length && (gap > 0.55 || (gap > 0.2 && /^\s*(copy|yeah|yes|understood|roger|okay|ok|box)\b/i.test(w.word)))) flush();
    cur.push(w);
    if (/[.?!]["']?$/.test(w.word.trim())) flush();
  });
  flush();
  return out.filter((s) => s.text);
}

/** Per-line voice features from the original clip: band balance + spectral centroid/flatness (ffmpeg astats / aspectralstats). */
async function features(mp3: string, a: number, b: number, dir: string): Promise<number[]> {
  const rms = async (af: string) => {
    const out = await capture(bin("ffmpeg"), ["-v", "info", "-ss", String(Math.max(0, a - 0.05)), "-to", String(b + 0.05), "-i", mp3, "-af", `${af},astats=measure_overall=RMS_level`, "-f", "null", "-"], dir, "stderr");
    const m = [...out.matchAll(/RMS level dB: (-?[\d.]+|-inf)/g)].pop()?.[1];
    return m && m !== "-inf" ? +m : -90;
  };
  const [lo, mid, hi] = await Promise.all([rms("lowpass=f=300"), rms("highpass=f=300,lowpass=f=3000"), rms("highpass=f=3000")]);
  const st = await capture(bin("ffmpeg"), ["-v", "error", "-ss", String(Math.max(0, a - 0.05)), "-to", String(b + 0.05), "-i", mp3, "-af", "aspectralstats=measure=centroid+flatness,ametadata=print:file=-", "-f", "null", "-"], dir, "stdout");
  const avg = (re: RegExp) => { const v = [...st.matchAll(re)].map((m) => +m[1]); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; };
  return [lo - mid, hi - mid, avg(/centroid=([\d.]+)/g) / 400, avg(/flatness=([\d.]+)/g) * 40];
}

function capture(cmd: string, args: string[], cwd: string, which: "stdout" | "stderr"): Promise<string> {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", which === "stdout" ? "pipe" : "ignore", which === "stderr" ? "pipe" : "ignore"] });
    let s = "";
    (which === "stdout" ? p.stdout : p.stderr)?.on("data", (d) => { s += d; });
    const t = setTimeout(() => p.kill("SIGKILL"), 20_000);
    p.on("close", () => { clearTimeout(t); res(s); });
    p.on("error", () => { clearTimeout(t); res(""); });
  });
}

/** Driver's first name + surname from the clip file name (e.g. ".../TeamRadio/LEWHAM01_44_….mp3" or "NOR_1_…"), for "Lewis, box" detection. */
function names(url: string): string[] {
  const code = (url.split("/").pop() ?? "").split("_")[0].toUpperCase();
  const KNOWN: Record<string, string[]> = { VER: ["Max", "Verstappen"], HAM: ["Lewis", "Hamilton"], NOR: ["Lando", "Norris"], PIA: ["Oscar", "Piastri"],
    LEC: ["Charles", "Leclerc"], RUS: ["George", "Russell"], ANT: ["Kimi", "Antonelli"], ALO: ["Fernando", "Alonso"], SAI: ["Carlos", "Sainz"],
    ALB: ["Alex", "Albon"], GAS: ["Pierre", "Gasly"], OCO: ["Esteban", "Ocon"], HUL: ["Nico", "Hulkenberg"], STR: ["Lance", "Stroll"],
    TSU: ["Yuki", "Tsunoda"], LAW: ["Liam", "Lawson"], HAD: ["Isack", "Hadjar"], BEA: ["Oliver", "Bearman"], BOR: ["Gabriel", "Bortoleto"],
    COL: ["Franco", "Colapinto"], LIN: ["Arvid", "Lindblad"], PER: ["Sergio", "Perez", "Checo"], BOT: ["Valtteri", "Bottas"], DOO: ["Jack", "Doohan"] };
  const k = Object.keys(KNOWN).find((x) => code.startsWith(x) || code.endsWith(x) || code.slice(3, 6) === x);
  return k ? KNOWN[k] : [];
}

/**
 * Two people, two microphones: inside one clip the driver's lines and the engineer's lines form two voice clusters.
 * Cluster the lines (2-means on z-scored features); which cluster is the team is decided by the phrasing votes
 * (addressing the driver, "box", "we've got"…). If the voices don't separate clearly, fall back to phrasing per line.
 */
async function diarize(mp3: string, lines: Segment[], who: string[], dir: string): Promise<Segment[]> {
  const text = lines.map((l) => textScore(l.text, who));
  // no clear voice split: store no speaker — the client infers it from the phrasing with the current rules
  const fallback = () => lines;
  if (lines.length < 2) return fallback();
  const F = await Promise.all(lines.map((l) => features(mp3, l.start, l.end, dir)));
  const dims = F[0].length;
  const mean = Array.from({ length: dims }, (_, d) => F.reduce((s, f) => s + f[d], 0) / F.length);
  const sd = Array.from({ length: dims }, (_, d) => Math.sqrt(F.reduce((s, f) => s + (f[d] - mean[d]) ** 2, 0) / F.length) || 1);
  const Z = F.map((f) => f.map((v, d) => (v - mean[d]) / sd[d]));
  const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, d) => s + (v - b[d]) ** 2, 0));
  // init with the farthest pair, then a few Lloyd iterations
  let [i0, i1, best] = [0, 1, -1];
  for (let i = 0; i < Z.length; i++) for (let j = i + 1; j < Z.length; j++) { const d = dist(Z[i], Z[j]); if (d > best) [i0, i1, best] = [i, j, d]; }
  let c = [Z[i0], Z[i1]];
  let lab: number[] = [];
  for (let it = 0; it < 8; it++) {
    lab = Z.map((z) => (dist(z, c[0]) <= dist(z, c[1]) ? 0 : 1));
    c = [0, 1].map((k) => { const m = Z.filter((_, i) => lab[i] === k); return m.length ? Array.from({ length: dims }, (_, d) => m.reduce((s, z) => s + z[d], 0) / m.length) : c[k]; });
  }
  const intra = Z.reduce((s, z, i) => s + dist(z, c[lab[i]]), 0) / Z.length;
  const separated = new Set(lab).size === 2 && dist(c[0], c[1]) > 2 * intra + 0.8;
  if (!separated) return fallback();
  // which voice is the team: the cluster whose lines read most like the pit wall
  const vote = [0, 1].map((k) => lab.reduce((s, l, i) => s + (l === k ? text[i] : 0), 0));
  let team: number;
  if (vote[0] !== vote[1]) team = vote[0] > vote[1] ? 0 : 1;
  else return fallback(); // no phrasing evidence either way: don't guess from audio alone
  return lines.map((l, i) => ({ ...l, speaker: lab[i] === team ? "team" : "driver", spk: "voice" as const }));
}
