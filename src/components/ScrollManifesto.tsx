"use client";
import * as React from "react";
import { useScroll } from "motion/react";
import { OrbitPlanet } from "./ui/orbit-planet";
import { useDeferredMount } from "@/lib/useDeferredMount";
import Galaxy from "./ui/galaxy";
import SoftAurora from "./ui/soft-aurora";

const COPY =
  "The Earth leaves clues. Most people walk past them.\nTen stations. Hidden patterns in the ordinary corners of campus.\nScan the code. Solve the clue. Earn your next coordinates.";

type Token =
  | { kind: "token"; value: string; animIndex: number | null }
  | { kind: "br"; value?: undefined; animIndex?: undefined };

function tokenizeWords(raw: string): Token[] {
  const lines = (raw ?? "").split("\n");
  const out: Token[] = [];
  let animIndex = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const words = line.trim() ? line.trim().split(/\s+/) : [];
    for (let i = 0; i < words.length; i++) {
      out.push({ kind: "token", value: words[i], animIndex });
      animIndex++;
      // IMPORTANT: add a real space token so wrapping works
      if (i !== words.length - 1) {
        out.push({ kind: "token", value: " ", animIndex: null });
      }
    }
    if (!words.length)
      out.push({ kind: "token", value: "\u00A0", animIndex: null });
    if (li !== lines.length - 1) out.push({ kind: "br" });
  }
  return out;
}

function RevealToken({
  value,
  animIndex,
  totalAnimated,
  scroll,
}: {
  value: string;
  animIndex: number | null;
  totalAnimated: number;
  scroll: number;
}) {
  if (animIndex === null || totalAnimated <= 0) {
    return <span>{value}</span>;
  }
  const start = animIndex / totalAnimated;
  const end = start + 1 / totalAnimated;

  let opacity = 0;
  if (scroll >= end) opacity = 1;
  else if (scroll <= start) opacity = 0;
  else opacity = (scroll - start) / (end - start);

  return <span style={{ opacity, display: "inline" }}>{value}</span>;
}

function GhostLayer({
  raw,
  textColor,
  ghostOpacity,
  textAlign,
}: {
  raw: string;
  textColor: string;
  ghostOpacity: number;
  textAlign: "left" | "center" | "right";
}) {
  const content = raw.split("\n").map((line: string, li: number) => {
    const safeLine = line.trim()
      ? line.trim().split(/\s+/).join(" ")
      : "\u00A0";
    return (
      <React.Fragment key={`g-ln-${li}`}>
        {li > 0 && <br />}
        {safeLine}
      </React.Fragment>
    );
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        pointerEvents: "none",
        opacity: ghostOpacity,
        color: textColor,
        whiteSpace: "pre-wrap",
        textAlign,
      }}
    >
      {content}
    </div>
  );
}

export function ScrollManifesto() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const [scroll, setScroll] = React.useState(0);
  // Mount the WebGL backdrops only after the loading animation, once the
  // section is close — their shader compiles are heavy.
  const nearView = useDeferredMount(containerRef);

  // Use a native effect to listen to the motion value to avoid hook order issues if we import dynamically
  React.useEffect(() => {
    return scrollYProgress.on("change", (v) => setScroll(v));
  }, [scrollYProgress]);

  const wordTokens = React.useMemo(() => tokenizeWords(COPY), []);
  const totalAnimated = React.useMemo(() => {
    let max = -1;
    for (const t of wordTokens) {
      if (t.kind === "token" && t.animIndex !== null)
        max = Math.max(max, t.animIndex);
    }
    return max + 1;
  }, [wordTokens]);

  return (
    <section
      ref={containerRef}
      className="relative z-10 w-full bg-[#08080A]"
      style={{ height: "220vh" }}
    >
      {/* Soft gradient top edge instead of hard border */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#08080A] via-[#08080A]/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#08080A] via-[#08080A]/60 to-transparent" />

      <div className="absolute inset-0 grid-blueprint opacity-40" />
      {/* radial vignette to fade grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, #08080A 90%)",
        }}
      />

      <div className="sticky top-0 h-screen overflow-hidden px-6">
        {/* Space backdrop: slow starfield + a green aurora behind the headline. */}
        {nearView && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
            >
              <Galaxy
                transparent
                density={1.1}
                starSpeed={0.25}
                speed={0.6}
                rotationSpeed={0.04}
                glowIntensity={0.35}
                twinkleIntensity={0.55}
                saturation={0.5}
                starColors={["#ffffff", "#e9f5dc", "#b5d98a", "#e8dcc4"]}
                mouseInteraction={false}
                mouseRepulsion={false}
                clickWarp={false}
                flareIntensity={0.55}
                dpr={1.25}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[75%] opacity-80 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
            >
              <SoftAurora
                color1="#d8f0be"
                color2="#3f8f5f"
                brightness={0.85}
                speed={0.4}
                bandHeight={0.55}
                bandSpread={1.1}
                enableMouseInteraction={false}
                clickPulse={false}
                spectrum={0}
              />
            </div>
          </>
        )}
        <div className="relative z-10 mx-auto w-full max-w-4xl pt-[14vh] text-center md:pt-[16vh]">
          <p className="mb-5 text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B8D98]">
            / 02 · The Trail
          </p>

          <div
            style={{
              position: "relative",
              width: "100%",
              whiteSpace: "pre-wrap",
              textAlign: "center",
              wordSpacing: "0.15em",
            }}
          >
            <div className="font-impact text-lg uppercase leading-[1.25] tracking-wide antialiased sm:text-xl md:text-3xl">
              <GhostLayer
                raw={COPY}
                textColor="#2a2b31"
                ghostOpacity={1}
                textAlign="center"
              />
              <div style={{ position: "relative", color: "#F3F4F6" }}>
                {wordTokens.map((t, i) =>
                  t.kind === "br" ? (
                    <br key={`br-${i}`} />
                  ) : (
                    <RevealToken
                      key={`t-${i}`}
                      value={t.value}
                      animIndex={t.animIndex}
                      totalAnimated={totalAnimated}
                      scroll={scroll}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Little planet with the courier on top. Its centre sits on the bottom
            edge of the viewport, so only the top half shows. */}
        <div className="absolute inset-x-0 bottom-0 h-[64vh]">
          <OrbitPlanet />
        </div>
      </div>
    </section>
  );
}
