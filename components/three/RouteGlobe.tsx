"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

export type Stop = { round: number; lat: number; lon: number; label: string; done: boolean; next: boolean };

const R = 2;
function toVec(lat: number, lon: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180, theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function Land() {
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([import("topojson-client"), import("world-atlas/land-110m.json")]).then(([tj, topo]: any) => {
      const land: any = tj.feature(topo.default ?? topo, (topo.default ?? topo).objects.land);
      const pts: number[] = [];
      for (const f of land.features ?? [land]) {
        const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        for (const poly of polys) for (const ring of poly) for (let i = 1; i < ring.length; i++) {
          const a = toVec(ring[i - 1][1], ring[i - 1][0], R * 1.001), b = toVec(ring[i][1], ring[i][0], R * 1.001);
          pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      if (alive) setGeom(g);
    });
    return () => { alive = false; };
  }, []);
  if (!geom) return null;
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.28} />
    </lineSegments>
  );
}

function Graticule() {
  const geom = useMemo(() => {
    const pts: number[] = [];
    for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 3) {
      const a = toVec(lat, lon), b = toVec(lat, lon + 3);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    for (let lon = -180; lon < 180; lon += 30) for (let lat = -84; lat < 84; lat += 3) {
      const a = toVec(lat, lon), b = toVec(lat + 3, lon);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.07} />
    </lineSegments>
  );
}

function Arc({ a, b, done }: { a: Stop; b: Stop; done: boolean }) {
  const line = useMemo(() => {
    const va = toVec(a.lat, a.lon).normalize(), vb = toVec(b.lat, b.lon).normalize();
    const ang = va.angleTo(vb);
    // great-circle path lifted by a sine bump so long hops always clear the surface
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const p = new THREE.Vector3().copy(va).multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang || 1e-6))
        .add(vb.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang || 1e-6)));
      if (ang < 1e-4) p.copy(va);
      pts.push(p.normalize().multiplyScalar(R * (1.005 + Math.sin(Math.PI * t) * (0.02 + ang * 0.07))));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = done
      ? new THREE.LineBasicMaterial({ color: "#e10600", transparent: true, opacity: 0.85 })
      : new THREE.LineDashedMaterial({ color: "#ffffff", transparent: true, opacity: 0.4, dashSize: 0.06, gapSize: 0.05 });
    const l = new THREE.Line(g, m);
    l.computeLineDistances();
    return l;
  }, [a, b, done]);
  return <primitive object={line} />;
}

function Globe({ stops }: { stops: Stop[] }) {
  const group = useRef<THREE.Group>(null);
  const next = stops.find((s) => s.next) ?? stops[0];
  // start rotated so the next race faces the camera
  const startRot = useMemo(() => -((next.lon + 90) * Math.PI) / 180, [next]);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame((st, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.05;
    if (pulse.current) {
      const t = (st.clock.elapsedTime % 1.6) / 1.6;
      pulse.current.scale.setScalar(1 + t * 2.4);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
    }
  });
  const nv = toVec(next.lat, next.lon, R * 1.002);
  return (
    <group ref={group} rotation={[0.35, startRot, 0]}>
      <mesh>
        <sphereGeometry args={[R * 0.995, 64, 64]} />
        <meshBasicMaterial color="#15151e" />
      </mesh>
      <Graticule />
      <Land />
      {stops.slice(1).map((s, i) => <Arc key={s.round} a={stops[i]} b={s} done={s.done} />)}
      {stops.map((s) => {
        const v = toVec(s.lat, s.lon, R * 1.004);
        return (
          <mesh key={s.round} position={v}>
            <sphereGeometry args={[s.next ? 0.045 : 0.028, 16, 16]} />
            <meshBasicMaterial color={s.next ? "#e10600" : s.done ? "#ffffff" : "#8a8a94"} />
          </mesh>
        );
      })}
      <mesh ref={pulse} position={nv} onUpdate={(m) => m.lookAt(nv.clone().multiplyScalar(2))}>
        <ringGeometry args={[0.05, 0.065, 32]} />
        <meshBasicMaterial color="#e10600" transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function RouteGlobe({ stops, className }: { stops: Stop[]; className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
        <Globe stops={stops} />
        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
