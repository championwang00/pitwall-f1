# Curated content spec (shared by all research agents)

All files are JSON, UTF-8, Simplified Chinese prose. Keys are F1DB ids (see below).
F1DB SQLite (authoritative stats, 1950 → 2026 round 16): /Users/chaopiwang/Desktop/F1/_data_raw/f1db/f1db.db
Query it with Node 22 built-in sqlite, e.g.:

    export PATH=/Users/chaopiwang/.nvm/versions/node/v22.22.3/bin:$PATH
    node --no-warnings -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/Users/chaopiwang/Desktop/F1/_data_raw/f1db/f1db.db',{readOnly:true});console.log(db.prepare(\"select * from driver where id='ayrton-senna'\").get())"

Useful tables: driver, constructor, chassis, engine, circuit, race (id, year, round, grand_prix_id, circuit_id), race_result (race_id, driver_id, constructor_id, position_text, grid_position_number, reason_retired ...), season_driver_standing, season_entrant_driver, season_entrant_chassis, grand_prix.

## Verification rules (strict)
- Every highlight / anecdote / moment MUST cite >= 1 source page that you actually opened in this session (WebFetch) and that states the claim. Preferred: en.wikipedia.org, formula1.com, fia.com, bbc.co.uk/sport, autosport.com, the-race.com, motorsport.com, espn.com, official team sites.
- Cross-check every number (wins, poles, ages, years, positions) against F1DB when F1DB has it. If the sources disagree, drop the claim.
- No rumours, no quotes you can't find verbatim, no "据说". If unsure → leave it out. Fewer, solid items beat many shaky ones.
- Your training data may be stale for 2025–2026. For anything after mid-2025, only include it if you verified it on a fetched page; otherwise skip.
- Write concise, factual, journalistic Chinese. No hype words (传奇般的/史诗级/神级), no emoji, no exclamation marks. Use mainland transliterations commonly used by Chinese F1 media (维斯塔潘, 汉密尔顿, 勒克莱尔, 诺里斯, 皮亚斯特里, 拉塞尔, 安东内利, 阿隆索, 塞纳, 舒马赫 ...).
- `title` ≤ 16 Chinese characters; `text` 50–130 characters.

## Item shapes
Source:  { "label": "Wikipedia · 2008 Brazilian Grand Prix", "url": "https://en.wikipedia.org/wiki/2008_Brazilian_Grand_Prix" }
Moment (year-anchored, links into the race grid):
  { "year": 2008, "gp": "<grand_prix_id or null>", "circuit": "<circuit_id or null>", "title": "...", "text": "...", "sources": [Source] }
  gp / circuit must be real F1DB ids for the race that year (check the race table). Use null for non-race items (e.g. signing with a team).
Anecdote (not tied to a single race): { "title": "...", "text": "...", "sources": [Source] }

## Files
- content/drivers.<batch>.json   { "<driver_id>": { "nameZh", "nameEn", "tagline", "bio", "highlights": [Moment], "anecdotes": [Anecdote] } }
- content/teams.json             { "<constructor_id>": { "nameZh", "nameEn", "base", "founded", "tagline", "bio", "highlights": [Moment], "anecdotes": [Anecdote] } }
- content/cars.json              { "<chassis_id>": { "nameEn", "year", "constructor", "designers": ["..."], "summary", "tech": [{ "label", "value" }], "innovations": ["..."], "record", "sources": [Source] } }
- content/regulations.json       { "eras": [{ "id", "years": [from, to], "title", "summary", "keyRules": ["..."], "sources": [Source] }], "y2026": { "summary", "specs": [{ "label", "value" }], "sources": [Source] } }
- content/circuits.json          { "<circuit_id>": { "nameZh", "nameEn", "tagline", "summary", "traits": ["..."], "moments": [Moment] } }

Validate before finishing:
  node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'));console.log('ok')"
