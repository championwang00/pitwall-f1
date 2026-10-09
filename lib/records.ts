import { memo } from "./memo";
/** Record books computed from F1DB for each unit (circuit / driver / team / season). */
import { all, get } from "./db";
import { gpZh, TEAM_ZH } from "./names";
import { drivers as dContent } from "./content";
import { zhName } from "./zh";

export type Rec = { label: string; value: string; who?: string; whoId?: string; when?: string; href?: string };

const zh = (id: string, name: string) => zhName.driver(id) ?? name;
const age = (dob: string, date: string) => {
  const a = (new Date(date).getTime() - new Date(dob).getTime()) / 3.15576e10;
  return `${Math.floor(a)} 岁 ${Math.floor((a % 1) * 365)} 天`;
};
const secs = (ms: number) => (ms >= 60000 ? `${Math.floor(ms / 60000)} 分 ${((ms % 60000) / 1000).toFixed(3)} 秒` : `${(ms / 1000).toFixed(3)} 秒`);

function streak<T>(rows: T[], ok: (r: T) => boolean) {
  let best = 0, cur = 0, end = -1;
  rows.forEach((r, i) => { if (ok(r)) { cur++; if (cur > best) { best = cur; end = i; } } else cur = 0; });
  return { n: best, start: end - best + 1, end };
}

/* ─────────── Circuit ─────────── */
function circuitRecords_(cid: string): Rec[] {
  const out: Rec[] = [];
  const wins = all<any>(
    `select r.year, r.round, r.date, r.grand_prix_id gp, w.driver_id id, d.name, d.date_of_birth dob, w.constructor_id team, w.grid_position_number grid,
       (select gap_millis from race_result where race_id = r.id and position_number = 2) gap
     from race r join race_result w on w.race_id = r.id and w.position_number = 1 join driver d on d.id = w.driver_id
     where r.circuit_id = ? order by r.year, r.round`, cid);
  if (!wins.length) return out;
  const young = [...wins].sort((a, b) => (new Date(a.date).getTime() - new Date(a.dob).getTime()) - (new Date(b.date).getTime() - new Date(b.dob).getTime()));
  const y = young[0], o = young.at(-1)!;
  out.push({ label: "最年轻冠军", value: age(y.dob, y.date), whoId: y.id, who: zh(y.id, y.name), when: String(y.year), href: `/races/${y.year}/${y.round}` });
  out.push({ label: "最年长冠军", value: age(o.dob, o.date), whoId: o.id, who: zh(o.id, o.name), when: String(o.year), href: `/races/${o.year}/${o.round}` });
  const gaps = wins.filter((w) => w.gap != null && w.gap > 0).sort((a, b) => a.gap - b.gap);
  if (gaps.length) {
    const c = gaps[0], f = gaps.at(-1)!;
    out.push({ label: "最小胜差", value: secs(c.gap), whoId: c.id, who: zh(c.id, c.name), when: String(c.year), href: `/races/${c.year}/${c.round}` });
    out.push({ label: "最大胜差", value: secs(f.gap), whoId: f.id, who: zh(f.id, f.name), when: String(f.year), href: `/races/${f.year}/${f.round}` });
  }
  // consecutive wins by the same driver
  let best = { n: 1, id: wins[0].id, name: wins[0].name, from: wins[0].year, to: wins[0].year };
  let cur = { n: 1, id: wins[0].id, from: wins[0].year };
  for (let i = 1; i < wins.length; i++) {
    if (wins[i].id === wins[i - 1].id) { cur.n++; } else cur = { n: 1, id: wins[i].id, from: wins[i].year };
    if (cur.n > best.n) best = { n: cur.n, id: wins[i].id, name: wins[i].name, from: cur.from, to: wins[i].year };
  }
  if (best.n >= 2) out.push({ label: "最长连胜", value: `${best.n} 连胜`, whoId: best.id, who: zh(best.id, best.name), when: `${best.from}–${best.to}`, href: `/drivers/${best.id}` });
  const poles = all<any>(
    `select rr.driver_id id, d.name, count(*) n from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where r.circuit_id = ? and rr.pole_position = 1 group by rr.driver_id order by n desc limit 1`, cid)[0];
  if (poles) out.push({ label: "杆位最多", value: `${poles.n} 次`, whoId: poles.id, who: zh(poles.id, poles.name), href: `/drivers/${poles.id}?circuit=${cid}` });
  const pods = all<any>(
    `select rr.driver_id id, d.name, count(*) n from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where r.circuit_id = ? and rr.position_number <= 3 group by rr.driver_id order by n desc limit 1`, cid)[0];
  if (pods) out.push({ label: "领奖台最多", value: `${pods.n} 次`, whoId: pods.id, who: zh(pods.id, pods.name), href: `/drivers/${pods.id}?circuit=${cid}` });
  const back = [...wins].filter((w) => w.grid).sort((a, b) => b.grid - a.grid)[0];
  if (back) out.push({ label: "最靠后起步的冠军", value: `第 ${back.grid} 位`, whoId: back.id, who: zh(back.id, back.name), when: String(back.year), href: `/races/${back.year}/${back.round}` });
  return out;
}

