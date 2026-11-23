/**
 * Campus GeoQuest trail — station i is played at location i and unlocked by QR code
 * GEOQUEST:ST-0i placed there. The hint that leads players TO location i+1 is shown
 * after they answer station i correctly (`nextHint`); the hint to location 1 is START_HINT.
 *
 * Answer kinds:
 *  - "mcq"     tap one of the options; `answer` is the 0-based correct index
 *  - "text"    type a word / number; correct if it contains any entry of `accept`
 *              (case, spaces and punctuation ignored)
 *  - "measure" enter strike (0–359°) and dip (0–90°); with `expected` it is checked within
 *              tolerance, without it any valid measurement is accepted and recorded
 */

export type Answer =
  | { kind: "mcq"; options: string[]; answer: number }
  | { kind: "text"; accept: string[]; placeholder?: string; numeric?: boolean }
  | {
      kind: "measure";
      expected?: { strike: number; dip: number; strikeTol?: number; dipTol?: number };
    };

export type Station = {
  id: number;
  location: string;
  qrToken: string;
  /** Optional lead-in shown above the question (context at the site). */
  context?: string;
  question: string;
  answer: Answer;
  /** Geology concept behind the question, shown after a correct answer. */
  concept?: string;
  /** Riddle leading to the NEXT location, revealed after a correct answer. */
  nextHint: string;
};

/**
 * The trail, in playing order (organisers’ final sequence). Each entry carries the riddle that
 * leads TO it (`hint`) and the question asked AT it. Station i ↔ location i ↔ QR GEOQUEST:ST-0i.
 */
type Location = Omit<Station, "id" | "qrToken" | "nextHint"> & { hint: string };

