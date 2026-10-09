"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareInitialResources } from "@/lib/initialResources";
import s from "./race-loading.module.css";
import shell from "./shell.module.css";

type LoadingContext = { register: () => () => void; preview: (home?: boolean) => Promise<void> };
const Context = createContext<LoadingContext | null>(null);

/** Register actual pending work. Unmounting or ready=true releases it. */
export function useRaceLoading(pending: boolean) {
  const context = useContext(Context);
  const register = context?.register;
  useEffect(() => {
    if (pending && register) return register();
  }, [pending, register]);
}

export function useRaceLoadingPreview() {
  return useContext(Context)?.preview;
}

export function RaceLoadingFallback() {
  useRaceLoading(true);
  return <div className={s.fallback} role="status" aria-live="polite">
    <span className={s.srOnly}>正在加载页面</span>
    <div className={s.skeleton} aria-hidden="true"><i /><i /><i /></div>
  </div>;
}

export default function RaceLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const [entryChecked, setEntryChecked] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const sample = useRef<AudioBuffer | null>(null);
  const engineSample = useRef<AudioBuffer | null>(null);
  const decoding = useRef<Promise<AudioBuffer[]> | null>(null);
  const mutedRef = useRef(false);
  const router = useRouter();
  const register = useCallback(() => {
    setPending((n) => n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setPending((n) => Math.max(0, n - 1));
    };
  }, []);

  useEffect(() => {
    setEntryChecked(true);
    try { if (sessionStorage.getItem("pitwall-grid-ready") === "yes") return; } catch {}
    setVisible(true);
    const release = register();
    let active = true;
    void prepareInitialResources((completed, total) => {
      if (active) setProgress(Math.round(completed / total * 100));
    }).catch(() => {}).finally(release);
    router.prefetch("/cars");
    router.prefetch(`/seasons/${new Date().getFullYear()}`);
    return () => { active = false; release(); };
  }, [register, router]);

  const unlockAudio = useCallback(async () => {
    try {
      const context = audio.current ?? new AudioContext();
      audio.current = context;
      const resuming = context.state === "suspended" ? context.resume().catch(() => {}) : Promise.resolve();
      if (!sample.current) {
        decoding.current ??= Promise.all([
          "/sounds/f1-start-light-v2.wav", "/sounds/f1-engine-launch.wav",
        ].map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Start sound unavailable");
          return context.decodeAudioData(await response.arrayBuffer());
        }));
        [sample.current, engineSample.current] = await decoding.current;
      }
      if (context.state === "suspended") {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            resuming,
            new Promise<void>((resolve) => { timer = setTimeout(resolve, 250); }),
          ]);
        } finally { clearTimeout(timer); }
      }
      const running = audio.current === context && context.state === "running";
      return running;
    } catch {
      decoding.current = null;
      // A failed audio request must never block the page.
      return false;
    }
  }, []);

  useEffect(() => {
    try {
      mutedRef.current = localStorage.getItem("pitwall-start-sound") === "off";
      setMuted(mutedRef.current);
    } catch {}
    return () => {
      const context = audio.current;
      audio.current = null;
      sample.current = null;
      engineSample.current = null;
      decoding.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, [unlockAudio]);

  useEffect(() => {
    if (!visible) return;
    // The ritual never waits for browser audio permission or audio downloads.
    setStarted(true);
    const enableSound = () => { if (!mutedRef.current) void unlockAudio(); };
    enableSound();
    document.addEventListener("pointerdown", enableSound);
    document.addEventListener("keydown", enableSound);
    return () => {
      document.removeEventListener("pointerdown", enableSound);
      document.removeEventListener("keydown", enableSound);
    };
  }, [visible, unlockAudio]);

  const playTone = useCallback(() => {
    const context = audio.current;
    if (!context || !sample.current || context.state !== "running" || mutedRef.current || document.visibilityState === "hidden") return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = sample.current;
    gain.gain.value = 0.6;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }, []);

  const playEngine = useCallback(() => new Promise<void>((resolve) => {
    const context = audio.current;
    if (!context || !engineSample.current || context.state !== "running" || mutedRef.current) {
      setTimeout(resolve, 1600);
      return;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = engineSample.current;
    gain.gain.value = 0.6;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); resolve(); };
    source.start();
  }), []);

  const toggleSound = async () => {
    const nextMuted = !muted;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    try { localStorage.setItem("pitwall-start-sound", nextMuted ? "off" : "on"); } catch {}
    if (!nextMuted) await unlockAudio();
  };

  const preview = async (home = false) => {
    // Keep the audio context in this document: a reload loses the click's activation.
    if (!mutedRef.current) void unlockAudio();
    setStarted(true);
    setRevealing(false);
    setProgress(0);
    setRun((value) => value + 1);
    setVisible(true);
    const release = register();
    void prepareInitialResources((completed, total) => {
      setProgress(Math.round(completed / total * 100));
    }).catch(() => {}).finally(release);
    if (home) router.push("/live");
  };

  return (
    <Context.Provider value={{ register, preview }}>
      <div inert={visible || !entryChecked} style={{ visibility: (visible && !revealing) || !entryChecked ? "hidden" : "visible" }}>{children}</div>
      {visible && <RaceLights key={run} pending={pending > 0} started={started} progress={progress} soundOn={!muted}
        onTone={playTone} onEngine={playEngine} onReveal={() => setRevealing(true)} onSound={toggleSound} onComplete={() => {
          setVisible(false);
          try { sessionStorage.setItem("pitwall-grid-ready", "yes"); } catch {}
        }} />}
    </Context.Provider>
  );
}

