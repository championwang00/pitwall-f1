"use client";

import Icon from "@/components/ui/Icon";
import { REPLAY_EVENT } from "./replay";

/**
 * ▶ for one session. On a page with a timing panel it switches the page's timing panel and scrolls to it (the panel cancels the event);
 * anywhere else, or for a session the panel doesn't hold, it is a plain link to that race's replay page
 * /races/Y/R/replay?session=K (v5.1). Without `round` it links the season's 回放 index, which redirects to the owner race.
 */
export default function ReplayButton({ sessionKey, year, round, className, title, children }: {
  sessionKey: number; year?: number; round?: number; className?: string; title?: string; children?: React.ReactNode;
}) {
  const y = year ?? new Date().getUTCFullYear();
  const href = round ? `/races/${y}/${round}/replay?session=${sessionKey}` : `/seasons/${y}/replay?session=${sessionKey}`;
  return (
    <a
      href={href}
      className={className}
      title={title}
      aria-label={title}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const ev = new CustomEvent(REPLAY_EVENT, { detail: sessionKey, cancelable: true });
        if (window.dispatchEvent(ev)) return; // nobody took it: navigate
        e.preventDefault();
        document.getElementById("timing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children ?? <Icon name="play" size={12} />}
    </a>
  );
}
