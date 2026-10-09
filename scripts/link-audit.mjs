// Usage: node scripts/link-audit.mjs [base=http://localhost:3210] [--only=substr] [--pages=/a,/b] [--verbose]
// Global link rule (docs/ia-spec.md §0.5.1 S3 + §1.3): every driver / team / circuit / GP / year that appears on a page
// must be a link to its most specific unit. This loads a broad page sample in a real browser and reports
//   · text nodes OUTSIDE <a> that mention a driver (Chinese full name / unambiguous surname), team, circuit, GP name
//     (XX大奖赛) or a 4-digit year 1950–2026, with context and the CSS-module class of the nearest styled ancestor
//     (dev class names read `<file>-module__<hash>__<class>`, which points at the responsible component);
//   · <img>/<canvas> pictures of faces / logos / cars / track maps that are not inside an <a>.
// The name dictionary is the one lib/linkify.tsx builds (lib/linkify.tsx → linkDictionary()); it is served by a tiny
// dev-only page that must exist while the audit runs:
//   app/poc/linkdict/page.tsx →  export default () => <pre id="dict">{JSON.stringify(linkDictionary())}</pre>
// (force-dynamic, notFound() in production). Delete it afterwards.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3210";
const ONLY = args.find((a) => a.startsWith("--only="))?.slice(7);
const VERBOSE = args.includes("--verbose");

