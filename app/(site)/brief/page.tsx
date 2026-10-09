import { permanentRedirect } from "next/navigation";
import { nextRace, lastCompletedRace } from "@/lib/f1";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Short link (IA spec v5 §0.5.5): /brief → the next race's brief (off-season → the last race's); /brief?year&round → that race's. */
export default async function Brief({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const y = Number(one(sp.year)), r = Number(one(sp.round));
  if (Number.isInteger(y) && Number.isInteger(r) && y > 0 && r > 0) permanentRedirect(`/races/${y}/${r}/brief`);
  const n = nextRace() ?? lastCompletedRace();
  permanentRedirect(`/races/${n.year}/${n.round}/brief`);
}
