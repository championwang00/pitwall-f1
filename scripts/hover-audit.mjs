// Usage: node scripts/hover-audit.mjs [base=http://localhost:3210] [--only=substr] [--pages=/a,/b] [--no-hover] [--verbose]
// Hover-intro rule (user): 「带有下划线的内容，hover 上去就直接弹出浮窗显示介绍，然后点击后才进入详情页」. Every inline link to an
// entity page — /drivers/X, /teams/X, /circuits/X, /cars/X, /seasons/Y, /eras/X, /races/Y/R — must carry
// `data-entity` + `data-eid` so components/entity/HoverLayer.tsx can show its card. This loads a page sample and
//   1. lists every visible <a> inside <main> whose href is an entity route but has no data-entity (MISS), except
//      navigation UI, which never previews by rule: top nav / footer, the year rail, tab bars, buttons (.btn,
//      role=button), stretched card overlays (.card-link / tabindex=-1: the card's own subject), links to the page
//      you're on. Those are counted per reason (EXEMPT) so the exceptions stay visible.
//   3. (user: 「尽量都还是可点的啊，除非你真的不可点，你就不要给我 hover」) lists DEAD HOVERS: elements that a `:hover` rule
//      gives a background / colour / underline / cursor change although nothing there is clickable — not an <a> /
//      <button> / form control / role=button…, not inside one, no clickable descendant, no React onClick.
//   2. hovers a sample of data-entity links per page and checks that the hover card (HoverLayer's
//      [role=tooltip] .card from hover.module.css) appears and fills (title loaded).
import { chromium } from "playwright";

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3210";
const ONLY = args.find((a) => a.startsWith("--only="))?.slice(7);
const VERBOSE = args.includes("--verbose");
const HOVER = !args.includes("--no-hover");
const SAMPLE = 3;

let PAGES = [
  "/live",
  "/seasons", "/seasons/2024", "/seasons/2024/calendar", "/seasons/2024/standings", "/seasons/2024/circuits",
  "/seasons/2024/drivers", "/seasons/2024/teams", "/seasons/2024/cars", "/seasons/2024/era", "/seasons/2024/replay",
  "/drivers", "/drivers/lewis-hamilton", "/drivers/lewis-hamilton?year=2024", "/drivers/lewis-hamilton?from=2013&to=2024",
  "/teams", "/teams/mclaren", "/teams/mclaren?year=2024",
  "/circuits", "/circuits/monza",
  "/cars", "/cars/red-bull-rb19", "/cars/ferrari-f14-t",
  "/races/2024/1", "/races/2024/1/brief",
  "/eras/ground-effect-2022-2025", "/teams/red-bull?year=2022",
  "/", "/calendar", "/compare?a=lewis-hamilton&b=max-verstappen",
].filter((p) => !ONLY || p.includes(ONLY));
const CUSTOM = args.find((a) => a.startsWith("--pages="))?.slice(8).split(",").filter(Boolean);
if (CUSTOM) PAGES = CUSTOM;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem("pitwall-grid-ready", "yes"); } catch {} });
const page = await ctx.newPage();

// the hover card: HoverLayer portals `<div class="hover-module__…__card" role="tooltip">` into <body>
const CARD = 'body > [role="tooltip"][class*="hover-module"][class*="card"]';

