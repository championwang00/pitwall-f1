import EntityLink from "./EntityLink";
import s from "./team.module.css";
import logos from "@/data/team-logos.json";
import { TEAMS_2026, teamColor } from "@/lib/assets";

/** Only real logos (official 2026 / Wikidata / Commons) — a team without one shows its name alone, never a drawn badge. */
const hasLogo = (id: string) => id in TEAMS_2026 || !!(logos as Record<string, string | null>)[id];

/** A team wherever it stands on its own (not inside prose): logo tile + name, linked with a hover card. */
/** `onDark`: on a dark or team-colour surface → the white logo variant (2026 grid has official white logos).
 *  `badge`: formula1.com TeamLogo — the white logo in a round tile of the team colour (tables, rows). */
export default function Team({ id, name, size = 22, sub, className, plain, preview = true, href, onDark, year, badge }: {
  id: string; name: string; size?: number; sub?: React.ReactNode; className?: string; plain?: boolean; preview?: boolean; href?: string; onDark?: boolean; badge?: boolean;
  /** year context → /teams/<id>?year=Y */
  year?: number | null;
}) {
  const body = (
    <>
      {hasLogo(id) && (badge
        ? (id in TEAMS_2026
          /* official white logo on the team colour (formula1.com TeamLogo) */
          ? <span className={s.badge} style={{ width: size, height: size, padding: Math.round(size * 0.12), background: teamColor(id, "#3a3a44") }}><img src={`/api/logo/${id}?r=3&v=white`} alt="" loading="lazy" /></span>
          /* historic teams: colour logos of any aspect ratio (often wide wordmarks) — a round tile would shrink them
             to a sliver, so they stand bare at the badge height */
          : <img className={s.logo} src={`/api/logo/${id}?r=3${onDark ? "&v=white" : ""}`} alt="" loading="lazy" style={{ height: size, maxWidth: size * 2.6 }} />)
        : <img className={s.logo} src={`/api/logo/${id}?r=3${onDark ? "&v=white" : ""}`} alt="" loading="lazy" style={{ height: size, maxWidth: size * 2.2 }} />)}
      <span className={s.text}><b>{name}</b>{sub && <em>{sub}</em>}</span>
    </>
  );
  return plain
    ? <span className={`${s.team} ${className ?? ""}`}>{body}</span>
    : <EntityLink kind="team" id={id} preview={preview} href={href} year={year} className={`${s.team} ${className ?? ""}`}>{body}</EntityLink>;
}
