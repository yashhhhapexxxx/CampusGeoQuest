import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ParallaxLayer {
  src: string;
  alt: string;
  speedX: number;
  speedY: number;
  speedZ: number;
  rotation: number;
  className?: string;
  zIndex: number;
  initialTop: string;
  initialLeft: string;
  width: string;
}

interface ParallaxHeroProps {
  layers?: ParallaxLayer[];
  /** Big word set *between* the layers, so the foreground cliffs overlap it. */
  title?: string;
  className?: string;
  titleClassName?: string;
  /** Rendered above every layer (CTA, copy, etc.). */
  children?: ReactNode;
}

const L = (name: string) => `/parallax/${name}.webp`;

/**
 * Layer stack. Anything with zIndex < TITLE_Z sits behind the title; the rest
 * (cliffs + fog) is in front of it, which is what "embeds" the word.
 */
const TITLE_Z = 9;

export const defaultLayers: ParallaxLayer[] = [
  { src: L("background"), alt: "", speedX: 0.03, speedY: 0.038, speedZ: 0, rotation: 0, zIndex: 1, initialTop: "calc(50% - 50px)", initialLeft: "calc(50% + 0px)", width: "3200px" },
  { src: L("fog-7"), alt: "", speedX: 0.27, speedY: 0.32, speedZ: 0, rotation: 0, zIndex: 2, initialTop: "calc(50% - 100px)", initialLeft: "calc(50% + 300px)", width: "1900px" },
  { src: L("mountain-10"), alt: "", speedX: 0.095, speedY: 0.005, speedZ: 0, rotation: 0, zIndex: 3, initialTop: "calc(50% + 169px)", initialLeft: "calc(50% + 330px)", width: "1200px" },
  { src: L("fog-6"), alt: "", speedX: 0.25, speedY: 0.28, speedZ: 0, rotation: 0, zIndex: 4, initialTop: "calc(50% + 285px)", initialLeft: "calc(50%)", width: "2200px", className: "opacity-30" },
  { src: L("mountain-9"), alt: "", speedX: 0.125, speedY: 0.155, speedZ: 0.15, rotation: 0.02, zIndex: 51, initialTop: "calc(50% + 313px)", initialLeft: "calc(50% - 557px)", width: "670px" },
  { src: L("fog-5"), alt: "", speedX: 0.16, speedY: 0.105, speedZ: 0, rotation: 0, zIndex: 7, initialTop: "calc(50% + 360px)", initialLeft: "calc(50% + 40px)", width: "650px" },
  { src: L("mountain-7"), alt: "", speedX: 0.1, speedY: 0.1, speedZ: 0, rotation: 0.09, zIndex: 19, initialTop: "calc(50% + 223px)", initialLeft: "calc(50% + 495px)", width: "738px" },
  { src: L("mountain-6"), alt: "", speedX: 0.065, speedY: 0.05, speedZ: 0.05, rotation: 0.12, zIndex: 18, initialTop: "calc(50% + 120px)", initialLeft: "calc(50% + 590px)", width: "408px" },
  { src: L("fog-4"), alt: "", speedX: 0.135, speedY: 0.1, speedZ: 0, rotation: 0, zIndex: 11, initialTop: "calc(50% + 223px)", initialLeft: "calc(50% + 460px)", width: "590px", className: "opacity-50" },
  { src: L("mountain-5"), alt: "", speedX: 0.08, speedY: 0.05, speedZ: 0.13, rotation: 0.1, zIndex: 12, initialTop: "calc(50% + 320px)", initialLeft: "calc(50% + 230px)", width: "725px" },
  { src: L("fog-3"), alt: "", speedX: 0.11, speedY: 0.018, speedZ: 0, rotation: 0, zIndex: 113, initialTop: "calc(50% + 210px)", initialLeft: "calc(50% + 5px)", width: "1600px" },
  { src: L("mountain-4"), alt: "", speedX: 0.059, speedY: 0.024, speedZ: 0.35, rotation: 0.14, zIndex: 15, initialTop: "calc(50% + 196px)", initialLeft: "calc(50% - 698px)", width: "1100px" },
  { src: L("mountain-3"), alt: "", speedX: 0.04, speedY: 0.018, speedZ: 0.32, rotation: 0.05, zIndex: 20, initialTop: "calc(50% - 20px)", initialLeft: "calc(50% + 750px)", width: "630px" },
  { src: L("fog-2"), alt: "", speedX: 0.15, speedY: 0.0115, speedZ: 0, rotation: 0, zIndex: 16, initialTop: "calc(50% - 20px)", initialLeft: "calc(50% + 698px)", width: "1100px" },
  { src: L("mountain-2"), alt: "", speedX: 0.0235, speedY: 0.013, speedZ: 0.42, rotation: 0.15, zIndex: 17, initialTop: "calc(50% + 256px)", initialLeft: "calc(50% + 528px)", width: "800px" },
  { src: L("mountain-1"), alt: "", speedX: 0.027, speedY: 0.018, speedZ: 0.53, rotation: 0.2, zIndex: 18, initialTop: "calc(50% + 196px)", initialLeft: "calc(50% - 728px)", width: "1100px" },
  { src: L("fog-1"), alt: "", speedX: 0.12, speedY: 0.01, speedZ: 0, rotation: 0, zIndex: 21, initialTop: "calc(100% - 355px)", initialLeft: "calc(50% + 100px)", width: "1900px", className: "opacity-50" },
];

/* ------------------------------------------------------------------ preload
 * Fetch + decode every layer up front so the scene can appear in one go instead
 * of trees popping in one by one as each file arrives. Shared by the loading
 * screen (which waits on it) and the hero (which fades in when it resolves). */
