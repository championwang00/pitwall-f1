// Image audit (picture rule, lib/assets-year.ts): over a sample of pages, list every hero / card picture of a driver,
// team, car or circuit — object, context year, resolved URL, status (exact / representative+caption / placeholder) —
// and flag suspicious cases:
//   year≠      a file / official folder year differs from the context year (exact pictures only)
//   other-car  the file name names a different chassis than the one the picture claims to show
//   other-who  a driver picture whose file name names another driver
//   2026-art   official 2026 art shown for an object in another season
//   no-caption a representative or placeholder picture without a caption
// Usage: node scripts/image-audit.mjs [--base=http://localhost:3210] [--json=out.json] [--quiet]
// Exit code 1 when suspicious cases remain.
import fs from "node:fs";
import path from "node:path";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}`)); return a ? (a.includes("=") ? a.split("=").slice(1).join("=") : true) : d; };
const BASE = arg("base", "http://localhost:3210");
const quiet = arg("quiet", false);
const emit = process.emitWarning; process.emitWarning = (w, ...r) => (String(w).includes("SQLite") ? undefined : emit.call(process, w, ...r));
const { DatabaseSync } = await import("node:sqlite");
const db = new DatabaseSync(path.join(process.cwd(), "data/f1db.db"), { readOnly: true });
const q = (sql, ...p) => db.prepare(sql).all(...p);

const PAGES = [
  ...["lotus", "mclaren", "williams", "ferrari", "tyrrell", "brabham"].map((t) => `/teams/${t}`),
  "/teams/lotus?year=1994", "/teams/lotus?year=1978", "/teams/mclaren?year=2008", "/teams/mclaren?year=1988", "/teams/williams?year=1992",
  "/teams/williams?year=2014", "/teams/ferrari?year=2004", "/teams/ferrari?year=1975", "/teams/tyrrell?year=1971", "/teams/brabham?year=1983",
  "/teams/mercedes?year=2025", "/teams/mercedes?year=2024",
  ...["alfa-romeo-158", "mercedes-w196", "lotus-25", "lotus-72d", "tyrrell-003", "mclaren-mp4-4", "williams-fw14b", "lotus-107c", "ferrari-f2004", "mclaren-mp4-23", "red-bull-rb19", "brabham-bt52"].map((c) => `/cars/${c}`),
  ...[["juan-manuel-fangio", 1955], ["alberto-ascari", 1952], ["jim-clark", 1965], ["jackie-stewart", 1971], ["niki-lauda", 1984], ["ayrton-senna", 1988],
    ["alain-prost", 1989], ["michael-schumacher", 2004], ["lewis-hamilton", 2008], ["sebastian-vettel", 2011], ["max-verstappen", 2023]].map(([d, y]) => `/drivers/${d}?year=${y}`),
  "/drivers/juan-manuel-fangio", "/drivers/carlos-sainz-jr?year=2023",
  "/seasons/1976", "/seasons/1988", "/seasons/2008",
  "/circuits/monza?year=2023", "/circuits/monza?year=1955", "/circuits/monaco",
];

/* name helpers (independent of the app's resolver — a second opinion) */
const words = (s) => { try { s = decodeURIComponent(s); } catch {} return s.replace(/\.[a-z]{3,4}$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); };
const ascii = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const fileOf = (url) => { const m = /\/([^/?]+)(?:\?|$)/.exec(url.replace(/\/\d+px-[^/]+$/, "")); return m ? decodeURIComponent(m[1]) : ""; };
const fileYear = (name) => { const m = /(?:^|[^0-9])(19[5-9]\d|20[0-3]\d)(?:[01]\d[0-3]\d)?(?![0-9])/.exec(name); return m ? +m[1] : null; };
const chassisOfTeam = new Map();
const siblings = (team) => { if (!chassisOfTeam.has(team)) chassisOfTeam.set(team, q("select ch.id, ch.name, c.name tname from chassis ch join constructor c on c.id = ch.constructor_id where ch.constructor_id = ?", team)); return chassisOfTeam.get(team); };
const teamOfChassis = (id) => q("select constructor_id t from chassis where id = ?", id)[0]?.t;
const named = (file, team) => {
  const w = ` ${words(file)} `;
  return siblings(team).filter((c) => {
    const m = words(c.name).split(" ").join(" ?"), tn = words(c.tname).replace(/ /g, "").split("").join(" ?");
    const distinctive = /[a-z]/.test(c.name) && /\d/.test(c.name) && c.name.replace(/[^a-z0-9]/gi, "").length >= 4 && !/^[a-z]?\d+[a-z]?$/i.test(c.name.replace(/[^a-z0-9]/gi, ""));
    return new RegExp(`${distinctive ? " " : ` ${tn}(?: [a-z]+){0,2} `}${m}(?! ?(?:[a-z]|\\d{1,2}|hours?|h)(?: |$)) `).test(w);
  }).map((c) => c.id);
};
const surnames = [...new Set(q("select last_name n from driver").map((r) => ascii(r.n.replace(/,?\s*\b(jr|sr|ii|iii)\.?$/i, ""))).filter((n) => n.length >= 5))];
const surnameOf = (id) => ascii((q("select last_name n from driver where id = ?", id)[0]?.n ?? "").replace(/,?\s*\b(jr|sr|ii|iii)\.?$/i, ""));

async function resolve(src) {
  const url = new URL(src.replace(/&amp;/g, "&"), BASE).href;
  if (!url.startsWith(BASE)) return { url, status: null };
  const r = await fetch(url, { redirect: "manual" }).catch(() => null);
  if (!r) return { url, status: "error" };
  return { url: r.headers.get("location") ?? url, status: r.headers.get("x-img-status"), caption: decodeURIComponent(r.headers.get("x-img-caption") ?? ""), depicts: r.headers.get("x-img-depicts") };
}
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2].replace(/&amp;/g, "&").replace(/&quot;/g, '"')]));

const rows = [];
for (const page of PAGES) {
  const res = await fetch(BASE + page).catch(() => null);
  if (!res?.ok) { rows.push({ page, object: "page", year: "", url: "", status: "error", flags: [`HTTP ${res?.status ?? "fail"}`] }); continue; }
  const html = await res.text();
  const pageYear = +(new URL(BASE + page).searchParams.get("year") ?? /\/seasons\/(\d{4})/.exec(page)?.[1] ?? 0) || null;
  const seen = new Set();
  // 1. hero / card pictures annotated by the app (data-img-*)
  for (const m of html.matchAll(/<[a-z]+[^>]*data-img-kind="[^"]*"[^>]*>/g)) {
    const a = attrs(m[0]);
    const after = html.slice(m.index, m.index + 4000);
    const img = a.src ? { src: a.src } : attrs(/<img[^>]*>/.exec(after)?.[0] ?? "");
    const src = "data-img-src" in a ? a["data-img-src"] : img.src || "";
    if (!src && a["data-img-kind"] !== "circuit") continue;
    const key = a["data-img-kind"] + a["data-img-id"] + src;
    if (seen.has(key)) continue; seen.add(key);
    seen.add(src);
    let status = a["data-img-status"], url = src || "(3D telemetry model)", caption = a["data-img-caption"];
    if (!status && src.startsWith("/api/")) { const r = await resolve(src); status = r.status ?? "unannotated"; url = r.url; caption ||= r.caption; }
    rows.push({ page, object: `${a["data-img-kind"]}:${a["data-img-id"]}`, year: +a["data-img-year"] || null, url, status: status ?? "unannotated", caption, depicts: a["data-img-depicts"] || null, hero: true });
  }
  // 2. faces / car images served through the app's image routes
  for (const m of html.matchAll(/<img[^>]*src="(\/api\/(?:face|carimg|logo)\/[^"]+)"[^>]*>/g)) {
    const src = m[1].replace(/&amp;/g, "&");
    if (seen.has(src)) continue; seen.add(src);
    const u = new URL(src, BASE);
    const [, kind, id] = /\/api\/(face|carimg|logo)\/([^/?]+)/.exec(u.pathname);
    const year = +(u.searchParams.get("year") ?? 0) || (kind === "carimg" && /@(\d{4})/.exec(decodeURIComponent(id))?.[1]) || null;
    const r = await resolve(src);
    rows.push({ page, object: `${kind === "face" ? "driver" : kind === "logo" ? "logo" : "car"}:${decodeURIComponent(id)}`, year: year ? +year : null, url: r.url, status: r.status === "pending" ? "pending" : r.status, caption: r.caption, depicts: r.depicts || null });
  }
  // 3. official 2026 art used directly
  for (const m of html.matchAll(/<img[^>]*src="(https:\/\/media\.formula1\.com[^"]*\/common\/f1\/2026\/[^"]*(?:car|right)[^"]*)"[^>]*>/g)) {
    const src = m[1].replace(/&amp;/g, "&");
    if (seen.has(src) || /fallback/.test(src)) continue; seen.add(src);
    rows.push({ page, object: /car(right|left)/.test(src) ? "car:2026-official" : "driver:2026-official", year: pageYear, url: src, status: "exact", context: "inline" });
  }
}

/* flags */
for (const r of rows) {
  r.flags ??= [];
  if (!r.url || r.status === "error") continue;
  const file = fileOf(r.url);
  const [kind, id] = r.object.split(":");
  const exact = r.status === "exact";
  if ((r.status === "representative" || r.status === "placeholder") && !r.caption && kind !== "driver" && kind !== "logo") r.flags.push("no-caption");
  if (exact && r.year) {
    const f = /\/(\d{4})Drivers\//.exec(r.url)?.[1] ?? /\/common\/f1\/(\d{4})\//.exec(r.url)?.[1] ?? /\/teams\/(\d{4})\//.exec(r.url)?.[1];
    if (f && +f !== r.year && !/fallback/.test(r.url)) r.flags.push(`year≠ (${f})`);
    else if (!f && /wikimedia|wikipedia/.test(r.url) && (kind === "driver" || kind === "team")) { const fy = fileYear(file); if (fy && fy !== r.year) r.flags.push(`year≠ (${fy})`); }
  }
  if (r.object === "driver:2026-official" && r.year && r.year !== 2026) r.flags.push("2026-art");
  if (r.object === "car:2026-official" && r.year && r.year !== 2026) r.flags.push("2026-art");
  if ((kind === "car" || kind === "team") && /wikimedia|wikipedia/.test(r.url)) {
    const shown = r.depicts || (kind === "car" ? id : null);
    const team = shown ? teamOfChassis(shown) : kind === "team" ? id.split("@")[0] : null;
    const n = team ? named(file, team) : [];
    if (shown && n.length && !n.includes(shown)) r.flags.push(`other-car (${n.join(",")})`);
    if (kind === "car" && exact && shown && shown !== id) r.flags.push(`other-car (${shown})`);
  }
  if (kind === "driver" && /wikimedia|wikipedia/.test(r.url)) {
    const me = surnameOf(id.split("?")[0]);
    const t = ascii(file);
    const other = surnames.find((n) => n !== me && !me.includes(n) && !n.includes(me) && t.includes(n));
    if (other) r.flags.push(`other-who (${other})`);
  }
}

const sus = rows.filter((r) => r.flags.length);
const count = (f) => rows.filter(f).length;
if (!quiet) {
  for (const r of rows) {
    const st = r.status === "exact" ? "exact" : r.status === "representative" ? `repr「${r.caption}」` : r.status === "placeholder" ? `placeholder${r.caption ? `「${r.caption}」` : ""}` : r.status ?? "-";
    console.log(`${r.flags.length ? "!!" : "  "} ${r.page.padEnd(34)} ${r.object.padEnd(34)} ${String(r.year ?? "").padEnd(4)} ${st.padEnd(30)} ${(r.url || "").slice(0, 110)}${r.flags.length ? "  ⟵ " + r.flags.join(" ") : ""}`);
  }
}
const heroes = rows.filter((r) => r.hero);
console.log(`\n${PAGES.length} pages · ${rows.length} pictures (${heroes.length} hero/card-annotated)`);
console.log(`  exact ${count((r) => r.status === "exact")} · representative+caption ${count((r) => r.status === "representative")} · placeholder ${count((r) => r.status === "placeholder")} · logo-current ${count((r) => r.status === "current")} · same-team-near-season ${count((r) => r.status === "team-near")} · pending ${count((r) => r.status === "pending")} · other ${count((r) => !["exact", "representative", "placeholder", "pending", "current", "team-near"].includes(r.status))}`);
console.log(`  suspicious: ${sus.length}`);
for (const r of sus) console.log(`    ${r.page} ${r.object} ${r.year ?? ""} → ${r.flags.join(" ")}  ${fileOf(r.url)}`);
if (arg("json", null)) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));
process.exit(sus.length ? 1 : 0);
