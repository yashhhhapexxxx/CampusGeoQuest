import { useEffect, useRef } from "react";

/**
 * Animated topographic map: slowly flowing contour lines (moss minor lines,
 * sand index lines every 5th) over the whole parent section. Taps inside the
 * section send a seismic ripple through the contours (pairs with SeismicTap).
 *
 * Cheap by design: one WebGL2 quad, ≤1.5× DPR, 30 fps cap, and the loop
 * stops whenever the section is off screen or the tab is hidden.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDpr;
uniform vec4 uTaps[4]; // xy: device px (y-up), z: start time, w: active
out vec4 outColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { s += a * gnoise(p); p = m * p; a *= 0.5; }
  return s;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float t = uTime;
  // ~2.4 noise cells across the viewport height (in CSS px, so density is DPR-independent)
  vec2 p = frag / uDpr / 420.0;
  // gentle domain warp so the terrain flows
  vec2 warp = vec2(fbm(p + vec2(t * 0.020, -t * 0.012)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.015, t * 0.010)));
  float h = fbm(p * 1.1 + warp * 0.55 + vec2(t * 0.008, 0.0));

  // seismic ripples from taps
  float glow = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 tp = uTaps[i];
    if (tp.w < 0.5) continue;
    float age = t - tp.z;
    if (age < 0.0 || age > 3.2) continue;
    float d = distance(frag, tp.xy) / uDpr;        // CSS px
    float front = age * 520.0;                      // px / s
    float env = exp(-age * 1.1) * exp(-abs(d - front) / 90.0);
    h += sin((d - front) * 0.045) * 0.09 * env;
    glow += env;
  }

  float lines = 16.0;
  float v = h * lines;
  float f = fract(v);
  float w = fwidth(v) * 1.15;
  float minor = 1.0 - smoothstep(0.0, w, min(f, 1.0 - f));
  float idx = mod(floor(v + 0.5), 5.0);
  float isMajor = 1.0 - step(0.5, idx);             // every 5th contour is an index line
  float wMaj = w * 1.9;
  float major = (1.0 - smoothstep(0.0, wMaj, min(f, 1.0 - f))) * isMajor;

  vec3 moss = vec3(0.498, 0.639, 0.357);
  vec3 sand = vec3(0.910, 0.863, 0.769);
  vec3 lichen = vec3(0.847, 0.941, 0.745);

  // edge vignette so the map melts into the page
  vec2 uv = frag / uRes;
  float vig = smoothstep(0.0, 0.18, uv.x) * smoothstep(0.0, 0.18, 1.0 - uv.x)
            * smoothstep(0.0, 0.12, uv.y) * smoothstep(0.0, 0.12, 1.0 - uv.y);

  float aMinor = minor * (0.10 + 0.35 * glow);
  float aMajor = major * (0.22 + 0.45 * glow);
  vec3 col = moss * aMinor + mix(sand, lichen, clamp(glow, 0.0, 1.0)) * aMajor;
  float a = clamp(aMinor + aMajor, 0.0, 1.0) * vig;
  outColor = vec4(col * vig, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("TopoBackground shader:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function TopoBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.closest("section");
    if (!canvas || !host) return;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return; // no WebGL2: section simply keeps its plain background

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uDpr = gl.getUniformLocation(prog, "uDpr");
    const uTaps = gl.getUniformLocation(prog, "uTaps");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const taps = new Float32Array(16);
    let tapSlot = 0;
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 0 : now());
      gl.uniform1f(uDpr, dpr);
      gl.uniform4fv(uTaps, taps);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = 0;
    let last = 0;
    let visible = false;
    let pageVisible = !document.hidden;
    const loop = (ts: number) => {
      raf = 0;
      if (!visible || !pageVisible) return;
      if (ts - last >= 32) {
        last = ts;
        draw();
      }
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!raf && visible && pageVisible) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        draw();
        wake();
      }
    });
    io.observe(canvas);
    const onVis = () => {
      pageVisible = !document.hidden;
      wake();
    };
    document.addEventListener("visibilitychange", onVis);

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || reduced) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * dpr;
      const y = (r.bottom - e.clientY) * dpr; // y-up for gl_FragCoord
      taps.set([x, y, now(), 1], tapSlot * 4);
      tapSlot = (tapSlot + 1) % 4;
      wake();
    };
    host.addEventListener("pointerdown", onDown, { passive: true });

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointerdown", onDown);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`block size-full ${className}`} />;
}

export default TopoBackground;
