// Driftwood's music: eight-bar chiptune loops, one per screen and mood, all
// original. A track is chords + a hand-written melody (8 eighth-notes a bar);
// the bass, arpeggio and drums are generated from the chords in the track's
// style. Every track also has a "tense" layer (a tritone shimmer and a
// heartbeat) that fades in while a drift is on screen.
//
// The map runs dawn → night, so the levels do too:
//   level-1 morning (Mango) · level-2 late morning, greenhouse (Luna) ·
//   level-3 afternoon, swung (Ember) · level-4 dusk (Biscuit) ·
//   level-5 night, softer and a little uneasy (Bugs)
// plus title (splash/map), cutscene (Rowan), stew (the dinner ending), and two
// one-shot stings for the reveal: caught and fooled.
//
// trackEvents(name) → { events, loop } is pure (times in seconds from the loop's
// start), so the live player (index.js), the offline trailer render and the
// tests all share it.
import { tone, noteNum, hz } from "./synth.js";

export const TRACKS = {
  title: {
    desc: "Splash and map: gentle, sunset garden", bpm: 80, lead: "pulse25", leadVol: 0.07,
    chords: ["Cmaj7", "Am7", "Fmaj7", "G", "Cmaj7", "Em7", "Fmaj7", "Gsus4"],
    melody: "E5 - G5 - B5 - A5 G5 | A5 - - - E5 - C5 - | F5 - A5 - C6 - B5 A5 | G5 - - - D5 - . . | E5 - G5 - B5 - C6 B5 | G5 - - - E5 - D5 E5 | F5 - E5 - D5 - C5 - | D5 - - - - - . .",
    bass: "half", arp: "up8", drums: "brush",
  },
  cutscene: {
    desc: "Master Rowan's cutscene: a little mystical", bpm: 72, lead: "triangle", leadVol: 0.2,
    chords: ["Dm9", "Bb", "F", "C", "Dm9", "Gm7", "Bb", "A7"],
    melody: "A4 - - - D5 - E5 - | F5 - - - D5 - - - | C5 - - - A4 - C5 - | E5 - - - G4 - - - | A4 - - - D5 - F5 - | G5 - - - F5 - D5 - | F5 - - - E5 - D5 - | C#5 - - - - - . .",
    bass: "whole", arp: "sparkle16", drums: "none",
  },
  "level-1": {
    desc: "Level 1, morning (Mango): bright and hopping", bpm: 104, lead: "pulse25", leadVol: 0.075,
    chords: ["G", "D", "Em", "C", "G", "D", "C", "D"],
    melody: "D5 . G5 . B5 - A5 G5 | A5 - F#5 - D5 - . . | E5 . G5 . B5 - A5 G5 | E5 - - - C5 - D5 E5 | D5 . G5 . B5 - D6 B5 | A5 - F#5 - A5 - . . | G5 - E5 - C5 - E5 G5 | F#5 - - - A5 - . .",
    bass: "bounce", arp: "up8", drums: "light",
  },
  "level-2": {
    desc: "Level 2, late morning in the greenhouse (Luna): poised", bpm: 92, lead: "pulse12", leadVol: 0.08,
    chords: ["Fmaj7", "G", "Em7", "Am7", "Fmaj7", "G", "Am", "C"],
    melody: "A5 - - C6 - - A5 - | B5 - - D6 - - B5 - | G5 - E5 - B4 - D5 - | C5 - - - E5 - . . | A5 - - C6 - - E6 - | D6 - - B5 - - G5 - | A5 - C6 - E5 - A5 - | G5 - - - - - . .",
    bass: "half", arp: "box", drums: "tick",
  },
  "level-3": {
    desc: "Level 3, afternoon (Ember): lazy and swung", bpm: 84, lead: "triangle", leadVol: 0.2, swing: 0.32,
    chords: ["Am7", "D7", "Am7", "D7", "Fmaj7", "E7", "Am7", "E7"],
    melody: ". . E5 G5 A5 - - . | F#5 - - - E5 - . . | . . E5 G5 C6 - A5 - | G5 - F#5 - D5 - . . | . . F5 A5 C6 - - A5 | G#5 - - - E5 - . . | . . A5 C6 E6 - D6 C6 | B5 - - - G#5 - . .",
    bass: "walk", arp: "offbeat", drums: "swing",
  },
  "level-4": {
    desc: "Level 4, dusk (Biscuit): warm, a touch dramatic", bpm: 88, lead: "square", leadVol: 0.055,
    chords: ["Eb", "Cm", "Ab", "Bb", "Eb", "Gm", "Ab", "Bb"],
    melody: "G5 - Bb5 - Eb6 - - - | D6 - C6 - G5 - - - | Ab5 - C6 - Eb6 - D6 C6 | Bb5 - - - F5 - . . | G5 - Bb5 - Eb6 - G6 - | F6 - D6 - Bb5 - - - | C6 - Bb5 - Ab5 - G5 - | F5 - - - - - . .",
    bass: "root8", arp: "up8", drums: "light",
  },
  "level-5": {
    desc: "Level 5, night (Bugs): soft, sparse, a little uneasy", bpm: 68, lead: "sine", leadVol: 0.16,
    chords: ["Em", "Cmaj7", "Em", "B7", "Am", "Cmaj7", "F#dim", "B7"],
    melody: "B4 - - - E5 - - - | G5 - - - F#5 - E5 - | B4 - - - G5 - - - | F#5 - - - D#5 - - - | C5 - - - E5 - A5 - | G5 - - - E5 - - - | F#5 - - - C5 - A4 - | B4 - - - - - . .",
    bass: "whole", arp: "musicbox", drums: "none",
  },
  stew: {
    desc: "The stew dinner ending: warm and folksy", bpm: 100, lead: "pulse25", leadVol: 0.075,
    chords: ["C", "F", "C", "G", "Am", "F", "G", "C"],
    melody: "E5 - G5 - C6 - G5 - | A5 - - - F5 - A5 - | G5 - E5 - C5 - E5 - | D5 - - - G5 - . . | C6 - B5 - A5 - E5 - | F5 - A5 - C6 - A5 - | G5 - E5 - D5 - G5 - | C5 - - - - - . .",
    bass: "bounce", arp: "up8", drums: "folk",
  },
};
export const trackNames = () => Object.keys(TRACKS);

