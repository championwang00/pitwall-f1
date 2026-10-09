"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./shell.module.css";

type Item = { kind: "driver" | "team" | "circuit" | "car" | "year"; id: string; title: string; zh?: string; meta: string; score?: number; href: string };
let INDEX: Item[] | null = null;

const KIND_ZH: Record<Item["kind"], string> = { driver: "车手", team: "车队", circuit: "赛道", car: "赛车", year: "赛季" };
const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function CommandK({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[] | null>(INDEX);
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    if (!INDEX) fetch("/api/search").then((r) => r.json()).then((d) => { INDEX = d; setItems(d); });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!items) return [];
    const t = norm(q.trim());
    if (!t) return items.filter((i) => i.score && i.score > 1000).slice(0, 12);
    const out: Item[] = [];
    for (const i of items) {
      const hay = norm(i.title) + " " + (i.zh ?? "") + " " + i.id;
      const idx = hay.indexOf(t);
      if (idx < 0) continue;
      out.push({ ...i, score: (i.score ?? 0) + (idx === 0 ? 5000 : 0) + (norm(i.title).split(" ").some((w) => w.startsWith(t)) ? 3000 : 0) });
    }
    return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 30);
  }, [q, items]);

  useEffect(() => setSel(0), [q]);

  const go = (i: Item) => { onClose(); router.push(i.href); };

  return (
    <div className={s.kOverlay} onClick={onClose}>
      <div className={s.k} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="搜索">
        <input
          ref={input}
          className={s.kInput}
          placeholder="车手、车队、赛道、赛车或年份，例如：塞纳、Monza、2008、MP4/4"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(x + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(x - 1, 0)); }
            if (e.key === "Enter" && results[sel]) go(results[sel]);
          }}
        />
        <ul className={s.kList}>
          {!items && <li className={s.kEmpty}>正在载入索引…</li>}
          {items && results.length === 0 && <li className={s.kEmpty}>没有匹配结果</li>}
          {results.map((r, i) => (
            <li key={r.kind + r.id} className={i === sel ? s.kSel : undefined} onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
              <span className={s.kKind}>{KIND_ZH[r.kind]}</span>
              <span className={s.kTitle}>{r.zh && <b>{r.zh}</b>}<span className="lat">{r.title}</span></span>
              <span className={s.kMeta}>{r.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
