"use client";

import { motion } from "motion/react";
import { TextScramble } from "./text-scramble";
import { BGPattern } from "./bg-pattern";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#08080A] overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "linear" }}
    >
      {/* Blurred IIT Roorkee Main Building behind the grid, with a slow push-in.
          Photo: "Main(Administrative)Building IIT-Roorkee" by Sidbij, CC BY-SA 4.0, via Wikimedia Commons. */}
      <motion.img
        src="/images/iitr-main-building-blur.webp"
        alt=""
        aria-hidden
        decoding="async"
        fetchPriority="high"
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{ scale: { duration: 2.4, ease: "easeOut" }, opacity: { duration: 0.5 } }}
        className="pointer-events-none absolute inset-0 size-full object-cover"
        // Blur + darkening are baked into the file: a CSS blur on a scaling image re-renders every frame.
        style={{ objectPosition: "center 22%" }}
      />
      {/* Darken the edges so the grid and title stay crisp on top of the photo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(8,8,10,0.15) 0%, rgba(8,8,10,0.55) 60%, rgba(8,8,10,0.9) 100%)",
        }}
      />
      <BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.06)" />

      <div className="relative z-10">
        <TextScramble
          className="font-mono uppercase text-2xl md:text-4xl lg:text-5xl text-[#F3F4F6] tracking-[0.2em] text-center px-6"
          duration={1.4}
          speed={0.04}
          onScrambleComplete={() => {
            setTimeout(onComplete, 200);
          }}
        >
          GeoQuest
        </TextScramble>
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B8D98]"
        >
          CAMPUS GEOQUEST · TEN STATIONS · ONE TRAIL
        </motion.div>
      </div>
    </motion.div>
  );
}