let heroReady: Promise<void> | null = null;
let heroLoaded = 0;
const keepAlive: HTMLImageElement[] = [];
const progressListeners = new Set<(fraction: number) => void>();

export function preloadHeroLayers(layers: ParallaxLayer[] = defaultLayers): Promise<void> {
  if (heroReady) return heroReady;
  heroReady = Promise.all(
    layers.map(
      (layer) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.src = layer.src;
          keepAlive.push(img);
          const done = () => {
            heroLoaded++;
            progressListeners.forEach((fn) => fn(heroLoaded / layers.length));
            resolve();
          };
          img.decode().then(done, done); // a failed layer must never block the page
        }),
    ),
  ).then(() => undefined);
  return heroReady;
}

export function onHeroProgress(fn: (fraction: number) => void) {
  progressListeners.add(fn);
  fn(heroLoaded / defaultLayers.length);
  return () => {
    progressListeners.delete(fn);
  };
}

// Start downloading as soon as this module loads (before React even renders).
if (typeof window !== "undefined") preloadHeroLayers();

const TEXT_MOTION = { speedX: 0.07, speedY: 0.05, speedZ: 0.08, rotation: 0.04 };

function transformFor(
  motion: { speedX: number; speedY: number; speedZ: number; rotation: number },
  left: number,
  cursorX: number,
  x: number,
  y: number,
  rotateDeg: number,
) {
  const isInLeft = left < window.innerWidth / 2 ? 1 : -1;
  const z = (cursorX - left) * isInLeft * 0.1;
  return `perspective(2300px) translateZ(${z * motion.speedZ}px) rotateY(${
    rotateDeg * motion.rotation
  }deg) translateX(calc(-50% + ${-x * motion.speedX}px)) translateY(calc(-50% + ${
    y * motion.speedY
  }px))`;
}

export function ParallaxHero({
  layers = defaultLayers,
  title = "HERO",
  className,
  titleClassName,
  children,
}: ParallaxHeroProps) {
  const layerRefs = useRef<(HTMLImageElement | null)[]>([]);
  const textRef = useRef<HTMLDivElement>(null);

  const sectionRef = useRef<HTMLElement>(null);
  // Reveal every layer together once all are decoded (safety cap: never wait > 8s).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    preloadHeroLayers(layers).then(() => alive && setReady(true));
    const cap = window.setTimeout(() => alive && setReady(true), 8000);
    return () => {
      alive = false;
      window.clearTimeout(cap);
    };
  }, [layers]);

  useEffect(() => {
    // Mouse-driven only; touch devices get the static composition.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Cache each element's resting `left` so the frame loop never forces layout.
    let lefts: number[] = [];
    let textLeft = 0;
    const measure = () => {
      lefts = layerRefs.current.map((el) => (el ? parseFloat(getComputedStyle(el).left) : 0));
      textLeft = textRef.current ? parseFloat(getComputedStyle(textRef.current).left) : 0;
    };
    measure();

    // Pointer target vs. eased current position. One rAF loop eases toward the
    // target and goes to sleep once it settles — replaces the per-mousemove CSS
    // transitions, which restarted on every event and stuttered.
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };
    let frame = 0;
    let lastTime = 0;
    let visible = true;

    const render = () => {
      const cursorX = current.x;
      const x = cursorX - window.innerWidth / 2;
      const y = current.y - window.innerHeight / 2;
      const rotateDeg = (x / (window.innerWidth / 2)) * 20;
      layerRefs.current.forEach((el, i) => {
        if (el) el.style.transform = transformFor(layers[i], lefts[i], cursorX, x, y, rotateDeg);
      });
      if (textRef.current) {
        textRef.current.style.transform = transformFor(TEXT_MOTION, textLeft, cursorX, x, y, rotateDeg);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
      lastTime = now;
      // ~95% of the way in 450ms, independent of refresh rate.
      const k = 1 - Math.pow(0.001, dt);
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      render();
      if (Math.abs(target.x - current.x) < 0.1 && Math.abs(target.y - current.y) < 0.1) {
        frame = 0;
        lastTime = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      if (!visible) return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    // Ignore the mouse entirely once the hero has scrolled out of view.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (sectionRef.current) io.observe(sectionRef.current);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [layers]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative isolate h-screen w-full overflow-hidden bg-gradient-to-b from-[#a9d6d2] to-[#5f948f]",
        className,
      )}
    >
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-[100] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_65%,rgba(0,0,0,0.7))]" />

      {layers.map((layer, index) => (
        <img
          key={layer.src}
          ref={(el) => {
            layerRefs.current[index] = el;
          }}
          src={layer.src}
          alt={layer.alt}
          aria-hidden
          draggable={false}
          decoding="async"
          className={cn(
            "pointer-events-none absolute max-w-none select-none transition-opacity duration-700 ease-out will-change-transform",
            !ready && "!opacity-0",
            layer.className,
          )}
          style={{
            width: layer.width,
            top: layer.initialTop,
            left: layer.initialLeft,
            zIndex: layer.zIndex,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      <div
        ref={textRef}
        className={cn(
          "absolute text-center text-white transition-opacity duration-700 ease-out will-change-transform",
          !ready && "opacity-0",
        )}
        style={{
          zIndex: TITLE_Z,
          top: "calc(50% - 200px)",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <h1
          className={cn(
            "whitespace-nowrap font-black leading-[0.8] text-[20rem] max-lg:text-[15rem] max-md:text-[5.8rem] max-sm:text-[3.3rem]",
            titleClassName,
          )}
        >
          {title}
        </h1>
      </div>

      {children}
    </section>
  );
}

export default ParallaxHero;
