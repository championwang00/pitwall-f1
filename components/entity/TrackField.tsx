"use client";

import { useMemo, useRef, useState } from "react";
import Track3D, { PALETTE_DARK, type Car } from "@/components/three/Track3D";
import EntityLink, { type Kind } from "@/components/entity/EntityLink";
import type { CornerLayer } from "@/lib/corners";
import { CornerLegend, CornerOverlay, cornerMarks, useStoredMode, cornerStyles as s, type LayerMode, type Placer } from "@/components/track/CornerLayer";

const PALETTE = { ...PALETTE_DARK, track: "#4a4a57", edge: "#ffffff" };
const GHOSTS: Car[] = [{ color: "#e10600", t: 0 }];
const CAM: [number, number, number] = [0, 8, 9];
const MODES: LayerMode[] = ["corners", "sectors", "off"];

/**
 * The 3D circuit field of the circuit / race heroes. With `corners` (lib/corners.ts) it carries the corner layer
 * (IA spec §0.9): pins + named labels (弯角, default), real S1/S2/S3 colours (分段) or nothing (关), remembered per viewer.
 * `link`: in a year context the picture opens that year's race — the link wraps only the canvas, so the pins (buttons)
 * are never nested inside it.
 */
export default function TrackField({ points, lap = 18, className = "track-field", corners, link, legendClassName }: {
  points: [number, number, number][]; lap?: number; className?: string;
  corners?: CornerLayer | null; link?: { kind: Kind; id: string; year?: number };
  /** where the 弯角 · 分段 · 关 seg sits when the field bleeds past its box (race hero) */
  legendClassName?: string;
}) {
  const hasPins = !!corners?.corners.length;
  const [mode, setMode] = useStoredMode<LayerMode>("pitwall.cornerLayer", hasPins ? "corners" : "off", "off", MODES);
  // stored 「弯角」 on a track without pins (Madring) / 「分段」 without built sectors → fall back
  const eff: LayerMode = !corners ? "off" : mode === "corners" && !hasPins ? "off" : mode === "sectors" && !corners.sectors ? (hasPins ? "corners" : "off") : mode;
  const [hi, setHi] = useState<[number, number] | null>(null);
  const placeRef = useRef<Placer | null>(null);
  const onMarks = useMemo(() => (pos: Parameters<Placer>[0]) => placeRef.current?.(pos), []);
  const showPins = hasPins && eff !== "off";
  const marks = useMemo(() => (showPins ? cornerMarks(corners, eff === "corners") : undefined), [corners, showPins, eff]);

  const field = (
    <Track3D
      points={points}
      palette={PALETTE}
      ghosts={GHOSTS}
      lapSeconds={lap}
      camera={CAM}
      fit={6.4}
      className={s.stage}
      marks={marks}
      onMarks={marks ? onMarks : undefined}
      showSectors={eff === "sectors"}
      sectors={corners?.sectors ?? null}
      highlight={eff === "corners" ? hi : null}
    />
  );

  return (
    <div className={`${className} ${s.wrap}`}>
      {link ? <EntityLink kind={link.kind} id={link.id} year={link.year} className={`${s.link} pic-link`}>{field}</EntityLink> : field}
      {corners && showPins && <CornerOverlay data={corners} labels={eff === "corners"} placeRef={placeRef} onHighlight={setHi} />}
      {/* Madring (no corner data yet): the legend keeps only 分段 · 关 (§0.9.3 ⑧) */}
      {corners && <CornerLegend mode={eff} setMode={setMode} data={corners} modes={MODES} className={legendClassName} />}
    </div>
  );
}
