"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import s from "./compare.module.css";

type D = { id: string; title: string; zh?: string; meta: string; kind: string };
const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Picker({ a, b, side }: { a: string; b: string; side: "a" | "b" }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<D[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => { if (open && !all.length) fetch("/api/search").then((r) => r.json()).then((d) => setAll(d.filter((x: D) => x.kind === "driver"))); }, [open, all.length]);
  const res = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    return all.filter((d) => norm(d.title).includes(t) || (d.zh ?? "").includes(q.trim())).slice(0, 8);
  }, [q, all]);
  return (
    <div className={s.picker}>
      <Icon name="search" size={16} className={s.pickIcon} />
      <input value={q} onFocus={() => setOpen(true)} onChange={(e) => setQ(e.target.value)} placeholder="换一位车手…" className={s.pick} />
      {res.length > 0 && (
        <ul className={s.pickList}>
          {res.map((d) => (
            <li key={d.id}><button onClick={() => { setQ(""); router.push(`/compare?a=${side === "a" ? d.id : a}&b=${side === "b" ? d.id : b}`); }}>
              <b>{d.zh ?? d.title}</b><span><span className="lat">{d.zh ? d.title : ""}</span> · {d.meta}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
