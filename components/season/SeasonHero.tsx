import y from "@/app/(site)/seasons/[year]/season.module.css";
import { driverBust } from "@/lib/assets";
import EntityLink from "@/components/entity/EntityLink";
import ObjectHero from "@/components/entity/ObjectHero";
import { seasonHero, seasonFace } from "@/lib/hero";
import { driverHeroKnown } from "@/lib/periodFace";

/**
 * The season's identity card (总览 tab only, v5.1) = ObjectHero on the card surface (IA spec v6 §0.6, P0-21): the year
 * numeral, laurels, the 4 tiles (车手冠军 · 车队冠军 · 冠军赛车 · 分站), 所属时代, stats, and the champion / leader
 * portrait from THAT season (§1.5). Only the card's inside changed — it stays where the year hub puts it.
 */
export default async function SeasonHero({ year }: { year: number }) {
  const model = await seasonHero(year);
  const face = seasonFace(year);
  const heroId = face?.id;
  // §1.5: the photo from THAT season (period face), never a later / civilian one
  // that season's photo with its background lifted off (lib/cutout), shown big like the driver hero's cut-out (user:
  // 把背景抠掉…放得足够大，和车手个人介绍那里一样); 2026 = F1's own transparent bust
  const pic = heroId ? (year === 2026 ? { url: driverBust(heroId, 640, 760)!, kind: "cut" as const } : driverHeroKnown(heroId, year)) : null;
  const portrait = pic?.url ?? null;
  return (
    <section className={y.top}>
      <ObjectHero model={model} visual={portrait && heroId ? (
        <figure className={pic?.kind === "cut" ? y.cut : y.photo}>
          {/* the portrait is the champion / leader himself: it opens his season, without a hover card (§0.6.6); no caption —
              the eyebrow and the 车手冠军 tile already name him (spec §0.8.7) */}
          <EntityLink kind="driver" id={heroId} year={year} className="pic-link"><img src={portrait} alt="" /></EntityLink>
        </figure>
      ) : undefined} />
    </section>
  );
}
