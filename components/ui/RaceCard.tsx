import Link from "next/link";
import s from "./racecard.module.css";
import Icon from "./Icon";
import EntityLink from "@/components/entity/EntityLink";
import { flag } from "@/lib/assets";

export type PodiumEntry = { pos: number; driver: string; code: string; time?: string | null; color: string; year?: number | null; name?: string };

const ORD = ["ST", "ND", "RD"];

/**
 * formula1.com podium cell (race card / results): #F7F4F1 tile, position stacked in Formula1 Wide (1 over ST),
 * 32px official portrait on the team colour, 3-letter code in Formula1, time / gap in KH Interference.
 * The driver is a mention (not the card's subject) → links with the hover intro.
 */
export function PodiumCells({ podium, className, dark }: { podium: PodiumEntry[]; className?: string; dark?: boolean }) {
  return (
    <div className={`${s.podium} ${dark ? s.podiumDark : ""} ${className ?? ""}`}>
      {podium.map((p) => (
        <EntityLink key={p.pos} kind="driver" id={p.driver} year={p.year} className={s.cell}>
          <span className={s.pos}><span>{p.pos}</span><span>{ORD[p.pos - 1] ?? "TH"}</span></span>
          <img className={`avatar ${s.face}`} src={`/api/face/${p.driver}?s=64${p.year ? `&year=${p.year}` : ""}`} alt="" width={32} height={32} loading="lazy" style={{ background: p.color }} />
          <span className={s.who}>
            <b>{p.code}</b>
            {p.time && <span>{p.time}</span>}
          </span>
        </EntityLink>
      ))}
    </div>
  );
}

/** "21 - 23 Aug" (formula1.com weekend range, from ISO dates). */
export function weekendRange(first: string | null | undefined, last: string) {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const b = new Date(last), a = first ? new Date(first) : null;
  const d = (x: Date) => String(x.getUTCDate()).padStart(2, "0");
  if (!a || a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)) return `${d(b)} ${M[b.getUTCMonth()]}`;
  return a.getUTCMonth() === b.getUTCMonth() ? `${d(a)} - ${d(b)} ${M[b.getUTCMonth()]}` : `${d(a)} ${M[a.getUTCMonth()]} - ${d(b)} ${M[b.getUTCMonth()]}`;
}

/**
 * formula1.com race card (Schedule page), three states:
 *  · done   — white card: ROUND n + chequered-flag date pill · round flag + name · official name · 3 podium cells
 *  · next   — the "up next" photo card (official race-card photo, black top / bottom fades, white type)
 *  · future — white card: ROUND n + date pill · flag + name · official name · race time · official track outline (mask)
 * The whole card links to the race (stretched .card-link); the circuit / drivers / actions inside keep their own links.
 */
export default function RaceCard({ href, round, label, name, latin, country, official, circuit, dates, podium, state, sprint, tag, actions, when, outline, photo }: {
  href: string; round: number; label?: React.ReactNode; name: string; latin?: string | null; country: string | null; official?: string | null;
  circuit?: { id: string; name: string } | null; dates: string; podium?: PodiumEntry[]; state: "done" | "next" | "future";
  sprint?: boolean; tag?: React.ReactNode; actions?: React.ReactNode; when?: React.ReactNode; outline?: string | null; photo?: string | null;
}) {
  const f = flag(country);
  const top = (
    <span className={s.top}>
      <span className={s.round}>{label ?? `Round ${round}`}{tag && <em className={s.tag}>{tag}</em>}{sprint && <em className={s.sprint}>冲刺</em>}</span>
      {state !== "next" && <span className={s.pill}>{state === "done" && <Icon name="chequered-flag" size={16} />}<span>{dates}</span></span>}
    </span>
  );
  const title = (
    <span className={s.titleRow}>
      {f && <img src={f} alt="" className={s.flag} />}
      <Link href={href} className={s.name}>{name}</Link>
      {latin && <span className={s.latin}>{latin}</span>}
    </span>
  );
  return (
    <li className={`${s.card} ${s[state]} lift`}>
      <Link href={href} className="card-link" aria-label={name} tabIndex={-1} />
      {state === "next" && photo && (
        <>
          <img className={s.photo} src={photo} alt="" loading="lazy" />
          <span className={s.fadeTop} />
          <span className={s.fadeBottom} />
        </>
      )}
      <div className={`${s.body} over-link`}>
        {top}
        {title}
        {state === "next" && <span className={s.nextDate}>{dates}</span>}
        <span className={s.official}>
          {state !== "next" && official && <span>{official}</span>}
          {circuit && <span className={s.circ}>{circuit.name}</span>}
        </span>
        {when && <span className={s.when}>{when}</span>}
        {actions && <span className={s.actions}>{actions}</span>}
        {state === "done" && podium && podium.length > 0 && <PodiumCells podium={podium} />}
        {state === "future" && (
          <span className={s.foot}>
            {outline && <span className={s.outline} style={{ maskImage: `url(${outline})`, WebkitMaskImage: `url(${outline})` }} role="presentation" />}
          </span>
        )}
      </div>
    </li>
  );
}

/** Small action link that sits on a race card (replay / results / add-to-calendar), formula1.com icon + label. */
export function CardAction({ href, icon, children, download }: { href: string; icon: "play" | "chevron-right" | "calendar-add" | "internal-link"; children: React.ReactNode; download?: boolean }) {
  const body = icon === "chevron-right" ? <>{children}<Icon name={icon} size={14} /></> : <><Icon name={icon} size={14} />{children}</>;
  return download
    ? <a href={href} className={`${s.action} ${icon === "play" ? s.actionPlay : ""}`}>{body}</a>
    : <Link href={href} className={`${s.action} ${icon === "play" ? s.actionPlay : ""}`}>{body}</Link>;
}

/** Session times on an upcoming card: code in Formula1, day + local time in KH Interference (formula1.com schedule rows). */
export function SessionList({ rows }: { rows: { key: string; name: string; when: React.ReactNode; race?: boolean }[] }) {
  return (
    <span className={s.sessions}>
      {rows.map((x) => <span key={x.key} className={x.race ? s.sRace : undefined}><b>{x.name}</b><span>{x.when}</span></span>)}
    </span>
  );
}
