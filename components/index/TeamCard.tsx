import Link from "next/link";
import { ViewTransition } from "react";
import s from "./index.module.css";
import logos from "@/data/team-logos.json";
import { TEAMS_2026 } from "@/lib/assets";
import EntityLink from "@/components/entity/EntityLink";

export type TeamCardDriver = { id: string; first: string; last: string };

/**
 * formula1.com team listing card (/en/teams, measured): `.f1-surface.team-drs` (team colour + 315° fade of the dark
 * accessible colour, DRS-D halftone along the bottom), min-height 256, radius 8, padding 24 (16 on phones);
 * team name Formula1 24/28 500; drivers as 20px avatars on the team colour + "First LAST" (Titillium 14, surname bold caps);
 * round TeamLogo 48 top-right in the dark colour with the white logo; the official car side-view 112px tall at the bottom.
 * Seasons without an official car render the year's numbers there instead. Whole card → `href` (stretched .card-link);
 * the team name is the card's subject (no hover intro), drivers are mentions (keep theirs).
 */
export default function TeamCard({ id, name, latin, color, href, year, drivers, car, morph, stats, honour, sub, more }: {
  id: string; name: string; latin?: string | null; color: string; href: string; year?: number | null;
  drivers: TeamCardDriver[]; car?: string | null; /** shared-element name for the car image (morphs into the team page) */ morph?: string; stats?: { v: React.ReactNode; k: string }[];
  honour?: React.ReactNode; sub?: React.ReactNode; more?: number;
}) {
  const official = id in TEAMS_2026;
  const hasLogo = official || !!(logos as Record<string, string | null>)[id];
  return (
    <div className={`${s.team} ${car ? "" : s.teamCompact} f1-surface team-drs lift`} style={{ ["--c" as any]: color }}>
      <Link href={href} className="card-link" aria-label={name} tabIndex={-1} />
      <div className={`${s.teamIn} over-link`}>
        <div className={s.teamTop}>
          <div className={s.teamHead}>
            <EntityLink kind="team" id={id} href={href} preview={false} className={s.teamName}>
              {name}{latin && latin !== name && <span className={s.teamLatin}>{latin}</span>}
            </EntityLink>
            <span className={s.teamDrivers}>
              {drivers.map((d) => (
                <EntityLink key={d.id} kind="driver" id={d.id} href={`/drivers/${d.id}${year ? `?year=${year}` : ""}`} className={s.teamDriver}>
                  <img className="avatar" src={`/api/face/${d.id}?v=3&s=40${year ? `&year=${year}` : ""}`} alt="" width={20} height={20} loading="lazy" style={{ background: color }} />
                  <span>{d.first} <b>{d.last}</b></span>
                </EntityLink>
              ))}
              {more ? <span className={s.teamMore}>+{more}</span> : null}
            </span>
          </div>
          {hasLogo && (
            <span className={`${s.teamLogo} ${official ? "" : s.teamLogoLight}`}>
              <img src={`/api/logo/${id}?r=3${official ? "&v=white" : ""}`} alt="" loading="lazy" />
            </span>
          )}
        </div>
        {(stats?.length || honour) && (
          <div className={s.teamStats}>
            {stats?.map((x) => <span key={x.k}><b>{x.v}</b><em>{x.k}</em></span>)}
            {honour}
          </div>
        )}
        {car ? <span className={s.teamCar}>{morph ? <ViewTransition name={morph} share="morph" default="none"><img src={car} alt="" loading="lazy" /></ViewTransition> : <img src={car} alt="" loading="lazy" />}</span> : sub ? <p className={s.teamSub}>{sub}</p> : null}
      </div>
    </div>
  );
}
