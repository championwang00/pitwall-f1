"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import s from "./tabs.module.css";

const TABS = [
  { seg: "", label: "赛历", en: "Schedule" },
  { seg: "standings", label: "积分榜", en: "Standings" },
  { seg: "era", label: "时代", en: "Era" },
  { seg: "circuits", label: "赛道", en: "Circuits" },
  { seg: "drivers", label: "车手", en: "Drivers" },
  { seg: "teams", label: "车队", en: "Teams" },
  { seg: "cars", label: "赛车", en: "Cars" },
  { seg: "replay", label: "回放", en: "Replay" }, // v5: only 2023 ≤ Y ≤ this season with a finished session (the layout passes its count)
];

export default function YearTabs({ year, counts }: { year: number; counts: Partial<Record<string, number>> }) {
  const path = usePathname();
  const cur = path.split("/")[3] ?? "";
  // sticky stack: masthead → these tabs → anything sticky inside the page (e.g. the replay controls) sits below us
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = nav.current, root = document.documentElement;
    if (!el) return;
    const set = () => root.style.setProperty("--sub-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.setProperty("--sub-h", "0px"); };
  }, []);
  return (
    <nav ref={nav} className={s.tabs} aria-label={`${year} 赛季`}>
      <div className={s.in}>
        <span className={s.year}>{year}</span>
        {TABS.filter((t) => t.seg !== "replay" || counts.replay).map((t) => (
          <Link key={t.seg} href={`/seasons/${year}${t.seg ? "/" + t.seg : ""}`} className={cur === t.seg ? s.on : undefined} scroll={false}>
            {t.label}
            {counts[t.seg] != null && <i>{counts[t.seg]}</i>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
