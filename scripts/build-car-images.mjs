// Prebuild the year-aware asset manifests so pages never wait on the network (lib/assets-year.ts):
//   data/car-images.json      off:<team>@<year> (official F1 car art 2019–2025) + ch:<chassis> (evidence-checked photos)
//   data/team-logos-year.json <team> → Wikidata logo statements with start/end years
//   data/period-faces.json    f2:<driver>:<year> (only with --faces=FROM-TO; Commons is slow)
// Reuses the app's own resolvers (no copied logic) through the TS loader:
//   node --no-warnings --experimental-strip-types --import ./scripts/lib/ts-register.mjs scripts/build-car-images.mjs [--from=1990] [--faces=2019-2025] [--force] [--report]
import { all } from "../lib/db.ts";
import { chassisPhoto, probeOfficial, carImageKnown, teamYearKnown, knownChassisPhoto } from "../lib/carImage.ts";
import { logoSpans, teamLogoAtKnown, probeLegacyLogo, buildLogoCatalog } from "../lib/teamLogo.ts";
import fsx from "node:fs";
import { periodFace, periodFaceKnown } from "../lib/periodFace.ts";
import { pausedUntil } from "../lib/wmGate.ts";
/** Wikimedia paused after a 429 (lib/wmGate): wait it out instead of racing through items that would all fail */
const waitGate = async () => { let w = false; while (pausedUntil() > Date.now()) { if (!w) { log("wikimedia paused until", new Date(pausedUntil()).toTimeString().slice(0, 8)); w = true; } await new Promise((r) => setTimeout(r, 5000)); } };
/** run `fn` until its result is cached (`known()` !== undefined) or 3 tries */
const settle = async (fn, known) => { for (let i = 0; i < 3; i++) { await waitGate(); await fn().catch(() => null); if (known() !== undefined) return; } };

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}`)); return a ? (a.includes("=") ? a.split("=")[1] : true) : d; };
const FROM = +arg("from", 1990);
const report = arg("report", false);
const facesArg = arg("faces", null);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

// title-winning chassis (constructors' champions + the champion driver's car), any era
const titleChassis = new Set(all(`select sec.chassis_id id from season_constructor_standing s join season_entrant_chassis sec on sec.year = s.year and sec.constructor_id = s.constructor_id where s.championship_won = 1
  union select sec.chassis_id from season_driver_standing s join season_entrant_driver sed on sed.year = s.year and sed.driver_id = s.driver_id and sed.test_driver = 0
  join season_entrant_chassis sec on sec.year = sed.year and sec.entrant_id = sed.entrant_id and sec.constructor_id = sed.constructor_id where s.championship_won = 1`).map((r) => r.id));
const chassis = all(`select chassis_id id, min(year) y0, max(year) y1, constructor_id t from season_entrant_chassis group by chassis_id order by max(year) desc`)
  .filter((c) => c.y1 >= FROM || titleChassis.has(c.id));
const teamYears = all(`select distinct constructor_id t, year y from season_entrant_constructor where year >= ? order by year desc`, FROM);

async function logoManifest() {
  const fs = await import("node:fs");
  const wiki = JSON.parse(fs.readFileSync("data/wiki.json", "utf8")).constructors;
  const entries = Object.entries(wiki);
  const values = entries.map(([, t]) => `<https://en.wikipedia.org/wiki/${encodeURI(t.replace(/ /g, "_")).replace(/'/g, "%27")}>`).join(" ");
  const sparql = `SELECT ?article ?logo ?start ?end ?rank WHERE { VALUES ?article { ${values} } ?article schema:about ?item . ?item p:P154 ?st . ?st ps:P154 ?logo ; wikibase:rank ?rank .
    OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end } }`;
  const r = await fetch("https://query.wikidata.org/sparql", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/sparql-results+json", "user-agent": "PITWALL-demo/1.0 (local F1 encyclopedia demo)" }, body: "query=" + encodeURIComponent(sparql) });
  if (!r.ok) { log("SPARQL", r.status); return; }
  const j = await r.json();
  const byTitle = new Map();
  for (const b of j.results.bindings) {
    if (/Deprecated/.test(b.rank?.value ?? "")) continue;
    const title = decodeURIComponent(b.article.value.split("/wiki/")[1]).replace(/_/g, " ");
    const file = decodeURIComponent(b.logo.value.split("/Special:FilePath/")[1] ?? "").replace(/_/g, " ");
    const y = (v) => (v ? +/^-?(\d{4})/.exec(v.value)?.[1] || null : null);
    if (!file) continue;
    byTitle.set(title, [...(byTitle.get(title) ?? []), { file, from: y(b.start), to: y(b.end) }]);
  }
  const FILE = "data/team-logos-year.json";
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {}
  for (const [id, t] of entries) { const v = byTitle.get(t.replace(/_/g, " ")); cur[id] = v ?? cur[id] ?? []; }
  fs.writeFileSync(FILE, JSON.stringify(cur));
  log("logo manifest", entries.length, "teams;", Object.values(cur).filter((v) => Array.isArray(v) && v.some((x) => x.from || x.to)).length, "with dated logos");
}

if (arg("logos", false)) {
  await logoManifest();
  const cat = () => { try { return JSON.parse(fsx.readFileSync("data/team-logos-year.json", "utf8")); } catch { return {}; } };
  for (const t of [...new Set(teamYears.map((r) => r.t))]) { if (cat()[`cat:${t}`] && !arg("force", false)) continue; try { await buildLogoCatalog(t); log("logo catalog", t, cat()[`cat:${t}`]?.length ?? 0); } catch (e) { log("logo", t, String(e)); } }
  for (const r of teamYears) if (r.y >= 2019 && r.y <= 2024) await probeLegacyLogo(r.t, r.y); }
