// Builds data/wiki.json: maps F1DB ids -> English Wikipedia titles, using Jolpica (Ergast) URLs.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
const db = new DatabaseSync("data/f1db.db", { readOnly: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pageAll(path, key) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const url = `https://api.jolpi.ca/ergast/f1/${path}.json?limit=100&offset=${offset}`;
    let j;
    for (let tries = 0; tries < 5; tries++) {
      const r = await fetch(url);
      if (r.ok) { j = await r.json(); break; }
      await sleep(2000 * (tries + 1));
    }
    const table = Object.values(j.MRData).find((v) => v && typeof v === "object" && v[key]);
    const items = table[key];
    out.push(...items);
    if (offset + 100 >= +j.MRData.total) break;
    await sleep(400);
  }
  return out;
}
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const title = (url) => decodeURIComponent((url || "").split("/wiki/")[1] || "") || null;

const map = { drivers: {}, constructors: {}, circuits: {}, races: {}, ergast: { drivers: {}, constructors: {}, circuits: {} } };

const jd = await pageAll("drivers", "Drivers");
const fd = db.prepare("select id, first_name, last_name, name, date_of_birth from driver").all();
for (const d of fd) {
  let m = jd.find((x) => x.dateOfBirth && x.dateOfBirth === d.date_of_birth && norm(x.familyName) === norm(d.last_name));
  if (!m) m = jd.find((x) => norm(x.givenName + x.familyName) === norm(d.first_name + d.last_name));
  if (!m) m = jd.find((x) => x.dateOfBirth && x.dateOfBirth === d.date_of_birth && norm(x.givenName) === norm(d.first_name));
  if (m) { map.drivers[d.id] = title(m.url); map.ergast.drivers[m.driverId] = d.id; }
}
console.log("drivers", Object.keys(map.drivers).length, "/", fd.length);

const jc = await pageAll("constructors", "Constructors");
const fc = db.prepare("select id, name, full_name from constructor").all();
for (const c of fc) {
  const m = jc.find((x) => norm(x.name) === norm(c.name)) || jc.find((x) => norm(x.name) === norm(c.full_name));
  if (m) { map.constructors[c.id] = title(m.url); map.ergast.constructors[m.constructorId] = c.id; }
}
console.log("constructors", Object.keys(map.constructors).length, "/", fc.length);

const jci = await pageAll("circuits", "Circuits");
const fci = db.prepare("select id, name, latitude, longitude from circuit").all();
for (const c of fci) {
  let best = null, bd = 1e9;
  for (const x of jci) {
    const d = Math.hypot(+x.Location.lat - c.latitude, +x.Location.long - c.longitude);
    if (d < bd) { bd = d; best = x; }
  }
  if (best && bd < 0.06) { map.circuits[c.id] = title(best.url); map.ergast.circuits[best.circuitId] = c.id; }
}
console.log("circuits", Object.keys(map.circuits).length, "/", fci.length);

const jr = await pageAll("races", "Races");
for (const r of jr) map.races[`${r.season}-${r.round}`] = title(r.url);
console.log("races", Object.keys(map.races).length);

fs.writeFileSync("data/wiki.json", JSON.stringify(map));
console.log("written data/wiki.json");
