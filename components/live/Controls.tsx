"use client";

import { useRef, useState } from "react";
import { Clock, useClockMeta, useClockT } from "./clock";
import { fmtClock, fmtTrackTime, leaderLap, trackStatus, type Model, type Status } from "./model";
import Icon from "@/components/ui/Icon";
import s from "./live.module.css";

const SPEEDS = [1, 4, 16, 60];

export const STATUS_ZH: Record<Status["kind"], string> = {
  SC: "安全车", VSC: "虚拟安全车", RED: "红旗", CHEQ: "方格旗", YELLOW: "黄旗", GREEN: "绿旗", PRE: "赛前",
};

export function StatusChip({ st }: { st: Status }) {
  return (
    <span className={`${s.status} ${s["st_" + st.kind]}`}>
      <i />{STATUS_ZH[st.kind]}{st.kind === "YELLOW" && st.sectors.length ? <small className="num"> 赛段 {st.sectors.slice(0, 4).join("·")}{st.sectors.length > 4 ? "…" : ""}</small> : null}
    </span>
  );
}

/** Lap counter + flag state, drawn over the track. */
export function Hud({ model, clock }: { model: Model; clock: Clock }) {
  const t = useClockT(clock, 4);
  const lap = leaderLap(model, t);
  const st = trackStatus(model, t);
  const phase = model.phases.filter((p) => p.start <= t).pop();
  return (
    <div className={s.hud}>
      {model.kind === "race" ? (
        <p className={s.hudLap}><span>圈</span><b className="num">{Math.max(0, Math.min(lap, model.totalLaps))}</b><i className="num">/ {model.totalLaps}</i></p>
      ) : (
        <p className={s.hudLap}><span>{phase ? "阶段" : "圈"}</span><b className="num">{phase ? phase.name : lap}</b></p>
      )}
      <StatusChip st={st} />
    </div>
  );
}

export function Controls({ model, clock, live, onGoLive }: { model: Model; clock: Clock; live: boolean; onGoLive: () => void }) {
  const t = useClockT(clock, 12);
  const meta = useClockMeta(clock);
  const ref0 = model.raceStart ?? model.phases[0]?.start ?? model.t0 + 60e3;
  return (
    <div className={s.controls}>
      <div className={s.ctlRow}>
        <button type="button" className={s.playBtn} onClick={() => clock.toggle()} aria-label={meta.playing ? "暂停" : "播放"}>
          <Icon name={meta.playing ? "pause" : "play"} size={18} />
        </button>
        <button type="button" className={s.ghostBtn} onClick={() => clock.seek(clock.t0)} title="回到开头">
          <Icon name="step-backward" size={16} />
          <span>从头</span>
        </button>
        <div className="seg" role="group" aria-label="回放速度">
          {SPEEDS.map((v) => (
            <button key={v} type="button" className={`num ${meta.speed === v ? "on" : ""}`} onClick={() => clock.setSpeed(v)}>{v}×</button>
          ))}
        </div>
        <div className={s.readout}>
          <span>{model.kind === "race" ? "比赛用时" : "会话用时"}</span>
          <b>{fmtClock(t - ref0)}</b>
        </div>
        <div className={s.readout}>
          <span>当地时间</span>
          <b>{fmtTrackTime(t, model.session.gmt_offset)}</b>
        </div>
        {live && (
          meta.follow
            ? <span className={s.liveChip}><i />直播中 · 延迟约 6 秒</span>
            : <button type="button" className={`${s.ghostBtn} ${s.goLive}`} onClick={onGoLive}><i />回到实时</button>
        )}
      </div>
      <Scrubber model={model} clock={clock} t={t} />
    </div>
  );
}

/** 5-minute ticks (labelled every 10) measured from the session's reference start. */
function minuteTicks(ref0: number, t0: number, t1: number) {
  const out: { t: number; major: boolean; label: string }[] = [];
  const step = 5 * 60e3;
  for (let k = Math.ceil((t0 - ref0) / step); ref0 + k * step <= t1; k++) {
    if (k <= 0) continue;
    const min = k * 5;
    out.push({ t: ref0 + k * step, major: min % 10 === 0, label: `${min}′` });
  }
  return out;
}

