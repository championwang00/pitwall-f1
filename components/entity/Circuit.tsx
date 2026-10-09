import EntityLink from "./EntityLink";
import s from "./chip.module.css";
import { trackOutline } from "@/lib/assets";

/**
 * A circuit wherever it stands on its own (IA spec v6 §0.6.5): the official track outline (white on dark surfaces)
 * + Chinese name, linked to /circuits/<id> (`year` → that year's slice) with the circuit hover card.
 * No outline on file → the name alone.
 */
export default function Circuit({ id, name, year, h = 22, onDark = true, plain, preview = true, className }: {
  id: string; name: string; year?: number | null; h?: number; onDark?: boolean; plain?: boolean; preview?: boolean; className?: string;
}) {
  const o = trackOutline(id, year);
  const body = (
    <>
      {o && <img className={s.outline} src={o} alt="" loading="lazy" style={{ height: h, maxWidth: h * 2 }} />}
      <b>{name}</b>
    </>
  );
  const cls = `${s.chip} ${onDark ? s.onDark : ""} ${className ?? ""}`;
  return plain ? <span className={cls}>{body}</span> : <EntityLink kind="circuit" id={id} year={year} preview={preview} className={cls}>{body}</EntityLink>;
}
