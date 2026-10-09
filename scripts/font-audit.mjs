// Usage: node scripts/font-audit.mjs [base=http://localhost:3210] [--samples=N] [--only=/path]
// Type audit (user: 「英文和数字…没有用 F1 的品牌字体」 + 「标题应该要用中文」). Walks every rendered text node of a
// broad page sample and flags:
//   (a) FONT  — a node made only of digits / Latin / punctuation whose computed font-family does not start with
//               Formula1, Formula1 Wide or KH Interference F1 (the legacy "Formula1 Digits" face counts as a miss);
//   (c) BLACK — a numeral-only node set in Formula1 Black (900) below display size (< 44px): numbers in stat rows,
//               tiles, tables, rails use --num-font at --num-weight (700), like the year rail;
//   (b) ENG   — an English label / caption word (Points, Starts, PTS …) outside an eyebrow kicker that sits above
//               a Chinese heading. Names (HAMILTON), codes (NOR, DNF, P1) and units are not in the word list; runs of
//               4+ English words (team-radio quotes, photo credits, source titles) are quotations, not captions.
// Exit code 1 when anything is flagged.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3210";
const SAMPLES = +(args.find((a) => a.startsWith("--samples="))?.slice(10) ?? 8);
const ONLY = args.find((a) => a.startsWith("--only="))?.slice(7);

const PAGES = [
  "/live", "/calendar", "/seasons",
  "/seasons/2021", "/seasons/2021/calendar", "/seasons/2021/standings", "/seasons/2021/era", "/seasons/2021/circuits",
  "/seasons/2021/drivers", "/seasons/2021/teams", "/seasons/2021/cars", "/seasons/2021/replay",
  "/eras/hybrid-2014-2021", "/races/2026/3", "/races/2026/3/replay",
  "/drivers", "/drivers/lewis-hamilton", "/drivers/lewis-hamilton?year=2008",
  "/teams", "/teams/ferrari", "/circuits", "/circuits/monaco", "/cars", "/cars/red-bull-rb22", "/compare",
];

/** English caption words that must be Chinese (whole-word, case-insensitive). Names / codes / units never listed. */
const WORDS = [
  "fastest", "laps?", "starts?", "points", "pts", "pos", "grand slams?", "slams?", "finishes", "poles?", "podiums?",
  "circuit length", "length", "first grand prix", "rounds", "winners?", "races", "drivers?", "teams?", "wins?",
  "titles?", "seasons?", "circuits", "champions?", "turns", "constructors'?", "drivers'", "standings", "results?",
  "schedule", "overview", "calendar", "replay", "gap", "interval", "leader", "qualifying", "practice", "best", "total",
  "years?", "cars", "engines?", "eras?", "compare", "view all", "see all", "more", "back", "next", "previous", "search",
  "watch", "status", "retired", "tyres?", "speed", "sectors?", "distance", "debut", "born", "nationality", "age",
  "entries", "power unit", "date", "track", "weather", "upcoming", "finished", "completed", "timing", "classification",
  "highlights", "details", "stats", "statistics", "records?", "country", "location", "capacity", "unknown", "share",
  "download", "subscribe", "menu", "home", "close", "loading", "today", "days", "hours", "mins", "secs", "hrs",
  "race", "season", "round", "live", "sprint", "1-2 finishes", "world titles", "number", "chassis", "rank",
];
const WORD_RE = new RegExp(`(?<![A-Za-z])(${WORDS.join("|")})(?![A-Za-z])`, "i");

const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem("pitwall-grid-ready", "yes"); } catch {} });

