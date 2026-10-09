import Link from "next/link";
import { ViewTransition } from "react";
import s from "@/components/season/bigcard.module.css";
import { get } from "@/lib/db";
import { flag, driverNumberArt } from "@/lib/assets";
import { zhName } from "@/lib/zh";
import EntityLink from "@/components/entity/EntityLink";
import Laurel from "@/components/entity/Laurel";

const CJK = /[㐀-鿿]/;

/**
 * formula1.com driver listing card (/en/drivers): `.f1-surface` = the dark "accessible" variant of his team colour
 * THAT year + the official DRS halftone in the bright colour; Latin first name (Formula1 400) over the surname
 * (Formula1 500), Chinese name under it, team / meta line, number art (2026 grid) or the big kicker numeral in
 * Formula1 Digits, round flag bottom-left, period portrait bleeding from the bottom-right half (`year` → /api/face?year=).
 * Hover = .lift + underline the name. The whole card clicks through via a stretched sibling `.card-link`;
 * the name is the card's own subject (no hover intro unless `preview`), team / year links inside keep theirs.
 */
export default function DriverCard({ id, name, latin, color, kicker, laurels = [], meta, chips, href, size, className, year, stats, preview = false, label, morph, nameHref }: {
  id: string; year?: number | null; name: string; latin?: string | null; color: string; kicker?: React.ReactNode;
  laurels?: { top: React.ReactNode; bottom?: React.ReactNode }[]; meta?: React.ReactNode;
  chips?: { label: React.ReactNode; solid?: boolean }[]; href?: string; size?: "sm"; className?: string;
  /** F1 stat cells along the foot: value in Formula1, label in Titillium caps (PTS, WINS…). */
  stats?: { v: React.ReactNode; k: string }[];
  /** the name links with its hover intro (cards whose subject is not the driver, e.g. a season card) */
  preview?: boolean;
  /** accessible name of the whole-card link (defaults to the driver's name) */
  label?: string;
  /** shared-element name for the portrait (morphs into the driver hero) */
  morph?: string;
  /** the name's own link when the card itself goes elsewhere (e.g. a season card → the season, name → the driver that year) */
  nameHref?: string;
}) {
  const d = get<any>("select first_name f, last_name l, nationality_country_id nat from driver where id = ?", id);
  const lat = latin ?? (CJK.test(name) ? null : name);
  const first = d?.f ?? (lat ? lat.split(" ").slice(0, -1).join(" ") : "");
  const last = d?.l ?? (lat ? lat.split(" ").slice(-1)[0] : "");
  const zh = zhName.driver(id) ?? (CJK.test(name) ? name : null);
  const f = flag(d?.nat);
  const to = href ?? (year ? `/drivers/${id}?year=${year}` : `/drivers/${id}`);
  const photo = `/api/face/${id}?v=3&s=440${year ? `&year=${year}` : ""}`;
  const art = kicker == null && (!year || year === 2026) ? driverNumberArt(id) : null;
  return (
    <div className={`${s.card} f1-surface lift ${size === "sm" ? s.sm : ""} ${className ?? ""}`} style={{ ["--c" as any]: color }}>
      <Link href={to} className="card-link" aria-label={label ?? zh ?? name} tabIndex={-1} />
      <div className={s.photo}>{morph
        ? <ViewTransition name={morph} share="morph" default="none"><img src={photo} alt="" loading="lazy" /></ViewTransition>
        : <img src={photo} alt="" loading="lazy" />}</div>
      <div className={`${s.body} over-link`}>
        <EntityLink kind="driver" id={id} href={nameHref ?? to} className={s.name} preview={preview}>
          {first || last ? <><span className={s.first}>{first}</span><span className={s.last}>{last}</span></> : <span className={s.last}>{name}</span>}
          {zh && (first || last) && <span className={s.zh}>{zh}</span>}
        </EntityLink>
        {meta && <div className={s.meta}>{meta}</div>}
        {(art || kicker != null || laurels.length > 0) && (
          <div className={s.mark}>
            {art ? <span className={s.art} style={{ maskImage: `url(${art})`, WebkitMaskImage: `url(${art})` }} role="presentation" />
              : kicker != null ? <span className={s.kicker}>{kicker}</span> : null}
            {laurels.map((l, i) => <Laurel key={i} tone="white" onColor size={30} top={l.top} bottom={l.bottom} />)}
          </div>
        )}
        {chips && chips.length > 0 && <span className={s.chips}>{chips.map((c, i) => <span key={i} className={`${s.chip} ${c.solid ? s.chipSolid : ""}`}>{c.label}</span>)}</span>}
        <div className={s.foot}>
          {f && <img src={f} alt="" width={24} className={s.flag} />}
          {stats && stats.length > 0 && (
            <span className={s.stats}>{stats.map((x) => <span key={x.k}><b>{x.v}</b><em>{x.k}</em></span>)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
