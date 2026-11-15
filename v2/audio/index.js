// Driftwood's sound: one small runtime over the synth.
//   sfx(name, opts)      a sound effect (sounds.js); opts.delay (s), opts.pet, opts.i
//   music(track | null)  the looping track for this screen (music.js); null fades out
//   setTension(0..1)     the drift layer over the current track
//   sting(name)          a one-shot on the music bus ("caught", "fooled")
//   voice(id, text)      a pet's (or Rowan's) blip babble; the music ducks under it
//   setMuted(bool) / isMuted() / onMuteChange(fn)
// Each returns quietly when there's no sound to make (muted, no Web Audio,
// Node tests). The AudioContext starts on the first user gesture only
// (autoplay rules), and never while muted: a muted player never has one.
// Mute is saved in localStorage dw_audio_muted ("1" = muted).
//
// Tests: scripts/test-mute.js sets dw_audio_muted and window.__dwAudioSilent,
// so a test browser never even creates a context. Every cue is still logged
// to window.__dwAudioLog (name + time), so probes can check the wiring.
import { SFX } from "./sounds.js";
import { trackEvents, playEvent, STINGS } from "./music.js";
import { speak, babble, VOICES } from "./voices.js";

export const MUTE_KEY = "dw_audio_muted";
const SFX_GAIN = 0.8;
// Music sits about 18 dB under the effects (0.55 × 10^(-18/20) ≈ 0.07).
const MUSIC_GAIN = SFX_GAIN * 10 ** (-18 / 20);
const VOICE_GAIN = 0.5;
const DUCK = 0.35; // music level while someone talks
const LOOKAHEAD = 0.3; // s of music scheduled ahead
const TICK_MS = 60;

const hasWindow = typeof window !== "undefined";
const store = () => { try { return hasWindow ? window.localStorage : null; } catch { return null; } };

let muted = readMuted();
let ctx = null;
let bus = null; // { master, sfx, voice, music, duck, tense, main }
let unlocked = false;
const listeners = new Set();

// what the player should be hearing, whether or not the context runs yet
let want = { track: null, tension: 0 };
let player = null; // { name, events, loop, start, idx, cycle, out, timer }

function readMuted() {
  try { return store()?.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export const isMuted = () => muted;
export function onMuteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function log(kind, name, extra) {
  if (!hasWindow) return;
  const l = (window.__dwAudioLog ||= []);
  l.push({ kind, name, at: Math.round(performance.now()), ...(extra || {}) });
  if (l.length > 300) l.splice(0, l.length - 300);
}

// ---- the context, on the first gesture ----
function silent() { return !hasWindow || window.__dwAudioSilent === true; }
function ensure() {
  if (ctx || muted || silent() || !unlocked) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try { ctx = new Ctor({ latencyHint: "interactive" }); } catch { return null; }
  const master = ctx.createGain();
  master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  const sfx = ctx.createGain(); sfx.gain.value = SFX_GAIN; sfx.connect(master);
  const voice = ctx.createGain(); voice.gain.value = VOICE_GAIN; voice.connect(master);
  const music = ctx.createGain(); music.gain.value = MUSIC_GAIN; music.connect(master);
  const duck = ctx.createGain(); duck.gain.value = 1; duck.connect(music);
  bus = { master, sfx, voice, music, duck };
  return ctx;
}
function resume() {
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

// Call once at startup: the first pointer or key press opens the context.
let inited = false;
export function initAudio() {
  if (!hasWindow || inited) return;
  inited = true;
  const first = () => {
    unlocked = true;
    if (ensure()) { resume(); applyMusic(); }
  };
  for (const type of ["pointerdown", "keydown", "touchend"]) window.addEventListener(type, first, { capture: true, passive: true });
  // a hidden tab is quiet (and its timers would stutter the loop anyway)
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (!muted) resume();
  });
  // hover blips (fine pointers), and data-sfx buttons / "← back" buttons, delegated
  let lastHover = null;
  document.addEventListener("pointerover", (ev) => {
    if (ev.pointerType !== "mouse") return;
    const b = ev.target.closest?.("button:not([disabled]), .chip, .pick");
    if (!b || b === lastHover) return;
    lastHover = b;
    sfx("ui-hover");
  });
  document.addEventListener("pointerout", (ev) => { if (ev.target.closest?.("button") === lastHover && !lastHover?.contains(ev.relatedTarget)) lastHover = null; });
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest?.("button, a");
    if (!b) return;
    if (b.dataset.sfx) { sfx(b.dataset.sfx); return; }
    if (/^\s*←/.test(b.textContent || "")) sfx("ui-back");
  });
}

export function setMuted(on) {
  muted = Boolean(on);
  try { store()?.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* private mode: this session only */ }
  log("mute", muted ? "on" : "off");
  if (muted) {
    stopPlayer(0.05);
    if (ctx) ctx.suspend().catch(() => {});
  } else {
    unlocked = true; // the toggle itself is a gesture
    if (ensure()) { resume(); applyMusic(); sfx("ui-toggle-on"); }
  }
  for (const fn of listeners) { try { fn(muted); } catch { /* a stale button */ } }
}
export const toggleMuted = () => setMuted(!muted);

