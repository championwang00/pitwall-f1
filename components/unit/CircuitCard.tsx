import Link from "next/link";
import u from "./circuit.module.css";
import Icon from "@/components/ui/Icon";
import EntityLink from "@/components/entity/EntityLink";
import { PodiumCells, type PodiumEntry } from "@/components/ui/RaceCard";
import { flag, trackOutline } from "@/lib/assets";

/**
 * A circuit in formula1.com race-card language (Schedule page measurements): white, radius 8, padding 16;
 * label Titillium 12/16 700 caps #606066 (ROUND n + tag), chequered-flag date pill in KH Interference,
 * round flag 20 + name Formula1 24/28 500, grey sub line, F1-face stats, then the race podium (PodiumCells)
 * or the official track outline as a mask. The circuit is the card's subject (no hover intro); the race / drivers are mentions.
 */
export default function CircuitCard({ id, name, href, nameHref, country, label, tag, tagTone, date, sub, stats, podium, outline = true }: {
  id: string; name: string; href: string; /** the name's own link (default: href) */ nameHref?: string; country?: string | null; label?: React.ReactNode; tag?: React.ReactNode; tagTone?: "red" | "ink";
  date?: string | null; sub?: React.ReactNode; stats?: { v: React.ReactNode; k: string }[]; podium?: PodiumEntry[] | null; outline?: boolean;
}) {
  const f = flag(country);
  const o = outline ? trackOutline(id) : null;
  return (
    <li className={`${u.card} ${podium?.length ? "" : u.compact} lift`}>
      <Link href={href} className="card-link" aria-label={name} tabIndex={-1} />
      <div className={`${u.body} over-link`}>
        {(label || tag || date) && (
          <span className={u.top}>
            <span className={u.label}>{label}{tag && <em className={`${u.tag} ${tagTone === "red" ? u.tagRed : tagTone === "ink" ? u.tagInk : ""}`}>{tag}</em>}</span>
            {date && <span className={u.pill}><Icon name={podium?.length ? "chequered-flag" : "calendar"} size={16} /><span>{date}</span></span>}
          </span>
        )}
        <span className={u.titleRow}>
          {f && <img src={f} alt="" width={20} className={u.flag} />}
          <EntityLink kind="circuit" id={id} href={nameHref ?? href} preview={false} className={u.name}>{name}</EntityLink>
        </span>
        <span className={u.mid}>
          <span className={u.info}>
            {sub && <span className={u.sub}>{sub}</span>}
            {stats && stats.length > 0 && (
              <span className={u.stats}>{stats.map((x) => <span key={x.k}><b>{x.v}</b><em>{x.k}</em></span>)}</span>
            )}
          </span>
          {o && <span className={u.outline} style={{ maskImage: `url(${o})`, WebkitMaskImage: `url(${o})` }} role="presentation" />}
        </span>
        {podium && podium.length > 0 && <PodiumCells podium={podium} className={u.podium} />}
      </div>
    </li>
  );
}
