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
for (const f of ["notes.circuits.json", "notes.drivers.json", "notes.teams.json", "notes.seasons.json"]) {
  if (!fs.existsSync(`content/${f}`)) { console.log("missing", f); continue; }
  const j = JSON.parse(fs.readFileSync(`content/${f}`, "utf8"));
  let k = 0;
  for (const [id, arr] of Object.entries(j)) for (const m of arr) {
    n++; k++;
    if (!m.sources?.length || !m.sources.every((s) => /^https?:\/\//.test(s.url))) { noSource++; console.log("NO SOURCE", f, id, m.title); }
    if (m.year && (m.gp || m.circuit) && !race.get(m.year, m.gp ?? null, m.gp ?? null, m.circuit ?? null, m.circuit ?? null)) { bad++; console.log("NO RACE", f, id, m.year, m.gp, m.circuit, m.title); }
  }
  console.log(f, Object.keys(j).length, "keys,", k, "notes");
}
const cars = JSON.parse(fs.readFileSync("content/cars.json", "utf8"));
for (const id of Object.keys(cars)) { n++; if (!db.prepare("select 1 from chassis where id = ?").get(id)) { bad++; console.log("NO CHASSIS", id); } if (!cars[id].sources?.length) noSource++; }
console.log(`checked ${n} items · ${bad} broken references · ${noSource} without sources`);
