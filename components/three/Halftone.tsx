"use client";

import { useEffect, useRef } from "react";

/**
 * Team-colour halftone field (the formula1.com driver-card texture), rendered as a live WebGL shader.
 * Dots grow toward the light source and drift slowly; the light follows the pointer.
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uColor;
uniform float uDensity;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = gl_FragCoord.xy;
  // base: deep team colour falling to near-black at the far edge
  vec3 deep = uColor * 0.32;
  float light = smoothstep(1.25, 0.0, distance(uv * vec2(uRes.x / uRes.y, 1.0), uMouse * vec2(uRes.x / uRes.y, 1.0)));
  vec3 base = mix(deep, uColor, light * 0.9);
  // rotated halftone grid
  float a = 0.5236;
  mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 g = r * p / uDensity;
  g.x += uTime * 0.12;
  vec2 cell = fract(g) - 0.5;
  float ramp = clamp(uv.x * 1.15 - 0.1 + light * 0.35, 0.0, 1.0);
  float radius = mix(0.06, 0.48, ramp);
  float dotm = 1.0 - smoothstep(radius - 0.06, radius + 0.06, length(cell));
  vec3 col = mix(base, base * 0.55, dotm * 0.85);
  // soft vignette toward the text side
  col *= mix(0.55, 1.0, smoothstep(0.0, 0.55, uv.x));
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function Halftone({ color, className, density = 7 }: { color: string; className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const gl = c.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(U("uColor"), r, g, b);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    gl.uniform1f(U("uDensity"), density * dpr);
    const mouse = { x: 0.78, y: 0.62, tx: 0.78, ty: 0.62 };
    const onMove = (e: PointerEvent) => {
      const rc = c.getBoundingClientRect();
      mouse.tx = Math.min(1.2, Math.max(-0.2, (e.clientX - rc.left) / rc.width));
      mouse.ty = Math.min(1.2, Math.max(-0.2, 1 - (e.clientY - rc.top) / rc.height));
    };
    window.addEventListener("pointermove", onMove);
    let raf = 0;
    const t0 = performance.now();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      gl.viewport(0, 0, c.width, c.height);
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform2f(U("uRes"), c.width, c.height);
      gl.uniform1f(U("uTime"), reduce ? 0 : (performance.now() - t0) / 1000);
      gl.uniform2f(U("uMouse"), mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, [color, density]);
  return <canvas ref={ref} className={className} style={{ display: "block", width: "100%", height: "100%" }} aria-hidden />;
}
