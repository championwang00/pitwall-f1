import Link from "next/link";

export type Kind = "driver" | "team" | "circuit" | "year" | "car" | "era" | "race";

/** `race` ids are `${year}-${round}` (→ /races/Y/R); `era` ids are lib/eras.ts ids. */
export const hrefOf = (kind: Kind, id: string) =>
  kind === "driver" ? `/drivers/${id}` : kind === "team" ? `/teams/${id}` : kind === "circuit" ? `/circuits/${id}` : kind === "car" ? `/cars/${id}`
  : kind === "era" ? `/eras/${id}` : kind === "race" ? `/races/${id.replace("-", "/")}` : `/seasons/${id}`;

/** A link written as a season link that actually opens one race (/races/Y/R) previews that race, not the season. */
const RACE_HREF = /^\/races\/(\d{4})\/(\d+)$/;

/** The entity an internal href opens (its hover card), or null for anything else (indexes, tabs, sub-pages, tools). */
export function entityOfHref(href: string | null | undefined): { kind: Kind; id: string } | null {
  const m = /^\/(drivers|teams|circuits|cars|eras|seasons|races)\/([^/?#]+)(?:\/(\d+))?(?:[?#].*)?$/.exec(href ?? "");
  if (!m) return null;
  const [, sec, a, b] = m;
  if (sec === "races") return b && /^\d{4}$/.test(a) ? { kind: "race", id: `${a}-${b}` } : null;
  if (b) return null;
  if (sec === "seasons") return /^\d{4}$/.test(a) ? { kind: "year", id: a } : null;
  const kind = ({ drivers: "driver", teams: "team", circuits: "circuit", cars: "car", eras: "era" } as const)[sec as "drivers"];
  return { kind, id: decodeURIComponent(a) };
}

/**
 * Link to one of the four base units. Deliberately NOT a stateful client component: pages carry hundreds of these,
 * so the Wikipedia-style hover card is drawn by ONE page-level listener (components/entity/HoverLayer.tsx) that reads
 * `data-entity` / `data-eid`. `preview={false}` (data-preview="0") for links that already ARE the entity's card;
 * links to the page you're on never preview either (checked by the layer).
 */
export default function EntityLink({ kind: k, id: i, children, className, style, href, transitionTypes, title, preview = true, year }: {
  kind: Kind; id: string; children: React.ReactNode; className?: string; style?: React.CSSProperties; href?: string; transitionTypes?: string[]; title?: string; preview?: boolean;
  /** Year context (user: a click lands on the most specific unit): driver / team / circuit open that year's slice. */
  year?: number | null;
}) {
  const rm = k === "year" && href ? RACE_HREF.exec(href) : null;
  const kind: Kind = rm ? "race" : k, id = rm ? `${rm[1]}-${rm[2]}` : i;
  // a car is already one team × one season slice, an era / a race are fixed spans: never `?year=` (spec §4.5)
  const target = href ?? (year && kind !== "year" && kind !== "car" && kind !== "era" && kind !== "race" ? `${hrefOf(kind, id)}?year=${year}` : hrefOf(kind, id));
  return (
    <Link href={target} className={className} style={style} transitionTypes={transitionTypes} title={title}
      data-entity={kind} data-eid={id} data-year={year ?? undefined} data-preview={preview ? undefined : "0"}>
      {children}
    </Link>
  );
}

/**
 * A link whose target is only known as an href (talking points, records, race cards…): when the href is an entity page
 * it renders an EntityLink (hover card; `preview={false}` = the link IS that entity's card), else a plain Link.
 */
export function EntityHref({ href, children, className, style, title, preview = true, ...rest }: {
  href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties; title?: string; preview?: boolean;
  "aria-label"?: string; tabIndex?: number;
}) {
  const e = entityOfHref(href);
  if (!e) return <Link href={href} className={className} style={style} title={title} {...rest}>{children}</Link>;
  return (
    <Link href={href} className={className} style={style} title={title} {...rest}
      data-entity={e.kind} data-eid={e.id} data-preview={preview ? undefined : "0"}>
      {children}
    </Link>
  );
}
