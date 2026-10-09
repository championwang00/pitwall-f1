# Commentator notes spec (解说要点)

Goal: things a TV commentator can say on air the moment they open a page — recent, surprising, specific, and verified.
Read content/SPEC.md first: the same verification rules apply (every item cites ≥1 page you actually fetched this session; cross-check every number/date/position against F1DB at /Users/chaopiwang/Desktop/F1/data/f1db.db; F1DB covers 1950 → 2026 round 16, Oct 4 2026). If unsure, drop it.

Also read the existing curated files so you DON'T duplicate them: content/drivers.*.json (highlights/anecdotes), content/teams.json, content/circuits.json (moments). Notes must add new angles.

## Item shape
{ "tag": "最近一次" | "故事线" | "纪录" | "里程碑" | "冷知识" | "数字",
  "title": "≤18 个汉字，像解说员的一句开场",
  "text": "40–120 字，口语化但准确，可直接念出来",
  "year": 2025 | null, "gp": "<F1DB grand_prix id or null>", "circuit": "<F1DB circuit id or null>",
  "sources": [{ "label": "…", "url": "https://…" }] }

Tags:
- 最近一次: what happened the last time(s) — e.g. last year's race at this circuit, the driver's/team's last race, last win.
- 故事线: an ongoing narrative in the 2026 season (title fight, team-mate battle, contract news, comeback, slump) — only if verified on a page dated 2026.
- 纪录 / 里程碑: records and upcoming milestones (e.g. "再一个领奖台就是第 100 个").
- 冷知识: surprising but true trivia.
- 数字: one striking number explained.

Write concise Simplified Chinese, mainland transliterations (维斯塔潘, 汉密尔顿, 勒克莱尔, 诺里斯, 皮亚斯特里, 拉塞尔, 安东内利 …). No hype words, no emoji, no exclamation marks.
Validate JSON at the end: node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'));console.log('ok')"
File format: { "<id>": [Item, …] }
