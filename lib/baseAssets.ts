import fs from "node:fs";
import path from "node:path";

/** Reviewed assets shared by every reference to the same object in the same season. */
export type BaseAsset = {
  url: string;
  darkUrl?: string;
  darkSource?: string;
  kind: "photo" | "logo";
  exact: boolean;
  caption: string | null;
  depicts: string;
  depictsYear?: number | null;
  source: string;
  author: string;
  license: string;
  evidence: string;
};
type Manifest = { version: number; assets: Record<string, BaseAsset>; defaults: Record<string, BaseAsset> };
const file = path.join(process.cwd(), "data/base-assets.json");
let manifest: Manifest = { version: 1, assets: {}, defaults: {} };
let modified = -1;

export function baseAsset(kind: "driver" | "car" | "team", id: string, year?: number | null): BaseAsset | null {
  try {
    const next = fs.statSync(file).mtimeMs;
    if (next !== modified) {
      manifest = JSON.parse(fs.readFileSync(file, "utf8"));
      modified = next;
    }
  } catch { return null; }
  return (year ? manifest.assets[`${kind}:${id}@${year}`] : manifest.defaults[`${kind}:${id}`]) ?? null;
}
