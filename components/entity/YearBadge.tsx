import EntityLink from "./EntityLink";
import u from "@/components/unit/unit.module.css";

/**
 * A season as a badge (white plate, Formula1 900 — the `u.yBadge` style), linked to /seasons/Y with the season card.
 * `href` may point elsewhere (a race of that year: /races/Y/R) — it still previews the season. `plain`: the page's own
 * year (the year hub's own number) — not a link.
 */
export default function YearBadge({ year, href, label, className, plain, preview = true }: {
  year: number; href?: string; label?: React.ReactNode; className?: string; plain?: boolean; preview?: boolean;
}) {
  const cls = `${className ?? u.yBadge} hlink`;
  if (plain) return <span className={className ?? u.yBadge}>{label ?? year}</span>;
  return <EntityLink kind="year" id={String(year)} href={href} className={cls} preview={preview}>{label ?? year}</EntityLink>;
}
