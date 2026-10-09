import Link from "next/link";
import { ViewTransition } from "react";
import s from "./index.module.css";
import Team from "@/components/entity/Team";
import Person from "@/components/entity/Person";
import EntityLink from "@/components/entity/EntityLink";
import known from "@/data/car-images.json";

const K = known as Record<string, string | null>;
/** Picture for a chassis: only a photo of THAT chassis (never the team's other cars, never F1's grey placeholder car);
 *  null → the card shows the year numeral on the team colour instead. */
export function carPicture(id: string, _team?: string | null): string | null {
  return K[`c:${id}`] ? `/api/carimg/${id}` : null;
}

/**
 * A car (team × year): white card radius 8 (formula1.com card system). Its media block is the team-card surface
 * (`.f1-surface.team-drs` in the team colour) carrying the official side view (current grid) or a period photo;
 * below: year (Formula1), car name Formula1 24/28 500, team with logo, engine, drivers on the team colour, optional prose.
 * Whole card → /cars/<id> (stretched .card-link); team / drivers / year / prose links keep their own hover intros.
 */
export default function CarCard({ id, name, team, teamName, color, year, img, photo, engine, drivers, summary, morph, rank }: {
  id: string; name: string; team?: string | null; teamName?: string | null; color: string; year?: number | null;
  /** image url; `photo` = a real photograph (cover) rather than the transparent official side view */
  img: string | null; photo?: boolean; engine?: React.ReactNode; drivers?: { id: string; name: string }[];
  summary?: React.ReactNode; morph?: string; rank?: React.ReactNode;
}) {
  const image = img ? <img src={img} alt="" loading="lazy" className={photo ? s.carPhoto : s.carSide} /> : <span className={s.carPh}>{year ?? name}</span>;
  return (
    <div className={`${s.car} lift`}>
      <Link href={`/cars/${id}`} className="card-link" aria-label={name} tabIndex={-1} />
      <div className={`${s.carStage} f1-surface team-drs`} style={{ ["--c" as any]: color }}>
        {morph ? <ViewTransition name={morph} share="morph" default="none">{image}</ViewTransition> : image}
      </div>
      <div className={`${s.carText} over-link`}>
        <span className={s.carKick}>
          {year && <EntityLink kind="year" id={String(year)}>{year}</EntityLink>}
          {rank}
        </span>
        <Link href={`/cars/${id}`} className={s.carName}>{name}</Link>
        {team && <span className={s.carTeam}><Team id={team} name={teamName ?? team} size={20} badge year={year} />{engine && <em>{engine}</em>}</span>}
        {drivers && drivers.length > 0 && <span className={s.carDrivers}>{drivers.map((d) => <Person key={d.id} id={d.id} year={year} color={color} name={d.name} size={20} />)}</span>}
        {summary && <p>{summary}</p>}
      </div>
    </div>
  );
}
