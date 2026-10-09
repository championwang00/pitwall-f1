// Usage: node scripts/ia-check.mjs [base=http://localhost:3210]
// IA spec v5 invariants (docs/ia-spec.md §0.5): for every canonical page in §0.5.3 (one example each)
//   S1  exactly one lit top-nav item: `nav[aria-label="主导航"] [aria-current="page"]` (the breadcrumb's last crumb is aria-current too)
//   S2  root pages have no breadcrumb; every other page has one whose first crumb === the lit nav item
// and for every old URL in §0.5.5 the browser's final address === the new one (redirects are server-side 308s;
// with the route-group loading.tsx they arrive streamed, so the browser — not curl — is the judge).
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3210";
const YEAR = new Date().getUTCFullYear();

// [path, expected nav item, expected breadcrumb trail (null = none)]
const PAGES = [
  ["/live", "实时", null],
  ["/calendar", "实时", ["实时", "赛历与日历订阅"]],
  ["/seasons", "历史", null],
  ["/eras/v8-2006-2013", "历史", ["历史", "*"]],
  ["/seasons/2024", "历史", ["历史", "2024"]],
  ["/seasons/2024/standings", "历史", ["历史", "2024", "积分榜"]],
  ["/seasons/1988/era", "历史", ["历史", "1988", "时代"]],
  ["/seasons/1988/circuits", "历史", ["历史", "1988", "赛道"]],
  ["/seasons/1988/drivers", "历史", ["历史", "1988", "车手"]],
  ["/seasons/1988/teams", "历史", ["历史", "1988", "车队"]],
  ["/seasons/1988/cars", "历史", ["历史", "1988", "赛车"]],
  ["/seasons/2024/replay", "历史", ["历史", "2024", "回放"]],
  ["/seasons/2024/replay?session={BAHRAIN}", "历史", ["历史", "2024", "回放", "巴林大奖赛 · 正赛"]],
  ["/races/2024/1", "历史", ["历史", "2024", "第 1 站 巴林大奖赛"]],
  ["/races/2024/1/brief", "历史", ["历史", "2024", "第 1 站 巴林大奖赛", "解说手册"]],
  ["/circuits", "赛道", null],
  ["/circuits?year=1988", "赛道", ["赛道", "1988"]],
  ["/circuits/monaco", "赛道", ["赛道", "*"]],
  ["/circuits/monaco?year=1988", "赛道", ["赛道", "*", "1988"]],
  ["/drivers", "车手", null],
  ["/drivers?year=1988", "车手", ["车手", "1988"]],
  ["/drivers/lewis-hamilton", "车手", ["车手", "*"]],
  ["/drivers/lewis-hamilton?year=2014", "车手", ["车手", "*", "2014"]],
  ["/compare?a=lewis-hamilton&b=max-verstappen", "车手", ["车手", "对比"]],
  ["/teams", "车队", null],
  ["/teams?year=1988", "车队", ["车队", "1988"]],
  ["/teams/ferrari", "车队", ["车队", "*"]],
  ["/teams/ferrari?year=2004", "车队", ["车队", "*", "2004"]],
  ["/cars", "赛车", null],
  ["/cars?year=1988", "赛车", ["赛车", "1988"]],
  ["/cars/ferrari-sf-26", "赛车", ["赛车", "SF-26"]],
];

