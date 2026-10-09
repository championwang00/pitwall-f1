"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, useClockT } from "./clock";
import { fmtTrackTime, lastAt, type Model } from "./model";
import { rcZh, type RcKind } from "./names";
import { speakers } from "./radioSpeaker";
import Icon from "@/components/ui/Icon";
import { radioPerson, type RadioPerson } from "./radioPeople";
import { peekAll, txOf, unwant, useTxVersion, want } from "./radioTranscripts";
import s from "./live.module.css";

const NOISE: RcKind[] = ["clear", "blue", "yellow", "dyellow", "deleted", "info"];

export function RaceControl({ model, clock }: { model: Model; clock: Clock }) {
  const t = useClockT(clock, 4);
  const [all, setAll] = useState(false);
  const items = useMemo(() => model.rc.map((r) => ({ r, ...rcZh(r.message, r.flag, r.category) })), [model]);
  const upto = lastAt(model.rc, t);
  const shown = items.slice(0, upto + 1).filter((x) => all || !NOISE.includes(x.kind) || /SLIPPERY|RISK OF RAIN/.test(x.r.message)).reverse().slice(0, 150);
  const gmt = model.session.gmt_offset;
  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <h3>赛事指挥</h3>
        <div className="seg">
          <button type="button" className={!all ? "on" : ""} onClick={() => setAll(false)}>关键</button>
          <button type="button" className={all ? "on" : ""} onClick={() => setAll(true)}>全部</button>
        </div>
      </div>
      <ol className={s.rcList}>
        {shown.map(({ r, text, kind }, i) => (
          <li key={r.t + ":" + i} className={s.rcItem} title={r.message}>
            <span className={`${s.flag} ${s["f_" + kind] ?? ""}`} aria-hidden />
            <div>
              <p>{text}</p>
              <small className={s.tech}>{r.lap_number ? `L${r.lap_number} · ` : ""}{fmtTrackTime(r.t, gmt)}</small>
            </div>
          </li>
        ))}
        {!shown.length && <li className={s.empty}>回放时间之前暂无消息</li>}
      </ol>
    </div>
  );
}

