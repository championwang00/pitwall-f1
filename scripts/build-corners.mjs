// Builds data/corners/<f1db-circuit-id>.json — corner pins, sector boundaries and (optionally) corner speeds for every
// telemetry track in data/tracks (IA spec §0.9). Run outside live sessions (OpenF1's free API returns 401 while a
// session is on; MultiViewer always answers). Usage:
//   node --no-warnings scripts/build-corners.mjs            # all circuits, skips ones already built with speeds
//   node --no-warnings scripts/build-corners.mjs spa-francorchamps --force
// Sources: corners = MultiViewer public circuit API (same x/y frame as OpenF1 location, verified ≤ 8 m off our polylines);
//          sectors = the telemetry lap's duration_sector_1/2 (OpenF1 /laps); speeds = OpenF1 /car_data for that lap;
//          circuits without MultiViewer data use `manual.corners` from content/corners.json (approx: true).
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data/corners");
const CACHE = path.join(ROOT, ".cache/multiviewer");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

/** F1DB circuit id -> OpenF1 / MultiViewer circuit_key (from OpenF1 /v1/meetings 2023–2026). Sepang = 12 and Madring = 153
 *  exist in OpenF1 but MultiViewer has no circuit for them yet (404) — they fall back to content/corners.json `manual`. */
const KEY = {
  silverstone: 2, hungaroring: 4, imola: 6, "spa-francorchamps": 7, austin: 9, melbourne: 10, sepang: 12, interlagos: 14,
  catalunya: 15, spielberg: 19, monaco: 22, montreal: 23, monza: 39, suzuka: 46, shanghai: 49, zandvoort: 55,
  "marina-bay": 61, bahrain: 63, "mexico-city": 65, "yas-marina": 70, baku: 144, jeddah: 149, lusail: 150, miami: 151,
  "las-vegas": 152, madring: 153,
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.find((a) => !a.startsWith("--"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, { tolerate = [] } = {}) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "user-agent": "pitwall-f1-demo/0.1" } });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (tolerate.includes(r.status)) { const e = new Error(`${r.status} ${url}`); e.status = r.status; throw e; }
    await sleep(1200 * (i + 1));
  }
  throw new Error("failed " + url);
}

async function multiviewer(key, year) {
  const file = path.join(CACHE, `${key}.json`);
  if (fs.existsSync(file) && !force) return JSON.parse(fs.readFileSync(file, "utf8"));
  const d = await getJSON(`https://api.multiviewer.app/api/v1/circuits/${key}/${year}`);
  if (d) fs.writeFileSync(file, JSON.stringify(d));
  return d;
}

/** Cumulative arc length of the closed polyline (xy only). */
function cum(pts) {
  const c = new Float64Array(pts.length + 1);
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    c[i] = c[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return c;
}

/** Nearest point on the polyline → { t: distance fraction, f: time fraction (samples are time-uniform), d: distance }. */
function snap(pts, c, x, y) {
  let best = { d: Infinity, i: 0, u: 0 };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
    const d = Math.hypot(a[0] + u * dx - x, a[1] + u * dy - y);
    if (d < best.d) best = { d, i, u };
  }
  const { i, u, d } = best;
  return { t: (c[i] + u * (c[i + 1] - c[i])) / c[pts.length], f: (i + u) / pts.length, d };
}

/** Time fraction → distance fraction (same mapping as components/live/trackMath.ts timeToDistance). */
function timeToDist(c, n, f) {
  const x = (((f % 1) + 1) % 1) * n, i = Math.floor(x), r = x - i;
  return (c[i] + (c[Math.min(n, i + 1)] - c[i]) * r) / c[n];
}

const db = new DatabaseSync(path.join(ROOT, "data/f1db.db"), { readOnly: true });
const layoutOf = db.prepare("select circuit_layout_id l from race where circuit_id = ? and year = ? and circuit_layout_id is not null order by round limit 1");
const content = JSON.parse(fs.readFileSync(path.join(ROOT, "content/corners.json"), "utf8")).circuits;

