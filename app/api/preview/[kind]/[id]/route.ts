import { logoRev } from "@/lib/logoRev";
import { get, all } from "@/lib/db";
import { getDriver, getConstructor, getCircuit, getChassis, facts, getRaceByYearRound, raceResults } from "@/lib/f1";
import { zhName } from "@/lib/zh";
import { drivers as dContent, teams as tContent, circuits as cContent, regulations } from "@/lib/content";
import { driverBust, teamLogo, teamColor, teamColorAt, trackOutline, flag, TEAMS_2026, teamCar } from "@/lib/assets";
import logos from "@/data/team-logos.json";
import { NAT_ZH, ENGINE_ZH } from "@/lib/names";
import { cars as carContent } from "@/lib/content";
import { carThumb, carPicture, eraTopChassis } from "@/lib/hero";
import { eraById, eraFacts } from "@/lib/eras";
import { gpZh } from "@/lib/names";

/** the official 2026 side view at hover-card size */
const teamCarWide = (team: string) => teamCar(team, 400);

// Hover-card data for the four base units: driver / team / circuit / year.
// The card (components/entity/HoverLayer + hover.module.css) is formula1.com-styled: `color` paints the top surface,
// `image` sits on it (cut-out bust / round period avatar / white team logo on a team-colour tile / white track outline),
// `stats` are English F1 labels over Formula1 numbers.
export type Preview = {
  kind: string; id: string; href: string; title: string; latin: string | null; image: string | null; imageKind: "bust" | "photo" | "logo" | "crest" | "outline" | "map" | "car" | null;
  color: string | null; flag: string | null; meta: string; stats: { k: string; v: string | number }[]; blurb: string | null;
  /** the meta line as parts, so the card can link the team / years / champion in it (global link rule) */
  metaParts: Part[]; blurbHref?: string | null;
  /** race: the podium (finished) as face rows */
  podium?: { pos: number; id: string; name: string; team: string | null; color: string; face: string; href: string }[];
  /** race not yet run: the race start (ISO, UTC) — the card prints it in the viewer's timezone */
  when?: string | null;
};
type Part = { t: string; href?: string };

/** "2007–2026" → two season links joined by an en dash */
const spanParts = (a?: number | null, b?: number | null): Part[] =>
  !a ? [] : a === b || !b ? [{ t: `${a}`, href: `/seasons/${a}` }] : [{ t: `${a}`, href: `/seasons/${a}` }, { t: "–" }, { t: `${b}`, href: `/seasons/${b}` }];
/** join groups of parts with " · " */
const joinParts = (groups: (Part[] | null | undefined | false)[]): Part[] => {
  const out: Part[] = [];
  for (const g of groups) { if (!g || !g.length) continue; if (out.length) out.push({ t: "·" }); out.push(...g); }
  return out;
};

