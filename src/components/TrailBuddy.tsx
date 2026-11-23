import { useEffect, useMemo, useRef, useState } from "react";
import { animate, AnimatePresence, motion } from "motion/react";
import { Map, Minus } from "lucide-react";

/**
 * "Pip's Maze" — a small game-style trail box for the /quest page.
 * An original cartoon geologist (Pip) walks a puzzle path through a hedge maze.
 * Each solved station: Pip walks to the next stop, jumps, waves, opens a chest
 * (+1 gem) and, at milestones, earns new gear with a confetti burst.
 * `position` = stops reached (0 = start … 10 = finished).
 */

const CELL = 32;
const GRID = 7;
const SIZE = CELL * GRID; // 224

// Serpentine puzzle path through the maze (col, row)
const CELLS: [number, number][] = [
  ...[0, 1, 2, 3, 4, 5, 6].map((c) => [c, 6] as [number, number]),
  [6, 5],
  ...[6, 5, 4, 3, 2, 1, 0].map((c) => [c, 4] as [number, number]),
  [0, 3],
  ...[0, 1, 2, 3, 4, 5, 6].map((c) => [c, 2] as [number, number]),
  [6, 1],
  ...[6, 5, 4, 3, 2].map((c) => [c, 0] as [number, number]),
].filter((c, i, a) => i === 0 || c[0] !== a[i - 1][0] || c[1] !== a[i - 1][1]) as [number, number][];

const STOP_CELL = [0, 3, 6, 9, 12, 15, 18, 21, 24, 26, 28]; // start + 10 stations
const centre = ([c, r]: [number, number]) => [c * CELL + CELL / 2, r * CELL + CELL / 2] as [number, number];
const STOPS = STOP_CELL.map((i) => centre(CELLS[i]));
const PATH = CELLS.map((c, i) => `${i ? "L" : "M"} ${centre(c)[0]} ${centre(c)[1]}`).join(" ");
const onPath = new Set(CELLS.map(([c, r]) => `${c},${r}`));

const GEAR: Record<number, string> = {
  1: "Hard hat",
  3: "Rock hammer",
  5: "Backpack",
  7: "Lantern",
  9: "Trail flag",
  10: "Golden crown",
};

type Puff = { id: number; x: number; y: number };
type Spark = { id: number; x: number; y: number; dx: number; dy: number; c: string; r: number };