let openf1Blocked = false;
for (const file of fs.readdirSync(path.join(ROOT, "data/tracks")).sort()) {
  const id = file.replace(".json", "");
  if (only && only !== id) continue;
  const outFile = path.join(OUT, file);
  const prev = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : null;
  if (prev && !force && prev.sectors && prev.corners.every((k) => k.speed != null)) { console.log(id, "complete, skip"); continue; }
  const track = JSON.parse(fs.readFileSync(path.join(ROOT, "data/tracks", file), "utf8"));
  const pts = track.points, n = pts.length, c = cum(pts);
  const layout = layoutOf.get(id, track.year)?.l ?? null;
  const key = KEY[id] ?? null;

  // ── corners ──
  let corners = [], source = null, mvYear = null;
  const mv = key ? await multiviewer(key, track.year) : null;
  if (mv?.corners?.length) {
    source = "multiviewer"; mvYear = mv.year;
    corners = mv.corners.map((k) => {
      const s = snap(pts, c, k.trackPosition.x, k.trackPosition.y);
      return { n: String(k.number) + (k.letter ?? ""), t: +s.t.toFixed(4), f: +s.f.toFixed(4), x: Math.round(k.trackPosition.x), y: Math.round(k.trackPosition.y), angle: +k.angle.toFixed(1), off: Math.round(s.d), speed: null, gear: null };
    });
    corners.sort((a, b) => a.t - b.t);
    const worst = Math.max(...corners.map((k) => k.off));
    if (worst > 150) console.warn(id, `WARNING: a MultiViewer corner sits ${worst / 10} m off our polyline — frame or layout mismatch?`);
  } else if (content[id]?.manual?.corners?.length) {
    source = "manual";
    corners = content[id].manual.corners.map((k) => {
      // distance fraction → sample index for the time fraction
      let i = 0; while (i < n && c[i + 1] / c[n] < k.t) i++;
      const u = (k.t * c[n] - c[i]) / ((c[i + 1] - c[i]) || 1);
      return { n: String(k.n), t: k.t, f: +((i + u) / n).toFixed(4), x: null, y: null, angle: null, off: null, speed: null, gear: null, approx: true };
    });
  } else {
    console.log(id, "no corner source (MultiViewer 404, no manual) — sectors only");
  }

  // ── sectors + speeds (OpenF1; tolerate 401/403 during live sessions) ──
  let sectors = prev?.sectors ?? null;
  if (!openf1Blocked) {
    try {
      const laps = await getJSON(`https://api.openf1.org/v1/laps?session_key=${track.session_key}&driver_number=${track.driver_number}&lap_number=${track.lap_number}`, { tolerate: [401, 403, 429] });
      const lap = laps?.[0];
      if (lap?.duration_sector_1 && lap?.duration_sector_2 && lap?.lap_duration) {
        const s1 = lap.duration_sector_1 / lap.lap_duration, s2 = (lap.duration_sector_1 + lap.duration_sector_2) / lap.lap_duration;
        sectors = [+timeToDist(c, n, s1).toFixed(4), +timeToDist(c, n, s2).toFixed(4)];
      }
      if (corners.length) {
        const t0 = new Date(lap?.date_start ?? track.date_start ?? 0);
        if (+t0) {
          const t1 = new Date(t0.getTime() + track.lap_duration * 1000);
          await sleep(300);
          const car = await getJSON(`https://api.openf1.org/v1/car_data?session_key=${track.session_key}&driver_number=${track.driver_number}&date>${t0.toISOString()}&date<${t1.toISOString()}`, { tolerate: [401, 403, 429] });
          if (Array.isArray(car) && car.length > 50) {
            const rows = car.map((r) => ({ at: (Date.parse(r.date) - t0.getTime()) / 1000 / track.lap_duration, speed: r.speed, gear: r.n_gear }));
            for (const k of corners) {
              const win = rows.filter((r) => Math.abs(r.at - k.f) < 1.5 / track.lap_duration);
              if (!win.length) continue;
              const m = win.reduce((a, b) => (b.speed < a.speed ? b : a));
              k.speed = m.speed; k.gear = m.gear;
            }
          }
        }
      }
    } catch (e) {
      if ([401, 403, 429].includes(e.status)) { openf1Blocked = true; console.warn(`OpenF1 ${e.status}: live session or rate limit — sectors/speeds left as before, rerun later`); }
      else throw e;
    }
  }

  const out = {
    circuit: id, layout, source, circuitKey: key, mvYear, lapYear: track.year, session_key: track.session_key,
    driver_number: track.driver_number, lap_number: track.lap_number, lap_duration: track.lap_duration,
    corners, sectors, built: new Date().toISOString().slice(0, 10),
  };
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(id, `layout ${layout} · ${source ?? "no corners"} ${corners.length} corners · sectors ${sectors ? sectors.join("/") : "—"} · speeds ${corners.filter((k) => k.speed != null).length}`);
  await sleep(250);
}
