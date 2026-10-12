import fs from "node:fs";
import path from "node:path";
import { get } from "./db";

export type Source = { label: string; url: string };
export type Moment = { year: number; gp: string | null; circuit: string | null; title: string; text: string; sources: Source[] };
export type Anecdote = { title: string; text: string; sources: Source[] };
export type DriverContent = { nameZh: string; nameEn: string; tagline: string; bio: string; highlights: Moment[]; anecdotes: Anecdote[] };
export type TeamContent = DriverContent & { base: string; founded: number | string };
export type CircuitContent = { nameZh: string; nameEn: string; tagline: string; summary: string; traits: string[]; moments: Moment[] };
export type CarContent = { nameEn: string; year: number; constructor: string; designers: string[]; summary: string; tech: { label: string; value: string }[]; innovations: string[]; record: string; sources: Source[] };

const DIR = path.join(process.cwd(), "content");
const cache = new Map<string, { mtime: number; data: any }>();

function load<T>(file: string): T | Record<string, never> {
  const p = path.join(DIR, file);
  try {
    const mtime = fs.statSync(p).mtimeMs;
    const c = cache.get(p);
    if (c && c.mtime === mtime) return c.data;
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    cache.set(p, { mtime, data });
    return data;
  } catch {
    return {};
  }
}

export function drivers(): Record<string, DriverContent> {
  return { ...load<any>("drivers.legends.json"), ...load<any>("drivers.a.json"), ...load<any>("drivers.b.json") };
}
export const teams = () => load<Record<string, TeamContent>>("teams.json") as Record<string, TeamContent>;
export const circuits = () => load<Record<string, CircuitContent>>("circuits.json") as Record<string, CircuitContent>;
export const cars = () => load<Record<string, CarContent>>("cars.json") as Record<string, CarContent>;
export const regulations = () => load<any>("regulations.json") as any;

export type TaggedMoment = Moment & { kind: "driver" | "team" | "circuit"; subject: string; subjectName: string };

/** Every curated moment across drivers, teams and circuits, tagged with where it came from. */
export function allMoments(): TaggedMoment[] {
  const out: TaggedMoment[] = [];
  for (const [id, d] of Object.entries(drivers())) for (const m of d.highlights || []) out.push({ ...m, kind: "driver", subject: id, subjectName: d.nameZh });
  for (const [id, t] of Object.entries(teams())) for (const m of t.highlights || []) out.push({ ...m, kind: "team", subject: id, subjectName: t.nameZh });
  for (const [id, c] of Object.entries(circuits())) for (const m of c.moments || []) out.push({ ...m, kind: "circuit", subject: id, subjectName: c.nameZh });
  return out;
}

export function momentsFor(q: { year?: number; gp?: string; circuit?: string }) {
  return allMoments().filter(
    (m) => (q.year == null || m.year === q.year) && (q.gp == null || m.gp === q.gp) && (q.circuit == null || m.circuit === q.circuit)
  );
}

export const nameZh = {
  driver: (id: string) => drivers()[id]?.nameZh,
  team: (id: string) => teams()[id]?.nameZh,
  circuit: (id: string) => circuits()[id]?.nameZh,
};

export type EditorialDimension = "performance" | "personality" | "relationships" | "career" | "visual" | "tech" | "weekend" | "heritage";
export type Note = {
  tag: string; title: string; text: string; year?: number | null; gp?: string | null; circuit?: string | null; sources: Source[];
  topic?: string; dimension?: EditorialDimension; publishedAt?: string; verifiedAt?: string; eventDate?: string;
  race?: { year: number; round: number }; asOfRace?: { year: number; round: number };
  related?: { drivers?: string[]; teams?: string[]; circuits?: string[]; seasons?: number[]; races?: string[] };
  temporal?: "evergreen" | "event" | "preview" | "snapshot"; validFrom?: string; validUntil?: string;
  status?: "confirmed" | "statement" | "analysis";
};
export type NoteContext = { kind: "driver" | "team" | "circuit" | "season" | "race"; id?: string; year?: number; round?: number; now?: string; completed?: boolean; before?: string };
const expired = (n: Note, now: string) => (n.temporal === "preview" || n.temporal === "snapshot") && !!n.validUntil && Date.parse(n.validUntil) < Date.parse(now);
/** Explicit associations and event years prevent old stories being presented as new-season news. */
export function selectNotes(entries: Note[], q: NoteContext): Note[] {
  const now = q.now ?? new Date().toISOString();
  return entries.filter((n) => {
    if (n.validFrom && n.validFrom > now) return false;
    if (q.before && (n.publishedAt ?? n.eventDate ?? "") > q.before) return false;
    if (expired(n, now) || (n.temporal === "preview" && q.completed)) return false;
    if (q.year != null && n.year != null && n.year !== q.year) return false;
    if (q.kind === "race") return (n.race?.year === q.year && n.race?.round === q.round) || !!n.related?.races?.includes(`${q.year}/${q.round}`);
    if (q.kind === "season") return !!n.related?.seasons?.includes(q.year!);
    const key = { driver: "drivers", team: "teams", circuit: "circuits" }[q.kind] as "drivers" | "teams" | "circuits";
    return !!n.related?.[key]?.includes(q.id!);
  });
}
const notesOf = (file: string) => load<Record<string, Note[]>>(file) as Record<string, Note[]>;
const editorial = () => { const data = load<Note[]>("notes.editorial.json"); return [...(Array.isArray(data) ? data : []), ...Object.values(notesOf("notes.races.json")).flat()]; };
const applicable = (entries: Note[], q: NoteContext) => entries.filter((n) =>
  !expired(n, q.now ?? new Date().toISOString()) &&
  !(n.temporal === "preview" && (q.completed || (n.race && !!get("select 1 from race r join race_result rr on rr.race_id=r.id where r.year=? and r.round=? limit 1", n.race.year, n.race.round)))) &&
  !(q.before && (n.publishedAt ?? n.eventDate ?? "") > q.before));
const entityNotes = (file: string, id: string, kind: NoteContext["kind"]) => [
  ...applicable(notesOf(file)[id] ?? [], { kind, id }), ...selectNotes(applicable(editorial(), {kind,id}), { kind, id }),
];
export const notes = {
  circuit: (id: string) => entityNotes("notes.circuits.json", id, "circuit"),
  driver: (id: string) => entityNotes("notes.drivers.json", id, "driver"),
  team: (id: string) => entityNotes("notes.teams.json", id, "team"),
  season: (y: number | string) => [...applicable(notesOf("notes.seasons.json")[String(y)] ?? [], {kind:"season",year:+y}), ...selectNotes(applicable(editorial(), {kind:"season",year:+y}), {kind:"season",year:+y})],
  race: (year: number, round: number, q: Pick<NoteContext, "now" | "completed" | "before"> = {}) => [
    ...selectNotes(applicable(editorial(), {kind:"race",year,round,...q}), {kind:"race",year,round,...q}),
  ],
};
