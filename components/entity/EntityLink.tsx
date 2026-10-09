import Link from "next/link";

export type Kind = "driver" | "team" | "circuit" | "year";

export const hrefOf = (kind: Kind, id: string) =>
  kind === "driver" ? `/drivers/${id}` : kind === "team" ? `/teams/${id}` : kind === "circuit" ? `/circuits/${id}` : `/seasons/${id}`;

/**
 * Link to one of the four base units. Deliberately NOT a stateful client component: pages carry hundreds of these,
 * so the Wikipedia-style hover card is drawn by ONE page-level listener (components/entity/HoverLayer.tsx) that reads
 * `data-entity` / `data-eid`. `preview={false}` (data-preview="0") for links that already ARE the entity's card;
 * links to the page you're on never preview either (checked by the layer).
 */
export default function EntityLink({ kind, id, children, className, style, href, transitionTypes, title, preview = true, year }: {
  kind: Kind; id: string; children: React.ReactNode; className?: string; style?: React.CSSProperties; href?: string; transitionTypes?: string[]; title?: string; preview?: boolean;
  /** Year context (user: a click lands on the most specific unit): driver / team / circuit open that year's slice. */
  year?: number | null;
}) {
  const target = href ?? (year && kind !== "year" ? `${hrefOf(kind, id)}?year=${year}` : hrefOf(kind, id));
  return (
    <Link href={target} className={className} style={style} transitionTypes={transitionTypes} title={title}
      data-entity={kind} data-eid={id} data-preview={preview ? undefined : "0"}>
      {children}
    </Link>
  );
}