/* ─────────── Driver ─────────── */
function driverRecords_(id: string): Rec[] {
  const out: Rec[] = [];
  const res = all<any>(
    `select r.year, r.round, r.grand_prix_id gp, rr.position_number pos, rr.grid_position_number grid, rr.points,
       (select gap_millis from race_result where race_id = r.id and position_number = 2) gap2, rr.gap_millis gap
     from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? order by r.year, r.round`, id);
  if (!res.length) return out;
  const w = streak(res, (r) => r.pos === 1);
  if (w.n >= 2) out.push({ label: "最长连胜", value: `${w.n} 场`, when: `${res[w.start].year} ${gpZh(res[w.start].gp)} 起`, href: `/races/${res[w.end].year}/${res[w.end].round}` });
  const p = streak(res, (r) => r.pos != null && r.pos <= 3);
  if (p.n >= 3) out.push({ label: "最长连续领奖台", value: `${p.n} 场`, when: `${res[p.start].year}–${res[p.end].year}`, href: `/races/${res[p.end].year}/${res[p.end].round}` });
  const pts = streak(res, (r) => r.points > 0);
  if (pts.n >= 5) out.push({ label: "最长连续得分", value: `${pts.n} 场`, when: `${res[pts.start].year}–${res[pts.end].year}` });
  const back = res.filter((r) => r.pos === 1 && r.grid).sort((a, b) => b.grid - a.grid)[0];
  if (back && back.grid > 1) out.push({ label: "最靠后起步夺冠", value: `第 ${back.grid} 位`, when: `${back.year} ${gpZh(back.gp)}`, href: `/races/${back.year}/${back.round}` });
  const won = res.filter((r) => r.pos === 1 && r.gap2 != null && r.gap2 > 0);
  if (won.length) {
    const c = [...won].sort((a, b) => a.gap2 - b.gap2)[0], f = [...won].sort((a, b) => b.gap2 - a.gap2)[0];
    out.push({ label: "最险的一胜", value: `领先 ${secs(c.gap2)}`, when: `${c.year} ${gpZh(c.gp)}`, href: `/races/${c.year}/${c.round}` });
    out.push({ label: "最大优势的一胜", value: `领先 ${secs(f.gap2)}`, when: `${f.year} ${gpZh(f.gp)}`, href: `/races/${f.year}/${f.round}` });
  }
  const seasons = all<any>(
    `select r.year, sum(case when rr.position_number = 1 then 1 else 0 end) w, count(*) n, sum(coalesce(rr.points, 0)) pts
     from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? group by r.year order by w desc, pts desc limit 1`, id)[0];
  if (seasons && seasons.w > 0) out.push({ label: "最佳赛季", value: `${seasons.w} 胜 / ${seasons.n} 场`, when: String(seasons.year), href: `/seasons/${seasons.year}?driver=${id}` });
  return out;
}

/* ─────────── Team ─────────── */
function teamRecords_(id: string): Rec[] {
  const out: Rec[] = [];
  const seasons = all<any>(
    `select r.year, count(distinct r.id) n, sum(case when rr.position_number = 1 then 1 else 0 end) w,
       sum(case when rr.pole_position = 1 then 1 else 0 end) poles
     from race_result rr join race r on r.id = rr.race_id where rr.constructor_id = ? group by r.year`, id);
  const dom = [...seasons].filter((s) => s.w).sort((a, b) => b.w / b.n - a.w / a.n)[0];
  if (dom) out.push({ label: "统治力最强的赛季", value: `${dom.w}/${dom.n} 胜（${Math.round((100 * dom.w) / dom.n)}%）`, when: String(dom.year), href: `/seasons/${dom.year}?team=${id}` });
  const pol = [...seasons].sort((a, b) => b.poles - a.poles)[0];
  if (pol?.poles) out.push({ label: "单季杆位最多", value: `${pol.poles} 次`, when: String(pol.year), href: `/seasons/${pol.year}?team=${id}` });
  const oneTwo = all<any>(
    `select r.year, count(*) n from race r where exists (select 1 from race_result a where a.race_id = r.id and a.position_number = 1 and a.constructor_id = ?)
       and exists (select 1 from race_result b where b.race_id = r.id and b.position_number = 2 and b.constructor_id = ?) group by r.year order by n desc limit 1`, id, id)[0];
  if (oneTwo) out.push({ label: "单季一二名最多", value: `${oneTwo.n} 次`, when: String(oneTwo.year), href: `/seasons/${oneTwo.year}?team=${id}` });
  const topD = all<any>(
    `select rr.driver_id did, d.name, count(*) n from race_result rr join driver d on d.id = rr.driver_id where rr.constructor_id = ? and rr.position_number = 1 group by rr.driver_id order by n desc limit 1`, id)[0];
  if (topD) out.push({ label: "为车队赢得最多", value: `${topD.n} 胜`, whoId: topD.did, who: zh(topD.did, topD.name), href: `/drivers/${topD.did}?team=${id}` });
  const mostStarts = all<any>(
    `select rr.driver_id did, d.name, count(*) n from race_result rr join driver d on d.id = rr.driver_id where rr.constructor_id = ? group by rr.driver_id order by n desc limit 1`, id)[0];
  if (mostStarts) out.push({ label: "为车队出赛最多", value: `${mostStarts.n} 场`, whoId: mostStarts.did, who: zh(mostStarts.did, mostStarts.name), href: `/drivers/${mostStarts.did}?team=${id}` });
  const first = get<any>(
    `select r.year, r.round, r.grand_prix_id gp, d.name, rr.driver_id did from race_result rr join race r on r.id = rr.race_id join driver d on d.id = rr.driver_id
     where rr.constructor_id = ? and rr.position_number = 1 order by r.year, r.round limit 1`, id);
  if (first) out.push({ label: "第一场胜利", value: `${first.year} ${gpZh(first.gp)}`, whoId: first.did, who: zh(first.did, first.name), href: `/races/${first.year}/${first.round}` });
  return out;
}

