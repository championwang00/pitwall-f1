// One SPARQL query: every constructor's English Wikipedia article → Wikidata item → logo (P154).
// Writes data/team-logos.json (id → Commons Special:FilePath URL or null). Run: node scripts/build-team-logos.mjs
import fs from "node:fs";
const wiki = JSON.parse(fs.readFileSync("data/wiki.json", "utf8")).constructors;
const entries = Object.entries(wiki);
const values = entries.map(([, t]) => `<https://en.wikipedia.org/wiki/${encodeURI(t).replace(/'/g, "%27")}>`).join(" ");
const q = `SELECT ?article ?logo WHERE { VALUES ?article { ${values} } ?article schema:about ?item . ?item wdt:P154 ?logo . }`;
const r = await fetch("https://query.wikidata.org/sparql", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/sparql-results+json", "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" },
  body: "query=" + encodeURIComponent(q),
});
if (!r.ok) { console.error("SPARQL", r.status, (await r.text()).slice(0, 300)); process.exit(1); }
const j = await r.json();
const byTitle = new Map();
for (const b of j.results.bindings) {
  const title = decodeURIComponent(b.article.value.split("/wiki/")[1]);
  if (!byTitle.has(title)) byTitle.set(title, b.logo.value.replace(/^http:/, "https:") + "?width=160");
}
const out = Object.fromEntries(entries.map(([id, t]) => [id, byTitle.get(decodeURIComponent(t)) ?? byTitle.get(t) ?? null]));
fs.writeFileSync("data/team-logos.json", JSON.stringify(out));
console.log("logos", Object.values(out).filter(Boolean).length, "/", entries.length);
console.log(Object.entries(out).filter(([, v]) => v).slice(0, 12).map(([k]) => k).join(" "));
