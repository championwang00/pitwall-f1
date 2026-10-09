/**
 * 「该年的事件」 for unit pages with ?year= (spec §4.1–4.3): curated notes tagged with that year, season storylines that
 * mention the subject, plus a few facts computed from F1DB for that year. Highlights / moments are NOT copied in — they
 * have their own 高光时刻 / 这里发生过 section on the same page (spec §0.8.2).
 * Feeds the existing <TalkingPoints> component so the module keeps its place and look, just switched to the year.
 * `*PeriodTalk` are the same for a period ?from&to (spec §0.7.3).
 */
import { notes, type Note } from "@/lib/content";
import type { Talk } from "@/lib/talk";
import { gpZh, TEAM_ZH, ENGINE_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import type { driverYear, teamYear, circuitYear } from "@/lib/yearData";
import { all, get } from "@/lib/db";
import { circuitRaces, constructorLineage, driverYears, constructorYears } from "@/lib/f1";
import { driverTotals, teamTotals } from "@/lib/hero";
import { inRange, rangeLabel, type Range } from "@/lib/range";

const uniq = (ns: Note[]) => [...new Map(ns.map((n) => [n.title, n])).values()];
const surname = (zh: string | null | undefined) => zh?.split(/[·・]/).pop() ?? null;
const dn = (id: string, name: string) => zhName.driver(id) ?? name;

export function driverYearTalk(id: string, year: number, d: ReturnType<typeof driverYear>): { notes: Note[]; auto: Talk[] } {
  const sn = surname(zhName.driver(id));
  const ns = uniq([
    ...notes.driver(id).filter((n) => n.year === year),
    ...(sn ? notes.season(year).filter((n) => (n.title + n.text).includes(sn)) : []),
  ]);
  const auto: Talk[] = [];
  const l = d.line;
  if (l) {
    // no standing / title / totals here: the hero's 排名 tile and stat row already say it (spec §0.7 R2)
    if (l.first === year) auto.push({ tag: "里程碑", title: "新秀赛季", text: `${year} 年是他的 F1 第一个赛季。` });
    if (l.last === year && !l.live && l.first !== year) auto.push({ tag: "里程碑", title: "最后一个赛季", text: `${year} 年是他 F1 生涯（${l.first}–${l.last}）的最后一个赛季。` });
  }
  if (d.firstWinRound) {
    const r = d.rounds.find((x) => x.round === d.firstWinRound);
    auto.push({ tag: "里程碑", title: "生涯首胜", text: `第 ${d.firstWinRound} 站${r ? ` ${gpZh(r.gp)}` : ""}拿到生涯第一场分站胜利。`, href: `/races/${year}/${d.firstWinRound}` });
  }
  if (d.comeback) {
    const r = d.rounds.find((x) => x.round === d.comeback.round);
    auto.push({ tag: "数字", title: `本季最大逆转：追回 ${d.comeback.grid - d.comeback.pos} 位`, text: `${r ? gpZh(r.gp) : `第 ${d.comeback.round} 站`}从第 ${d.comeback.grid} 位起步，以第 ${d.comeback.pos} 名完赛。`, href: `/races/${year}/${d.comeback.round}` });
  }
  return { notes: ns, auto };
}

export function teamYearTalk(id: string, year: number, t: ReturnType<typeof teamYear>): { notes: Note[]; auto: Talk[] } {
  const name = zhName.team(id) ?? TEAM_ZH[id];
  const ns = uniq([
    ...notes.team(id).filter((n) => n.year === year),
    ...(name ? notes.season(year).filter((n) => (n.title + n.text).includes(name)) : []),
  ]);
  const auto: Talk[] = [];
  const l = t.line;
  // no standing / totals / line-up count: the hero's 排名 · 车手 tiles and stat row already say it (spec §0.7 R2)
  void l;
  const champ = t.drivers.find((d) => d.line?.champ);
  if (champ) auto.push({ tag: "里程碑", title: `${dn(champ.id, champ.name)} 夺得车手冠军`, text: `${year} 年车手世界冠军出自这支车队：${champ.wins} 胜，${champ.line?.points} 分。` });
  return { notes: ns, auto };
}

export function circuitYearTalk(id: string, year: number, races: ReturnType<typeof circuitYear>, nth: number): { notes: Note[]; auto: Talk[] } {
  const ns = uniq([
    ...notes.circuit(id).filter((n) => n.year === year),
    ...notes.season(year).filter((n) => n.circuit === id),
  ]);
  const auto: Talk[] = [];
  for (const r of races) {
    const w = r.podium[0];
    if (!w) continue;
    // station · round · date are the hero's head line; the lap count is the only new fact (spec §0.8.5). The winner's
    // grid slot is on the P1 podium card, the pole in the tiles — no 「冠军从第 N 位起步 / 杆位转化为胜利」 here
    auto.push({ tag: "数字", title: `第 ${nth} 次在这里举办`, text: `${r.laps ?? "—"} 圈。`, href: `/races/${year}/${r.round}` });
  }
  return { notes: ns, auto };
}

/* ───────────── 时期 (?from&to, spec §0.7.3): computed only from the range — never 最近一次 / 下一站 / 现役, no records ───────────── */

const tn = (id: string, name?: string | null) => zhName.team(id) ?? TEAM_ZH[id] ?? name ?? id;
const span = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
const pts = (n: number) => Math.round(n * 10) / 10;
/** a period's curated notes: newest first, at most 16 (season storylines carry their season as `year`) */
const periodNotes = (ns: Note[]) => uniq(ns).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 16);
const seasonNotes = (ys: number[], hit: (n: Note) => boolean) => ys.flatMap((y) => notes.season(y).filter(hit).map((n) => ({ ...n, year: n.year ?? y })));

