import { ViewTransition } from "react";
import YearDriversGrid from "@/components/unit/YearDriversGrid";
import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** Drivers tab: everyone who raced this year, by championship position (same block as /drivers?year=Y). */
export default async function YearDrivers({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <section className="band band-paper">
        <RailScope header={{ title: `${year} 赛季 · 车手` }} />
        <div className="wrap"><YearDriversGrid year={year} /></div>
      </section>
    </ViewTransition>
  );
}
