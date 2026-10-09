// Turns raw OpenF1 rows for one session into time-indexed structures the replay UI can query at any instant.

export type RawDriver = {
  driver_number: number; name_acronym: string; full_name: string; broadcast_name?: string; first_name?: string; last_name?: string;
  team_name: string | null; team_colour: string | null; headshot_url: string | null;
};
export type RawLap = {
  driver_number: number; lap_number: number; date_start: string | null; lap_duration: number | null;
  duration_sector_1: number | null; duration_sector_2: number | null; duration_sector_3: number | null;
  is_pit_out_lap: boolean | null; st_speed: number | null; i1_speed: number | null; i2_speed: number | null;
};
export type RawInterval = { date: string; driver_number: number; gap_to_leader: number | string | null; interval: number | string | null };
export type RawPosition = { date: string; driver_number: number; position: number };
export type RawStint = { driver_number: number; stint_number: number; lap_start: number | null; lap_end: number | null; compound: string | null; tyre_age_at_start: number | null };
export type RawPit = { date: string; driver_number: number; lap_number: number; pit_duration: number | null; lane_duration?: number | null; stop_duration?: number | null };
export type RawRC = { date: string; lap_number: number | null; category: string; flag: string | null; scope: string | null; sector: number | null; driver_number: number | null; message: string; qualifying_phase?: number | null };
export type RawWeather = { date: string; air_temperature: number; track_temperature: number; humidity: number; rainfall: number; wind_speed: number; wind_direction: number; pressure: number };
export type RawRadio = { date: string; driver_number: number; recording_url: string };
export type RawResult = { position: number | null; driver_number: number; number_of_laps: number | null; dnf: boolean; dns: boolean; dsq: boolean; gap_to_leader: unknown; duration: unknown; points?: number };

export type Raw = {
  drivers: RawDriver[]; laps: RawLap[]; intervals: RawInterval[]; position: RawPosition[]; stints: RawStint[]; pit: RawPit[];
  race_control: RawRC[]; weather: RawWeather[]; team_radio: RawRadio[]; session_result: RawResult[];
};
export const ENDPOINTS = ["drivers", "laps", "intervals", "position", "stints", "pit", "race_control", "weather", "team_radio", "session_result"] as const;
export type Endpoint = (typeof ENDPOINTS)[number];

export type SessionInfo = {
  session_key: number; session_name: string; session_type: string; date_start: string; date_end: string;
  circuit_short_name: string; meeting_key: number; meeting_name: string; country_name: string; location: string; gmt_offset: string;
};

export type Lap = {
  n: number; start: number; dur: number | null;
  /** when the car actually reaches the line (used to place cars); null = lap never completed */
  end: number | null;
  /** timing end (start + duration) — when the lap counts as completed */
  tEnd: number | null;
  /** race-elapsed end from cumulative lap durations (ms epoch); far less jittery than date_start for gaps */
  cEnd: number | null;
  s: [number | null, number | null, number | null];
  pitOut: boolean; pitIn: boolean; neutral: boolean; clean: boolean;
  st: number | null; i1: number | null; i2: number | null;
};
export type Driver = {
  num: number; acr: string; name: string; team: string; color: string; headshot: string | null;
  laps: Lap[]; lapBy: Map<number, Lap>;
  pos: { t: number; p: number }[];
  ints: { t: number; gap: number | string | null; int: number | string | null }[];
  stints: RawStint[]; pits: { t: number; lap: number; lane: number | null; stop: number | null }[];
  result: RawResult | null; firstLapStart: number | null; lastEnd: number | null; medianLap: number | null;
};
export type Period = { kind: "SC" | "VSC" | "RED"; start: number; end: number; lapFrom: number | null; lapTo: number | null };
export type RC = RawRC & { t: number };
export type Kind = "race" | "quali" | "practice";

export type Model = {
  session: SessionInfo; kind: Kind; live: boolean;
  drivers: Map<number, Driver>; nums: number[]; finalOrder: number[];
  t0: number; t1: number; raceStart: number | null; chequer: number | null; defaultT: number;
  totalLaps: number; lapStarts: { n: number; t: number }[];
  periods: Period[]; phases: { name: string; start: number; end: number }[];
  rc: RC[]; weather: (RawWeather & { t: number })[]; radio: (RawRadio & { t: number })[];
  medianLap: number;
};

