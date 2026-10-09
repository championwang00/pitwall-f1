import { get } from "@/lib/db";
import { ENGINE_ZH } from "@/lib/names";
import EntityLink from "./EntityLink";

/** engine makers whose works team has a different id */
const WORKS: Record<string, string> = { "red-bull-ford": "red-bull" };

/**
 * An engine maker's name. Makers that are also constructors (Ferrari, Mercedes, Honda, Renault, BMW, Toyota, Audi…)
 * link to that team (global link rule: a team name is always a link); with `year`, to its ?year= slice only when the
 * works team itself raced that year (Mercedes engines in 2008 → /teams/mercedes, not an empty 2008 slice).
 * Pure engine suppliers (Cosworth, TAG, Ford…) stay text.
 */
export default function Engine({ id, name, year, className = "hlink", self }: { id: string | null | undefined; name?: string | null; year?: number | null; className?: string; /** the page's own team: stays text */ self?: string }) {
  if (!id) return <>{name ?? ""}</>;
  const label = ENGINE_ZH[id] ?? name ?? id;
  const team = WORKS[id] ?? id;
  if (team === self) return <>{label}</>;
  const isTeam = !!get<any>("select 1 x from constructor where id = ? and total_race_entries > 0", team);
  if (!isTeam) return <>{label}</>;
  const raced = year ? !!get<any>("select 1 x from season_entrant_constructor where constructor_id = ? and year = ?", team, year) : false;
  return <EntityLink kind="team" id={team} year={raced ? year : null} className={className}>{label}</EntityLink>;
}

/** Several engines joined by " / " (a team that switched mid-season). */
export function Engines({ ids, names, year, className, self }: { ids: (string | null | undefined)[]; names?: (string | null | undefined)[]; year?: number | null; className?: string; self?: string }) {
  const seen = new Set<string>();
  const list = ids.map((id, i) => ({ id, name: names?.[i] })).filter((x) => { const k = x.id ?? x.name ?? ""; if (seen.has(k)) return false; seen.add(k); return true; });
  return <>{list.map((x, i) => <span key={i}>{i > 0 && " / "}<Engine id={x.id} name={x.name} year={year} className={className} self={self} /></span>)}</>;
}