// ---- effects ----
const NOOP = { stop() {} };
function handle(out, until) {
  return {
    stop(fade = 0.04) {
      if (!ctx) return;
      const t = ctx.currentTime;
      try { out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + fade); } catch { /* gone */ }
      setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, (fade + 0.05) * 1000);
    },
    until,
  };
}
export function sfx(name, opts = {}) {
  const def = SFX[name];
  log("sfx", name, opts.pet ? { pet: opts.pet } : null);
  if (!def) { if (hasWindow && window.__dwAudioStrict) console.warn(`[audio] no sound "${name}"`); return NOOP; }
  if (muted || !ensure() || ctx.state === "closed") return NOOP;
  const out = ctx.createGain();
  out.connect(bus.sfx);
  const t = ctx.currentTime + 0.005 + (opts.delay || 0);
  let end = t;
  try { end = def.play(ctx, out, t, opts) || t; } catch (err) { console.warn(`[audio] ${name}`, err); }
  setTimeout(() => { try { out.disconnect(); } catch { /* fine */ } }, (end - ctx.currentTime + 0.5) * 1000);
  return handle(out, end);
}
// Several cues ({ name, delay, opts }) at once.
export function cues(list) { for (const c of list || []) sfx(c.name, { ...(c.opts || {}), delay: c.delay || 0 }); }

export function sting(name, { delay = 0 } = {}) {
  log("sting", name);
  const def = STINGS[name];
  if (!def || muted || !ensure()) return NOOP;
  const out = ctx.createGain();
  out.gain.value = 3.2; // stings are music, but they are the moment: well above the bed
  out.connect(bus.music);
  const end = def.play(ctx, out, ctx.currentTime + 0.02 + delay);
  return handle(out, end);
}

// ---- voices ----
let talking = null;
export function voice(id, text, { maxS } = {}) {
  log("voice", id, { chars: String(text || "").length });
  if (!VOICES[id] || !text || muted || !ensure()) return NOOP;
  talking?.stop(0.03);
  const out = ctx.createGain();
  out.connect(bus.voice);
  const t = ctx.currentTime + 0.02;
  const end = speak(ctx, out, id, text, t, { maxS });
  // duck the music under the line
  const d = bus.duck.gain;
  d.cancelScheduledValues(t);
  d.setValueAtTime(d.value, t);
  d.linearRampToValueAtTime(DUCK, t + 0.08);
  d.setValueAtTime(DUCK, end);
  d.linearRampToValueAtTime(1, end + 0.35);
  const h = handle(out, end);
  const stop = h.stop;
  h.stop = (fade) => {
    stop(fade);
    if (!ctx) return;
    const n = ctx.currentTime;
    d.cancelScheduledValues(n); d.setValueAtTime(d.value, n); d.linearRampToValueAtTime(1, n + 0.3);
  };
  talking = h;
  return h;
}
export { babble };

// ---- music ----
export function music(name, { tension } = {}) {
  const track = name || null;
  if (track === want.track) { if (tension != null) setTension(tension); return; }
  want = { track, tension: tension ?? 0 };
  log("music", track || "off");
  applyMusic();
}
export function setTension(x) {
  const v = Math.max(0, Math.min(1, Number(x) || 0));
  if (v === want.tension) return;
  want.tension = v;
  log("tension", String(v));
  if (player && ctx) {
    const g = player.tense.gain;
    const t = ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + (v > 0 ? 0.6 : 1.2));
  }
}
export const currentMusic = () => ({ ...want });

function applyMusic() {
  if (!ctx || muted) return;
  if (player?.name === want.track) return;
  stopPlayer(0.8);
  if (!want.track) return;
  let tr;
  try { tr = trackEvents(want.track); } catch { return; }
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, ctx.currentTime);
  out.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
  out.connect(bus.duck);
  const tense = ctx.createGain();
  tense.gain.value = want.tension;
  tense.connect(out);
  const p = { name: want.track, ...tr, start: ctx.currentTime + 0.1, idx: 0, cycle: 0, out, tense, timer: 0 };
  p.timer = setInterval(() => pump(p), TICK_MS);
  player = p;
  pump(p);
}
// Schedule every event that falls inside the lookahead window; loops wrap seamlessly.
function pump(p) {
  if (!ctx || player !== p) return;
  const horizon = ctx.currentTime + LOOKAHEAD;
  for (let guard = 0; guard < 500; guard++) {
    if (p.idx >= p.events.length) { p.idx = 0; p.cycle += 1; }
    const e = p.events[p.idx];
    const at = p.start + p.cycle * p.loop + e.t;
    if (at > horizon) break;
    if (at >= ctx.currentTime - 0.02) playEvent(ctx, e.layer === "tense" ? p.tense : p.out, e, at);
    p.idx += 1;
  }
}
function stopPlayer(fade) {
  const p = player;
  player = null;
  if (!p) return;
  clearInterval(p.timer);
  if (!ctx) return;
  const t = ctx.currentTime;
  try { p.out.gain.cancelScheduledValues(t); p.out.gain.setValueAtTime(p.out.gain.value, t); p.out.gain.linearRampToValueAtTime(0, t + fade); } catch { /* gone */ }
  setTimeout(() => { try { p.out.disconnect(); } catch { /* gone */ } }, (fade + LOOKAHEAD + 0.3) * 1000);
}
