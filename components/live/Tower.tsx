"use client";

import { COMPOUND } from "./names";
import { fmtLap, type Kind, type Row } from "./model";
import s from "./live.module.css";

/** model.ts renders lapped gaps as "+1 圈"; F1 live timing says "+1 LAP". */
const lapGap = (g: string) => g.replace(/^\+(\d+) 圈$/, (_, n) => `+${n} LAP${n === "1" ? "" : "S"}`);

export default function Tower({ rows, kind, a, b, onPick }: { rows: Row[]; kind: Kind; a: number | null; b: number | null; onPick: (n: number) => void }) {
  const race = kind === "race";
  // DOM order stays fixed (by car number) so each row can glide to its new slot with a transform transition
  const byNum = [...rows].sort((x, y) => x.num - y.num);
  const slot = new Map(rows.map((r, i) => [r.num, i]));
  return (
    <div className={s.tower} aria-label="计时塔">
      <div className={`${s.tRow} ${s.tHead}`}>
        <span className={s.cPos}>#</span>
        <span />
        <span className={s.cDrv}>车手</span>
        {race ? (<><span className={s.cNum}>差距</span><span className={`${s.cNum} ${s.cInt}`}>间隔</span></>) : (<><span className={s.cNum}>最快圈</span><span className={`${s.cNum} ${s.cInt}`}>差距</span></>)}
        <span className={s.cNum}>上一圈</span>
        <span className={s.cTyre}>轮胎</span>
        <span className={s.cPit}>{race ? "进站" : "圈"}</span>
      </div>
      <div className={s.tBody} style={{ height: `calc(var(--row-h) * ${rows.length})` }}>
        {byNum.map((r) => {
          const i = slot.get(r.num)!;
          const comp = r.compound ? COMPOUND[r.compound] : null;
          const tag = r.num === a ? "A" : r.num === b ? "B" : null;
          return (
            <button
              key={r.num}
              type="button"
             
              className={`${s.tRow} ${s.tCar} ${tag ? s.tSel : ""} ${r.out ? s.tOut : ""}`}
              style={{ transform: `translateY(calc(var(--row-h) * ${i}))`, ["--team" as string]: r.d.color }}
              onClick={() => onPick(r.num)}
              title={`${r.d.name} · ${r.d.team}`}
            >
              <span className={`${s.cPos} num`}><em className={tag === "A" ? s.posA : tag === "B" ? s.posB : undefined} title={tag ? `对比车手 ${tag}` : undefined}>{r.pos}</em></span>
              <span className={s.cBar} />
              <span className={s.cDrv}>
                <b className="lat">{r.d.acr}</b>
                {r.fastest && <i className={s.flDot} title="当前最快圈" />}
              </span>
              {race ? (
                <>
                  <span className={s.cNum}>{r.out ? <em className={s.outTxt}>退赛</em> : i === 0 ? <em className={s.leadTxt}>领跑</em> : lapGap(r.gap)}</span>
                  <span className={`${s.cNum} ${s.cInt} ${s.dimNum}`}>{r.out || i === 0 ? "" : lapGap(r.int)}</span>
                </>
              ) : (
                <>
                  <span className={`${s.cNum} ${r.prevPhase ? s.faint : ""}`}><span className={r.bestIsFastest ? s.purple : undefined}>{fmtLap(r.best?.dur)}</span></span>
                  <span className={`${s.cNum} ${s.cInt} ${s.dimNum}`}>{lapGap(r.gap)}</span>
                </>
              )}
              <span className={`${s.cNum} ${r.lastIsFastest ? s.purple : r.lastIsPb ? s.pb : s.dimNum}`}>{r.last ? fmtLap(r.last.dur) : "—"}</span>
              <span className={s.cTyre}>
                {comp && (
                  <>
                    <i className={`${s.tyre} lat`} style={{ ["--tc" as string]: comp.c }} title={comp.zh}>{comp.l}</i>
                    <span className="num">{r.tyreAge ?? ""}</span>
                  </>
                )}
              </span>
              <span className={s.cPit}>{r.inPit && !r.out ? <em className={s.pitBadge} title="正在维修区">P</em> : race ? r.pits || "" : r.lap || ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
