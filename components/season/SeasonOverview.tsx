import s from "./overview.module.css";
import { bilingualFast } from "@/lib/wiki";
import { Linked } from "@/lib/linkify";

/**
 * 赛季综述 — the first thing a year says about itself (user: 点了每一年，首先要对这个赛季做一个总的介绍):
 * the season in one paragraph (Chinese Wikipedia, English fallback) and its source. The F1DB fact paragraph, the
 * storylines and 所属时代 are gone — the card's tiles, the 解说要点 and the card's 所属时代 already say them (spec §0.8.7).
 */
export default async function SeasonOverview({ year }: { year: number }) {
  const wiki = await bilingualFast(`${year} Formula One World Championship`);
  const text = wiki.zh?.extract ?? wiki.en?.extract ?? null;
  if (!text) return null;
  return (
    <section className={s.wrap} aria-label={`${year} 赛季综述`}>
      <div className={s.in}>
        <div className={s.lead}>
          <p className={s.kicker}>Season Overview</p>
          {text && <p className={s.text} lang={wiki.zh ? "zh" : "en"}><Linked text={text} year={year} /></p>}
          <p className={s.meta}>
            {(wiki.zh ?? wiki.en)?.content_urls && <>来源 <a href={(wiki.zh ?? wiki.en)!.content_urls!.desktop.page} target="_blank" rel="noreferrer" className="ilink">维基百科</a></>}
          </p>
        </div>
      </div>
    </section>
  );
}
