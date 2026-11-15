// Pet voices: short Animal-Crossing-style blip babble while a line shows.
// Each speaker has its own wave, pitch, pace and melody shape, matched to
// its personality (docs: memory "Driftwood pet personalities"):
//   Mango (parrot, hype):           bright 25% pulse, high, fast, big upward chirps
//   Luna (cat, self-important):     thin 12% pulse, mid-high, measured, haughty
//                                   downward slides at word ends, a little vibrato
//   Ember (fox, laid-back):         triangle, low-mid, slow and swung, lazy glides
//   Biscuit (dog, diva):            square, mid, bouncy, dramatic leaps, a long
//                                   vibrato note to end a sentence
//   Bugs (bunny on your phone):     soft sine, slow and quiet, little sighing
//                                   falls; lowercase and clingy
//   Rowan (wizard):                 low triangle with a sine under it, slow, calm,
//                                   narrow range
// babble(id, text) is pure (a plan of blips), so tests can check it.
import { tone, hz, noteNum } from "./synth.js";

export const VOICES = {
  mango: { name: "Mango", type: "pulse25", base: "A5", scale: [0, 2, 4, 7, 9, 12, 14], spread: 6, syl: 0.058, gap: 0.012, vol: 0.18, rise: 5, end: "up", swing: 0, chirp: true },
  luna: { name: "Luna", type: "pulse12", base: "E5", scale: [0, 2, 3, 5, 7, 8, 10], spread: 4, syl: 0.085, gap: 0.02, vol: 0.2, fall: 3, end: "down", vib: 0.25, swing: 0 },
  ember: { name: "Ember", type: "triangle", base: "A3", scale: [0, 3, 5, 7, 10], spread: 3, syl: 0.105, gap: 0.03, vol: 0.22, glide: true, end: "flat", swing: 0.35 },
  biscuit: { name: "Biscuit", type: "square", base: "D5", scale: [0, 2, 4, 5, 7, 9, 11, 12], spread: 7, syl: 0.072, gap: 0.016, vol: 0.17, end: "diva", vib: 0.4, swing: 0.15 },
  bugs: { name: "Bugs", type: "sine", base: "G4", scale: [0, 2, 3, 7, 8], spread: 3, syl: 0.13, gap: 0.045, vol: 0.13, fall: 2, end: "sigh", swing: 0, soft: true },
  rowan: { name: "Rowan", type: "triangle", base: "D3", scale: [0, 2, 5, 7, 9], spread: 2, syl: 0.12, gap: 0.035, vol: 0.2, end: "flat", swing: 0, sub: true },
};
export const voiceIds = () => Object.keys(VOICES);

// A small stable hash, so the same line always babbles the same way.
function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}

// The longest a line babbles for (s): it's a flavour, not a reading.
export const MAX_VOICE_S = 2.4;

// babble(id, text, { maxS }) → { blips: [{ t, dur, note, glideTo?, vib? }], length }
// One blip per syllable-ish (about every 2–3 letters); spaces are tiny gaps,
// commas a short pause, . ! ? … a longer one and the sentence's end shape.
export function babble(id, text, { maxS = MAX_VOICE_S } = {}) {
  const v = VOICES[id] || VOICES.rowan;
  const base = noteNum(v.base);
  const clean = String(text || "").replace(/\{[^}]*\}/g, "friend");
  let seed = hash(id + clean);
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const blips = [];
  let t = 0;
  let run = 0; // letters since the last blip
  let deg = Math.floor(v.scale.length / 2);
  let k = 0;
  const pick = (ch) => {
    // vowels move the melody; capitals (Mango's ANYTHING) jump up
    const step = Math.round((rnd() - 0.5) * (v.spread / 2));
    deg = Math.max(0, Math.min(v.scale.length - 1, deg + step + (/[aeiou]/i.test(ch) ? 1 : 0) - (rnd() < 0.3 ? 1 : 0)));
    let n = base + v.scale[deg];
    if (ch >= "A" && ch <= "Z" && v.rise) n += v.rise;
    return n;
  };
  const chars = [...clean];
  for (let i = 0; i < chars.length && t < maxS; i++) {
    const ch = chars[i];
    if (/[a-z0-9']/i.test(ch)) {
      run += 1;
      if (run >= 2 || i === chars.length - 1 || !/[a-z0-9']/i.test(chars[i + 1] || " ")) {
        run = 0;
        const swing = v.swing && k % 2 === 1 ? v.syl * v.swing : 0;
        const dur = v.syl * (0.8 + rnd() * 0.4);
        const note = pick(ch);
        const blip = { t: t + swing, dur, note };
        if (v.glide && rnd() < 0.5) blip.glideTo = note - 2;
        if (v.chirp && rnd() < 0.35) blip.glideTo = note + 5;
        blips.push(blip);
        t += dur + v.gap + swing;
        k += 1;
      }
    } else if (ch === " ") {
      t += v.gap;
    } else if (ch === ",") {
      t += v.syl * 1.2;
    } else if (/[.!?…;:—-]/.test(ch)) {
      const last = blips.at(-1);
      if (last) shapeEnd(v, last, ch);
      t += v.syl * 2.2;
    }
  }
  const last = blips.at(-1);
  if (last && last.shaped !== true) shapeEnd(v, last, ".");
  const length = blips.length ? Math.max(...blips.map((b) => b.t + b.dur)) : 0;
  return { blips, length };
}

function shapeEnd(v, b, ch) {
  b.shaped = true;
  if (ch === "?") { b.glideTo = b.note + 4; return; }
  if (ch === "!" && (v.end === "up" || v.end === "diva")) { b.glideTo = b.note + 7; b.dur *= 1.4; return; }
  if (v.end === "down") { b.glideTo = b.note - (v.fall || 3); b.dur *= 1.6; return; }
  if (v.end === "sigh") { b.glideTo = b.note - (v.fall || 2); b.dur *= 1.8; return; }
  if (v.end === "diva") { b.dur *= 2.2; b.vib = 0.5; return; }
  if (v.end === "up") { b.glideTo = b.note + 3; return; }
  b.dur *= 1.3;
}

// Render a babble into `out` starting at time t. Returns its end time.
export function speak(ctx, out, id, text, t, opts = {}) {
  const v = VOICES[id] || VOICES.rowan;
  const { blips } = babble(id, text, opts);
  let end = t;
  for (const b of blips) {
    const at = t + b.t;
    end = Math.max(end, tone(ctx, out, {
      t: at, dur: b.dur, f: hz(b.note), f2: b.glideTo != null ? hz(b.glideTo) : null, glide: b.dur,
      type: v.type, vol: v.vol, a: v.soft ? 0.02 : 0.004, d: 0.03, s: 0.75, r: v.soft ? 0.05 : 0.025,
      vib: b.vib || v.vib || 0, vibRate: 7, vibDelay: 0.04,
    }));
    if (v.sub) tone(ctx, out, { t: at, dur: b.dur, f: hz(b.note - 12), type: "sine", vol: v.vol * 0.5, a: 0.01, r: 0.04 });
    if (v.soft) tone(ctx, out, { t: at, dur: b.dur * 0.6, type: "noise", vol: 0.015, filter: { type: "bandpass", f: 3000, q: 0.7 } });
  }
  return end;
}