function Pip({ level, walking, facing, jump, wave, blink }: { level: number; walking: boolean; facing: 1 | -1; jump: number; wave: boolean; blink: boolean }) {
  const has = (n: number) => level >= n;
  return (
    <motion.g animate={{ y: jump ? [0, -9, 0] : 0 }} transition={{ duration: 0.45, ease: "easeOut" }} key={jump}>
      <g transform={`scale(${facing} 1)`}>
        <ellipse cx="0" cy="11" rx="8" ry="2.4" fill="#000" opacity="0.35" />
        <motion.g animate={walking ? { y: [0, -2.4, 0] } : { y: [0, -1, 0] }} transition={{ duration: walking ? 0.3 : 1.8, repeat: Infinity, ease: "easeInOut" }}>
          {/* boots */}
          <motion.ellipse cx="-3.5" cy="10" rx="2.6" ry="1.6" fill="#4a2f1c" animate={walking ? { x: [-1.5, 1.5, -1.5] } : { x: 0 }} transition={{ duration: 0.3, repeat: Infinity }} />
          <motion.ellipse cx="3.5" cy="10" rx="2.6" ry="1.6" fill="#4a2f1c" animate={walking ? { x: [1.5, -1.5, 1.5] } : { x: 0 }} transition={{ duration: 0.3, repeat: Infinity }} />
          {has(5) && <rect x="-11" y="-5" width="5.5" height="10" rx="2.4" fill="#C8703F" stroke="#6d3a1f" strokeWidth="0.8" />}
          {/* round body */}
          <circle cx="0" cy="0" r="9.5" fill="#f08a4b" stroke="#a24f1f" strokeWidth="1" />
          {/* overalls */}
          <path d="M -8.2 3 Q 0 12.5 8.2 3 L 8.2 5 Q 0 13 -8.2 5 Z" fill="#3f6fa0" />
          <path d="M -6.5 3.4 L 6.5 3.4 L 5.6 8.2 Q 0 11 -5.6 8.2 Z" fill="#4f82b8" />
          <circle cx="-4" cy="4" r="0.8" fill="#ffd27a" />
          <circle cx="4" cy="4" r="0.8" fill="#ffd27a" />
          {/* face */}
          <g>
            {blink ? (
              <>
                <path d="M -4.4 -2.6 h 2.8" stroke="#1b1b1b" strokeWidth="1" strokeLinecap="round" />
                <path d="M 1.6 -2.6 h 2.8" stroke="#1b1b1b" strokeWidth="1" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="-3" cy="-2.6" rx="1.9" ry="2.3" fill="#fff" />
                <ellipse cx="3" cy="-2.6" rx="1.9" ry="2.3" fill="#fff" />
                <circle cx="-2.5" cy="-2.3" r="1.1" fill="#1b1b1b" />
                <circle cx="3.5" cy="-2.3" r="1.1" fill="#1b1b1b" />
                <circle cx="-2.1" cy="-2.8" r="0.4" fill="#fff" />
                <circle cx="3.9" cy="-2.8" r="0.4" fill="#fff" />
              </>
            )}
            <path d="M -2 1 Q 0 2.8 2 1" stroke="#5a2410" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <circle cx="-5.6" cy="0.4" r="1.2" fill="#ff6f61" opacity="0.5" />
            <circle cx="5.6" cy="0.4" r="1.2" fill="#ff6f61" opacity="0.5" />
          </g>
          {/* waving arm */}
          <motion.g animate={wave ? { rotate: [0, -40, 10, -40, 0] } : { rotate: 0 }} transition={{ duration: 0.9 }} style={{ originX: "7px", originY: "0px" }}>
            <path d="M 7.5 0 q 4 -1 5.5 -5" stroke="#f08a4b" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <circle cx="13" cy="-5.2" r="1.6" fill="#f6c08f" />
          </motion.g>
          {/* hard hat */}
          {has(1) && (
            <g>
              <path d="M -8 -6.5 Q 0 -17 8 -6.5 Z" fill="#E8C547" stroke="#9a7c1c" strokeWidth="0.8" />
              <rect x="-9.6" y="-7.6" width="19.2" height="2.2" rx="1.1" fill="#E8C547" stroke="#9a7c1c" strokeWidth="0.5" />
              <rect x="-1" y="-15" width="2" height="4" rx="1" fill="#fff6c8" />
            </g>
          )}
          {has(10) && (
            <motion.path d="M -6 -15 L -3.6 -21 L 0 -16.5 L 3.6 -21 L 6 -15 Z" fill="#ffd54a" stroke="#b8860b" strokeWidth="0.6" animate={{ y: [0, -1, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
          )}
          {has(3) && (
            <motion.g animate={walking ? { rotate: [-14, 14, -14] } : { rotate: 0 }} transition={{ duration: 0.3, repeat: Infinity }} style={{ originX: "-8px", originY: "2px" }}>
              <rect x="-10.6" y="1" width="1.6" height="9" rx="0.8" fill="#8a5a33" />
              <rect x="-13" y="0" width="6.4" height="2.4" rx="0.6" fill="#9aa1a6" />
            </motion.g>
          )}
          {has(7) && (
            <g>
              <circle cx="-12" cy="7" r="9" fill="#ffd27a" opacity="0.14" />
              <rect x="-13.4" y="5" width="2.8" height="3.6" rx="0.8" fill="#ffd27a" />
            </g>
          )}
          {has(9) && (
            <g>
              <rect x="8.6" y="-22" width="0.9" height="18" fill="#e8dcc4" />
              <motion.path d="M 9.5 -22 L 16 -19.5 L 9.5 -17 Z" fill="#B5D98A" animate={{ skewY: [0, 10, 0] }} transition={{ duration: 0.7, repeat: Infinity }} />
            </g>
          )}
        </motion.g>
      </g>
    </motion.g>
  );
}

function Chest({ x, y, state, n }: { x: number; y: number; state: "locked" | "next" | "open"; n: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {state === "next" && (
        <>
          <motion.circle r="11" fill="#ffd27a" animate={{ opacity: [0.35, 0.05, 0.35], r: [9, 14, 9] }} transition={{ duration: 1.4, repeat: Infinity }} />
          <motion.rect x="-1.5" y="-40" width="3" height="34" fill="url(#tb-beam)" animate={{ opacity: [0.9, 0.4, 0.9] }} transition={{ duration: 1.4, repeat: Infinity }} />
        </>
      )}
      {/* chest body */}
      <rect x="-7" y="-3" width="14" height="9" rx="1.5" fill={state === "open" ? "#a5632f" : "#7a4a24"} stroke="#3d2410" strokeWidth="0.8" />
      {state === "open" ? (
        <>
          <path d="M -7 -3 L -5 -9 L 5 -9 L 7 -3 Z" fill="#a5632f" stroke="#3d2410" strokeWidth="0.8" />
          <motion.path d="M -2.6 -4 L 0 -8 L 2.6 -4 L 0 -1.5 Z" fill="#7ee0ff" stroke="#e9fbff" strokeWidth="0.5" animate={{ y: [0, -1.5, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        </>
      ) : (
        <>
          <rect x="-7.4" y="-6" width="14.8" height="4" rx="1.6" fill="#8c5a2e" stroke="#3d2410" strokeWidth="0.8" />
          {state === "locked" ? (
            <g>
              <rect x="-2.2" y="-1.5" width="4.4" height="3.6" rx="0.6" fill="#c9ccd1" />
              <path d="M -1.3 -1.5 v -1.4 a 1.3 1.3 0 0 1 2.6 0 v 1.4" stroke="#c9ccd1" strokeWidth="0.8" fill="none" />
            </g>
          ) : (
            <text y="3.2" textAnchor="middle" fontSize="6" fontWeight="800" fill="#ffd27a">?</text>
          )}
        </>
      )}
      <text y="15" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={state === "open" ? "#B5D98A" : "#e8dcc4"} opacity="0.9">
        {n}
      </text>
    </g>
  );
}

export function TrailBuddy({ position }: { position: number }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState({ x: STOPS[0][0], y: STOPS[0][1] });
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [level, setLevel] = useState(position);
  const [jump, setJump] = useState(0);
  const [wave, setWave] = useState(false);
  const [blink, setBlink] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [mini, setMini] = useState(false);
  const progress = useRef(0);
  const stopLens = useRef<number[]>([]);
  const lastPuff = useRef(0);
  const uid = useRef(0);

  // Idle blink
  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  // Path length at each stop (path is a polyline through cell centres)
  useEffect(() => {
    const lens: number[] = [];
    let acc = 0;
    let k = 0;
    for (let i = 0; i < CELLS.length; i++) {
      if (i > 0) acc += CELL;
      if (STOP_CELL[k] === i) {
        lens.push(acc);
        k++;
      }
    }
    stopLens.current = lens;
    progress.current = lens[Math.min(10, position)];
    const p = pathRef.current?.getPointAtLength(progress.current);
    if (p) setPt({ x: p.x, y: p.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const burst = (x: number, y: number, big: boolean) => {
    const colors = ["#ffd27a", "#B5D98A", "#7ee0ff", "#f08a4b", "#ffffff"];
    const n = big ? 26 : 12;
    const s: Spark[] = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const v = (big ? 26 : 16) * (0.6 + Math.random() * 0.6);
      return { id: uid.current++, x, y, dx: Math.cos(a) * v, dy: Math.sin(a) * v - (big ? 8 : 4), c: colors[i % colors.length], r: big ? 1.8 : 1.3 };
    });
    setSparks((old) => [...old, ...s]);
    window.setTimeout(() => setSparks((old) => old.filter((q) => !s.includes(q))), 1100);
  };

  // Walk to the new stop when `position` changes
  useEffect(() => {
    const path = pathRef.current;
    const lens = stopLens.current;
    if (!path || !lens.length) return;
    const target = lens[Math.min(10, Math.max(0, position))];
    if (Math.abs(target - progress.current) < 0.5) {
      setLevel(position);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setWalking(true);
    const controls = animate(progress.current, target, {
      duration: reduced ? 0 : Math.min(4, 1 + Math.abs(target - progress.current) / 70),
      ease: "easeInOut",
      onUpdate: (l) => {
        const prev = progress.current;
        progress.current = l;
        const p = path.getPointAtLength(l);
        const ahead = path.getPointAtLength(Math.min(path.getTotalLength(), l + (l >= prev ? 1 : -1)));
        if (Math.abs(ahead.x - p.x) > 0.05) setFacing(ahead.x >= p.x ? 1 : -1);
        setPt({ x: p.x, y: p.y });
        const now = performance.now();
        if (now - lastPuff.current > 140) {
          lastPuff.current = now;
          const id = uid.current++;
          setPuffs((old) => [...old.slice(-6), { id, x: p.x, y: p.y + 6 }]);
        }
      },
      onComplete: () => {
        setWalking(false);
        setLevel(position);
        setJump((j) => j + 1);
        setWave(true);
        window.setTimeout(() => setWave(false), 950);
        const [sx, sy] = STOPS[Math.min(10, position)];
        const gear = GEAR[position];
        burst(sx, sy, Boolean(gear));
        if (gear) {
          setToast(gear);
          window.setTimeout(() => setToast(null), 2800);
        }
      },
    });
    return () => controls.stop();
  }, [position]);

  const hedges = useMemo(() => {
    const out: { x: number; y: number; k: number }[] = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!onPath.has(`${c},${r}`)) out.push({ x: c * CELL, y: r * CELL, k: (c * 7 + r * 3) % 5 });
    return out;
  }, []);

  if (mini) {
    return (
      <button
        type="button"
        onClick={() => setMini(false)}
        aria-label="Show Pip's maze"
        className="relative z-40 mx-auto mt-6 grid size-12 place-items-center rounded-2xl border border-white/15 bg-[#0f1512]/90 text-[#B5D98A] shadow-xl backdrop-blur xl:fixed xl:right-6 xl:top-1/2 xl:mt-0"
      >
        <Map size={20} />
      </button>
    );
  }

  return (
    <aside
      aria-label={`Pip's maze: ${position} of 10 stations reached`}
      className="relative z-40 mx-auto mt-6 w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-[#5b3f2a] bg-[#1a1410] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_0_0_2px_#8a6a45] xl:fixed xl:right-6 xl:top-1/2 xl:mt-0 xl:w-[270px] xl:-translate-y-1/2 2xl:right-12 2xl:w-[300px]"
    >
      {/* header: title, gems, minimise */}
      <div className="flex items-center justify-between bg-[#2a1f16] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffd27a] ">Pip’s Maze</p>
        <div className="flex items-center gap-2">
          <motion.span key={level} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-[#7ee0ff]">
            ◆ {level}
          </motion.span>
          <button type="button" onClick={() => setMini(true)} aria-label="Minimise Pip's maze" className="text-white/50 hover:text-white">
            <Minus size={14} />
          </button>
        </div>
      </div>

      <svg viewBox={`-6 -6 ${SIZE + 12} ${SIZE + 12}`} className="block w-full">
        <defs>
          <linearGradient id="tb-beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0" />
            <stop offset="1" stopColor="#ffd27a" stopOpacity="0.9" />
          </linearGradient>
          <pattern id="tb-sand" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#d8bf8a" />
            <circle cx="2" cy="2" r="0.7" fill="#c4a86f" />
            <circle cx="6" cy="5" r="0.6" fill="#e6d2a3" />
          </pattern>
        </defs>
        <rect x="-6" y="-6" width={SIZE + 12} height={SIZE + 12} fill="#3b2a1d" />
        {/* path tiles */}
        {CELLS.map(([c, r], i) => (
          <rect key={i} x={c * CELL + 1} y={r * CELL + 1} width={CELL - 2} height={CELL - 2} rx="4" fill="url(#tb-sand)" opacity={i <= STOP_CELL[Math.min(10, level)] ? 1 : 0.75} />
        ))}
        {/* hedge walls */}
        {hedges.map((h, i) => (
          <g key={i}>
            <rect x={h.x + 1} y={h.y + 1} width={CELL - 2} height={CELL - 2} rx="7" fill="#2f5a34" />
            <circle cx={h.x + 9 + h.k} cy={h.y + 10} r="6" fill="#3f7343" />
            <circle cx={h.x + 21 - h.k} cy={h.y + 19} r="7" fill="#4b8550" />
            <circle cx={h.x + 12} cy={h.y + 22} r="3" fill="#5c9a5f" opacity="0.7" />
            {h.k === 2 && <circle cx={h.x + 20} cy={h.y + 9} r="1.6" fill="#ff8fa3" />}
          </g>
        ))}
        {/* path guide */}
        <path ref={pathRef} d={PATH} fill="none" stroke="transparent" strokeWidth="1" />
        <motion.path d={PATH} fill="none" stroke="#8a6a45" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" opacity="0.6" animate={{ strokeDashoffset: [0, -16] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />

        {/* start marker */}
        <text x={STOPS[0][0]} y={STOPS[0][1] + 4} textAnchor="middle" fontSize="7" fontWeight="800" fill="#5b3f2a">GO</text>
        {/* chests */}
        {STOPS.slice(1).map(([x, y], i) => {
          const n = i + 1;
          const state = level >= n ? "open" : n === position + 1 && !walking ? "next" : "locked";
          return n === 10 ? (
            <g key={n} transform={`translate(${x} ${y})`}>
              {state === "next" && <motion.circle r="12" fill="#ffd54a" animate={{ opacity: [0.4, 0.05, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} />}
              <path d="M -6 -8 h 12 v 4 a 6 6 0 0 1 -12 0 Z" fill={state === "open" ? "#ffd54a" : "#8c7a3a"} stroke="#6b5310" strokeWidth="0.8" />
              <rect x="-1.2" y="1.6" width="2.4" height="4" fill={state === "open" ? "#ffd54a" : "#8c7a3a"} />
              <rect x="-4.5" y="5.4" width="9" height="2.2" rx="1" fill={state === "open" ? "#ffd54a" : "#8c7a3a"} />
              <text y="16" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#e8dcc4">10</text>
            </g>
          ) : (
            <Chest key={n} x={x} y={y} n={n} state={state} />
          );
        })}

        {/* dust puffs */}
        <AnimatePresence>
          {puffs.map((p) => (
            <motion.circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r="2"
              fill="#e8dcc4"
              initial={{ opacity: 0.7, scale: 0.6 }}
              animate={{ opacity: 0, scale: 2.4, y: -4 }}
              transition={{ duration: 0.6 }}
              onAnimationComplete={() => setPuffs((old) => old.filter((q) => q.id !== p.id))}
            />
          ))}
        </AnimatePresence>

        {/* Pip */}
        <g transform={`translate(${pt.x} ${pt.y - 8}) scale(1.4)`}>
          <Pip level={level} walking={walking} facing={facing} jump={jump} wave={wave} blink={blink} />
        </g>

        {/* sparkles / confetti */}
        {sparks.map((s) => (
          <motion.circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill={s.c} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: s.dx, y: [0, s.dy, s.dy + 18], opacity: [1, 1, 0] }} transition={{ duration: 1, ease: "easeOut" }} />
        ))}
      </svg>

      {/* footer: level bar */}
      <div className="flex items-center gap-2 bg-[#2a1f16] px-3 py-2">
        <span className="text-[10px] font-bold text-[#ffd27a]">LV {level}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7FA35B] to-[#ffd27a]" animate={{ width: `${level * 10}%` }} transition={{ duration: 0.8 }} />
        </div>
        <span className="text-[10px] text-white/60">{level}/10</span>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="absolute inset-x-3 top-11 rounded-xl border-2 border-[#ffd27a] bg-[#2a1f16] px-2 py-1.5 text-center text-[11px] font-bold text-[#ffd27a] shadow-lg"
          >
            ⬆ LEVEL UP! New gear: {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

export default TrailBuddy;
