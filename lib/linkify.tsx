import { all } from "./db";
import { zhName } from "./zh";
import { DRIVERS_2026 } from "./assets";
import { GP_ZH } from "./names";
import { drivers as dContent, teams as tContent, circuits as cContent } from "./content";
import { hrefOf, type Kind } from "@/components/entity/EntityLink";
import LinkedParts from "@/components/entity/LinkedParts";
import { type TermDef } from "@/components/entity/Term";
import fs from "node:fs";
import path from "node:path";

let glossary: Record<string, TermDef & { aliases: string[] }> | null = null;
const terms = () => (glossary ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/glossary.json"), "utf8")));

type Target = { kind: Kind | "term"; id: string; href?: string };

let built: { re: RegExp; map: Map<string, Target> } | null = null;
let builtAt = 0;

/** Dictionary of Chinese (and some Latin) names → entity, longest names first. */
function dictionary() {
  if (built && Date.now() - builtAt < 10 * 60e3) return built;
  const map = new Map<string, Target>();
  const add = (k: string | null | undefined, t: Target) => { if (k && k.length >= 2 && !map.has(k)) map.set(k, t); };

  // 「X车队」 is always the team X, even when X is also a driver's surname (斯图尔特车队, 普罗斯特车队, 布拉汉姆车队)
  for (const t of all<any>("select id from constructor where total_race_entries > 0")) {
    const zh = zhName.team(t.id);
    if (zh && !zh.endsWith("车队")) add(`${zh}车队`, { kind: "team", id: t.id });
  }

  // drivers: full Chinese names, then unambiguous surnames (current grid wins ties)
  const drivers = all<any>("select id, last_name, total_race_starts s, total_race_wins w from driver where total_race_entries > 0");
  const surname = new Map<string, string[]>();
  const wins = new Map(drivers.map((d) => [d.id, d.w as number]));
  for (const d of drivers) {
    const zh = zhName.driver(d.id);
    if (!zh) continue;
    add(zh, { kind: "driver", id: d.id });
    const last = zh.split(/[·・]/).pop()!;
    if (last.length >= 2 && last !== zh) surname.set(last, [...(surname.get(last) ?? []), d.id]);
  }
  for (const [id, m] of Object.entries(DRIVERS_2026)) add(m.nameZh, { kind: "driver", id });
  // Surname-only links are risky (詹姆斯·艾利森 the engineer ≠ driver Cliff Allison): only for drivers a reader would
  // plausibly mean by surname alone — current grid, race winners, champions — and never for well-known non-drivers.
  const champs = new Set(all<any>("select distinct driver_id id from season_driver_standing where championship_won = 1").map((r) => r.id));
  const notable = (id: string) => !!DRIVERS_2026[id] || (wins.get(id) ?? 0) >= 1 || champs.has(id);
  const NOT_DRIVERS = new Set(["艾利森", "纽维", "霍纳", "沃尔夫", "布朗", "托德", "埃克莱斯顿", "莫斯利", "多梅尼卡利", "瓦瑟尔", "比诺托", "阿里瓦贝内", "斯特拉", "梅基斯", "科姆斯", "维奥莱", "布里亚托雷", "迪伦西", "钱德勒", "查普曼", "蒂勒尔", "威廉姆斯", "迈凯伦", "法拉利", "恩佐", "索伯", "乔丹", "斯图尔特", "普罗斯特", "布拉汉姆"]);
  for (const [last, ids] of surname) {
    // team-first surnames: on their own they almost always mean the team (布拉汉姆BT46B, 布拉汉姆的皮奎特)
    if (last === "布拉汉姆" || last === "布朗") continue;
    if (NOT_DRIVERS.has(last) && !ids.some((id) => champs.has(id))) continue;
    const current = ids.filter((id) => DRIVERS_2026[id]);
    if (current.length === 1) add(last, { kind: "driver", id: current[0] });
    else if (ids.length === 1) { if (notable(ids[0])) add(last, { kind: "driver", id: ids[0] }); }
    else {
      // famous-name rule: 塞纳 → Ayrton, 舒马赫 → Michael (clear winner by race wins)
      const [a, b] = [...ids].sort((x, y) => (wins.get(y) ?? 0) - (wins.get(x) ?? 0));
      if ((wins.get(a) ?? 0) >= 5 && (wins.get(a) ?? 0) >= 4 * (wins.get(b) ?? 0)) add(last, { kind: "driver", id: a });
    }
  }
  // teams
  const teams = all<any>("select id from constructor where total_race_entries > 0");
  for (const t of teams) {
    const zh = zhName.team(t.id);
    add(zh, { kind: "team", id: t.id });
    if (zh?.endsWith("车队")) add(zh.slice(0, -2), { kind: "team", id: t.id });
  }
  for (const [id, c] of Object.entries(tContent())) add(c.nameZh, { kind: "team", id });
  // circuits: full name and the short form without 赛道 / 国际赛道 / 街道赛道
  for (const c of all<any>("select id from circuit")) {
    const zh = zhName.circuit(c.id);
    add(zh, { kind: "circuit", id: c.id });
    const short = zh?.replace(/(国际)?(街道|市街)?(赛道|赛车场)$/, "");
    if (short && short !== zh && short.length >= 2) add(short, { kind: "circuit", id: c.id });
  }
  for (const [id, c] of Object.entries(cContent())) add(c.nameZh, { kind: "circuit", id });
  for (const [id, d] of Object.entries(dContent())) add(d.nameZh, { kind: "driver", id });

  // spelling variants seen in bios / wiki text
  const ALIAS: Record<string, Target> = {
    "吉尔斯·维伦纽夫": { kind: "driver", id: "gilles-villeneuve" }, "路特斯": { kind: "team", id: "lotus" }, "莲花": { kind: "team", id: "lotus" },
    "梅奔": { kind: "team", id: "mercedes" }, "法拉利车队": { kind: "team", id: "ferrari" }, "迈凯伦车队": { kind: "team", id: "mclaren" },
    "威廉斯": { kind: "team", id: "williams" }, "布朗GP": { kind: "team", id: "brawn" }, "红牛车队": { kind: "team", id: "red-bull" },
  };
  // aliases are hand-checked and win over the generated short forms (e.g. 「莲花」 alone = Team Lotus, not the 2010
  // Lotus Racing whose name happens to shorten to the same word)
  for (const [k, t] of Object.entries(ALIAS)) map.set(k, t);

  // glossary terms (DRS, 光头胎, 地面效应…) — after entities so a team/driver name always wins a tie
  for (const [id, g] of Object.entries(terms()) as [string, TermDef & { aliases: string[] }][]) for (const k of [g.term, ...g.aliases]) if (k.length >= 2 || /^[A-Z]/.test(k)) add(k, { kind: "term", id });

  // never link these generic words even if some short form collides
  for (const w of ["赛道", "车队", "大奖赛", "冠军", "红旗", "安全车", "排位", "正赛"]) map.delete(w);

  const keys = [...map.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // "2008年巴西大奖赛" → that race; "2008年" / "2008赛季" → the season
  const gpAlt = Object.values(GP_ZH).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // 1 "2008年巴西大奖赛" / "1993 年澳大利亚大奖赛" → that race · 2 any standalone season year 1950–2026 (prose lists such as
  // "2018、2024和2025年" or "1999至2004年" link every year; not inside longer numbers, decimals, Latin words like F2002,
  // ISO dates, or measurements like "2000毫米") · 3 a bare "XX大奖赛" (resolved against the sentence / context year)
  // · 4 entity names
  const Y = "(?:19[5-9]\\d|20[01]\\d|202[0-6])";
  const UNIT = "毫米|米|转|公里|千米|公斤|千克|kg|cc|rpm|马力|亿|万|分|圈|场|次|名|位|号|秒|小时|km|个|支|人|匹|台|辆|%";
  const re = new RegExp(`(${Y}\\s?年\\s?(?:${gpAlt})大奖赛)|((?<![\\d.,:/A-Za-z-])${Y}(?![\\d.,]\\d|[\\d]|[-/]\\d|s(?![A-Za-z])|\\s?(?:${UNIT})))|((?:${gpAlt})大奖赛)|(${keys.join("|")})`, "g");
  built = { re, map };
  builtAt = Date.now();
  return built;
}

const gpByZh = () => new Map(Object.entries(GP_ZH).map(([id, zh]) => [zh, id]));
const roundOf = (year: number, gp: string) => all<any>("select round from race where year = ? and grand_prix_id = ?", year, gp)[0]?.round as number | undefined;

/** Turn plain Chinese prose into text with hover-card links for every year / driver / team / circuit / race it mentions. */
/** `skipRace` = "YYYY/R" of the page's own race so it does not link to itself. */
/** `year` = the page / block's year context (user rule: a click lands on the most specific unit): drivers / teams /
 *  circuits open their ?year= slice, and a bare "XX大奖赛" opens that year's race. A year written in the same sentence
 *  ("2008年的首届新加坡大奖赛") wins over the context year for the race. */
export function Linked({ text, skip, skipRace, year }: { text: string; skip?: string; skipRace?: string; year?: number | null }) {
  return <LinkedParts parts={linkParts(text, { skip, skipRace, year })} />;
}

/** One piece of linkified prose: plain text, or a link (`href` set) to an entity / race, or a glossary term. */
export type LinkPart = { t: string; kind?: Kind | "term"; id?: string; href?: string; year?: number | null; term?: TermDef };

/**
 * The tokenizer behind <Linked>, as data — so client components that receive prose from an API (the timing viewer's
 * crib cards) can render the same links (see LinkedParts, which is safe to import client-side via its own file).
 */
export function linkParts(text: string, { skip, skipRace, year }: { skip?: string; skipRace?: string; year?: number | null } = {}): LinkPart[] {
  const { re, map } = dictionary();
  const out: LinkPart[] = [];
  let last = 0, m: RegExpExecArray | null;
  re.lastIndex = 0;
  const seen = new Set<string>();
  let sentenceYear: number | null = null, scan = 0;
  const raceLink = (y: number, gpZh: string, label: string): LinkPart | null => {
    const gp = gpByZh().get(gpZh);
    const r = gp ? roundOf(y, gp) : undefined;
    if (!r || `${y}/${r}` === skipRace || seen.has(`r${y}/${r}`)) return null;
    seen.add(`r${y}/${r}`);
    return { t: label, kind: "race", id: `${y}-${r}`, href: `/races/${y}/${r}` };
  };
  while ((m = re.exec(text))) {
    const [whole, race, yearM, gpBare, name] = m;
    // a sentence boundary since the last match forgets the sentence's year
    if (/[。！？；\n]/.test(text.slice(scan, m.index))) sentenceYear = null;
    scan = m.index + whole.length;
    let node: LinkPart | null = null;
    if (race) {
      const y = +race.slice(0, 4);
      sentenceYear = y;
      node = raceLink(y, race.replace(/^\d{4}\s?年\s?/, "").slice(0, -3), whole);
    } else if (yearM) {
      const y = +yearM;
      sentenceYear = y;
      // each year once per paragraph
      // (`skip` may also be the page's own year, e.g. on its season page)
      if (y >= 1950 && y <= 2026 && yearM !== skip && !seen.has("y" + y)) {
        seen.add("y" + y);
        node = { t: yearM, kind: "year", id: yearM, href: `/seasons/${yearM}` };
      }
    } else if (gpBare) {
      const y = sentenceYear ?? year;
      node = y ? raceLink(y, gpBare.slice(0, -3), whole) : null;
    } else if (name) {
      const t = map.get(name);
      // link each entity once per paragraph, and never the page's own subject
      // Latin terms (DRS, V8…) must not match inside longer words (e.g. "V8" in "V8s", "ERS" in "KERS")
      // a surname glued to "·" is part of SOMEONE ELSE's full name (詹姆斯·艾利森, 托托·沃尔夫) — never link it on its own
      const inFullName = t?.kind === "driver" && !name.includes("·") && (/[·・]/.test(text[m.index - 1] ?? "") || /[·・]/.test(text[m.index + name.length] ?? ""));
      const latinInside = t?.kind === "term" && /^[A-Za-z0-9-]+$/.test(name) && (/[A-Za-z0-9]/.test(text[m.index - 1] ?? "") || /[A-Za-z0-9]/.test(text[m.index + name.length] ?? ""));
      if (t && !latinInside && !inFullName && t.id !== skip && !seen.has(t.kind + t.id)) {
        seen.add(t.kind + t.id);
        node = t.kind === "term"
          ? { t: name, kind: "term", id: t.id, term: terms()[t.id] }
          : { t: name, kind: t.kind, id: t.id, href: year ? `${hrefOf(t.kind, t.id)}?year=${year}` : hrefOf(t.kind, t.id), year };
      }
    }
    if (node) {
      if (m.index > last) out.push({ t: text.slice(last, m.index) });
      out.push(node);
      last = m.index + whole.length;
    }
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

/** Audit helper: every driver link a text would get via a SURNAME (not a full name), with context. */
export function surnameLinks(text: string) {
  const { re, map } = dictionary();
  const out: { name: string; id: string; ctx: string }[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    const name = m[4];
    if (!name) continue;
    const t = map.get(name);
    if (t?.kind !== "driver" || name.includes("·")) continue;
    const glued = /[·・]/.test(text[m.index - 1] ?? "") || /[·・]/.test(text[m.index + name.length] ?? "");
    if (glued) continue;
    out.push({ name, id: t.id, ctx: text.slice(Math.max(0, m.index - 14), m.index + name.length + 10) });
  }
  return out;
}

/** Audit helper (scripts/link-audit.mjs): the entity part of the dictionary — name → kind/id — plus the GP names. */
export function linkDictionary() {
  const { map } = dictionary();
  const entities: Record<string, { kind: string; id: string }> = {};
  for (const [k, t] of map) if (t.kind !== "term") entities[k] = { kind: t.kind, id: t.id };
  return { entities, gps: Object.values(GP_ZH) };
}
