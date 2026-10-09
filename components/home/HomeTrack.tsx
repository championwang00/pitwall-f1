"use client";

import Track3D, { PALETTE_DARK } from "@/components/three/Track3D";

export default function HomeTrack({ points }: { points: [number, number, number][] }) {
  return (
    <Track3D
      points={points}
      palette={{ ...PALETTE_DARK, track: "#4a4a57", edge: "#ffffff", pulse: "#ffffff" }}
      ghosts={[{ color: "#ffffff", t: 0 }]}
      lapSeconds={20}
      camera={[1.5, 7, 9]}
      fit={5.1}
      className="home-track"
    />
  );
}
