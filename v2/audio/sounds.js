// Every sound effect, by name: { group, desc, play(ctx, out, t, opts) → end time }.
// All original, all synthesized (synth.js). `opts.pet` picks the pet's own
// wave and pitch for the pet stingers; `opts.i` counts (stars, bowls).
// The sound board (board.html) lists this table, and the trailer stems
// render every entry, so a new sound only needs a line here.
import { tone, seq, hiss, hz, noteNum } from "./synth.js";
import { VOICES } from "./voices.js";

const T = tone;
const pet = (o) => VOICES[o?.pet] || VOICES.mango;
const pn = (o, semis) => noteNum(pet(o).base) - 12 + semis; // stingers sit an octave under the babble
// pet waves at a fair loudness (a square is louder than a sine)
const pvol = (o, k = 1) => ({ square: 0.13, pulse25: 0.15, pulse12: 0.2, triangle: 0.2, sine: 0.17 }[pet(o).type] || 0.15) * k;

function arp(ctx, out, t, notes, { step = 0.06, type = "square", vol = 0.12, gate = 0.9, r = 0.05, vib = 0 } = {}) {
  return seq(ctx, out, { t, notes, step, gate, type, vol, r, vib });
}
function sparkle(ctx, out, t, { n = 6, from = 84, step = 0.045, vol = 0.06, down = true } = {}) {
  let end = t;
  for (let i = 0; i < n; i++) {
    const note = from + (down ? -1 : 1) * [0, 3, 5, 7, 10, 12, 15, 17][i % 8];
    end = T(ctx, out, { t: t + i * step, dur: 0.03, f: hz(note), type: "pulse12", vol: vol * (1 - i / (n + 2)), r: 0.06 });
  }
  return end;
}
function thud(ctx, out, t, { f = 140, vol = 0.35, dur = 0.08 } = {}) {
  T(ctx, out, { t, dur, f, f2: f * 0.45, type: "triangle", vol, a: 0.002, d: 0.05, s: 0.2, r: 0.05 });
  return hiss(ctx, out, { t, dur: dur * 0.7, vol: vol * 0.5, f: 380, type: "lowpass", q: 0.5 });
}
function whoosh(ctx, out, t, { dur = 0.25, from = 600, to = 3000, vol = 0.18, q = 1.2 } = {}) {
  return hiss(ctx, out, { t, dur, vol, f: from, f2: to, type: "bandpass", q, a: dur * 0.4, d: 0.05, s: 0.8, r: dur * 0.4 });
}
function water(ctx, out, t, { dur = 0.9, vol = 0.16, f = 1400, bubbles = 7, seed = 3 } = {}) {
  // a pour: wobbling band of noise, plus a few bubbly sine blips
  hiss(ctx, out, { t, dur, vol, f, f2: f * 0.7, type: "bandpass", q: 0.9, a: 0.08, d: 0.1, s: 0.8, r: 0.18 });
  hiss(ctx, out, { t, dur, vol: vol * 0.5, f: 400, type: "lowpass", q: 0.4, a: 0.1, r: 0.2 });
  let end = t + dur;
  let s = seed;
  for (let i = 0; i < bubbles; i++) {
    s = (s * 9301 + 49297) % 233280;
    const at = t + 0.05 + (s / 233280) * dur * 0.9;
    const f0 = 500 + ((s * 7) % 700);
    end = Math.max(end, T(ctx, out, { t: at, dur: 0.035, f: f0, f2: f0 * 1.8, type: "sine", vol: 0.07, r: 0.02 }));
  }
  return end + 0.2;
}

