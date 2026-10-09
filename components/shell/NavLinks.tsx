"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./shell.module.css";

/**
 * Main nav (IA spec v5 §1.1) — Chinese labels, set in the F1 nav type. Exactly one item is lit on every page (S1), decided
 * by the first path segment only (the query string never changes it). 对比 is a tool by the search (see Header) but sits
 * in the 车手 tree, so it lights 车手.
 */
const NAV: { href: string; label: string; segs: string[] }[] = [
  { href: "/live", label: "实时", segs: ["", "live", "calendar"] },
  { href: "/seasons", label: "历史", segs: ["seasons", "eras", "races"] },
  { href: "/circuits", label: "赛道", segs: ["circuits"] },
  { href: "/drivers", label: "车手", segs: ["drivers", "compare"] },
  { href: "/teams", label: "车队", segs: ["teams"] },
  { href: "/cars", label: "赛车", segs: ["cars"] },
];

export default function NavLinks({ live }: { live: boolean }) {
  const seg = usePathname().split("/")[1] ?? "";
  return (
    <nav className={s.nav} aria-label="主导航">
      {NAV.map((n) => {
        const on = n.segs.includes(seg);
        return (
          <Link key={n.href} href={n.href} className={on ? s.navOn : undefined} aria-current={on ? "page" : undefined}>
            {n.href === "/live" && <span className={live ? s.liveDot : s.idleDot} />}
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
