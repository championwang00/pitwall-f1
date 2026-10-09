"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { trackCurve } from "./relief";

export type TrackPalette = {
  track: string;      // asphalt ribbon
  edge: string;       // kerb/edge glow
  pulse: string;      // travelling light
  curtain: string;    // elevation curtain lines
  grid: string;       // ground dots
  sectors?: [string, string, string];
};

export const PALETTE_DARK: TrackPalette = {
  track: "#24242c", edge: "#ffffff", pulse: "#e10600", curtain: "#ffffff", grid: "#ffffff",
  sectors: ["#e10600", "#ffd800", "#00a1e8"],
};
export const PALETTE_LIGHT: TrackPalette = {
  track: "#15151e", edge: "#15151e", pulse: "#e10600", curtain: "#15151e", grid: "#15151e",
};

export type Car = { color: string; t: number; label?: string };

type Props = {
  points: [number, number, number][];
  palette?: TrackPalette;
  /** Multiplier on the automatic per-circuit relief (1 = default). */
  elevation?: number;
  spin?: number;
  /** Ghost cars that lap the circuit; t in [0,1) is the start offset. Ignored if `positions` is given. */
  ghosts?: Car[];
  /** Externally driven car positions in normalised track parameter (0..1). */
  positions?: Car[];
  lapSeconds?: number;
  className?: string;
  camera?: [number, number, number];
  showSectors?: boolean;
  /** Radius (world units) that must stay in frame; track spans ~10 units. */
  fit?: number;
};

const buildCurve = trackCurve;

const ribbonVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ribbonFrag = /* glsl */ `
  uniform float uTime;
  uniform float uLap;
  uniform vec3 uTrack;
  uniform vec3 uEdge;
  uniform vec3 uPulse;
  uniform vec3 uS1; uniform vec3 uS2; uniform vec3 uS3;
  uniform float uSectors;
  varying vec2 vUv;
  void main() {
    float along = vUv.x;
    float across = abs(vUv.y - 0.5) * 2.0;
    vec3 col = uTrack;
    // sector tint on the racing line
    vec3 sec = along < 0.333 ? uS1 : (along < 0.666 ? uS2 : uS3);
    float line = smoothstep(0.22, 0.0, across);
    col = mix(col, sec, line * 0.85 * uSectors);
    // asphalt sheen toward the racing line, bright kerb edges
    col += vec3(0.06) * smoothstep(0.7, 0.0, across) * (1.0 - uSectors);
    float edge = smoothstep(0.8, 0.97, across);
    col = mix(col, uEdge, edge * 0.85);
    // travelling pulse with a long tail
    float head = fract(uTime / uLap);
    float d = fract(head - along);
    float tail = exp(-d * 18.0) * step(0.0, d);
    col = mix(col, uPulse, clamp(tail * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Ribbon({ curve, palette, lap, sectors }: { curve: THREE.CatmullRomCurve3; palette: TrackPalette; lap: number; sectors: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geom = useMemo(() => {
    const N = 1400, W = 0.2;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = curve.getPointAt(t % 1);
      const tan = curve.getTangentAt(t % 1);
      const side = new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(W / 2);
      pos.push(p.x + side.x, p.y + 0.002, p.z + side.z, p.x - side.x, p.y + 0.002, p.z - side.z);
      uv.push(t, 0, t, 1);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }, [curve]);
  const uniforms = useMemo(() => {
    const s = palette.sectors || [palette.track, palette.track, palette.track];
    return {
      uTime: { value: 0 }, uLap: { value: lap },
      uTrack: { value: new THREE.Color(palette.track) }, uEdge: { value: new THREE.Color(palette.edge) },
      uPulse: { value: new THREE.Color(palette.pulse) },
      uS1: { value: new THREE.Color(s[0]) }, uS2: { value: new THREE.Color(s[1]) }, uS3: { value: new THREE.Color(s[2]) },
      uSectors: { value: sectors && palette.sectors ? 1 : 0 },
    };
  }, [palette, lap, sectors]);
  useFrame((_, dt) => { if (mat.current) mat.current.uniforms.uTime.value += dt; });
  return (
    <mesh geometry={geom}>
      <shaderMaterial ref={mat} vertexShader={ribbonVert} fragmentShader={ribbonFrag} uniforms={uniforms} side={THREE.DoubleSide} />
    </mesh>
  );
}

const skirtVert = /* glsl */ `
  attribute float aTop;
  varying float vTop;
  void main() { vTop = aTop; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const skirtFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTop;
  void main() { gl_FragColor = vec4(uColor, uOpacity * pow(vTop, 2.2)); }
`;

/** Translucent wall from the racing surface down to the ground — reads as elevation, not wireframe. */
function Curtain({ curve, color }: { curve: THREE.CatmullRomCurve3; color: string }) {
  const geom = useMemo(() => {
    const N = 600, pos: number[] = [], top: number[] = [], idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const p = curve.getPointAt((i / N) % 1);
      pos.push(p.x, p.y, p.z, p.x, -0.6, p.z);
      top.push(1, 0);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aTop", new THREE.Float32BufferAttribute(top, 1));
    g.setIndex(idx);
    return g;
  }, [curve]);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.24 } }), [color]);
  return (
    <mesh geometry={geom}>
      <shaderMaterial vertexShader={skirtVert} fragmentShader={skirtFrag} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Start/finish line: a short white bar across the ribbon at t = 0 (telemetry lap starts on the line). */
function StartLine({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const { pos, quat } = useMemo(() => {
    const p = curve.getPointAt(0), t = curve.getTangentAt(0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(t.x, 0, t.z).normalize());
    return { pos: new THREE.Vector3(p.x, p.y + 0.012, p.z), quat: q };
  }, [curve]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.02, 0.34]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Shadow({ curve, color }: { curve: THREE.CatmullRomCurve3; color: string }) {
  const lines = useMemo(() => {
    const base = curve.getSpacedPoints(600);
    return [0, 0.05, 0.1, 0.16].map((spread, i) => {
      const pts = base.map((p) => new THREE.Vector3(p.x * (1 + spread * 0.02), -0.6, p.z * (1 + spread * 0.02)));
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: [0.28, 0.1, 0.06, 0.03][i], depthWrite: false })
      );
    });
  }, [curve, color]);
  return <>{lines.map((l, i) => <primitive key={i} object={l} />)}</>;
}

function GroundDots({ color }: { color: string }) {
  const geom = useMemo(() => {
    const pos: number[] = [];
    for (let x = -7; x <= 7; x += 0.5) for (let z = -7; z <= 7; z += 0.5) pos.push(x, -0.6, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial color={color} size={0.02} transparent opacity={0.14} sizeAttenuation />
    </points>
  );
}

const glowTex = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.8)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

function Cars({ curve, cars, lap, driven }: { curve: THREE.CatmullRomCurve3; cars: Car[]; lap: number; driven: boolean }) {
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const time = useRef(0);
  useFrame((_, dt) => {
    time.current += dt;
    cars.forEach((c, i) => {
      const s = refs.current[i];
      if (!s) return;
      const t = driven ? c.t : (c.t + time.current / lap) % 1;
      const p = curve.getPointAt(((t % 1) + 1) % 1);
      s.position.set(p.x, p.y + 0.09, p.z);
    });
  });
  return (
    <>
      {cars.map((c, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el; }} scale={[0.34, 0.34, 0.34]}>
          <spriteMaterial map={glowTex ?? undefined} color={c.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </>
  );
}

/** Keeps the whole (spinning) circuit in frame for any canvas aspect ratio. */
function FitCamera({ dir, radius = 7.4, y = -0.3 }: { dir: [number, number, number]; radius?: number; y?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const fov = Math.min(vfov, hfov);
    const dist = radius / Math.sin(fov / 2);
    const d = new THREE.Vector3(...dir).normalize().multiplyScalar(dist);
    camera.position.set(d.x, d.y + y, d.z);
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, dir, radius, y]);
  return null;
}

function Scene({ points, palette, elevation, spin, ghosts, positions, lapSeconds, showSectors, camera, fit }: Required<Omit<Props, "className" | "positions" | "ghosts" | "fit">> & { ghosts?: Car[]; positions?: Car[]; fit: number }) {
  const curve = useMemo(() => buildCurve(points, elevation), [points, elevation]);
  const group = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * spin;
    const tx = state.pointer.y * 0.08, ty = state.pointer.x * 0.12;
    group.current.rotation.x += (tx - group.current.rotation.x) * 0.04;
    group.current.position.x += (ty - group.current.position.x) * 0.04;
  });
  return (
    <>
    <FitCamera dir={camera} radius={fit} />
    <group ref={group}>
      <GroundDots color={palette.grid} />
      <Shadow curve={curve} color={palette.curtain} />
      <Curtain curve={curve} color={palette.curtain} />
      <Ribbon curve={curve} palette={palette} lap={lapSeconds} sectors={showSectors} />
      <StartLine curve={curve} />
      {positions ? <Cars curve={curve} cars={positions} lap={lapSeconds} driven /> : ghosts ? <Cars curve={curve} cars={ghosts} lap={lapSeconds} driven={false} /> : null}
    </group>
    </>
  );
}

export default function Track3D({
  points, palette = PALETTE_DARK, elevation = 1, spin = 0.04, ghosts, positions, lapSeconds = 14,
  className, camera = [0, 8.5, 9.5], showSectors = false, fit = 6.6,
}: Props) {
  return (
    <div className={className} style={className ? undefined : { position: "relative", width: "100%", height: "100%" }}>
      <Canvas camera={{ position: camera, fov: 38 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
        <Scene points={points} palette={palette} elevation={elevation} spin={spin} ghosts={ghosts} positions={positions} lapSeconds={lapSeconds} showSectors={showSectors} camera={camera} fit={fit} />
      </Canvas>
    </div>
  );
}
