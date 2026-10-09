"use client";

import Track3D, { PALETTE_DARK } from "@/components/three/Track3D";

export default function TrackWall({ points }: { points: [number, number, number][] }) {
  return (
    <Track3D
      points={points}
      palette={{ ...PALETTE_DARK, track: "#1c1c24", edge: "#9a9aa6" }}
      ghosts={[
        { color: "#00D7B6", t: 0 }, { color: "#00D7B6", t: 0.012 }, { color: "#ED1131", t: 0.025 },
        { color: "#ED1131", t: 0.031 }, { color: "#F47600", t: 0.05 }, { color: "#4781D7", t: 0.058 },
      ]}
      lapSeconds={22}
      camera={[0, 7, 10]}
      fit={6.2}
      className="trackwall"
    />
  );
}
