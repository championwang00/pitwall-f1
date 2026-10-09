import { ViewTransition } from "react";
import { notes } from "@/lib/content";
import { seasonTalk } from "@/lib/talk";
import { seasonRecords } from "@/lib/records";
import SeasonHero from "@/components/season/SeasonHero";
import SeasonOverview from "@/components/season/SeasonOverview";
import TalkingPoints from "@/components/entity/TalkingPoints";

export const dynamic = "force-dynamic";

/** 总览 tab (/seasons/Y, v5.1): the whole-season introduction — the season card (champion / leader, laurels, stats),
 *  the 赛季综述 and the season's talking points. Every other tab shows only its own content under the tab bar. */
export default async function YearOverview({ params }: { params: Promise<{ year: string }> }) {
  const year = +(await params).year;
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <SeasonHero year={year} />
        <SeasonOverview year={year} />
        <TalkingPoints auto={seasonTalk(year)} notes={notes.season(year)} subject={`${year} 赛季`} records={seasonRecords(year)} year={year} skip={String(year)} />
      </div>
    </ViewTransition>
  );
}