function Scrubber({ model, clock, t }: { model: Model; clock: Clock; t: number }) {
  const bar = useRef<HTMLDivElement>(null);
  const [hov, setHov] = useState<{ x: number; t: number } | null>(null);
  const drag = useRef(false);
  const { t0, t1 } = clock;
  const span = Math.max(1, t1 - t0);
  const pct = (x: number) => `${(((x - t0) / span) * 100).toFixed(3)}%`;
  const at = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { x: f * r.width, t: t0 + f * span };
  };
  const every = model.totalLaps > 40 ? 10 : 5;
  const lapAt = (x: number) => leaderLap(model, x);
  const ref0 = model.raceStart ?? model.phases[0]?.start ?? model.t0 + 60e3;

  return (
    <div
      className={s.scrub}
      ref={bar}
      role="slider"
      tabIndex={0}
      aria-label="回放进度"
      aria-valuemin={0}
      aria-valuemax={Math.round(span / 1000)}
      aria-valuenow={Math.round((t - t0) / 1000)}
      aria-valuetext={fmtClock(t - ref0)}
      onPointerDown={(e) => { drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); clock.seek(at(e.clientX).t); }}
      onPointerMove={(e) => { const p = at(e.clientX); setHov(p); if (drag.current) clock.seek(p.t); }}
      onPointerUp={() => { drag.current = false; }}
      onPointerLeave={() => setHov(null)}
      onKeyDown={(e) => {
        const k = e.shiftKey ? 60e3 : 10e3;
        if (e.key === "ArrowRight") { clock.seek(clock.t + k); e.preventDefault(); }
        else if (e.key === "ArrowLeft") { clock.seek(clock.t - k); e.preventDefault(); }
        else if (e.key === "Home") { clock.seek(t0); e.preventDefault(); }
        else if (e.key === "End") { clock.seek(t1); e.preventDefault(); }
        else if (e.key === " ") { clock.toggle(); e.preventDefault(); }
      }}
    >
      <div className={s.scrubTrack}>
        {model.periods.map((p, i) => (
          <span key={i} className={`${s.scrubBand} ${s["sb_" + p.kind]}`} style={{ left: pct(Math.max(t0, p.start)), width: `${((Math.min(t1, p.end) - Math.max(t0, p.start)) / span) * 100}%` }} title={p.kind === "RED" ? "红旗" : p.kind === "SC" ? "安全车" : "虚拟安全车"} />
        ))}
        {model.phases.map((p, k) => (
          <span key={`${p.name}-${k}`} className={s.scrubPhase} style={{ left: pct(p.start), width: `${((p.end - p.start) / span) * 100}%` }} />
        ))}
        <span className={s.scrubFill} style={{ width: pct(t) }} />
      </div>
      <div className={s.scrubTicks} aria-hidden>
        {model.kind === "race" && model.lapStarts.map((l) => (
          <span key={l.n} className={l.n % every === 0 || l.n === 1 ? s.tickMajor : s.tick} style={{ left: pct(l.t) }}>
            {(l.n % every === 0 || l.n === 1) && <b className="num">{l.n === 1 ? "L1" : l.n}</b>}
          </span>
        ))}
        {model.kind !== "race" && minuteTicks(ref0, t0, t1).map((m) => (
          <span key={m.t} className={m.major ? s.tickMajor : s.tick} style={{ left: pct(m.t) }}>
            {m.major && !model.phases.some((p) => Math.abs(p.start - m.t) < span * 0.04) && <b className="num">{m.label}</b>}
          </span>
        ))}
        {model.phases.map((p, k) => (
          <span key={`${p.name}-${k}`} className={s.tickPhase} style={{ left: pct(p.start) }}><b className="num">{p.name}</b></span>
        ))}
        {model.chequer && model.kind === "race" && <span className={s.chequer} style={{ left: pct(model.chequer) }} title="方格旗" />}
      </div>
      <span className={s.playhead} style={{ left: pct(t) }} />
      {hov && (
        <span className={s.scrubTip} style={{ left: hov.x }}>
          <b className="num">{fmtClock(hov.t - ref0)}</b>
          {model.kind === "race" && lapAt(hov.t) > 0 && <small>第 {lapAt(hov.t)} 圈</small>}
        </span>
      )}
    </div>
  );
}
