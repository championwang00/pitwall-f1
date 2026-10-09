import Link from "next/link";
import Icon from "@/components/ui/Icon";
import s from "./talk.module.css";
import type { Talk } from "@/lib/talk";
import type { Rec } from "@/lib/records";
import type { Note } from "@/lib/content";
import CopyNotes from "./CopyNotes";
import EntityLink, { EntityHref } from "./EntityLink";
import Person from "./Person";
import Laurel, { type Tone } from "./Laurel";
import { Linked } from "@/lib/linkify";


/** The few record-book entries that are honours get a laurel: wins/streaks gold, poles red, fastest laps purple. */
const honour = (label: string): Tone | null =>
  /连胜|赢得最多|胜场最多|统治力/.test(label) ? "gold" : /杆位最多/.test(label) ? "red" : /最快圈/.test(label) ? "purple" : null;

/** Character-bigram overlap; used to drop computed points that a curated note already says. */
function similar(a: string, b: string) {
  const grams = (t: string) => { const g = new Set<string>(); const x = t.replace(/\s|[，。、：；·（）()]/g, ""); for (let i = 0; i < x.length - 1; i++) g.add(x.slice(i, i + 2)); return g; };
  const A = grams(a), B = grams(b);
  let inter = 0; for (const g of A) if (B.has(g)) inter++;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

/** A computed point is redundant if a curated note already carries its key numbers (or reads almost the same). */
function covered(a: { title: string; tag?: string }, n: { title: string; text: string; tag?: string }) {
  const hay = n.title + n.text;
  if (similar(hay, a.title) >= 0.5) return true;
  // same kind of fact about the same person (e.g. "胜场王：塞巴斯蒂安·维特尔 5 胜" vs "维特尔五胜仍是纪录")
  const surname = a.title.match(/·([\u4e00-\u9fa5]{2,4})/)?.[1];
  if (surname && (a as any).tag === (n as any).tag && n.title.includes(surname)) return true;
  const nums = (a.title.match(/\d+(\.\d+)?/g) ?? []).filter((x) => +x >= 10);
  const sameTopic = /排位|队友|队内/.test(a.title) ? /排位|队友|队内/.test(hay) : true;
  return nums.length > 0 && nums.every((x) => hay.includes(x)) && sameTopic && similar(hay, a.title) >= 0.15;
}

const ORDER = ["最近一次", "故事线", "下一站", "现役", "里程碑", "纪录", "数字", "冷知识"];

/** On-air crib sheet: curated, web-verified notes first, then numbers computed from F1DB. */
export default function TalkingPoints({ auto, notes = [], title = "解说要点", subject, limit, more, records, skip, year, skipRace }: {
  auto: Talk[]; notes?: Note[]; title?: string; subject: string; limit?: number; more?: { href: string; label: string }; records?: Rec[];
  /** Entity id of the page's own subject, so prose doesn't link back to the page it is on. */
  skip?: string;
  /** the page's year context: names open their ?year= slice, a bare "XX大奖赛" that year's race (lib/linkify) */
  year?: number | null;
  /** "YYYY/R" of the page's own race (race / brief pages) */
  skipRace?: string;
}) {
  const items = [
    ...notes.map((n) => ({ ...n, curated: true as const })),
    ...auto.filter((a) => !notes.some((n) => covered(a, n) || (/队内对比/.test(a.title) && /排位.{0,6}\d+比\d+/.test(n.title + n.text)))).map((a) => ({ ...a, curated: false as const })),
  ].sort((a, b) => ORDER.indexOf(a.tag) - ORDER.indexOf(b.tag)).slice(0, limit ?? 99);
  if (!items.length) return null;
  const plain = items.map((i) => `【${i.tag}】${i.title}：${i.text}`).join("\n") + (records?.length ? "\n【纪录簿】" + records.map((r) => `${r.label}：${r.value}${r.who ? "（" + r.who + "）" : ""}${r.when ? " " + r.when : ""}`).join("；") : "");
  return (
    <section className={s.band}>
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
            const src = it.curated ? (it as Note).sources[0] : null;
            // a curated note carries its own year: its names and a bare "XX大奖赛" resolve against it
            const ty = (it.curated ? (it as Note).year : null) ?? year;
            // title links to the detail (if any); the prose stays free to carry its own entity links
            return (
              <li key={i} className={lead ? s.lead : s.item}>
                <span className={s.tag}>{it.tag}</span>
                <h3>{href ? <EntityHref href={href} className={s.itemLink}>{it.title}<Icon name="chevron-right" size={18} style={{ verticalAlign: "-3px" }} /></EntityHref> : <Linked text={it.title} skip={skip} skipRace={skipRace} year={ty} />}</h3>
                <p><Linked text={it.text} skip={skip} skipRace={skipRace} year={ty} />{src && <> <a className={s.srcLink} href={src.url} target="_blank" rel="noreferrer" title={src.label}>来源</a></>}</p>
              </li>
            );
          };
          const [first, ...rest] = items;
          const shown = rest.slice(0, 6), hidden = rest.slice(6);
          return (
            <div className={s.layout}>
              <ol className={s.leadCol}>{render(first, 0, true)}</ol>
              <div>
                <ol className={s.grid}>{shown.map((it, i) => render(it, i + 1))}</ol>
                {hidden.length > 0 && (
                  <details className={s.more2}>
                    <summary>展开其余 {hidden.length} 条</summary>
                    <ol className={s.grid}>{hidden.map((it, i) => render(it, i + 7))}</ol>
                  </details>
                )}
              </div>
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
