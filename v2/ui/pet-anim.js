// The helper's face in the dock: it blinks while idle, moves its mouth while
// its line comes in, and reacts to what the player does (happy hop, shocked
// jump, sad droop). Frames are icons/pets/<animal>-<frame>.svg beside the idle
// sprite icons/<animal>.svg, all on the same grid so the body never jumps.
// Bugs (the bunny) sobs: two sad frames alternate, over the top on purpose.

const MOOD_MS = { happy: 1400, shock: 1100, sad: 1900 };
const SOB_MS = 2800; // Bugs's sad lasts longer
const TALK_STEP = 130;
const SOB_STEP = 170;
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const NOOP = { talk() {}, react() {}, stop() {} };

export function petAnimator(img) {
  const m = img && /icons\/([a-z]+)\.svg/.exec(img.getAttribute("src") || "");
  if (!m) return NOOP;
  const animal = m[1];
  const idle = img.src;
  const url = (frame) => new URL(`pets/${animal}-${frame}.svg`, idle).href;
  const frames = { idle, blink: url("blink"), talk: url("talk"), happy: url("happy"), sad: url("sad"), shock: url("shock") };
  if (animal === "bunny") frames.sad2 = url("sad2");
  for (const src of Object.values(frames)) { const pre = new Image(); pre.src = src; } // no flash on first swap

  let mood = null, moodUntil = 0, talkUntil = 0, blinkAt = 0, blinkUntil = 0, timer = 0, stopped = false, seen = false;
  const scheduleBlink = (now) => { blinkAt = now + 2600 + Math.random() * 3200; };
  scheduleBlink(performance.now());

  function frameAt(now) {
    if (mood && now < moodUntil) {
      if (mood === "sad" && frames.sad2 && !reduced()) return Math.floor(now / SOB_STEP) % 2 ? frames.sad2 : frames.sad;
      return frames[mood];
    }
    if (mood) { mood = null; img.classList.remove("is-happy", "is-sad", "is-shock"); }
    if (now < talkUntil && !reduced()) return Math.floor(now / TALK_STEP) % 2 ? frames.talk : frames.idle;
    if (now >= blinkAt) { blinkUntil = now + 140; scheduleBlink(now); }
    return now < blinkUntil ? frames.blink : frames.idle;
  }
  function tick() {
    if (stopped) return;
    // Built before the dock is on the page: it stops only once it has left it.
    if (img.isConnected) seen = true;
    else if (seen) { stopped = true; return; }
    const src = frameAt(performance.now());
    if (img.src !== src) img.src = src;
    timer = setTimeout(tick, 60);
  }
  tick();

  return {
    // The line is coming in: the mouth moves for about as long as it takes to read out.
    talk(text) {
      const ms = Math.min(3600, Math.max(600, String(text || "").length * 42));
      talkUntil = performance.now() + ms;
    },
    // "happy" | "sad" | "shock": the face, plus a little body motion (CSS).
    react(kind) {
      if (!frames[kind]) return;
      mood = kind;
      moodUntil = performance.now() + (kind === "sad" && frames.sad2 ? SOB_MS : MOOD_MS[kind]);
      talkUntil = 0;
      img.classList.remove("is-happy", "is-sad", "is-shock");
      void img.offsetWidth; // restart the motion
      img.classList.add(`is-${kind}`);
    },
    stop() { stopped = true; clearTimeout(timer); img.src = idle; },
  };
}

// Sound cue (audio/cues.js) → the pet's face. Later cues win: a "flag" shocks
// the pet on the tap, then "pet-sheepish" turns it sad once it's been caught.
export const PET_MOOD = {
  flag: "shock", "stand-firm": "shock", deny: "shock",
  "put-down": "sad", "pet-sheepish": "sad", "pet-concede": "sad", rot: "sad", "meter-down": "sad",
  "pet-happy": "happy", "pet-proud": "happy", "fix-right": "happy", "chore-done": "happy", grow: "happy", "meter-up": "happy",
};
