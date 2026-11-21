// @ts-nocheck — interaction shell for the little planet + courier scene.
// The 3D scene itself lives in ./orbit-scene and is code-split: three.js and the
// ~5 MB of models only download when this component first nears the viewport.
import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { useDeferredMount } from "@/lib/useDeferredMount";

const createMotion = () => ({
  planetAngle: 0,
  planetVelocity: -0.24, // start already rolling so the courier runs from the first frame
  dragTarget: 0,
  characterTarget: 0,
  characterAngle: 0,
  characterVelocity: 0,
  phase: 0,
  activity: 1,
  direction: 1,
  time: 0,
  dragging: false,
  lastInteraction: 0,
  pitchAngle: 0,
  pitchVelocity: 0,
  pitchTarget: 0,
});

const LazyPlanetCanvas = lazy(() => import("./orbit-scene"));

class SceneBoundary extends Component<{ children: React.ReactNode }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("3D planet failed:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ---------------------------------------------------------------- public */

/**
 * Draggable little planet with the courier running on top. Fills its parent;
 * the planet's centre sits on the bottom edge, so only the top half shows.
 * Loads its ~5 MB of models only when it first comes near the viewport, and
 * stops rendering whenever it is off screen or the tab is hidden.
 */
export function OrbitPlanet({ className = "" }: { className?: string }) {
  const motion = useRef(createMotion());
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef(null);
  const [visible, setVisible] = useState(false);
  // Download the 3D scene + models only after loading finishes and the section is close.
  const near = useDeferredMount(stage, { rootMargin: "300px 0px" });
  const [tabVisible, setTabVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTabVisible(!document.hidden);
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    change();
    query.addEventListener("change", change);
    const onVisibility = () => {
      setTabVisible(!document.hidden);
      if (document.hidden) {
        motion.current.dragging = false;
        drag.current = null;
        setDragging(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const seen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 });
    if (stage.current) {
      seen.observe(stage.current);
    }
    return () => {
      query.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", onVisibility);
      seen.disconnect();
    };
  }, []);

  const release = (id) => {
    if (drag.current?.id !== id) return;
    drag.current = null;
    motion.current.dragging = false;
    motion.current.lastInteraction = motion.current.time;
    setDragging(false);
  };

  const nudge = (direction) => {
    motion.current.planetVelocity += direction * 0.65;
    motion.current.lastInteraction = motion.current.time;
  };

  return (
    <div
      ref={stage}
      className={`relative size-full select-none outline-none ${dragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      // Vertical swipes still scroll the page on touch screens; horizontal drags turn the planet.
      style={{ touchAction: "pan-y" }}
      tabIndex={0}
      role="group"
      aria-roledescription="interactive 3D planet"
      aria-label="Drag or use the arrow keys to turn the planet"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        const m = motion.current;
        m.dragTarget = m.planetAngle;
        m.pitchTarget = m.pitchAngle;
        m.dragging = true;
        m.lastInteraction = m.time;
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        const dx = event.clientX - drag.current.x,
          dy = event.clientY - drag.current.y;
        const sensitivity = 5 / Math.max(360, event.currentTarget.clientWidth);
        const m = motion.current;
        m.dragTarget = Math.max(m.planetAngle - 0.5, Math.min(m.planetAngle + 0.5, m.dragTarget + dx * sensitivity));
        m.pitchTarget = Math.max(
          m.pitchAngle - 0.4,
          Math.min(m.pitchAngle + 0.4, m.pitchTarget + dy * sensitivity * 0.7),
        );
        drag.current.x = event.clientX;
        drag.current.y = event.clientY;
        m.lastInteraction = m.time;
      }}
      onPointerUp={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
      onLostPointerCapture={(event) => release(event.pointerId)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          nudge(event.key === "ArrowRight" ? 1 : -1);
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          motion.current.pitchVelocity += event.key === "ArrowDown" ? 0.4 : -0.4;
          motion.current.lastInteraction = motion.current.time;
        }
      }}
    >
      {near && (
        <SceneBoundary>
          <Suspense fallback={null}>
            <LazyPlanetCanvas motion={motion} active={visible && tabVisible} auto reduced={reduced} onReady={setReady} />
          </Suspense>
        </SceneBoundary>
      )}
      {!ready && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-[18%] flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/40"
        >
          <span className="size-3.5 animate-spin rounded-full border border-white/15 border-t-white/60" />
          The little world is taking shape…
        </div>
      )}
    </div>
  );
}

export default OrbitPlanet;
