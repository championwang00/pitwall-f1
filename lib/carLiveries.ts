import fs from "node:fs";
import path from "node:path";
import { baseAsset } from "./baseAssets";
import { carImageKnown, knownChassisPhoto } from "./carImage";

export type LiveryPhoto = { url: string; source: string; caption: string; author?: string; license?: string; scope?: "race" | "season" | "model" };
export type Livery = { id: string; name: string; kind: "standard" | "update" | "special"; description: string; source: string; photo?: LiveryPhoto; appliesTo?: string };
type Variant = Livery & { chassis: string; year: number; rounds: number[] };
const files = new Map<string, { mtime: number; value: unknown }>();
function read<T>(name: string, fallback: T): T {
  try {
    const file = path.join(process.cwd(), "data", name);
    const mtime = fs.statSync(file).mtimeMs;
    if (files.get(name)?.mtime !== mtime) files.set(name, { mtime, value: JSON.parse(fs.readFileSync(file, "utf8")) });
    return files.get(name)!.value as T;
  } catch { return fallback; }
}
/** A shared reference is distinguished from a photograph of this race. */
export function seasonLiveryPhoto(chassis: string, year: number): LiveryPhoto | null {
  const reviewed = baseAsset("car", chassis, year) ?? baseAsset("car", chassis);
  if (reviewed?.exact) {
    const sameYear = reviewed.depictsYear === year && !/展示|博物馆|exhibition/i.test(reviewed.caption ?? "");
    return { url: reviewed.url, source: reviewed.source, author: reviewed.author, license: reviewed.license,
      scope: sameYear ? "season" : "model", caption: [reviewed.caption || (sameYear ? `${year} 年车型照片` : "车型照片"), sameYear ? "赛季参考" : "车型参考"].join(" · ") };
  }
  const known = knownChassisPhoto(chassis);
  const pic = carImageKnown(chassis);
  if (!pic.exact || pic.kind === "placeholder") return null;
  if (pic.kind === "official") return { url: pic.url, source: pic.url, scope: "season", caption: `${year} 年车型官方侧视图 · 赛季参考`, author: "Formula 1", license: "All rights reserved" };
  if (known?.d === chassis) return { url: pic.url, source: /^https?:\/\//.test(known.t) ? known.t : `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(known.t)}`,
    scope: "model", caption: `车型参考照片${known.y ? ` · 照片标注年份 ${known.y}` : ""} · 不代表本站涂装` };
  return null;
}
/** Unknown special liveries are never inferred from another year's car. */
export function raceLivery(chassis: string, year: number, round: number, reference?: LiveryPhoto | null): { livery: Livery | null; photo: LiveryPhoto | null } {
  const variants = read<Variant[]>("car-liveries.json", []);
  const variant = variants.find(v => v.chassis === chassis && v.year === year && v.rounds.includes(round));
  const photos = read<Record<string, LiveryPhoto>>("car-livery-photos.json", {});
  const actual = photos[`${chassis}@${year}:${round}`];
  if (actual) return { livery: variant ?? (chassis === "red-bull-rb18" && year === 2022 ? { id: "rb18-2022-standard", name: "Oracle 深蓝涂装", kind: "standard", description: "深蓝车身、红牛图形、黄色鼻部与白色 Oracle 字样。", source: "https://www.redbullracing.com/int-en/cars/rb18" } : null), photo: { ...actual, scope: "race" } };
  // A known special version must have its own photo; the baseline could depict the wrong livery.
  if (variant) return { livery: variant, photo: variant.photo ?? null };
  return { livery: null, photo: reference === undefined ? seasonLiveryPhoto(chassis, year) : reference };
}