export function driverPeriodTalk(id: string, r: Range): { notes: Note[]; auto: Talk[] } {
  const sn = surname(zhName.driver(id));
  const ys = driverYears(id).filter((y) => inRange(y, r));
  const ns = periodNotes([
    ...notes.driver(id).filter((n) => n.year != null && inRange(n.year, r)),
    ...(sn ? seasonNotes(ys, (n) => (n.title + n.text).includes(sn)) : []),
  ]);
  const L = rangeLabel(r);
  const t = driverTotals(id, r);
  const auto: Talk[] = [];
  // no totals / titles / best season: the hero's stat row, laurels and 最佳排名 tile already say it (spec §0.7 R2)
  void t; void L;
  // career firsts that fall inside the range (a first podium that is also the first win is said once)
  const firstOf = (cond: string) => get<any>(`select r.year, r.round, r.grand_prix_id gp, rr.grid_position_number grid, rr.position_number pos from race_result rr join race r on r.id = rr.race_id
    where rr.driver_id = ? and ${cond} order by r.year, r.round limit 1`, id);
  const fw = firstOf("rr.position_number = 1"), fp = firstOf("rr.pole_position = 1"), fpod = firstOf("rr.position_number <= 3");
  if (fw && inRange(fw.year, r)) auto.push({ tag: "里程碑", title: `生涯首胜：${fw.year} ${gpZh(fw.gp)}`, text: `第 ${fw.round} 站${gpZh(fw.gp)}${fw.grid ? `从第 ${fw.grid} 位起步，` : ""}拿到生涯第一场分站胜利。`, href: `/races/${fw.year}/${fw.round}`, source: "F1DB" });
  if (fp && inRange(fp.year, r)) auto.push({ tag: "里程碑", title: `生涯首杆：${fp.year} ${gpZh(fp.gp)}`, text: `第 ${fp.round} 站${gpZh(fp.gp)}拿到生涯第一个杆位${fp.pos ? `，正赛第 ${fp.pos} 名` : ""}。`, href: `/races/${fp.year}/${fp.round}`, source: "F1DB" });
  if (fpod && inRange(fpod.year, r) && !(fw && fw.year === fpod.year && fw.round === fpod.round)) auto.push({ tag: "里程碑", title: `生涯首个领奖台：${fpod.year} ${gpZh(fpod.gp)}`, text: `第 ${fpod.round} 站${gpZh(fpod.gp)}以第 ${fpod.pos} 名第一次登上领奖台。`, href: `/races/${fpod.year}/${fpod.round}`, source: "F1DB" });
  const teams = all<any>(`select rr.constructor_id t, min(r.year) a, max(r.year) b from race_result rr join race r on r.id = rr.race_id
    where rr.driver_id = ? and r.year between ? and ? group by rr.constructor_id order by min(r.date)`, id, r.from, r.to);
  if (teams.length > 1) auto.push({ tag: "数字", title: `效力 ${teams.length} 支车队`, text: `${teams.map((x) => `${tn(x.t)}（${span(x.a, x.b)}）`).join("、")}。`, source: "F1DB" });
  return { notes: ns, auto };
}

