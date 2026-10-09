"use client";

import { preparedJSON, peekPreparedJSON } from "@/lib/preparedJSON";
import Icon from "@/components/ui/Icon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DRIVERS_2026 } from "@/lib/assets";
import Countdown from "@/components/ui/Countdown";
import { Clock, useClockT } from "./clock";
import { buildModel, ENDPOINTS, offsetMinutes, standings, type Endpoint, type Model, type Raw, type SessionInfo } from "./model";
import { CIRCUIT_ID, meetingZh, PLACE_ZH, SESSION_ZH } from "./names";
import Tower from "./Tower";
import LiveTrack from "./LiveTrack";
import LiveBrief from "./LiveBrief";
import Compare from "./Compare";
import { Controls, Hud } from "./Controls";
import { RaceControl, Radio, Weather } from "./Feeds";
import { REPLAY_EVENT } from "./replay";
import s from "./live.module.css";

export type SessionLite = SessionInfo & { meeting_name: string };
export type Weekend = { meeting_key: number; meeting_name: string; circuit_short_name: string; sessions: SessionLite[] };

type Load =
  | { st: "loading" }
  | { st: "ready"; raw: Raw }
  | { st: "future" }
  | { st: "waiting" }
  | { st: "empty" }
  | { st: "error"; code: number };

const POLL_MS = 5000;

const getJSON = (url: string, reuse = false) => preparedJSON(url, reuse);

function preparedReplay(key: number | null): Load | null {
  if (key == null) return null;
  const responses = ENDPOINTS.map((ep) => peekPreparedJSON(`/api/openf1/${ep}?session_key=${key}`));
  if (responses.some((r) => !r?.ok)) return null;
  const raw = Object.fromEntries(ENDPOINTS.map((ep, index) => [ep, Array.isArray(responses[index]!.data) ? responses[index]!.data : []])) as Raw;
  return raw.laps.length ? { st: "ready", raw } : null;
}

