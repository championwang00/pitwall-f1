"use client";

import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import Breadcrumb, { type Crumb } from "@/components/shell/Breadcrumb";

const TAB_ZH: Record<string, string> = { standings: "积分榜", era: "时代", circuits: "赛道", drivers: "车手", teams: "车队", cars: "赛车", replay: "回放" };

/**
 * Year hub breadcrumb (IA spec v5 §0.5.6): 历史 › Y [› 标签] [› 大奖赛 · 节次]. The tab comes from the selected layout
 * segment; on the replay tab the session name follows `?session=` (the panel `replaceState`s it when it switches).
 */
export default function YearCrumbs({ year, sessions }: { year: number; sessions?: Record<number, string> }) {
  const seg = useSelectedLayoutSegment();
  const sp = useSearchParams();
  const tab = seg && TAB_ZH[seg] ? seg : null;
  const items: Crumb[] = [{ label: "历史", href: "/seasons" }];
  items.push(tab ? { label: year, kind: "year", id: String(year), href: `/seasons/${year}`, name: String(year) } : { label: year, kind: "year", name: String(year) });
  if (tab) {
    const key = tab === "replay" ? Number(sp.get("session")) : NaN;
    const sess = Number.isFinite(key) ? sessions?.[key] : undefined;
    items.push(sess ? { label: TAB_ZH[tab], href: `/seasons/${year}/replay` } : { label: TAB_ZH[tab] });
    if (sess) items.push({ label: sess });
  }
  return <Breadcrumb items={items} flush />;
}
