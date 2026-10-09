"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A visible pointer for recorded / automated walkthroughs (automation sends real mouse events but draws no cursor).
 * Off unless the URL carries ?cursor=1 (remembered for the session; ?cursor=0 turns it off). Purely visual.
 */
export default function DemoCursor() {
  const [on, setOn] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("cursor");
    try {
      if (q === "1") sessionStorage.setItem("pitwall-demo-cursor", "1");
      if (q === "0") sessionStorage.removeItem("pitwall-demo-cursor");
      setOn(sessionStorage.getItem("pitwall-demo-cursor") === "1");
    } catch { setOn(q === "1"); }
  }, []);

  useEffect(() => {
    if (!on) return;
    let n = 0;
    const move = (e: MouseEvent) => { if (dot.current) dot.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; };
    const down = (e: MouseEvent) => {
      const id = ++n;
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 600);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", down, { passive: true });
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mousedown", down); };
  }, [on]);

  if (!on) return null;
  return (
    <>
      <style>{`
        .pw-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; width: 0; height: 0;
          transition: transform .18s cubic-bezier(0.22, 1, 0.36, 1); transform: translate(-100px, -100px); }
        .pw-cursor i { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,.92);
          box-shadow: 0 0 0 2px #15151e, 0 2px 8px rgba(0,0,0,.45); }
        .pw-ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 36px; height: 36px; margin: -18px 0 0 -18px;
          border-radius: 50%; border: 2px solid #e10600; animation: pwRipple .6s ease-out forwards; }
        @keyframes pwRipple { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .pw-cursor { transition: none; } .pw-ripple { animation: none; opacity: 0; } }
      `}</style>
      <div ref={dot} className="pw-cursor" aria-hidden>
        <i />
      </div>
      {ripples.map((r) => <span key={r.id} className="pw-ripple" style={{ left: r.x, top: r.y }} aria-hidden />)}
    </>
  );
}
