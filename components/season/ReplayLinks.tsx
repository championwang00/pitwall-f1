"use client";

import { REPLAY_EVENT } from "@/components/live/replay";

/**
 * Wraps a season's race cards on the 回放 tab: a ▶ link to this same page (`?session=K`) switches the page's timing
 * panel in place (the panel then `replaceState`s `?session=`, so the breadcrumb follows) instead of reloading the page.
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
