import Link from "next/link";
import { ViewTransition } from "react";
import s from "./index.module.css";
import Team from "@/components/entity/Team";
import Person from "@/components/entity/Person";
import EntityLink from "@/components/entity/EntityLink";
import { carImageKnown, type Pic } from "@/lib/carImage";

/** Picture for a chassis card (picture rule, lib/carImage.ts): only a photo of THAT chassis (official side view for the
 *  2026 grid), else F1's placeholder car captioned 「暂无该车照片」 — never the team's other cars. Reads the photo cache,
 *  which is reloaded when data/car-images.json changes; an unknown chassis is looked up in the background. */
export function carPicture(id: string): Pic {
  return carImageKnown(id);
}

/**
 * A car (team × year): white card radius 8 (formula1.com card system). Its media block is the team-card surface
 * (`.f1-surface.team-drs` in the team colour) carrying the official side view (current grid), a period photo, or the
 * captioned placeholder; below: year (Formula1), car name Formula1 24/28 500, team with logo, engine, drivers on the
 * team colour, optional prose. Whole card → /cars/<id> (stretched .card-link); team / drivers / year / prose links keep
 * their own hover intros.
 */
export default function CarCard({ id, name, team, teamName, color, year, pic, engine, drivers, summary, morph, rank }: {
  id: string; name: string; team?: string | null; teamName?: string | null; color: string; year?: number | null;
  /** the picture (carPicture / carImage*): url + caption + exact */
  pic: Pic; engine?: React.ReactNode; drivers?: { id: string; name: string }[];
  summary?: React.ReactNode; morph?: string; rank?: React.ReactNode;
}) {
  const image = <img src={pic.url} alt={pic.caption ?? name} title={pic.caption ?? undefined} loading="lazy" className={pic.kind === "photo" ? s.carPhoto : s.carSide} style={pic.kind === "placeholder" ? { opacity: 0.45, height: 88 } : undefined} />;
  return (
    <div className={`${s.car} lift`}>
      <Link href={`/cars/${id}`} className="card-link" aria-label={name} tabIndex={-1} />
      <div className={`${s.carStage} f1-surface team-drs img-slot`} style={{ ["--c" as any]: color }} data-img-kind="car" data-img-id={id} data-img-year={year ?? ""}
        data-img-status={pic.exact ? "exact" : pic.kind === "placeholder" ? "placeholder" : "representative"} data-img-caption={pic.caption ?? ""} data-img-depicts={pic.depicts ?? ""}>
        {morph ? <ViewTransition name={morph} share="morph" default="none">{image}</ViewTransition> : image}
        {pic.caption && !pic.exact && <span className="img-cap">{pic.caption}</span>}
      </div>
      <div className={`${s.carText} over-link`}>
        <span className={s.carKick}>
          {year && <EntityLink kind="year" id={String(year)}>{year}</EntityLink>}
          {rank}
        </span>
        <EntityLink kind="car" id={id} className={s.carName}>{name}</EntityLink>
        {team && <span className={s.carTeam}><Team id={team} name={teamName ?? team} size={20} badge year={year} />{engine && <em>{engine}</em>}</span>}
        {drivers && drivers.length > 0 && <span className={s.carDrivers}>{drivers.map((d) => <Person key={d.id} id={d.id} year={year} color={color} name={d.name} size={20} />)}</span>}
        {summary && <p>{summary}</p>}
      </div>
    </div>
  );
}
