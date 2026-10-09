# Cross-link / people / honours spec (user request, 2026-10-09)

User asks (verbatim intent):
1. 车手、年份、赛道、车队 四个基础单元：所有页面里一旦出现，都必须能跳转到对应页面；hover 时弹出简单介绍卡（类似 F1 维基百科）。
2. 展示人的地方：能用「图片 + 人名」就用图片加人名，不要只有名字，也不要只有图片。
3. 冠军、奖项、荣誉：用对应颜色 + 月桂（laurel）徽章表达。

## Building blocks (already built — do NOT modify them; report back if you need a change)

- `components/entity/EntityLink.tsx` (client) — `<EntityLink kind="driver|team|circuit|year" id="..." className="ilink" href?>` → Next Link + hover preview card (fetches `/api/preview/[kind]/[id]`). `href` override lets a year-kind link point at `/races/Y/R` while still previewing the season. `hrefOf(kind,id)` helper.
- Global class `.ilink` (app/globals.css) = quiet underline for inline links in prose / tables. For links that already have their own visual style (cards, chips, big titles), pass your own className instead.
- `components/entity/Person.tsx` — `<Person id name latin? size=28 sub? className? plain?/>` → round face (`/api/face/[id]?s=` — official bust for 2026 grid, Wikipedia photo for historic drivers, initials badge fallback) + name (+ latin + sub), wrapped in EntityLink. Use `plain` when already inside a link.
- `components/entity/Laurel.tsx` — `<Laurel tone="gold|silver|bronze|red|purple|ink|white" size={40} top="7 届" bottom="世界冠军" />`, `<LaurelRow>` for a row of them. Colours: gold = 世界冠军/冠军/P1, silver = P2/车队冠军 runner-up style honours, bronze = P3, purple = 最快圈/纪录, red = 杆位 or F1-red honours, white on dark heroes when gold contrasts badly (prefer gold).
- `lib/linkify.tsx` (server only) — `<Linked text="..." skip="page-subject-id"/>` auto-links Chinese prose: driver full names + unambiguous surnames, team names, circuit names, `YYYY年XX大奖赛` → race page, `YYYY年/赛季` → season. Use it on every prose string (bios, talking points text, moments, anecdotes, notes, wiki summaries, era summaries). It is a SERVER component: in client components pass pre-rendered nodes as props instead.
- Names: always `zhName.driver(id) / zhName.team(id) / zhName.circuit(id)` from `lib/zh.ts` with Latin fallback (so "Jacques Villeneuve" becomes "雅克·维伦纽夫").

## Hard rules

- NO nested `<a>`. If a whole card/row is currently a `<Link>`, restructure: make the card a `div`, link its title (or add a small "→" link) and turn the inner driver/team/circuit/year mentions into EntityLink/Person. Table rows: link cells, not the row.
- Every visible mention of a driver/team/circuit/year (titles, table cells, chips, captions, stat labels like "Sergio Pérez · 2024") must be a link with hover card — except the page's own subject in its own hero title.
- People lists/tables/cards: Person (face + name). Keep tables compact: size 22–28 in tables, 36–48 in cards.
- Keep the existing visual language (F1 official look, Formula1 display font for Latin numbers, Titillium data font, CJK font). Don't redesign layouts beyond what's needed.
- Do not restart / kill the dev server (http://localhost:3210, already running with HMR). Don't run `next build` (it would clobber .next used by dev).
- Verify: `npx tsc --noEmit -p .` clean; `curl -s -o /dev/null -w "%{http_code}"` 200 for your pages (try several ids/years incl. 1950s, 1990s, 2026); screenshot with `node scripts/shot.mjs <url> <scratch>/x.png 1440 0 1600 3000` and LOOK at it; check no hydration/console errors with `node scripts/console.mjs <url>` if useful.