export function teamPeriodTalk(id: string, r: Range): { notes: Note[]; auto: Talk[] } {
  // a lineage period (Mercedes page, 2009 = Brawn GP): the numbers are the outfit's under its name of that time (as teamPeriod)
  const lin = constructorLineage(id).find((l: any) => l.id !== id && l.year_from <= r.from && (l.year_to ?? 9999) >= r.to);
  const subject: string = lin?.id ?? id;
  const name = zhName.team(id) ?? TEAM_ZH[id];
  const ys = constructorYears(subject).filter((y) => inRange(y, r));
  const ns = periodNotes([
    ...notes.team(id).filter((n) => n.year != null && inRange(n.year, r)),
    ...(name ? seasonNotes(ys, (n) => (n.title + n.text).includes(name)) : []),
  ]);
  const L = rangeLabel(r);
  const t = teamTotals(subject, r);
  const auto: Talk[] = [];
  // no totals / titles / drivers / best season: the hero's stat row, laurels and 车手 · 冠军 tiles already say it (spec §0.7 R2)
  void t; void L;
  const engines = all<any>(`select sec.engine_manufacturer_id e, em.name, min(sec.year) a, max(sec.year) b from season_entrant_constructor sec
    left join engine_manufacturer em on em.id = sec.engine_manufacturer_id where sec.constructor_id = ? and sec.year between ? and ? and sec.engine_manufacturer_id is not null
    group by sec.engine_manufacturer_id order by a`, subject, r.from, r.to);
  if (engines.length > 1) auto.push({ tag: "数字", title: `用过 ${engines.length} 家引擎`, text: `${engines.map((x) => `${ENGINE_ZH[x.e] ?? x.name ?? x.e}（${span(x.a, x.b)}）`).join("、")}。`, source: "F1DB" });
  return { notes: ns, auto };
}

export function circuitPeriodTalk(id: string, r: Range): { notes: Note[]; auto: Talk[] } {
  const rs = circuitRaces(id).filter((x: any) => inRange(x.year, r) && x.winner);
  const ys = [...new Set(rs.map((x: any) => x.year as number))];
  const ns = periodNotes([
    ...notes.circuit(id).filter((n) => n.year != null && inRange(n.year, r)),
    ...seasonNotes(ys, (n) => n.circuit === id),
  ]);
  const L = rangeLabel(r);
  const auto: Talk[] = [];
  if (!rs.length) return { notes: ns, auto };
  // 举办 N 届 is the hero's head line, 夺冠 / 杆位最多 its tiles (spec §0.7 R2)
  // most wins / poles inside the range (only worth saying from 2)
  const top = (key: "winner" | "pole") => {
    const m = new Map<string, { n: number; name: string }>();
    for (const x of rs) if (x[key]) m.set(x[key], { n: (m.get(x[key])?.n ?? 0) + 1, name: x[`${key}Name`] });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  };
  const w = top("winner"), po = top("pole");
  const q = `circuit=${id}&from=${r.from}&to=${r.to}`;
  const fl = get<any>(`select fl.time, fl.driver_id id, d.name, r.year, r.round from fastest_lap fl join race r on r.id = fl.race_id join driver d on d.id = fl.driver_id
    where r.circuit_id = ? and r.year between ? and ? and fl.time_millis is not null order by fl.time_millis limit 1`, id, r.from, r.to);
  if (fl) auto.push({ tag: "数字", title: `最快圈 ${fl.time} · ${fl.year}`, text: `${L} 间这里最快的正赛单圈出自${dn(fl.id, fl.name)}（${fl.year} 年）。`, href: `/races/${fl.year}/${fl.round}`, source: "F1DB" });
  const cb = rs.filter((x: any) => x.winnerGrid).sort((a: any, b: any) => b.winnerGrid - a.winnerGrid)[0];
  if (cb && cb.winnerGrid > 3) auto.push({ tag: "数字", title: `最大逆转：第 ${cb.winnerGrid} 位起步夺冠`, text: `${cb.year} 年，${dn(cb.winner, cb.winnerName)}从第 ${cb.winnerGrid} 位起步赢下这里，是 ${L} 间起步最靠后的冠军。`, href: `/races/${cb.year}/${cb.round}`, source: "F1DB" });
  return { notes: ns, auto };
}
