/**
 * The page state of the three object pages (spec §0.7): overview (null) · ?year=Y · ?from=A&to=B.
 * Every section under the hero reads only this `range` (user: 左边导航是哪个阶段，就要看哪个阶段的事情).
 * Pure functions, no db — client components (Cube) may import it.
 */
export type Range = { from: number; to: number };
/** 页面状态：year 优先；都没有 = 总览（null） */
export const rangeOf = (year: number | null, period: Range | null): Range | null => (year ? { from: year, to: year } : period);
export const inRange = (y: number, r: Range | null) => !r || (y >= r.from && y <= r.to);
export const rangeLabel = (r: Range) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`);
/** 区块标题：总览用原题；年份 / 时期用「{范围} {后缀}」，如 rangeTitle(r, "历年阵容与赛车", "阵容与赛车") → 「2018–2020 阵容与赛车」 */
export const rangeTitle = (r: Range | null, overview: string, suffix: string) => (r ? `${rangeLabel(r)} ${suffix}` : overview);
/** 范围内最近的两个存在年份（范围之外），给"未参赛 / 未举办"带用 */
export const nearestOutside = (ys: number[], r: Range) => ({ prev: [...ys].reverse().find((y) => y < r.from) ?? null, next: ys.find((y) => y > r.to) ?? null });
/** 策展条目：有 year 字段按 year；没有的（趣事）按标题 / 正文里写到的赛季；r=null 全给 */
export function rangeItems<T extends { year?: number | null; title?: string; text?: string }>(items: T[], r: Range | null): T[] {
  if (!r) return items;
  return items.filter((x) => x.year != null ? inRange(x.year, r)
    : (`${x.title ?? ""} ${x.text ?? ""}`.match(/(19|20)\d{2}/g) ?? []).some((y) => inRange(+y, r)));
}
