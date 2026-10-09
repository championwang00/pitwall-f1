/**
 * 「该年的事件」 for unit pages with ?year= (spec §4.1–4.3): curated notes / moments tagged with that year,
 * season storylines that mention the subject, plus a few facts computed from F1DB for that year.
 * Feeds the existing <TalkingPoints> component so the module keeps its place and look, just switched to the year.
 */
import { notes, drivers as dContent, teams as tContent, circuits as cContent, momentsFor, type Note, type Moment } from "@/lib/content";
import type { Talk } from "@/lib/talk";
import { gpZh, TEAM_ZH } from "@/lib/names";
import { zhName } from "@/lib/zh";
import type { driverYear, teamYear, circuitYear } from "@/lib/yearData";

const fromMoment = (m: Moment, tag = "故事线"): Note => ({ tag, title: m.title, text: m.text, year: m.year, gp: m.gp, circuit: m.circuit, sources: m.sources });
const uniq = (ns: Note[]) => [...new Map(ns.map((n) => [n.title, n])).values()];
const surname = (zh: string | null | undefined) => zh?.split(/[·・]/).pop() ?? null;
const dn = (id: string, name: string) => zhName.driver(id) ?? name;

export function driverYearTalk(id: string, year: number, d: ReturnType<typeof driverYear>): { notes: Note[]; auto: Talk[] } {
  const sn = surname(zhName.driver(id));
  const ns = uniq([
    ...notes.driver(id).filter((n) => n.year === year),
    ...(dContent()[id]?.highlights ?? []).filter((m) => m.year === year).map((m) => fromMoment(m)),
    ...(sn ? notes.season(year).filter((n) => (n.title + n.text).includes(sn)) : []),
  ]);
  const auto: Talk[] = [];
  const l = d.line;
  if (l) {
    if (l.champ) auto.push({ tag: "里程碑", title: `${year} 年世界冠军`, text: `以 ${l.points} 分赢得 ${year} 年车手世界冠军，全年 ${l.wins} 场分站胜利、${l.podiums} 次领奖台。`, href: `/seasons/${year}/standings` });
    else if (l.pos) auto.push({ tag: "数字", title: `${l.live ? "目前" : "年终"}车手积分第 ${l.pos}`, text: `${l.starts} 站出赛，${l.points} 分，${l.wins} 胜，${l.podiums} 次领奖台${l.poles ? `，${l.poles} 次杆位` : ""}。最好名次 P${l.best ?? "—"}。` });
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
  for (const m of d.mates.slice(0, 2)) {
    if (m.n < 3) continue;
    auto.push({ tag: "数字", title: `队内对比：${dn(m.id, m.name)}`, text: `同场 ${m.n} 站，正赛名次 ${m.aheadRace}:${m.behindRace}，发车位 ${m.aheadGrid}:${m.behindGrid}。积分 ${l?.points ?? "—"} 对 ${m.line?.points ?? "—"}。` });
  }
  return { notes: ns, auto };
}

export function teamYearTalk(id: string, year: number, t: ReturnType<typeof teamYear>): { notes: Note[]; auto: Talk[] } {
  const name = zhName.team(id) ?? TEAM_ZH[id];
  const ns = uniq([
    ...notes.team(id).filter((n) => n.year === year),
    ...(tContent()[id]?.highlights ?? []).filter((m) => m.year === year).map((m) => fromMoment(m)),
    ...(name ? notes.season(year).filter((n) => (n.title + n.text).includes(name)) : []),
  ]);
  const auto: Talk[] = [];
  const l = t.line;
  if (l?.champ) auto.push({ tag: "里程碑", title: `${year} 年车队冠军`, text: `以 ${l.points} 分赢得车队世界冠军，${l.wins} 场分站胜利${t.oneTwo ? `，其中 ${t.oneTwo} 次包揽前二` : ""}。`, href: `/seasons/${year}/standings` });
  else if (l?.pos) auto.push({ tag: "数字", title: `${l.live ? "目前" : "年终"}车队积分第 ${l.pos}`, text: `${l.races} 站出赛，${l.points} 分，${l.wins} 胜，${l.podiums} 次领奖台${t.oneTwo ? `，${t.oneTwo} 次包揽前二` : ""}。` });
  const champ = t.drivers.find((d) => d.line?.champ);
  if (champ) auto.push({ tag: "里程碑", title: `${dn(champ.id, champ.name)} 夺得车手冠军`, text: `${year} 年车手世界冠军出自这支车队：${champ.wins} 胜，${champ.line?.points} 分。` });
  if (t.drivers.length > 2) auto.push({ tag: "数字", title: `${t.drivers.length} 位车手`, text: `${year} 年共有 ${t.drivers.length} 位车手为这支车队出赛：${t.drivers.map((d) => dn(d.id, d.name)).join("、")}。` });
  return { notes: ns, auto };
}

export function circuitYearTalk(id: string, year: number, races: ReturnType<typeof circuitYear>, nth: number): { notes: Note[]; auto: Talk[] } {
  const ns = uniq([
    ...notes.circuit(id).filter((n) => n.year === year),
    ...(cContent()[id]?.moments ?? []).filter((m) => m.year === year).map((m) => fromMoment(m, "故事线")),
    ...momentsFor({ year, circuit: id }).map((m) => fromMoment(m, "故事线")),
    ...notes.season(year).filter((n) => n.circuit === id),
  ]);
  const auto: Talk[] = [];
  for (const r of races) {
    const w = r.podium[0];
    if (!w) continue;
    auto.push({ tag: "数字", title: `第 ${nth} 次在这里举办`, text: `${gpZh(r.gp)}是 ${year} 年第 ${r.round} 站，${r.laps ?? "—"} 圈。`, href: `/races/${year}/${r.round}` });
    if (w.grid && w.grid > 1) auto.push({ tag: "数字", title: `冠军从第 ${w.grid} 位起步`, text: `${dn(w.id, w.name)}从第 ${w.grid} 位发车赢下比赛${r.pole ? `；杆位是${dn(r.pole.id, r.pole.name)}` : ""}。`, href: `/races/${year}/${r.round}` });
    else if (w.grid === 1) auto.push({ tag: "数字", title: "杆位转化为胜利", text: `${dn(w.id, w.name)}从杆位起步并夺冠。`, href: `/races/${year}/${r.round}` });
  }
  return { notes: ns, auto };
}