const totals = { miss: 0, exempt: {}, hovered: 0, shown: 0, dead: 0 };
const deadRules = new Map(); // selector → { n, pages:Set, sample }
const failures = [];
for (const path of PAGES) {
  for (let tries = 0; tries < 3; tries++) {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1500);
    if (new URL(page.url()).pathname === path.split("?")[0]) break;
  }
  // scroll once so lazy blocks render
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo(0, 0); }).catch(() => {});
  await page.waitForTimeout(600);

  const res = await page.evaluate(() => {
    const ENTITY = /^\/(?:(?:drivers|teams|circuits|cars|eras)\/[^/?#]+|seasons\/\d{4}|races\/\d{4}\/\d+)(?:[?#].*)?$/;
    const here = location.pathname;
    const cls = (el) => (typeof el.className === "string" ? el.className : el.getAttribute("class") ?? "");
    const short = (c) => c.split(/\s+/).map((x) => x.replace(/^(.*?)-module__[\w-]+?__/, "$1.")).filter(Boolean).join(" ");
    const visible = (a) => {
      const r = a.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const st = getComputedStyle(a);
      return st.visibility !== "hidden" && st.display !== "none";
    };
    const why = (a) => {
      const href = new URL(a.href, location.href);
      if (href.pathname === here) return "self";
      if (a.classList.contains("btn") || a.getAttribute("role") === "button" || a.closest("button")) return "button";
      if (a.classList.contains("card-link") || a.getAttribute("tabindex") === "-1") return "card-overlay";
      // 「看全部」/「完整单场」/「本站档案」-style action links: .link-arrow, or a CSS-module class named action / more / full
      if (a.classList.contains("link-arrow") || /(^|\s)[\w-]+-module__[\w-]+__(action|actionPlay|more|full)(\s|$)/.test(cls(a))) return "action";
      for (let e = a.parentElement; e && e !== document.body; e = e.parentElement) {
        const c = cls(e);
        const tag = `${e.tagName.toLowerCase()}${c ? "." + short(c).replace(/\s+/g, ".") : ""}`;
        if (e.tagName === "HEADER" || e.tagName === "FOOTER") return "site-nav " + tag;
        if (e.tagName === "NAV" && e.getAttribute("aria-label") !== "面包屑") return "nav " + tag;
        if (e.getAttribute("role") === "tablist" || /(^|\s)(tabs|tab|YearTabs)-module__/.test(c)) return "tabs " + tag;
        // the year rail is a <nav> (counted above); its layout wrapper `rail.main` is the page content, not the rail
        if (e.matches("aside")) return "aside " + tag;
      }
      return null;
    };
    const out = { miss: [], exempt: {}, links: 0, suppressed: [] };
    for (const a of document.querySelectorAll("main a[href]")) {
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !ENTITY.test(u.pathname + u.search) || !visible(a)) continue;
      out.links++;
      if (a.dataset.entity && a.dataset.eid) {
        // rule: data-preview="0" only for the PAGE's own subject (the layer already skips links to this very page)
        if (a.dataset.preview === "0" && u.pathname !== here && !(a.dataset.entity !== "year" && here.startsWith(u.pathname + "/"))) out.suppressed.push({ href: u.pathname + u.search, text: (a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 30) });
        continue;
      }
      const w = why(a);
      if (w) { const k = w.split(" ")[0]; out.exempt[k] = (out.exempt[k] ?? 0) + 1; (out.why ??= {})[w] = (out.why[w] ?? 0) + 1; continue; }
      const where = [];
      for (let e = a; e && e !== document.body && where.length < 3; e = e.parentElement) { const c = short(cls(e)); if (c) where.push(c); }
      out.miss.push({ href: u.pathname + u.search, text: (a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 40), where: where.join(" < ") });
    }
    return out;
  });

  // dead hovers: :hover rules that paint an affordance on something you can't click
  const dead = await page.evaluate(() => {
    const PROPS = /^(background|background-color|background-image|color|text-decoration|text-decoration-line|text-decoration-color|text-underline-offset|cursor)$/;
    const CLICK = "a[href], button, summary, label, select, input, textarea, [role=button], [role=tab], [role=link], [role=menuitem], [role=option], [role=checkbox], [role=switch], [tabindex]:not([tabindex='-1']), [contenteditable=true]";
    const reactClick = (el) => { const k = Object.keys(el).find((x) => x.startsWith("__reactProps")); const pr = k && el[k]; return !!(pr && (pr.onClick || pr.onPointerDown || pr.onMouseDown)); };
    const clickable = (el) => el.matches(CLICK) || !!el.closest(CLICK) || !!el.querySelector(CLICK) || reactClick(el) || [...el.querySelectorAll("*")].slice(0, 200).some(reactClick);
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
    // top-level comma split (ignores commas inside :is() / :not())
    const split = (sel) => { const out = []; let d = 0, cur = ""; for (const ch of sel) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
    const rules = [];
    const walk = (list) => { for (const r of list) { if (r.cssRules && !(r instanceof CSSStyleRule)) walk(r.cssRules); else if (r instanceof CSSStyleRule) { if (r.selectorText.includes(":hover")) rules.push(r); if (r.cssRules?.length) walk(r.cssRules); } } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
    const out = [];
    for (const r of rules) {
      const props = [...r.style].filter((p) => PROPS.test(p) && !(p === "cursor" && /default|auto|not-allowed/.test(r.style.getPropertyValue(p))));
      if (!props.length) continue;
      for (const sel of split(r.selectorText)) {
        const i = sel.indexOf(":hover");
        if (i < 0) continue;
        // the hovered element = everything up to the compound that carries :hover, minus the :hover itself
        let target = sel.slice(0, i) + sel.slice(i + 6).split(/[\s>+~]/)[0];
        target = target.replace(/::?(before|after|placeholder|marker)\b.*$/, "").replace(/:hover/g, "").trim();
        if (!target || /(^|[\s>+~])$/.test(target)) target = target + "*";
        let els;
        try { els = [...document.querySelectorAll(target)]; } catch { continue; }
        const bad = els.filter((el) => el.closest("main, header, footer") && visible(el) && !clickable(el));
        if (bad.length) out.push({ sel, props: props.join(","), n: bad.length, sample: (bad[0].outerHTML || "").slice(0, 140) });
      }
    }
    return out;
  });
  for (const d of dead) {
    const k = d.sel;
    if (!deadRules.has(k)) deadRules.set(k, { n: 0, pages: new Set(), sample: d.sample, props: d.props });
    const x = deadRules.get(k); x.n += d.n; x.pages.add(path);
  }

  // hover sample: distinct, visible, previewing links not pointing at this page
  let hov = { n: 0, ok: 0, bad: [], kinds: [] };
  if (HOVER) {
    const handles = await page.$$("main a[data-entity][data-eid]:not([data-preview='0'])");
    const picks = [];
    const seen = new Set();
    for (const h of handles) {
      const info = await h.evaluate((a) => {
        const r = a.getBoundingClientRect();
        const u = new URL(a.href);
        if (r.width < 2 || r.height < 2 || u.pathname === location.pathname) return null;
        // the layer skips sub-pages of the link's own entity (e.g. /races/2024/1 on /races/2024/1/brief)
        if (a.dataset.entity !== "year" && location.pathname.startsWith(u.pathname + "/")) return null;
        if (a.closest("[aria-hidden='true']")) return null;
        return { kind: a.dataset.entity, id: a.dataset.eid, text: (a.textContent || "").trim().slice(0, 24) };
      });
      if (!info || seen.has(info.kind)) continue; // one per kind first, for coverage
      seen.add(info.kind);
      picks.push([h, info]);
      if (picks.length >= SAMPLE) break;
    }
    // fill the sample from the remaining links when a page has fewer kinds
    for (const h of handles) {
      if (picks.length >= SAMPLE) break;
      if (picks.some(([x]) => x === h)) continue;
      const info = await h.evaluate((a) => { const r = a.getBoundingClientRect(); const u = new URL(a.href); return r.width > 2 && u.pathname !== location.pathname && !location.pathname.startsWith(u.pathname + "/") ? { kind: a.dataset.entity, id: a.dataset.eid, text: (a.textContent || "").trim().slice(0, 24) } : null; });
      if (info) picks.push([h, info]);
    }
    for (const [h, info] of picks) {
      hov.n++; hov.kinds.push(info.kind);
      await page.mouse.move(1, 1);
      await page.waitForTimeout(250);
      await h.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(200);
      await h.hover({ timeout: 3000 }).catch(() => {});
      const ok = await page.waitForFunction((sel) => !!document.querySelector(sel + " b"), CARD, { timeout: 8000 }).then(() => true).catch(() => false);
      if (ok) hov.ok++;
      else hov.bad.push(`${info.kind}/${info.id} 「${info.text}」`);
    }
    await page.mouse.move(1, 1);
  }

  totals.miss += res.miss.length;
  totals.suppressed = (totals.suppressed ?? 0) + res.suppressed.length;
  totals.dead += dead.length;
  for (const [k, v] of Object.entries(res.exempt)) totals.exempt[k] = (totals.exempt[k] ?? 0) + v;
  totals.hovered += hov.n; totals.shown += hov.ok;
  if (hov.bad.length) failures.push(...hov.bad.map((b) => `${path}  ${b}`));
  const ex = Object.entries(res.exempt).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`\n${path}  entity links ${res.links} · MISS ${res.miss.length}${ex ? ` · exempt: ${ex}` : ""}${HOVER ? ` · hover ${hov.ok}/${hov.n} [${hov.kinds.join(",")}]` : ""} · dead-hover rules ${dead.length}`);
  if (res.suppressed.length) {
    console.log(`  · preview off on a non-subject link: ${res.suppressed.length}` + (path.startsWith("/compare") ? " (compare: A / B are the page's own subjects)" : ""));
    for (const x of res.suppressed.slice(0, VERBOSE ? 99 : 3)) console.log(`      ${x.href}  「${x.text}」`);
  }
  const groups = new Map();
  for (const m of res.miss) {
    const k = m.where;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  }
  for (const [where, ms] of groups) {
    console.log(`  ✗ ${ms.length}× ${where}`);
    for (const m of ms.slice(0, VERBOSE ? 99 : 3)) console.log(`      ${m.href}  「${m.text}」`);
  }
  if (VERBOSE && res.why) for (const [w, n] of Object.entries(res.why)) console.log(`    · exempt ${n}× ${w}`);
  for (const b of hov.bad) console.log(`  ✗ no hover card: ${b}`);
}

// targeted (coordinator): on /teams/red-bull?year=2022 the hero tile 「车手 1」 and the lineup card's name
// 「马克斯·维斯塔潘」 both pop the driver card
if (HOVER && (!ONLY || "/teams/red-bull?year=2022".includes(ONLY)) && !CUSTOM) {
  await page.goto(BASE + "/teams/red-bull?year=2022", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);
  const checks = [
    ["hero tile 车手 1", () => page.locator('[data-hero-tile="车手 1"]').first()],
    ["lineup card name 马克斯·维斯塔潘", () => page.locator('main a[data-entity="driver"][data-eid="max-verstappen"]').filter({ hasText: "马克斯·维斯塔潘" }).filter({ hasNot: page.locator("[data-hero-tile]") }).last()],
  ];
  for (const [label, loc] of checks) {
    await page.mouse.move(1, 1); await page.waitForTimeout(300);
    const l = loc();
    await l.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);
    await l.hover({ timeout: 4000 }).catch((e) => console.log("  hover failed", label, e.message.split("\n")[0]));
    const title = await page.waitForFunction((sel) => document.querySelector(sel + " b")?.textContent, CARD, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => null);
    const ok = !!title && /维斯塔潘|佩雷斯/.test(title);
    console.log(`\n/teams/red-bull?year=2022  ${label}: ${ok ? "✓ card 「" + title + "」" : "✗ no driver card" + (title ? ` (got 「${title}」)` : "")}`);
    if (!ok) failures.push(`/teams/red-bull?year=2022  ${label}`);
    totals.hovered++; if (ok) totals.shown++;
  }
}

if (deadRules.size) {
  console.log("\n== DEAD HOVERS (a :hover affordance on something not clickable)");
  for (const [sel, x] of deadRules) console.log(`  ✗ ${sel}  {${x.props}}  ${x.n} el on ${[...x.pages].slice(0, 4).join(" ")}${x.pages.size > 4 ? " …" : ""}\n      ${x.sample}`);
}
console.log(`\n== TOTAL  MISS ${totals.miss} · preview-off non-subject ${totals.suppressed ?? 0} · dead-hover rules ${deadRules.size} · exempt ${JSON.stringify(totals.exempt)} · hover cards ${totals.shown}/${totals.hovered}`);
if (failures.length) console.log("hover failures:\n  " + failures.join("\n  "));
await browser.close();
process.exit(totals.miss || failures.length || deadRules.size ? 1 : 0);
