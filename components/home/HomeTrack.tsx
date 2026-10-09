"use client";

import { useMemo, useRef } from "react";
import Track3D, { PALETTE_DARK, type Car } from "@/components/three/Track3D";
import { StaticPins, type Placer } from "@/components/track/CornerLayer";

const PALETTE = { ...PALETTE_DARK, track: "#4a4a57", edge: "#ffffff", pulse: "#ffffff" };
const GHOSTS: Car[] = [{ color: "#ffffff", t: 0 }];
const CAM: [number, number, number] = [1.5, 7, 9];

/** /live banner track. `pins`: corner numbers only (IA spec §0.9.3 ⑨) — static, no labels, no interaction (the whole
 *  banner track is one link to the circuit). */
export default function HomeTrack({ points, pins }: { points: [number, number, number][]; pins?: { n: string; t: number }[] | null }) {
  const placeRef = useRef<Placer | null>(null);
  const marks = useMemo(() => (pins?.length ? pins.map((k) => ({ key: "c" + k.n, t: k.t })) : undefined), [pins]);
  const onMarks = useMemo(() => (pos: Parameters<Placer>[0]) => placeRef.current?.(pos), []);
  return (
    <div className="home-track">
      <Track3D
        points={points}
        palette={PALETTE}
        ghosts={GHOSTS}
        lapSeconds={20}
        camera={CAM}
        fit={5.1}
        marks={marks}
        onMarks={marks ? onMarks : undefined}
      />
      {pins?.length ? <StaticPins pins={pins} placeRef={placeRef} /> : null}
    </div>
  );
}
