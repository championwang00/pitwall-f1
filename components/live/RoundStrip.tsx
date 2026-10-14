"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import l from "./livepage.module.css";

/**
 * The season's rounds as one horizontal strip (user: 左右滚动；中间定位到当前比赛，左边上一场，右边下一场).
 * Opens centred on `focus`; arrows page by two cards. Vertical wheels remain page scrolling.
 */
export default function RoundStrip({ children, focus }: { children: React.ReactNode; focus: number }) {
  const ref = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (el) setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 });
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    const li = el?.children[focus] as HTMLElement | undefined;
    if (el && li) el.scrollLeft = li.offsetLeft - (el.clientWidth - li.offsetWidth) / 2;
    update();
  }, [focus, update]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    const card = el?.children[0] as HTMLElement | undefined;
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 24) * 2, behavior: "smooth" });
  };

  return (
    <div className={l.stripWrap}>
      <button type="button" className={`${l.stripArrow} ${l.stripPrev}`} onClick={() => page(-1)} disabled={edge.start} aria-label="上一站"><Icon name="chevron-left" size={22} /></button>
      <ol ref={ref} className={l.strip}>{children}</ol>
      <button type="button" className={`${l.stripArrow} ${l.stripNext}`} onClick={() => page(1)} disabled={edge.end} aria-label="下一站"><Icon name="chevron-right" size={22} /></button>
    </div>
  );
}