const PAGES = [
  "/live", "/calendar",
  "/seasons", "/seasons/2026", "/seasons/2008", "/seasons/2008/standings", "/seasons/2008/era", "/seasons/2008/circuits",
  "/seasons/2008/drivers", "/seasons/2008/teams", "/seasons/2008/cars", "/seasons/2008/replay",
  "/eras/v8-2006-2013", "/eras/ground-effect-1977-1982",
  "/races/2026/16", "/races/2008/18", "/races/1976/16", "/races/2026/17/brief",
  "/drivers", "/drivers/lewis-hamilton", "/drivers/lewis-hamilton?year=2008", "/drivers/ayrton-senna",
  "/teams", "/teams/ferrari", "/teams/ferrari?year=2004", "/teams/lotus",
  "/circuits", "/circuits/monaco", "/circuits/monaco?year=1988",
  "/cars", "/cars/mercedes-f1-w17", "/cars/lotus-79",
  "/compare?a=lewis-hamilton&b=max-verstappen",
].filter((p) => !ONLY || p.includes(ONLY));
// --pages=/a,/b replaces the sample (spot checks)
const CUSTOM = args.find((a) => a.startsWith("--pages="))?.slice(8).split(",").filter(Boolean);
if (CUSTOM) PAGES.splice(0, PAGES.length, ...CUSTOM);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/poc/linkdict`, { waitUntil: "load", timeout: 120000 });
const dictText = await page.textContent("#dict").catch(() => null);
if (!dictText) { console.error("dictionary page app/poc/linkdict missing — see header comment"); process.exit(2); }
const { entities, gps } = JSON.parse(dictText);
const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keys = Object.keys(entities).filter((k) => /[一-龥]/.test(k)).sort((a, b) => b.length - a.length).map(esc);
const gpAlt = [...gps].sort((a, b) => b.length - a.length).map(esc).join("|");
// GP first (so 巴西大奖赛 is one hit, not 巴西 + …), then entity names, then years
// years: 1950–2026 only (no season page beyond the current one); not inside longer numbers, dates (2026-10-09) or
// measurements (2000毫米)
const SRC = `((?:${gpAlt})大奖赛)|(${keys.join("|")})|((?<![\\d.:/\\-−A-Za-z])(?:19[5-9]\\d|20[01]\\d|202[0-6])(?![\\d]|[-/]\\d|s(?![A-Za-z])|\\s?(?:毫米|米|转|公里|千米|公斤|千克|kg|cc|rpm|马力|亿|万)))`;


// Acceptable by rule (docs/ia-spec.md §1.3 + the global link rule) — counted, not listed as misses:
//   subject  the mention's own page IS this page (or this page's tab / sub-page): /seasons/2008 on /seasons/2008/standings
//   covered  inside a card whose stretched `.card-link` already goes to that entity (the card's own subject)
//   repeat   the same entity is already linked earlier in the same block (Wikipedia: link once per paragraph)
//   control  form controls (<select>/<option>/<input>) cannot hold links
//   crumb    the current (last) breadcrumb
//   h1       the page's hero title (its own subject's name, e.g. "2026 巴林大奖赛")
//   decade   "1980s" group labels (not a season)
const OK_TAGS = ["subject", "covered", "repeat", "control", "crumb", "h1", "decade"];
let totalMiss = 0, totalOk = 0;
const summary = [];
for (const path of PAGES) {
  for (let tries = 0; tries < 3; tries++) {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(2500);
    if (new URL(page.url()).pathname === path.split("?")[0]) break;
  }
  await page.waitForLoadState("load").catch(() => {});
  // scroll once so lazy blocks render
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); }).catch(() => {});
  await page.waitForTimeout(800);
  const audit = () => page.evaluate(({ SRC, entities }) => {
    const re = new RegExp(SRC, "g");
    const here = location.pathname;
    const qYear = new URLSearchParams(location.search).get("year");
    const h1 = document.querySelector("main h1, h1")?.textContent ?? "";
    const where = (el) => {
      const out = [];
      for (let e = el; e && e !== document.body && out.length < 3; e = e.parentElement) {
        const c = [...(e.classList ?? [])].find((c) => /module__/.test(c)) ?? (e.id ? "#" + e.id : null);
        if (c) out.push(c.replace(/-module__[\w-]+?__/, ":"));
      }
      return out.join(" < ") || el.tagName.toLowerCase();
    };
    const pathOf = (kind, id) => kind === "driver" ? `/drivers/${id}` : kind === "team" ? `/teams/${id}` : kind === "circuit" ? `/circuits/${id}` : kind === "year" ? `/seasons/${id}` : null;
    // href of the stretched card link covering `el`, if any
    const coverOf = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const a = [...e.children].find((c) => c.tagName === "A" && (c.classList.contains("card-link") || getComputedStyle(c).position === "absolute"));
        if (a) return a.getAttribute("href") ?? "";
      }
      return null;
    };
    const blockOf = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) if (!/^inline/.test(getComputedStyle(e).display)) return e;
      return document.body;
    };
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    let n;
    while ((n = tw.nextNode())) {
      const el = n.parentElement;
      if (!el || el.closest("a, script, style, noscript, template, title, #dict, nextjs-portal, [data-nextjs-toast]")) continue;
      const text = n.nodeValue;
      if (!text || !text.trim()) continue;
      let m; re.lastIndex = 0;
      while ((m = re.exec(text))) {
        const [whole, gp, name, year] = m;
        const kind = gp ? "gp" : year ? "year" : entities[name]?.kind;
        const id = gp ? gp : year ? year : entities[name]?.id;
        const tags = [];
        const p = pathOf(kind, id);
        if (el.closest("h1")) tags.push("h1");
        // a decade label ("1980" + "s" as separate React text nodes) is not a season
        if (kind === "year" && (el.textContent ?? "").includes(whole + "s")) tags.push("decade");
        if (p && (here === p || here.startsWith(p + "/")) || (kind === "gp" && h1.includes(whole) && /^\/races\//.test(here))) tags.push("subject");
        if (el.closest("select, option, input, textarea")) tags.push("control");
        else if (el.closest("button, [role=button], [role=tab], label")) tags.push("button");
        if (el.closest("[aria-hidden=true]")) tags.push("aria-hidden");
        const crumb = el.closest("nav[aria-label='面包屑'] li");
        if (crumb) tags.push(crumb === crumb.parentElement.lastElementChild ? "crumb" : "crumb-parent");
        if (el.closest("svg")) tags.push("svg");
        if (!el.checkVisibility()) tags.push("hidden");
        const cover = coverOf(el);
        if (cover != null) {
          const yIn = (y) => cover.includes(`/seasons/${y}`) || cover.includes(`year=${y}`) || cover.includes(`/races/${y}/`) || cover.includes(`-${String(y).slice(2)}`) || new RegExp(`\\b${y}\\b`).test(cover);
          // a car card (team × year): its own team and year are the card's subject
          const car = cover.startsWith("/cars/") && (kind === "year" || (kind === "team" && cover.startsWith(`/cars/${id}-`)));
          if (car || (p && kind !== "year" ? cover.startsWith(p) : kind === "year" ? yIn(id) : kind === "gp" ? cover.startsWith("/races/") : false)) tags.push("covered");
          else tags.push("in-card→" + cover.slice(0, 40));
        }
        const blk = blockOf(el);
        const linked = [...blk.querySelectorAll("a[href]")].some((a) => {
          const h = a.getAttribute("href");
          return p ? (h === p || h.startsWith(p + "?") || h.startsWith(p + "/")) : kind === "gp" ? h.startsWith("/races/") && a.textContent.includes(whole) : false;
        });
        if (linked) tags.push("repeat");
        else {
          // the card / note's own subject: the same entity is linked as the item's header (race-page notes, brief notes)
          const item = el.closest("article, li");
          const own = item && [...item.querySelectorAll("a[href]")].some((a) => { const h = a.getAttribute("href"); return p && (h === p || h.startsWith(p + "?")); });
          if (own) tags.push("covered");
        }
        hits.push({ kind, id, whole, ctx: text.slice(Math.max(0, m.index - 16), m.index + whole.length + 12).replace(/\s+/g, " ").trim(), where: where(el), tags });
      }
    }
    const pics = [];
    for (const img of document.querySelectorAll("img, canvas")) {
      if (img.closest("a")) continue;
      const src = img.getAttribute("src") ?? "";
      if (/\/api\/flag\/|drs-|halftone/.test(src)) continue;
      const k = /\/api\/face\/|:driver:|\/drivers?\/|right\.webp|left\.webp/.test(src) ? "face" : /\/api\/logo\/|logo/i.test(src) ? "logo"
        : /track|circuit/i.test(src) ? "track" : /\/api\/carimg\/|car/i.test(src) && img.tagName === "IMG" ? "car"
        : img.tagName === "CANVAS" ? "canvas" : /media\.formula1\.com|wikimedia/.test(src) ? "photo" : null;
      if (!k) continue;
      const cover = coverOf(img);
      const tags = [];
      // a unit page's own hero picture (portrait / car / 3D track of the page's subject) is the subject itself
      const unitPage = /^\/(drivers|teams|circuits|cars)\/[^/]+$/.test(here);
      const firstSection = document.querySelector("main section, section");
      const subjId = here.split("/")[2];
      if (unitPage && (firstSection?.contains(img) || src.includes(`/${subjId}?`) || src.includes(`/${subjId}/`) || (here.startsWith("/circuits/") && img.closest("[class*=storyRow]")))) tags.push("subject");
      if (cover != null) tags.push("covered→" + cover.slice(0, 40));
      if (!img.checkVisibility()) tags.push("hidden");
      pics.push({ kind: k, src: src.slice(0, 70), where: where(img), tags });
    }
    return { hits, pics };
  }, { SRC, entities });
  // client-side redirects can swap the document under us — wait and retry once
  const res = await audit().catch(async () => { await page.waitForLoadState("load").catch(() => {}); await page.waitForTimeout(2500); return audit(); });
  const landed = page.url().replace(BASE, "");
  const ok = (h) => h.tags.some((t) => OK_TAGS.includes(t));
  const miss = res.hits.filter((h) => !ok(h));
  const okHits = res.hits.filter(ok);
  const picMiss = res.pics.filter((p) => !p.tags.some((t) => t.startsWith("covered") || t === "subject"));
  totalMiss += miss.length + picMiss.length; totalOk += okHits.length;
  summary.push([path, miss.length, picMiss.length, okHits.length]);
  console.log(`\n=== ${path}${landed !== path ? `  (landed on ${landed})` : ""} — ${miss.length} unlinked mentions, ${picMiss.length} unlinked pictures, ${okHits.length} acceptable`);
  const groups = new Map();
  for (const h of miss) {
    const tg = h.tags.map((t) => t.replace(/→.*/, ""));
    const g = `${h.where} [${h.kind}]${tg.length ? " {" + tg.join(",") + "}" : ""}`;
    groups.set(g, [...(groups.get(g) ?? []), h]);
  }
  for (const [g, hs] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(hs.length).padStart(3)} × ${g}`);
    for (const s of [...new Set(hs.map((h) => h.ctx))].slice(0, VERBOSE ? 20 : 3)) console.log(`        “${s}”`);
  }
  const pg = new Map();
  for (const p of picMiss) { const k = `${p.where} [${p.kind}]${p.tags.length ? " {" + p.tags.join(",") + "}" : ""}`; pg.set(k, [...(pg.get(k) ?? []), p]); }
  for (const [k, ps] of pg) console.log(`  ${String(ps.length).padStart(3)} × IMG ${k}  e.g. ${ps[0].src}`);
  if (VERBOSE) {
    const og = new Map();
    for (const h of okHits) { const k = h.tags.filter((t) => OK_TAGS.includes(t))[0] + " " + h.where; og.set(k, (og.get(k) ?? 0) + 1); }
    for (const [k, c] of og) console.log(`      ok ${String(c).padStart(3)} × ${k}`);
  }
}
console.log("\n=== summary  (unlinked text, unlinked pictures, acceptable)");
for (const [p, t, i, o] of summary) console.log(`  ${p.padEnd(46)} ${String(t).padStart(4)} ${String(i).padStart(4)} ${String(o).padStart(5)}`);
console.log(`  total unlinked ${totalMiss} · acceptable ${totalOk}`);
await browser.close();
