"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import s from "./term.module.css";

export type TermDef = { term: string; en: string; def: string; src?: string };

/** A technical term in prose (光头胎, DRS…): dotted underline; hover / focus / tap shows a plain-language explanation. */
export default function Term({ t, children }: { t: TermDef; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = () => {
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const up = r.bottom + 200 > window.innerHeight && r.top > 220;
      setPos({ x: Math.min(Math.max(12, r.left), window.innerWidth - 332), y: up ? r.top - 8 : r.bottom + 8, up });
    }, 200);
  };
  const close = () => { if (timer.current) clearTimeout(timer.current); setPos(null); };
  return (
    <>
      <span ref={ref} className={s.term} tabIndex={0} role="button" aria-label={`${t.term}：${t.def}`}
        onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close} onClick={() => (pos ? close() : open())}>
        {children}
      </span>
      {pos && typeof document !== "undefined" && createPortal(
        <div className={`${s.tip} ${pos.up ? s.up : ""}`} style={{ left: pos.x, top: pos.y }} role="tooltip">
          <p className={s.head}><b>{t.term}</b><span>{t.en}</span></p>
          <p className={s.def}>{t.def}</p>
          {t.src && <p className={s.src}>术语解释 · 来源 {new URL(t.src).hostname.replace("en.", "")}</p>}
        </div>,
        document.body,
      )}
    </>
  );
}
