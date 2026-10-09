import EntityLink from "./EntityLink";

/**
 * A year or a span of years where each year is its season link (global link rule: a bare year → /seasons/Y).
 * `short` writes the end year as two digits ("2010–26") like the year rail; `sep` defaults to an en dash.
 * Years outside the championship (before 1950 / after the current season) stay plain text.
 */
export default function YearSpan({ from, to, short, sep = "–", className = "hlink", preview = true }: {
  from: number | null | undefined; to?: number | null; short?: boolean; sep?: string; className?: string; preview?: boolean;
}) {
  if (!from) return null;
  const now = new Date().getUTCFullYear();
  const one = (y: number, label: string) => (y >= 1950 && y <= now
    ? <EntityLink kind="year" id={String(y)} className={className} preview={preview}>{label}</EntityLink>
    : <>{label}</>);
  if (!to || to === from) return one(from, String(from));
  return <>{one(from, String(from))}{sep}{one(to, short ? String(to).slice(2) : String(to))}</>;
}
