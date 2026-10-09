// Usage: node scripts/hero-check.mjs [base=http://localhost:3210]
// IA spec v6 §0.6.2 「互通」 + P0-22, adapted to the user's 4-tile hero (the connection slot is a row of tiles, each
// `[data-hero-tile="<label>"]`; the line above them is `[data-hero-line="head"]`). One fact said on one object page must
// be found, from the other side, on the related object pages — data is shared, so any mismatch is a regression.
//   1  driver@Y 「车队 / 赛车」 ⇔ team@Y 「车手 / 赛车」 ⇔ car 「车队 / 车手」            (3 groups)
//   2  circuit@Y 「冠军 / 冠军车队 / 冠军赛车」 ⇔ race 「冠军 / 车队 / 赛车」 ⇔ the season calendar's card for that round
//   3  season@Y 「车手冠军」 ⇔ driver@Y 「排名」 has the 世界冠军 laurel ⇔ team@Y 「排名」 names him ⇔ car 「战绩」 车手冠军
// plus: the overview / year / period states, a single pole sitter, and the old text lines are gone from the code.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.argv[2] ?? "http://localhost:3210";
const b = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem("pitwall-grid-ready", "yes"); } catch {} });
let fails = 0;
const ok = (m) => console.log("  \x1b[32m✓\x1b[0m " + m);
const bad = (m) => { fails++; console.log("  \x1b[31m✗\x1b[0m " + m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));
const cache = new Map();

/** tiles + head + title of a page: { title, cx, head, tiles: { label: { text, name, sub[], laurel } } } */
async function hero(path) {
  if (cache.has(path)) return cache.get(path);
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForSelector("[data-hero]", { timeout: 60000 }).catch(() => {});
  const r = await p.evaluate(() => {
    const root = document.querySelector("[data-hero]");
    const t = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const tiles = {};
    for (const el of root?.querySelectorAll("[data-hero-tile]") ?? []) {
      const nameEl = el.querySelector('[class*="tName"], [class*="tBig"]');
      tiles[el.getAttribute("data-hero-tile")] = {
        text: t(el), name: t(nameEl), href: (el.closest("a") ?? el.querySelector("a"))?.getAttribute("href") ?? null, sub: [...el.querySelectorAll('[class*="tSub"]')].map(t),
        laurel: t(el.querySelector('[class*="tLaurel"]')), faces: el.querySelectorAll('img[class*="tFace"]').length,
      };
    }
    return { kind: root?.getAttribute("data-hero"), title: t(root?.querySelector("h1")), cx: t(root?.querySelector(".cx")), head: t(root?.querySelector('[data-hero-line="head"]')), tiles };
  });
  await p.close();
  cache.set(path, r);
  return r;
}
const short = (zh) => zh.split(/[·・]/).pop().trim();
const has = (s, x) => !!s && !!x && s.includes(x);

console.log("1 · driver@Y ⇔ team@Y ⇔ car");
for (const [d, t, car, y] of [["max-verstappen", "red-bull", "red-bull-rb22", 2026], ["lewis-hamilton", "mclaren", "mclaren-mp4-23", 2008], ["kimi-antonelli", "mercedes", "mercedes-f1-w17", 2026]]) {
  const D = await hero(`/drivers/${d}?year=${y}`), Tm = await hero(`/teams/${t}?year=${y}`), C = await hero(`/cars/${car}`);
  const dn = short(D.cx), tn = Tm.cx;
  check(D.tiles["车队"]?.name === tn, `${d}@${y} 车队 「${D.tiles["车队"]?.name}」 = ${t}@${y} 「${tn}」`);
  check(has(Tm.tiles["车手"]?.text, dn), `${t}@${y} 车手 「${Tm.tiles["车手"]?.name}」 ∋ ${dn}`);
  check(D.tiles["赛车"]?.name === Tm.tiles["赛车"]?.name && D.tiles["赛车"]?.name === C.title, `赛车 driver 「${D.tiles["赛车"]?.name}」 = team 「${Tm.tiles["赛车"]?.name}」 = /cars/${car} 「${C.title}」`);
  check(C.tiles["车队"]?.name === tn, `/cars/${car} 车队 「${C.tiles["车队"]?.name}」 = ${tn}`);
  check(has(C.tiles["车手"]?.text, dn), `/cars/${car} 车手 「${C.tiles["车手"]?.name}」 ∋ ${dn}`);
  check(has(D.head, String(y)), `${d}@${y} head 「${D.head}」 names ${y}`);
}

