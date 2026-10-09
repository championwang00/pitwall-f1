import { Fragment } from "react";
import Link from "next/link";
import EntityLink, { EntityHref } from "./EntityLink";
import { MiniLaurel } from "./Laurel";
import { trackOutline, flag } from "@/lib/assets";
import type { Tile, TilePic, TilePerson } from "@/lib/hero";
import o from "./objecthero.module.css";

const href = (p: TilePerson) => `/drivers/${p.id}${p.year ? `?year=${p.year}` : ""}`;
const face = (p: TilePerson, size: number) => (
  <img className={o.tFace} src={`/api/face/${p.id}?v=4&s=${size * 2}${p.year ? `&year=${p.year}` : ""}`} alt="" loading="lazy"
    width={size} height={size} style={{ width: size, height: size, background: p.color ?? undefined }} />
);

// teammates have no hierarchy: everyone in the tile gets the same face size (user: 车手是没有主次的)
const faceSize = (n: number) => (n <= 1 ? 52 : n === 2 ? 48 : n === 3 ? 40 : 32);

/** /api/logo decides colour vs mono by contrast against the surface it is drawn on: hand it the tile's real colour */
const onSurface = (url: string, surface?: string | null) => {
  if (!surface || !url.startsWith("/api/logo/")) return url;
  const bg = surface.replace(/^#/, "");
  return /[?&]bg=/.test(url) ? url.replace(/([?&])bg=[0-9a-f]+/i, `$1bg=${bg}`) : `${url}${url.includes("?") ? "&" : "?"}bg=${bg}`;
};

/** The hero's own subject: the only entity whose tile / face / logo does NOT pop its card (user: 你在其中一个维度，另外几个
 *  维度的信息合围上去都应该能够看到). */
type Subject = { kind: string; id: string } | null | undefined;
const isSubject = (subject: Subject, kind: string, id: string) => !!subject && subject.kind === kind && subject.id === id;

function Pic({ pic, linked, surface, subject }: { pic: TilePic; linked?: boolean; surface?: string | null; subject?: Subject }) {
  switch (pic.kind) {
    case "faces": {
      const sz = faceSize(pic.people.length);
      return (
        <span className={o.tFaces}>
          {pic.people.map((p) => linked
            ? <EntityLink key={p.id} kind="driver" id={p.id} href={href(p)} preview={!isSubject(subject, "driver", p.id)}>{face(p, sz)}</EntityLink>
            : <Fragment key={p.id}>{face(p, sz)}</Fragment>)}
        </span>
      );
    }
    case "logo":
      return <img className={o.tLogo} src={onSurface(pic.url, surface)} alt="" loading="lazy" />;
    case "car":
      return (
        <span className={o.tCarBox}>
          <img className={pic.fit === "photo" ? o.tPhoto : o.tCar} src={pic.url} alt="" loading="lazy" data-img-status={pic.fit === "placeholder" ? "placeholder" : pic.caption ? "representative" : "exact"} />
          {pic.caption && <span className={o.tCap}>{pic.caption}</span>}
        </span>
      );
    case "outline": {
      const u = pic.url ?? trackOutline(pic.circuit);
      return u ? <img className={pic.url ? o.tLayout : o.tOutline} src={u} alt="" loading="lazy" /> : null;
    }
    case "flag": {
      const f = flag(pic.country);
      return f ? <img className={o.tFlag} src={f} alt="" loading="lazy" /> : null;
    }
    case "laurel":
      return <span className={o.tLaurel}><MiniLaurel h={30} /><b>{pic.top}</b></span>;
  }
}

/**
 * ⑦ the hero's connection slot as 4 visual tiles (user update to IA spec v6): label · picture · name / value.
 * One subject → the whole tile is the link (`.lift`, no hover card: the tile already shows it). Several people / teams →
 * each face, name and logo links on its own (no nested links) and the tile itself stays still (not a target, no .lift). A pure engine supplier is not a link.
 */
/** One subject per tile (user: 车手 1、车手 2，每人一个格子…不够就换行): a tile of several people / teams becomes one tile each,
 *  numbered 「车手 1」「车手 2」; the shared note (共 N 人出赛) stays on the first. The 4-column grid wraps onto new rows. */
function split(tiles: Tile[]): Tile[] {
  return tiles.flatMap((t) => {
    if (t.people && t.people.length > 1) return t.people.map((p, k): Tile => ({
      label: `${t.label} ${k + 1}`, href: href(p), entity: { kind: "driver", id: p.id }, pic: { kind: "faces", people: [p] }, name: p.name, sub: k === 0 ? t.sub : undefined,
    }));
    if (t.teams && t.teams.length > 1) return t.teams.map((x, k): Tile => ({
      label: `${t.label} ${k + 1}`, href: x.href, entity: { kind: "team", id: x.id }, pic: x.url ? { kind: "logo", team: x.id, url: x.url } : undefined, name: x.name, sub: k === 0 ? t.sub : undefined,
    }));
    return [t];
  });
}

export default function HeroTiles({ tiles: given, surface, subject }: { tiles: Tile[]; surface?: string | null; subject?: Subject }) {
  if (!given.length) return null;
  const tiles = split(given);
  return (
    <div className={o.tiles}>
      {tiles.map((t, i) => {
        const subs = t.sub == null ? [] : Array.isArray(t.sub) ? t.sub : [t.sub];
        const body = (inner: boolean) => (
          <>
            <span className={o.tLabel}>{t.label}</span>
            <span className={o.tPic}>{t.pic ? <Pic pic={t.pic} linked={inner} surface={surface} subject={subject} /> : t.big ? <b className={o.tBig}>{t.name}</b> : null}</span>
            {t.people && inner
              ? <span className={o.tName}>{t.people.map((p, k) => <Fragment key={p.id}>{k > 0 && <i> · </i>}<EntityLink kind="driver" id={p.id} href={href(p)} preview={!isSubject(subject, "driver", p.id)} className={o.tLink} title={p.name}>{p.short}</EntityLink></Fragment>)}</span>
              : t.big && !t.pic ? null : <span className={t.big ? o.tBig : o.tName}>{t.name}</span>}
            {subs.map((x, k) => <span key={k} className={o.tSub}>{x}</span>)}
          </>
        );
        const key = t.label + i;
        if (t.teams) return (
          <div key={key} className={o.tile} data-hero-tile={t.label}>
            <span className={o.tLabel}>{t.label}</span>
            <span className={`${o.tPic} ${o.tLogos}`}>
              {t.teams.map((x) => (
                <EntityLink key={x.id} kind="team" id={x.id} href={x.href} preview={!isSubject(subject, "team", x.id)} className={o.tLogoLink} title={x.name}>
                  {x.url ? <img src={x.url} alt={x.name} loading="lazy" /> : <span>{x.short}</span>}
                </EntityLink>
              ))}
            </span>
            <span className={o.tName}>{t.name}</span>
            {(Array.isArray(t.sub) ? t.sub : t.sub ? [t.sub] : []).map((x, k) => <span key={k} className={o.tSub}>{x}</span>)}
          </div>
        );
        if (t.people) return <div key={key} className={o.tile} data-hero-tile={t.label}>{body(true)}</div>;
        if (!t.href) return <div key={key} className={o.tile} data-hero-tile={t.label}>{body(false)}</div>;
        return t.entity
          ? <EntityLink key={key} kind={t.entity.kind} id={t.entity.id} href={t.href} preview={!isSubject(subject, t.entity.kind, t.entity.id)} className={`${o.tile} lift`}><span data-hero-tile={t.label} className={o.tInner}>{body(false)}</span></EntityLink>
          : <EntityHref key={key} href={t.href} className={`${o.tile} lift`}><span data-hero-tile={t.label} className={o.tInner}>{body(false)}</span></EntityHref>;
      })}
    </div>
  );
}
