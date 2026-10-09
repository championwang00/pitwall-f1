import { ViewTransition } from "react";
import YearCarsGrid from "@/components/unit/YearCarsGrid";
import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** 赛车 tab: every car raced this year (same block as /cars?year=Y). */
export default async function YearCars({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <section className="band band-paper">
        <RailScope header={{ title: `${year} 赛季 · 赛车` }} labels="champCar" />
        <div className="wrap"><YearCarsGrid year={year} /></div>
      </section>
    </ViewTransition>
  );
}
