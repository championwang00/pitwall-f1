import l from "./livepage.module.css";
import w from "./weekendresults.module.css";
import type { DoneSession, ResultRow } from "@/lib/live";
import { SESSION_ZH } from "@/lib/openf1";
import { fmtLap } from "./model";
import { PodiumCells, CardAction } from "@/components/ui/RaceCard";
import LocalTime from "@/components/ui/LocalTime";
import Person from "@/components/entity/Person";

/**
 * /live 「本站已结束节次」: this weekend's finished sessions (newest first) with OpenF1's classification — practice = best
 * lap · gap · laps, qualifying = Q1/Q2/Q3 · grid, sprint / race = podium + classification. 「计时回放」 only when OpenF1
 * serves the session's laps (user: 如果不能跳转，你就不要给跳转); not published yet = one quiet 数据整理中 line, no link.
 * Server-rendered; the tabs are CSS-only radios (one block per session, ≥2 sessions → tab bar).
 */
const TOP = 10;
const STATUS_ZH = { DNF: "退赛", DNS: "未起步", DSQ: "取消资格" } as const;

/** 1:47:14.808 / 47:14.808 — race totals (fmtLap covers < 1 h). */
function fmtTotal(sec: number) {
  if (sec < 3600) return fmtLap(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec - h * 3600 - m * 60;
  return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}
const fmtGap = (g: number | string | null) => (g == null ? "" : typeof g === "string" ? g.replace(/^\+?(\d+)\s*laps?$/i, "+$1 圈") : `+${g.toFixed(3)}`);

/** this weekend's finished sessions: classification + 计时回放 when OpenF1 serves it, else 数据整理中 (user: 非实时直播…刚结束…能展示的就展示).
 *  `dark`: rendered inside the black next-race banner it belongs to. */
export default function WeekendResults({ sessions, year, dark }: { sessions: DoneSession[]; year: number; dark?: boolean }) {
  if (!sessions.length) return null;
  const tabs = sessions.length > 1;
  return (
    <section className={`${l.section} ${dark ? w.dark : ""}`} aria-labelledby="wr-title">
      <div className={l.head}>
        <div><p className="kicker">This weekend</p><h2 id="wr-title" className="cn-h2">本站已结束节次</h2></div>
        <span className={l.sub}>成绩来自 OpenF1 · 时间按你所在时区显示</span>
      </div>
      <div className={w.box}>
        {tabs && sessions.map((x, i) => (
          <input key={x.session_key} type="radio" name="wr-tab" id={`wr-${x.session_key}`} className={w.radio} defaultChecked={i === 0} aria-controls={`wr-p-${x.session_key}`} />
        ))}
        {tabs && (
          <div className={w.tabBar}>
            {sessions.map((x) => (
              <label key={x.session_key} htmlFor={`wr-${x.session_key}`} className={w.tab}>
                <b>{SESSION_ZH[x.session_name] ?? x.session_name}</b>
                <span>{x.rows ? "成绩已发布" : "数据整理中"}</span>
              </label>
            ))}
          </div>
        )}
        <div className={w.panels}>
          {sessions.map((x) => <Block key={x.session_key} x={x} year={year} />)}
        </div>
      </div>
    </section>
  );
}

function Block({ x, year }: { x: DoneSession; year: number }) {
  const name = SESSION_ZH[x.session_name] ?? x.session_name;
  const rows = x.rows;
  const hasGrid = x.kind === "quali" && !!rows?.some((r) => r.grid != null);
  const podium = x.kind === "race" && rows
    ? rows.filter((r) => r.pos != null && r.pos <= 3 && r.id).map((r) => ({
        pos: r.pos!, driver: r.id!, code: r.acr, year, color: r.color,
        time: r.pos === 1 ? (r.time != null ? fmtTotal(r.time) : null) : fmtGap(r.gap) || null,
      }))
    : [];
  const leaderLaps = rows?.[0]?.laps ?? null;
  const cls = `${w.table} ${x.kind === "practice" ? w.kPractice : x.kind === "quali" ? (hasGrid ? w.kQualiGrid : w.kQuali) : w.kRace}`;
  return (
    <article id={`wr-p-${x.session_key}`} className={w.panel} aria-label={name}>
      <header className={w.pHead}>
        <div className={w.pTitle}>
          <h3>{name}</h3>
          <span className={w.pWhen}><LocalTime iso={x.date_start} format="date" /> <LocalTime iso={x.date_start} format="weekday" /> <LocalTime iso={x.date_start} format="time" /></span>
        </div>
        {/* a link only when OpenF1 serves this session's laps (the replay page would otherwise open empty) */}
        {x.replay && <span className={w.pAct}><CardAction href={x.replay} icon="play">计时回放</CardAction></span>}
      </header>
      {!rows ? (
        <p className={w.pending}><i aria-hidden />数据整理中 · 通常在节次结束后约 30–60 分钟发布</p>
      ) : (
        <>
          {podium.length > 0 && <div className={w.podium}><PodiumCells podium={podium} /></div>}
          <div className={cls} role="table" aria-label={`${name} 成绩`}>
            <div className={`${w.row} ${w.headRow}`} role="row">
              <span role="columnheader" className={w.cPos}>#</span>
              <span role="columnheader" className={w.cDrv}>车手</span>
              {x.kind === "practice" && <><span role="columnheader" className={w.cT}>最快圈</span><span role="columnheader" className={w.cT}>差距</span></>}
              {x.kind === "quali" && <><span role="columnheader" className={`${w.cT} ${w.qCol}`}>Q1</span><span role="columnheader" className={`${w.cT} ${w.qCol}`}>Q2</span><span role="columnheader" className={`${w.cT} ${w.qCol}`}>Q3</span><span role="columnheader" className={`${w.cT} ${w.qBest}`}>成绩</span>{hasGrid && <span role="columnheader" className={w.cN}>发车</span>}</>}
              {x.kind === "race" && <span role="columnheader" className={w.cT}>用时 / 差距</span>}
              <span role="columnheader" className={`${w.cN} ${w.cLaps}`}>圈数</span>
              {x.kind === "race" && <span role="columnheader" className={w.cN}>积分</span>}
            </div>
            {rows.slice(0, TOP).map((r) => <Row key={r.num} r={r} x={x} year={year} hasGrid={hasGrid} leaderLaps={leaderLaps} />)}
            {rows.length > TOP && (
              <details className={w.more}>
                <summary><span className={w.moreOpen}>显示全部 <b>{rows.length}</b> 名</span><span className={w.moreClose}>收起</span></summary>
                {rows.slice(TOP).map((r) => <Row key={r.num} r={r} x={x} year={year} hasGrid={hasGrid} leaderLaps={leaderLaps} />)}
              </details>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function Row({ r, x, year, hasGrid, leaderLaps }: { r: ResultRow; x: DoneSession; year: number; hasGrid: boolean; leaderLaps: number | null }) {
  const out = r.status ? STATUS_ZH[r.status] : null;
  const fastestQ = (i: number) => r.qGap?.[i] === 0;
  // quali on a phone: the time of the last segment reached, labelled (Q3 1:35.130 / Q1 1:38.600)
  const qi = r.q ? r.q.reduce<number>((a, v, i) => (v != null ? i : a), -1) : -1;
  // a finisher without a gap but laps down (OpenF1 leaves gap_to_leader empty there)
  const lapsDown = !out && r.gap == null && r.pos !== 1 && leaderLaps != null && r.laps != null && r.laps < leaderLaps ? `+${leaderLaps - r.laps} 圈` : "";
  return (
    <div className={`${w.row} ${out ? w.out : ""}`} role="row" style={{ ["--team" as string]: r.color }}>
      <span role="cell" className={`${w.cPos} num`}>{r.pos ?? (r.status === "DSQ" ? "DQ" : "NC")}</span>
      <span role="cell" className={w.cDrv}>
        <i className={w.bar} aria-hidden />
        {r.id
          ? <Person id={r.id} year={year} name={r.zh} latin={r.acr} color={r.color} size={24} className={w.person} />
          : <span className={w.plain}><b>{r.zh}</b> <span className="lat">{r.acr}</span></span>}
      </span>
      {x.kind === "practice" && <>
        <span role="cell" className={`${w.cT} ${r.pos === 1 ? w.purple : ""}`}>{fmtLap(r.time)}</span>
        <span role="cell" className={`${w.cT} ${w.dim}`}>{r.pos === 1 ? "" : fmtGap(r.gap)}</span>
      </>}
      {x.kind === "quali" && <>
        {[0, 1, 2].map((i) => <span key={i} role="cell" className={`${w.cT} ${w.qCol} ${fastestQ(i) ? w.purple : ""} ${r.q?.[i] == null ? w.dim : ""}`}>{r.q?.[i] != null ? fmtLap(r.q[i]) : "—"}</span>)}
        <span role="cell" className={`${w.cT} ${w.qBest}`}>{qi >= 0 ? <><em>Q{qi + 1}</em>{fmtLap(r.q![qi])}</> : out ?? "—"}</span>
        {hasGrid && <span role="cell" className={`${w.cN} num`}>{r.grid ?? "—"}</span>}
      </>}
      {x.kind === "race" && (
        <span role="cell" className={`${w.cT} ${r.pos === 1 ? "" : w.dim}`}>
          {out ? <em className={w.outTxt}>{out}</em> : r.pos === 1 && r.time != null ? fmtTotal(r.time) : fmtGap(r.gap) || lapsDown}
        </span>
      )}
      <span role="cell" className={`${w.cN} ${w.cLaps} num`}>{r.laps ?? "—"}</span>
      {x.kind === "race" && <span role="cell" className={`${w.cN} num`}>{r.points ? r.points : ""}</span>}
    </div>
  );
}
