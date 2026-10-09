"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import Breadcrumb, { type Crumb } from "@/components/shell/Breadcrumb";

const TAB_ZH: Record<string, string> = { calendar: "赛历", standings: "积分榜", era: "时代", circuits: "赛道", drivers: "车手", teams: "车队", cars: "赛车", replay: "回放" };

/**
 * Year hub breadcrumb (IA spec v5 §0.5.6): 历史 › Y [› 标签]. The tab comes from the selected layout segment. The 回放 tab
 * is an index (v5.1): a session's replay is a child of its race, 历史 › Y › 第 R 站 {GP} › 回放 · {节次}, never under this tab.
 */
export default function YearCrumbs({ year }: { year: number }) {
  const seg = useSelectedLayoutSegment();
  const tab = seg && TAB_ZH[seg] ? seg : null;
  const items: Crumb[] = [{ label: "历史", href: "/seasons" }];
  items.push(tab ? { label: year, kind: "year", id: String(year), href: `/seasons/${year}`, name: String(year) } : { label: year, kind: "year", name: String(year) });
  if (tab) items.push({ label: TAB_ZH[tab] });
  return <Breadcrumb items={items} flush />;
}
