import { get, all } from "@/lib/db";
import { getDriver, getConstructor, getCircuit } from "@/lib/f1";
import { zhName } from "@/lib/zh";
import { drivers as dContent, teams as tContent, circuits as cContent, regulations } from "@/lib/content";
import { driverBust, teamLogo, teamColor, trackOutline, flag, TEAMS_2026 } from "@/lib/assets";
import logos from "@/data/team-logos.json";
import { NAT_ZH } from "@/lib/names";

// Hover-card data for the four base units: driver / team / circuit / year.
// The card (components/entity/HoverLayer + hover.module.css) is formula1.com-styled: `color` paints the top surface,
// `image` sits on it (cut-out bust / round period avatar / white team logo on a team-colour tile / white track outline),
// `stats` are English F1 labels over Formula1 numbers.
export type Preview = {
  kind: string; id: string; href: string; title: string; latin: string | null; image: string | null; imageKind: "bust" | "photo" | "logo" | "crest" | "outline" | "map" | null;
  color: string | null; flag: string | null; meta: string; stats: { k: string; v: string | number }[]; blurb: string | null;
};

const span = (a?: number | null, b?: number | null) => (a ? (a === b || !b ? `${a}` : `${a}–${b}`) : "");

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  let p: Preview | null = null;
  if (kind === "driver") {
    const d = getDriver(id);
    if (d) {
      const yrs = get<any>("select min(year) a, max(year) b from season_entrant_driver where driver_id = ? and test_driver = 0", id);
      const last = get<any>("select constructor_id t from season_entrant_driver where driver_id = ? and test_driver = 0 order by year desc limit 1", id);
      const bust = driverBust(id, 240, 280);
      p = {
        kind, id, href: `/drivers/${id}`, title: zhName.driver(id) ?? d.name, latin: zhName.driver(id) ? d.name : null,
        // cut-out official bust for the 2026 grid, else the round period avatar (same source as <Person>)
        image: bust ?? `/api/face/${id}?v=3&s=144`, imageKind: bust ? "bust" : "photo", color: teamColor(last?.t, "#606066"), flag: flag(d.nationality_country_id),
        meta: [NAT_ZH[d.nationality_country_id], span(yrs?.a, yrs?.b), last?.t ? zhName.team(last.t) ?? undefined : undefined].filter(Boolean).join(" · "),
        stats: [{ k: "Titles", v: d.total_championship_wins }, { k: "Wins", v: d.total_race_wins }, { k: "Podiums", v: d.total_podiums }, { k: "Starts", v: d.total_race_starts }],
        blurb: dContent()[id]?.tagline ?? null,
      };
    }
  } else if (kind === "team") {
    const c = getConstructor(id);
    if (c) {
      const yrs = get<any>("select min(year) a, max(year) b from season_entrant_constructor where constructor_id = ?", id);
      const current = !!TEAMS_2026[id as keyof typeof TEAMS_2026];
      const historic = !current && !!(logos as Record<string, string | null>)[id];
      p = {
        kind, id, href: `/teams/${id}`, title: zhName.team(id) ?? c.name, latin: zhName.team(id) ? c.name : null,
        image: current ? teamLogo(id, 128) : historic ? `/api/logo/${id}?r=3` : null, imageKind: current ? "logo" : historic ? "crest" : null, color: teamColor(id, "#606066"), flag: flag(c.country_id),
        meta: [NAT_ZH[c.country_id], span(yrs?.a, yrs?.b), tContent()[id]?.base].filter(Boolean).join(" · "),
        stats: [{ k: "Titles", v: c.total_championship_wins }, { k: "Wins", v: c.total_race_wins }, { k: "Poles", v: c.total_pole_positions }, { k: "Starts", v: c.total_race_starts }],
        blurb: tContent()[id]?.tagline ?? null,
      };
    }
  } else if (kind === "circuit") {
    const c = getCircuit(id);
    if (c) {
      const yrs = get<any>("select min(year) a, max(year) b from race where circuit_id = ?", id);
      p = {
        kind, id, href: `/circuits/${id}`, title: zhName.circuit(id) ?? c.name, latin: zhName.circuit(id) ? c.full_name : null,
        image: trackOutline(id) ?? null, imageKind: trackOutline(id) ? "outline" : null, color: "#15151e", flag: flag(c.country_id),
        meta: [NAT_ZH[c.country_id], c.place_name, span(yrs?.a, yrs?.b)].filter(Boolean).join(" · "),
        stats: [{ k: "Length km", v: c.length?.toFixed(3) }, { k: "Turns", v: c.turns }, { k: "Races", v: c.total_races_held }],
        blurb: cContent()[id]?.tagline ?? null,
      };
    }
  } else if (kind === "year") {
    const y = +id;
    const races = get<any>("select count(*) n from race where year = ?", y)?.n ?? 0;
    if (races) {
      const champ = get<any>("select s.driver_id id, d.name from season_driver_standing s join driver d on d.id = s.driver_id where s.year = ? and s.championship_won = 1", y);
      const team = get<any>("select constructor_id id from season_constructor_standing where year = ? and championship_won = 1", y);
      // the champion's own team that year (so the surface colour matches his period portrait)
      const champTeam = champ ? get<any>("select rr.constructor_id id from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = ? order by r.round desc limit 1", y, champ.id) : null;
      const done = get<any>("select count(*) n from race r where year = ? and exists (select 1 from race_result rr where rr.race_id = r.id)", y)?.n ?? 0;
      const winners = all<any>("select distinct rr.driver_id from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.position_number = 1", y).length;
      const era = regulations()?.eras?.filter((e: any) => y >= e.years[0] && y <= e.years[1]).sort((a: any, b: any) => (a.years[1] - a.years[0]) - (b.years[1] - b.years[0]))[0];
      p = {
        kind, id, href: `/seasons/${y}`, title: `${y} 赛季`, latin: null,
        // the champion's period portrait on his team's colour (spec §1.4: a season = the champion team colour)
        image: champ ? `/api/face/${champ.id}?v=3&s=144&year=${y}` : null, imageKind: champ ? "photo" : null, color: teamColor(champTeam?.id ?? team?.id, "#606066"), flag: null,
        meta: champ ? `世界冠军 ${zhName.driver(champ.id) ?? champ.name}${team ? ` · 车队冠军 ${zhName.team(team.id) ?? team.id}` : ""}` : `进行中 · 已完成 ${done} / ${races} 站`,
        stats: [{ k: "Rounds", v: races }, { k: "Winners", v: winners }],
        blurb: era ? `规则时代：${era.title}` : null,
      };
    }
  }
  if (!p) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(p, { headers: { "cache-control": "public, max-age=3600" } });
}
