import { all, get } from "./db";
import { trackShape, type TrackShape } from "./tracks";

/**
 * Circuit pictures follow the same rule as cars and teams (lib/carImage.ts): a circuit IN A YEAR is drawn as the
 * layout raced that year. The 3D telemetry shape (data/tracks, one recent year) is used only when that year ran the
 * same layout; otherwise F1DB's own outline of that year's layout (circuit_layout id → SVG in the f1db repo).
 */
export type CircuitPic =
  | { kind: "shape"; shape: TrackShape; caption: string | null; exact: boolean; layout: string | null }
  | { kind: "svg"; url: string; caption: string | null; exact: boolean; layout: string };

/** F1DB layout outline (white stroke on transparent; `black` for light surfaces). */
export function layoutSvg(layoutId: string, variant: "white" | "black" = "white") {
  return `https://cdn.jsdelivr.net/gh/f1db/f1db@a01fe27e26a672be035c135894e92c995acdca4c/src/assets/circuits/${variant}/${layoutId}.svg`;
}

/** Layout used at this circuit in `year` (first race there that year). */
export function layoutOf(circuitId: string, year: number) {
  return get<any>(`select r.circuit_layout_id id, cl.length, cl.turns from race r left join circuit_layout cl on cl.id = r.circuit_layout_id
    where r.circuit_id = ? and r.year = ? and r.circuit_layout_id is not null order by r.round limit 1`, circuitId, year) as { id: string; length: number; turns: number } | undefined;
}

/** Years each layout was raced (for captions: 「1955–1956 年布局」). */
function layoutYears(circuitId: string, layoutId: string) {
  return all<any>("select distinct year from race where circuit_id = ? and circuit_layout_id = ? order by year", circuitId, layoutId).map((r) => r.year as number);
}

export function circuitImage(circuitId: string, year?: number | null, maxPts = 320, variant: "white" | "black" = "white"): CircuitPic | null {
  const shape = trackShape(circuitId, maxPts);
  const shapeLayout = shape ? layoutOf(circuitId, shape.year)?.id ?? null : null;
  const latest = get<any>("select max(year) y from race where circuit_id = ? and circuit_layout_id is not null", circuitId)?.y as number | undefined;
  const target = year ? layoutOf(circuitId, year) : latest ? layoutOf(circuitId, latest) : undefined;
  if (!target) return shape ? { kind: "shape", shape, caption: year ? `图为 ${shape.year} 年布局` : null, exact: !year, layout: shapeLayout } : null;
  if (shape && target.id === shapeLayout) return { kind: "shape", shape, caption: null, exact: true, layout: shapeLayout };
  const ys = layoutYears(circuitId, target.id);
  const span = ys.length > 1 ? `${ys[0]}–${ys.at(-1)}` : `${ys[0] ?? year}`;
  return {
    kind: "svg", url: layoutSvg(target.id, variant), layout: target.id, exact: true,
    caption: `${year ? `${year} 年所用布局` : "最近使用的布局"} · ${span} · ${Number(target.length).toFixed(3)} km`,
  };
}
