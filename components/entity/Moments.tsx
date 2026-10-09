import s from "./entity.module.css";
import EntityLink from "./EntityLink";
import { Linked } from "@/lib/linkify";
import type { Anecdote, Moment } from "@/lib/content";
import { roundOf } from "@/lib/f1";

/** Year-anchored curated moments; each links into the race page for that year at that venue. */
export function Moments({ items, title = "高光时刻", kicker = "Moments", note, skip }: { items: Moment[]; title?: string; kicker?: string; note?: string; /** page subject id — not linked in prose */ skip?: string }) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => a.year - b.year);
  return (
    <section className={s.moments}>
      <div className="sec-head">
        <div>{kicker && <p className="kicker">{kicker}</p>}<h2 className="cn-h2">{title}</h2></div>
        {note && <span className="sub">{note}</span>}
      </div>
      <ol className={s.mList}>
        {sorted.map((m, i) => {
          const round = roundOf(m.year, m.gp, m.circuit);
          const href = round ? `/races/${m.year}/${round}` : `/seasons/${m.year}`;
          return (
            <li key={i} className={s.mItem}>
              <EntityLink kind="year" id={String(m.year)} href={href} className={s.mYear}><span className="num">{m.year}</span><em>{round ? `第 ${round} 站` : "赛季"}</em></EntityLink>
              <div className={s.mBody}>
                <h3 className="cn-h3"><Linked text={m.title} skip={skip} /></h3>
                <p><Linked text={m.text} skip={skip} />{m.sources.map((x, j) => <a key={j} className={s.srcInline} href={x.url} target="_blank" rel="noreferrer" title={x.label}>{j === 0 ? "来源" : j + 1}</a>)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Anecdotes({ items, title = "你可能不知道", kicker = "Did You Know", skip }: { items: Anecdote[]; title?: string; kicker?: string; skip?: string }) {
  if (!items?.length) return null;
  return (
    <section className={s.anec}>
      <div className="sec-head"><div>{kicker && <p className="kicker">{kicker}</p>}<h2 className="cn-h2">{title}</h2></div></div>
      <div className={s.aGrid}>
        {items.map((a, i) => (
          <article key={i} className={s.aCard}>
            <h3 className="cn-h3"><Linked text={a.title} skip={skip} /></h3>
            <p><Linked text={a.text} skip={skip} />{a.sources.map((x, j) => <a key={j} className={s.srcInline} href={x.url} target="_blank" rel="noreferrer" title={x.label}>{j === 0 ? "来源" : j + 1}</a>)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** formula1.com statistics row: label (Titillium) over the value (Formula1 Black). */
export function StatRow({ items }: { items: { k: string; v: string | number | null | undefined; sub?: string }[] }) {
  return (
    <dl className={s.stats}>
      {items.map((x) => (
        <div key={x.k}>
          <dt>{x.k}{x.sub && <em>{x.sub}</em>}</dt>
          <dd>{x.v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