console.log("2 · circuit@Y ⇔ race ⇔ season calendar");
for (const [c, y, r, gp] of [["suzuka", 2026, 3, "日本"], ["monza", 2024, 16, "意大利"], ["jeddah", 2024, 2, "沙特"]]) {
  const Ci = await hero(`/circuits/${c}?year=${y}`), R = await hero(`/races/${y}/${r}`);
  const w = Ci.tiles["冠军"]?.name;
  check(!!w && w === R.tiles["冠军"]?.name, `${c}@${y} 冠军 「${w}」 = /races/${y}/${r} 「${R.tiles["冠军"]?.name}」`);
  check(Ci.tiles["冠军车队"]?.name === R.tiles["车队"]?.name, `冠军车队 「${Ci.tiles["冠军车队"]?.name}」 = 车队 「${R.tiles["车队"]?.name}」`);
  check(Ci.tiles["冠军赛车"]?.name === R.tiles["赛车"]?.name, `冠军赛车 「${Ci.tiles["冠军赛车"]?.name}」 = 赛车 「${R.tiles["赛车"]?.name}」`);
  check(Ci.tiles["杆位"]?.faces === 1 && R.tiles["杆位"]?.faces === 1, `杆位 = exactly one face (circuit ${Ci.tiles["杆位"]?.faces}, race ${R.tiles["杆位"]?.faces})`);
  check(has(Ci.head, `第 ${r} 站`), `${c}@${y} head 「${Ci.head}」 → 第 ${r} 站`);
  // the season calendar's card for that round names the same winner
  const p = await ctx.newPage();
  await p.goto(`${BASE}/seasons/${y}/calendar`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForTimeout(1500);
  const wid = (Ci.tiles["冠军"]?.href ?? "").split("/drivers/")[1]?.split("?")[0] ?? "?";
  const cal = await p.evaluate(([href, id]) => {
    // the round's card (closest <li>) shows the winner: a link to him or his face
    for (const x of document.querySelectorAll(`a[href="${href}"]`)) {
      const li = x.closest("li"); if (!li) continue;
      if (li.querySelector(`a[href^="/drivers/${id}"], img[src*="/api/face/${id}"]`)) return true;
    }
    return false;
  }, [`/races/${y}/${r}`, wid]);
  await p.close();
  check(cal, `/seasons/${y}/calendar 第 ${r} 站 card shows the winner (${wid})`);
}

console.log("3 · season champion ⇔ driver@Y ⇔ team@Y ⇔ car");
for (const [y, d, t, car] of [[2021, "max-verstappen", "red-bull", "red-bull-rb16b"], [2008, "lewis-hamilton", "mclaren", "mclaren-mp4-23"], [2009, "jenson-button", "brawn", "brawn-bgp-001"]]) {
  const S = await hero(`/seasons/${y}`), D = await hero(`/drivers/${d}?year=${y}`), Tm = await hero(`/teams/${t}?year=${y}`), C = await hero(`/cars/${car}`);
  const champ = S.tiles["车手冠军"]?.name;
  check(champ === D.cx, `/seasons/${y} 车手冠军 「${champ}」 = /drivers/${d} 「${D.cx}」`);
  check(D.tiles["排名"]?.laurel.includes("世界冠军") && D.tiles["排名"]?.name === "P1", `${d}@${y} 排名 「${D.tiles["排名"]?.name} ${D.tiles["排名"]?.laurel}」`);
  check(Tm.tiles["排名"]?.sub.some((s) => s.includes(`车手冠军 ${short(D.cx)}`)), `${t}@${y} 排名 「${Tm.tiles["排名"]?.sub.join(" / ")}」 ∋ 车手冠军 ${short(D.cx)}`);
  check(has(C.tiles["战绩"]?.text, "冠军"), `/cars/${car} 战绩 「${C.tiles["战绩"]?.laurel} ${C.tiles["战绩"]?.name}」 shows the title`);
}

console.log("4 · states: overview ≠ year; period");
{
  const O = await hero("/drivers/max-verstappen"), Y = await hero("/drivers/max-verstappen?year=2026");
  check(O.head.startsWith("总览") && Y.head.startsWith("2026"), `driver head: overview 「${O.head}」 / year 「${Y.head}」`);
  check(!!O.tiles["世界冠军"] && !!O.tiles["代表赛车"] && !!O.tiles["最擅长赛道"] && !!Y.tiles["赛车"] && !!Y.tiles["排名"], `driver tiles: overview ${Object.keys(O.tiles).join("·")} / year ${Object.keys(Y.tiles).join("·")}`);
  const C = await hero("/circuits/suzuka");
  check(["夺冠最多", "杆位最多", "最成功车队", "圈速纪录"].every((k) => C.tiles[k]), `circuit overview tiles ${Object.keys(C.tiles).join("·")}`);
  const T = await hero("/teams/red-bull");
  check(["冠军", "传奇车手", "代表赛车", "最擅长赛道"].every((k) => T.tiles[k]), `team overview tiles ${Object.keys(T.tiles).join("·")}`);
  const P = await hero("/teams/mercedes?from=2009&to=2009");
  check(P.head.includes("布朗GP时期") && P.tiles["前身"]?.name === "布朗GP", `team period head 「${P.head}」 前身 「${P.tiles["前身"]?.name}」`);
  const DP = await hero("/drivers/kimi-antonelli?from=2025&to=2026");
  check(DP.head.includes("时期") && !!DP.tiles["代表赛车"] && !!DP.tiles["战绩"], `driver period head 「${DP.head}」 tiles ${Object.keys(DP.tiles).join("·")}`);
}

console.log("5 · old text lines migrated");
const left = execSync(`grep -rn "u\\.yLine\\|k\\.dek\\|y\\.dek\\|e\\.rulers" app components || true`, { encoding: "utf8" }).trim();
check(!left, left ? `old lines still used:\n${left}` : "grep u.yLine | k.dek | y.dek | e.rulers → 0");

await b.close();
console.log(fails ? `\n${fails} failed` : "\nall green");
process.exit(fails ? 1 : 0);