const ms = (d: string | null | undefined) => (d ? Date.parse(d) : NaN);
const med = (a: number[]) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

/** Last index i with arr[i].t <= t (arr sorted by t), or -1. */
export function lastAt<T extends { t: number }>(arr: T[], t: number): number {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
function lastLapStarted(laps: Lap[], t: number) {
  let lo = 0, hi = laps.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (laps[mid].start <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

export function kindOf(s: SessionInfo): Kind {
  if (s.session_type === "Race") return "race";
  if (s.session_type === "Qualifying" || /Qualifying|Shootout/.test(s.session_name)) return "quali";
  return "practice";
}

export function buildModel(session: SessionInfo, raw: Raw, live = false): Model {
  const kind = kindOf(session);
  const drivers = new Map<number, Driver>();
  for (const d of raw.drivers) {
    if (drivers.has(d.driver_number)) continue;
    drivers.set(d.driver_number, {
      num: d.driver_number, acr: d.name_acronym || String(d.driver_number), name: d.full_name || d.broadcast_name || "",
      team: d.team_name || "", color: d.team_colour ? "#" + d.team_colour.replace("#", "") : "#8a8a94", headshot: d.headshot_url,
      laps: [], lapBy: new Map(), pos: [], ints: [], stints: [], pits: [], result: null, firstLapStart: null, lastEnd: null, medianLap: null,
    });
  }
  const get = (n: number) => {
    let d = drivers.get(n);
    if (!d) {
      d = { num: n, acr: String(n), name: "#" + n, team: "", color: "#8a8a94", headshot: null, laps: [], lapBy: new Map(), pos: [], ints: [], stints: [], pits: [], result: null, firstLapStart: null, lastEnd: null, medianLap: null };
      drivers.set(n, d);
    }
    return d;
  };

  // race control first: neutralised periods feed lap classification
  const rc: RC[] = raw.race_control.map((r) => ({ ...r, t: ms(r.date) })).filter((r) => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);

  // laps
  const lapsByDriver = new Map<number, RawLap[]>();
  for (const l of raw.laps) {
    if (!l.date_start) continue;
    const arr = lapsByDriver.get(l.driver_number) || [];
    arr.push(l);
    lapsByDriver.set(l.driver_number, arr);
  }
  const allDur: number[] = [];
  for (const arr of lapsByDriver.values()) for (const l of arr) if (l.lap_duration && !l.is_pit_out_lap && l.lap_number > 1) allDur.push(l.lap_duration);
  const medianLap = med(allDur) || 95;

  for (const [num, arr] of lapsByDriver) {
    const d = get(num);
    arr.sort((a, b) => a.lap_number - b.lap_number);
    const laps: Lap[] = [];
    for (let i = 0; i < arr.length; i++) {
      const l = arr[i], next = arr[i + 1];
      const start = ms(l.date_start);
      const nStart = next ? ms(next.date_start) : NaN;
      const dur = l.lap_duration ?? null;
      let end: number | null;
      if (dur != null) end = Number.isFinite(nStart) ? Math.min(start + dur * 1000, nStart) : start + dur * 1000;
      else if (Number.isFinite(nStart) && nStart - start < medianLap * 3000) end = nStart;
      else end = null;
      const tEnd = dur != null ? start + dur * 1000 : Number.isFinite(nStart) && nStart - start < medianLap * 3000 ? nStart : null;
      laps.push({
        n: l.lap_number, start, dur, end, tEnd, cEnd: null,
        s: [l.duration_sector_1 ?? null, l.duration_sector_2 ?? null, l.duration_sector_3 ?? null],
        pitOut: !!l.is_pit_out_lap, pitIn: false, neutral: false, clean: false,
        st: l.st_speed ?? null, i1: l.i1_speed ?? null, i2: l.i2_speed ?? null,
      });
    }
    // cumulative clock: sum durations from the first lap's start, re-anchoring on date_start when a lap is missing
    let acc: number | null = laps[0]?.start ?? null;
    for (let i = 0; i < laps.length; i++) {
      const l = laps[i], next = laps[i + 1];
      if (i > 0 && l.n !== laps[i - 1].n + 1) acc = l.start;
      if (acc != null && l.dur != null) acc += l.dur * 1000;
      else acc = next && next.n === l.n + 1 ? next.start : null;
      l.cEnd = acc;
      if (acc == null && next) acc = next.start;
    }
    d.laps = laps;
    for (const l of laps) d.lapBy.set(l.n, l);
    d.firstLapStart = laps[0]?.start ?? null;
    const ends = laps.map((l) => l.end).filter((x): x is number => x != null);
    d.lastEnd = ends.length ? Math.max(...ends) : null;
  }

  for (const p of raw.position) {
    const t = ms(p.date);
    if (Number.isFinite(t)) get(p.driver_number).pos.push({ t, p: p.position });
  }
  for (const i of raw.intervals) {
    const t = ms(i.date);
    if (Number.isFinite(t)) get(i.driver_number).ints.push({ t, gap: i.gap_to_leader, int: i.interval });
  }
  for (const s of raw.stints) get(s.driver_number).stints.push(s);
  for (const p of raw.pit) {
    const t = ms(p.date);
    if (Number.isFinite(t)) get(p.driver_number).pits.push({ t, lap: p.lap_number, lane: p.lane_duration ?? p.pit_duration ?? null, stop: p.stop_duration ?? null });
  }
  for (const r of raw.session_result) if (drivers.has(r.driver_number) || r.driver_number) get(r.driver_number).result = r;
  for (const d of drivers.values()) {
    d.pos.sort((a, b) => a.t - b.t);
    d.ints.sort((a, b) => a.t - b.t);
    d.stints.sort((a, b) => a.stint_number - b.stint_number);
    d.pits.sort((a, b) => a.t - b.t);
    for (const p of d.pits) {
      const l = d.lapBy.get(p.lap);
      if (l) l.pitIn = true;
    }
  }

  // timeline bounds
  const starts: number[] = [], endsAll: number[] = [];
  for (const d of drivers.values()) for (const l of d.laps) { starts.push(l.start); if (l.end) endsAll.push(l.end); }
  const firstLap = starts.length ? Math.min(...starts) : ms(session.date_start);
  const lastLap = endsAll.length ? Math.max(...endsAll) : ms(session.date_end);
  const chequers = rc.filter((r) => r.flag === "CHEQUERED");
  const chequer = chequers.length ? chequers[chequers.length - 1].t : null;
  const raceStart = kind === "race" ? firstLap : null;
  const t0 = firstLap - (kind === "race" ? 120e3 : 60e3);
  const t1 = Math.max(lastLap, chequer ?? 0) + 60e3;

  // leader lap starts (first car to start each lap)
  const lapStartMap = new Map<number, number>();
  for (const d of drivers.values()) for (const l of d.laps) {
    const cur = lapStartMap.get(l.n);
    if (cur == null || l.start < cur) lapStartMap.set(l.n, l.start);
  }
  const lapStarts = [...lapStartMap.entries()].map(([n, t]) => ({ n, t })).sort((a, b) => a.n - b.n);
  const totalLaps = kind === "race"
    ? Math.max(0, ...raw.session_result.map((r) => r.number_of_laps || 0), ...lapStarts.map((l) => l.n))
    : Math.max(0, ...lapStarts.map((l) => l.n));

  // neutralised periods
  const periods: Period[] = [];
  let open: Period | null = null;
  const leaderLapAfter = (t: number) => lapStarts.find((l) => l.t > t)?.t ?? null;
  const close = (t: number) => { if (open) { open.end = Math.max(open.start + 1000, t); periods.push(open); open = null; } };
  for (const r of rc) {
    const m = (r.message || "").toUpperCase();
    if (/^(VSC|VIRTUAL SAFETY CAR) DEPLOYED/.test(m)) { close(r.t); open = { kind: "VSC", start: r.t, end: r.t, lapFrom: r.lap_number, lapTo: null }; }
    else if (/^(VSC|VIRTUAL SAFETY CAR) ENDING/.test(m)) { if (open?.kind === "VSC") close(r.t + 12e3); }
    else if (/^SAFETY CAR DEPLOYED/.test(m)) { close(r.t); open = { kind: "SC", start: r.t, end: r.t, lapFrom: r.lap_number, lapTo: null }; }
    else if (/^SAFETY CAR IN THIS LAP/.test(m)) { if (open?.kind === "SC") close(leaderLapAfter(r.t) ?? r.t + medianLap * 1000); }
    else if (r.flag === "RED" || /^RED FLAG/.test(m)) { close(r.t); open = { kind: "RED", start: r.t, end: r.t, lapFrom: r.lap_number, lapTo: null }; }
    else if (open?.kind === "RED" && ((r.category === "SessionStatus" && /STARTED|RESUMED/.test(m)) || /^GREEN LIGHT/.test(m) || r.flag === "GREEN")) close(r.t);
    else if (r.flag === "CHEQUERED") close(r.t);
  }
  if (open) close(Math.max(t1, (open as Period).start + 1000));
  for (const p of periods) {
    const a = lapStarts.filter((l) => l.t <= p.start).pop();
    const b = lapStarts.filter((l) => l.t <= p.end).pop();
    p.lapFrom = a?.n ?? p.lapFrom;
    p.lapTo = b?.n ?? p.lapFrom;
  }

  // qualifying phases
  const phases: { name: string; start: number; end: number }[] = [];
  if (kind === "quali") {
    let cur: { name: string; start: number; end: number } | null = null;
    for (const r of rc) {
      if (r.category !== "SessionStatus") continue;
      if (/STARTED/.test(r.message)) { if (cur) phases.push(cur); cur = { name: "Q" + (r.qualifying_phase ?? phases.length + 1), start: r.t, end: r.t }; }
      else if (/FINISHED/.test(r.message) && cur) { cur.end = r.t; phases.push(cur); cur = null; }
    }
    if (cur) { cur.end = t1; phases.push(cur); }
    if (/Sprint/.test(session.session_name)) for (const p of phases) p.name = p.name.replace("Q", "SQ");
  }

  // lap classification (neutralised / clean)
  for (const d of drivers.values()) {
    const durs: number[] = [];
    for (const l of d.laps) {
      const e = l.tEnd ?? l.start + medianLap * 1000;
      l.neutral = periods.some((p) => p.start < e && p.end > l.start);
      if (l.dur && l.n > 1 && !l.pitOut && !l.pitIn && !l.neutral) durs.push(l.dur);
    }
    const m = med(durs);
    d.medianLap = Number.isFinite(m) ? m : null;
    // quali/practice: only push laps (within 107% of the driver's own best) are representative
    const best = durs.length ? Math.min(...durs) : NaN;
    const lim = kind === "race" ? Infinity : (Number.isFinite(best) ? best : medianLap) * 1.07;
    for (const l of d.laps) l.clean = !!l.dur && l.n > 1 && !l.pitOut && !l.pitIn && !l.neutral && l.dur <= lim;
  }

  // final order: classification, then laps completed
  const nums = [...drivers.keys()].filter((n) => drivers.get(n)!.laps.length || drivers.get(n)!.pos.length);
  const finalPos = (d: Driver) => d.result?.position ?? (d.pos.length ? d.pos[d.pos.length - 1].p : 99);
  const finalOrder = [...nums].sort((a, b) => {
    const A = drivers.get(a)!, B = drivers.get(b)!;
    const pa = A.result?.position ?? null, pb = B.result?.position ?? null;
    if (pa != null && pb != null) return pa - pb;
    if (pa != null) return -1;
    if (pb != null) return 1;
    return B.laps.length - A.laps.length || finalPos(A) - finalPos(B);
  });

  const weather = raw.weather.map((w) => ({ ...w, t: ms(w.date) })).filter((w) => Number.isFinite(w.t)).sort((a, b) => a.t - b.t);
  const radio = raw.team_radio.map((r) => ({ ...r, t: ms(r.date) })).filter((r) => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);

  const defaultT = kind === "race" && chequer ? Math.min(t1, chequer + 4000) : t1 - 30e3;

  return {
    session, kind, live, drivers, nums, finalOrder, t0, t1, raceStart, chequer, defaultT, totalLaps, lapStarts,
    periods, phases, rc, weather, radio, medianLap,
  };
}

/* ───────────── queries at an instant ───────────── */

export function leaderLap(m: Model, t: number) {
  let n = 0;
  for (const l of m.lapStarts) if (l.t <= t) n = l.n; else break;
  return n;
}

export type Status = { kind: "SC" | "VSC" | "RED" | "CHEQ" | "YELLOW" | "GREEN" | "PRE"; sectors: number[] };
export function trackStatus(m: Model, t: number): Status {
  const p = m.periods.find((p) => p.start <= t && t < p.end);
  if (p) return { kind: p.kind, sectors: [] };
  if (m.kind === "race" && m.chequer && t >= m.chequer) return { kind: "CHEQ", sectors: [] };
  if (m.kind !== "race" && m.phases.length) {
    const inPhase = m.phases.some((ph) => ph.start <= t && t < ph.end);
    if (!inPhase && t > m.phases[0].start) return { kind: "CHEQ", sectors: [] };
  }
  if (m.raceStart && t < m.raceStart) return { kind: "PRE", sectors: [] };
  const y = new Set<number>();
  for (const r of m.rc) {
    if (r.t > t) break;
    if (r.category !== "Flag") continue;
    if (r.scope === "Sector" && r.sector != null) {
      if (r.flag === "YELLOW" || r.flag === "DOUBLE YELLOW") y.add(r.sector);
      else if (r.flag === "CLEAR" || r.flag === "GREEN") y.delete(r.sector);
    } else if (r.scope === "Track" && (r.flag === "CLEAR" || r.flag === "GREEN")) y.clear();
  }
  // stale yellows (a CLEAR was never sent) expire after 3 minutes
  if (y.size) {
    const recent = m.rc.filter((r) => r.t <= t && r.t > t - 180e3 && r.scope === "Sector" && y.has(r.sector!));
    const live = new Set(recent.map((r) => r.sector!));
    for (const s of [...y]) if (!live.has(s)) y.delete(s);
  }
  return y.size ? { kind: "YELLOW", sectors: [...y].sort((a, b) => a - b) } : { kind: "GREEN", sectors: [] };
}

export type Row = {
  num: number; d: Driver; pos: number; gap: string; int: string; last: Lap | null; best: Lap | null;
  lap: number; compound: string | null; tyreAge: number | null; pits: number; inPit: boolean; out: boolean;
  fastest: boolean; lastIsFastest: boolean; lastIsPb: boolean; bestIsFastest: boolean;
  /** qualifying: the best shown was set in an earlier phase (no time yet in this one) */
  prevPhase: boolean;
};

const fmtGap = (v: number | string | null | undefined) =>
  v == null ? "" : typeof v === "string" ? v.replace(/^\+?(\d+) LAPS?$/i, "+$1 圈") : v === 0 ? "" : "+" + v.toFixed(3);

export function standings(m: Model, t: number): Row[] {
  const rows: Row[] = [];
  let fastest: { num: number; dur: number } | null = null;
  for (const num of m.nums) {
    const d = m.drivers.get(num)!;
    for (const l of d.laps) {
      if (l.tEnd == null || l.tEnd > t || !l.dur || l.pitOut) continue;
      if (m.kind === "race" && l.n === 1) continue;
      if (!fastest || l.dur < fastest.dur) fastest = { num, dur: l.dur };
    }
  }
  const phase = m.kind === "quali" ? m.phases.filter((p) => p.start <= t).pop() ?? null : null;
  for (const num of m.nums) {
    const d = m.drivers.get(num)!;
    const pi = lastAt(d.pos, t);
    const pos = pi >= 0 ? d.pos[pi].p : d.pos[0]?.p ?? 99;
    let last: Lap | null = null, best: Lap | null = null, bestPh: Lap | null = null;
    const li = lastLapStarted(d.laps, t);
    for (let i = 0; i < d.laps.length; i++) {
      const l = d.laps[i];
      if (l.tEnd == null || l.tEnd > t || !l.dur) continue;
      last = l;
      if (l.pitOut || (m.kind === "race" && l.n === 1)) continue;
      if (!best || l.dur < best.dur!) best = l;
      if (phase && l.start >= phase.start - 1000 && (!bestPh || l.dur < bestPh.dur!)) bestPh = l;
    }
    const prevPhase = !!(phase && !bestPh && best);
    if (phase) best = bestPh ?? best;
    const lapN = li >= 0 ? d.laps[li].n : 0;
    const st = [...d.stints].reverse().find((s) => (s.lap_start ?? 1) <= Math.max(1, lapN));
    const compound = st?.compound ?? null;
    const tyreAge = st ? (st.tyre_age_at_start ?? 0) + Math.max(0, lapN - (st.lap_start ?? 1)) : null;
    // OpenF1 pit.date is the pit-lane exit; lane_duration reaches back to the entry
    const pits = d.pits.filter((p) => p.lane != null && p.t - p.lane * 1000 <= t).length;
    const inPit = d.pits.some((p) => p.lane != null && p.t - p.lane * 1000 <= t && t <= p.t);
    const retired = !!(d.result && (d.result.dnf || d.result.dns)) && (d.lastEnd == null || t > d.lastEnd + 20e3);
    let gap = "", int = "";
    if (m.kind === "race") {
      const ii = lastAt(d.ints, t);
      if (ii >= 0) { gap = fmtGap(d.ints[ii].gap); int = fmtGap(d.ints[ii].int); }
    }
    rows.push({
      num, d, pos, gap, int, last, best, lap: lapN, compound, tyreAge, pits, inPit, out: retired,
      fastest: fastest?.num === num, lastIsFastest: !!(last && fastest && fastest.num === num && last.dur === fastest.dur),
      lastIsPb: !!(last && best && last === best), prevPhase,
      bestIsFastest: !!(best && fastest && fastest.num === num && best.dur === fastest.dur),
    });
  }
  rows.sort((a, b) => (a.out === b.out ? a.pos - b.pos : a.out ? 1 : -1));
  if (m.kind !== "race") {
    const lead = rows.find((r) => r.best && !r.prevPhase)?.best?.dur ?? null;
    let prev: number | null = null;
    for (const r of rows) {
      const b = r.prevPhase ? null : r.best?.dur ?? null;
      r.gap = b != null && lead != null && b !== lead ? "+" + (b - lead).toFixed(3) : "";
      r.int = b != null && prev != null && b !== prev ? "+" + (b - prev).toFixed(3) : "";
      if (b != null) prev = b;
    }
  }
  rows.forEach((r, i) => (r.pos = i + 1));
  return rows;
}

/** Fraction of the lap (0..1) completed by a car at time t, or null when it is not on track. */
export function lapProgress(m: Model, d: Driver, t: number, gridSlot: number): number | null {
  const laps = d.laps;
  if (!laps.length) return null;
  const i = lastLapStarted(laps, t);
  if (i < 0) {
    if (m.kind === "race" && m.raceStart && t >= m.t0 && t < m.raceStart) return 1 - 0.0042 * Math.max(1, gridSlot) - 0.004;
    return null;
  }
  const l = laps[i];
  const prev = laps[i - 1];
  const est = (l.dur ?? prev?.dur ?? d.medianLap ?? m.medianLap) * 1000;
  const end = l.end ?? l.start + est;
  if (t < end) return Math.min(0.999, (t - l.start) / Math.max(1, end - l.start));
  // live: the lap in progress is slower than the estimate (previous lap) — hold the car just short of the line
  if (m.live && i === laps.length - 1 && l.dur == null && t - l.start < est * 2) return 0.995;
  // after the last completed lap: in a race, a slower cool-down lap after the flag, otherwise off track
  if (i === laps.length - 1 && m.kind === "race" && m.chequer && end >= m.chequer - 5e3 && !(d.result?.dnf)) {
    const f = (t - end) / (est * 1.35);
    return f < 1 ? f : null;
  }
  return null;
}

/* ───────────── formatting ───────────── */

export function fmtLap(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return m ? `${m}:${s.toFixed(3).padStart(6, "0")}` : s.toFixed(3);
}
export function fmtClock(msv: number, sign = false) {
  const neg = msv < 0;
  const s = Math.floor(Math.abs(msv) / 1000);
  const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return (neg ? "−" : sign ? "+" : "") + (h ? `${h}:${p(mi)}:${p(se)}` : `${p(mi)}:${p(se)}`);
}
export function fmtTOD(t: number, tz?: string) {
  return new Date(t).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz });
}
/** "08:00:00" or "-04:00:00" -> IANA-free fixed offset in minutes */
export function offsetMinutes(gmt: string) {
  const m = gmt.match(/^(-)?(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] ? -1 : 1) * (+m[2] * 60 + +m[3]);
}
export function fmtTrackTime(t: number, gmt: string) {
  const d = new Date(t + offsetMinutes(gmt) * 60e3);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