const TRAIL: Location[] = [
  {
    location: "APJ Block",
    hint: `Named after a dreamer who reached for the stars,
A scientist, a teacher, who inspired from afar.
Where students assemble and professors speak,
Your next destination is the place you seek.`,
    question: "What is the colour (specific) of the 3rd youngest layer?",
    answer: { kind: "text", accept: ["mustard"], placeholder: "Type the colour" },
    concept: "Law of original horizontality",
  },
  {
    location: "Chemical Lawn",
    hint: `One studies how substances react and combine,
The other explores metals, their strength and design.
Between these worlds of science and creation,
Seek the place that offers a moment of relaxation on a green carpet.`,
    // TODO: placeholder — no question was provided for the Chemical Lawn yet. Replace it.
    question:
      "Which principle states that, in an undisturbed sequence, younger rock layers lie on top of older ones?",
    answer: {
      kind: "mcq",
      options: ["Original horizontality", "Superposition", "Cross-cutting relationships", "Uniformitarianism"],
      answer: 1,
    },
  },
  {
    location: "ABN School",
    hint: "Where the sun finds a tree without roots, and golden waves guard the gateway to a place of learning, your next discovery awaits.",
    question:
      "I begin my journey straight and still, but opposing forces bend my will. I grow shorter, yet stretch up and down, forming peaks and valleys without a frown. What concept am I?",
    answer: { kind: "mcq", options: ["Synform", "Antiform", "Fold", "Buckling"], answer: 3 },
  },
  {
    location: "Church",
    hint: "A place where silence speaks louder than sound, and where hope is the foundation. Every prayer finds meaning, every voice finds peace, and every visitor walks in the light of Christ and leaves a little lighter than they came.",
    question: "What is the main result of hinge zone space problems in multilayered folds?",
    answer: {
      kind: "mcq",
      options: [
        "Layers become perfectly parallel",
        "Squeezing of fold hinges and faults (hinge collapse)",
        "The layers turn into igneous rock",
        "Folding stops completely",
      ],
      answer: 1,
    },
  },
  {
    location: "MAC",
    hint: `A ring of red without a roof, yet shade is always found within.
Stone giants stand in a circle, holding a crown but no walls to pin.
Rajiv’s gaze falls upon my steps, where the day’s plans begin and end.
A tree grows through my open heart, and cycles wait for those who spend
their hours at play, at song, at stage. Come find the place where talents engage.`,
    question:
      "Considering the tree to be the oldest among all the built structures, which structure can you actually think of?",
    answer: { kind: "mcq", options: ["Syncline", "Anticline", "Graben", "Basin"], answer: 1 },
  },
  {
    location: "SAC Gym",
    hint: "Where iron frames stand in quiet alignment, behind the place where strength is built and muscles are trained, your next geological mystery awaits.",
    question:
      "If the two sides of this structure represent blocks separated by a fault, what type of fault involves horizontal movement of the blocks past one another?",
    answer: { kind: "mcq", options: ["Normal", "Reverse", "Strike-slip", "Oblique-slip"], answer: 2 },
  },
  {
    location: "SAC (Badminton Hall)",
    hint: "Two courts share one neighbour’s door. One holds a fuzzy yellow ball, the other a feathered cone. The cone’s court wears a mountain on its head. Find the one who stands guard between them and the crowd’s gathering hall.",
    question: "Enter the number of hinges visible from the marked location.",
    answer: { kind: "text", accept: ["15"], numeric: true, placeholder: "Number of hinges" },
  },
  {
    location: "Archi Lawn (Archi Hut)",
    hint: `Where future builders learn to draw, a green carpet rolls without a flaw.
Under old trees with painted feet, a little hut hosts candles and sweets.
Find the place where cakes are cut, and dreams of blueprints fill the hut.`,
    context:
      "You’re at the Archi Hut hotspot. Think of a real-life example of a hotspot, and what structural feature this spot could resemble (a fold).",
    question: "Which geological process could potentially explain their formation?",
    answer: {
      kind: "mcq",
      options: [
        "Differential weathering and erosion",
        "Tectonic uplift associated with subsurface magmatic activity",
        "Deposition of sediments in a low-lying basin",
        "Compaction of unconsolidated sediments",
      ],
      answer: 1,
    },
  },
  {
    location: "Instrumentation Centre",
    hint: "A place where precision is the priority and accuracy is the foundation, where every instrument has a purpose, every measurement tells a story, and every detail leads to discovery.",
    question:
      "Observe the arrangement of the inclined layers and identify the type of unconformity that this structure resembles.",
    answer: {
      kind: "mcq",
      options: ["Angular unconformity", "Disconformity", "Nonconformity", "Paraconformity"],
      answer: 0,
    },
  },
  {
    location: "Main Building (Sundial)",
    hint: `I never wear a watch, yet I tell the time.
I have no hands, but my shadow speaks.
Find me under the sun.`,
    question: "Measure the strike and dip of the sundial’s inclined plate.",
    // No answer key yet: any valid measurement is accepted and recorded. Add `expected` to check it.
    answer: { kind: "measure" },
  },
];

export const START_HINT = TRAIL[0].hint;

export const STATIONS: Station[] = TRAIL.map(({ hint: _hint, ...loc }, i) => ({
  ...loc,
  id: i + 1,
  qrToken: `GEOQUEST:ST-${String(i + 1).padStart(2, "0")}`,
  nextHint: i + 1 < TRAIL.length ? TRAIL[i + 1].hint : "That was the last station. Submit your trail!",
}));

/** Lower-case, strip punctuation/extra spaces so "Mustard!" == "mustard". */
export const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function checkText(input: string, a: Extract<Answer, { kind: "text" }>) {
  const v = normalise(input);
  if (!v) return false;
  if (a.numeric) return a.accept.some((x) => Number(v) === Number(x));
  return a.accept.some((x) => v.includes(normalise(x)));
}

export function checkMeasure(strike: number, dip: number, a: Extract<Answer, { kind: "measure" }>) {
  const valid = Number.isFinite(strike) && Number.isFinite(dip) && strike >= 0 && strike < 360 && dip >= 0 && dip <= 90;
  if (!valid) return { ok: false, valid: false };
  if (!a.expected) return { ok: true, valid: true };
  const d = Math.abs(strike - a.expected.strike) % 180; // strike is a line: 10° ≡ 190°
  const strikeErr = Math.min(d, 180 - d);
  const ok = strikeErr <= (a.expected.strikeTol ?? 10) && Math.abs(dip - a.expected.dip) <= (a.expected.dipTol ?? 5);
  return { ok, valid: true };
}
