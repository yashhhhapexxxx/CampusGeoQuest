import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";

export type Difficulty = "Easy" | "Medium" | "Tough";

export interface OrbitStation {
  n: string;
  title: string;
  problem: string;
  how: string;
  difficulty: Difficulty;
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Easy: "border-[#7FA35B]/40 bg-[#7FA35B]/15 text-[#B5D98A]",
  Medium: "border-[#D9A441]/40 bg-[#D9A441]/15 text-[#E8C27A]",
  Tough: "border-[#C8703F]/40 bg-[#C8703F]/15 text-[#E39A6E]",
};

const CYCLE_MS = 3600;
/** Node ring radius as a fraction of the square's width. */
const NODE_R = 0.4;
/** Gap (px) from a node's centre to its label, clear of the active halo. */
const LABEL_GAP = 54;

/** Push each label outward from its node: above/below at the poles, beside elsewhere. */
function labelPlacement(angle: number): {
  transform: string;
  align: "left" | "right" | "center";
} {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  if (Math.abs(cos) < 0.35) {
    return sin < 0
      ? {
          transform: `translate(-50%, calc(-100% - ${LABEL_GAP - 14}px))`,
          align: "center",
        }
      : { transform: `translate(-50%, ${LABEL_GAP - 14}px)`, align: "center" };
  }
  return cos > 0
    ? { transform: `translate(${LABEL_GAP}px, -50%)`, align: "left" }
    : {
        transform: `translate(calc(-100% - ${LABEL_GAP}px), -50%)`,
        align: "right",
      };
}

// SVG geometry (viewBox 0 0 1000 1000).
const C = 500;
const R = NODE_R * 1000;
const CIRC = 2 * Math.PI * R;

/** Circular caption that orbits the campus lens. */
const LENS_CAPTION =
  "IIT ROORKEE • MAIN BUILDING • EST. 1847 • THE TRAIL STARTS HERE • ";
const CAPTION_R = 326;

const angleFor = (i: number, total: number) =>
  (i / total) * Math.PI * 2 - Math.PI / 2;

function polar(r: number, angle: number) {
  return {
    x: 50 + r * 100 * Math.cos(angle),
    y: 50 + r * 100 * Math.sin(angle),
  };
}

