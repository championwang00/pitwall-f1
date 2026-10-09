"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { hrefOf, type Kind } from "./EntityLink";
import s from "./hover.module.css";

type Preview = {
  href: string; title: string; latin: string | null; image: string | null; imageKind: "bust" | "photo" | "logo" | "crest" | "outline" | "map" | null;
  color: string | null; flag: string | null; meta: string; stats: { k: string; v: string | number }[]; blurb: string | null;
};

const cache = new Map<string, Promise<Preview | null>>();
const load = (kind: string, id: string) => {
  const k = kind + "/" + id;
  if (!cache.has(k)) cache.set(k, fetch(`/api/preview/${kind}/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(k)!;
};

/** One listener for the whole page: shows the entity hover card for any `a[data-entity]` (see EntityLink). */
export default function HoverLayer() {
  const [card, setCard] = useState<{ p: Preview | null; x: number; y: number; up: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cur = useRef<Element | null>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const close = () => { if (timer.current) clearTimeout(timer.current); cur.current = null; setCard(null); };
    const open = (a: HTMLAnchorElement) => {
      if (a === cur.current) return;
      close();
      const kind = a.dataset.entity as Kind, id = a.dataset.eid;
      if (!kind || !id || a.dataset.preview === "0") return;
      const path = location.pathname, target = new URL(a.href).pathname;
      if (target === path || (kind !== "year" && path.startsWith(hrefOf(kind, id) + "/"))) return; // never preview the page you're on
      cur.current = a;
      timer.current = setTimeout(async () => {
        const r = a.getBoundingClientRect();
        const up = r.bottom + 300 > window.innerHeight && r.top > 320;
        const x = Math.min(Math.max(12, r.left), window.innerWidth - 340);
        setCard({ p: null, x, y: up ? r.top - 8 : r.bottom + 8, up });
        const p = await load(kind, id);
        if (cur.current === a) setCard((c) => (c ? { ...c, p } : c));
      }, 280);
    };
    const over = (e: Event) => { const a = (e.target as Element)?.closest?.("a[data-entity]") as HTMLAnchorElement | null; if (a) open(a); };
    const out = (e: MouseEvent | FocusEvent) => {
      const to = (e.relatedTarget as Element | null)?.closest?.("a[data-entity]");
      if (cur.current && to !== cur.current) close();
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    document.addEventListener("focusin", over);
    document.addEventListener("focusout", out);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("mouseover", over); document.removeEventListener("mouseout", out);
      document.removeEventListener("focusin", over); document.removeEventListener("focusout", out);
      window.removeEventListener("scroll", close); window.removeEventListener("pointerdown", close);
    };
  }, []);

  if (!card) return null;
  return createPortal(
    <div className={`${s.card} ${card.up ? s.up : ""}`} style={{ left: card.x, top: card.y, ["--c" as any]: card.p?.color ?? "#15151e" }} role="tooltip">
      {!card.p ? <div className={s.loading} /> : (
        <>
          <div className={s.top}>
            {card.p.image && <img className={`${s.img} ${s[card.p.imageKind ?? "photo"]}`} src={card.p.image} alt="" />}
            <div className={s.names}>
              <b>{card.p.title}</b>
              {card.p.latin && <span>{card.p.latin}</span>}
              <em>{card.p.flag && <img src={card.p.flag} alt="" />}{card.p.meta}</em>
            </div>
          </div>
          {card.p.blurb && <p className={s.blurb}>{card.p.blurb}</p>}
          <dl className={s.stats}>
            {card.p.stats.map((x) => <div key={x.k}><dd>{x.v}</dd><dt>{x.k}</dt></div>)}
          </dl>
        </>
      )}
    </div>,
    document.body,
  );
}