function windDir(deg: number) {
  const d = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return d[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export function Weather({ model, clock }: { model: Model; clock: Clock }) {
  const t = useClockT(clock, 2);
  const i = lastAt(model.weather, t);
  const w = i >= 0 ? model.weather[i] : model.weather[0];
  const first = model.weather.find((x) => x.t >= model.t0 - 120e3) ?? model.weather[0];
  // a tiny track-temperature trace up to now (data, not decoration)
  const trace = useMemo(() => {
    const win = model.weather.filter((x) => x.t >= model.t0 - 120e3 && x.t <= model.t1);
    const pts = win.filter((x) => x.t <= t);
    if (pts.length < 2) return "";
    const lo = Math.min(...win.map((x) => x.track_temperature)), hi = Math.max(...win.map((x) => x.track_temperature));
    const t0 = model.t0, t1 = model.t1;
    return pts.map((p, k) => `${k ? "L" : "M"}${(((p.t - t0) / Math.max(1, t1 - t0)) * 100).toFixed(2)} ${(22 - ((p.track_temperature - lo) / Math.max(0.5, hi - lo)) * 20).toFixed(2)}`).join("");
  }, [model, t]);
  if (!w) return <div className={`${s.panel} ${s.weather}`}><p className={s.empty}>暂无天气数据</p></div>;
  return (
    <div className={`${s.panel} ${s.weather}`}>
      <div className={s.panelHead}><h3>天气</h3><small><span className={s.tech}>{fmtTrackTime(w.t, model.session.gmt_offset)}</span> 当地</small></div>
      <dl className={s.wx}>
        <div><dt>气温</dt><dd className="num">{w.air_temperature.toFixed(1)}<small>°C</small></dd></div>
        <div><dt>路面</dt><dd className="num">{w.track_temperature.toFixed(1)}<small>°C</small></dd></div>
        <div><dt>湿度</dt><dd className="num">{Math.round(w.humidity)}<small>%</small></dd></div>
        <div><dt>降雨</dt><dd className={w.rainfall ? s.rain : undefined}>{w.rainfall ? "有" : "无"}</dd></div>
        <div>
          <dt>风</dt>
          <dd className="num">
            <Icon name="arrow-up" size={16} className={s.windArrow} style={{ transform: `rotate(${w.wind_direction + 180}deg)` }} />
            {w.wind_speed.toFixed(1)}<small>m/s {windDir(w.wind_direction)}</small>
          </dd>
        </div>
      </dl>
      {trace && (
        <div className={s.wxTrace}>
          <span>路面温度</span>
          <svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d={trace} vectorEffect="non-scaling-stroke" /></svg>
          <span className={s.trend}>{first ? <>{first.track_temperature.toFixed(0)}°<Icon name="arrow-right" size={12} />{w.track_temperature.toFixed(0)}°</> : ""}</span>
        </div>
      )}
    </div>
  );
}

// ───────────── team radio ─────────────
// List: who is talking (face on team colour + Chinese name + code), lap · local time, one-line transcript.
// Playing: a floating "TEAM RADIO" card at the bottom right, modelled on the F1 world-feed radio graphic —
// portrait on the team colour, name in the F1 face, team logo, live audio level, transcript revealed in time with the clip.

const mmss = (x: number) => (Number.isFinite(x) ? `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}` : "0:00");
const faceSrc = (id: string, size: number, year: number) => `/api/face/${id}?v=3&s=${size}&year=${year}`;

type Clip = { url: string; num: number; t: number };

/** Transcript text for a row / caption; a short Chinese status while it is still being produced. */
function txLine(url: string): { text: string | null; status: string | null } {
  const x = txOf(url);
  if (x.st === "done") return x.t!.text ? { text: x.t!.text, status: null } : { text: null, status: "未识别出清晰语音" };
  if (x.st === "error") return { text: null, status: "转写暂不可用" };
  return { text: null, status: x.st === "idle" ? "待转写" : "转写中…" };
}

export function Radio({ model, clock }: { model: Model; clock: Clock }) {
  const t = useClockT(clock, 2);
  useTxVersion();
  const year = new Date(model.session.date_start).getUTCFullYear();
  const gmt = model.session.gmt_offset;
  const upto = lastAt(model.radio, t);
  const list = model.radio.slice(0, upto + 1).reverse().slice(0, 60);
  const people = useMemo(() => {
    const m = new Map<number, RadioPerson>();
    for (const r of model.radio) if (!m.has(r.driver_number)) m.set(r.driver_number, radioPerson(model.drivers.get(r.driver_number), r.driver_number));
    return m;
  }, [model]);

  // audio: one element, routed through an AnalyserNode (the mp3 comes via our same-origin proxy, so Web Audio may read it)
  const audio = useRef<HTMLAudioElement | null>(null);
  const graph = useRef<{ ctx: AudioContext; an: AnalyserNode } | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [now, setNow] = useState({ ct: 0, dur: 0 });

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    const a = new Audio();
    a.preload = "auto";
    a.addEventListener("timeupdate", () => setNow({ ct: a.currentTime, dur: a.duration || 0 }));
    a.addEventListener("loadedmetadata", () => setNow({ ct: a.currentTime, dur: a.duration || 0 }));
    a.addEventListener("play", () => { setPlaying(true); setEnded(false); });
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("ended", () => { setPlaying(false); setEnded(true); setNow({ ct: a.duration || 0, dur: a.duration || 0 }); });
    a.addEventListener("error", () => { setPlaying(false); setEnded(true); });
    audio.current = a;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.6;
      ctx.createMediaElementSource(a).connect(an);
      an.connect(ctx.destination);
      graph.current = { ctx, an };
    } catch { graph.current = null; /* no Web Audio: the level bar falls back to the progress only */ }
    return a;
  };

  const play = (r: { recording_url: string; driver_number: number; t: number }) => {
    const a = ensureAudio();
    if (clip?.url === r.recording_url && !ended) {
      if (a.paused) a.play().catch(() => {}); else a.pause();
      return;
    }
    setClip({ url: r.recording_url, num: r.driver_number, t: r.t });
    setEnded(false);
    setNow({ ct: 0, dur: 0 });
    want(r.recording_url, true);
    a.src = `/api/radio/audio?url=${encodeURIComponent(r.recording_url)}`;
    graph.current?.ctx.resume().catch(() => {});
    a.play().catch(() => setPlaying(false));
  };
  const close = useCallback(() => { audio.current?.pause(); setClip(null); setPlaying(false); setEnded(false); }, []);

  // the card lingers after the clip ends, like the broadcast graphic — long enough to read the transcript,
  // and never before the transcript has arrived
  const clipTx = clip ? txOf(clip.url) : null;
  const linger = clipTx?.st === "done" ? 5000 + (clipTx.t!.text.split(/\s+/).length * 250) : clipTx?.st === "error" ? 4000 : null;
  useEffect(() => {
    if (!ended || !clip || linger == null) return;
    const id = setTimeout(close, linger);
    return () => clearTimeout(id);
  }, [ended, clip, close, linger]);
  useEffect(() => {
    if (!clip) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [clip, close]);
  // another session: stop
  useEffect(() => close, [model.session.session_key, close]);
  useEffect(() => () => { audio.current?.pause(); graph.current?.ctx.close().catch(() => {}); }, []);

  // transcripts: one cache lookup for the session, then Whisper only for rows that are actually on screen
  useEffect(() => { peekAll(model.radio.map((r) => r.recording_url)); }, [model.radio]);
  const listRef = useRef<HTMLUListElement>(null);
  const keys = list.map((r) => r.recording_url).join("|");
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        const url = (e.target as HTMLElement).dataset.url;
        if (!url) continue;
        if (e.isIntersecting) want(url); else unwant(url);
      }
    }, { root, rootMargin: "40px 0px" });
    root.querySelectorAll<HTMLElement>("li[data-url]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [keys]);

  const lapAt = (num: number, at: number) => {
    const dr = model.drivers.get(num);
    if (!dr) return null;
    let n: number | null = null;
    for (const l of dr.laps) if (l.start <= at) n = l.n; else break;
    return n;
  };
  const posAt = (num: number, at: number) => {
    const dr = model.drivers.get(num);
    const i = dr ? lastAt(dr.pos, at) : -1;
    return i >= 0 ? dr!.pos[i].p : null;
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}><h3>车队无线电</h3><small><span className={s.tech}>{list.length ? upto + 1 : ""}</span>{list.length ? " 条" : ""}</small></div>
      <ul className={s.radioList} ref={listRef}>
        {list.map((r) => {
          const p = people.get(r.driver_number)!;
          const d = model.drivers.get(r.driver_number);
          const on = clip?.url === r.recording_url;
          const lap = lapAt(r.driver_number, r.t);
          const tx = txLine(r.recording_url);
          return (
            <li key={r.recording_url} data-url={r.recording_url}>
              {on && clip ? (
                <RadioCard
                  key={clip.url}
                  clip={clip}
                  person={people.get(clip.num) ?? radioPerson(model.drivers.get(clip.num), clip.num)}
                  color={model.drivers.get(clip.num)?.color ?? "#8a8a94"}
                  acr={model.drivers.get(clip.num)?.acr ?? String(clip.num)}
                  year={year}
                  lap={lapAt(clip.num, clip.t)}
                  pos={model.kind === "practice" ? null : posAt(clip.num, clip.t)}
                  time={fmtTrackTime(clip.t, gmt).slice(0, 5)}
                  playing={playing}
                  ended={ended}
                  ct={now.ct}
                  dur={now.dur}
                  audio={audio}
                  analyser={graph.current?.an ?? null}
                  onToggle={() => { const a = audio.current; if (!a) return; if (ended) { a.currentTime = 0; a.play().catch(() => {}); } else if (a.paused) a.play().catch(() => {}); else a.pause(); }}
                  onClose={close}
                />
              ) : (
              <button
                type="button"
                className={`${s.rRow} ${on ? s.rOn : ""}`}
                style={{ ["--team" as string]: d?.color ?? "#8a8a94" }}
                onClick={() => play(r)}
                aria-label={on && playing ? `暂停 ${p.zh} 的无线电` : `播放 ${p.zh} 的无线电`}
                title={tx.text ?? undefined}
              >
                <span className={s.rFace}>{p.id && <img src={faceSrc(p.id, 80, year)} alt="" loading="lazy" width={36} height={36} />}</span>
                <span className={s.rBody}>
                  <span className={s.rTop}>
                    <b className={s.rName}>{p.zh}</b>
                    <i className={`${s.rCode} lat`}>{d?.acr ?? r.driver_number}</i>
                    <span className={`${s.rMeta} ${s.tech}`}>{lap ? `L${lap} · ` : ""}{fmtTrackTime(r.t, gmt).slice(0, 5)}</span>
                  </span>
                  {tx.text ? (() => {
                    // preview coloured by speaker too: driver = team colour, team = white
                    const segs = txOf(r.recording_url).t?.segments ?? [];
                    const who = speakers(segs, [p.latin.split(" ")[0], p.last]);
                    return <span className={s.rText} lang="en">{segs.length ? segs.map((sg, k) => <span key={k} className={who[k] === "driver" ? s.rDriver : s.rTeamVoice}>{sg.text} </span>) : tx.text}</span>;
                  })() : <span className={s.rWait}>{tx.status}</span>}
                </span>
                <span className={s.rPlay}><Icon name={on && playing ? "pause" : "play"} size={12} /></span>
              </button>
              )}
            </li>
          );
        })}
        {!list.length && <li className={s.empty}>{model.radio.length ? "回放时间之前暂无无线电" : "本站暂无车队无线电录音数据"}</li>}
      </ul>
    </div>
  );
}

