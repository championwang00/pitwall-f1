import fs from "node:fs";
import path from "node:path";
import { drivers as dContent, teams as tContent, circuits as cContent } from "./content";
import { DRIVERS_2026 } from "./assets";
import { TEAM_ZH } from "./names";

type ZhNames = { drivers: Record<string, string>; constructors: Record<string, string>; circuits: Record<string, string> };
let cache: { mtime: number; data: ZhNames } | null = null;
function wikiZh(): ZhNames {
  const p = path.join(process.cwd(), "data/zh-names.json");
  try {
    const mtime = fs.statSync(p).mtimeMs;
    if (!cache || cache.mtime !== mtime) cache = { mtime, data: JSON.parse(fs.readFileSync(p, "utf8")) };
    return cache.data;
  } catch {
    return { drivers: {}, constructors: {}, circuits: {} };
  }
}

// A Chinese name is only useful if it actually contains CJK (zh-wiki keeps some Latin titles).
const cjk = (s?: string | null) => (s && /[一-龥]/.test(s) ? s : null);

/** Chinese name preference: hand-checked translation → official 2026 mapping → Simplified zh-wiki title. */
export const zhName = {
  driver: (id: string) => cjk(dContent()[id]?.nameZh) ?? cjk(DRIVERS_2026[id]?.nameZh) ?? cjk(wikiZh().drivers[id]),
  team: (id: string) => cjk(tContent()[id]?.nameZh) ?? cjk(TEAM_ZH[id]) ?? cjk(wikiZh().constructors[id]),
  circuit: (id: string) => cjk(cContent()[id]?.nameZh) ?? cjk(wikiZh().circuits[id]),
};
