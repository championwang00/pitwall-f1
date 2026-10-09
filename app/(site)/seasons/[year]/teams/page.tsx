import { ViewTransition } from "react";
import YearTeamsGrid from "@/components/unit/YearTeamsGrid";
import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** Teams tab: constructors of the year with car, engine and line-up (same block as /teams?year=Y). */
export default async function YearTeams({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <section className="band band-paper">
        <RailScope header={{ title: `${year} 赛季 · 车队` }} labels="champTeam" />
        <div className="wrap"><YearTeamsGrid year={year} /></div>
      </section>
    </ViewTransition>
  );
}