export function StationOrbit({ stations }: { stations: OrbitStation[] }) {
  const total = stations.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { margin: "-20% 0px -20% 0px" });

  useEffect(() => {
    if (paused || !inView) return;
    const id = setInterval(() => setActive((a) => (a + 1) % total), CYCLE_MS);
    return () => clearInterval(id);
  }, [paused, inView, total]);

  const station = stations[active];
  // Arc from station 01 (top) through the active station.
  const progress = total > 1 ? active / total : 0;

  return (
    <div className="flex flex-col items-center">
      <div
        ref={rootRef}
        className="relative aspect-square w-[min(92vw,780px)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[12%] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(127,163,91,0.28) 0%, rgba(127,163,91,0.08) 45%, transparent 70%)",
          }}
        />

        {/* Campus lens: IIT Roorkee Main Building inside the hub ring (r=300 of 1000 → inset 20%).
            Each station change pans/zooms the photo a little, so the lens drifts across campus.
            Photo: "Main(Administrative)Building IIT-Roorkee" by Sidbij, CC BY-SA 4.0, via Wikimedia Commons. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[20%] overflow-hidden rounded-full"
          style={{
            boxShadow:
              "inset 0 0 60px rgba(8,10,9,0.9), 0 0 50px rgba(127,163,91,0.18)",
          }}
        >
          <motion.img
            src="/images/iitr-lens.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: "center 30%" }} // forest-green duotone baked into the file (no live blend modes)
            initial={false}
            animate={{
              scale: 1.12 + (active % 3) * 0.04,
              x: `${(active - (total - 1) / 2) * 1.2}%`,
              y: `${((active % 2) - 0.5) * 3}%`,
            }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Keep the centre dark so the station number stays readable; let the building show at the rim. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, rgba(8,10,9,0.82) 0%, rgba(8,10,9,0.6) 42%, rgba(8,10,9,0.15) 78%, rgba(8,10,9,0.35) 100%)",
            }}
          />
        </div>

        {/* Spinning layers live in their own composited divs: rotating a <g> inside
            one big SVG repaints the whole SVG every frame; rotating a div is a GPU transform. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[spin_60s_linear_infinite] will-change-transform"
        >
          <svg viewBox="0 0 1000 1000" className="size-full overflow-visible">
            {Array.from({ length: 120 }, (_, i) => {
              const a = (i / 120) * Math.PI * 2;
              const long = i % 12 === 0;
              const r1 = 478;
              const r2 = long ? 455 : 468;
              return (
                <line
                  key={i}
                  x1={C + r1 * Math.cos(a)}
                  y1={C + r1 * Math.sin(a)}
                  x2={C + r2 * Math.cos(a)}
                  y2={C + r2 * Math.sin(a)}
                  stroke="white"
                  strokeOpacity={long ? 0.35 : 0.12}
                  strokeWidth={long ? 2 : 1}
                />
              );
            })}
          </svg>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[spin_45s_linear_infinite] will-change-transform [animation-direction:reverse]"
        >
          <svg viewBox="0 0 1000 1000" className="size-full overflow-visible">
            <circle
              cx={C}
              cy={C}
              r={432}
              fill="none"
              stroke="white"
              strokeOpacity={0.14}
              strokeWidth={1.5}
              strokeDasharray="2 14"
            />
          </svg>
        </div>
        {/* Rotating campus caption around the lens (desktop only — too small on phones) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden animate-[spin_80s_linear_infinite] will-change-transform md:block"
        >
          <svg viewBox="0 0 1000 1000" className="size-full overflow-visible">
            <defs>
              <path
                id="lens-caption-path"
                d={`M ${C} ${C - CAPTION_R} a ${CAPTION_R} ${CAPTION_R} 0 1 1 0 ${CAPTION_R * 2} a ${CAPTION_R} ${CAPTION_R} 0 1 1 0 ${-CAPTION_R * 2}`}
              />
            </defs>

            <text
              className="font-impact"
              fontSize={19}
              letterSpacing={3}
              fill="white"
              fillOpacity={0.38}
            >
              <textPath
                href="#lens-caption-path"
                textLength={2 * Math.PI * CAPTION_R - 6}
                lengthAdjust="spacing"
              >
                {LENS_CAPTION.repeat(2)}
              </textPath>
            </text>
          </svg>
        </div>

        <svg
          aria-hidden
          viewBox="0 0 1000 1000"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id="orbit-arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#B5D98A" />
              <stop offset="55%" stopColor="#E9EEEC" />
              <stop offset="100%" stopColor="#7FA35B" />
            </linearGradient>
          </defs>

          {/* Inner hub ring */}
          <circle
            cx={C}
            cy={C}
            r={300}
            fill="none"
            stroke="white"
            strokeOpacity={0.06}
            strokeWidth={1}
          />

          {/* Track */}
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="white"
            strokeOpacity={0.1}
            strokeWidth={2}
          />

          {/* Progress arc 01 → active */}
          <motion.circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="url(#orbit-arc)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            transform={`rotate(-90 ${C} ${C})`}
            initial={false}
            animate={{ strokeDashoffset: CIRC * (1 - progress) }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: "drop-shadow(0 0 8px rgba(181,217,138,0.6))" }}
          />

          {/* Workflow chevrons between stations */}
          {stations.map((_, i) => {
            const a = angleFor(i + 0.5, total);
            const x = C + R * Math.cos(a);
            const y = C + R * Math.sin(a);
            const deg = (a * 180) / Math.PI + 90;
            const lit = i < active;
            return (
              <path
                key={i}
                d="M -7 -8 L 3 0 L -7 8"
                transform={`translate(${x} ${y}) rotate(${deg})`}
                fill="none"
                stroke={lit ? "#D8F0BE" : "white"}
                strokeOpacity={lit ? 0.95 : 0.3}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>

        {/* Comet orbiting the track */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[spin_9s_linear_infinite] will-change-transform"
        >
          <svg viewBox="0 0 1000 1000" className="size-full overflow-visible">
            <defs>
              <radialGradient id="orbit-comet">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#D8F0BE" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7FA35B" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx={C} cy={C - R} r={26} fill="url(#orbit-comet)" />
            <circle cx={C} cy={C - R} r={5} fill="white" />
          </svg>
        </div>

        {/* Station nodes */}
        {stations.map((s, i) => {
          const a = angleFor(i, total);
          const p = polar(NODE_R, a);
          const label = labelPlacement(a);
          const isActive = i === active;
          const done = i < active;
          return (
            <div key={s.n}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Station ${s.n}: ${s.title}`}
                aria-pressed={isActive}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                {isActive && (
                  <motion.span
                    aria-hidden
                    layoutId="orbit-active-halo"
                    className="absolute inset-[-10px] rounded-full border border-[#B5D98A]/60"
                    style={{
                      boxShadow:
                        "0 0 30px rgba(181,217,138,0.55), inset 0 0 18px rgba(181,217,138,0.25)",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.span
                  animate={{ scale: isActive ? 1.18 : 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className={`relative grid size-11 place-items-center rounded-full border backdrop-blur-sm transition-colors duration-300 md:size-16 ${
                    isActive
                      ? "border-white/70 bg-[#1b2a20]"
                      : done
                        ? "border-[#B5D98A]/50 bg-[#141c17] group-hover:border-white/60"
                        : "border-white/20 bg-[#0e1110] group-hover:border-white/50"
                  }`}
                >
                  <span className="text-shine text-shine-static font-impact text-base leading-none md:text-2xl">
                    {s.n}
                  </span>
                </motion.span>
              </button>

              <span
                aria-hidden
                className={`pointer-events-none absolute hidden w-max max-w-40 font-impact text-sm uppercase leading-tight tracking-wide transition-colors duration-300 md:block ${
                  isActive ? "text-white" : "text-white/40"
                }`}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: label.transform,
                  textAlign: label.align,
                }}
              >
                {s.title}
              </span>
            </div>
          );
        })}

        {/* Hub */}
        <div className="pointer-events-none absolute inset-[22%] flex items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={station.n}
              initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <span className="text-[9px] uppercase tracking-[0.35em] text-white/50 md:text-[10px]">
                Station
              </span>
              <span className="text-shine font-impact text-6xl leading-[0.9] md:text-[8.5rem]">
                {station.n}
              </span>
              <h3 className="text-shine mt-1 font-impact text-xl uppercase leading-none tracking-wide md:mt-2 md:text-4xl">
                {station.title}
              </h3>
              <span
                className={`mt-3 rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.2em] ${DIFFICULTY_STYLE[station.difficulty]}`}
              >
                {station.difficulty}
              </span>
              <p className="mt-4 hidden max-w-[19rem] text-sm leading-relaxed text-white/75 md:block">
                {station.problem}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Detail line under the ring (always visible; the hub only has room for it on desktop) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={station.n}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="mt-6 max-w-xl px-2 text-center md:mt-14"
        >
          <p className="text-sm leading-relaxed text-white/80 md:hidden">
            {station.problem}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary md:mt-0 md:text-sm">
            {station.how}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
