import EntityLink from "./EntityLink";
import s from "./chip.module.css";
import { carThumb } from "@/lib/hero";

/**
 * A car (chassis) wherever it stands on its own (IA spec v6 §0.6.5): small side view + chassis name in the Latin display
 * face, linked to /cars/<id> (never `?year=`, §4.5) with the car hover card. The 2026 grid uses the official side view;
 * a historic chassis uses its own photo only when it is known to show exactly that chassis — no photo → name alone,
 * never a drawn placeholder.
 */
export default function Car({ id, name, team, year, h = 20, plain, preview = true, className }: {
  id: string; name: string; team: string; year?: number | null; h?: number; plain?: boolean; preview?: boolean; className?: string;
}) {
  const t = carThumb(id, team, year);
  const body = (
    <>
      {t && <img className={t.kind === "official" ? s.side : s.pic} src={t.url} alt="" loading="lazy"
        style={t.kind === "official" ? { width: Math.round(h * 2.8), height: h } : { width: Math.round(h * 1.6), height: h }} />}
      <b className="lat">{name}</b>
    </>
  );
  return plain
    ? <span className={`${s.chip} ${className ?? ""}`}>{body}</span>
    : <EntityLink kind="car" id={id} year={year} preview={preview} className={`${s.chip} ${className ?? ""}`}>{body}</EntityLink>;
}
