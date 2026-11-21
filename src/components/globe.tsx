import createGlobe, { type COBEOptions } from "cobe";
import { memo, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
};

/**
 * Auto-rotating, draggable cobe globe (cobe v2 API: we drive the frame loop
 * ourselves and push state through `globe.update`).
 */
export const Globe = memo(function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerStart = useRef<number | null>(null);
  const dragOffset = useRef(0);
  const dragDelta = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cap backing-store density at 2x: beyond that the huge half-globe costs
    // a lot more to fill for no visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = canvas.offsetWidth;
    let phi = 0;
    let frame = 0;
    let lastTime = 0;

    const globe = createGlobe(canvas, {
      ...config,
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
    });

    const resize = new ResizeObserver(() => {
      width = canvas.offsetWidth;
    });
    resize.observe(canvas);

    const tick = (now: number) => {
      // Time-based spin so speed is the same on 60Hz and 120Hz screens.
      const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
      lastTime = now;
      if (pointerStart.current === null) phi += 0.3 * dt;
      globe.update({
        phi: phi + dragOffset.current + dragDelta.current,
        width: width * dpr,
        height: width * dpr,
      });
      frame = requestAnimationFrame(tick);
    };

    // Only animate while the globe is actually on screen.
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!frame) {
          lastTime = 0;
          frame = requestAnimationFrame(tick);
        }
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibility.observe(canvas);

    const fadeIn = setTimeout(() => (canvas.style.opacity = "1"));

    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(fadeIn);
      resize.disconnect();
      visibility.disconnect();
      globe.destroy();
    };
  }, [config]);

  const startDrag = (clientX: number) => {
    pointerStart.current = clientX;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };

  const moveDrag = (clientX: number) => {
    if (pointerStart.current === null) return;
    dragDelta.current = (clientX - pointerStart.current) / 200;
  };

  const endDrag = () => {
    if (pointerStart.current === null) return;
    dragOffset.current += dragDelta.current;
    dragDelta.current = 0;
    pointerStart.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  };

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[600px]", className)}>
      <canvas
        ref={canvasRef}
        className="size-full cursor-grab opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => startDrag(e.clientX)}
        onPointerMove={(e) => moveDrag(e.clientX)}
        onPointerUp={endDrag}
        onPointerOut={endDrag}
        onPointerCancel={endDrag}
      />
    </div>
  );
});
