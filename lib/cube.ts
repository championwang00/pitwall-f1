import type { Fact } from "./f1";
import { facts } from "./f1";
import { drivers as dContent, teams as tContent, circuits as cContent } from "./content";
import { DRIVERS_2026, teamColor } from "./assets";
import { GP_ZH, TEAM_ZH } from "./names";
import { all } from "./db";
import { zhName } from "./zh";

/** Compact fact row sent to the client. */
export type CF = {
  r: number; y: number; n: number; g: string; c: string; d: string; t: string;
  p: number | null; x: string; q: number | null; pt: number; po: 0 | 1; fl: 0 | 1;
};

export type Dim = "year" | "circuit" | "driver" | "team";

export type CubeNames = {
  driver: Record<string, [string, string | null]>; // id -> [latin, zh]
  team: Record<string, [string, string | null, string]>; // id -> [latin, zh, colour]
  circuit: Record<string, [string, string | null, string]>; // id -> [latin, zh, place]
  gp: Record<string, string>;
};

export type CubeData = { rows: CF[]; names: CubeNames };

export function compact(f: Fact[]): CF[] {
  return f.map((x) => ({
    r: x.raceId, y: x.year, n: x.round, g: x.gp, c: x.circuit, d: x.driver, t: x.team,
    p: x.pos, x: x.posText, q: x.grid, pt: x.points, po: x.pole ? 1 : 0, fl: x.fl ? 1 : 0,
  }));
}

export function cubeFor(slice: Parameters<typeof facts>[0]): CubeData {
  const f = facts(slice);
  const dz = dContent(), tz = tContent(), cz = cContent();
  const names: CubeNames = { driver: {}, team: {}, circuit: {}, gp: {} };
  const circuitIds = new Set<string>();
  for (const x of f) {
    if (!names.driver[x.driver]) names.driver[x.driver] = [x.driverName, zhName.driver(x.driver)];
    if (!names.team[x.team]) names.team[x.team] = [x.teamName, zhName.team(x.team), teamColor(x.team)];
    circuitIds.add(x.circuit);
    if (!names.gp[x.gp]) names.gp[x.gp] = GP_ZH[x.gp] ?? x.gpName;
  }
  if (circuitIds.size) {
    const ids = [...circuitIds];
    const rows = all<any>(`select id, name, place_name from circuit where id in (${ids.map(() => "?").join(",")})`, ...ids);
    for (const r of rows) names.circuit[r.id] = [r.name, zhName.circuit(r.id), r.place_name];
  }
  return { rows: compact(f), names };
}
