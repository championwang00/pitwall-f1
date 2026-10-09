// OpenF1 driver (number / name / team / headshot) → site entities for the team-radio panel:
// F1DB driver id (face + link), Chinese name, F1DB team id (logo). Pure data, client-safe.
import { DRIVERS_2026, TEAMS_2026 } from "@/lib/assets";
import type { Driver } from "./model";

const BY_CODE = new Map(Object.entries(DRIVERS_2026).map(([id, d]) => [d.code, id]));

/** OpenF1 team_name → F1DB constructor id (logo route /api/logo/<id>). */
const TEAM_ID: Record<string, string> = {
  mclaren: "mclaren", mercedes: "mercedes", ferrari: "ferrari", "red bull racing": "red-bull", "red bull": "red-bull",
  "racing bulls": "racing-bulls", rb: "racing-bulls", "visa cash app rb": "racing-bulls", alphatauri: "alphatauri",
  alpine: "alpine", "haas f1 team": "haas", haas: "haas", audi: "audi", "kick sauber": "sauber", sauber: "sauber",
  "alfa romeo": "alfa-romeo", williams: "williams", "aston martin": "aston-martin", cadillac: "cadillac",
};

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const title = (s: string) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());

export type RadioPerson = { id: string; zh: string; latin: string; last: string; teamId: string | null; teamZh: string };

export function radioPerson(d: Driver | undefined, num: number): RadioPerson {
  if (!d) return { id: "", zh: `#${num}`, latin: `#${num}`, last: `#${num}`, teamId: null, teamZh: "" };
  const code = d.headshot?.match(/\/([a-z]{6}\d{2})\.png/i)?.[1]?.toLowerCase();
  // F1.com image code is the stable key; otherwise F1DB's id convention ("first-last")
  const id = (code && BY_CODE.get(code)) || slug(d.name);
  const parts = d.name.split(" ");
  const last = title(parts[parts.length - 1] || d.acr);
  const zh = DRIVERS_2026[id]?.nameZh ?? last;
  const teamId = TEAM_ID[d.team.toLowerCase()] ?? null;
  const teamZh = (teamId && TEAMS_2026[teamId as keyof typeof TEAMS_2026]?.nameZh) || d.team;
  return { id, zh, latin: title(d.name), last, teamId, teamZh };
}
