"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { hrefOf, type Kind } from "./EntityLink";
import s from "./hover.module.css";

type Preview = {
  href: string; title: string; latin: string | null; image: string | null; imageKind: "bust" | "photo" | "logo" | "crest" | "outline" | "map" | "car" | null;
  color: string | null; flag: string | null; meta: string; stats: { k: string; v: string | number }[]; blurb: string | null;
  /** `meta` split into parts; a part with `href` is a link (team, years, champion…) */
  metaParts?: { t: string; href?: string }[]; blurbHref?: string | null;
  /** race: podium rows (finished) / race start ISO (not yet run) */
  podium?: { pos: number; id: string; name: string; team: string | null; color: string; face: string; href: string }[];
  when?: string | null;
};

const fmtWhen = (iso: string) => new Date(iso).toLocaleString("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

const cache = new Map<string, Promise<Preview | null>>();
const load = (kind: string, id: string, year?: number) => {
  const k = kind + "/" + id + (year ? `@${year}` : "");
  if (!cache.has(k)) cache.set(k, fetch(`/api/preview/${kind}/${id}${year ? `?year=${year}` : ""}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(k)!;
};

/** One listener for the whole page: shows the entity hover card for any `a[data-entity]` (see EntityLink). */
export default function HoverLayer() {
  const [card, setCard] = useState<{ p: Preview | null; x: number; y: number; up: boolean; href: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shut = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cur = useRef<Element | null>(null);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const close = () => { if (timer.current) clearTimeout(timer.current); if (shut.current) clearTimeout(shut.current); cur.current = null; setCard(null); };
    // the card is interactive (its title and meta are links): leaving the link waits a moment so the pointer can
    // cross the 8px gap into the card; leaving the card closes it
    const later = () => { if (shut.current) clearTimeout(shut.current); shut.current = setTimeout(close, 180); };
    const keep = () => { if (shut.current) clearTimeout(shut.current); shut.current = null; };
    const open = (a: HTMLAnchorElement) => {
      if (a === cur.current) { keep(); return; }
      // another link to the SAME entity (a tile's face → its name, a card's name → its avatar): hand the open card over
      // instead of closing and re-opening it (no flicker between neighbouring / nested links)
      const c = cur.current as HTMLAnchorElement | null;
      if (c && c.dataset.entity === a.dataset.entity && c.dataset.eid === a.dataset.eid && (c.dataset.year ?? "") === (a.dataset.year ?? "") && a.dataset.preview !== "0") {
        cur.current = a; keep(); return;
      }
      close();
      const kind = a.dataset.entity as Kind, id = a.dataset.eid;
      if (!kind || !id || a.dataset.preview === "0") return;
      // a picture of the thing (3D track, car, portrait, logo) already shows it: a card about it would only repeat it
      // (user: 怎么 hover 地图还出现地图介绍) — the click still opens the page
      if (a.classList.contains("pic-link") || a.querySelector("canvas")) return;
      const path = location.pathname, target = new URL(a.href).pathname;
      if (target === path || (kind !== "year" && path.startsWith(hrefOf(kind, id) + "/"))) return; // never preview the page you're on
      // …nor the page's own subject under another id (the hero declares them: circuit@2026 = race 2026-17)
      const own = (document.querySelector("[data-page-subject]") as HTMLElement | null)?.dataset.pageSubject?.split(" ") ?? [];
      if (own.includes(`${kind}:${id}`)) return;
      cur.current = a;
      timer.current = setTimeout(async () => {
        const r = a.getBoundingClientRect();
        const up = r.bottom + 300 > window.innerHeight && r.top > 320;
        const x = Math.min(Math.max(12, r.left), window.innerWidth - 340);
        // the title goes where the hovered link goes (incl. its ?year= slice) — unless that link points elsewhere
        // (a year link to one race of that year): then to the entity itself
        const u = new URL(a.href);
        const href = u.pathname.startsWith(hrefOf(kind, id)) ? u.pathname + u.search : hrefOf(kind, id);
        setCard({ p: null, x, y: up ? r.top - 8 : r.bottom + 8, up, href });
        const p = await load(kind, id, Number(a.dataset.year || u.searchParams.get("year")) || undefined);
        const now = cur.current as HTMLAnchorElement | null; // may have been handed over to a same-entity link
        if (now && now.dataset.entity === kind && now.dataset.eid === id) setCard((c) => (c ? { ...c, p } : c));
      }, 280);
    };
    const inCard = (el: EventTarget | null) => !!(el && box.current?.contains(el as Node));
    const over = (e: Event) => {
      if (inCard(e.target)) { keep(); return; }
      const a = (e.target as Element)?.closest?.("a[data-entity]") as HTMLAnchorElement | null;
      if (a) open(a);
    };
    const out = (e: MouseEvent | FocusEvent) => {
      if (!cur.current) return;
      const rel = e.relatedTarget as Element | null;
      if (inCard(rel) || rel?.closest?.("a[data-entity]") === cur.current) return;
      if (e.type === "focusout" && !rel) { close(); return; }
      later();
    };
    const down = (e: PointerEvent) => { if (!inCard(e.target)) close(); };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("focusin", over);
    document.addEventListener("focusout", out);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("pointerdown", down);
    return () => {
      document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out);
      document.removeEventListener("focusin", over); document.removeEventListener("focusout", out);
      window.removeEventListener("scroll", close); window.removeEventListener("pointerdown", down);
    };
  }, []);

  if (!card) return null;
  return createPortal(
    <div ref={box} className={`${s.card} ${card.up ? s.up : ""}`} style={{ left: card.x, top: card.y, ["--c" as any]: card.p?.color ?? "#15151e" }} role="tooltip">
      {!card.p ? <div className={s.loading} /> : (
        <>
          <div className={s.top}>
            {card.p.image && <img className={`${s.img} ${s[card.p.imageKind ?? "photo"]}`} src={card.p.image} alt="" />}
            <div className={s.names}>
              <Link href={card.href} className={s.title}><b>{card.p.title}</b></Link>
              {card.p.latin && <span>{card.p.latin}</span>}
              <em>{card.p.flag && <img src={card.p.flag} alt="" />}{card.p.metaParts
                ? card.p.metaParts.map((x, i) => x.href ? <Link key={i} href={x.href} className={s.metaLink}>{x.t}</Link> : <span key={i}>{x.t}</span>)
                : card.p.meta}</em>
            </div>
          </div>
          {card.p.podium && card.p.podium.length > 0 && (
            <ol className={s.podium}>
              {card.p.podium.map((x) => (
                <li key={x.id}>
                  <b className={s.pos}>{x.pos}</b>
                  <img src={x.face} alt="" style={{ background: x.color }} />
                  <Link href={x.href} className={s.metaLink}>{x.name}</Link>
                  {x.team && <span>{x.team}</span>}
                </li>
              ))}
            </ol>
          )}
          {card.p.when && <p className={s.when}><span>正赛</span><time dateTime={card.p.when}>{fmtWhen(card.p.when)}</time><span>（本地时间）</span></p>}
          {card.p.blurb && <p className={s.blurb}>{card.p.blurbHref ? <Link href={card.p.blurbHref} className={s.blurbLink}>{card.p.blurb}</Link> : card.p.blurb}</p>}
          {card.p.stats.length > 0 && <dl className={s.stats}>
            {card.p.stats.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}
          </dl>}
        </>
      )}
    </div>,
    document.body,
  );
}
