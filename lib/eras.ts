import { all } from "./db";
import { regulations, notes, type Note } from "./content";
import { allSeasons } from "./f1";

export type Era = { id: string; years: [number, number]; title: string; summary: string; keyRules?: string[]; sources?: { label: string; url: string }[] };

export const eras = () => ((regulations()?.eras ?? []) as Era[]).slice().sort((a, b) => b.years[0] - a.years[0]);
export const eraById = (id: string) => eras().find((e) => e.id === id) ?? null;
/** A year can sit in two overlapping eras (1977–82 inside 1966–88): take the narrower one. */
export const eraOf = (year: number) =>
  eras().filter((e) => year >= e.years[0] && year <= e.years[1]).sort((a, b) => (a.years[1] - a.years[0]) - (b.years[1] - b.years[0]))[0] ?? null;

export function eraFacts(er: Era) {
  const [a, b] = er.years;
  const ys = allSeasons().filter((s: any) => s.year >= a && s.year <= b);
  const count = <T,>(xs: T[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>())].sort((p, q) => q[1] - p[1]);
  const titlesD = count(ys.filter((y: any) => y.champ).map((y: any) => y.champ as string));
  const titlesT = count(ys.filter((y: any) => y.champTeam).map((y: any) => y.champTeam as string));
  const winsD = all<any>(`select rr.driver_id id, count(*) n from race_result rr join race r on r.id = rr.race_id where r.year between ? and ? and rr.position_number = 1 group by rr.driver_id order by n desc limit 5`, a, b);
  const winsT = all<any>(`select rr.constructor_id id, count(*) n from race_result rr join race r on r.id = rr.race_id where r.year between ? and ? and rr.position_number = 1 group by rr.constructor_id order by n desc limit 5`, a, b);
  const circuits = all<any>(`select r.circuit_id id, count(*) n, min(r.year) first, max(r.year) last,
      (select min(year) from race where circuit_id = r.circuit_id) everFirst, (select max(year) from race where circuit_id = r.circuit_id) everLast
    from race r where r.year between ? and ? group by r.circuit_id order by n desc, first`, a, b);
  const races = all<any>("select count(*) n from race where year between ? and ?", a, b)[0].n as number;
  const events: (Note & { year: number })[] = [];
  for (let y = b; y >= a; y--) for (const n of notes.season(y)) events.push({ ...n, year: n.year ?? y });
  return { years: ys.map((y: any) => y.year as number), titlesD, titlesT, winsD, winsT, circuits, races, events };
}
