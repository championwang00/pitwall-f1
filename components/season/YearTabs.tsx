"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import s from "./tabs.module.css";

/** v5.1 (user: 「导航放到最上面 … 总览是整体介绍，点某个 tab 显示对应内容」): 总览 first, 赛历 moved to /seasons/Y/calendar.
 *  No 时代 / 赛车 tabs (spec §0.8.7 D3): /seasons/Y/era → /eras/{id}, /seasons/Y/cars → /seasons/Y/teams (308). */
const TABS = [
  { seg: "", label: "总览", en: "Overview" },
  { seg: "calendar", label: "赛历", en: "Schedule" },
  { seg: "standings", label: "积分榜", en: "Standings" },
  { seg: "circuits", label: "赛道", en: "Circuits" },
  { seg: "drivers", label: "车手", en: "Drivers" },
  { seg: "teams", label: "车队", en: "Teams" },
  { seg: "replay", label: "回放", en: "Replay" }, // only 2023 ≤ Y ≤ this season with a finished race (the layout passes its count)
];

/**
 * The year hub's tab bar (sticky under the masthead) with the breadcrumb (`crumbs`) right UNDER it — the tabs are the
 * page's own navigation, the crumb says where it sits (user: 面包屑放在这个导航下面).
 * `--sub-h` = the pinned tab row's height (anything sticky inside the page sits below it).
 */
export default function YearTabs({ year, counts, crumbs }: { year: number; counts: Partial<Record<string, number>>; crumbs?: React.ReactNode }) {
  const path = usePathname();
  const cur = path.split("/")[3] ?? "";
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = row.current, root = document.documentElement;
    if (!el) return;
    const set = () => root.style.setProperty("--sub-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.setProperty("--sub-h", "0px"); };
  }, []);
  return (
    <>
    <div className={s.tabs}>
      <nav ref={row} className={s.row} aria-label={`${year} 赛季`}>
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
    </div>
    {crumbs && <div className={s.crumbs}>{crumbs}</div>}
    </>
  );
}