function RadioCard({ clip, person, color, acr, year, lap, pos, time, playing, ended, ct, dur, audio, analyser, onToggle, onClose }: {
  clip: Clip; person: RadioPerson; color: string; acr: string; year: number; lap: number | null; pos: number | null; time: string;
  playing: boolean; ended: boolean; ct: number; dur: number; audio: React.RefObject<HTMLAudioElement | null>; analyser: AnalyserNode | null;
  onToggle: () => void; onClose: () => void;
}) {
  useTxVersion();
  const tx = txOf(clip.url);
  const level = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);

  // 60 fps: the real audio level (AnalyserNode) as broadcast-style bars + a smooth progress bar from currentTime/duration
  useEffect(() => {
    let raf = 0;
    const buf = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const N = 24;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const a = audio.current;
      if (a && bar.current) bar.current.style.transform = `scaleX(${a.duration ? Math.min(1, a.currentTime / a.duration) : 0})`;
      const c = level.current;
      if (!c) return;
      const g = c.getContext("2d");
      if (!g) return;
      const W = c.width, H = c.height;
      g.clearRect(0, 0, W, H);
      if (analyser && buf) analyser.getByteFrequencyData(buf);
      const live = !!a && !a.paused;
      const step = W / N, bw = Math.max(2, step * 0.5);
      g.fillStyle = "#fff";
      for (let i = 0; i < N; i++) {
        // speech energy sits in the low bins: sample the lower ~60 % of the spectrum
        const v = buf && live ? buf[Math.floor((i / N) * buf.length * 0.6)] / 255 : 0;
        const h = Math.max(2 * devicePixelRatio, v * H);
        g.globalAlpha = live ? 0.35 + v * 0.65 : 0.25;
        g.fillRect(i * step + (step - bw) / 2, (H - h) / 2, bw, h);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser, audio]);

  const segs = tx.st === "done" ? tx.t!.segments : [];
  // driver's own voice in his team colour, the team (engineer) in white — user rule; speaker is phrase-inferred
  const who = speakers(segs, [person.latin.split(" ")[0], person.last]);
  // reveal the transcript in time with the clip; inside a segment, word by word across its span
  const shownAll = ended;
  const lines = segs.map((sg, i) => {
    const words = sg.text.split(/\s+/);
    const span = Math.max(0.3, sg.end - sg.start);
    const f = shownAll ? 1 : Math.max(0, Math.min(1, (ct - sg.start + 0.25) / span));
    return { i, words, n: Math.ceil(words.length * f), past: !shownAll && ct > sg.end + 0.2 };
  }).filter((l) => l.n > 0);
  const visible = lines.slice(-3);

  // expands in place inside the radio list (user: 在原来那个地方展开，变成一个更大的播放区域); keep it fully in view
  const self = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => self.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 440);
    return () => clearTimeout(t);
  }, []);
  return (
    <div ref={self} className={s.rCard} style={{ ["--team" as string]: color }} role="region" aria-label={`${person.zh} 的车队无线电`}>
      <div className={s.rCardTop}>
        <div className={s.rPortrait}>
          {person.id && <img src={faceSrc(person.id, 240, year)} alt="" />}
        </div>
        <div className={s.rInfo}>
          <p className={s.rEyebrow}><span>TEAM RADIO</span><canvas ref={level} width={120 * 2} height={18 * 2} className={s.rLevel} aria-hidden /></p>
          <h4 className={s.rBig}>{person.zh}<span className="lat">{acr}</span></h4>
          <p className={s.rCtx}>
            <span className={s.rTeam}>{person.teamId && <img src={`/api/logo/${person.teamId}?r=3&v=white`} alt="" />}{person.teamZh}</span>
            {pos ? <span>第 <b className="num">{pos}</b> 位</span> : null}
            {lap ? <span>第 <b className="num">{lap}</b> 圈</span> : null}
            <span className={s.tech}>{time}</span>
          </p>
        </div>
        <div className={s.rBtns}>
          <button type="button" onClick={onToggle} aria-label={playing ? "暂停" : ended ? "重播" : "播放"}><Icon name={playing ? "pause" : ended ? "replay" : "play"} size={16} /></button>
          <button type="button" onClick={onClose} aria-label="关闭"><Icon name="close" size={16} /></button>
        </div>
      </div>
      <div className={s.rCaption} lang="en" aria-live="polite">
        {tx.st === "done" && segs.length > 0 && visible.map((l) => (
          <p key={l.i} className={`${l.past ? s.rPast : ""} ${who[l.i] === "driver" ? s.rDriver : s.rTeamVoice}`}>
            {l.words.map((w, k) => <span key={k} className={k < l.n ? undefined : s.rAhead}>{w} </span>)}
          </p>
        ))}
        {tx.st === "done" && segs.length > 0 && !visible.length && <p className={s.rHint}>…</p>}
        {tx.st === "done" && !segs.length && <p className={s.rHint} lang="zh">未识别出清晰语音</p>}
        {(tx.st === "queued" || tx.st === "loading" || tx.st === "idle") && <p className={s.rHint} lang="zh">转写中<span className={s.dots} /></p>}
        {tx.st === "error" && <p className={s.rHint} lang="zh">转写暂不可用</p>}
      </div>
      <div className={s.rFoot}>
        <span className={s.rTrack}><i ref={bar} /></span>
        <span className={s.tech}>{mmss(ct)} / {mmss(dur)}</span>
      </div>
      <p className={s.rNote} lang="zh"><i className={s.rKeyDriver} />车手 <i className={s.rKeyTeam} />车队 · 说话人为自动推断 · 英文原声，本机 Whisper 转写，仅供参考</p>
    </div>
  );
}
