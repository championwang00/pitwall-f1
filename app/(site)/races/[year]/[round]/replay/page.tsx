import { permanentRedirect } from "next/navigation";
import { seasonSchedule } from "@/lib/schedule";
import { replayHref } from "@/lib/raceCards";

export const dynamic = "force-dynamic";

/** Short link (IA spec v5 §0.5.5): /races/Y/R/replay → /seasons/Y/replay?session=<that race's key>; no OpenF1 race session
 *  (before 2023, or not run yet) → the race page. */
export default async function RaceReplay({ params }: { params: Promise<{ year: string; round: string }> }) {
  const { year: ys, round: rs } = await params;
  const year = +ys, round = +rs;
  let href: string | null = null;
  if (year >= 2023) {
    const r = (await seasonSchedule(year).catch(() => [])).find((x) => x.round === round);
    href = r ? replayHref(r) : null;
  }
  permanentRedirect(href ?? `/races/${year}/${round}`);
}
