import fs from "node:fs";
import path from "node:path";

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

export type Note = { tag: string; title: string; text: string; year?: number | null; gp?: string | null; circuit?: string | null; sources: Source[] };
const notesOf = (file: string) => load<Record<string, Note[]>>(file) as Record<string, Note[]>;
export const notes = {
  circuit: (id: string) => notesOf("notes.circuits.json")[id] ?? [],
  driver: (id: string) => notesOf("notes.drivers.json")[id] ?? [],
  team: (id: string) => notesOf("notes.teams.json")[id] ?? [],
  season: (y: number | string) => notesOf("notes.seasons.json")[String(y)] ?? [],
};
