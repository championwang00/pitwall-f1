import { memo } from "./memo";
/**
 * Commentator talking points computed straight from F1DB — every number here is reproducible from the database.
 * Curated, web-verified notes live in content/notes.*.json and are merged in the UI.
 */
import { all, get } from "./db";
import { gpZh, TEAM_ZH } from "./names";
import { drivers as dContent, circuits as cContent } from "./content";
import { zhName } from "./zh";

export type Talk = { tag: string; title: string; text: string; href?: string; source?: string };

const zh = (id: string, name: string) => zhName.driver(id) ?? name;
const tz = (id: string, name?: string) => zhName.team(id) ?? TEAM_ZH[id] ?? name ?? id;
const ord = (n: number) => `第 ${n} 位`;
const cname = (id: string) => cContent()[id]?.nameZh ?? get<any>("select name from circuit where id = ?", id)?.name ?? id;

function currentYear() {
  return get<any>("select max(year) y from race where exists (select 1 from race_result rr where rr.race_id = race.id)")!.y as number;
}
function grid2026() {
  const y = currentYear();
  return new Set(all<any>("select distinct driver_id id from season_entrant_driver where year = ? and test_driver = 0", y).map((r) => r.id));
}
export function nextRaceRow() {
  return get<any>("select * from race r where not exists (select 1 from race_result rr where rr.race_id = r.id) order by r.date limit 1");
}