// Which track each level plays (the map's dawn → night).
export const LEVEL_TRACK = { "level-1": "level-1", "level-2": "level-2", "level-3": "level-3", "level-4": "level-4", "level-5": "level-5" };

// ---- chords ----
const QUALITY = {
  "": [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14],
  sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], add9: [0, 4, 7, 14],
};
export function chord(sym) {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym);
  if (!m || !(m[2] in QUALITY)) throw new Error(`bad chord: ${sym}`);
  const root = noteNum(`${m[1]}3`) % 12;
  return { root, tones: QUALITY[m[2]] };
}
const near = (pc, lo) => { let n = lo + ((pc - lo) % 12 + 12) % 12; return n; }; // the pitch class at or above lo

// ---- one loop of a track ----
// Event: { t, dur, f (Hz), type, vol, pan?, layer: "main" | "tense", noise?: { f, type, q } }
export function trackEvents(name, { bpm: forceBpm } = {}) {
  const tr = TRACKS[name];
  if (!tr) throw new Error(`no track: ${name}`);
  const bpm = forceBpm || tr.bpm;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const e8 = beat / 2;
  const e16 = beat / 4;
  const sw = (i8) => (tr.swing && i8 % 2 === 1 ? tr.swing * e8 * 0.66 : 0);
  const ev = [];
  const note = (layer, t, dur, n, type, vol, extra = {}) => ev.push({ layer, t, dur, f: hz(n), type, vol, ...extra });
  const noise = (layer, t, dur, vol, f, ftype = "highpass", extra = {}) => ev.push({ layer, t, dur, vol, type: "noise", noise: { f, type: ftype, q: extra.q ?? 0.8 }, ...extra });

  const bars = tr.melody.split("|").map((b) => b.trim().split(/\s+/));
  bars.forEach((tokens, bi) => {
    if (tokens.length !== 8) throw new Error(`${name} bar ${bi + 1}: ${tokens.length} eighths`);
    const t0 = bi * bar;
    const c = chord(tr.chords[bi % tr.chords.length]);
    const bassRoot = near(c.root, 38); // D2…C#3
    const tones = c.tones.map((x) => c.root + x);

    // melody: a note holds through its "-"s
    tokens.forEach((tok, i) => {
      if (tok === "-" || tok === ".") return;
      let len = 1;
      while (tokens[i + len] === "-") len++;
      note("main", t0 + i * e8 + sw(i), len * e8 * 0.92, tok, tr.lead, tr.leadVol, { vib: len >= 3 ? 0.15 : 0, a: tr.lead === "sine" || tr.lead === "triangle" ? 0.02 : 0.005 });
    });

    // bass
    const B = (t, dur, n, vol = 0.24) => note("main", t0 + t, dur, n, "triangle", vol);
    if (tr.bass === "whole") B(0, bar * 0.95, bassRoot, 0.22);
    if (tr.bass === "half") { B(0, beat * 1.8, bassRoot); B(beat * 2, beat * 1.8, bassRoot + (bi % 2 ? 7 : 0)); }
    if (tr.bass === "root8") for (let i = 0; i < 8; i++) B(i * e8, e8 * 0.7, bassRoot + (i === 7 ? 7 : 0), 0.2);
    if (tr.bass === "bounce") [0, 7, 12, 7].forEach((x, i) => B(i * beat, beat * 0.55, bassRoot + x, 0.22));
    if (tr.bass === "walk") [0, 3, 7, 9].map((x, i) => B(i * beat + sw(i * 2), beat * 0.8, bassRoot + (tones.length > 3 ? [0, c.tones[1], 7, c.tones[3]][i] : x), 0.24));

    // arpeggio / accompaniment (quiet, panned a little)
    const top = tones.map((x) => near(x % 12, 60)).sort((a, b) => a - b);
    const A = (t, dur, n, vol, type = "pulse12") => note("main", t0 + t, dur, n, type, vol, { pan: -0.25 });
    if (tr.arp === "up8") for (let i = 0; i < 8; i++) A(i * e8 + sw(i), e8 * 0.6, top[i % top.length] + (i >= 4 ? 12 : 0), 0.035);
    if (tr.arp === "box") for (let i = 0; i < 8; i++) A(i * e8, e8 * 0.5, top[[0, 2, 1, 2][i % 4] % top.length] + 12, 0.035);
    if (tr.arp === "offbeat") for (let i = 0; i < 4; i++) top.slice(0, 3).forEach((n) => A(i * beat + e8 + sw(1), e8 * 0.6, n, 0.025, "pulse25"));
    if (tr.arp === "sparkle16") for (let i = 0; i < 16; i++) if (i % 3 !== 2) A(i * e16, e16 * 0.7, top[i % top.length] + 12, 0.025);
    if (tr.arp === "musicbox") [0, 3, 5, 6].forEach((s, k) => A(s * e8, e8 * 1.4, top[k % top.length] + 12, 0.045, "triangle"));

    // drums (noise hats, triangle kicks)
    const K = (t, vol = 0.32) => ev.push({ layer: "main", t: t0 + t, dur: 0.07, f: 130, f2: 50, type: "triangle", vol });
    const H = (t, vol = 0.03, f = 7000) => noise("main", t0 + t, 0.025, vol, f, "highpass", { pan: 0.2 });
    if (tr.drums === "brush") for (let i = 0; i < 4; i++) noise("main", t0 + i * beat + e8, e8 * 0.8, 0.018, 4500, "bandpass", { q: 0.6, a: 0.04 });
    if (tr.drums === "tick") for (let i = 0; i < 8; i++) H(i * e8, i % 2 ? 0.02 : 0.03, 8000);
    if (tr.drums === "light") { K(0); K(beat * 2.5, 0.22); for (let i = 0; i < 8; i++) H(i * e8 + sw(i), i % 2 ? 0.035 : 0.02); noise("main", t0 + beat, 0.06, 0.05, 1800, "bandpass"); noise("main", t0 + beat * 3, 0.06, 0.05, 1800, "bandpass"); }
    if (tr.drums === "swing") { K(0, 0.26); K(beat * 2, 0.2); for (let i = 0; i < 4; i++) { H(i * beat, 0.03); H(i * beat + e8 + sw(1), 0.02); } }
    if (tr.drums === "folk") { K(0); K(beat * 2); for (let i = 0; i < 4; i++) noise("main", t0 + i * beat + e8, 0.05, 0.04, 3000, "bandpass"); }

    // the tense layer: a tritone shimmer over the root, a heartbeat, a rising hiss
    for (let i = 0; i < 16; i++) note("tense", t0 + i * e16, e16 * 0.5, near(c.root + 6, 74), "pulse12", 0.03, { detune: i % 2 ? 18 : -18, pan: 0.3 });
    ev.push({ layer: "tense", t: t0, dur: 0.09, f: 90, f2: 45, type: "triangle", vol: 0.4 });
    ev.push({ layer: "tense", t: t0 + beat * 0.6, dur: 0.08, f: 80, f2: 42, type: "triangle", vol: 0.3 });
    if (bi % 2 === 0) noise("tense", t0, bar * 2 * 0.95, 0.025, 1500, "bandpass", { q: 2, a: bar * 1.6, r: 0.1, f2: 5000 });
    note("tense", t0 + beat * 2, beat * 1.8, bassRoot + 13, "pulse12", 0.025, { vib: 0.6, vibRate: 3 });
  });
  return { events: ev.sort((a, b) => a.t - b.t), loop: bars.length * bar, bar, bpm };
}

