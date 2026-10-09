"use client";

import { REPLAY_EVENT } from "@/components/live/replay";

/**
 * Wraps links on a page that has a timing panel: a ▶ link to this same page (`?session=K`, e.g. another session of the
 * weekend on /races/Y/R/replay) switches the panel in place (the panel then `replaceState`s `?session=`, the breadcrumb's
 * 「回放 · 节次」 follows) instead of reloading. Links to another race's replay page navigate normally.
 * (v5.1: no longer used by the season 回放 tab, which is an index without a panel.)
 */
export default function ReplayLinks({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClickCapture={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
        if (!a) return;
        const u = new URL(a.href, window.location.href);
        const k = Number(u.searchParams.get("session"));
        if (u.pathname !== window.location.pathname || !k) return;
        const ev = new CustomEvent(REPLAY_EVENT, { detail: k, cancelable: true });
        if (window.dispatchEvent(ev)) return; // the panel doesn't hold that session: navigate
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("timing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </div>
  );
}
