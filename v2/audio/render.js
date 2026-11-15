// Offline renders (OfflineAudioContext: computed into memory, never played):
// WAV downloads on the sound board, and the trailer stems
// (scripts/render-trailer-audio.cjs → docs/trailer/audio/).
import { SFX } from "./sounds.js";
import { STINGS, scheduleBars, trackEvents, playEvent } from "./music.js";
import { speak } from "./voices.js";
import { tone, hz } from "./synth.js";

export const RATE = 44100;

async function render(seconds, draw, { channels = 1, rate = RATE } = {}) {
  const ctx = new OfflineAudioContext(channels, Math.ceil(seconds * rate), rate);
  const out = ctx.createGain();
  out.connect(ctx.destination);
  draw(ctx, out);
  return ctx.startRendering();
}
const channelsOf = (buf) => Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));

// Cut trailing silence (below -60 dB) but keep a short tail.
function trimmed(buf, tail = 0.05) {
  const chs = channelsOf(buf);
  let last = 0;
  for (const d of chs) for (let i = d.length - 1; i > last; i--) if (Math.abs(d[i]) > 0.001) { last = i; break; }
  const n = Math.min(buf.length, last + Math.round(tail * buf.sampleRate));
  return chs.map((d) => d.slice(0, n));
}
// Scale so the loudest sample sits at `peak` (default -1 dBFS).
export function normalize(chs, peak = 0.89) {
  let max = 0;
  for (const d of chs) for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]));
  if (max > 0) { const k = peak / max; for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= k; }
  return chs;
}
// 16-bit PCM WAV bytes.
export function wav(chs, rate = RATE) {
  const n = chs[0].length;
  const ch = chs.length;
  const bytes = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(bytes);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * ch * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chs[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Uint8Array(bytes);
}

export async function renderSfx(name, opts = {}) {
  const def = SFX[name];
  const buf = await render(4, (ctx, out) => def.play(ctx, out, 0.01, opts));
  return normalize(trimmed(buf), 0.79); // effects at -2 dBFS, so they sit under the bed's peaks
}
export async function renderSting(name) {
  const buf = await render(3.5, (ctx, out) => STINGS[name].play(ctx, out, 0.01));
  return normalize(trimmed(buf, 0.1));
}
export async function renderVoice(id, text, opts = {}) {
  const buf = await render(4, (ctx, out) => speak(ctx, out, id, text, 0.01, opts));
  return normalize(trimmed(buf), 0.79);
}
// One seamless loop: render two passes and keep the second, so the first
// pass's tails wrap into its start. layer: "main" | "tense" | "both".
export async function renderLoop(name, { layer = "main", bpm } = {}) {
  const { events, loop } = trackEvents(name, { bpm });
  const buf = await render(loop * 2 + 1, (ctx, out) => {
    for (let k = 0; k < 2; k++) for (const e of events) {
      if (layer !== "both" && e.layer !== layer) continue;
      playEvent(ctx, out, e, k * loop + e.t);
    }
  }, { channels: 2 });
  const from = Math.round(loop * buf.sampleRate);
  const n = Math.round(loop * buf.sampleRate);
  return normalize(channelsOf(buf).map((d) => d.slice(from, from + n)));
}

// ---- the trailer bed: about 65 s, 96 bpm (a bar is 2.5 s), stereo ----
// 0–10 calm opening (title) · 10–25 five drift beats, tension rising ·
// 25–35 the catch (sting, then the theme brightens) · 35–45 hands-on montage
// (morning groove) · 45–55 sober real-world (night, sparse) · 55 title hit,
// ring out to 65.
export const TRAILER = {
  bpm: 96, length: 65,
  sections: [
    { from: 0, to: 10, label: "calm opening", track: "title", drums: false },
    { from: 10, to: 25, label: "five drift beats, tension rising", track: "cutscene", tension: [0.25, 1] },
    { from: 25, to: 35, label: "the catch", sting: "caught", track: "title", trackFrom: 27.5, drums: true },
    { from: 35, to: 45, label: "hands-on montage", track: "level-1", drums: true },
    { from: 45, to: 55, label: "sober real-world section", track: "level-5", tension: [0.2, 0.2] },
    { from: 55, to: 65, label: "title hit", hit: true },
  ],
  drifts: [
    { at: 10, pet: "mango" }, { at: 13, pet: "luna" }, { at: 16, pet: "ember" }, { at: 19, pet: "biscuit" }, { at: 22, pet: "bugs" },
  ],
};

function drawTrailer(ctx, master) {
  const bar = 240 / TRAILER.bpm;
  for (const s of TRAILER.sections) {
    const g = ctx.createGain();
    g.connect(master);
    const start = s.trackFrom ?? s.from;
    g.gain.setValueAtTime(0, s.from);
    g.gain.linearRampToValueAtTime(1, s.from + (s.from === 0 ? 2 : 0.08));
    g.gain.setValueAtTime(1, s.to - 0.35);
    g.gain.linearRampToValueAtTime(0, s.to + (s.hit ? 0 : 0.05));
    if (s.track) {
      const tense = ctx.createGain();
      tense.connect(g);
      const [a, b] = s.tension || [0, 0];
      tense.gain.setValueAtTime(a, s.from);
      tense.gain.linearRampToValueAtTime(b, s.to - 0.4);
      scheduleBars(ctx, { main: g, tense: s.tension ? tense : null }, s.track, { t0: start, bars: Math.round((s.to - start) / bar), bpm: TRAILER.bpm, drums: s.drums !== false });
    }
    if (s.sting) {
      const sg = ctx.createGain(); sg.gain.value = 2.2; sg.connect(master);
      STINGS[s.sting].play(ctx, sg, s.from);
    }
    if (s.hit) {
      const hg = ctx.createGain(); hg.gain.value = 1.4; hg.connect(master);
      SFX["title-hit"].play(ctx, hg, s.from);
      // the home chord rings under the title card, then fades by 65 s
      ["C3", "G3", "C4", "E4", "G4", "C5"].forEach((n, i) => tone(ctx, hg, { t: s.from + 0.05, dur: 6.5, f: hz(n), type: i < 2 ? "triangle" : i % 2 ? "pulse25" : "square", vol: i < 2 ? 0.25 : 0.035, a: 0.3, d: 1, s: 0.6, r: 3, vib: i > 2 ? 0.1 : 0, vibDelay: 1 }));
    }
  }
  // the drift section: a pulsing low D under it, and a boom on each drift beat
  for (let t = 10; t < 24.6; t += bar / 8) {
    const k = (t - 10) / 15;
    tone(ctx, master, { t, dur: bar / 8 * 0.6, f: hz("D2"), type: "triangle", vol: 0.12 + 0.18 * k });
  }
  for (const d of TRAILER.drifts) {
    tone(ctx, master, { t: d.at, dur: 0.35, f: hz("D2"), f2: hz("D1"), type: "triangle", vol: 0.5, r: 0.3 });
    tone(ctx, master, { t: d.at, dur: 0.3, type: "noise", vol: 0.12, filter: { type: "lowpass", f: 600 }, r: 0.2 });
  }
  // a riser into the catch, then a breath of silence before the sting
  tone(ctx, master, { t: 22.5, dur: 2.1, type: "noise", vol: 0.12, a: 2, r: 0.02, filter: { type: "bandpass", f: 500, f2: 6000, q: 1.5 } });
}
export async function renderTrailerBed() {
  const buf = await render(TRAILER.length, drawTrailer, { channels: 2 });
  return normalize(channelsOf(buf), 0.89);
}
// The five drift motifs alone, at their beats, on the same 65 s timeline.
export async function renderTrailerDrifts() {
  const buf = await render(TRAILER.length, (ctx, out) => {
    for (const d of TRAILER.drifts) SFX["pet-drift"].play(ctx, out, d.at, { pet: d.pet });
  });
  return normalize(channelsOf(buf), 0.79);
}
