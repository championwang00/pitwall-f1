"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useScope, type RailRow } from "./railStore";
import { MiniLaurel } from "@/components/entity/Laurel";
import s from "./rail.module.css";

export type RailYear = { year: number; color: string; champ: string | null; champTeam?: string | null; champCar?: string | null; rounds?: string; live?: boolean };
export type RailEra = { id: string; title: string; from: number; to: number; summary: string; years: RailYear[] };

const TABS = new Set(["calendar", "standings", "circuits", "drivers", "teams"]); // no 时代 / 赛车 tabs (spec §0.8.7 D3)

type Item =
  | { t: "era"; id: string; title: string; from: number; to: number; summary?: string; href?: string; color?: string; dim?: boolean }
  | { t: "year"; year: number }
  | { t: "gap"; a: number; b: number };

/**
 * The site's only time control (spec v4 §1.2; v5: no header block — "where am I" is the top nav + breadcrumb). Two modes:
 * - history tree (no subject): era → year, right-hand label per section (`labels`);
 * - subject timeline (`only`): just the subject's years, grouped by its own phases (team stints / engine partners / layouts),
 *   gaps collapsed to one row, each row = that year's colour · label · sub · laurel.
 * Clicking a year keeps the subject and switches the year.
 */
export default function YearRail({ eras, latest }: { eras: RailEra[]; latest: number }) {
  const path = usePathname();
  const sp = useSearchParams();
  const scope = useScope();
  const spYear = sp.get("year") ? +sp.get("year")! : null;
  const seg = path.match(/^\/(?:seasons|races)\/(\d{4})(?:\/([a-z]+))?/);
  const unit = path.match(/^\/(drivers|teams|circuits)\/[^/]+$/);
  const eraPage = path.match(/^\/eras\/([^/]+)/);
  const subject = !!scope.only;

  const spFrom = sp.get("from") ? +sp.get("from")! : null, spTo = sp.get("to") ? +sp.get("to")! : null;
  const current: number | null =
    spFrom != null && spTo != null && spFrom !== spTo && !spYear ? null
    : scope.current !== undefined ? scope.current
    : seg ? +seg[1]
    : spYear ?? (unit || eraPage || path.startsWith("/cars/") || path === "/seasons" ? null : latest);

  const tab = seg && path.startsWith("/seasons/") && seg[2] && TABS.has(seg[2]) ? `/${seg[2]}` : "";
  const hrefFor = (y: number) => {
    if (scope.map) return scope.map[y] ?? scope.fallback?.replace("{y}", String(y)) ?? `/seasons/${y}`;
    if (scope.pattern) return scope.pattern.replace("{y}", String(y));
    if (seg && path.startsWith("/seasons/")) return `/seasons/${y}${tab}`;
    if (unit) return `${path}?year=${y}`;
    if (path === "/circuits" || path === "/drivers" || path === "/teams" || path === "/cars") return `${path}?year=${y}`;
    return `/seasons/${y}`;
  };

  // history-tree defaults per year (champion colour + the section's label column)
  const base = new Map(eras.flatMap((e) => e.years.map((y) => [y.year, y] as const)));
  const histLabel = (y: RailYear) =>
    scope.labels === "champTeam" ? y.champTeam : scope.labels === "champCar" ? y.champCar : scope.labels === "rounds" ? y.rounds : y.champ;

  // ---- build the item list -------------------------------------------------
  const items: Item[] = [];
  if (subject) {
    const yrs = [...new Set(scope.years ?? [])].sort((a, b) => b - a);
    const groups = (scope.groups ?? []).slice().sort((a, b) => b.from - a.from || b.to - a.to);
    if (groups.length) {
      const used = new Set<number>();
      for (const g of groups) {
        const inG = yrs.filter((y) => y >= g.from && y <= g.to && !used.has(y));
        inG.forEach((y) => used.add(y));
        items.push({ t: "era", id: g.id, title: g.title, from: g.from, to: g.to, href: g.href, color: g.color });
        inG.forEach((y) => items.push({ t: "year", year: y }));
      }
      const rest = yrs.filter((y) => !used.has(y));
      rest.forEach((y) => items.push({ t: "year", year: y }));
    } else {
      // subject without its own phases (compare): eras, but only those containing rows
      for (const e of eras) {
        const inE = yrs.filter((y) => y >= e.from && y <= e.to && e.years.some((x) => x.year === y));
        if (!inE.length) continue;
        items.push({ t: "era", id: e.id, title: e.title, from: e.from, to: e.to, href: `/eras/${e.id}` });
        inE.forEach((y) => items.push({ t: "year", year: y }));
      }
    }
    // collapse gaps between consecutive rendered years into one row — unless a title-only group (predecessor
    // / successor team) already sits in that gap and explains it
    const titleOnly = groups.filter((g) => !yrs.some((y) => y >= g.from && y <= g.to));
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.t !== "year") continue;
      // look ahead (upwards) for the previous rendered year
      let j = i - 1;
      while (j >= 0 && items[j].t !== "year") j--;
      const up = j >= 0 ? (items[j] as { year: number }).year : null;
      if (up != null && up - it.year > 1) {
        const a = it.year + 1, b = up - 1;
        if (!titleOnly.some((g) => g.from <= b && g.to >= a)) {
          let at = i; // place the gap above this year's group title if the year opens a group
          while (at - 1 > j && items[at - 1].t === "era") at--;
          items.splice(at, 0, { t: "gap", a, b });
        }
      }
    }
  } else {
    for (const e of eras) {
      const eraDim = !!scope.years && !e.years.some((y) => scope.years!.includes(y.year));
      items.push({ t: "era", id: e.id, title: e.title, from: e.from, to: e.to, summary: e.summary, href: `/eras/${e.id}`, dim: eraDim });
      e.years.forEach((y) => items.push({ t: "year", year: y.year }));
    }
  }

  const openEra = subject ? null : scope.era ?? eraPage?.[1] ?? eras.find((e) => e.years.some((y) => y.year === current))?.id;
  const rowOf = (y: number): Omit<RailRow, "label"> & { label?: string | null } => {
    const r = scope.rows?.[y];
    const b = base.get(y);
    return {
      color: r?.color ?? b?.color ?? "#4a4a55",
      label: r?.label ?? (subject ? undefined : b ? (b.live && !scope.labels ? "进行中" : histLabel(b)) : undefined),
      sub: r?.sub, color2: r?.color2, laurel: r?.laurel, half: r?.half,
      live: r?.live ?? (!subject && !!b?.live && !scope.labels),
    };
  };
  const dimYear = (y: number) => !subject && !!scope.years && !scope.years.includes(y);
  const gapText = (a: number, b: number) => {
    const range = a === b ? String(a) : `${a}–${String(b).slice(String(a).slice(0, 2) === String(b).slice(0, 2) ? 2 : 0)}`;
    return (scope.gap ?? "{a}–{b}").replace("{a}–{b}", range);
  };

  // the rail and sticky bars sit under the site header, whose height varies (ticker row or not): measure it
  useEffect(() => {
    const h = document.querySelector("header");
    if (!h) return;
    const set = () => document.documentElement.style.setProperty("--head-h", `${Math.round(h.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);

  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const el = b.querySelector<HTMLElement>("[data-on]") ?? b.querySelector<HTMLElement>("[data-era-on]");
    if (!el) { b.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); return; }
    const r = el.getBoundingClientRect(), br = b.getBoundingClientRect();
    b.scrollTo({ top: b.scrollTop + r.top - br.top - b.clientHeight / 3, left: b.scrollLeft + r.left - br.left - b.clientWidth / 2 + r.width / 2, behavior: "instant" as ScrollBehavior });
  }, [current, openEra, path, subject]);

  // v5: the rail is hidden under 实时 (/live, /calendar: this season only, nothing to switch)
  const off = /^\/(live|calendar)(\/|$)/.test(path);
  useEffect(() => { document.documentElement.dataset.rail = off ? "off" : "on"; }, [off]);
  if (off) return <nav className={s.off} aria-hidden />;
  return (
    <nav ref={box} className={`${s.rail} ${subject ? s.subject : ""}`} aria-label="年份">
      {scope.home && (
        // the object's own home page: highlighted when no year is selected (user: 主页能点击，默认先进主页)
        <Link href={scope.home.href} scroll={false} className={`${s.home} ${current == null && spFrom == null ? s.homeOn : ""}`} data-on={current == null && spFrom == null ? "" : undefined}>
          <b>{scope.home.label}</b>{scope.home.sub && <em>{scope.home.sub}</em>}
        </Link>
      )}
      {items.map((it, k) => {
        if (it.t === "era") {
          const on = it.id === openEra || (subject && spFrom === it.from && spTo === it.to && !spYear);
          const label = <span><b>{subject ? (it.from === it.to ? it.from : `${it.from}–${String(it.to).slice(2)}`) : `${it.from}–${it.to === it.from ? "" : String(it.to).slice(2)}`}</b>{it.title}</span>;
          const cls = `${s.eraT} ${on ? s.eraOn : ""} ${it.dim ? s.dimEra : ""} ${subject ? s.group : ""}`;
          const body = (
            <>
              {subject && it.color && <i className={s.gsq} style={{ background: it.color }} />}
              {label}
            </>
          );
          return it.href
            ? <Link key={`e${it.id}${k}`} href={it.href} className={cls} data-era-on={on && !current ? "" : undefined} title={subject ? it.title : `${it.title} · 时代介绍`}>{body}</Link>
            : <div key={`e${it.id}${k}`} className={cls}>{body}</div>;
        }
        if (it.t === "gap") {
          return (
            <Link key={`g${it.a}`} href={hrefFor(it.a)} className={s.gap} scroll={false}>
              {gapText(it.a, it.b)}
            </Link>
          );
        }
        const y = it.year;
        const r = rowOf(y);
        const on = y === current;
        return (
          <Link key={y} href={hrefFor(y)} scroll={!unit}
            className={`${s.y} ${on ? s.on : ""} ${dimYear(y) ? s.dim : ""} ${r.half ? s.half : ""}`}
            style={{ ["--c" as any]: r.color, ["--c2" as any]: r.color2 ?? r.color }}
            title={dimYear(y) ? scope.missing?.replace("{y}", String(y)) : undefined}>
            <i data-on={on ? "" : undefined} className={r.color2 ? s.dual : undefined} />
            <span className={s.num}>{y}</span>
            <em className={r.live ? s.live : undefined}>
              {r.label}{r.sub && <small> · {r.sub}</small>}
            </em>
            {r.laurel && <span className={`${s.mini} ${r.laurel === "red" ? s.miniRed : ""}`} title={r.laurel === "gold" ? "冠军" : "领跑"}><MiniLaurel h={12} /></span>}
          </Link>
        );
      })}
    </nav>
  );
}
