import EntityLink from "@/components/entity/EntityLink";
import c from "./circuit.module.css";
import u from "@/components/unit/unit.module.css";

type Race = { year: number; round: number; gp: string; team: string | null; color: string | null; winner: string | null };

/** Readable text colour on a team-colour chip. */
function ink(hex: string | null) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#fff";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#15151e" : "#fff";
}

/**
 * Every World Championship GP this circuit hosted, one chip per race in calendar order, coloured by the winner's team.
 * Years the circuit was off the calendar show as thin ticks (short gaps) or a labelled break (long gaps). No first /
 * last / count in the head: the hero's head line says 「举办 N 届 A – B」 (spec §0.8.5).
 */
export default function YearStrip({ races, current }: { races: Race[]; current?: number | null }) {
  if (!races.length) return null;
  const asc = [...races].sort((a, b) => a.year - b.year || a.round - b.round);
  const y0 = asc[0].year, y1 = asc.at(-1)!.year;
  const years = new Set(asc.map((r) => r.year));
  const items: React.ReactNode[] = [];
  let y = y0;
  while (y <= y1) {
    if (years.has(y)) {
      const here = asc.filter((r) => r.year === y);
      here.forEach((r, i) => {
        items.push(
          <EntityLink key={`${y}-${r.round}`} kind="year" id={String(y)} href={`/races/${y}/${r.round}`} className={`${c.yChip} ${r.winner ? "" : c.yNext} ${y === current ? u.cur : ""}`}
            style={r.color ? { background: r.color, color: ink(r.color) } : undefined}>
            {y}{here.length > 1 && <sup>{i + 1}</sup>}
          </EntityLink>,
        );
      });
      y++;
    } else {
      let end = y;
      while (end + 1 <= y1 && !years.has(end + 1)) end++;
      const n = end - y + 1;
      items.push(n <= 2
        ? Array.from({ length: n }, (_, i) => <i key={`g${y + i}`} className={c.yTick} title={`${y + i} 未举办`} />)
        : <span key={`g${y}`} className={c.yGap} title={`${y}–${end} 未举办`}><i /><span className="num">{n}</span> 年空缺<i /></span>);
      y = end + 1;
    }
  }
  return (
    <div className={c.yStrip}>
      <p className={c.yHead}>
        <b>举办年份</b>
        <em>色块 = 当年冠军所在车队；悬停看那个赛季，点击进入那一站</em>
      </p>
      <div className={c.yChips}>{items}</div>
    </div>
  );
}
