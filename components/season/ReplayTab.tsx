import { Panel, RoundCards, type PanelProps } from "@/components/live/LivePage";
import type { ScheduledRace } from "@/lib/schedule";
import RailScope from "./RailScope";
import ReplayLinks from "./ReplayLinks";

/** The rail on the 回放 tab (§1.2.5): history tree, 2023+ rows say ▶ 回放 and stay on this tab; older years open the season. */
function replayRail(year: number, latest: number) {
  const ys = Array.from({ length: latest - 2023 + 1 }, (_, i) => 2023 + i);
  return {
    current: year,
    map: Object.fromEntries(ys.map((y) => [y, `/seasons/${y}/replay`])),
    fallback: "/seasons/{y}",
    rows: Object.fromEntries(ys.map((y) => [y, { sub: "▶ 回放" }])),
  };
}

/**
 * 回放 = the year hub's eighth tab (IA spec v5 §0.5.4): the season's timing panel (`#timing`; round / session switch,
 * A/B compare) + the season's race cards, whose ▶ switches the panel. Was /live?year= ("replay mode") in v4.
 */
export default function ReplayTab({ year, latest, schedule, panel }: { year: number; latest: number; schedule: ScheduledRace[]; panel: PanelProps }) {
  return (
    <div data-page="replay">
      <RailScope {...replayRail(year, latest)} />
      <Panel {...panel} archive={{ href: `/seasons/${year}`, label: `${year} 赛季` }} />
      <ReplayLinks>
        <RoundCards year={year} schedule={schedule} title={<>{year} 赛季 · 全部分站</>} calendar={year === latest} />
      </ReplayLinks>
    </div>
  );
}
