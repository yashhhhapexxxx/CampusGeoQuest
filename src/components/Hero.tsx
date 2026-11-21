import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { ParallaxHero } from "./ui/parallax-hero";

/** What the trail is hiding, in the player's words. */
const HIDDEN = [
  "what's hidden in it.",
  "the first station.",
  "the missing clue.",
  "the next location.",
];

export function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HIDDEN.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <ParallaxHero
      title="GEOQUEST"
      titleClassName="font-impact font-normal uppercase tracking-normal [font-feature-settings:normal] [font-variant-ligatures:none] text-silver text-[13vw] max-lg:text-[14vw] max-md:text-[16vw] max-sm:text-[17vw]"
    >
      {/* Fade the landscape into the dark page below and give the copy contrast. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[120] h-[55%] bg-gradient-to-t from-[#08080A] via-[#08080A]/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-[130] mx-auto w-full max-w-[1400px] px-6 pb-14 md:pb-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="tabular text-[10px] uppercase tracking-[0.3em] text-white/70"
        >
          Campus GeoQuest · Ten Stations · One Trail
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9 }}
          className="mt-4 max-w-3xl font-serif text-3xl leading-[1.1] tracking-tight text-white md:text-5xl"
        >
          You walk past it every day. Now find{" "}
          <span className="relative inline-block align-baseline">
            <AnimatePresence mode="wait">
              <motion.span
                key={HIDDEN[index]}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="inline-block italic text-[#B5D98A]"
              >
                {HIDDEN[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.9 }}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Link
            to="/quest"
            className="ease-precision flex items-center gap-3 rounded-full bg-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]"
          >
            Explore Campus
            <ArrowUpRight size={14} />
          </Link>
        </motion.div>
      </div>
    </ParallaxHero>
  );
}