let total = { a: 0, b: 0, c: 0 };
for (const path of ONLY ? [ONLY] : PAGES) {
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120000 });
    await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
      window.scrollTo(0, 0);
    });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
  } catch (e) { console.log(`\n${path}  ✗ load failed: ${e.message.split("\n")[0]}`); await p.close(); continue; }
  const res = await p.evaluate((src) => {
    const WORD_RE = new RegExp(src, "i");
    const CJK = /[　-〿㐀-鿿＀-￯]/;
    // "Formula1 Text" = the Formula1 cuts with CJK line metrics, restricted to Latin (globals.css) — same glyphs
    const OK = /^(Formula1|Formula1 Wide|Formula1 Text|KH Interference F1)$/i;
    const out = { a: [], b: [], c: [] };
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const cls = (el) => (typeof el.className === "string" ? el.className : el.className?.baseVal ?? "");
    const label = (el) => {
      const parts = [];
      for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) {
        const c = cls(e).split(/\s+/).filter(Boolean).map((x) => x.replace(/^(.+?)-module__.+?__([A-Za-z][\w-]*)$/, "$1.$2")).slice(0, 2).join(".");
        parts.unshift(e.tagName.toLowerCase() + (c ? "." + c : ""));
      }
      return parts.join(">");
    };
    let n;
    while ((n = tw.nextNode())) {
      const txt = n.nodeValue.replace(/\s+/g, " ").trim();
      if (!txt) continue;
      const el = n.parentElement;
      if (!el || el.closest("script,style,noscript,template,[hidden]")) continue;
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = el.getClientRects();
      if (!r.length) continue;
      const cs = getComputedStyle(el);
      const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      const hasCJK = CJK.test(txt);
      if (!hasCJK && /[A-Za-z0-9]/.test(txt) && !/^[\s\p{Extended_Pictographic}]+$/u.test(txt)) {
        if (!OK.test(fam)) out.a.push({ t: txt.slice(0, 40), f: `${fam} ${cs.fontWeight}`, s: label(el) });
        // headings (h1–h3, display type) may set a year in Black alongside the Chinese words
        else if (/^Formula1$/i.test(fam) && +cs.fontWeight >= 900 && /^[\d.,:+\-−–/ %]+$/.test(txt) && parseFloat(cs.fontSize) < 44 && !el.closest("h1,h2,h3"))
          out.c.push({ t: txt.slice(0, 40), f: `${fam} ${cs.fontWeight} ${cs.fontSize}`, s: label(el) });
      }
      // a caption is short: English sentences / titles (team radio quotes, photo credits, source links) are not labels
      const words = (txt.match(/[A-Za-z]{2,}/g) ?? []).length;
      const m = words && words <= 3 && !/[.?!]["”']?$/.test(txt) ? txt.match(WORD_RE) : null;
      if (m) {
        // an eyebrow kicker is fine when it sits above (shares a parent with) a Chinese heading
        const kick = el.closest('[class*="kicker"],[class*="yebrow"],[data-kicker]');
        let box = kick?.parentElement, above = false;
        for (let i = 0; box && i < 3 && !above; box = box.parentElement, i++) above = CJK.test(box.textContent.replace(kick.textContent, ""));
        if (above) continue;
        out.b.push({ t: txt.slice(0, 50), f: m[1], s: label(el) });
      }
    }
    return out;
  }, WORD_RE.source);
  await p.close();
  const line = (k, name) => {
    const list = res[k];
    if (!list.length) return;
    const uniq = new Map();
    for (const x of list) { const key = x.t + "|" + x.f; uniq.set(key, { ...x, n: (uniq.get(key)?.n ?? 0) + 1 }); }
    console.log(`  ${name} ${list.length}`);
    for (const x of [...uniq.values()].slice(0, SAMPLES)) console.log(`     ${x.n > 1 ? "×" + x.n + " " : ""}「${x.t}」  [${x.f}]  ${x.s}`);
    if (uniq.size > SAMPLES) console.log(`     … ${uniq.size - SAMPLES} more distinct`);
  };
  console.log(`\n${path}  a=${res.a.length} c=${res.c.length} b=${res.b.length}`);
  line("a", "(a) non-F1 face on Latin/digits:");
  line("c", "(c) numerals in Formula1 Black:");
  line("b", "(b) English caption:");
  total.a += res.a.length; total.b += res.b.length; total.c += res.c.length;
}
await b.close();
console.log(`\nTOTAL  (a) font ${total.a}   (c) black numerals ${total.c}   (b) english ${total.b}`);
process.exit(total.a + total.b + total.c ? 1 : 0);
