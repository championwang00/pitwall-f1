"use client";

import { useSyncExternalStore } from "react";

/** One rail row's annotations (spec v4 §1.2.4). */
export type RailRow = { label?: string; sub?: string; color?: string; color2?: string; laurel?: "gold" | "red"; live?: boolean; half?: boolean };
export type RailGroup = { id: string; title: string; from: number; to: number; href?: string; color?: string };

/**
 * What the current page tells the global year rail (set by <RailScope> from a server page).
 * No scope = history tree. `only` = subject timeline: only `years` render, grouped by `groups`, gaps collapse to one row.
 */
export type Scope = {
  /** @deprecated v5 (§0.5.6): the rail has no header any more; still accepted, never rendered. */
  header?: { title: string; sub?: string; href?: string };
  /** the object's own home (overview, no year) as the rail's first row — drivers, teams, circuits; cars have none */
  home?: { label: string; href: string; sub?: string };
  years?: number[];
  only?: boolean;
  rows?: Record<number, RailRow>;
  groups?: RailGroup[];
  labels?: "champ" | "champTeam" | "champCar" | "rounds";
  gap?: string;
  map?: Record<number, string>;
  pattern?: string;
  fallback?: string;
  missing?: string;
  current?: number | null;
  era?: string;
  /** @deprecated v3 — use header */
  label?: string;
};

let scope: Scope = {};
const subs = new Set<() => void>();
/** what the server rendered (RailScope only sets the store in an effect): hydration must see exactly this, even when the
 *  page's RailScope effect already ran before the rail's Suspense boundary hydrated — else a hydration mismatch */
const SERVER: Scope = {};
export function setScope(s: Scope) { scope = s; subs.forEach((f) => f()); }
export function useScope() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => scope, () => SERVER);
}