if (!report && !arg("logos", false)) {
  // 1. official F1 car art 2019–2025 (fast: F1 CDN)
  const offTeams = [...new Set(all("select distinct constructor_id t from season_entrant_constructor where year between 2019 and 2025").map((r) => r.t))];
  for (const t of offTeams) await probeOfficial(t);
  log("official probed", offTeams.length, "teams");
  // 2. logos with their validity years: ONE Wikidata SPARQL query (P154 statements + P580/P582 qualifiers)
  if (!arg("skip-logos", false)) await logoManifest();
  const teams = [...new Set(teamYears.map((r) => r.t))];
  const ycat = () => { try { return JSON.parse(fsx.readFileSync("data/team-logos-year.json", "utf8")); } catch { return {}; } };
  for (const t of arg("skip-logos", false) ? [] : teams) { if (ycat()[`cat:${t}`] && !arg("force", false)) continue; await settle(() => buildLogoCatalog(t), () => ycat()[`cat:${t}`]); }
  for (const r of teamYears) if (r.y >= 2019 && r.y <= 2024) await probeLegacyLogo(r.t, r.y);
  log("logo spans", teams.length, "teams");
  // 3. chassis photos (Wikipedia + Commons, throttled)
  let n = 0;
  for (const c of arg("skip-chassis", false) ? [] : chassis) {
    if (carImageKnown(c.id).exact && carImageKnown(c.id).kind === "official") continue;
    if (knownChassisPhoto(c.id) !== undefined && !arg("force", false)) continue;
    await settle(() => chassisPhoto(c.id), () => knownChassisPhoto(c.id));
    const r = knownChassisPhoto(c.id);
    if (++n % 20 === 0) log(n, "chassis looked up; last", c.id, r?.d === c.id ? "exact" : r ? "family" : "none");
  }
  log("chassis done", n);
  // 4. driver photos for a range of seasons (optional)
  if (facesArg || arg("seasons", null) || arg("champions", false)) {
    // --faces=FROM-TO (every driver of those seasons) · --seasons=1976,1988 · --champions (every champion's title years)
    const [a, b] = facesArg ? String(facesArg).split("-").map(Number) : [0, 0];
    const extra = String(arg("seasons", "") || "").split(",").filter(Boolean).map(Number);
    const dy = [
      ...all(`select distinct sed.driver_id d, sed.year y from season_entrant_driver sed where sed.test_driver = 0 and ((sed.year between ? and ?) or sed.year in (${extra.map(() => "?").join(",") || "0"})) order by sed.year desc`, a, b || a, ...extra),
      ...(arg("champions", false) ? all("select driver_id d, year y from season_driver_standing where championship_won = 1 order by year desc") : []),
    ];
    let k = 0;
    for (const r of dy) { if (periodFaceKnown(r.d, r.y) !== undefined) continue; await settle(() => periodFace(r.d, r.y), () => periodFaceKnown(r.d, r.y)); if (++k % 25 === 0) log(k, "faces"); }
    log("faces done", k);
  }
}

// coverage report
const pct = (a, b) => `${a}/${b} (${b ? ((100 * a) / b).toFixed(1) : 0}%)`;
const ty = teamYears.map((r) => teamYearKnown(r.t, r.y));
const byEra = {};
for (const [i, r] of teamYears.entries()) { const e = `${Math.floor(r.y / 10) * 10}s`; byEra[e] ??= [0, 0]; byEra[e][1]++; if (ty[i].exact) byEra[e][0]++; }
const ch = chassis.map((c) => carImageKnown(c.id));
const logos = teamYears.map((r) => teamLogoAtKnown(r.t, r.y));
const faces = all(`select distinct sed.driver_id d, sed.year y from season_entrant_driver sed where sed.test_driver = 0 and sed.year >= ?`, FROM).map((r) => periodFaceKnown(r.d, r.y));
console.log(`\nCoverage (seasons ≥ ${FROM} + all title-winning cars):`);
console.log("  cars by team×year (exact):", pct(ty.filter((p) => p.exact).length, ty.length), "  official:", ty.filter((p) => p.kind === "official").length);
for (const [e, [a, b]] of Object.entries(byEra).sort()) console.log(`    ${e}: ${pct(a, b)}`);
console.log("  chassis (exact):", pct(ch.filter((p) => p.exact).length, ch.length), "  title-winning:", pct(chassis.filter((c, i) => titleChassis.has(c.id) && ch[i].exact).length, chassis.filter((c) => titleChassis.has(c.id)).length));
console.log("  logos by team×year (year-exact):", pct(logos.filter((p) => p.exact).length, logos.length), "  any logo:", pct(logos.filter((p) => p.url).length, logos.length),
  "  high-res (catalog, not F1 96 px):", pct(logos.filter((p) => p.url && !p.small).length, logos.length), "  vector SVG:", pct(logos.filter((p) => p.svg).length, logos.length));
console.log("  driver photos by driver×year (exact, of looked-up):", pct(faces.filter((f) => f).length, faces.filter((f) => f !== undefined).length), "  looked up:", pct(faces.filter((f) => f !== undefined).length, faces.length));
process.exit(0);
