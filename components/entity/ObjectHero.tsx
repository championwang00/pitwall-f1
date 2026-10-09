import { Fragment } from "react";
import Link from "next/link";
import type { HeroModel } from "@/lib/hero";
import Breadcrumb from "@/components/shell/Breadcrumb";
import EraSpan from "@/components/unit/EraSpan";
import { StatRow } from "./Moments";
import HeroField from "./HeroField";
import Icon from "@/components/ui/Icon";
import { Linked } from "@/lib/linkify";
import ConnectionLine, { Chips } from "./ConnectionLine";
import HeroTiles from "./HeroTiles";
import o from "./objecthero.module.css";

/**
 * The first block of every object page (IA spec v6 §0.6): ONE component, ten slots in a fixed order —
 * ① breadcrumb ② eyebrow ③ display ④ cx ⑤ meta (⑤b lineage) ⑥ tagline ⑦ connection L1/L2 ⑧ eras ⑨ laurels (⑨b actions)
 * ⑩ stats — and the visual on the right. A slot without data renders nothing. Two surfaces: `bleed` (full-width
 * identity-colour block) and `card` (radius-8 card on the paper page: season / era). What changes between objects is
 * only what fills the slots (lib/hero.ts), never their order or style.
 *
 * Hover (§0.6.6): the title and the visual never preview (they ARE the subject); every chip in the lines does.
 */
/** The colour a hero tile actually sits on (the surface darkened by the hero + the tile's own black veil), for the logo
 *  contrast check in /api/logo. Light card → paper. */
function tileSurface(m: HeroModel, light: boolean): string {
  if (light) return "f4f2f0";
  const hex = /^#?([0-9a-f]{6})/i.exec(m.color ?? "")?.[1] ?? "15151e";
  // card = .f1-surface (team colour mixed 46 % into black) under the tile's 22 % black veil ≈ 0.36 of the colour;
  // drs hero ≈ 0.43 (measured); halftone / carbon heroes ≈ 0.46 + the tile's 8 % white lift
  const k = m.surface === "card" ? 0.36 : (m.texture ?? "halftone") === "drs" ? 0.43 : 0.46;
  const lift = m.surface !== "card" && (m.texture ?? "halftone") !== "drs" ? 0.08 * 255 : 0;
  const n = parseInt(hex, 16);
  return [16, 8, 0].map((sh) => Math.round(Math.min(255, ((n >> sh) & 255) * k * (lift ? 0.92 : 1) + lift)).toString(16).padStart(2, "0")).join("");
}

