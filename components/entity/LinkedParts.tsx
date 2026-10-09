import EntityLink from "./EntityLink";
import Term from "./Term";
import type { LinkPart } from "@/lib/linkify";

/**
 * Renders lib/linkify's linkParts(): entity / race links with the hover intro (prose underline, `.ilink`) and glossary
 * terms. No server imports, so client components can render prose the server tokenized (e.g. /api/talk).
 */
export default function LinkedParts({ parts, className = "ilink" }: { parts: LinkPart[]; className?: string }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "term" && p.term ? <Term key={i} t={p.term}>{p.t}</Term>
        : p.href && p.kind && p.kind !== "term" ? <EntityLink key={i} kind={p.kind} id={p.id!} href={p.href} className={className}>{p.t}</EntityLink>
        : p.t)}
    </>
  );
}
