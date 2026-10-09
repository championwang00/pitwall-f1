import EntityLink from "./EntityLink";
import s from "./person.module.css";

/** A driver everywhere on the site: face + name (+ optional Latin), linked with a hover card. */
/** `year`: show the photo from THAT season (right team kit), see lib/periodFace.ts. */
/** `color`: the team colour behind the portrait (formula1.com DriverAvatar). */
export default function Person({ id, name, latin, size = 28, sub, className, plain, preview = true, year, color }: {
  id: string; name: string; latin?: string | null; size?: number; sub?: React.ReactNode; className?: string; plain?: boolean; preview?: boolean; year?: number | null; color?: string | null;
}) {
  const body = (
    <>
      <img className={s.face} src={`/api/face/${id}?v=3&s=${size}${year ? `&year=${year}` : ""}`} alt="" loading="lazy" width={size} height={size} style={{ width: size, height: size, ...(color ? { background: color } : {}) }} />
      <span className={s.text}>
        <b>{name}</b>
        {latin && <span className="lat">{latin}</span>}
        {sub && <em>{sub}</em>}
      </span>
    </>
  );
  return plain ? <span className={`${s.person} ${className ?? ""}`}>{body}</span> : <EntityLink kind="driver" id={id} preview={preview} year={year} className={`${s.person} ${className ?? ""}`}>{body}</EntityLink>;
}
