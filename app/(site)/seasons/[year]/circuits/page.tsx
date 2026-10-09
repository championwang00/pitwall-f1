import { ViewTransition } from "react";
import YearCircuitsGrid from "@/components/unit/YearCircuitsGrid";
import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** Circuits tab: every circuit used this year and where this year sits in its own history (same block as /circuits?year=Y). */
export default async function YearCircuits({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <section className="band band-paper">
        <RailScope header={{ title: `${year} 赛季 · 赛道` }} labels="rounds" />
        <div className="wrap"><YearCircuitsGrid year={year} /></div>
      </section>
    </ViewTransition>
  );
}
