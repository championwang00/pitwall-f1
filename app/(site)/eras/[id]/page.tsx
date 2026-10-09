import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { eraById } from "@/lib/eras";
import EraIntro from "@/components/season/EraIntro";
import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** 时代介绍页：年份栏里每个时代标题的去处。 */
export default async function EraPage({ params }: { params: Promise<{ id: string }> }) {
  const er = eraById((await params).id);
  if (!er) notFound();
  const years: number[] = [];
  for (let y = er.years[0]; y <= er.years[1]; y++) years.push(y);
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope header={{ title: er.title, sub: `${er.years[0]}–${er.years[1]}` }} era={er.id} current={null} years={years} pattern="/seasons/{y}" />
        <EraIntro era={er} />
      </div>
    </ViewTransition>
  );
}
