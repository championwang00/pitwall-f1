import Link from "next/link";
import { Fragment } from "react";
import EntityLink, { entityOfHref, type Kind } from "@/components/entity/EntityLink";
import Icon from "@/components/ui/Icon";
import BreadcrumbMore from "./BreadcrumbMore";
import s from "./breadcrumb.module.css";

/**
 * One crumb (IA spec v5 §0.5.6). The last crumb is always plain text (the current position); the others link.
 * `kind` + `id` on a parent crumb → an EntityLink (hover card per §1.3; a link to the page you're on never previews).
 * `name`: plain-text label for the JSON-LD BreadcrumbList when `label` isn't a string.
 */
export type Crumb = { label: React.ReactNode; href?: string; kind?: Kind; id?: string; name?: string };

const text = (c: Crumb) => c.name ?? (typeof c.label === "string" || typeof c.label === "number" ? String(c.label) : "");

/**
 * The site's one breadcrumb: the ancestor chain of the page in the site tree (§0.5.2), first crumb = the lit top-nav
 * item (S2). Root pages have none. Plain markup (no client state) so both server pages and the year-hub's client crumb
 * can render it; the ≤ 960px "…" collapse is the only interactive bit (BreadcrumbMore).
 * It always sits INSIDE the page's first block (user: never a strip of its own) and inherits that block's text colour.
 * `tone="dark"`: force white where inheritance can't reach. `flush`: the parent already provides the gutter.
 */
export default function Breadcrumb({ items, tone = "paper", flush = false, className, style }: { items: Crumb[]; tone?: "paper" | "dark"; flush?: boolean; className?: string; style?: React.CSSProperties }) {
  if (!items.length) return null;
  const n = items.length;
  const collapse = n > 3; // mobile: first › … › second-last › current
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: text(c), ...(c.href ? { item: c.href } : {}) })),
  };
  return (
    <nav aria-label="面包屑" className={`${s.nav} ${tone === "dark" ? s.dark : ""} ${flush ? s.flush : ""} ${className ?? ""}`} data-collapse={collapse ? "" : undefined} style={style}>
      <ol className={s.ol}>
        {items.map((c, i) => {
          const last = i === n - 1;
          const mid = collapse && i >= 1 && i <= n - 3;
          const label = c.kind === "year" ? <span className="num">{c.label}</span> : c.label;
          // a parent crumb that is an entity (subject, season, era, race) previews it; section crumbs are plain links
          const ent = c.kind && c.id ? { kind: c.kind, id: c.id } : entityOfHref(c.href);
          const body = last || !c.href
            ? <span>{label}</span>
            : ent
              ? <EntityLink kind={ent.kind} id={ent.id} href={c.href}>{label}</EntityLink>
              : <Link href={c.href}>{label}</Link>;
          return (
            <Fragment key={i}>
              {collapse && i === 1 && <li className={`${s.li} ${s.moreLi}`}><Icon name="chevron-right" size={12} className={s.sep} /><BreadcrumbMore className={s.more} /></li>}
              <li className={`${s.li} ${mid ? s.mid : ""}`} aria-current={last ? "page" : undefined}>
                {i > 0 && <Icon name="chevron-right" size={12} className={s.sep} />}
                {body}
              </li>
            </Fragment>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </nav>
  );
}

/** Unit page trail (§0.5.3): 栏目 › 主体 [› Y]. With a `?year=` slice the subject links back to the all-years page. */
export function subjectCrumbs(section: string, sectionHref: string, subject: { label: string; href: string; kind?: Kind; id?: string }, year?: number | null): Crumb[] {
  const items: Crumb[] = [{ label: section, href: sectionHref }];
  items.push(year ? { label: subject.label, href: subject.href, kind: subject.kind, id: subject.id } : { label: subject.label });
  if (year) items.push({ label: year, kind: "year", name: String(year) });
  return items;
}