// Play one event into `out` at time t (s). Used live and offline.
export function playEvent(ctx, out, e, t) {
  if (e.type === "noise") {
    return tone(ctx, out, { t, dur: e.dur, type: "noise", vol: e.vol, a: e.a ?? 0.002, d: 0.02, s: 0.5, r: e.r ?? 0.03, pan: e.pan,
      filter: { type: e.noise.type, f: e.noise.f, f2: e.f2, q: e.noise.q } });
  }
  return tone(ctx, out, { t, dur: e.dur, f: e.f, f2: e.f2, type: e.type, vol: e.vol, a: e.a ?? 0.005, d: 0.08, s: 0.75, r: 0.06,
    vib: e.vib, vibRate: e.vibRate ?? 5, vibDelay: 0.15, detune: e.detune, pan: e.pan });
}

// Schedule `bars` bars of a track from t0 (looping as needed), for offline renders.
// outs: { main, tense } (tense may be null to leave it out); fromBar: where in the loop to start.
export function scheduleBars(ctx, outs, name, { t0, bars, fromBar = 0, bpm, drums = true } = {}) {
  const { events, loop, bar } = trackEvents(name, { bpm });
  const per = Math.round(loop / bar);
  let end = t0;
  for (let b = 0; b < bars; b++) {
    const src = (fromBar + b) % per;
    for (const e of events) {
      if (e.t < src * bar - 1e-6 || e.t >= (src + 1) * bar - 1e-6) continue;
      if (!drums && (e.f2 && e.type === "triangle" && e.f < 140 && e.layer === "main" || e.type === "noise" && e.layer === "main")) continue;
      const out = e.layer === "tense" ? outs.tense : outs.main;
      if (!out) continue;
      end = Math.max(end, playEvent(ctx, out, e, t0 + b * bar + (e.t - src * bar)));
    }
  }
  return end;
}