export const SFX = {
  // ---- interface ----
  "ui-hover": { group: "ui", desc: "Pointer moves over a button (fine pointers only)", play: (c, o, t) => T(c, o, { t, dur: 0.012, f: hz("E7"), type: "pulse12", vol: 0.04, r: 0.015 }) },
  "ui-tap": { group: "ui", desc: "Plain button press (map, splash, Next, guide)", play: (c, o, t) => arp(c, o, t, ["E6", "B6"], { step: 0.035, type: "pulse25", vol: 0.08 }) },
  "ui-back": { group: "ui", desc: "Any ← Back / ← Map button", play: (c, o, t) => arp(c, o, t, ["G5", "D5"], { step: 0.05, type: "pulse25", vol: 0.08 }) },
  "ui-toggle-on": { group: "ui", desc: "Sound switched on", play: (c, o, t) => arp(c, o, t, ["C5", "E5", "G5", "C6"], { step: 0.05, type: "pulse25", vol: 0.1 }) },
  "begin": { group: "ui", desc: "Begin / Continue on the splash", play: (c, o, t) => { arp(c, o, t, ["C5", "E5", "G5", "C6", "E6"], { step: 0.055, type: "square", vol: 0.09 }); return sparkle(c, o, t + 0.28, { from: 96 }); } },
  "map-select": { group: "ui", desc: "Playing a level from the map", play: (c, o, t) => { thud(c, o, t, { f: 180, vol: 0.2 }); return arp(c, o, t + 0.03, ["G5", "C6", "G6"], { step: 0.05, type: "pulse25", vol: 0.09 }); } },

  // ---- decisions in the conversation ----
  "chip": { group: "decision", desc: "Asking the pet a question (a chip)", play: (c, o, t) => arp(c, o, t, ["A5", "D6"], { step: 0.05, type: "pulse25", vol: 0.09 }) },
  "do-it": { group: "decision", desc: "✓ Do it (and Do it after giving a rule)", play: (c, o, t) => { T(c, o, { t, dur: 0.1, f: hz("C4"), type: "triangle", vol: 0.25 }); return arp(c, o, t, ["C5", "G5"], { step: 0.07, type: "square", vol: 0.1 }); } },
  "flag": { group: "decision", desc: "? Something's off", play: (c, o, t) => { T(c, o, { t, dur: 0.09, f: hz("E5"), type: "triangle", vol: 0.25 }); return T(c, o, { t: t + 0.1, dur: 0.16, f: hz("Bb5"), f2: hz("B5"), type: "pulse12", vol: 0.11, vib: 0.3, vibRate: 9 }); } },
  "place": { group: "decision", desc: "Choosing a bed on a placement step", play: (c, o, t) => { thud(c, o, t, { f: 160, vol: 0.25 }); return T(c, o, { t: t + 0.04, dur: 0.12, f: hz("G5"), type: "triangle", vol: 0.25, r: 0.1 }); } },
  "flaw-right": { group: "decision", desc: "Naming the right flaw", play: (c, o, t) => { arp(c, o, t, ["E6", "B6"], { step: 0.08, type: "pulse25", vol: 0.1 }); return T(c, o, { t, dur: 0.22, f: hz("E5"), type: "triangle", vol: 0.22, r: 0.15 }); } },
  "flaw-wrong": { group: "decision", desc: "A wrong flaw pick: a gentle hmm, never harsh", play: (c, o, t) => { T(c, o, { t, dur: 0.12, f: hz("D4"), type: "triangle", vol: 0.22, a: 0.02, r: 0.06 }); return T(c, o, { t: t + 0.15, dur: 0.22, f: hz("D4"), f2: hz("C4"), type: "triangle", vol: 0.2, a: 0.02, r: 0.12 }); } },
  "fix-right": { group: "decision", desc: "Picking the right fix: the pet takes the rule", play: (c, o, t) => { arp(c, o, t, ["C5", "E5", "G5", "B5", "D6"], { step: 0.055, type: "triangle", vol: 0.24 }); return sparkle(c, o, t + 0.25, { from: 100, vol: 0.05 }); } },
  "fix-wrong": { group: "decision", desc: "A fix that won't work: a soft thinking hum", play: (c, o, t) => { T(c, o, { t, dur: 0.14, f: hz("F4"), type: "triangle", vol: 0.2, a: 0.02 }); return T(c, o, { t: t + 0.16, dur: 0.24, f: hz("E4"), type: "triangle", vol: 0.18, a: 0.02, r: 0.14, vib: 0.2 }); } },
  "false-flag": { group: "decision", desc: "Flagging advice that was sound (the nudge)", play: (c, o, t) => T(c, o, { t, dur: 0.3, f: hz("F4"), f2: hz("E4"), type: "triangle", vol: 0.2, a: 0.03, r: 0.12 }) },
  "my-way": { group: "decision", desc: "Disagree → my way", play: (c, o, t) => { thud(c, o, t, { f: 120 }); return arp(c, o, t + 0.02, ["G4", "C5"], { step: 0.09, type: "square", vol: 0.1 }); } },
  "their-way": { group: "decision", desc: "Disagree → their way after all", play: (c, o, t) => arp(c, o, t, ["E5", "A5"], { step: 0.08, type: "triangle", vol: 0.24 }) },
  "stand-firm": { group: "decision", desc: "Level 4/5 pushback: standing firm", play: (c, o, t) => { thud(c, o, t, { f: 110, vol: 0.4 }); T(c, o, { t, dur: 0.18, f: hz("C3"), type: "triangle", vol: 0.3 }); return T(c, o, { t, dur: 0.16, f: hz("C4"), type: "square", vol: 0.08 }); } },
  "give-in": { group: "decision", desc: "Level 4/5 pushback: giving in", play: (c, o, t) => T(c, o, { t, dur: 0.4, f: hz("G4"), f2: hz("D4"), type: "pulse25", vol: 0.1, a: 0.01, r: 0.15 }) },
  "allow": { group: "decision", desc: "Level 5 permission card: Allow (camera)", play: (c, o, t) => { T(c, o, { t, dur: 0.08, f: hz("B5"), type: "sine", vol: 0.25 }); return T(c, o, { t: t + 0.1, dur: 0.25, f: hz("E6"), type: "sine", vol: 0.25, r: 0.25, vib: 0.15 }); } },
  "deny": { group: "decision", desc: "Level 5 permission card: Put the phone down / walk away", play: (c, o, t) => { T(c, o, { t, dur: 0.28, f: hz("C5"), f2: hz("C4"), type: "sine", vol: 0.22, r: 0.08 }); return hiss(c, o, { t: t + 0.25, dur: 0.02, vol: 0.12, f: 3000 }); } },
  "stay-phone": { group: "decision", desc: "Level 5: stay on the phone (sugary, clingy)", play: (c, o, t) => arp(c, o, t, ["E5", "G5", "B5", "E6"], { step: 0.07, type: "sine", vol: 0.2, vib: 0.4 }) },
  "put-down": { group: "decision", desc: "Level 5: put the phone down (a relieved exhale)", play: (c, o, t) => { thud(c, o, t, { f: 150, vol: 0.3 }); return hiss(c, o, { t: t + 0.1, dur: 0.6, vol: 0.08, f: 1200, f2: 300, type: "lowpass", a: 0.1, r: 0.3 }); } },
  "unlock": { group: "decision", desc: "A locked almanac card unlocks", play: (c, o, t) => { arp(c, o, t, ["C6", "E6", "G6"], { step: 0.05, type: "pulse12", vol: 0.1 }); return sparkle(c, o, t + 0.15, { from: 103, n: 4 }); } },
  "level-end": { group: "decision", desc: "See what happened →", play: (c, o, t) => arp(c, o, t, ["G5", "C6", "E6"], { step: 0.06, type: "pulse25", vol: 0.09 }) },

  // ---- pet reactions (opts.pet: mango | luna | ember | biscuit | bugs) ----
  "pet-happy": { group: "pet", desc: "Pet is happy you trusted it", play: (c, o, t, x) => arp(c, o, t, [pn(x, 0), pn(x, 4), pn(x, 7), pn(x, 12)], { step: 0.06, type: pet(x).type, vol: pvol(x) }) },
  "pet-proud": { group: "pet", desc: "Pet is proud (a rule learned, a job done)", play: (c, o, t, x) => { T(c, o, { t, dur: 0.09, f: hz(pn(x, 7)), type: pet(x).type, vol: pvol(x) }); return T(c, o, { t: t + 0.12, dur: 0.35, f: hz(pn(x, 12)), type: pet(x).type, vol: pvol(x), vib: 0.4, vibDelay: 0.1, r: 0.15 }); } },
  "pet-concede": { group: "pet", desc: "Pet concedes when you disagree", play: (c, o, t, x) => arp(c, o, t, [pn(x, 4), pn(x, 2), pn(x, 0)], { step: 0.13, type: pet(x).type, vol: pvol(x, 0.8), gate: 0.75 }) },
  "pet-drift": { group: "pet", desc: "The pet drifts: a glitchy little motif", play: (c, o, t, x) => {
    const p = pet(x); let end = t;
    for (let i = 0; i < 7; i++) end = T(c, o, { t: t + i * 0.045, dur: 0.035, f: hz(pn(x, 12 + (i % 2 ? 1 : 0) + (i > 4 ? -6 : 0))), type: p.type, vol: pvol(x, 0.9), detune: (i % 3) * 30, r: 0.01 });
    hiss(c, o, { t: t + 0.05, dur: 0.2, vol: 0.06, f: 5000, f2: 900, type: "bandpass", q: 3, rate: 0.25 });
    return T(c, o, { t: end, dur: 0.18, f: hz(pn(x, 6)), f2: hz(pn(x, 5)), type: p.type, vol: pvol(x, 0.8), vib: 0.8, vibRate: 13, r: 0.08 });
  } },
  "pet-sheepish": { group: "pet", desc: "Pet is caught: sheepish 'oops'", play: (c, o, t, x) => { T(c, o, { t, dur: 0.12, f: hz(pn(x, 5)), type: pet(x).type, vol: pvol(x, 0.7), a: 0.02 }); return T(c, o, { t: t + 0.18, dur: 0.4, f: hz(pn(x, 3)), f2: hz(pn(x, 0)), type: pet(x).type, vol: pvol(x, 0.6), vib: 0.3, a: 0.02, r: 0.2 }); } },
  "pushback": { group: "pet", desc: "Pet argues back (Levels 4/5)", play: (c, o, t, x) => { arp(c, o, t, [pn(x, 7), pn(x, 7), pn(x, 7)], { step: 0.09, type: pet(x).type, vol: pvol(x), gate: 0.6 }); return T(c, o, { t: t + 0.27, dur: 0.2, f: hz(pn(x, 7)), f2: hz(pn(x, 10)), type: pet(x).type, vol: pvol(x), r: 0.08 }); } },

  // ---- almanac and magnifier ----
  "almanac-open": { group: "tools", desc: "Almanac opens", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.22, from: 700, to: 2600, vol: 0.14 }); arp(c, o, t + 0.08, ["C5", "G5"], { step: 0.06, type: "triangle", vol: 0.2 }); return T(c, o, { t: t + 0.2, dur: 0.04, f: hz("C7"), type: "pulse12", vol: 0.06, r: 0.05 }); } },
  "almanac-close": { group: "tools", desc: "Almanac closes", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.18, from: 2400, to: 600, vol: 0.12 }); return arp(c, o, t + 0.05, ["G4", "C4"], { step: 0.06, type: "triangle", vol: 0.2 }); } },
  "almanac-flip": { group: "tools", desc: "Turning a seed packet over", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.13, from: 1800, to: 6000, vol: 0.13, q: 0.8 }); return T(c, o, { t: t + 0.12, dur: 0.05, f: hz("A5"), type: "triangle", vol: 0.15 }); } },
  "almanac-flip-back": { group: "tools", desc: "Turning a packet back", play: (c, o, t) => whoosh(c, o, t, { dur: 0.12, from: 5000, to: 1600, vol: 0.11, q: 0.8 }) },
  "almanac-tab": { group: "tools", desc: "Switching almanac pages", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.09, from: 2500, to: 5000, vol: 0.09 }); return T(c, o, { t, dur: 0.02, f: hz("E6"), type: "pulse12", vol: 0.05 }); } },
  "almanac-locked": { group: "tools", desc: "A packet that is still locked (soft bonk)", play: (c, o, t) => { T(c, o, { t, dur: 0.07, f: hz("A3"), type: "triangle", vol: 0.25 }); return T(c, o, { t: t + 0.09, dur: 0.07, f: hz("A3"), type: "triangle", vol: 0.18 }); } },
  "magnifier-on": { group: "tools", desc: "Magnifier picked up", play: (c, o, t) => { T(c, o, { t, dur: 0.05, f: hz("B6"), type: "triangle", vol: 0.18, r: 0.2 }); return T(c, o, { t: t + 0.05, dur: 0.04, f: hz("E7"), type: "sine", vol: 0.12, r: 0.3 }); } },
  "magnifier-off": { group: "tools", desc: "Magnifier put away", play: (c, o, t) => T(c, o, { t, dur: 0.05, f: hz("E6"), f2: hz("B5"), type: "triangle", vol: 0.15, r: 0.1 }) },
  "magnifier-look": { group: "tools", desc: "Looking closely at a plant", play: (c, o, t) => T(c, o, { t, dur: 0.15, f: 600, f2: 1300, type: "sine", vol: 0.14, r: 0.08 }) },

  // ---- garden ----
  "meter-up": { group: "garden", desc: "Garden meter goes up", play: (c, o, t) => T(c, o, { t, dur: 0.14, f: hz("C6"), f2: hz("G6"), type: "pulse12", vol: 0.09, r: 0.05 }) },
  "meter-down": { group: "garden", desc: "Garden meter goes down", play: (c, o, t) => T(c, o, { t, dur: 0.22, f: hz("G4"), f2: hz("D4"), type: "triangle", vol: 0.22, r: 0.08 }) },
  "grow": { group: "garden", desc: "A plant sprouts or thrives", play: (c, o, t) => { T(c, o, { t, dur: 0.16, f: hz("C5"), f2: hz("C6"), type: "triangle", vol: 0.26, r: 0.06 }); return sparkle(c, o, t + 0.12, { from: 88, n: 3, down: false, vol: 0.06 }); } },
  "wilt": { group: "garden", desc: "A plant wilts / goes thirsty / gets soggy", play: (c, o, t) => T(c, o, { t, dur: 0.6, f: hz("G4"), f2: hz("C4"), type: "triangle", vol: 0.24, a: 0.02, vib: 0.3, vibRate: 5, r: 0.2 }) },
  "rot": { group: "garden", desc: "A plant rots, gets pests or is pecked", play: (c, o, t) => { hiss(c, o, { t, dur: 0.3, vol: 0.14, f: 300, f2: 150, type: "lowpass", q: 2, r: 0.1 }); return T(c, o, { t, dur: 0.45, f: hz("E3"), f2: hz("C3"), type: "square", vol: 0.07, vib: 0.6, vibRate: 11, r: 0.15 }); } },

  // ---- hands-on actions (v2/actions; the kind → sound table is in cues.js) ----
  "act-lift": { group: "action", desc: "Picking up a tool to drag", play: (c, o, t) => T(c, o, { t, dur: 0.06, f: hz("C5"), f2: hz("E5"), type: "triangle", vol: 0.18 }) },
  "act-wrong": { group: "action", desc: "Dropped in the wrong spot (gentle)", play: (c, o, t) => { T(c, o, { t, dur: 0.07, f: hz("E4"), type: "triangle", vol: 0.2, a: 0.01 }); return T(c, o, { t: t + 0.11, dur: 0.1, f: hz("D4"), type: "triangle", vol: 0.18, a: 0.01 }); } },
  "act-dig": { group: "action", desc: "Dig (trowel scoops)", play: (c, o, t) => { let e = t; for (let i = 0; i < 3; i++) { thud(c, o, t + i * 0.15, { f: 120, vol: 0.18, dur: 0.05 }); e = hiss(c, o, { t: t + i * 0.15, dur: 0.09, vol: 0.14, f: 1100, f2: 700, q: 1.5 }); } return e; } },
  "act-plant": { group: "action", desc: "Plant (into the soil, pop)", play: (c, o, t) => { thud(c, o, t, { f: 130, vol: 0.25 }); return T(c, o, { t: t + 0.08, dur: 0.07, f: hz("G4"), f2: hz("C5"), type: "triangle", vol: 0.22 }); } },
  "act-sprinkle": { group: "action", desc: "Sow a row / sprinkle seeds", play: (c, o, t) => { let e = t; for (let i = 0; i < 10; i++) e = hiss(c, o, { t: t + i * 0.045 + (i % 3) * 0.008, dur: 0.012, vol: 0.12, f: 6000 + (i % 4) * 700, type: "highpass", r: 0.01 }); return Math.max(e, sparkle(c, o, t + 0.2, { from: 96, n: 3, vol: 0.04 })); } },
  "act-water": { group: "action", desc: "Water (watering can)", play: (c, o, t) => water(c, o, t, { dur: 0.9 }) },
  "act-pour": { group: "action", desc: "Pour (jug, row watering)", play: (c, o, t) => water(c, o, t, { dur: 0.6, f: 1000, vol: 0.18, bubbles: 5, seed: 11 }) },
  "act-stream": { group: "action", desc: "Level 5 can: a long stream", play: (c, o, t) => water(c, o, t, { dur: 1.3, f: 1600, vol: 0.15, bubbles: 10, seed: 5 }) },
  "act-hose": { group: "action", desc: "Hose jet (blasting aphids)", play: (c, o, t) => { hiss(c, o, { t, dur: 0.7, vol: 0.16, f: 2600, type: "highpass", a: 0.03, d: 0.1, s: 0.85, r: 0.15 }); return hiss(c, o, { t, dur: 0.7, vol: 0.1, f: 900, f2: 1200, q: 3, a: 0.03, r: 0.15 }); } },
  "act-mist": { group: "action", desc: "Mist (three spray puffs)", play: (c, o, t) => { let e = t; for (let i = 0; i < 3; i++) e = hiss(c, o, { t: t + i * 0.18, dur: 0.08, vol: 0.13, f: 5000, type: "highpass", a: 0.005, r: 0.06 }); return e; } },
  "act-pick": { group: "action", desc: "Pick (berry, leaf, fruit)", play: (c, o, t) => { T(c, o, { t, dur: 0.04, f: hz("A5"), f2: hz("E6"), type: "triangle", vol: 0.24, r: 0.05 }); return hiss(c, o, { t, dur: 0.015, vol: 0.1, f: 3500 }); } },
  "act-pull": { group: "action", desc: "Pull (weed, stone, root)", play: (c, o, t) => { T(c, o, { t, dur: 0.25, f: hz("C4"), f2: hz("C5"), type: "triangle", vol: 0.2, slide: "lin" }); thud(c, o, t + 0.26, { f: 200, vol: 0.22, dur: 0.04 }); return hiss(c, o, { t: t + 0.26, dur: 0.06, vol: 0.12, f: 2000 }); } },
  "act-snip": { group: "action", desc: "Snip (scissors)", play: (c, o, t) => { hiss(c, o, { t, dur: 0.025, vol: 0.18, f: 6500, type: "highpass" }); T(c, o, { t, dur: 0.015, f: hz("C7"), type: "pulse12", vol: 0.06 }); return hiss(c, o, { t: t + 0.12, dur: 0.025, vol: 0.18, f: 7000, type: "highpass" }); } },
  "act-poke": { group: "action", desc: "Poke (a finger in the soil)", play: (c, o, t) => { thud(c, o, t, { f: 170, vol: 0.18, dur: 0.04 }); return T(c, o, { t, dur: 0.04, f: hz("E5"), type: "triangle", vol: 0.16 }); } },
  "act-firm": { group: "action", desc: "Firm (pat-pat the soil)", play: (c, o, t) => { thud(c, o, t, { f: 110, vol: 0.28 }); return thud(c, o, t + 0.16, { f: 100, vol: 0.26 }); } },
  "act-hold": { group: "action", desc: "Hold (the ring fills)", play: (c, o, t) => arp(c, o, t, ["C5", "E5", "G5"], { step: 0.07, type: "triangle", vol: 0.22, gate: 1.4 }) },
  "act-cover": { group: "action", desc: "Cover (soil over seeds, a net, mulch)", play: (c, o, t) => whoosh(c, o, t, { dur: 0.42, from: 700, to: 2000, vol: 0.16, q: 0.7 }) },
  "act-collect": { group: "action", desc: "Collect (plop into a container)", play: (c, o, t) => { T(c, o, { t, dur: 0.08, f: hz("E5"), f2: hz("A4"), type: "sine", vol: 0.28 }); return hiss(c, o, { t, dur: 0.02, vol: 0.08, f: 2500 }); } },
  "act-wipe": { group: "action", desc: "Wipe (squeaky cloth on glass)", play: (c, o, t) => { T(c, o, { t, dur: 0.12, f: 1700, f2: 2500, type: "sine", vol: 0.1 }); return T(c, o, { t: t + 0.18, dur: 0.12, f: 2400, f2: 1800, type: "sine", vol: 0.09 }); } },
  "act-measure": { group: "action", desc: "Measure (tape zips out, click)", play: (c, o, t) => { hiss(c, o, { t, dur: 0.3, vol: 0.1, f: 3000, f2: 5000, q: 4 }); return T(c, o, { t: t + 0.32, dur: 0.02, f: hz("A6"), type: "pulse12", vol: 0.1 }); } },
  "act-furrow": { group: "action", desc: "Furrow (a long scrape along the row)", play: (c, o, t) => hiss(c, o, { t, dur: 0.55, vol: 0.15, f: 900, f2: 600, q: 1.4, a: 0.05, r: 0.12 }) },
  "act-match": { group: "action", desc: "Light a match / lantern", play: (c, o, t) => { hiss(c, o, { t, dur: 0.1, vol: 0.2, f: 3500, type: "highpass" }); hiss(c, o, { t: t + 0.1, dur: 0.4, vol: 0.16, f: 300, f2: 1200, type: "lowpass", a: 0.05, r: 0.2 }); let e = t; for (let i = 0; i < 4; i++) e = hiss(c, o, { t: t + 0.25 + i * 0.09, dur: 0.008, vol: 0.08, f: 5000 }); return e + 0.2; } },
  "act-gate": { group: "action", desc: "Close the gate (clunk, latch)", play: (c, o, t) => { thud(c, o, t, { f: 90, vol: 0.35, dur: 0.1 }); T(c, o, { t, dur: 0.12, f: hz("G2"), type: "triangle", vol: 0.3 }); return T(c, o, { t: t + 0.18, dur: 0.02, f: hz("D6"), type: "pulse12", vol: 0.12 }); } },
  "act-phone-down": { group: "action", desc: "Set the phone face down", play: (c, o, t) => { thud(c, o, t, { f: 160, vol: 0.25, dur: 0.05 }); return T(c, o, { t: t + 0.06, dur: 0.15, f: hz("E5"), f2: hz("E4"), type: "sine", vol: 0.16 }); } },
  "act-camera": { group: "action", desc: "Take a photo (shutter, flash)", play: (c, o, t) => { hiss(c, o, { t, dur: 0.02, vol: 0.22, f: 4000 }); hiss(c, o, { t: t + 0.06, dur: 0.03, vol: 0.18, f: 2500 }); return T(c, o, { t: t + 0.08, dur: 0.25, f: 2000, f2: 6000, type: "sine", vol: 0.05, r: 0.05 }); } },
  "act-label": { group: "action", desc: "Push a plant label in", play: (c, o, t) => { thud(c, o, t, { f: 220, vol: 0.2, dur: 0.04 }); return T(c, o, { t: t + 0.03, dur: 0.05, f: hz("B4"), type: "triangle", vol: 0.15 }); } },
  "act-pests": { group: "action", desc: "Flick a bug off", play: (c, o, t) => { T(c, o, { t, dur: 0.06, f: hz("C6"), f2: hz("C7"), type: "pulse12", vol: 0.09 }); return hiss(c, o, { t, dur: 0.04, vol: 0.1, f: 4500 }); } },
  "act-fill": { group: "action", desc: "Fill a pot (soil tips in)", play: (c, o, t) => { hiss(c, o, { t, dur: 0.5, vol: 0.14, f: 500, type: "lowpass", q: 1, a: 0.05, r: 0.15 }); return thud(c, o, t + 0.45, { f: 140, vol: 0.18 }); } },
  "act-release": { group: "action", desc: "Release ladybugs (lid pops, flutter)", play: (c, o, t) => { T(c, o, { t, dur: 0.05, f: hz("G5"), f2: hz("G6"), type: "sine", vol: 0.22 }); let e = t; for (let i = 0; i < 8; i++) e = T(c, o, { t: t + 0.12 + i * 0.04, dur: 0.025, f: hz(i % 2 ? "E7" : "C7"), type: "pulse12", vol: 0.04 }); return e; } },
  "act-magnifier": { group: "action", desc: "Look through the magnifier (action)", play: (c, o, t) => T(c, o, { t, dur: 0.2, f: 700, f2: 1500, type: "sine", vol: 0.14, r: 0.1 }) },
  "chore-done": { group: "action", desc: "A chore (or any hands-on job) is finished", play: (c, o, t) => { arp(c, o, t, ["C5", "E5", "G5"], { step: 0.07, type: "triangle", vol: 0.24 }); return T(c, o, { t: t + 0.21, dur: 0.18, f: hz("C6"), type: "pulse25", vol: 0.08, r: 0.12 }); } },
  "chore-skip": { group: "action", desc: "Skip a chore", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.16, from: 3000, to: 900, vol: 0.1 }); return arp(c, o, t, ["C5", "G4"], { step: 0.07, type: "pulse25", vol: 0.07 }); } },

  // ---- reveal card ----
  "star": { group: "reveal", desc: "A reveal star slams in (opts.i 0–2 climbs)", play: (c, o, t, x) => { const i = x?.i || 0; thud(c, o, t, { f: 120, vol: 0.35 }); arp(c, o, t, [72 + [0, 4, 7][i], 79 + [0, 4, 7][i]], { step: 0.03, type: "square", vol: 0.1, gate: 2 }); return sparkle(c, o, t + 0.08, { from: 96 + i * 2, n: 4 }); } },
  "star-off": { group: "reveal", desc: "An empty star (a dull thump)", play: (c, o, t) => thud(c, o, t, { f: 90, vol: 0.2 }) },
  "stamp": { group: "reveal", desc: "CAUGHT / FOOLED stamp slams down", play: (c, o, t) => { hiss(c, o, { t, dur: 0.25, vol: 0.3, f: 500, f2: 120, type: "lowpass", q: 0.7, r: 0.15 }); T(c, o, { t, dur: 0.25, f: hz("C3"), f2: hz("C2"), type: "triangle", vol: 0.45 }); return T(c, o, { t, dur: 0.12, f: hz("C4"), type: "square", vol: 0.1 }); } },
  "card-flip": { group: "reveal", desc: "Flip the reveal card", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.16, from: 1200, to: 4000, vol: 0.12 }); return T(c, o, { t: t + 0.14, dur: 0.04, f: hz("D6"), type: "pulse12", vol: 0.07 }); } },
  "card-fly": { group: "reveal", desc: "The card flies into the field guide", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.6, from: 500, to: 4000, vol: 0.14 }); return T(c, o, { t, dur: 0.6, f: hz("C5"), f2: hz("C7"), type: "pulse12", vol: 0.05 }); } },
  "card-land": { group: "reveal", desc: "The card lands in its slot", play: (c, o, t) => { thud(c, o, t, { f: 160, vol: 0.22 }); arp(c, o, t + 0.02, ["G5", "C6", "E6", "G6"], { step: 0.05, type: "pulse25", vol: 0.09 }); return sparkle(c, o, t + 0.2, { from: 100, n: 4 }); } },

  // ---- Master Rowan's story ----
  "cutscene-next": { group: "story", desc: "Next beat in the cutscene", play: (c, o, t) => T(c, o, { t, dur: 0.04, f: hz("G5"), type: "triangle", vol: 0.18 }) },
  "name-enter": { group: "story", desc: "Entering your name", play: (c, o, t) => { arp(c, o, t, ["G4", "C5", "E5", "G5", "C6"], { step: 0.06, type: "triangle", vol: 0.22 }); return sparkle(c, o, t + 0.3, { from: 98 }); } },
  "pouch-toss": { group: "story", desc: "Rowan tosses the seed pouch", play: (c, o, t) => { whoosh(c, o, t, { dur: 0.8, from: 400, to: 2400, vol: 0.12 }); return T(c, o, { t, dur: 0.8, f: hz("C5"), f2: hz("G5"), type: "pulse12", vol: 0.05, slide: "lin", vib: 0.5, vibRate: 10 }); } },
  "pouch-burst": { group: "story", desc: "The pouch bursts into seeds", play: (c, o, t) => { T(c, o, { t, dur: 0.06, f: hz("C6"), f2: hz("C5"), type: "square", vol: 0.1 }); return hiss(c, o, { t, dur: 0.2, vol: 0.2, f: 2500, type: "bandpass", q: 0.5, r: 0.1 }); } },
  "sparkle": { group: "story", desc: "Seeds sparkle down into the almanac", play: (c, o, t) => sparkle(c, o, t, { n: 8, from: 100, step: 0.06, vol: 0.08 }) },
  "almanac-catch": { group: "story", desc: "The almanac takes the seeds (bump)", play: (c, o, t) => { thud(c, o, t, { f: 150, vol: 0.22 }); return arp(c, o, t, ["C6", "G6"], { step: 0.07, type: "pulse25", vol: 0.08 }); } },
  "bowl": { group: "story", desc: "A stew rating bowl fills (opts.i 0–4 climbs)", play: (c, o, t, x) => { const i = x?.i || 0; T(c, o, { t, dur: 0.05, f: hz(72 + [0, 2, 4, 7, 9][i % 5]), type: "triangle", vol: 0.28, r: 0.12 }); return hiss(c, o, { t, dur: 0.02, vol: 0.08, f: 1800 }); } },
  "bowl-empty": { group: "story", desc: "An empty rating bowl", play: (c, o, t) => T(c, o, { t, dur: 0.05, f: hz("C4"), type: "triangle", vol: 0.16 }) },
  "title-hit": { group: "story", desc: "The DRIFTWOOD title hit (trailer end, ending)", play: (c, o, t) => {
    hiss(c, o, { t, dur: 0.9, vol: 0.22, f: 6000, f2: 2000, type: "highpass", a: 0.002, d: 0.2, s: 0.3, r: 0.8 });
    T(c, o, { t, dur: 0.5, f: hz("C3"), f2: hz("C2"), type: "triangle", vol: 0.45, r: 0.6 });
    ["C4", "G4", "C5", "E5", "G5"].forEach((n, i) => T(c, o, { t: t + i * 0.012, dur: 1.2, f: hz(n), type: i % 2 ? "pulse25" : "square", vol: 0.06, a: 0.005, d: 0.3, s: 0.5, r: 0.9, vib: 0.12, vibDelay: 0.3 }));
    return sparkle(c, o, t + 0.15, { n: 8, from: 108, step: 0.07 }) + 1;
  } },
};
// Loudness trims, from measuring every sound's peak offline (most land
// within -9…-15 dB before the effects bus): quiet ones up, loud ones down.
const TRIM = {
  "act-furrow": 2.5, "almanac-flip-back": 2, "almanac-tab": 1.6, "pet-sheepish": 2, "pet-concede": 1.6, "meter-up": 2, rot: 2,
  "give-in": 1.8, "act-wipe": 1.8, "act-measure": 1.8, "act-cover": 1.6, "card-fly": 1.6, "act-pests": 1.5, "card-flip": 1.5,
  sparkle: 1.5, "pouch-toss": 1.8, "act-gate": 0.5, "stand-firm": 0.5, stamp: 0.7, "act-sprinkle": 0.45, "chore-done": 0.8, "fix-right": 0.8,
};
for (const [name, k] of Object.entries(TRIM)) {
  const play = SFX[name].play;
  SFX[name].play = (c, o, t, x) => { const g = c.createGain(); g.gain.value = k; g.connect(o); return play(c, g, t, x); };
}
export const sfxNames = () => Object.keys(SFX);
