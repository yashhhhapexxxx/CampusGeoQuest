import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Camera, Check, MapPin, QrCode, RotateCcw, X } from "lucide-react";
import QrScanner from "qr-scanner";
import { COMPASS, START_HINT, STATIONS, checkMeasure, checkText } from "../data/quest";
import { TrailBuddy } from "../components/TrailBuddy";

type Stage = "scan" | "question" | "correct" | "complete";

const STORAGE_KEY = "campus-geoquest-progress-v1";

function loadIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { currentIndex?: number };
    const value = parsed.currentIndex;
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(Math.floor(value), STATIONS.length));
  } catch {
    return 0;
  }
}

export default function Quest() {
  const [currentIndex, setCurrentIndex] = useState<number>(loadIndex);
  const [stage, setStage] = useState<Stage>(() =>
    loadIndex() >= STATIONS.length ? "complete" : "scan",
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  // State (not a ref) so the scanner starts whenever the <video> actually mounts —
  // the stage transition can mount it after `cameraOn` flips.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const station = STATIONS[Math.min(currentIndex, STATIONS.length - 1)];
  const scanHint = currentIndex === 0 ? START_HINT : STATIONS[currentIndex - 1].nextHint;
  const isLast = currentIndex === STATIONS.length - 1;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentIndex }));
  }, [currentIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage, currentIndex]);

  useEffect(() => {
    if (stage !== "scan") setCameraOn(false);
  }, [stage]);

  const stopCamera = () => setCameraOn(false);

  const acceptToken = (raw: string) => {
    const token = raw.trim();
    if (token === station.qrToken) {
      stopCamera();
      setError(null);
      setCameraError(null);
      setStage("question");
      return;
    }
    const known = STATIONS.find((s) => s.qrToken === token);
    setError(
      known
        ? `That's Station ${known.id}. Find Station ${station.id} first.`
        : "That QR code isn't part of the Campus GeoQuest trail.",
    );
  };

  const acceptTokenRef = useRef(acceptToken);
  acceptTokenRef.current = acceptToken;

  useEffect(() => {
    if (!cameraOn || !videoEl) return;
    const scanner = new QrScanner(
      videoEl,
      (result) => acceptTokenRef.current(result.data),
      {
        preferredCamera: "environment",
        maxScansPerSecond: 10,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      },
    );
    scannerRef.current = scanner;
    scanner.start().catch(() => {
      scanner.destroy();
      if (scannerRef.current === scanner) scannerRef.current = null;
      setCameraOn(false);
      setCameraError("Couldn't open the camera. Check permissions or upload a photo instead.");
    });

    return () => {
      scanner.destroy();
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [cameraOn, videoEl]);

  const startCamera = () => {
    setError(null);
    setCameraError(null);
    setCameraOn(true);
  };

  const [typed, setTyped] = useState("");
  const [measures, setMeasures] = useState<Record<string, string>[]>([]);
  const [measureMsg, setMeasureMsg] = useState<string | null>(null);
  const setField = (i: number, k: string, val: string) => {
    setMeasures((m) => {
      const next = [...m];
      next[i] = { ...(next[i] ?? {}), [k]: val };
      return next;
    });
    setInvalid(false);
    setWrong(false);
    setMeasureMsg(null);
  };
  const [invalid, setInvalid] = useState(false);

  const pass = () => {
    setWrong(false);
    setInvalid(false);
    setStage("correct");
  };

  const choose = (index: number) => {
    if (stage !== "question" || station.answer.kind !== "mcq") return;
    setSelected(index);
    if (index === station.answer.answer) pass();
    else setWrong(true);
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (station.answer.kind !== "text") return;
    if (checkText(typed, station.answer)) pass();
    else setWrong(true);
  };

  const submitMeasure = (e: React.FormEvent) => {
    e.preventDefault();
    if (station.answer.kind !== "measure") return;
    const r = checkMeasure(measures, station.answer);
    const missing = r.filter((x) => !x.valid).map((x) => x.label);
    if (missing.length) {
      setInvalid(true);
      setWrong(false);
      setMeasureMsg(`Fill in every value for: ${missing.join(", ")}.`);
      return;
    }
    const off = r.filter((x) => !x.ok).map((x) => x.label);
    if (!off.length) {
      try {
        localStorage.setItem(`campus-geoquest-measure-${station.id}`, JSON.stringify(measures));
      } catch {
        /* storage blocked */
      }
      setMeasureMsg(null);
      pass();
    } else {
      setInvalid(false);
      setWrong(true);
      setMeasureMsg(`Check again: ${off.join(", ")}.`);
    }
  };

  const [notYet, setNotYet] = useState(false);

  /** Move on to the next station; `openCamera` starts scanning straight away. */
  const advance = (openCamera: boolean) => {
    const next = currentIndex + 1;
    setNotYet(false);
    setSelected(null);
    setWrong(false);
    setInvalid(false);
    setTyped("");
    setMeasures([]);
    setMeasureMsg(null);
    setError(null);
    setCurrentIndex(next);
    setStage(next >= STATIONS.length ? "complete" : "scan");
    if (openCamera && next < STATIONS.length) {
      setCameraError(null);
      setCameraOn(true);
    }
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentIndex(0);
    setStage("scan");
    setSelected(null);
    setWrong(false);
    setError(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080A] text-white">
      {/* Campus backdrop: pre-blurred IIT Roorkee Main Building (4.5 KB, shared with the
          loading screen) with a slow drift. Darkened so the card stays readable outdoors.
          Photo: "Main(Administrative)Building IIT-Roorkee" by Sidbij, CC BY-SA 4.0, via Wikimedia Commons. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/images/iitr-main-building-blur.webp"
          alt=""
          decoding="async"
          className="quest-drift absolute inset-0 size-full object-cover opacity-80"
          style={{ objectPosition: "center 25%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,8,10,0.45) 0%, rgba(8,8,10,0.7) 55%, rgba(8,8,10,0.95) 100%)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 grid-blueprint opacity-25" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, rgba(127,163,91,0.10), transparent 70%)",
        }}
      />
      <div className="noise-overlay" />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-6 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-text-secondary transition-colors hover:text-white"
        >
          <ArrowLeft size={13} />
          Campus GeoQuest
        </Link>
        <span className="tabular text-[10px] uppercase tracking-[0.25em] text-text-secondary">
          {stage === "complete"
            ? "Complete"
            : `Station ${String(currentIndex + 1).padStart(2, "0")} / ${STATIONS.length}`}
        </span>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-3xl flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex gap-1.5">
            {STATIONS.map((s, i) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  i < currentIndex || stage === "complete"
                    ? "bg-white/80"
                    : i === currentIndex
                      ? "bg-white/30"
                      : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md sm:p-8"
            >
              {stage === "scan" && (
                <>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/[0.03]">
                    <QrCode size={22} className="text-white/80" />
                  </div>
                  <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-text-secondary">
                    Station {String(station.id).padStart(2, "0")}
                  </p>
                  <h1 className="mt-3 text-center font-serif text-4xl tracking-tight">
                    Scan the code.
                  </h1>
                  <p className="mt-3 text-center text-sm leading-relaxed text-text-secondary">
                    Point your camera at the QR code to unlock the question.
                  </p>

                  <div className="mt-6 rounded-xl border border-[#B5D98A]/25 bg-[#B5D98A]/[0.05] p-5">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-[#B5D98A]">
                      {currentIndex === 0 ? "Your first clue · find the starting location" : "Your clue"}
                    </p>
                    <p className="mt-3 whitespace-pre-line font-serif text-lg italic leading-relaxed text-white/90">{scanHint}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {!cameraOn && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="ease-precision flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]"
                      >
                        <Camera size={15} />
                        Scan with camera
                      </button>
                    )}

                    {cameraOn && (
                      <div className="overflow-hidden rounded-xl border border-white/15 bg-black">
                        <video
                          ref={setVideoEl}
                          muted
                          playsInline
                          className="aspect-square w-full object-cover"
                        />
                        <div className="flex items-center justify-between gap-3 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                            Point at the QR code
                          </p>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="text-[10px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                  {cameraError && (
                    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[color:var(--danger)]">
                      <X size={13} className="mt-0.5 shrink-0" />
                      {cameraError}
                    </p>
                  )}

                  {error && (
                    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[color:var(--danger)]">
                      <X size={13} className="mt-0.5 shrink-0" />
                      {error}
                    </p>
                  )}
                </>
              )}

              {stage === "question" && (
                <>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-text-secondary">
                    Station {String(station.id).padStart(2, "0")} · {station.location}
                  </p>
                  {station.context && (
                    <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm leading-relaxed text-white/75">
                      {station.context}
                    </p>
                  )}
                  <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tight md:text-4xl">
                    {station.question}
                  </h1>

                  {station.answer.kind === "mcq" && (
                    <div className="mt-7 space-y-3">
                      {station.answer.options.map((option, i) => {
                        const isWrong = wrong && selected === i;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => choose(i)}
                            className={`ease-precision flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${
                              isWrong
                                ? "border-[color:var(--danger)]/50 bg-[color:var(--danger)]/10 text-white"
                                : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25 hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="tabular text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {station.answer.kind === "text" && (
                    <form onSubmit={submitText} className="mt-7 space-y-3">
                      <input
                        value={typed}
                        onChange={(e) => { setTyped(e.target.value); setWrong(false); }}
                        inputMode={station.answer.numeric ? "numeric" : "text"}
                        autoComplete="off"
                        autoCapitalize="none"
                        placeholder={station.answer.placeholder ?? "Type your answer"}
                        aria-label="Your answer"
                        className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/35 focus:border-white/40"
                      />
                      <button type="submit" className="ease-precision flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]">Check answer</button>
                    </form>
                  )}

                  {station.answer.kind === "measure" && (
                    <form onSubmit={submitMeasure} className="mt-6 space-y-4">
                      {station.answer.parts.map((part, i) => (
                        <fieldset key={part.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5D98A]">{part.label}</legend>
                          {part.kind === "plane" ? (
                            <div className="grid grid-cols-3 gap-2">
                              <label className="block">
                                <span className="text-[9px] uppercase tracking-[0.18em] text-text-secondary">Strike°</span>
                                <input value={measures[i]?.strike ?? ""} onChange={(e) => setField(i, "strike", e.target.value)} inputMode="numeric" placeholder="0–359" aria-label={`${part.label} strike`} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40" />
                              </label>
                              <label className="block">
                                <span className="text-[9px] uppercase tracking-[0.18em] text-text-secondary">Dip°</span>
                                <input value={measures[i]?.dip ?? ""} onChange={(e) => setField(i, "dip", e.target.value)} inputMode="numeric" placeholder="0–90" aria-label={`${part.label} dip`} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40" />
                              </label>
                              <label className="block">
                                <span className="text-[9px] uppercase tracking-[0.18em] text-text-secondary">Dips to</span>
                                <select value={measures[i]?.dipDir ?? ""} onChange={(e) => setField(i, "dipDir", e.target.value)} aria-label={`${part.label} dip direction`} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40">
                                  <option value="" disabled>—</option>
                                  {COMPASS.map((c) => (
                                    <option key={c} value={c} className="bg-[#111]">{c}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="text-[9px] uppercase tracking-[0.18em] text-text-secondary">Trend°</span>
                                <input value={measures[i]?.trend ?? ""} onChange={(e) => setField(i, "trend", e.target.value)} inputMode="numeric" placeholder="0–359" aria-label={`${part.label} trend`} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40" />
                              </label>
                              <label className="block">
                                <span className="text-[9px] uppercase tracking-[0.18em] text-text-secondary">Plunge°</span>
                                <input value={measures[i]?.plunge ?? ""} onChange={(e) => setField(i, "plunge", e.target.value)} inputMode="decimal" placeholder="0–90" aria-label={`${part.label} plunge`} className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40" />
                              </label>
                            </div>
                          )}
                        </fieldset>
                      ))}
                      <button type="submit" className="ease-precision flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]">Check measurements</button>
                      {measureMsg && (invalid || wrong) && (
                        <p className="flex items-start gap-2 text-xs leading-relaxed text-[color:var(--danger)]">
                          <X size={13} className="mt-0.5 shrink-0" />
                          {measureMsg}
                        </p>
                      )}
                    </form>
                  )}

                  {wrong && station.answer.kind !== "measure" && (
                    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[color:var(--danger)]">
                      <X size={13} className="mt-0.5 shrink-0" />
                      Not quite — read the clue again.
                    </p>
                  )}
                </>
              )}

              {stage === "correct" && (
                <>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[color:var(--safe)]/30 bg-[color:var(--safe)]/10">
                    <Check size={22} className="text-[color:var(--safe)]" />
                  </div>
                  <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-text-secondary">
                    Station {String(station.id).padStart(2, "0")} · {station.location} · Correct
                  </p>
                  <h1 className="mt-3 text-center font-serif text-4xl tracking-tight">
                    Coordinates unlocked.
                  </h1>
                  {station.concept && (
                    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.25em] text-[#B5D98A]">
                      Concept · {station.concept}
                    </p>
                  )}
                  {isLast ? (
                    <button
                      type="button"
                      onClick={() => advance(false)}
                      className="ease-precision mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]"
                    >
                      Finish the Trail
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <>
                      <div className="mt-6 rounded-xl border border-[#B5D98A]/25 bg-[#B5D98A]/[0.05] p-5">
                        <p className="text-[9px] uppercase tracking-[0.25em] text-[#B5D98A]">
                          Clue to Station {String(station.id + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-3 whitespace-pre-line font-serif text-lg italic leading-relaxed text-white/90">{station.nextHint}</p>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNotYet(true)}
                          className="ease-precision flex items-center justify-center rounded-full border border-white/20 px-4 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 transition-all hover:border-white/40 hover:text-white"
                        >
                          Not reached yet
                        </button>
                        <button
                          type="button"
                          onClick={() => advance(true)}
                          className="ease-precision flex items-center justify-center gap-2 rounded-full bg-white px-4 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]"
                        >
                          <MapPin size={13} />
                          Reached it
                        </button>
                      </div>
                      {notYet && (
                        <p className="mt-4 text-center text-sm leading-relaxed text-white/70">
                          No rush — read the clue again and explore. Tap <b className="text-white">Reached it</b> when you’re at the location, then scan its QR code.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}

              {stage === "complete" && (
                <>
                  {/* Reward: the campus lens from the homepage, now "unlocked". */}
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.1 }}
                    className="relative mx-auto size-32 overflow-hidden rounded-full border border-[#B5D98A]/50"
                    style={{ boxShadow: "0 0 40px rgba(181,217,138,0.35), inset 0 0 24px rgba(8,10,9,0.8)" }}
                  >
                    <img
                      src="/images/iitr-lens.webp"
                      alt="IIT Roorkee Main Building"
                      className="size-full object-cover"
                      style={{ objectPosition: "center 30%" }}
                    />
                    <span className="absolute bottom-2 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full border border-[color:var(--safe)]/40 bg-[#08080A]/80">
                      <MapPin size={13} className="text-[color:var(--safe)]" />
                    </span>
                  </motion.div>
                  <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-text-secondary">
                    Trail complete · IIT Roorkee
                  </p>
                  <h1 className="mt-3 text-center font-serif text-4xl tracking-tight">
                    You followed the Earth's clues.
                  </h1>
                  <p className="mt-4 text-center text-sm leading-relaxed text-text-secondary">
                    All ten stations cleared. The ground remembers — and now so do you.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/"
                      className="ease-precision flex flex-1 items-center justify-center rounded-full border border-white/15 px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] text-white/70 transition-all hover:border-white/30 hover:text-white"
                    >
                      Back to the start
                    </Link>
                    <button
                      type="button"
                      onClick={reset}
                      className="ease-precision flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-all hover:shadow-[0_0_60px_rgba(255,255,255,0.15)]"
                    >
                      <RotateCcw size={13} />
                      Run it again
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {stage !== "complete" && (
            <p className="mt-6 text-center text-[9px] uppercase tracking-[0.25em] text-text-secondary">
              Progress is saved on this device
            </p>
          )}


          {/* Pip reaches stop i once station i is answered correctly.
              Phones: sits below the card · desktop: floats on the right. */}
          <TrailBuddy position={stage === "complete" ? STATIONS.length : Math.min(STATIONS.length, currentIndex + (stage === "correct" ? 1 : 0))} />
        </div>
      </div>
    </main>
  );
}