export default function ObjectHero({ model: m, visual, after, children }: {
  model: HeroModel;
  /** ⑩ visual (overrides model.visual): portrait / car / 3D track / winner panel / period photo */
  visual?: React.ReactNode;
  /** rendered last inside the block (the circuit's 3D note) */
  after?: React.ReactNode;
  /** extra content at the end of the text column (rare: notes under the stats) */
  children?: React.ReactNode;
}) {
  const vis = visual ?? m.visual;
  const light = m.surface === "card" && m.tone === "light";
  const d = m.display;

  const title = d.variant === "person" ? (
    <h1 className={o.h1}>
      {d.first && <span className={o.first}>{d.first}</span>}
      <span className={`${o.last} ${o.fit}`} style={{ ["--n" as any]: d.last.length, fontSize: d.size }}>{d.last}</span>
    </h1>
  ) : d.variant === "race" ? (
    <h1 className={o.raceTitle}>
      <span className={o.raceYear}>{d.first}</span>
      <span className={o.raceGp}>{d.last}</span>
    </h1>
  ) : d.variant === "numeral" ? (
    <h1 className={o.numeral}>{d.last}</h1>
  ) : d.variant === "cn" ? (
    <h1 className={o.cnTitle}>{d.last}</h1>
  ) : d.logo ? (
    <div className={o.logoRow}>
      <span className={o.logo}><img src={d.logo} alt="" /></span>
      <h1 className={o.h1}><span className={o.last} style={{ fontSize: d.size, marginTop: 0 }}>{d.last}</span></h1>
    </div>
  ) : (
    <h1 className={o.h1}><span className={o.last} style={{ fontSize: d.size, marginTop: 0 }}>{d.last}</span></h1>
  );

  const slots = (
    <>
      {m.crumbs.length > 0 && <Breadcrumb flush items={m.crumbs} />}
      {m.eyebrow && <p className={o.eyebrow}>{m.eyebrow}</p>}
      {title}
      {m.cx && (m.cxStyle === "latin" ? <p className={o.cxLatin}>{m.cx}</p> : m.cxStyle === "official" ? <p className={o.cxOfficial}>{m.cx}</p> : <p className="cx">{m.cx}</p>)}
      {m.meta.length > 0 && (
        <p className="meta-line">
          <Chips chips={m.meta.filter((c) => c.kind === "flag")} meta light={light} />
          <span><Chips chips={m.meta.filter((c) => c.kind !== "flag")} meta light={light} /></span>
        </p>
      )}
      {m.lineage && m.lineage.length > 1 && (
        <p className={o.lineage}>
          {m.lineage.map((l, i) => (
            <span key={i}>
              {i > 0 && <Icon name="chevron-right" size={16} className={o.arrow} />}
              <Chips chips={l} light={light} />
            </span>
          ))}
        </p>
      )}
      {m.head && m.head.length > 0 && <p className={`${o.line} ${o.head}`} data-hero-line="head"><Chips chips={m.head} light={light} /></p>}
      <HeroTiles tiles={m.tiles} surface={tileSurface(m, light)} subject={{ kind: m.kind === "season" ? "year" : m.kind, id: m.kind === "race" ? String(m.id).replace("/", "-") : String(m.id) }} />
      {m.tagline && <p className={o.tagline}><Linked text={m.tagline} skip={m.skip ?? m.id} /></p>}
      {m.traits && <p className={o.traits}><Linked text={m.traits} skip={m.skip ?? m.id} /></p>}
      <ConnectionLine lines={m.connection} light={light} />
      {m.eraYears.length > 0 && <EraSpan years={m.eraYears} />}
      {m.laurels.length > 0 && <div className={o.laurels}>{m.laurels.map((l, i) => <Fragment key={i}>{l}</Fragment>)}</div>}
      {m.actions && m.actions.length > 0 && (
        <p className={o.actions}>
          {m.actions.map((a) => (
            <Link key={a.href} href={a.href} className={`btn ${a.tone === "red" ? "btn-red" : "btn-line"}`}>{a.icon && <Icon name={a.icon as any} size={16} />}{a.label}</Link>
          ))}
        </p>
      )}
    </>
  );

  if (m.surface === "card") {
    return (
      <div className={`${o.card} ${light ? o.light : "f1-surface"}`} style={light ? undefined : { ["--c" as any]: m.color }} data-surface={light ? undefined : ""} data-hero={m.kind} data-page-subject={[`${m.kind}:${m.id}`, ...(m.aliases ?? [])].join(" ")}>
        <div className={o.cardText}>
          {slots}
          {m.stats.length > 0 && (
            <dl className={o.cardStats}>
              {m.stats.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}{x.sub && <span>{x.sub}</span>}</dt></div>)}
            </dl>
          )}
          {children}
        </div>
        {vis}
      </div>
    );
  }

  const tex = m.texture ?? "halftone";
  const vk = m.visualKind ?? "portrait";
  const sectionCls = [o.hero, tex === "drs" ? `f1-surface team-drs ${o.drs}` : "", tex === "carbon" ? o.carbon : ""].join(" ");
  const inCls = [o.in, vk === "backdrop" ? o.backdropIn : "", vk === "stage" ? o.stageIn : ""].join(" ");
  const stats = m.stats.length > 0 ? <StatRow items={m.stats} /> : null;
  return (
    <section className={sectionCls} data-surface data-hero={m.kind} data-page-subject={[`${m.kind}:${m.id}`, ...(m.aliases ?? [])].join(" ")} style={{ ["--surface" as any]: m.color, ["--c" as any]: m.color }}>
      {tex === "halftone" && <div className={o.bg}><HeroField color={m.color} /></div>}
      {tex === "photo" && m.photo && <div className={o.photoBg} style={{ backgroundImage: `url(${m.photo})` }} />}
      <div className={inCls}>
        <div className={o.text} data-hero-text="">
          <div>{slots}</div>
          {stats && (vk === "backdrop" ? <div className={o.statsWrap}>{stats}</div> : stats)}
          {children}
        </div>
        {vk !== "backdrop" && vis && <div className={`${vk === "portrait" ? o.portrait : vk === "car" ? o.car : vk === "logo" ? o.logoVis : vk === "panel" ? o.panel : o.stage} img-slot`}>{vis}</div>}
      </div>
      {/* after the text column in the DOM so its controls (corner pins, §0.9.3 ⑥) follow the text in the Tab order;
          painted under it (.backdropIn z 2) and moved back above it on narrow screens (CSS order) */}
      {vk === "backdrop" && vis && <div className={o.backdrop}>{vis}</div>}
      {after}
    </section>
  );
}
