import Link from "next/link";
import { ViewTransition } from "react";
import { eraOf } from "@/lib/eras";
import EraIntro from "@/components/season/EraIntro";

import RailScope from "@/components/season/RailScope";

export const dynamic = "force-dynamic";

/** 时代 tab: the era this year belongs to (same component as /eras/[id]), this year highlighted. */
export default async function YearEra({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  const er = eraOf(year);
  if (!er) return <p className="wrap band mute">没有找到 {year} 年所属的规则时代。</p>;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <RailScope header={{ title: `${year} 赛季 · ${er.title}` }} />
        <EraIntro era={er} current={year} full={false} />
        <p className="wrap" style={{ padding: "0 var(--gutter) 48px" }}><Link className="link-arrow" href={`/eras/${er.id}`}>完整时代页：赛道与全部故事线</Link></p>
      </div>
    </ViewTransition>
  );
}
