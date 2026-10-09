"use client";

import Track3D, { PALETTE_DARK } from "@/components/three/Track3D";

export default function TrackHero({ points }: { points: [number, number, number][] }) {
  return (
    <Track3D
      points={points}
      palette={{ ...PALETTE_DARK, track: "#2a2a33" }}
      ghosts={[{ color: "#e10600", t: 0 }, { color: "#ffffff", t: 0.03 }]}
      lapSeconds={16}
      className="track3d"
    />
  );
}