/* ─────────────── Circuit ─────────────── */
function circuitTalk_(cid: string): Talk[] {
  const out: Talk[] = [];
  const races = all<any>(
    `select r.id, r.year, r.round, r.grand_prix_id gp, w.driver_id wid, d.name wname, d.nationality_country_id wnat, w.constructor_id wteam, w.grid_position_number wgrid,
       (select driver_id from race_result where race_id = r.id and pole_position = 1) pole,
       (select count(*) from race_result where race_id = r.id and position_number is null) dnf,
       (select count(*) from race_result where race_id = r.id) starters
     from race r join race_result w on w.race_id = r.id and w.position_number = 1 join driver d on d.id = w.driver_id
     where r.circuit_id = ? order by r.year desc, r.round desc`, cid);
  if (!races.length) return out;
  const country = get<any>("select country_id from circuit where id = ?", cid)?.country_id;
  const last = races[0];
  out.push({
    tag: "最近一次", title: `${last.year} 年：${zh(last.wid, last.wname)}夺冠`,
    text: `上一次在这里比赛是 ${last.year} 年${gpZh(last.gp)}，${zh(last.wid, last.wname)}驾驶${tz(last.wteam)}赛车从${last.wgrid ? ord(last.wgrid) : "后方"}起步获胜${last.pole && last.pole !== last.wid ? "，杆位没能转化为胜利" : last.wgrid === 1 ? "，杆位顺利转化" : ""}；${last.dnf ? `全场 ${last.dnf} 人未完赛` : "全员完赛"}。`,
    href: `/races/${last.year}/${last.round}`, source: "F1DB",
  });
  // most wins (driver / team)
  const dw = new Map<string, { n: number; name: string }>();
  const tw = new Map<string, number>();
  for (const r of races) { dw.set(r.wid, { n: (dw.get(r.wid)?.n ?? 0) + 1, name: r.wname }); tw.set(r.wteam, (tw.get(r.wteam) ?? 0) + 1); }
  const topD = [...dw.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  const topT = [...tw.entries()].sort((a, b) => b[1] - a[1])[0];
  out.push({ tag: "纪录", title: `胜场王：${zh(topD[0], topD[1].name)} ${topD[1].n} 胜`, text: `${races.length} 场正赛里，${zh(topD[0], topD[1].name)}在这里赢得最多（${topD[1].n} 次）；车队方面是${tz(topT[0])}，共 ${topT[1]} 胜。`, href: `/circuits/${cid}?view=driver`, source: "F1DB" });
  // active drivers who have won here
  const grid = grid2026();
  const active = [...dw.entries()].filter(([id]) => grid.has(id)).sort((a, b) => b[1].n - a[1].n);
  if (active.length) out.push({ tag: "现役", title: `现役车手中有 ${active.length} 人在此赢过`, text: active.map(([id, v]) => `${zh(id, v.name)} ${v.n} 胜`).join("、") + "。其余现役车手还没有在这里赢过。", href: `/circuits/${cid}`, source: "F1DB" });
  else out.push({ tag: "现役", title: "现役车手无人在此赢过", text: "目前在役的车手里，还没有人在这条赛道拿过正赛冠军——这一站必然诞生一位新的“此地冠军”。", source: "F1DB" });
  // pole conversion in the last 10
  const recent = races.slice(0, 10);
  const conv = recent.filter((r) => r.pole && r.pole === r.wid).length;
  out.push({ tag: "数字", title: `杆位转化 ${conv}/${recent.length}`, text: `最近 ${recent.length} 场里，杆位车手有 ${conv} 次最终夺冠${conv / recent.length >= 0.6 ? "，排位赛几乎决定一半以上的结果" : conv / recent.length <= 0.3 ? "，在这里排位领先并不可靠" : ""}。`, source: "F1DB" });
  // (no 最大逆转 here: the 纪录簿 beside it has 最靠后起步的冠军 — spec §0.8.5)
  // retirements
  const r5 = races.slice(0, 5);
  const avgDnf = r5.reduce((a, r) => a + r.dnf, 0) / Math.max(1, r5.length);
  out.push({ tag: "数字", title: `近 5 场平均 ${avgDnf.toFixed(1)} 人退赛`, text: `最近 5 场平均每场有 ${avgDnf.toFixed(1)} 辆车未能完赛${avgDnf >= 3 ? "，事故与安全车的概率不低" : "，完赛率较高"}。`, source: "F1DB" });
  // distinct winners
  const distinct = new Set(recent.map((r) => r.wid)).size;
  out.push({ tag: "数字", title: `近 ${recent.length} 场 ${distinct} 位不同冠军`, text: distinct >= 7 ? "冠军更替频繁，这里很少出现连霸。" : `冠军相对集中：${[...new Set(recent.map((r) => zh(r.wid, r.wname)))].slice(0, 3).join("、")}等人反复在这里获胜。`, source: "F1DB" });
  // home winner
  if (country) {
    const home = races.find((r) => r.wnat === country);
    out.push(home
      ? { tag: "冷知识", title: `上一位本土冠军：${home.year} 年`, text: `上一次有本国车手在这里夺冠是 ${home.year} 年的${zh(home.wid, home.wname)}。`, href: `/races/${home.year}/${home.round}`, source: "F1DB" }
      : { tag: "冷知识", title: "从未有本土车手在此夺冠", text: `在这条赛道举办的 ${races.length} 场正赛中，还没有一位本国车手赢过。`, source: "F1DB" });
  }
  return out;
}

/* ─────────────── Driver ─────────────── */
function driverTalk_(id: string): Talk[] {
  const out: Talk[] = [];
  const d = get<any>("select * from driver where id = ?", id);
  if (!d) return out;
  const res = all<any>(
    `select r.id, r.year, r.round, r.grand_prix_id gp, r.circuit_id circuit, rr.position_number pos, rr.position_text pt, rr.grid_position_number grid, rr.constructor_id team, rr.points
     from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? order by r.year, r.round`, id);
  if (!res.length) return out;
  const last = res.at(-1)!;
  out.push({ tag: "最近一次", title: `上一场：${gpZh(last.gp)} ${last.pos ? "P" + last.pos : last.pt}`, text: `${last.year} 年${gpZh(last.gp)}，${last.grid ? `从${ord(last.grid)}起步，` : ""}${last.pos ? `最终第 ${last.pos}` : "未能完赛"}${last.points ? `，拿到 ${last.points} 分` : ""}。`, href: `/races/${last.year}/${last.round}`, source: "F1DB" });
  // milestones
  const starts = res.length, wins = res.filter((r) => r.pos === 1).length, pods = res.filter((r) => r.pos && r.pos <= 3).length;
  const nextRound = (n: number, step: number) => Math.ceil((n + 1) / step) * step;
  const ms: string[] = [];
  const sm = nextRound(starts, 50); if (sm - starts <= 3) ms.push(`再出赛 ${sm - starts} 场就是生涯第 ${sm} 场`);
  if (pods >= 5) { const pm = nextRound(pods, pods >= 100 ? 50 : 10); if (pm - pods <= 3) ms.push(`再 ${pm - pods} 个领奖台达到 ${pm} 个`); }
  if (wins >= 1) { const wm = nextRound(wins, wins >= 50 ? 10 : 5); if (wm - wins <= 2) ms.push(`再赢 ${wm - wins} 场就是第 ${wm} 胜`); }
  if (ms.length) out.push({ tag: "里程碑", title: ms[0], text: `生涯 ${starts} 场出赛、${wins} 胜、${pods} 个领奖台。${ms.join("；")}。`, source: "F1DB" });
  // last win
  const lw = [...res].reverse().find((r) => r.pos === 1);
  if (lw && res.length - 1 - res.lastIndexOf(lw) > 0) {
    const since = res.length - 1 - res.lastIndexOf(lw);
    out.push({ tag: "最近一次", title: since === 0 ? "上一场就是冠军" : `最近一胜已过去 ${since} 场`, text: `最近一次夺冠是 ${lw.year} 年${gpZh(lw.gp)}${since ? `，之后 ${since} 场还没有再赢` : ""}。`, href: `/races/${lw.year}/${lw.round}`, source: "F1DB" });
  } else if (!lw && starts >= 10) {
    const best = Math.min(...res.filter((r) => r.pos).map((r) => r.pos));
    out.push({ tag: "数字", title: `${starts} 场仍在等首胜`, text: `生涯最好成绩是第 ${best} 名${pods ? `，有 ${pods} 个领奖台` : "，还没有登上过领奖台"}。`, source: "F1DB" });
  }
  // season & team-mate H2H (current season)
  const y = currentYear();
  const season = res.filter((r) => r.year === y);
  if (season.length) {
    const st = get<any>("select s.position_number pos, s.points from race_driver_standing s join race r on r.id = s.race_id where r.year = ? and s.driver_id = ? order by r.round desc limit 1", y, id);
    const team = season.at(-1)!.team;
    const mate = get<any>("select rr.driver_id id, d.name from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id where r.year = ? and rr.constructor_id = ? and rr.driver_id != ? group by rr.driver_id order by count(*) desc limit 1", y, team, id);
    if (mate) {
      const both = all<any>(
        `select a.position_number ap, b.position_number bp, qa.position_number aq, qb.position_number bq from race r
         join race_result a on a.race_id = r.id and a.driver_id = ? join race_result b on b.race_id = r.id and b.driver_id = ?
         left join race_data qa on qa.race_id = r.id and qa.type = 'QUALIFYING_RESULT' and qa.driver_id = ?
         left join race_data qb on qb.race_id = r.id and qb.type = 'QUALIFYING_RESULT' and qb.driver_id = ?
         where r.year = ?`, id, mate.id, id, mate.id, y);
      // official convention: a missing / disqualified qualifying result counts as behind; both missing is not counted
      const rA = both.filter((b) => (b.ap ?? 99) < (b.bp ?? 99)).length;
      const qBoth = both.filter((b) => b.aq || b.bq);
      const qA = qBoth.filter((b) => (b.aq ?? 99) < (b.bq ?? 99)).length;
      const qN = qBoth.length;
      out.push({ tag: "故事线", title: `队内对比 正赛 ${rA}:${both.length - rA} · 排位 ${qA}:${qN - qA}`, text: `${y} 年与队友${zh(mate.id, mate.name)}同场 ${both.length} 次：正赛名次领先 ${rA} 次，排位领先 ${qA} 次。${st ? `目前车手榜第 ${st.pos}，${st.points} 分。` : ""}`, href: `/compare?a=${id}&b=${mate.id}`, source: "F1DB" });
    }
  }
  // next venue record
  const nr = nextRaceRow();
  if (nr && grid2026().has(id)) {
    const here = res.filter((r) => r.circuit === nr.circuit_id);
    const circ = { name: cname(nr.circuit_id) };
    if (here.length) {
      const bestHere = here.filter((r) => r.pos).sort((a, b) => a.pos - b.pos)[0];
      const winsHere = here.filter((r) => r.pos === 1).length;
      const lastHere = here.at(-1)!;
      out.push({ tag: "下一站", title: `在${circ?.name}：${winsHere ? `${winsHere} 胜` : bestHere ? `最好第 ${bestHere.pos}` : "从未完赛"}`, text: `${here.length} 次在这里出赛，${winsHere ? `赢过 ${winsHere} 次，` : ""}${bestHere ? `最好成绩第 ${bestHere.pos}（${bestHere.year}）` : "还没有完赛记录"}；上一次（${lastHere.year}）${lastHere.pos ? `获得第 ${lastHere.pos}` : "未完赛"}。`, href: `/circuits/${nr.circuit_id}?driver=${id}`, source: "F1DB" });
    } else {
      out.push({ tag: "下一站", title: `首次在${circ?.name}出赛`, text: `下一站${gpZh(nr.grand_prix_id)}将是他第一次在这条赛道参加正赛。`, href: `/circuits/${nr.circuit_id}`, source: "F1DB" });
    }
  }
  // (no 「最擅长：X」: the hero's 最擅长赛道 tile says it — spec §0.8.3)
  // first win age
  const fw = res.find((r) => r.pos === 1);
  if (fw) {
    const date = get<any>("select date from race where id = ?", fw.id)?.date;
    const age = (new Date(date).getTime() - new Date(d.date_of_birth).getTime()) / 3.15576e10;
    out.push({ tag: "冷知识", title: `首胜时 ${Math.floor(age)} 岁`, text: `第一场胜利是 ${fw.year} 年${gpZh(fw.gp)}，生涯第 ${res.indexOf(fw) + 1} 场出赛，当时 ${Math.floor(age)} 岁 ${Math.floor((age % 1) * 365)} 天。`, href: `/races/${fw.year}/${fw.round}`, source: "F1DB" });
  }
  return out;
}

/* ─────────────── Team ─────────────── */
function teamTalk_(id: string): Talk[] {
  const out: Talk[] = [];
  const res = all<any>(
    `select r.id, r.year, r.round, r.grand_prix_id gp, r.circuit_id circuit, min(coalesce(rr.position_number, 99)) best, max(rr.pole_position) pole, sum(coalesce(rr.points, 0)) pts
     from race_result rr join race r on r.id = rr.race_id where rr.constructor_id = ? group by r.id order by r.year, r.round`, id);
  if (!res.length) return out;
  const last = res.at(-1)!;
  out.push({ tag: "最近一次", title: `上一场最好名次 ${last.best === 99 ? "无人完赛" : "P" + last.best}`, text: `${last.year} 年${gpZh(last.gp)}，车队最好成绩第 ${last.best === 99 ? "—" : last.best}，拿到 ${last.pts} 分。`, href: `/races/${last.year}/${last.round}`, source: "F1DB" });
  const lw = [...res].reverse().find((r) => r.best === 1);
  if (lw && res.length - 1 - res.lastIndexOf(lw) > 0) { const since = res.length - 1 - res.lastIndexOf(lw); out.push({ tag: "最近一次", title: since ? `距上一胜 ${since} 场` : "上一场就是冠军", text: `最近一次分站冠军是 ${lw.year} 年${gpZh(lw.gp)}${since ? `，之后 ${since} 场未胜` : ""}。`, href: `/races/${lw.year}/${lw.round}`, source: "F1DB" }); }
  else if (!lw) out.push({ tag: "数字", title: `${res.length} 场仍在等首胜`, text: `车队目前最好成绩第 ${Math.min(...res.map((r) => r.best))} 名。`, source: "F1DB" });
  const lp = [...res].reverse().find((r) => r.pole === 1);
  if (lp) out.push({ tag: "最近一次", title: `最近杆位：${lp.year} ${gpZh(lp.gp).replace("大奖赛", "")}`, text: `车队最近一次拿到杆位是 ${lp.year} 年${gpZh(lp.gp)}。`, href: `/races/${lp.year}/${lp.round}`, source: "F1DB" });
  // longest winning streak
  let best = 0, cur = 0, end: any = null;
  for (const r of res) { if (r.best === 1) { cur++; if (cur > best) { best = cur; end = r; } } else cur = 0; }
  if (best >= 3) out.push({ tag: "纪录", title: `最长连胜 ${best} 场`, text: `在车队参加的比赛中，最长连胜是 ${best} 场，止于 ${end.year} 年${gpZh(end.gp)}。`, href: `/races/${end.year}/${end.round}`, source: "F1DB" });
  // standings now
  const y = currentYear();
  const st = all<any>("select s.constructor_id team, s.position_number pos, s.points from race_constructor_standing s join race r on r.id = s.race_id where r.year = ? and r.round = (select max(round) from race r2 where r2.year = ? and exists (select 1 from race_constructor_standing x where x.race_id = r2.id)) order by s.position_display_order", y, y);
  const me = st.find((s) => s.team === id);
  if (me) {
    const ahead = st.find((s) => s.pos === me.pos - 1), behind = st.find((s) => s.pos === me.pos + 1);
    out.push({ tag: "故事线", title: `车队榜第 ${me.pos}，${me.points} 分`, text: `${ahead ? `落后第 ${ahead.pos} 名${tz(ahead.team)} ${ahead.points - me.points} 分` : "领跑车队榜"}${behind ? `，领先第 ${behind.pos} 名${tz(behind.team)} ${me.points - behind.points} 分` : ""}。`, href: `/seasons/${y}`, source: "F1DB" });
  }
  // next venue
  const nr = nextRaceRow();
  if (nr && me) {
    const here = res.filter((r) => r.circuit === nr.circuit_id);
    const w = here.filter((r) => r.best === 1).length;
    const circ = cname(nr.circuit_id);
    if (here.length) out.push({ tag: "下一站", title: `在${circ}：${w} 胜`, text: `车队在${circ}出赛 ${here.length} 场，${w ? `赢过 ${w} 次` : "还没赢过"}${here.at(-1) ? `；上一次最好名次第 ${here.at(-1)!.best === 99 ? "—" : here.at(-1)!.best}（${here.at(-1)!.year}）` : ""}。`, href: `/circuits/${nr.circuit_id}?team=${id}`, source: "F1DB" });
  }
  // milestone race count
  const n = res.length, m = Math.ceil((n + 1) / 100) * 100;
  if (m - n <= 5) out.push({ tag: "里程碑", title: `即将迎来第 ${m} 场比赛`, text: `车队已出赛 ${n} 场，再 ${m - n} 场就是第 ${m} 场。`, source: "F1DB" });
  return out;
}

/* ─────────────── Season ─────────────── */
function seasonTalk_(year: number): Talk[] {
  const out: Talk[] = [];
  const wins = all<any>(
    `select rr.driver_id id, d.name, count(*) n from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where r.year = ? and rr.position_number = 1 group by rr.driver_id order by n desc`, year);
  if (!wins.length) return out;
  const races = get<any>("select count(*) n from race where year = ?", year)!.n;
  const done = get<any>("select count(*) n from race r where year = ? and exists (select 1 from race_result rr where rr.race_id = r.id and rr.position_number = 1)", year)!.n;
  // (no 「N 位不同的分站冠军」: the hero's 分站 / 车手冠军 tiles say it — spec §0.8.7)
  const decider = get<any>("select round, grand_prix_id gp from race where year = ? and drivers_championship_decider = 1", year);
  if (decider) out.push({ tag: "纪录", title: decider.round === races ? "冠军悬念留到最后一站" : `第 ${decider.round} 站提前决出冠军`, text: `车手总冠军在${gpZh(decider.gp)}${decider.round === races ? "——赛季最后一场——" : `（全年 ${races} 站中的第 ${decider.round} 站）`}尘埃落定。`, href: `/races/${year}/${decider.round}`, source: "F1DB" });
  // first-time winners
  const firsts = all<any>(
    `select rr.driver_id id, d.name, r.round, r.grand_prix_id gp from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where r.year = ? and rr.position_number = 1 and not exists (
       select 1 from race_result x join race rx on rx.id = x.race_id where x.driver_id = rr.driver_id and x.position_number = 1 and (rx.year < r.year or (rx.year = r.year and rx.round < r.round)))
     order by r.round`, year);
  if (firsts.length) out.push({ tag: "故事线", title: `${firsts.length} 位车手拿下生涯首胜`, text: firsts.map((f) => `${zh(f.id, f.name)}（${gpZh(f.gp)}）`).join("、") + "。", href: `/races/${year}/${firsts[0].round}`, source: "F1DB" });
  // biggest comeback win
  const cb = get<any>(
    `select rr.driver_id id, d.name, rr.grid_position_number grid, r.round, r.grand_prix_id gp from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where r.year = ? and rr.position_number = 1 and rr.grid_position_number is not null order by rr.grid_position_number desc limit 1`, year);
  if (cb && cb.grid > 3) out.push({ tag: "纪录", title: `本季最大逆转：第 ${cb.grid} 位起步夺冠`, text: `${zh(cb.id, cb.name)}在${gpZh(cb.gp)}从${ord(cb.grid)}起步赢下比赛。`, href: `/races/${year}/${cb.round}`, source: "F1DB" });
  // team dominance
  const tw = all<any>("select rr.constructor_id team, count(*) n from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.position_number = 1 group by rr.constructor_id order by n desc", year);
  if (tw[0]) out.push({ tag: "数字", title: `${tz(tw[0].team)}赢下 ${Math.round((100 * tw[0].n) / done)}% 的比赛`, text: `${tw.length} 支车队分享了分站冠军，${tz(tw[0].team)}以 ${tw[0].n} 胜居首。`, href: `/teams/${tw[0].team}`, source: "F1DB" });
  // poles
  const poles = all<any>("select rr.driver_id id, d.name, count(*) n from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id where r.year = ? and rr.pole_position = 1 group by rr.driver_id order by n desc limit 1", year);
  if (poles[0]) out.push({ tag: "数字", title: `杆位王：${zh(poles[0].id, poles[0].name)} ${poles[0].n} 次`, text: `本季拿到最多杆位的是${zh(poles[0].id, poles[0].name)}，共 ${poles[0].n} 次。`, href: `/drivers/${poles[0].id}`, source: "F1DB" });
  return out;
}

/* ─────────────── Race ─────────────── */
function raceTalk_(raceId: number): Talk[] {
  const out: Talk[] = [];
  const r = get<any>("select * from race where id = ?", raceId);
  const res = all<any>("select rr.*, d.name from race_result rr join driver d on d.id = rr.driver_id where rr.race_id = ? order by rr.position_display_order", raceId);
  if (!r || !res.length) return out;
  // (no 「杆位转化为胜利 / 冠军从第 N 位起步」: the winner panel and the result table's grid column say it — spec §0.8.9)
  const climber = res.filter((x) => x.grid_position_number && x.position_number).map((x) => ({ ...x, gain: x.grid_position_number - x.position_number })).sort((a, b) => b.gain - a.gain)[0];
  if (climber && climber.gain >= 5) out.push({ tag: "纪录", title: `${zh(climber.driver_id, climber.name)}追回 ${climber.gain} 位`, text: `从${ord(climber.grid_position_number)}起步，最终第 ${climber.position_number}，是本场名次提升最多的车手。`, href: `/drivers/${climber.driver_id}`, source: "F1DB" });
  const dnf = res.filter((x) => !x.position_number).length;
  out.push({ tag: "数字", title: `${res.length} 人起步，${res.length - dnf} 人完赛`, text: dnf ? `${dnf} 辆车未能完赛。` : "全员完赛。", source: "F1DB" });
  // first win / first podium
  for (const x of res.filter((x) => x.position_number && x.position_number <= 3)) {
    const prev = get<any>(
      `select count(*) n from race_result rr join race rx on rx.id = rr.race_id where rr.driver_id = ? and rr.position_number <= ? and (rx.year < ? or (rx.year = ? and rx.round < ?))`,
      x.driver_id, x.position_number === 1 ? 1 : 3, r.year, r.year, r.round)!.n;
    if (prev === 0) out.push({ tag: "里程碑", title: `${zh(x.driver_id, x.name)}${x.position_number === 1 ? "生涯首胜" : "首个领奖台"}`, text: `这是${zh(x.driver_id, x.name)}在 F1 的${x.position_number === 1 ? "第一场胜利" : "第一个领奖台"}。`, href: `/drivers/${x.driver_id}`, source: "F1DB" });
  }
  return out;
}

export const circuitTalk = memo(circuitTalk_);
export const driverTalk = memo(driverTalk_);
export const teamTalk = memo(teamTalk_);
export const seasonTalk = memo(seasonTalk_);
export const raceTalk = memo(raceTalk_);