function RaceLights({ pending, started, progress, soundOn, onTone, onEngine, onReveal, onSound, onComplete }: {
  pending: boolean; started: boolean; progress: number; soundOn: boolean; onTone: () => void;
  onEngine: () => Promise<void>; onReveal: () => void; onSound: () => void; onComplete: () => void;
}) {
  const [lit, setLit] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [allLightsHeld, setAllLightsHeld] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressValue = useRef(0);
  const effectiveLit = reduced && started ? 5 : lit;
  const targetProgress = Math.min(pending ? progress : 100, effectiveLit * 20);
  const [lightsOut, setLightsOut] = useState(false);
  const readyToLaunch = started && !pending && allLightsHeld && displayProgress === 100;
  const exiting = lightsOut;

  useEffect(() => {
    if (!readyToLaunch) return;
    setLightsOut(true);
    // Begin the reveal with the engine; its tail continues over the arriving page.
    void onEngine().catch(() => {});
  }, [readyToLaunch, onEngine]);
  const reveal = useRef(onReveal);
  reveal.current = onReveal;
  const complete = useRef(onComplete);
  complete.current = onComplete;

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!started || reduced || lit >= 5) return;
    const timer = setTimeout(() => {
      setLit((n) => n + 1);
      onTone();
    }, [350, 700, 760, 700, 800][lit]);
    return () => clearTimeout(timer);
  }, [started, lit, reduced, onTone]);

  useEffect(() => {
    if (!started || effectiveLit < 5) return;
    // Let the last recorded tone finish and keep all five columns visibly lit.
    const timer = setTimeout(() => setAllLightsHeld(true), 600);
    return () => clearTimeout(timer);
  }, [started, effectiveLit]);

  useEffect(() => {
    let frame: number;
    let began: number | undefined;
    const from = progressValue.current;
    const tick = (time: number) => {
      began ??= time;
      const fraction = Math.min(1, (time - began) / 280);
      progressValue.current = Math.round(from + (targetProgress - from) * fraction);
      setDisplayProgress(progressValue.current);
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetProgress]);

  useEffect(() => {
    if (!exiting) return;
    reveal.current();
    const timer = setTimeout(() => complete.current(), reduced ? 0 : 900);
    return () => clearTimeout(timer);
  }, [exiting, reduced]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <div className={`${s.overlay} ${exiting ? s.exiting : ""}`} role="dialog" aria-modal="true" aria-label="PITWALL initial loading" data-race-loading data-phase={exiting ? "entering" : lightsOut ? "lights-out" : "loading"} data-light-count={effectiveLit}>
      <div className={s.sequence}>
      <div className={s.brand} aria-label="PITWALL">
        <span className={shell.mark} aria-hidden="true"><i /><i /></span>
        <span className={shell.word}>PITWALL</span>
      </div>
        <div className={s.lights} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => <div key={index} className={s.bezel}>
            <div className={`${s.lamp} ${!lightsOut && index < (reduced ? 5 : lit) ? s.lit : ""}`} data-lit={!lightsOut && index < (reduced ? 5 : lit)} />
            <div className={`${s.lamp} ${!lightsOut && index < (reduced ? 5 : lit) ? s.lit : ""}`} />
          </div>)}
        </div>
        <div className={s.caption} lang="en">
          <p role="status" aria-live="polite">{lightsOut ? "LIGHTS OUT" : pending || effectiveLit < 5 ? "GETTING READY" : "READY"}</p>
          <span className={s.progress} role="progressbar" aria-label="Launch readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayProgress}>{String(displayProgress).padStart(3, "0")}<small>%</small></span>
        </div>
      </div>
      <button type="button" className={s.sound} data-race-sound-toggle onClick={onSound} aria-pressed={soundOn}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {soundOn ? <><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}
        </svg>
        <span lang="en">{soundOn ? "SOUND ON" : "SOUND OFF"}</span>
      </button>
    </div>
  );
}