function fmtTrackDate(iso: string, gmt: string, time = false) {
  const d = new Date(Date.parse(iso) + offsetMinutes(gmt) * 60e3);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}${time ? ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : ""}`;
}

const isRefusal = (code: number) => code === 401 || code === 403 || code === 429;
const refusalText = (code: number) =>
  code === 429 ? "OpenF1 当前请求过多（429）" : code === 401 || code === 403 ? `OpenF1 拒绝了直播时段的免费请求（${code}，实时数据需付费授权）` : "OpenF1 暂时无法访问";

/** Merge rows by key, newer wins. */
function merge<T>(old: T[], add: T[], key: (x: T) => string) {
  if (!add.length) return old;
  const m = new Map(old.map((x) => [key(x), x]));
  for (const x of add) m.set(key(x), x);
  return [...m.values()];
}

/** Chinese short name from the 2026 roster, matched via the F1.com image code in OpenF1's headshot URL. */
function zhNameFor(model: Model) {
  const byCode = new Map(Object.values(DRIVERS_2026).map((d) => [d.code, d.nameZh]));
  const out = new Map<number, string>();
  for (const d of model.drivers.values()) {
    const code = d.headshot?.match(/\/([a-z]{6}\d{2})\.png/i)?.[1]?.toLowerCase();
    out.set(d.num, (code && byCode.get(code)) || d.name.split(" ").slice(-1)[0] || d.acr);
  }
  return out;
}

function TowerLive({ model, clock, a, b, onPick }: { model: Model; clock: Clock; a: number | null; b: number | null; onPick: (n: number) => void }) {
  const t = useClockT(clock, 6);
  const rows = useMemo(() => standings(model, t), [model, t]);
  return <Tower rows={rows} kind={model.kind} a={a} b={b} onPick={onPick} />;
}

/**
 * `embedded`: mounted mid-page (the /live page) rather than as the whole page — h2 title, no page min-height,
 * the keyboard shortcut only while the panel is on screen. `focus`: scroll the panel into view on mount (deep link).
 */
export default function LiveTiming({
  weekends, initialKey, liveKey, fallbackKey, initialA, initialB, embedded = false, focus = false, id,
}: {
  weekends: Weekend[]; initialKey: number | null; liveKey: number | null; fallbackKey: number | null; initialA: number | null; initialB: number | null;
  embedded?: boolean; focus?: boolean; id?: string;
}) {
  const sessions = useMemo(() => {
    const m = new Map<number, SessionLite>();
    for (const w of weekends) for (const x of w.sessions) m.set(x.session_key, x);
    return m;
  }, [weekends]);
  const [key, setKey] = useState<number | null>(initialKey);
  const [notice, setNotice] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>(() => (initialKey !== liveKey ? preparedReplay(initialKey) : null) ?? { st: "loading" });
  const [nonce, setNonce] = useState(0);
  const [points, setPoints] = useState<[number, number, number][] | null>(null);
  const [ab, setAb] = useState<{ a: number | null; b: number | null; next: "a" | "b" }>({ a: initialA, b: initialB, next: "b" });
  const clock = useMemo(() => new Clock(), []);
  useEffect(() => () => clock.dispose(), [clock]);
  const root = useRef<HTMLDivElement>(null);
  // the page URL mirrors the panel only once the viewer has changed something (a fresh /live stays a clean /live)
  const acted = useRef(false);
  const choose = useCallback((k: number) => { acted.current = true; setNotice(null); setKey(k); }, []);

  // sticky controls sit right under the (sticky) site header, whatever its height
  useEffect(() => {
    const h = document.querySelector("header");
    if (!h || !root.current) return;
    const set = () => root.current?.style.setProperty("--hdr", `${Math.round(h.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);

  // deep link (?session=): bring the panel into view once
  useEffect(() => {
    if (focus) root.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  // ▶ buttons elsewhere on the page (season grid) switch this panel instead of navigating
  useEffect(() => {
    const on = (e: Event) => {
      const k = Number((e as CustomEvent).detail);
      if (!sessions.has(k)) return;
      e.preventDefault();
      choose(k);
    };
    window.addEventListener(REPLAY_EVENT, on);
    return () => window.removeEventListener(REPLAY_EVENT, on);
  }, [sessions, choose]);

  const session = key != null ? sessions.get(key) ?? null : null;
  const live = key != null && key === liveKey;

  // ── load a session (all endpoints once) ──
  useEffect(() => {
    if (!session) return;
    let dead = false;
    const prepared = !live ? preparedReplay(session.session_key) : null;
    if (prepared) { setLoad(prepared); return; }
    setLoad({ st: "loading" });
    if (!live && Date.parse(session.date_start) > Date.now() + 60e3) { setLoad({ st: "future" }); return; }
    (async () => {
      const res = await Promise.all(ENDPOINTS.map((ep) => getJSON(`/api/openf1/${ep}?session_key=${session.session_key}`, !live)));
      if (dead) return;
      const by = Object.fromEntries(ENDPOINTS.map((ep, i) => [ep, res[i]])) as Record<Endpoint, (typeof res)[number]>;
      const core = [by.drivers, by.laps];
      const bad = core.find((r) => !r.ok);
      if (bad) {
        if (live && fallbackKey && fallbackKey !== session.session_key) {
          setNotice(`${refusalText(bad.status)}。已为你切换到最近一场已结束正赛的回放，直播恢复后刷新即可。`);
          setKey(fallbackKey);
          return;
        }
        setLoad({ st: "error", code: bad.status });
        return;
      }
      const raw = Object.fromEntries(ENDPOINTS.map((ep) => [ep, Array.isArray(by[ep].data) ? by[ep].data : []])) as Raw;
      if (!raw.laps.length) {
        if (live) {
          // OpenF1 publishes the entry list ahead of time; laps only appear once cars run.
          const since = Date.now() - Date.parse(session.date_start);
          if (since > 10 * 60e3 && fallbackKey && fallbackKey !== session.session_key) {
            setNotice("本节次已经开始，但 OpenF1 免费接口还没有返回计时数据（实时数据可能需付费授权，或存在延迟）。已切换到最近一场已结束正赛的回放，稍后刷新可重试。");
            setKey(fallbackKey);
            return;
          }
          setLoad({ st: "waiting" });
          return;
        }
        setLoad({ st: "empty" });
        return;
      }
      setLoad({ st: "ready", raw });
    })();
    return () => { dead = true; };
  }, [session, live, fallbackKey, nonce]);

  // waiting for the first laps of a live session: retry every 15 s
  useEffect(() => {
    if (load.st !== "waiting") return;
    const id = setTimeout(() => setNonce((n) => n + 1), 15000);
    return () => clearTimeout(id);
  }, [load]);

  // ── live: poll every ~5 s, incrementally ──
  const rawRef = useRef<Raw | null>(null);
  useEffect(() => { rawRef.current = load.st === "ready" ? load.raw : null; }, [load]);
  useEffect(() => {
    if (!live || load.st !== "ready" || !session) return;
    let dead = false;
    const sk = session.session_key;
    const tick = async () => {
      const raw = rawRef.current;
      if (!raw || dead) return;
      const latest = (rows: { date: string }[]) => rows.reduce((m, r) => (r.date > m ? r.date : m), "");
      // cursor floored to the minute so every viewer shares a handful of cached URLs
      const since = (rows: { date: string }[]) => {
        const l = latest(rows);
        const tt = l ? Date.parse(l) - 60e3 : Date.parse(session.date_start);
        return new Date(Math.floor(tt / 60e3) * 60e3).toISOString().replace(".000Z", "");
      };
      const maxLap = raw.laps.reduce((m, l) => Math.max(m, l.lap_number), 0);
      const q = (ep: string, extra = "") => getJSON(`/api/openf1/${ep}?session_key=${sk}${extra}`);
      const [laps, intervals, position, rc, weather, radio, pit, stints] = await Promise.all([
        q("laps", `&lap_number>=${Math.max(1, maxLap - 1)}`),
        q("intervals", `&date>${since(raw.intervals)}`),
        q("position", `&date>${since(raw.position)}`),
        q("race_control", `&date>${since(raw.race_control)}`),
        q("weather", `&date>${since(raw.weather)}`),
        q("team_radio", `&date>${since(raw.team_radio)}`),
        q("pit", `&date>${since(raw.pit)}`),
        q("stints"),
      ]);
      if (dead) return;
      const refused = [laps, intervals, position].find((r) => isRefusal(r.status));
      if (refused) { setNotice(`${refusalText(refused.status)}，实时更新已暂停在最后一次成功的数据。`); return; }
      const arr = <T,>(r: { ok: boolean; data: unknown }) => (r.ok && Array.isArray(r.data) ? (r.data as T[]) : []);
      const next: Raw = {
        ...raw,
        laps: merge(raw.laps, arr<Raw["laps"][number]>(laps), (x) => `${x.driver_number}|${x.lap_number}`),
        intervals: merge(raw.intervals, arr<Raw["intervals"][number]>(intervals), (x) => `${x.driver_number}|${x.date}`),
        position: merge(raw.position, arr<Raw["position"][number]>(position), (x) => `${x.driver_number}|${x.date}`),
        race_control: merge(raw.race_control, arr<Raw["race_control"][number]>(rc), (x) => `${x.date}|${x.message}`),
        weather: merge(raw.weather, arr<Raw["weather"][number]>(weather), (x) => x.date),
        team_radio: merge(raw.team_radio, arr<Raw["team_radio"][number]>(radio), (x) => x.recording_url),
        pit: merge(raw.pit, arr<Raw["pit"][number]>(pit), (x) => `${x.driver_number}|${x.date}`),
        stints: stints.ok && Array.isArray(stints.data) && stints.data.length ? (stints.data as Raw["stints"]) : raw.stints,
      };
      setLoad({ st: "ready", raw: next });
    };
    const id = setInterval(tick, POLL_MS);
    return () => { dead = true; clearInterval(id); };
  }, [live, load.st, session]);

  const model = useMemo(() => (load.st === "ready" && session ? buildModel(session, load.raw, live) : null), [load, session, live]);
  const zh = useMemo(() => (model ? zhNameFor(model) : new Map<number, string>()), [model]);

  // ── clock range + default position ──
  const lastSession = useRef<number | null>(null);
  useEffect(() => {
    if (!model) return;
    const first = lastSession.current !== model.session.session_key;
    lastSession.current = model.session.session_key;
    if (live) {
      clock.setRange(model.t0, Math.max(model.t1, Date.now() - clock.delay), first ? undefined : clock.t);
      if (first) clock.goLive();
    } else {
      clock.setRange(model.t0, model.t1, first ? model.defaultT : clock.t);
      if (first) clock.pause();
    }
  }, [model, live, clock]);

  // ── default A/B per session ──
  useEffect(() => {
    if (!model) return;
    setAb((cur) => {
      const ok = (n: number | null) => n != null && model.drivers.has(n) && model.drivers.get(n)!.laps.length > 0;
      const a = ok(cur.a) ? cur.a : model.finalOrder[0] ?? null;
      const b = ok(cur.b) && cur.b !== a ? cur.b : model.finalOrder.find((n) => n !== a) ?? null;
      return a === cur.a && b === cur.b ? cur : { a, b, next: "b" };
    });
  }, [model]);

  // ── track outline ──
  const circuit = session?.circuit_short_name;
  useEffect(() => {
    if (!circuit) return;
    let dead = false;
    setPoints(null);
    getJSON(`/api/track/${encodeURIComponent(circuit)}`, true).then((r) => {
      if (!dead) setPoints(r.ok ? ((r.data as { points: [number, number, number][] }).points ?? null) : null);
    });
    return () => { dead = true; };
  }, [circuit]);

  // ── shareable URL ──
  useEffect(() => {
    if (key == null || !acted.current) return;
    const u = new URL(window.location.href);
    u.searchParams.set("session", String(key));
    if (ab.a != null) u.searchParams.set("a", String(ab.a)); else u.searchParams.delete("a");
    if (ab.b != null) u.searchParams.set("b", String(ab.b)); else u.searchParams.delete("b");
    window.history.replaceState(null, "", u.toString()); // null state: Next syncs useSearchParams (breadcrumb follows ?session=)
  }, [key, ab.a, ab.b]);

  const pick = useCallback((n: number) => {
    acted.current = true;
    setAb((cur) => {
      if (n === cur.a || n === cur.b) return cur;
      return cur.next === "a" ? { a: n, b: cur.b, next: "b" } : { a: cur.a, b: n, next: "a" };
    });
  }, []);

  // keyboard: space = play/pause (when not typing)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== " " || /INPUT|SELECT|TEXTAREA|BUTTON/.test(el.tagName) || el.getAttribute("role") === "slider") return;
      if (embedded) {
        // mid-page: space still scrolls the page unless the panel fills most of the screen
        const r = root.current?.getBoundingClientRect();
        if (!r || r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return;
      }
      e.preventDefault();
      clock.toggle();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [clock, embedded]);

  const weekend = weekends.find((w) => w.sessions.some((x) => x.session_key === key)) ?? null;
  const title = session ? `${meetingZh(session.meeting_name)}` : "实时计时";
  const now = Date.now();
  const H = embedded ? "h2" : "h1";

  return (
    <div className={`band-ink dark-res ${s.page} ${embedded ? s.embedded : ""}`} ref={root} id={id}>
      <div className="wrap">
        <header className={s.top}>
          <div className={s.titleBlock}>
            <p className="kicker">
              {live ? <><span className={s.liveWord}>Live</span> · OpenF1</> : "Replay · OpenF1"}
            </p>
            <H className={s.h1}>
              <span className={`${s.h1Mode} ${live ? s.liveWord : ""}`}>{live ? "直播" : "回放"} ·</span>
              {title}
              {session && <span className={s.h1Session}>{SESSION_ZH[session.session_name] ?? session.session_name}</span>}
            </H>
            {session && (
              <p className={s.meta}>
                {PLACE_ZH[session.circuit_short_name] ?? session.location}
                <span className={s.tech}>{fmtTrackDate(session.date_start, session.gmt_offset)}</span>
                {model?.kind === "race" && model.totalLaps ? <span><b className="num">{model.totalLaps}</b> Laps</span> : null}
              </p>
            )}
          </div>
          <div className={s.pickerBlock}>
            <label className={s.weekendSel}>
              <span>分站</span>
              <span className={s.selWrap}><select
                value={weekend?.meeting_key ?? ""}
                onChange={(e) => {
                  const w = weekends.find((x) => x.meeting_key === Number(e.target.value));
                  if (!w) return;
                  const done = w.sessions.filter((x) => Date.parse(x.date_start) < now);
                  const race = done.filter((x) => x.session_name === "Race").pop();
                  const target = race ?? done.pop() ?? w.sessions[0];
                  choose(target.session_key);
                }}
              >
                {weekends.map((w) => {
                  const future = Date.parse(w.sessions[0].date_start) > now;
                  return (
                    <option key={w.meeting_key} value={w.meeting_key}>
                      {meetingZh(w.meeting_name)} · {PLACE_ZH[w.circuit_short_name] ?? w.circuit_short_name}{future ? "（未开始）" : ""}
                    </option>
                  );
                })}
              </select></span>
            </label>
            {weekend && (
              <div className={`seg ${s.sessSeg}`} role="group" aria-label="节次">
                {weekend.sessions.map((x) => {
                  const future = Date.parse(x.date_start) > now + 60e3;
                  return (
                    <button
                      key={x.session_key}
                      type="button"
                      className={x.session_key === key ? "on" : ""}
                      disabled={future && x.session_key !== liveKey}
                      title={future ? `未开始 · 当地 ${fmtTrackDate(x.date_start, x.gmt_offset, true)}` : undefined}
                      onClick={() => choose(x.session_key)}
                    >
                      {x.session_key === liveKey && <i className={s.segLive} />}
                      {SESSION_ZH[x.session_name] ?? x.session_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {notice && (
          <div className={s.notice} role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示"><Icon name="close" size={18} /></button>
          </div>
        )}

        {load.st === "loading" && <div className={s.state}><p>正在载入计时数据<span className={s.dots} /></p></div>}
        {load.st === "error" && (
          <div className={s.state}>
            <p>{isRefusal(load.code) ? refusalText(load.code) : "计时数据加载失败"}。</p>
            <button type="button" className="btn btn-red" onClick={() => setNonce((n) => n + 1)}>重试</button>
          </div>
        )}
        {load.st === "empty" && (
          <div className={s.state}>
            <p>这一节次在 OpenF1 中暂无计时数据。</p>
            {fallbackKey && fallbackKey !== key && <button type="button" className="btn btn-red" onClick={() => setKey(fallbackKey)}>看最近一场正赛回放</button>}
          </div>
        )}
        {load.st === "waiting" && session && (
          <div className={s.state}>
            <p>{meetingZh(session.meeting_name)} {SESSION_ZH[session.session_name] ?? session.session_name} · 等待首批计时数据<span className={s.dots} /></p>
            {Date.parse(session.date_start) > now
              ? <Countdown to={session.date_start} className={`num ${s.count}`} unitClassName={s.countUnit} />
              : <small className={s.stateNote}>每 15 秒自动重试。OpenF1 免费接口在直播时段可能受限或延迟。</small>}
            {fallbackKey && <button type="button" className="btn btn-red" onClick={() => { setNotice(null); setKey(fallbackKey); }}>先看最近一场正赛回放</button>}
          </div>
        )}
        {load.st === "future" && session && (
          <div className={s.state}>
            <p>{meetingZh(session.meeting_name)} {SESSION_ZH[session.session_name] ?? session.session_name} 尚未开始</p>
            <Countdown to={session.date_start} className={`num ${s.count}`} unitClassName={s.countUnit} />
            {fallbackKey && <button type="button" className="btn btn-red" onClick={() => setKey(fallbackKey)}>先看最近一场正赛回放</button>}
          </div>
        )}

        {model && load.st === "ready" && (
          <>
            <Controls model={model} clock={clock} live={live} onGoLive={() => clock.goLive()} />
            <div className={s.grid}>
              <div className={s.colTower}>
                <div className={s.towerHead}>
                  <h3>计时塔</h3>
                  <p><i className={s.flDot} />最快圈 · 点击行设为对比车手</p>
                </div>
                <TowerLive model={model} clock={clock} a={ab.a} b={ab.b} onPick={pick} />
              </div>
              <div className={s.colTrack}>
                <LiveTrack model={model} clock={clock} points={points} a={ab.a} b={ab.b} onPick={pick}>
                  <Hud model={model} clock={clock} />
                </LiveTrack>
                <Weather model={model} clock={clock} />
              </div>
              <div className={s.colFeed}>
                <RaceControl model={model} clock={clock} />
                <Radio model={model} clock={clock} />
              </div>
            </div>
            <Compare
              model={model}
              clock={clock}
              a={ab.a}
              b={ab.b}
              setA={(n) => { acted.current = true; setAb((c) => ({ ...c, a: n, next: "b" })); }}
              setB={(n) => { acted.current = true; setAb((c) => ({ ...c, b: n, next: "a" })); }}
              order={model.finalOrder}
              zh={(n) => zh.get(n) ?? String(n)}
            />
            <LiveBrief circuit={session ? CIRCUIT_ID[session.circuit_short_name] : undefined} year={session ? new Date(session.date_start).getUTCFullYear() : null}
              a={ab.a != null ? model.drivers.get(ab.a)?.acr : undefined} b={ab.b != null ? model.drivers.get(ab.b)?.acr : undefined} />
            <p className={s.source}>数据来自 OpenF1（api.openf1.org）。已结束的节次永久缓存；直播时每 5 秒更新一次，免费接口在直播时段可能受限。</p>
          </>
        )}
      </div>
    </div>
  );
}
