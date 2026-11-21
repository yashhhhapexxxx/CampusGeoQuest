"use client";
import { useRef } from "react";
import { SeismicTap } from "./SeismicTap";
import { TopoBackground } from "./TopoBackground";
import { useDeferredMount } from "@/lib/useDeferredMount";
import { StationOrbit, type Difficulty } from "./StationOrbit";

interface Module {
  n: string;
  title: string;
  problem: string;
  how: string;
  difficulty: Difficulty;
  span: string;
}

/**
 * Ten stations, ten pieces of the Earth's story. Three easy, three medium,
 * four tough — every card is a real geological term rather than a riddle.
 */
const MODULES: Module[] = [
  {
    n: "01",
    title: "Strata",
    problem: "Time is stacked in layers.",
    how: "Sedimentary layers build up one after another, oldest at the bottom. Grain size, colour, and fossils mark changes in the environment.",
    difficulty: "Easy",
    span: "md:col-span-2",
  },
  {
    n: "02",
    title: "Fossils",
    problem: "Life leaves a signature in stone.",
    how: "Bones, shells, and traces are buried in sediment and slowly replaced or preserved. The same fossil in two layers links them to the same period.",
    difficulty: "Easy",
    span: "",
  },
  {
    n: "03",
    title: "Weathering & Erosion",
    problem: "The landscape is being edited right now.",
    how: "Water, wind, and temperature break rock down and carry the pieces away. Rounded grains, cracked surfaces, and sediment fans record the process.",
    difficulty: "Easy",
    span: "",
  },
  {
    n: "04",
    title: "Folds",
    problem: "Layers that should be flat are bent.",
    how: "Rock folds when the crust is squeezed slowly over millions of years. Read the bend: anticlines arch up, synclines sag down, and the axis points to the pressure.",
    difficulty: "Medium",
    span: "md:col-span-2",
  },
  {
    n: "05",
    title: "Faults",
    problem: "The ground cracked and one side moved.",
    how: "A fault is a fracture where blocks of crust slide past each other. Compare the offset layers across the break to tell a normal, reverse, or strike-slip fault.",
    difficulty: "Medium",
    span: "",
  },
  {
    n: "06",
    title: "Sedimentary Basins",
    problem: "The ground sank and filled with sediment.",
    how: "A basin subsides slowly while eroded material collects in it. The fill thickens toward the centre and records the region's sinking history.",
    difficulty: "Medium",
    span: "",
  },
  {
    n: "07",
    title: "Unconformity",
    problem: "Two rock stories meet with a gap between them.",
    how: "Erosion can remove millions of years of rock before the next layer is deposited. A surface cutting across older tilted layers is the missing chapter.",
    difficulty: "Tough",
    span: "md:col-span-2",
  },
  {
    n: "08",
    title: "Cross-bedding",
    problem: "Tilted lines hide inside flat layers.",
    how: "Moving water or wind piles sediment on a sloping surface. Each new layer cuts across the last, preserving the direction and strength of the ancient current.",
    difficulty: "Tough",
    span: "",
  },
  {
    n: "09",
    title: "Metamorphism",
    problem: "Rock is cooked and squeezed into something new.",
    how: "Heat and pressure rearrange minerals in the solid state. Foliation, recrystallisation, and index minerals record how deep the rock once travelled.",
    difficulty: "Tough",
    span: "",
  },
  {
    n: "10",
    title: "Orogeny",
    problem: "Mountains are built by collision.",
    how: "Continents collide, crust thickens, and rocks are folded, faulted, and uplifted into a mountain belt. The roots of the range are exposed by later erosion.",
    difficulty: "Tough",
    span: "",
  },
];

export function FieldGuide() {
  const sectionRef = useRef<HTMLElement>(null);
  // Start the contour shader only after loading finishes and the section is close.
  const showTopo = useDeferredMount(sectionRef);

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden px-6 py-28 md:py-32">
      {/* Living topographic map across the whole section. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {showTopo && <TopoBackground />}
      </div>

      {/* Tap anywhere in this section: a mini earthquake ripples out from the finger. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        <SeismicTap />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <div className="text-center">
          <p className="tabular text-[10px] uppercase tracking-[0.3em] text-text-secondary">
            / 03 · The Field Guide
          </p>
          <h2 className="text-shine mx-auto mt-5 max-w-4xl font-impact text-4xl uppercase leading-[1] tracking-wide md:text-6xl">
            Ten stations. One loop.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-text-secondary md:text-base">
            Each stop is a real piece of the Earth's story. Tap a station to read it, or let the
            trail turn on its own.
          </p>
        </div>

        <div className="mt-12 md:mt-16">
          <StationOrbit stations={MODULES} />
        </div>
      </div>
    </section>
  );
}
