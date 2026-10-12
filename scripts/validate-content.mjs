// Cross-checks every curated moment against F1DB. Usage: node --no-warnings scripts/validate-content.mjs
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/f1db.db", { readOnly: true });
const race = db.prepare("select id from race where year = ? and (grand_prix_id = ? or ? is null) and (circuit_id = ? or ? is null)");
const ran = db.prepare("select 1 from race_result where race_id = ? and driver_id = ?");
const teamRan = db.prepare("select 1 from race_result where race_id = ? and constructor_id = ?");
let n = 0, bad = 0, noSource = 0;
const check = (file, kind) => {
  const j = JSON.parse(fs.readFileSync(`content/${file}`, "utf8"));
  for (const [id, v] of Object.entries(j)) {
    const items = [...(v.highlights || []), ...(v.moments || [])];
    for (const m of items) {
      n++;
      if (!m.sources?.length || !m.sources.every((s) => /^https?:\/\//.test(s.url))) { noSource++; console.log("NO SOURCE", file, id, m.year, m.title); }
      if (m.gp == null && m.circuit == null) continue;
      const r = race.get(m.year, m.gp, m.gp, m.circuit, m.circuit);
      if (!r) { bad++; console.log("NO RACE", file, id, m.year, m.gp, m.circuit, m.title); continue; }
      if (kind === "driver" && !ran.get(r.id, id)) console.log("note: driver not classified in that race", id, m.year, m.gp, "—", m.title);
      if (kind === "team" && !teamRan.get(r.id, id)) console.log("note: team not in that race", id, m.year, m.gp, "—", m.title);
    }
    for (const a of v.anecdotes || []) { n++; if (!a.sources?.length) { noSource++; console.log("NO SOURCE", file, id, a.title); } }
  }
};
for (const f of ["drivers.a.json", "drivers.b.json", "drivers.legends.json"]) check(f, "driver");
check("teams.json", "team");
check("circuits.json", "circuit");
// commentator notes: { id: [Note] }
const topics = new Set();
const dimensions = new Set(["performance", "personality", "relationships", "career", "visual", "tech", "weekend", "heritage"]);
const entityExists = (table, id) => !!db.prepare(`select 1 from ${table} where id=?`).get(id);
const raceExists = (ref) => !!db.prepare("select 1 from race where year=? and round=?").get(ref.year, ref.round);
for (const f of ["notes.circuits.json", "notes.drivers.json", "notes.teams.json", "notes.seasons.json", "notes.races.json", "notes.editorial.json"]) {
  if (!fs.existsSync(`content/${f}`)) { console.log("missing", f); continue; }
  const j = JSON.parse(fs.readFileSync(`content/${f}`, "utf8"));
  let k = 0;
  const groups = Array.isArray(j) ? [["editorial", j]] : Object.entries(j);
  for (const [id, arr] of groups) for (const m of arr) {
    n++; k++;
    if (!m.sources?.length || !m.sources.every((s) => /^https?:\/\//.test(s.url))) { noSource++; console.log("NO SOURCE", f, id, m.title); }
    if (m.year && (m.gp || m.circuit) && !race.get(m.year, m.gp ?? null, m.gp ?? null, m.circuit ?? null, m.circuit ?? null)) { bad++; console.log("NO RACE", f, id, m.year, m.gp, m.circuit, m.title); }
    const invalid = (reason) => { bad++; console.log("INVALID NOTE", f, id, m.title, reason); };
    if (m.topic) { if (topics.has(m.topic)) invalid("duplicate topic"); topics.add(m.topic); }
    if ((f === "notes.editorial.json" || f === "notes.races.json") && (!m.topic || !m.dimension || !m.verifiedAt)) invalid("new notes require topic, dimension, and verification date");
    if (m.dimension && !dimensions.has(m.dimension)) invalid("unknown dimension");
    for (const key of ["publishedAt", "verifiedAt", "eventDate", "validFrom", "validUntil"]) {
      if (m[key] && (!/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(m[key]) || !Number.isFinite(Date.parse(m[key])))) invalid(`invalid ${key}`);
    }
    if (m.validFrom && m.validUntil && Date.parse(m.validFrom) > Date.parse(m.validUntil)) invalid("inverted validity window");
    if (m.eventDate && m.year && Number(m.eventDate.slice(0, 4)) !== m.year) invalid("event year differs from note year");
    if (m.temporal && !["evergreen", "event", "preview", "snapshot"].includes(m.temporal)) invalid("unknown temporal mode");
    if (m.status && !["confirmed", "statement", "analysis"].includes(m.status)) invalid("unknown status");
    if (m.temporal === "preview" && (!m.race || !m.validUntil)) invalid("preview requires target race and expiry");
    for (const key of ["race", "asOfRace"]) if (m[key] && !raceExists(m[key])) invalid(`unknown ${key}`);
    for (const [key, table] of [["drivers", "driver"], ["teams", "constructor"], ["circuits", "circuit"]])
      for (const ref of m.related?.[key] ?? []) if (!entityExists(table, ref)) invalid(`unknown ${key}: ${ref}`);
    for (const ref of m.related?.seasons ?? []) if (!db.prepare("select 1 from season where year=?").get(ref)) invalid(`unknown season: ${ref}`);
    for (const ref of m.related?.races ?? []) { const [year, round] = ref.split("/").map(Number); if (!raceExists({ year, round })) invalid(`unknown related race: ${ref}`); }
    if (f === "notes.races.json") { const [year, round] = id.split("/").map(Number); if (!raceExists({ year, round })) invalid("unknown race key"); }
  }
  console.log(f, Object.keys(j).length, "keys,", k, "notes");
}
const cars = JSON.parse(fs.readFileSync("content/cars.json", "utf8"));
for (const id of Object.keys(cars)) { n++; if (!db.prepare("select 1 from chassis where id = ?").get(id)) { bad++; console.log("NO CHASSIS", id); } if (!cars[id].sources?.length) noSource++; }
console.log(`checked ${n} items · ${bad} broken references · ${noSource} without sources`);
if (bad || noSource) process.exitCode = 1;
