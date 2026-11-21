import { useEffect, useRef } from "react";

/**
 * Seismic tap effect: every tap/click inside the parent section sets off a
 * mini earthquake — an impact flash, three wobbly shockwave rings (P/S waves),
 * jagged fault cracks and a burst of rock shards that tumble under gravity.
 *
 * One 2D canvas, drawn only while a quake is alive; idle otherwise.
 * Listens on its parent element, so buttons underneath stay clickable.
 */

type Shard = { a: number; v: number; size: number; rot: number; vr: number; color: string; spark: boolean };
type Crack = { pts: [number, number][] };
type Quake = { x: number; y: number; t0: number; seed: number; maxR: number; shards: Shard[]; cracks: Crack[] };

const RING_COLORS = ["216,240,190", "127,163,91", "232,220,196"]; // lichen, moss, sand
const SHARD_COLORS = ["#E8DCC4", "#B5D98A", "#7FA35B", "#FFFFFF", "#C8703F", "#9AA79F"];
const LIFE = 1.8; // seconds
const MAX_QUAKES = 6;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function makeQuake(x: number, y: number, small: boolean): Quake {
  const maxR = small ? 210 : 380;
  const shards: Shard[] = Array.from({ length: small ? 24 : 38 }, () => {
    const spark = Math.random() < 0.35;
    return {
      a: rand(0, Math.PI * 2),
      v: spark ? rand(320, 640) : rand(150, 420),
      size: spark ? rand(1.6, 3) : rand(4, 9),
      rot: rand(0, Math.PI * 2),
      vr: rand(-9, 9),
      color: SHARD_COLORS[(Math.random() * SHARD_COLORS.length) | 0],
      spark,
    };
  });
  const crackCount = small ? 5 : 7;
  const cracks: Crack[] = Array.from({ length: crackCount }, (_, i) => {
    let a = (i / crackCount) * Math.PI * 2 + rand(-0.35, 0.35);
    const len = rand(maxR * 0.35, maxR * 0.7);
    const steps = 7;
    const pts: [number, number][] = [[0, 0]];
    let px = 0;
    let py = 0;
    for (let s = 1; s <= steps; s++) {
      a += rand(-0.45, 0.45);
      const d = len / steps;
      px += Math.cos(a) * d;
      py += Math.sin(a) * d;
      pts.push([px, py]);
    }
    return { pts };
  });
  return { x, y, t0: performance.now(), seed: Math.random() * 100, maxR, shards, cracks };
}

export function SeismicTap({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement; // wrapper div → section
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const quakes: Quake[] = [];
    let raf = 0;

    const drawRing = (q: Quake, k: number, t: number) => {
      const tk = t - k * 0.11;
      if (tk <= 0) return;
      const p = tk / 1.35;
      if (p >= 1) return;
      const r = easeOut(p) * q.maxR * (1 - k * 0.12);
      const alpha = Math.pow(1 - p, 1.6);
      const segs = 72;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const ang = (i / segs) * Math.PI * 2;
        // wobble: seismic waves aren't perfect circles
        const wob = 1 + 0.045 * Math.sin(ang * (5 + k) + q.seed + tk * 14) * (1 - p);
        const x = q.x + Math.cos(ang) * r * wob;
        const y = q.y + Math.sin(ang) * r * wob;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const c = RING_COLORS[k];
      // soft glow pass + crisp pass (no shadowBlur — it's expensive)
      ctx.strokeStyle = `rgba(${c},${alpha * 0.22})`;
      ctx.lineWidth = 18 - k * 4;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${c},${alpha})`;
      ctx.lineWidth = 3.4 - k * 0.7;
      ctx.stroke();
    };

    const frame = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = quakes.length - 1; i >= 0; i--) {
        const q = quakes[i];
        // rAF timestamps are frame-start times and can precede the pointerdown that
        // created this quake — clamp, or the flash gets a negative radius and arc() throws.
        const t = Math.max(0, (now - q.t0) / 1000);
        if (t > LIFE) {
          quakes.splice(i, 1);
          continue;
        }

        ctx.globalCompositeOperation = "lighter";

        // 1. impact flash
        if (t < 0.22) {
          const f = 1 - t / 0.22;
          const fr = 40 + t * 700;
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, fr);
          g.addColorStop(0, `rgba(255,255,255,${0.85 * f})`);
          g.addColorStop(0.35, `rgba(216,240,190,${0.45 * f})`);
          g.addColorStop(1, "rgba(127,163,91,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(q.x, q.y, fr, 0, Math.PI * 2);
          ctx.fill();
        }

        // 2. shockwave rings
        for (let k = 0; k < (reduced ? 1 : 3); k++) drawRing(q, k, t);

        // 3. fault cracks — snap out fast, then fade
        if (!reduced && t < 1.0) {
          const grow = easeOut(t / 0.22);
          const fade = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.7);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          for (const cr of q.cracks) {
            const n = cr.pts.length - 1;
            const shown = grow * n;
            ctx.beginPath();
            ctx.moveTo(q.x, q.y);
            for (let s = 1; s <= Math.ceil(shown); s++) {
              const [ax, ay] = cr.pts[s - 1];
              const [bx, by] = cr.pts[s];
              const part = Math.min(1, shown - (s - 1));
              ctx.lineTo(q.x + ax + (bx - ax) * part, q.y + ay + (by - ay) * part);
            }
            ctx.strokeStyle = `rgba(232,220,196,${0.2 * fade})`;
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,255,255,${0.9 * fade})`;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }

        // 4. rock shards + sparks
        ctx.globalCompositeOperation = "source-over";
        if (!reduced) {
          const life = Math.max(0, 1 - t / 1.5);
          for (const s of q.shards) {
            const drag = 1 - Math.min(0.55, t * 0.45);
            const x = q.x + Math.cos(s.a) * s.v * t * drag;
            const y = q.y + Math.sin(s.a) * s.v * t * drag + 0.5 * 620 * t * t;
            if (life <= 0) continue;
            if (s.spark) {
              ctx.globalCompositeOperation = "lighter";
              ctx.fillStyle = s.color;
              ctx.globalAlpha = life;
              ctx.beginPath();
              ctx.arc(x, y, s.size * (0.6 + life * 0.6), 0, Math.PI * 2);
              ctx.fill();
              ctx.globalCompositeOperation = "source-over";
            } else {
              const sz = s.size * (0.5 + life * 0.5);
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(s.rot + s.vr * t);
              ctx.globalAlpha = life;
              ctx.fillStyle = s.color;
              ctx.beginPath();
              ctx.moveTo(0, -sz);
              ctx.lineTo(sz * 0.9, sz * 0.6);
              ctx.lineTo(-sz * 0.7, sz * 0.8);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
          }
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalCompositeOperation = "source-over";
      raf = quakes.length ? requestAnimationFrame(frame) : 0;
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      if (quakes.length >= MAX_QUAKES) quakes.shift();
      quakes.push(makeQuake(x, y, r.width < 700));
      // Earthquake: a short, decaying jolt of the whole section (compositor-only transform).
      if (!reduced) {
        host.animate(
          [
            { transform: "translate(0,0)" },
            { transform: "translate(-5px, 3px)" },
            { transform: "translate(5px, -3px)" },
            { transform: "translate(-3px, -2px)" },
            { transform: "translate(3px, 2px)" },
            { transform: "translate(-1px, 1px)" },
            { transform: "translate(0,0)" },
          ],
          { duration: 320, easing: "ease-out" },
        );
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    host.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      host.removeEventListener("pointerdown", onDown);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`block size-full ${className}`} />;
}

export default SeismicTap;