// [old URL, expected final path + query]
const REDIRECTS = [
  ["/", "/live"],
  ["/live?year=2024&session={BAHRAIN}", "/seasons/2024/replay?session={BAHRAIN}"],
  ["/live?year=2024&session={BAHRAIN}&a=1&b=44", "/seasons/2024/replay?session={BAHRAIN}&a=1&b=44"],
  ["/live?year=2024", "/seasons/2024/replay"],
  ["/live?year=1988", "/seasons/1988"],
  ["/live?session={BAHRAIN}", `/seasons/${YEAR}/replay?session={BAHRAIN}`],
  ["/live#timing", `/seasons/${YEAR}/replay`],
  ["/brief", "{NEXT_BRIEF}"],
  ["/brief?year=2019&round=15", "/races/2019/15/brief"],
  ["/calendar?year=1988", "/seasons/1988"],
  [`/calendar?year=${YEAR}`, "/calendar"],
  ["/races/2024/1/replay", "/seasons/2024/replay?session={BAHRAIN}"],
  ["/races/1988/3/replay", "/races/1988/3"],
  ["/seasons/1988/replay", "/seasons/1988"],
  ["/seasons/2024/replay?year=2019", "/seasons/2024/replay?year=2019"], // the year param is ignored, not redirected
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fails = [];
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => { fails.push(m); console.log(`  \x1b[31m✗ ${m}\x1b[0m`); };

/** same path and every expected query param present (pages may add view-state params client-side, e.g. &from&to) */
function sameAddress(at, want) {
  const a = new URL(at, BASE), w = new URL(want, BASE);
  return a.pathname === w.pathname && [...w.searchParams].every(([k, v]) => a.searchParams.get(k) === v);
}

async function open(path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  // streamed redirects (meta refresh / client replace) and hydration: wait until the URL settles and the nav is there
  let last = "", same = 0;
  for (let i = 0; i < 60 && same < 3; i++) {
    await page.waitForTimeout(250);
    const u = page.url();
    same = u === last ? same + 1 : 0;
    last = u;
  }
  await page.waitForSelector('nav[aria-label="主导航"] a', { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const u = new URL(page.url());
  return u.pathname + u.search;
}

// a real session key: 2024 Bahrain GP race (from the 2024 calendar's first ▶) and the next race's brief
await open("/seasons/2024");
const bahrain = await page.evaluate(() => [...document.querySelectorAll('a[href*="/seasons/2024/replay?session="]')].map((a) => new URL(a.href).searchParams.get("session"))[0]);
if (!bahrain) { console.log("could not find a 2024 replay session key on /seasons/2024 (OpenF1 down?)"); process.exit(2); }
await open("/live");
const nextBrief = await page.evaluate(() => { const a = [...document.querySelectorAll("a")].find((x) => /^\/races\/\d+\/\d+\/brief$/.test(new URL(x.href).pathname)); return a ? new URL(a.href).pathname : null; });
const fill = (s) => s.replaceAll("{BAHRAIN}", bahrain).replace("{NEXT_BRIEF}", nextBrief ?? "(no brief link on /live)");

console.log(`\nS1 / S2 — ${PAGES.length} canonical pages`);
for (const [p0, nav, trail] of PAGES) {
  const p = fill(p0);
  const at = await open(p);
  const r = await page.evaluate(() => {
    const lit = [...document.querySelectorAll('nav[aria-label="主导航"] [aria-current="page"]')].map((a) => a.textContent.trim());
    const bc = document.querySelectorAll('nav[aria-label="面包屑"]');
    const crumbs = bc.length ? [...bc[0].querySelectorAll("ol > li")].filter((li) => !li.querySelector("button")).map((li) => li.textContent.replace(/\s+/g, " ").trim()) : null;
    return { lit, n: bc.length, crumbs };
  });
  const errs = [];
  if (!sameAddress(at, p)) errs.push(`landed on ${at}`);
  if (r.lit.length !== 1) errs.push(`S1: ${r.lit.length} lit nav items (${r.lit.join(", ")})`);
  else if (r.lit[0] !== nav) errs.push(`S1: lit "${r.lit[0]}", expected "${nav}"`);
  if (r.n > 1) errs.push(`${r.n} breadcrumbs`);
  if (!trail && r.crumbs) errs.push(`S2: root page has a breadcrumb (${r.crumbs.join(" › ")})`);
  if (trail) {
    if (!r.crumbs) errs.push("S2: no breadcrumb");
    else {
      if (r.crumbs[0] !== r.lit[0]) errs.push(`S2: first crumb "${r.crumbs[0]}" ≠ lit nav "${r.lit[0]}"`);
      const want = trail.map(fill);
      const same = want.length === r.crumbs.length && want.every((w, i) => w === "*" || w === r.crumbs[i]);
      if (!same) errs.push(`trail ${r.crumbs.join(" › ")} ≠ ${want.join(" › ")}`);
    }
  }
  if (errs.length) bad(`${p}: ${errs.join("; ")}`);
  else ok(`${p}  [${r.lit[0]}]  ${r.crumbs ? r.crumbs.join(" › ") : "—"}`);
}

console.log(`\nS5 — ${REDIRECTS.length} old URLs (§0.5.5)`);
for (const [from0, to0] of REDIRECTS) {
  const from = fill(from0), to = fill(to0);
  const at = await open(from);
  if (at === to) ok(`${from} → ${at}`);
  else bad(`${from} → ${at}, expected ${to}`);
}

await browser.close();
console.log(fails.length ? `\n\x1b[31m${fails.length} failed\x1b[0m` : "\n\x1b[32mall green\x1b[0m");
process.exit(fails.length ? 1 : 0);
