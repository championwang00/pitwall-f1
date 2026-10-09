"use client";

/** ≤ 960px: the "…" that stands in for the folded middle of the trail; one tap expands the trail in place (§0.5.6). */
export default function BreadcrumbMore({ className }: { className?: string }) {
  return (
    <button type="button" className={className} aria-label="展开完整路径"
      onClick={(e) => { const nav = e.currentTarget.closest("nav"); if (nav) nav.dataset.open = ""; }}>…</button>
  );
}
