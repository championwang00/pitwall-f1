import Link from "next/link";
import u from "./unit.module.css";
import Icon from "@/components/ui/Icon";

/** The 「Y 赛季 / Y 年在这里」 band inserted under a unit page's hero when ?year= is set (spec §4). */
export default function YearBand({ year, label, sub, clearHref, children }: {
  year: number; label: string; sub?: React.ReactNode; clearHref: string; children: React.ReactNode;
}) {
  return (
    <section className={u.band} id="year">
      <div className="wrap">
        <div className={u.head}>
          <div>
            <h2 className={u.title}><b>{year}</b><span>{label}</span></h2>
            {sub && <p className={u.sub}>{sub}</p>}
          </div>
          <Link href={clearHref} className={u.clear} scroll={false}>看全部年份</Link>
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
