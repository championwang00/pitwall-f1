"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";

export type SeasonRing = { year: number; color: string; races: number };

function Rings({ seasons, gap }: { seasons: SeasonRing[]; gap: number }) {
  const group = useRef<THREE.Group>(null);
  const geoms = useMemo(
    () =>
      seasons.map((s) => {
        const r = 2.2 + s.races * 0.06;
        const pts: THREE.Vector3[] = [];
        // one tick per race on the ring, plus the circle itself
        const seg = 160;
        for (let i = 0; i <= seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
        }
        const circle = new THREE.BufferGeometry().setFromPoints(pts);
        const ticks: number[] = [];
        for (let i = 0; i < s.races; i++) {
          const a = (i / s.races) * Math.PI * 2 + Math.PI / 2;
          ticks.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * (r + 0.28), Math.sin(a) * (r + 0.28), 0);
        }
        const tg = new THREE.BufferGeometry();
        tg.setAttribute("position", new THREE.Float32BufferAttribute(ticks, 3));
        return { circle, ticks: tg, r };
      }),
    [seasons]
  );
  const depth = seasons.length * gap;
  useFrame((state, dt) => {
    if (!group.current) return;
    group.current.position.z = (group.current.position.z + dt * 1.6) % depth;
    group.current.rotation.z += dt * 0.02;
    state.camera.position.x += (state.pointer.x * 1.2 - state.camera.position.x) * 0.03;
    state.camera.position.y += (state.pointer.y * 0.8 - state.camera.position.y) * 0.03;
    state.camera.lookAt(0, 0, -20);
  });
  return (
    <group ref={group}>
      {[0, 1].map((loop) =>
        seasons.map((s, i) => {
          const z = -(i * gap) - loop * depth;
          return (
            <group key={`${loop}-${s.year}`} position={[0, 0, z]}>
              <line>
                <primitive object={geoms[i].circle} attach="geometry" />
                <lineBasicMaterial color={s.color} transparent opacity={0.9} />
              </line>
              <lineSegments geometry={geoms[i].ticks}>
                <lineBasicMaterial color="#ffffff" transparent opacity={0.35} />
              </lineSegments>
            </group>
          );
        })
      )}
    </group>
  );
}

export default function TimeTunnel({ seasons, className }: { seasons: SeasonRing[]; className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6], fov: 60, near: 0.1, far: 200 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
        <fog attach="fog" args={["#07070b", 6, 70]} />
        <Rings seasons={seasons} gap={1.4} />
      </Canvas>
    </div>
  );
}