/* ─────────── Season ─────────── */
function seasonRecords_(year: number): Rec[] {
  const out: Rec[] = [];
  const wins = all<any>(
    `select r.round, r.date, r.grand_prix_id gp, w.driver_id id, d.name, d.date_of_birth dob, w.grid_position_number grid,
       (select gap_millis from race_result where race_id = r.id and position_number = 2) gap, w.pole_position pole
     from race r join race_result w on w.race_id = r.id and w.position_number = 1 join driver d on d.id = w.driver_id where r.year = ? order by r.round`, year);
  if (!wins.length) return out;
  const g = wins.filter((w) => w.gap != null && w.gap > 0).sort((a, b) => a.gap - b.gap);
  if (g.length) {
    out.push({ label: "最小胜差", value: secs(g[0].gap), whoId: g[0].id, who: zh(g[0].id, g[0].name), when: gpZh(g[0].gp), href: `/races/${year}/${g[0].round}` });
    out.push({ label: "最大胜差", value: secs(g.at(-1)!.gap), whoId: g.at(-1)!.id, who: zh(g.at(-1)!.id, g.at(-1)!.name), when: gpZh(g.at(-1)!.gp), href: `/races/${year}/${g.at(-1)!.round}` });
  }
  const byAge = [...wins].sort((a, b) => (new Date(a.date).getTime() - new Date(a.dob).getTime()) - (new Date(b.date).getTime() - new Date(b.dob).getTime()));
  out.push({ label: "最年轻的分站冠军", value: age(byAge[0].dob, byAge[0].date), whoId: byAge[0].id, who: zh(byAge[0].id, byAge[0].name), when: gpZh(byAge[0].gp), href: `/races/${year}/${byAge[0].round}` });
  out.push({ label: "最年长的分站冠军", value: age(byAge.at(-1)!.dob, byAge.at(-1)!.date), whoId: byAge.at(-1)!.id, who: zh(byAge.at(-1)!.id, byAge.at(-1)!.name), when: gpZh(byAge.at(-1)!.gp), href: `/races/${year}/${byAge.at(-1)!.round}` });
  const conv = wins.filter((w) => w.pole).length;
  out.push({ label: "杆位转化率", value: `${conv}/${wins.length}`, when: `${Math.round((100 * conv) / wins.length)}% 的比赛由杆位车手赢下` });
  let best = { n: 1, id: wins[0].id, name: wins[0].name, from: wins[0].round, to: wins[0].round }, cur = { n: 1, from: wins[0].round };
  for (let i = 1; i < wins.length; i++) {
    if (wins[i].id === wins[i - 1].id) cur.n++; else cur = { n: 1, from: wins[i].round };
    if (cur.n > best.n) best = { n: cur.n, id: wins[i].id, name: wins[i].name, from: cur.from, to: wins[i].round };
  }
  if (best.n >= 2) out.push({ label: "本季最长连胜", value: `${best.n} 连胜`, whoId: best.id, who: zh(best.id, best.name), when: `第 ${best.from}–${best.to} 站`, href: `/drivers/${best.id}` });
  return out;
}

export { TEAM_ZH };

export const circuitRecords = memo(circuitRecords_);
export const driverRecords = memo(driverRecords_);
export const teamRecords = memo(teamRecords_);
export const seasonRecords = memo(seasonRecords_);