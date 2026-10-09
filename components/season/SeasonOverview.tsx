import Link from "next/link";
import s from "./overview.module.css";
import { bilingual } from "@/lib/wiki";
import { notes } from "@/lib/content";
import { eraOf } from "@/lib/eras";
import { Linked } from "@/lib/linkify";
import { all } from "@/lib/db";
import { zhName } from "@/lib/zh";
import { gpZh } from "@/lib/names";

/** A factual one-paragraph summary from F1DB — always available, even when Wikipedia is slow or missing. */
function factSummary(year: number) {
  const st = all<any>(`select s.driver_id id, d.name, s.points, s.position_number pos, s.championship_won champ,
      (select count(*) from race_result rr join race r on r.id = rr.race_id where r.year = ? and rr.driver_id = s.driver_id and rr.position_number = 1) wins
    from season_driver_standing s join driver d on d.id = s.driver_id where s.year = ? order by s.position_display_order limit 3`, year, year);
  const ct = all<any>("select constructor_id id, points from season_constructor_standing where year = ? and position_number = 1", year)[0];
  const races = all<any>("select count(*) n, count(distinct (select driver_id from race_result where race_id = race.id and position_number = 1)) w from race where year = ?", year)[0];
  const done = all<any>("select count(*) n from race r where r.year = ? and exists (select 1 from race_result rr where rr.race_id = r.id)", year)[0].n;
  const last = all<any>("select grand_prix_id gp from race where year = ? order by round desc limit 1", year)[0];
  const nm = (id: string, n: string) => zhName.driver(id) ?? n;
  if (!st.length) return null;
  const [a, b] = st;
  const live = !a.champ;
  const gap = b ? Math.round((a.points - b.points) * 10) / 10 : null;
  const parts: string[] = [];
  parts.push(`${year}赛季共${races.n}站${live ? `，已赛${done}站` : ""}，${races.w}位车手赢得过分站。`);
  if (live) parts.push(`${nm(a.id, a.name)}以${a.points}分领跑积分榜${b ? `，领先${nm(b.id, b.name)}${gap}分` : ""}。`);
  else parts.push(`${nm(a.id, a.name)}以${a.points}分、${a.wins}场分站胜利夺得车手世界冠军${b ? `，${gap! <= 3 ? "仅" : ""}领先亚军${nm(b.id, b.name)}${gap}分` : ""}${last && gap! <= 3 ? `，悬念一直保持到收官的${gpZh(last.gp)}` : ""}。`);
  if (ct) parts.push(`${zhName.team(ct.id) ?? ct.id}${live ? "目前领跑" : "夺得"}车队锦标赛（${ct.points}分）。`);
  return parts.join("");
}

/**
 * 赛季综述 — the first thing a year says about itself (user: 点了每一年，首先要对这个赛季做一个总的介绍):
 * the season in one paragraph (Chinese Wikipedia, English fallback), the 2–3 storylines that defined it, and its era.
 */
export default async function SeasonOverview({ year }: { year: number }) {
  const wiki = await Promise.race([
    bilingual(`${year} Formula One World Championship`).catch(() => ({ en: null, zh: null })),
    new Promise<{ en: null; zh: null }>((r) => setTimeout(() => r({ en: null, zh: null }), 2500)),
  ]);
  const text = wiki.zh?.extract ?? wiki.en?.extract ?? null;
  const facts = factSummary(year);
  const story = notes.season(year).slice(0, 3);
  const era = eraOf(year);
  if (!text && !facts && !story.length) return null;
  return (
    <section className={s.wrap} aria-label={`${year} 赛季综述`}>
      <div className={s.in}>
        <div className={s.lead}>
          <p className={s.kicker}>Season Overview</p>
          {facts && <p className={s.facts}><Linked text={facts} /></p>}
          {text && <p className={s.text} lang={wiki.zh ? "zh" : "en"}><Linked text={text} /></p>}
          <p className={s.meta}>
            {era && <>所属时代 <Link href={`/eras/${era.id}`} className="ilink">{era.title}</Link></>}
            {(wiki.zh ?? wiki.en)?.content_urls && <> · 来源 <a href={(wiki.zh ?? wiki.en)!.content_urls!.desktop.page} target="_blank" rel="noreferrer" className="ilink">维基百科</a></>}
          </p>
        </div>
        {story.length > 0 && (
          <ol className={s.story}>
            {story.map((n, i) => (
              <li key={i}>
                <b><Linked text={n.title} /></b>
                <p><Linked text={n.text} /></p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
