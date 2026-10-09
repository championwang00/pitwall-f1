"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import s from "./navSkeleton.module.css";

/**
 * Page-navigation skeleton (transitions.dev #14). Any same-origin link click marks the navigation pending; if the new
 * page isn't there after 300 ms, a pulsing skeleton covers the content column; when the route changes it cross-fades
 * away over the new page. Fast navigations (the usual case) show nothing at all — no dimming, no fade, no flash. Covers year-rail clicks, tab switches and ?year= changes,
 * which Next's loading.tsx boundary does not.
 */
export default function NavSkeleton() {
  const path = usePathname();
  const sp = useSearchParams();
  const key = `${path}?${sp.toString()}`;
  const [phase, setPhase] = useState<"idle" | "pending" | "show" | "reveal">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  // start: capture clicks on internal links that lead somewhere else
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
      if (u.pathname === location.pathname && u.search === location.search) return; // same page / hash only
      setPhase("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPhase((p) => (p === "pending" ? "show" : p)), 300);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // arrive: the route changed → reveal
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    setPhase((p) => (p === "show" ? "reveal" : "idle"));
    const t = setTimeout(() => setPhase("idle"), 420);
    return () => clearTimeout(t);
  }, [key]);

  // safety: never leave the page dimmed (e.g. a navigation that was cancelled)
  useEffect(() => {
    if (phase !== "pending" && phase !== "show") return;
    const t = setTimeout(() => setPhase("idle"), 15000);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "idle" || phase === "pending") return null;
  return (
    <div className={s.root} aria-hidden>
      <div className={`t-skel ${s.wrap} ${phase === "reveal" ? "is-revealed" : ""}`}>
        <div className={`t-skel-skeleton is-pulsing ${s.skel}`}>
          <i className={s.crumb} />
          <i className={s.hero} />
          <i className={s.line} />
          <i className={s.short} />
          <div className={s.grid}><i /><i /><i /><i /><i /><i /></div>
        </div>
      </div>
    </div>
  );
}
