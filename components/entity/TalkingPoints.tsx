import Link from "next/link";
import Icon from "@/components/ui/Icon";
import s from "./talk.module.css";
import type { Talk } from "@/lib/talk";
import type { Rec } from "@/lib/records";
import type { Note } from "@/lib/content";
import { mergeTalkingPoints, commentaryText, noteDate } from "@/lib/editorial";
import CopyNotes from "./CopyNotes";
import EntityLink, { EntityHref } from "./EntityLink";
import Person from "./Person";
import Laurel, { type Tone } from "./Laurel";
import { Linked } from "@/lib/linkify";


/** The few record-book entries that are honours get a laurel: wins/streaks gold, poles red, fastest laps purple. */
const honour = (label: string): Tone | null =>
  /连胜|赢得最多|胜场最多|统治力/.test(label) ? "gold" : /杆位最多/.test(label) ? "red" : /最快圈/.test(label) ? "purple" : null;

/** On-air crib sheet: curated, web-verified notes first, then numbers computed from F1DB. */
export default function TalkingPoints({ auto, notes = [], title = "解说要点", subject, more, records, skip, year, skipRace, chronological = false }: {
  chronological?: boolean; auto: Talk[]; notes?: Note[]; title?: string; subject: string; more?: { href: string; label: string }; records?: Rec[];
  /** Entity id of the page's own subject, so prose doesn't link back to the page it is on. */
  skip?: string;
  /** the page's year context: names open their ?year= slice, a bare "XX大奖赛" that year's race (lib/linkify) */
  year?: number | null;
  /** "YYYY/R" of the page's own race (race / brief pages) */
  skipRace?: string;
}) {
  const items = mergeTalkingPoints(notes, auto);
  if (chronological) items.sort((a,b)=>("publishedAt" in b ? b.publishedAt ?? "" : "").localeCompare("publishedAt" in a ? a.publishedAt ?? "" : "") || Number(b.curated && !!b.photo)-Number(a.curated && !!a.photo));
  if (!items.length) return null;
  const plain = commentaryText(notes, auto) + (records?.length ? "\n【纪录簿】" + records.map((r) => `${r.label}：${r.value}${r.who ? "（" + r.who + "）" : ""}${r.when ? " " + r.when : ""}`).join("；") + "\n来源：F1DB https://github.com/f1db/f1db" : "");
  return (
    <section className={`${s.band} ${items.some(i => i.curated && i.photo) ? s.withPhotos : ""}`}>
      <div className="wrap">
        <div className={s.head}>
          <div>
            <h2 className={s.title}><Linked text={title} skip={skip} skipRace={skipRace} /></h2>
            <p className={s.sub}><Linked text={subject} skip={skip} skipRace={skipRace} year={year} /> · {items.length} 条，均可溯源</p>
          </div>
          <div className={s.headActions}>
            {more && <Link href={more.href} className={s.more}>{more.label}</Link>}
            <CopyNotes text={`${subject} · 解说要点\n${plain}`} />
          </div>
        </div>
        {(() => {
          const render = (it: (typeof items)[number], i: number, lead = false) => {
            const href = "href" in it ? it.href : undefined;
            const sources = it.curated ? it.sources : [{ label: it.source ?? "F1DB", url: "https://github.com/f1db/f1db" }];
            const date = noteDate(it);
            // a curated note carries its own year: its names and a bare "XX大奖赛" resolve against it
            const ty = (it.curated ? (it as Note).year : null) ?? year;
            // title links to the detail (if any); the prose stays free to carry its own entity links
            return (
              <li key={i} className={lead ? s.lead : s.item}>
                <span className={s.tag}>{it.tag}</span>
                <h3>{href ? <EntityHref href={href} className={s.itemLink}>{it.title}<Icon name="chevron-right" size={18} style={{ verticalAlign: "-3px" }} /></EntityHref> : <Linked text={it.title} skip={skip} skipRace={skipRace} year={ty} />}</h3>
                <p><Linked text={it.text} skip={skip} skipRace={skipRace} year={ty} /></p>
                {it.curated && it.photo && <figure className={s.photo}><img src={it.photo.url} alt={it.photo.caption} width={it.photo.width} height={it.photo.height} loading="lazy" decoding="async" /><figcaption>{it.photo.caption}</figcaption></figure>}
                <div className={s.src}>{sources.map((src) => <a key={src.url} href={src.url} target="_blank" rel="noreferrer">{src.label}</a>)}{date && <span>{date}</span>}</div>
              </li>
            );
          };
          const [first, ...rest] = items;
          return (
            <div className={s.layout}>
              <ol className={s.leadCol}>{render(first, 0, true)}</ol>
              <ol className={s.grid}>{rest.map((it, i) => render(it, i + 1))}</ol>
            </div>
          );
        })()}
        {records && records.length > 0 && (
          <div className={s.book}>
            <h3 className={s.bookTitle}>纪录簿</h3>
            <dl className={s.recs} style={{ ["--cols" as any]: records.length % 4 === 0 ? 4 : records.length % 3 === 0 ? 3 : records.length === 5 ? 5 : 4 }}>
              {records.map((r) => {
                const tone = honour(r.label);
                const value = tone ? <span className={s.recLaurel}><Laurel tone={tone} size={40} top={r.value} /></span> : <b>{r.value}</b>;
                return (
                  <div key={r.label}>
                    <dt>{r.label}</dt>
                    <dd>
                      {r.href ? <EntityHref href={r.href} className={s.recVal}>{value}</EntityHref> : value}
                      {(r.who || r.when) && (
                        <span className={s.recWho}>
                          {r.who && (r.whoId ? <Person id={r.whoId} name={r.who} size={22} year={year} className={s.recPerson} /> : <Linked text={r.who} skip={skip} year={year} />)}
                          {r.who && r.when && <i> · </i>}
                          {r.when && <span><Linked text={r.when} skip={skip} skipRace={skipRace} year={year} /></span>}
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
