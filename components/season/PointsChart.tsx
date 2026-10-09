import Link from "next/link";
import s from "./season.module.css";

type Series = { id: string; name: string; color: string; pts: number[] };

/** Cumulative-points title fight. Static SVG; each line is labelled at its end. */
export default function PointsChart({ series, rounds, labels, year }: { series: Series[]; rounds: number; labels: string[]; /** season → end labels open the driver's ?year= slice */ year?: number }) {
  const W = 1000, H = 360, L = 44, R = 150, T = 16, B = 34;
  const max = Math.max(1, ...series.flatMap((x) => x.pts));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const x = (i: number) => L + (rounds <= 1 ? 0 : (i / (rounds - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  // spread end labels so they don't collide
  const ends = series.map((sr) => ({ sr, y: y(sr.pts[sr.pts.length - 1] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.chart} role="img" aria-label="积分走势">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={s.grid} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className={s.axis}>{t}</text>
        </g>
      ))}
      {labels.map((lb, i) => (i % Math.ceil(rounds / 12) === 0 || i === rounds - 1) && (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className={s.axis}>{lb}</text>
      ))}
      {series.map((sr) => (
        <g key={sr.id}>
          <polyline fill="none" stroke={sr.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round"
            points={sr.pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          {sr.pts.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={7} fill="transparent"><title>{`${sr.name} · ${labels[i]} · ${v} 分`}</title></circle>
          ))}
        </g>
      ))}
      {ends.map(({ sr, y: ey }) => (
        <g key={sr.id}>
          <circle cx={x(sr.pts.length - 1)} cy={y(sr.pts[sr.pts.length - 1] ?? 0)} r={3.5} fill={sr.color} />
          {/* the end label names a driver → his season (SVG <a>; no hover card — the layer reads HTML anchors only) */}
          <Link href={`/drivers/${sr.id}${year ? `?year=${year}` : ""}`} className={s.endLink}>
            <text x={x(sr.pts.length - 1) + 12} y={ey + 4} className={s.endLabel}>{sr.name} <tspan className={s.endPts}>{sr.pts[sr.pts.length - 1]}</tspan></text>
          </Link>
        </g>
      ))}
    </svg>
  );
}
