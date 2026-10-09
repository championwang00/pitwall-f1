import Link from "next/link";
import s from "./season.module.css";
import { allSeasons } from "@/lib/f1";
import { teamColor, teamColorAt } from "@/lib/assets";
import { TEAM_ZH } from "@/lib/names";

/** 77 chips, one per season, coloured by the constructors' champion. */
export default function SeasonStrip({ current, dark = false }: { current?: number; dark?: boolean }) {
  const seasons = allSeasons().slice().reverse();
  return (
    <div className={`${s.strip} ${dark ? s.stripDark : ""}`}>
      {seasons.map((x: any) => (
        <Link key={x.year} href={`/seasons/${x.year}`} className={`${s.chip} ${x.year === current ? s.on : ""}`}
          style={{ ["--c" as any]: x.champTeam ? teamColorAt(x.champTeam, x.year, "#8a8a94") : "#c8c6c3" }}
          title={`${x.year} · ${x.champTeam ? `车队冠军 ${TEAM_ZH[x.champTeam] ?? x.champTeam}` : "未设车队冠军"}`}>
          <i />
          {(x.year % 10 === 0 || x.year === current) && <span>{x.year}</span>}
        </Link>
      ))}
    </div>
  );
}