// ---- stings: one-shots on the music bus at the reveal ----
export const STINGS = {
  caught: { desc: "Reveal: you caught the drift (a bright little fanfare)", play: (ctx, out, t) => {
    const n = (x, at, dur, type = "square", vol = 0.08) => tone(ctx, out, { t: t + at, dur, f: hz(x), type, vol, r: 0.12 });
    ["G4", "C5", "E5", "G5"].forEach((x, i) => n(x, i * 0.09, 0.08));
    n("C6", 0.38, 0.9, "pulse25", 0.09);
    n("E5", 0.38, 0.9, "square", 0.05);
    n("C3", 0.38, 0.9, "triangle", 0.3);
    tone(ctx, out, { t: t + 0.38, dur: 0.9, f: hz("G5"), type: "pulse12", vol: 0.05, vib: 0.2, vibDelay: 0.3, r: 0.5 });
    for (let i = 0; i < 6; i++) tone(ctx, out, { t: t + 0.5 + i * 0.07, dur: 0.03, f: hz(96 - i * 3), type: "pulse12", vol: 0.05, r: 0.05 });
    return t + 1.9;
  } },
  fooled: { desc: "Reveal: the pet fooled you (a gentle wah-wah, not harsh)", play: (ctx, out, t) => {
    ["E5", "Eb5", "D5"].forEach((x, i) => tone(ctx, out, { t: t + i * 0.32, dur: 0.26, f: hz(x), type: "pulse25", vol: 0.08, vib: 0.2, r: 0.06 }));
    tone(ctx, out, { t: t + 0.96, dur: 0.9, f: hz("Db5"), f2: hz("C5"), glide: 0.9, type: "pulse25", vol: 0.08, vib: 0.5, vibRate: 5, r: 0.3 });
    ["E3", "Eb3", "D3", "Db3"].forEach((x, i) => tone(ctx, out, { t: t + i * 0.32, dur: i === 3 ? 0.9 : 0.26, f: hz(x), type: "triangle", vol: 0.24, r: 0.2 }));
    return t + 2.3;
  } },
};
export const stingNames = () => Object.keys(STINGS);
