// Driftwood's chiptune synth: a handful of voices (pulse/square, triangle,
// sine, noise) with simple envelopes, written against BaseAudioContext so the
// same code plays live (AudioContext) and renders trailer stems offline
// (OfflineAudioContext). Every sound in v2/audio is built from these; there
// are no audio files.
//
// Importing this touches no browser API: everything takes the context.

// ---- pitch ----
const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// "C4" → 60, "F#3" → 54, "Bb5" → 82; a number passes through.
export function noteNum(n) {
  if (typeof n === "number") return n;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`bad note: ${n}`);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
export const hz = (n) => 440 * 2 ** ((noteNum(n) - 69) / 12);

// ---- per-context caches: pulse waves and a noise buffer ----
const caches = new WeakMap();
function cache(ctx) {
  let c = caches.get(ctx);
  if (!c) { c = { waves: new Map(), noise: null }; caches.set(ctx, c); }
  return c;
}
// A pulse wave of the given duty (0.125, 0.25, 0.5) from its Fourier series.
function pulseWave(ctx, duty) {
  const c = cache(ctx);
  if (c.waves.has(duty)) return c.waves.get(duty);
  const n = 48;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty);
    imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty);
  }
  const w = ctx.createPeriodicWave(real, imag);
  c.waves.set(duty, w);
  return w;
}
// One second of white noise (seeded, so offline renders are repeatable).
function noiseBuffer(ctx) {
  const c = cache(ctx);
  if (c.noise) return c.noise;
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 0x2f6b1d;
  for (let i = 0; i < len; i++) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    d[i] = ((s >>> 0) / 4294967296) * 2 - 1;
  }
  c.noise = buf;
  return buf;
}

// ---- one note ----
// tone(ctx, out, {
//   t: start (s, context time), dur: held length (s), f: Hz or note name,
//   f2: glide target (reached at t + glide, default dur), glide,
//   type: "square" | "pulse25" | "pulse12" | "triangle" | "sine" | "saw" | "noise",
//   vol, a, d, s (sustain 0..1), r: release (s),
//   vib: vibrato depth (semitones), vibRate (Hz), vibDelay (s),
//   filter: { type, f, q } (noise especially), pan: -1..1, detune (cents)
// }) → end time (s)
export function tone(ctx, out, o) {
  const t = Math.max(o.t ?? ctx.currentTime, 0);
  const dur = Math.max(0.005, o.dur ?? 0.1);
  const a = o.a ?? 0.004;
  const d = o.d ?? 0.06;
  const s = o.s ?? 0.7;
  const r = o.r ?? 0.04;
  const vol = o.vol ?? 0.25;
  const end = t + dur + r;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  if (a + d < dur) g.gain.linearRampToValueAtTime(vol * s, t + a + d);
  g.gain.setValueAtTime(vol * (a + d < dur ? s : 1), t + dur);
  g.gain.linearRampToValueAtTime(0, end);

  let src;
  const type = o.type || "square";
  if (type === "noise") {
    src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    if (o.rate) src.playbackRate.setValueAtTime(o.rate, t);
    if (o.rate2) src.playbackRate.exponentialRampToValueAtTime(o.rate2, t + (o.glide ?? dur));
  } else {
    src = ctx.createOscillator();
    if (type === "pulse25") src.setPeriodicWave(pulseWave(ctx, 0.25));
    else if (type === "pulse12") src.setPeriodicWave(pulseWave(ctx, 0.125));
    else src.type = type === "saw" ? "sawtooth" : type;
    const f = typeof o.f === "string" ? hz(o.f) : (o.f ?? 440);
    src.frequency.setValueAtTime(f, t);
    if (o.f2 != null) {
      const f2 = typeof o.f2 === "string" ? hz(o.f2) : o.f2;
      const at = t + (o.glide ?? dur);
      if (o.slide === "lin") src.frequency.linearRampToValueAtTime(f2, at);
      else src.frequency.exponentialRampToValueAtTime(Math.max(1, f2), at);
    }
    if (o.detune) src.detune.setValueAtTime(o.detune, t);
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = o.vibRate ?? 6;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(o.vib * 100, t + (o.vibDelay ?? 0.05) + 0.03);
      lfo.connect(depth).connect(src.detune);
      lfo.start(t);
      lfo.stop(end + 0.02);
    }
  }
  let node = src;
  if (o.filter) {
    const fl = ctx.createBiquadFilter();
    fl.type = o.filter.type || "lowpass";
    fl.frequency.setValueAtTime(o.filter.f ?? 2000, t);
    if (o.filter.f2) fl.frequency.exponentialRampToValueAtTime(o.filter.f2, t + (o.filter.glide ?? dur));
    fl.Q.value = o.filter.q ?? 0.8;
    node.connect(fl);
    node = fl;
  }
  node.connect(g);
  if (o.pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p).connect(out);
  } else {
    g.connect(out);
  }
  src.start(t);
  src.stop(end + 0.02);
  return end;
}

// A run of notes, one after another: notes are names/numbers, null = rest.
export function seq(ctx, out, { t, notes, step = 0.08, gate = 0.8, ...o }) {
  let end = t;
  notes.forEach((n, i) => {
    if (n == null) return;
    end = tone(ctx, out, { ...o, t: t + i * step, dur: step * gate, f: hz(n) });
  });
  return end;
}

// Noise burst helper: a filtered "chh", "ksh", "thud".
export function hiss(ctx, out, { t, dur = 0.08, vol = 0.2, f = 4000, f2, type = "bandpass", q = 1, r = 0.03, a = 0.002, d = 0.03, s = 0.4, rate, rate2, pan } = {}) {
  return tone(ctx, out, { t, dur, vol, a, d, s, r, type: "noise", rate, rate2, pan, filter: { type, f, f2, q } });
}

// Transpose a note name/number by semitones.
export const up = (n, semis) => noteNum(n) + semis;
