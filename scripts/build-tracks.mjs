// Extracts one clean flying lap (x,y,z) per circuit from OpenF1 location telemetry -> data/tracks/<f1db-circuit-id>.json
import fs from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function j(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url);
    if (r.ok) return r.json();
    if (r.status === 404) return [];
    await sleep(1500 * (i + 1));
  }
  throw new Error("failed " + url);
}
// OpenF1 circuit_short_name -> F1DB circuit id
const MAP = {
  Melbourne: "melbourne", Shanghai: "shanghai", Suzuka: "suzuka", Miami: "miami", Montreal: "montreal",
  "Monte Carlo": "monaco", Catalunya: "catalunya", Spielberg: "spielberg", Silverstone: "silverstone",
  "Spa-Francorchamps": "spa-francorchamps", Hungaroring: "hungaroring", Zandvoort: "zandvoort", Monza: "monza",
  Madring: "madring", Baku: "baku", "Kuala Lumpur": "sepang", Singapore: "marina-bay", Austin: "austin",
  "Mexico City": "mexico-city", Interlagos: "interlagos", "Las Vegas": "las-vegas", Lusail: "lusail",
  "Yas Marina Circuit": "yas-marina", Sakhir: "bahrain", Jeddah: "jeddah", Imola: "imola",
};
const only = process.argv[2];
const sessions = [];
for (const y of [2026, 2025, 2024, 2023]) sessions.push(...(await j(`https://api.openf1.org/v1/sessions?year=${y}&session_type=Qualifying`)));
sessions.sort((a, b) => b.date_start.localeCompare(a.date_start));
const done = new Set(fs.readdirSync("data/tracks").map((f) => f.replace(".json", "")));
for (const [short, cid] of Object.entries(MAP)) {
  if (only && only !== cid) continue;
  if (done.has(cid) && !only) continue;
  const cands = sessions.filter((s) => s.circuit_short_name === short && new Date(s.date_end) < new Date() && s.session_name === "Qualifying");
  let ok = false;
  for (const s of cands.slice(0, 3)) {
    const laps = (await j(`https://api.openf1.org/v1/laps?session_key=${s.session_key}`)).filter((l) => l.lap_duration && !l.is_pit_out_lap && l.date_start);
    laps.sort((a, b) => a.lap_duration - b.lap_duration);
    const best = laps[0];
    if (!best) continue;
    const t0 = new Date(best.date_start);
    const t1 = new Date(t0.getTime() + best.lap_duration * 1000);
    const loc = await j(`https://api.openf1.org/v1/location?session_key=${s.session_key}&driver_number=${best.driver_number}&date>${t0.toISOString()}&date<${t1.toISOString()}`);
    const pts = loc.filter((p) => p.x || p.y).map((p) => [p.x, p.y, p.z]);
    if (pts.length < 80) { await sleep(400); continue; }
    fs.writeFileSync(`data/tracks/${cid}.json`, JSON.stringify({ circuit: cid, session_key: s.session_key, year: s.year, driver_number: best.driver_number, lap_number: best.lap_number, lap_duration: best.lap_duration, points: pts }));
    console.log(cid, s.year, s.session_key, "#" + best.driver_number, best.lap_duration, pts.length, "pts");
    ok = true;
    break;
  }
  if (!ok) console.log(cid, "no data");
  await sleep(300);
}
