"use client";

import Track3D, { PALETTE_DARK } from "@/components/three/Track3D";

export default function TrackField({ points, lap = 18, className = "track-field" }: { points: [number, number, number][]; lap?: number; className?: string }) {
  return (
    <Track3D
      points={points}
      palette={{ ...PALETTE_DARK, track: "#4a4a57", edge: "#ffffff" }}
      ghosts={[{ color: "#e10600", t: 0 }]}
      lapSeconds={lap}
      camera={[0, 8, 9]}
      fit={6.4}
      className={className}
    />
  );
}
