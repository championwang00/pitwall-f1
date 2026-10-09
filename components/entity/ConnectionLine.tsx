import { Fragment } from "react";
import Link from "next/link";
import EntityLink, { entityOfHref } from "./EntityLink";
import Person from "./Person";
import Team from "./Team";
import Car from "./Car";
import Circuit from "./Circuit";
import YearBadge from "./YearBadge";
import Engine from "./Engine";
import Laurel, { MiniLaurel } from "./Laurel";
import { flag } from "@/lib/assets";
import type { Chip } from "@/lib/hero";
import o from "./objecthero.module.css";

/**
 * One chip of a hero line (IA spec v6 §0.6.5), dispatched to the shared entity components at the hero size:
 * person 24 / team 22 / car 20 / circuit 22 / year badge 15 / engine & words 15. `light`: on a white card.
 * `meta`: inside the ⑤ meta line — plain text, flags, and quiet links instead of badges.
 */
export function ChipView({ c, light, meta }: { c: Chip; light?: boolean; meta?: boolean }) {
  switch (c.kind) {
    case "driver":
      return <Person id={c.id} name={c.name} size={24} year={c.year} color={c.color} preview={c.preview ?? true} />;
    case "team":
      return <Team id={c.id} name={c.name} size={22} onDark={!light} year={c.year} href={c.href} plain={c.plain} />;
    case "car":
      return <Car id={c.id} name={c.name} team={c.team} year={c.year} plain={c.plain} />;
    case "circuit":
      return <Circuit id={c.id} name={c.name} year={c.year} onDark={!light} plain={c.plain} />;
    case "year":
      return c.style === "link" || meta
        ? <YearBadge year={c.year} href={c.href} label={c.label} className={meta ? "hlink" : o.textLink} plain={c.plain} />
        : <YearBadge year={c.year} href={c.href} label={c.label} className={o.badge} plain={c.plain} />;
    case "engine":
      return <span className={o.v}><Engine id={c.id} name={c.name} year={c.year} self={c.self} className={meta ? "hlink" : o.textLink} /></span>;
    case "era":
      return <EntityLink kind="era" id={c.id} className={o.textLink} preview={c.preview ?? true}>{c.title}</EntityLink>;
    case "link": {
      const e = entityOfHref(c.href);
      return e ? <EntityLink kind={e.kind} id={e.id} href={c.href} className={o.textLink}>{c.text}</EntityLink> : <Link href={c.href} className={o.textLink}>{c.text}</Link>;
    }
    case "laurel":
      return c.top
        ? <Laurel tone={light && c.tone === "white" ? "gold" : c.tone} onColor={!light} size={28} top={c.top} bottom={c.bottom} title={c.title} />
        : <span className={o.chipText} title={c.title} aria-label={c.title}><MiniLaurel h={18} /></span>;
    case "flag": {
      const f = flag(c.country);
      return f ? <img src={f} alt="" /> : null;
    }
    case "text":
      return meta ? <>{c.text}</> : <span className={`${c.strong ? o.v : o.w} ${c.mono ? o.mono : ""} ${o.chipText}`}>{c.text}</span>;
    case "node":
      return <>{c.node}</>;
  }
}

/** A run of chips separated by spaces (flex gap does the visual spacing; the spaces keep textContent readable). */
export function Chips({ chips, light, meta }: { chips: Chip[]; light?: boolean; meta?: boolean }) {
  return <>{chips.map((c, i) => <Fragment key={i}>{i > 0 && !meta && " "}<ChipView c={c} light={light} meta={meta} /></Fragment>)}</>;
}

/**
 * ⑦ the connection lines: L1 (identity — who / what it is tied to) + L2 (result — standing, points, titles, pole,
 * fastest lap), 8px apart. Every line carries `data-hero-line` (scripts/hero-check.mjs reads them).
 */
export default function ConnectionLine({ lines, light, className }: { lines: Chip[][]; light?: boolean; className?: string }) {
  const rows = lines.filter((l) => l.length);
  if (!rows.length) return null;
  return (
    <div className={`${o.conn} ${className ?? ""}`}>
      {rows.map((l, i) => (
        <p key={i} className={o.line} data-hero-line={i === 0 ? "L1" : "L2"}>
          <Chips chips={l} light={light} />
        </p>
      ))}
    </div>
  );
}
