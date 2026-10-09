import Link from "next/link";
import { eraOf } from "@/lib/eras";
import u from "./unit.module.css";

/** The eras a set of seasons touches, oldest first (each year counts for its narrowest era, as on the rail). */
export function erasSpanned(years: number[]) {
  const seen = new Map<string, { id: string; title: string; from: number }>();
  for (const y of [...years].sort((a, b) => a - b)) {
    const e = eraOf(y);
    if (e && !seen.has(e.id)) seen.set(e.id, { id: e.id, title: e.title, from: y });
  }
  return [...seen.values()];
}

/** Hero line on unit pages (spec §4): 「横跨 N 个时代：V8 · 混动 · 地面效应回归」, each era → /eras/[id]. */
export default function EraSpan({ years, className }: { years: number[]; className?: string }) {
  const es = erasSpanned(years);
  if (!es.length) return null;
  return (
    <p className={`${u.eras} ${className ?? ""}`}>
      <b>{es.length > 1 ? `横跨 ${es.length} 个时代` : "所属时代"}</b>
      {es.map((e, i) => (
        <span key={e.id}><Link href={`/eras/${e.id}`}>{e.title}</Link>{i < es.length - 1 && <i>·</i>}</span>
      ))}
    </p>
  );
}
