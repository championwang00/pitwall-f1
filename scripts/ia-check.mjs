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
  ["/seasons/2024", "历史", ["历史", "2024"]], // v5.1: 总览
  ["/seasons/2024/calendar", "历史", ["历史", "2024", "赛历"]],
  ["/seasons/2024/standings", "历史", ["历史", "2024", "积分榜"]],
  ["/seasons/1988/era", "历史", ["历史", "1988", "时代"]],
  ["/seasons/1988/circuits", "历史", ["历史", "1988", "赛道"]],
  ["/seasons/1988/drivers", "历史", ["历史", "1988", "车手"]],
  ["/seasons/1988/teams", "历史", ["历史", "1988", "车队"]],
  ["/seasons/1988/cars", "历史", ["历史", "1988", "赛车"]],
  ["/seasons/2024/replay", "历史", ["历史", "2024", "回放"]],
  ["/races/2024/1", "历史", ["历史", "2024", "第 1 站 巴林大奖赛"]],
  // v5.1: the replay is a child of its race — the race's crumb, then 「回放 · 节次」 (default 正赛)
  ["/races/2024/1/replay", "历史", ["历史", "2024", "第 1 站 巴林大奖赛", "回放 · 正赛"]],
  ["/races/2024/1/replay?session={BAHRAIN}", "历史", ["历史", "2024", "第 1 站 巴林大奖赛", "回放 · 正赛"]],
  ["/races/2024/1/replay?session={BAHRAIN_Q}", "历史", ["历史", "2024", "第 1 站 巴林大奖赛", "回放 · 排位赛"]],
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
  ["/live?year=2024&session={BAHRAIN}", "/races/2024/1/replay?session={BAHRAIN}"],
  ["/live?year=2024&session={BAHRAIN}&a=1&b=44", "/races/2024/1/replay?session={BAHRAIN}&a=1&b=44"],
  ["/live?year=2024", "/seasons/2024/replay"],
  ["/live?year=1988", "/seasons/1988"],
  ["/live?session={LATEST}", "{LATEST_REPLAY}"],
  ["/live#timing", `/seasons/${YEAR}/replay`],
  ["/brief", "{NEXT_BRIEF}"],
  ["/brief?year=2019&round=15", "/races/2019/15/brief"],
  ["/calendar?year=1988", "/seasons/1988/calendar"],
  [`/calendar?year=${YEAR}`, "/calendar"],
  ["/races/1988/3/replay", "/races/1988/3"],
  ["/seasons/1988/replay", "/seasons/1988"],
  // v5.1: the season tab is an index; a session deep link there goes to the race that owns it
  ["/seasons/2024/replay?session={BAHRAIN}", "/races/2024/1/replay?session={BAHRAIN}"],
  ["/seasons/2024/replay?session={BAHRAIN_Q}&a=1&b=16", "/races/2024/1/replay?session={BAHRAIN_Q}&a=1&b=16"],
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

// real session keys: 2024 Bahrain GP race (the 2024 calendar's first ▶ → /races/2024/1/replay?session=K) and its
// qualifying (from OpenF1 via the app's proxy), this season's latest ▶ on /live, and the next race's brief
await open("/seasons/2024/calendar");
const bahrain = await page.evaluate(() => [...document.querySelectorAll('a[href*="/races/2024/1/replay?session="]')].map((a) => new URL(a.href).searchParams.get("session"))[0]);
if (!bahrain) { console.log("could not find a 2024 replay session key on /seasons/2024/calendar (OpenF1 down?)"); process.exit(2); }
const bahrainQ = await page.evaluate(async (k) => {
  const r = await fetch(`/api/openf1/sessions?session_key=${k}`).then((x) => x.json()).catch(() => []);
  const m = r?.[0]?.meeting_key;
  const all = m ? await fetch(`/api/openf1/sessions?meeting_key=${m}`).then((x) => x.json()).catch(() => []) : [];
  return all.find?.((x) => x.session_name === "Qualifying")?.session_key ?? null;
}, bahrain);
await open("/live");
const nextBrief = await page.evaluate(() => { const a = [...document.querySelectorAll("a")].find((x) => /^\/races\/\d+\/\d+\/brief$/.test(new URL(x.href).pathname)); return a ? new URL(a.href).pathname : null; });
const latestReplay = await page.evaluate(() => { const a = [...document.querySelectorAll('a[href*="/replay?session="]')].filter((x) => /^\/races\/\d+\/\d+\/replay$/.test(new URL(x.href).pathname)).at(-1); return a ? new URL(a.href).pathname + new URL(a.href).search : null; });
const latest = latestReplay ? new URL(latestReplay, BASE).searchParams.get("session") : null;
const fill = (s) => s.replaceAll("{BAHRAIN_Q}", bahrainQ ?? "(no 2024 Bahrain qualifying key)").replaceAll("{BAHRAIN}", bahrain)
  .replace("{NEXT_BRIEF}", nextBrief ?? "(no brief link on /live)").replace("{LATEST_REPLAY}", latestReplay ?? "(no ▶ on /live)").replace("{LATEST}", latest ?? "0");

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

console.log("\nv5.1 — the replay is a child of its race; the season tab is an index");
{
  await open(`/races/2024/1/replay?session=${bahrain}`);
  await page.waitForSelector("#timing", { timeout: 60000 }).catch(() => {});
  const r = await page.evaluate(() => ({
    panels: document.querySelectorAll("#timing").length,
    selects: [...document.querySelectorAll("#timing header label")].filter((l) => l.textContent.includes("分站")).length,
    sessions: [...document.querySelectorAll('#timing [aria-label="节次"] button')].map((b) => b.textContent.trim()),
    tabs: document.querySelectorAll('nav[aria-label$="赛季"]').length,
    otherRounds: [...document.querySelectorAll("a[href]")].filter((a) => /^\/races\/2024\/(?!1(\/|$))\d+/.test(new URL(a.href).pathname)).length,
    back: [...document.querySelectorAll("#timing a")].some((a) => a.textContent.includes("返回本站档案") && new URL(a.href).pathname === "/races/2024/1"),
  }));
  const errs = [];
  if (r.panels !== 1) errs.push(`${r.panels} timing panels`);
  if (r.selects) errs.push("weekend selector shown");
  if (!r.sessions.includes("正赛") || !r.sessions.includes("排位赛")) errs.push(`sessions: ${r.sessions.join(" ")}`);
  if (r.tabs) errs.push("year tabs on the replay page");
  if (r.otherRounds) errs.push(`${r.otherRounds} links to other 2024 rounds`);
  if (!r.back) errs.push("no 返回本站档案");
  if (errs.length) bad(`/races/2024/1/replay: ${errs.join("; ")}`); else ok(`/races/2024/1/replay: one panel, sessions ${r.sessions.join(" · ")}, no weekend picker, no other rounds`);

  await open("/seasons/2024/replay");
  const i = await page.evaluate(() => ({
    panels: document.querySelectorAll("#timing").length,
    links: new Set([...document.querySelectorAll("a[href]")].map((a) => new URL(a.href).pathname).filter((p) => /^\/races\/2024\/\d+\/replay$/.test(p))).size,
    seasonLinks: [...document.querySelectorAll("a[href]")].filter((a) => /^\/seasons\/\d+\/replay$/.test(new URL(a.href).pathname) && new URL(a.href).search).length,
  }));
  if (i.panels || !i.links) bad(`/seasons/2024/replay: ${i.panels} panels, ${i.links} race replay links`);
  else ok(`/seasons/2024/replay: index of ${i.links} race replay pages, no panel`);
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