const span = (a?: number | null, b?: number | null) => (a ? (a === b || !b ? `${a}` : `${a}–${b}`) : "");

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  const y = Number(new URL(_req.url).searchParams.get("year"));
  const year = Number.isInteger(y) && y >= 1950 && y <= 2100 ? y : undefined;
  let p: Preview | null = null;
  if (kind === "driver") {
    const d = getDriver(id);
    if (d) {
      const yrs = get<any>("select min(year) a, max(year) b from season_entrant_driver where driver_id = ? and test_driver = 0", id);
      const last = get<any>("select constructor_id t from season_entrant_driver where driver_id = ? and test_driver = 0 order by year desc limit 1", id);
      const bust = !year || year === 2026 ? driverBust(id, 240, 280) : null;
      p = {
        kind, id, href: `/drivers/${id}`, title: zhName.driver(id) ?? d.name, latin: zhName.driver(id) ? d.name : null,
        // cut-out official bust for the 2026 grid, else the round period avatar (same source as <Person>)
        image: bust ?? `/api/face/${id}?v=3&s=144${year ? `&year=${year}` : ""}`, imageKind: bust ? "bust" : "photo", color: teamColor(last?.t, "#606066"), flag: flag(d.nationality_country_id),
        meta: [NAT_ZH[d.nationality_country_id], span(yrs?.a, yrs?.b), last?.t ? zhName.team(last.t) ?? undefined : undefined].filter(Boolean).join(" · "),
        metaParts: joinParts([NAT_ZH[d.nationality_country_id] ? [{ t: NAT_ZH[d.nationality_country_id] }] : null, spanParts(yrs?.a, yrs?.b),
          last?.t ? [{ t: zhName.team(last.t) ?? last.t, href: `/teams/${last.t}${yrs?.b ? `?year=${yrs.b}` : ""}` }] : null]),
        stats: [{ k: "世界冠军", v: d.total_championship_wins }, { k: "胜场", v: d.total_race_wins }, { k: "领奖台", v: d.total_podiums }, { k: "出赛", v: d.total_race_starts }],
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
        image: year ? `/api/logo/${id}?r=${logoRev()}&year=${year}&w=280` : current ? teamLogo(id, 128) : historic ? `/api/logo/${id}?r=${logoRev()}` : null, imageKind: year ? "logo" : current ? "logo" : historic ? "crest" : null, color: teamColor(id, "#606066"), flag: flag(c.country_id),
        meta: [NAT_ZH[c.country_id], span(yrs?.a, yrs?.b), tContent()[id]?.base].filter(Boolean).join(" · "),
        metaParts: joinParts([NAT_ZH[c.country_id] ? [{ t: NAT_ZH[c.country_id] }] : null, spanParts(yrs?.a, yrs?.b), tContent()[id]?.base ? [{ t: tContent()[id]!.base! }] : null]),
        stats: [{ k: "车队冠军", v: c.total_championship_wins }, { k: "胜场", v: c.total_race_wins }, { k: "杆位", v: c.total_pole_positions }, { k: "出赛", v: c.total_race_starts }],
        blurb: tContent()[id]?.tagline ?? null,
      };
    }
  } else if (kind === "circuit") {
    const c = getCircuit(id);
    if (c) {
      const yrs = get<any>("select min(year) a, max(year) b from race where circuit_id = ?", id);
      p = {
        kind, id, href: `/circuits/${id}`, title: zhName.circuit(id) ?? c.name, latin: zhName.circuit(id) ? c.full_name : null,
        image: trackOutline(id, year) ?? null, imageKind: trackOutline(id, year) ? "outline" : null, color: "#15151e", flag: flag(c.country_id),
        meta: [NAT_ZH[c.country_id], c.place_name, span(yrs?.a, yrs?.b)].filter(Boolean).join(" · "),
        metaParts: joinParts([NAT_ZH[c.country_id] ? [{ t: NAT_ZH[c.country_id] }] : null, c.place_name ? [{ t: c.place_name }] : null, spanParts(yrs?.a, yrs?.b)]),
        stats: [{ k: "赛道长度 km", v: c.length?.toFixed(3) }, { k: "弯道", v: c.turns }, { k: "举办场次", v: c.total_races_held }],
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
        image: champ ? `/api/face/${champ.id}?v=3&s=144&year=${y}` : null, imageKind: champ ? "photo" : null, color: teamColorAt(champTeam?.id ?? team?.id, y, "#606066"), flag: null,
        meta: champ ? `世界冠军 ${zhName.driver(champ.id) ?? champ.name}${team ? ` · 车队冠军 ${zhName.team(team.id) ?? team.id}` : ""}` : `进行中 · 已完成 ${done} / ${races} 站`,
        metaParts: champ
          ? joinParts([[{ t: "世界冠军" }, { t: zhName.driver(champ.id) ?? champ.name, href: `/drivers/${champ.id}?year=${y}` }],
            team ? [{ t: "车队冠军" }, { t: zhName.team(team.id) ?? team.id, href: `/teams/${team.id}?year=${y}` }] : null])
          : [{ t: `进行中 · 已完成 ${done} / ${races} 站` }],
        blurbHref: era ? `/eras/${era.id}` : null,
        stats: [{ k: "分站", v: races }, { k: "不同冠军", v: winners }],
        blurb: era ? `规则时代：${era.title}` : null,
      };
    }
  } else if (kind === "car") {
    // a chassis (IA spec v6 §0.6.5): side view on the team colour, team · seasons · engine, results summed per season
    const ch = getChassis(id);
    if (ch) {
      const years: number[] = ch.seasons.map((x: any) => x.year);
      const team: string = ch.constructor_id;
      const y0 = years[0], y1 = years.at(-1);
      const rows = years.flatMap((y) => facts({ team, year: y }));
      const maker: string | undefined = ch.seasons.find((x: any) => x.engine)?.engine;
      const thumb = carThumb(id, team, y1);
      const pic = thumb ? null : await carPicture(id, false).catch(() => null);
      const teamZh = zhName.team(team) ?? ch.constructorName;
      p = {
        kind, id, href: `/cars/${id}`, title: ch.name, latin: ch.full_name,
        image: thumb ? teamCarWide(team) ?? thumb.url : pic?.exact ? pic.url : null, imageKind: thumb || pic?.exact ? "car" : null,
        color: teamColorAt(team, y1, "#606066"), flag: null,
        meta: [teamZh, span(y0, y1), maker ? `${ENGINE_ZH[maker] ?? maker} 引擎` : null].filter(Boolean).join(" · "),
        metaParts: joinParts([[{ t: teamZh, href: `/teams/${team}${y1 ? `?year=${y1}` : ""}` }], spanParts(y0, y1), maker ? [{ t: `${ENGINE_ZH[maker] ?? maker} 引擎` }] : null]),
        stats: [
          { k: "出赛", v: new Set(rows.map((f) => f.raceId)).size },
          { k: "胜场", v: rows.filter((f) => f.pos === 1).length },
          { k: "领奖台", v: rows.filter((f) => f.pos && f.pos <= 3).length },
          { k: "杆位", v: rows.filter((f) => f.pole).length },
        ],
        blurb: carContent()[id]?.summary?.split(/(?<=[。！？])/)[0] ?? null,
      };
    }
  } else if (kind === "era") {
    // an era (/eras/[id]): its span, the first sentence(s) of the summary, the dominant champion's face on the
    // dominant team's colour, the era's winningest car in the meta line
    const er = eraById(id);
    if (er) {
      const [a, b] = er.years;
      const f = eraFacts(er);
      const champ = f.titlesD[0]?.[0];
      const topT = f.titlesT[0]?.[0] ?? f.winsT[0]?.id;
      const champYear = champ ? get<any>("select max(r.year) y from race_result rr join race r on r.id = rr.race_id where rr.driver_id = ? and r.year between ? and ?", champ, a, b)?.y : null;
      const car = eraTopChassis(a, b);
      const lines = er.summary.split(/(?<=[。！？])/).filter(Boolean);
      // 1–2 lines on the card: the first sentence (plus the second when the first is only a lead-in); long ones end in "…"
      const two = lines[0] && lines[1] && lines[0].length < 30 ? lines[0] + lines[1] : lines[0];
      const blurb = !two ? null : two.length > 66 ? two.slice(0, 64).replace(/[，、：；,。\s]+$/, "") + "…" : two;
      p = {
        kind, id, href: `/eras/${id}`, title: er.title, latin: null,
        image: champ ? `/api/face/${champ}?v=3&s=144${champYear ? `&year=${champYear}` : ""}` : null, imageKind: champ ? "photo" : null,
        color: teamColor(topT, "#15151e"), flag: null,
        meta: [span(a, b), champ ? `统治 ${zhName.driver(champ) ?? champ}` : null, car ? `代表赛车 ${car.name}` : null].filter(Boolean).join(" · "),
        metaParts: joinParts([spanParts(a, b), champ ? [{ t: "统治" }, { t: zhName.driver(champ) ?? champ, href: `/drivers/${champ}?from=${a}&to=${b}` }] : null,
          car ? [{ t: "代表赛车" }, { t: car.name, href: `/cars/${car.id}` }] : null]),
        stats: [{ k: "赛季", v: f.years.length }, { k: "分站", v: f.races }, { k: "车手冠军", v: f.titlesD.length }],
        blurb,
      };
    }
  } else if (kind === "race") {
    // a race (/races/Y/R, id "Y-R"): GP name, round · circuit · date; the podium when it has been run, else its start
    const [ys, rs] = id.split("-");
    const race = getRaceByYearRound(+ys, +rs);
    if (race) {
      const y = race.year as number, r = race.round as number;
      const res = raceResults(race.id).filter((x: any) => x.position_number && x.position_number <= 3);
      const circuitZh = zhName.circuit(race.circuit_id) ?? race.circuitName;
      const win = res.find((x: any) => x.position_number === 1);
      const outline = trackOutline(race.circuit_id, y, r);
      const dateZh = race.date ? `${+race.date.slice(5, 7)}月${+race.date.slice(8, 10)}日` : null;
      p = {
        kind, id, href: `/races/${y}/${r}`, title: `${y} ${gpZh(race.grand_prix_id)}`, latin: race.official_name ?? null,
        image: outline ?? null, imageKind: outline ? "outline" : null, color: win ? teamColorAt(win.constructor_id, y, "#15151e") : "#15151e", flag: flag(race.circuitCountry),
        meta: [`第 ${r} 站`, circuitZh, dateZh].filter(Boolean).join(" · "),
        metaParts: joinParts([[{ t: `${y}`, href: `/seasons/${y}` }, { t: `第 ${r} 站` }], [{ t: circuitZh, href: `/circuits/${race.circuit_id}?year=${y}` }], dateZh ? [{ t: dateZh }] : null]),
        podium: res.map((x: any) => ({
          pos: x.position_number, id: x.driver_id, name: zhName.driver(x.driver_id) ?? x.driverName, team: zhName.team(x.constructor_id) ?? x.teamName,
          color: teamColorAt(x.constructor_id, y, "#606066"), face: `/api/face/${x.driver_id}?v=3&s=64&year=${y}`, href: `/drivers/${x.driver_id}?year=${y}`,
        })),
        when: res.length || !race.date ? null : `${race.date}T${race.time ?? "12:00"}:00Z`,
        stats: res.length ? [] : [{ k: "圈数", v: race.laps ?? "—" }, ...(race.distance ? [{ k: "距离 km", v: Number(race.distance).toFixed(1) }] : [])],
        blurb: null,
      };
    }
  }
  if (!p) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(p, { headers: { "cache-control": "public, max-age=3600" } });
}
