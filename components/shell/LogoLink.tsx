"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRELOAD_SIG, planSig } from "@/lib/preloadSig";

/**
 * The PITWALL logo → /live. If the first-visit loader's plan has changed since it last ran (a new session finished, so
 * there is new replay data to prepare), go through the red-lights loader again; otherwise navigate straight in
 * (user: 点击 logo 回首页…如果有新数据要拉取，就进一下加载页面，如果没有要拉的就直接进).
 */
export default function LogoLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const go = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // new tab etc.: plain link
    e.preventDefault();
    let fresh = false;
    try {
      const r = await fetch("/api/initial-load", { cache: "no-store", signal: AbortSignal.timeout(1500) });
      const plan = (await r.json()) as { sessions?: { session_key: number }[]; session?: { session_key: number } | null };
      const sessions = plan.sessions?.length ? plan.sessions : plan.session ? [plan.session] : [];
      fresh = sessions.length > 0 && planSig(sessions) !== localStorage.getItem(PRELOAD_SIG);
    } catch { /* slow or offline: just go in */ }
    if (fresh) {
      // the loader runs on a full page load while this flag is unset
      try { sessionStorage.removeItem("pitwall-grid-ready"); } catch {}
      window.location.assign("/live");
    } else router.push("/live");
  };
  return <Link href="/live" className={className} aria-label="PITWALL · 实时" onClick={go}>{children}</Link>;
}
