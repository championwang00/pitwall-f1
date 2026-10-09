import Link from "next/link";
import u from "./unit.module.css";
import Icon from "@/components/ui/Icon";
import YearSpan from "@/components/entity/YearSpan";
import { Linked } from "@/lib/linkify";

/** The 「Y 赛季 / Y 年在这里」 band inserted under a unit page's hero when ?year= is set (spec §4);
 *  with `to`, the 「A–B 时期」 band of a period the subject doesn't exist in (spec §0.7.1). No "all years" link here: the way
 *  back to the overview is the rail's 总览 row and the breadcrumb (spec §0.8.0 #3). */
export default function YearBand({ year, to, label, sub, children, skip }: {
  year: number; to?: number; label: string; sub?: React.ReactNode; children: React.ReactNode;
  /** the page's own subject id: not linked when `sub` is prose */
  skip?: string;
}) {
  return (
    <section className={u.band} id="year">
      <div className="wrap">
        <div className={u.head}>
          <div>
            <h2 className={u.title}><b><YearSpan from={year} to={to} /></b><span>{label}</span></h2>
            {sub && <p className={u.sub}>{typeof sub === "string" ? <Linked text={sub} skip={skip} year={year} /> : sub}</p>}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/** Subject absent that year: say so, link the nearest years it does exist. */
export function YearMissing({ text, prev, next, hrefFor, children }: {
  text: React.ReactNode; prev: number | null; next: number | null; hrefFor: (y: number) => string; children?: React.ReactNode;
}) {
  return (
    <div className={u.missing}>
      <p>{text}</p>
      {(prev || next) && (
        <div className={u.near}>
          {prev && <Link href={hrefFor(prev)} scroll={false}><Icon name="arrow-left" size={16} />之前最近 <b>{prev}</b></Link>}
          {next && <Link href={hrefFor(next)} scroll={false}>之后最近 <b>{next}</b><Icon name="arrow-right" size={16} /></Link>}
        </div>
      )}
      {children}
    </div>
  );
}
