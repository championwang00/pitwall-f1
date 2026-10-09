// Fill missing logos for well-known historic constructors via Commons file search ("<name> logo"), slowly (rate limits).
import fs from "node:fs";
const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
const db = new DatabaseSync("data/f1db.db");
const out = JSON.parse(fs.readFileSync("data/team-logos.json", "utf8"));
const QUERY = {
  lotus: "Team Lotus logo", brabham: "Brabham logo", tyrrell: "Tyrrell Racing logo", benetton: "Benetton Formula logo", jordan: "Jordan Grand Prix logo",
  renault: "Renault F1 logo", honda: "Honda Racing F1 logo", toyota: "Toyota Racing logo", brawn: "Brawn GP logo", minardi: "Minardi logo",
  jaguar: "Jaguar Racing logo", bar: "British American Racing logo", march: "March Engineering logo", cooper: "Cooper Car Company logo",
  brm: "BRM logo", vanwall: "Vanwall logo", matra: "Matra logo", arrows: "Arrows Grand Prix logo", "force-india": "Force India logo",
  "toro-rosso": "Scuderia Toro Rosso logo", alphatauri: "Scuderia AlphaTauri logo", "alfa-romeo": "Alfa Romeo Racing logo", "lotus-f1": "Lotus F1 Team logo",
  virgin: "Virgin Racing logo", marussia: "Marussia F1 logo", "super-aguri": "Super Aguri F1 logo", spyker: "Spyker F1 logo", hesketh: "Hesketh Racing logo",
  wolf: "Walter Wolf Racing logo", shadow: "Shadow Racing Cars logo", mercedes: "Mercedes AMG Petronas F1 logo", "red-bull": "Red Bull Racing logo",
  ferrari: "Scuderia Ferrari logo", mclaren: "McLaren logo", williams: "Williams Racing logo", sauber: "Sauber logo", haas: "Haas F1 Team logo",
  "aston-martin": "Aston Martin F1 logo", alpine: "Alpine F1 Team logo", "racing-bulls": "Racing Bulls logo", kick: "Kick Sauber logo",
};
const ids = new Set(db.prepare("select id from constructor").all().map((r) => r.id));
const UA = { "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [id, q] of Object.entries(QUERY)) {
  if (!ids.has(id) || out[id]) continue;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=10&srsearch=${encodeURIComponent(q)}`;
  let j = null;
  for (let a = 0; a < 3; a++) {
    const r = await fetch(url, { headers: UA });
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    j = await r.json(); break;
  }
  const hits = (j?.query?.search ?? []).map((h) => h.title).filter((t) => /logo/i.test(t) && /\.(svg|png)$/i.test(t) && !/sponsor|livery|car|helmet/i.test(t));
  const pick = hits.find((t) => /\.svg$/i.test(t)) ?? hits[0];
  out[id] = pick ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(pick.replace(/^File:/, "").replace(/ /g, "_"))}?width=160` : null;
  console.log(id.padEnd(14), pick ?? "—");
  fs.writeFileSync("data/team-logos.json", JSON.stringify(out));
  await sleep(1500);
}
