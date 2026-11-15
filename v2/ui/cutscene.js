// The opening cutscene: Master Rowan, the garden master, asks the player's
// name, shows his garden and his helpers, asks for a stew dinner, warns that
// the helpers can be wrong, and hands over his almanac. Every beat waits for
// a tap. A new player sees it after the splash, straight into Level 1; the
// map's "Watch intro" plays it again without the name step.
// Story chosen by Lucy in docs/design-options/2026-11-14-wizard/options.html
// (Wizard C, the storyboard), on the garden stage of
// docs/design-options/2026-11-13-almanac-cutscene/options.html.
//
// =====================================================================
//   THE CUTSCENE SCRIPT. Lucy: edit here.
//   id   = which picture plays (name, garden, helpers, dinner, drift,
//          almanac, go). Keep the ids and their order; the pictures are
//          drawn in css/cutscene.css.
//   text = Rowan's line, typed into his box along the bottom. {name} is the
//          player's name. Keep each to one short sentence or two: Rowan is
//          quiet and dry, the pets carry the jokes. The last beat's text is
//          the big end title, in block letters (A-Z, 0-9 and . , ' ! ? - : only).
//   ms   = how long the beat's animation plays, in milliseconds. After that
//          (and once the line has finished typing) the beat waits for the
//          player to tap. Lucy: "I can't read that fast." The name beat waits
//          for the name instead. The last beat's ms is the end title's build-in.
// =====================================================================
export const BEATS = [
  { id: "name", ms: 900, text: "Good evening. I'm Rowan. And you are?" },
  { id: "garden", ms: 1600, text: "Welcome, {name}. My garden. Little grows yet." },
  { id: "helpers", ms: 2600, text: "My helpers. They're AI, like ChatGPT with fur." },
  { id: "dinner", ms: 1600, text: "I'm making stew. Grow veg and herbs for the pot, flowers for the table." },
  { id: "drift", ms: 3200, text: "They mean well. But they can be wrong, and still sound sure." },
  { id: "almanac", ms: 3800, text: "So check my almanac. Forty years of notes, checked every season." },
  { id: "go", ms: 1400, text: "Trust, but check." },
];
// A rewatch from the map skips the name step.
export const beatsFor = (first) => (first ? BEATS : BEATS.filter((b) => b.id !== "name"));
export const lineFor = (beat, name) => beat.text.replaceAll("{name}", name || "friend");
// What Mango says in the drift beat: the true line, then what it drifts into.
// It is about the radish, a plant that is in no level, so it spoils nothing.
export const DRIFT_LINE = { who: "Mango", before: "Radishes are ready in a month!", after: "Radishes take a whole YEAR!" };
// The friendly beat's speech bubbles, by helper name.
export const HELLOS = { Luna: "Ask me anything!", Bugs: "Happy to help ♥" };
// Under the end title.
export const END_LINE = "The helpers are friendly, not always right. Check Rowan's almanac.";

// The cutscene's example packet: the same packet as the seed shelf's
// (ui/almanac-view.js packetFront / packetBack), but cutscene-only: it is not
// in levels/plants.js, so it never appears on the shelf. Sprites: v2/art/radish-*.svg
// (scripts/make-v2-art.mjs).
export const RADISH = {
  id: "radish", name: "Radish", level: 1, color: "#e0405a",
  stages: ["radish-sown", "radish-growing", "radish-thriving"],
  sun: "Full sun or light shade", water: "Little and often, so they don't split", space: "Thin to 3 cm apart",
  tip: "Sow a short row every 2 weeks",
  watch: ["radish-woody", "Left too long: split, woody and too hot to eat."],
  plant: "Early spring to early autumn", harvest: "When the root is about 2 cm wide", soil: "Loose and stone-free", pals: "Lettuce and carrots",
};
export const RADISH_CARD = { title: "Radish", lines: ["Ready in 3–4 weeks"], lockedLine: null, evidence: null };

// Total running time, in ms (the last beat included).
export const totalMs = (beats = BEATS) => beats.reduce((sum, b) => sum + b.ms, 0);

import { h, focusFirst, announce, finePointer } from "./dom.js";
import { blockTitle } from "./block-type.js";
import { packetFront, packetBack } from "./almanac-view.js";
import { pixelSvg, potMap, VASES, BERRY_BOWL_EMPTY, SALAD_EMPTY } from "./story-art.js";
import { MAP } from "../levels/index.js";
import { WIZARD } from "../levels/wizard.js";

const BIRD_RECTS = [[0, 0], [1, 1], [2, 2], [3, 2], [4, 3], [5, 2], [6, 2], [7, 1], [8, 0]];
const SVGNS = "http://www.w3.org/2000/svg";
function bird() {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 9 4");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("shape-rendering", "crispEdges");
  for (const [x, y] of BIRD_RECTS) {
    const r = document.createElementNS(SVGNS, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", 1); r.setAttribute("height", 1);
    svg.append(r);
  }
  return svg;
}
// "Little grows yet": his beds are just coming up.
const BED_L = ["sunflower-growing", "tomato-growing", "lettuce-growing", "basil-growing"];
const BED_R = ["pumpkin-growing", "flower-growing", "bean-growing", "carrot-growing"];
const lay = (cls, style = "") => h("div", { class: `cs__lay ${cls}`, style });
const px = (map, cls) => { const d = h("div", { class: cls }); d.innerHTML = pixelSvg(map.rows, map.pal); return d; };

// renderCutscene(root, { first, name, onName, onSeen, onStart, onBack }) → unmount()
//   first   a new player on the way to Level 1: it opens on Rowan asking the
//           name, and the end button is Start Level 1. A rewatch from the map
//           skips the name and ends on Back to the garden.
//   name    the player's name (a rewatch)
//   onName  called with the name once it's entered (or "friend" if skipped)
//   onSeen  called once, when the end title comes up (played through or skipped).
export function renderCutscene(root, { first = true, name = "", onName = () => {}, onSeen = () => {}, onStart = () => {}, onBack = () => {} } = {}) {
  const calm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const clearAll = () => { for (const id of timers) clearTimeout(id); timers.clear(); };
  let seen = false;
  const markSeen = () => { if (!seen) { seen = true; onSeen(); } };
  let playerName = name;
  let beats = beatsFor(first && !name);
  let named = !beats.some((b) => b.id === "name");

  // ---- the stage: golden-hour garden, back to front ----
  const world = h("div", { class: "cs__world", "aria-hidden": "true" },
    lay("cs__sky"),
    lay("cs__lay--sway cs__sunlay", "--amp:2px;--dur:11s"),
    lay("cs__air"),
    lay("cs__lay--sway cs__hills", "--amp:3px;--dur:13s"),
    lay("cs__lay--sway cs__hedge", "--amp:5px;--dur:13s"),
    lay("cs__lay--sway cs__fence", "--amp:7px;--dur:13s"),
    lay("cs__ground"),
    lay("cs__lay--sway cs__beds", "--amp:9px;--dur:13s"),
    lay("cs__path"),
    lay("cs__light"));
  world.querySelector(".cs__sunlay").append(h("div", { class: "cs__sun" }));
  world.querySelector(".cs__air").append(
    h("div", { class: "cs__cloud", style: "top:12%;width:120px;--dur:80s;--delay:-20s" }),
    h("div", { class: "cs__cloud", style: "top:22%;width:80px;--dur:64s;--delay:-50s" }),
    h("div", { class: "cs__cloud", style: "top:7%;width:160px;--dur:95s;--delay:-70s" }),
    h("div", { class: "cs__bird", style: "top:18%;--dur:17s;--delay:-3s" }, bird()),
    h("div", { class: "cs__bird", style: "top:23%;--dur:17s;--delay:-3.6s" }, bird()),
    h("div", { class: "cs__bird", style: "top:14%;--dur:22s;--delay:-12s" }, bird()));
  const bed = (list, side) => h("div", { class: `cs__bed cs__bed--${side}` },
    list.map((n, i) => h("img", { src: `./art/${n}.svg`, alt: "", width: 32, height: 32, style: `--d:${(i * 0.37).toFixed(2)}s` })));
  world.querySelector(".cs__beds").append(bed(BED_L, "l"), bed(BED_R, "r"));

  // ---- Master Rowan, on the path at the left; his almanac in hand for its beat ----
  const rowan = h("div", { class: "cs__rowan", "aria-hidden": "true" },
    h("img", { class: "cs__rowan-img", src: WIZARD.sprite, alt: "", width: 192, height: 288 }),
    h("img", { class: "cs__book", src: "./art/almanac.svg", alt: "", width: 32, height: 32 }));

  // ---- the dinner he wants: an empty pot, empty bowls, empty vases ----
  const dinner = h("div", { class: "cs__dinner", "aria-hidden": "true" },
    h("div", { class: "cs__table" }),
    h("div", { class: "cs__ontable" },
      px(SALAD_EMPTY, "cs__dish"), px(VASES.empty, "cs__dish cs__dish--vase"),
      px(potMap([], { empty: true }), "cs__dish cs__dish--pot"),
      px(VASES.empty, "cs__dish cs__dish--vase"), px(BERRY_BOWL_EMPTY, "cs__dish")));

  // ---- the five helpers, in level order. Each speech bubble sits in its
  // speaker's sprite box, so it is always right over that pet's head. ----
  const tail = () => h("i", { class: "cs__bub-tail" });
  const driftText = h("span", { class: "cs__bub-t" }, DRIFT_LINE.before);
  const driftBub = h("p", { class: "cs__bub cs__bub--drift" }, h("span", { class: "cs__bub-tag" }, "DRIFT"), driftText, tail());
  const pets = h("div", { class: "cs__pets", "aria-hidden": "true" }, MAP.map((m, i) => h("div", {
    class: `cs__pet${m.helper === DRIFT_LINE.who ? " cs__pet--drift" : ""}${i === MAP.length - 1 ? " cs__pet--end" : ""}`, style: `--i:${i}`, "data-helper": m.helper,
  },
  h("div", { class: "cs__sprite" },
    HELLOS[m.helper] ? h("p", { class: "cs__bub cs__bub--hi" }, HELLOS[m.helper], tail()) : null,
    m.helper === DRIFT_LINE.who ? driftBub : null,
    h("img", { src: m.sprite, alt: "", width: 80, height: 112 })),
  h("span", { class: "cs__name" }, m.helper.toUpperCase()))));

  // ---- the game's own toolbar, drawn with the level's classes so the
  // almanac button sits exactly where it will in Level 1 ----
  const almBtn = h("span", { class: "tool tool--icon cs__almbtn" },
    h("img", { src: "./art/almanac-device.svg", alt: "", width: 28, height: 28 }));
  const hud = h("div", { class: "level cs__ghost", "aria-hidden": "true" },
    h("section", { class: "scene" },
      h("div", { class: "scene__top" },
        h("div", { class: "meter" }, h("span", { class: "meter__text" }, "Garden 0%"),
          h("div", { class: "meter__bar" }, h("div", { class: "meter__fill" })))),
      h("div", { class: "tools" }, h("p", { class: "tool-hint cs__tag" }, "Almanac"), almBtn)));

  // ---- the almanac beat: the radish packet, front and back ----
  const front = packetFront(RADISH, { as: "div", band: "SEEDS · EXAMPLE", meta: "FROM THE ALMANAC", attrs: { "aria-hidden": "true" } });
  const claim = h("p", { class: "cs__claim" }, `${DRIFT_LINE.who} said: `,
    h("s", {}, `“${DRIFT_LINE.after}”`), " ", h("b", {}, "WRONG"));
  const back = packetBack(RADISH, { card: RADISH_CARD, kicker: "THE ALMANAC · EXAMPLE PACKET", extra: claim });
  back.removeAttribute("tabindex");
  // The same 3D packet as the shelf's turned-over one (ui/almanac-view.js
  // turnOver): the back is its face, two paper sheets behind it for thickness.
  const pkt = h("div", { class: "pkt" }, h("div", { class: "pkt__tilt" },
    h("i", { class: "pkt__rear", "aria-hidden": "true" }),
    h("i", { class: "pkt__rear pkt__rear--2", "aria-hidden": "true" }),
    back,
    h("i", { class: "pkt__sheen", "aria-hidden": "true" })));
  const flip = h("div", { class: "cs__flip" }, front, pkt);
  const off = h("span", { class: "btn btn--off cs__off", "aria-hidden": "true" }, "? Something's off");
  const alm = h("div", { class: "cs__alm" }, h("div", { class: "cs__rays", "aria-hidden": "true" }), flip, off);

  // ---- Rowan's box: his name tag, his line, and on the first beat the name field ----
  const cap = h("p", { class: "cs__cap-t" });
  const nameInput = h("input", { id: "player-name", name: "name", autocomplete: "nickname", maxlength: 24, placeholder: "your name", "aria-label": "Your name" });
  const nameBtn = h("button", { class: "btn btn--gold cs__name-go", type: "submit" }, "Enter the garden ▸");
  const nameForm = h("form", { class: "cs__name-form", onsubmit: (e) => { e.preventDefault(); submitName(); } }, nameInput, nameBtn);
  const caption = h("div", { class: "cs__cap" },
    h("i", { class: "cs__cap-tail", "aria-hidden": "true" }),
    h("span", { class: "cs__who", "aria-hidden": "true" }, WIZARD.name.toUpperCase()),
    cap, nameForm);
  const pips = h("div", { class: "cs__pips", "aria-hidden": "true" });
  const skipBtn = h("button", { type: "button", class: "btn cs__skip", onclick: () => skip() }, "Skip ▸▸");
  const last = BEATS[BEATS.length - 1];
  const markSlot = h("div", { class: "cs__mark" });
  const startBtn = first
    ? h("button", { type: "button", class: "btn btn--crt", "data-autofocus": true, onclick: () => onStart() }, "Start Level 1 ▸")
    : h("button", { type: "button", class: "btn btn--crt", "data-autofocus": true, onclick: () => onBack() }, "Back to the garden ▸");
  const end = h("section", { class: "cs__end crt", "aria-labelledby": "cs-end-title" },
    h("h2", { class: "sr-only", id: "cs-end-title" }, last.text),
    markSlot,
    h("p", { class: "crt__line cs__endline" }, END_LINE),
    h("div", { class: "cs__endbtns" }, startBtn,
      h("button", { type: "button", class: "btn btn--crt", onclick: () => play() }, "↻ Replay")));

  const main = h("main", { class: "cutscene", "aria-label": "Opening: trust, but check" },
    h("h1", { class: "sr-only" }, "Driftwood: the opening"),
    world, dinner, rowan, pets, h("div", { class: "cs__dim" }), hud, alm, caption,
    h("div", { class: "cs__bar" }, skipBtn, pips),
    end);
  root.replaceChildren(main);

  // ---- running it ----
  const BEAT_CLASSES = BEATS.map((b) => `at-${b.id}`);
  let token = 0;
  let typing = null;
  let typed = "";
  let cur = -1;      // index in beats of the beat on screen
  let elapsed = false; // its animation time is up
  let flipping = false;
  const beatId = () => beats[cur]?.id;

  // The tail of Rowan's box points up at him, wherever the layout put him.
  function aimTail() {
    const r = rowan.querySelector(".cs__rowan-img").getBoundingClientRect();
    const c = caption.getBoundingClientRect();
    if (!r.width || !c.width) return;
    const x = Math.max(14, Math.min(c.width - 40, r.left + r.width * 0.6 - c.left));
    caption.style.setProperty("--tx", `${Math.round(x)}px`);
  }
  function buildPips() {
    pips.replaceChildren(...beats.map((b) => h("span", { class: "cs__pip", style: `--ms:${b.ms}ms` }, h("i", {}))));
  }
  function buildMark() {
    markSlot.replaceChildren(blockTitle(last.text.toUpperCase(), {
      fill: "#69f0ae", shadow: "#0b5a33", align: "center", build: !calm(), className: "cs__title",
    }));
  }
  // The beat is ready for a tap once its caption is typed and its animation time is up.
  function readyCheck() {
    if (!typing && elapsed && cur < beats.length - 1 && beatId() !== "name") main.classList.add("is-ready");
  }
  function finishTyping() {
    clearInterval(typing);
    typing = null;
    cap.textContent = typed;
    readyCheck();
  }
  function type(text) {
    clearInterval(typing);
    typing = null;
    typed = text;
    if (calm()) { cap.textContent = text; return; }
    let i = 0;
    cap.textContent = "";
    typing = setInterval(() => {
      i += 1;
      cap.textContent = text.slice(0, i);
      if (i >= text.length) finishTyping();
    }, 22);
  }
  // Mango's line breaks up into the wrong fact: a short scramble, then the new words.
  function scramble(my) {
    if (calm()) { driftText.textContent = DRIFT_LINE.after; return; }
    const { before: from, after: to } = DRIFT_LINE;
    const chars = "#%&@$?!<>/*";
    const steps = 12;
    let s = 0;
    const tick = () => {
      if (my !== token) return;
      s += 1;
      const k = s / steps;
      const len = Math.round(from.length + (to.length - from.length) * k);
      let out = "";
      for (let i = 0; i < len; i++) {
        out += Math.random() < k ? (to[i] || "") : (Math.random() < 0.5 ? chars[(Math.random() * chars.length) | 0] : (from[i] || " "));
      }
      driftText.textContent = s >= steps ? to : out;
      if (s < steps) later(tick, 700 / steps);
    };
    tick();
  }
  function stopAnims(el) { el.getAnimations?.().forEach((a) => a.cancel()); }
  function unflip() {
    flipping = false;
    flip.classList.remove("is-flipped");
    back.querySelector(".fact")?.classList.remove("fact--fresh");
    claim.classList.remove("is-stamped");
    [flip, front, pkt, back].forEach(stopAnims);
  }
  function showBack() {
    flip.classList.add("is-flipped");
    back.querySelector(".fact")?.classList.add("fact--fresh"); // the shelf's own stamp-and-glow
    claim.classList.add("is-stamped");
  }
  // Every wait has a timeout, in case an animation is cancelled or never runs.
  function settle(anim, then, ms) {
    let done = false;
    const run = () => { if (!done) { done = true; then(); } };
    later(run, ms + 200);
    anim?.finished?.then(run, run);
  }
  // The packet comes out of the toolbar's almanac button and flies to the middle.
  function emerge() {
    if (calm() || !flip.animate) return;
    const b = almBtn.getBoundingClientRect();
    const r = front.getBoundingClientRect();
    if (!r.width) return;
    const dx = b.left + b.width / 2 - (r.left + r.width / 2);
    const dy = b.top + b.height / 2 - (r.top + r.height / 2);
    const from = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(b.width / r.width).toFixed(3)})`;
    flip.animate([
      { transform: from, opacity: 0 }, { transform: from, opacity: 1, offset: 0.1 },
      { transform: "translate(0, 0) scale(1.06)", offset: 0.8 }, { transform: "none", opacity: 1 },
    ], { duration: 600, delay: 450, easing: "steps(9, end)", fill: "backwards" });
  }
  // The shelf's two-step turn: the front goes edge-on, the back turns in.
  function flipOver(my) {
    if (my !== token || flipping) return;
    flipping = true;
    if (calm() || !front.animate) {
      showBack();
      pkt.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      return;
    }
    const away = front.animate([{ transform: "perspective(900px) rotateY(0deg)" }, { transform: "perspective(900px) rotateY(90deg)" }],
      { duration: 220, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
    settle(away, () => {
      if (my !== token) return;
      showBack();
      stopAnims(front);
      pkt.animate([{ transform: "rotateY(-90deg) scale(.8)" }, { transform: "rotateY(0deg) scale(1)" }],
        { duration: 220, easing: "cubic-bezier(0, 0, .2, 1)" });
    }, 220);
  }
  function beat(b, i, my) {
    main.classList.add(`at-${b.id}`);
    main.dataset.beat = b.id;
    const pip = pips.children[i];
    void pip.offsetWidth; // restart the bar's fill
    pip.classList.add("on");
    if (b.id !== last.id) { const text = lineFor(b, playerName); type(text); announce(`${WIZARD.name}: ${text}`); aimTail(); }
    if (b.id === "name") {
      // Mouse and keyboard: straight into the field. Touch: the button, so the keyboard doesn't jump up unasked.
      (finePointer() ? nameInput : nameBtn).focus({ preventScroll: true });
    }
    if (b.id === "drift") {
      later(() => {
        if (my !== token || main.dataset.beat !== "drift") return;
        driftBub.classList.remove("glitch");
        void driftBub.offsetWidth;
        if (!calm()) driftBub.classList.add("glitch");
        scramble(my);
      }, 500);
    }
    if (b.id === "almanac") {
      // the button lights (0.45 s), the packet flies out (0.6 s), a moment on its front, then it turns over
      emerge();
      later(() => flipOver(my), calm() ? 600 : 1550);
    }
    if (b.id === last.id) arrive(my);
  }
  function arrive(my) {
    buildMark();
    end.inert = false;
    markSeen();
    announce(`${last.text} ${END_LINE}`);
    later(() => { if (my === token) { main.classList.add("ended"); focusFirst(end); } }, last.ms);
    focusFirst(end);
  }
  function reset() {
    clearAll();
    clearInterval(typing);
    main.classList.remove("ended", "is-ready", ...BEAT_CLASSES);
    cur = -1;
    elapsed = false;
    typing = null;
    delete main.dataset.beat;
    buildPips();
    cap.textContent = "";
    driftText.textContent = DRIFT_LINE.before;
    driftBub.classList.remove("glitch");
    markSlot.replaceChildren();
    end.inert = true;
    unflip();
  }
  function play() {
    if (named) beats = beatsFor(false); // a replay doesn't ask the name again
    reset();
    const my = ++token;
    main.classList.toggle("cs--still", Boolean(calm()));
    goTo(0, my);
    if (beatId() !== "name") skipBtn.focus({ preventScroll: true });
  }
  // Show beat i: its animation plays for b.ms, then it waits for a tap.
  function goTo(i, my) {
    if (i > 0) pips.children[i - 1].classList.replace("on", "done");
    cur = i;
    elapsed = false;
    main.classList.remove("is-ready");
    const b = beats[i];
    beat(b, i, my);
    if (i < beats.length - 1) later(() => { if (my === token && cur === i) { elapsed = true; readyCheck(); } }, b.ms);
  }
  // The name, as typed, or "friend". Skipping the name step takes the same.
  function takeName() {
    if (named) return;
    named = true;
    playerName = nameInput.value.trim() || "friend";
    onName(playerName);
  }
  function submitName() {
    if (beatId() !== "name" || main.classList.contains("ended")) return;
    takeName();
    nameInput.blur();
    goTo(cur + 1, token);
    skipBtn.focus({ preventScroll: true });
  }
  // A tap: finish the typing first, then turn the packet if it hasn't yet, then the next beat.
  function next() {
    if (cur < 0 || main.classList.contains("ended")) return;
    const my = token;
    if (typing) { finishTyping(); return; }
    if (beatId() === "name") { nameInput.focus({ preventScroll: true }); return; } // the name goes on with its own button
    if (beatId() === "almanac" && !flipping) { flipOver(my); return; }
    if (cur === beats.length - 1) { main.classList.add("ended"); focusFirst(end); return; }
    goTo(cur + 1, my);
  }
  function skip() {
    if (main.classList.contains("ended")) return;
    takeName();
    clearAll();
    clearInterval(typing);
    const my = ++token;
    main.classList.add(...BEAT_CLASSES, "ended");
    main.classList.remove("is-ready");
    cur = beats.length - 1;
    main.dataset.beat = last.id;
    for (const p of pips.children) { p.classList.remove("on"); p.classList.add("done"); }
    cap.textContent = last.text;
    driftText.textContent = DRIFT_LINE.after;
    unflip();
    showBack();
    arrive(my);
  }
  const typingIn = (el) => el?.matches?.("input, textarea");
  const onKey = (ev) => {
    if (ev.defaultPrevented) return;
    if (ev.key === "Escape") { ev.preventDefault(); skip(); return; }
    if (typingIn(ev.target)) return; // arrows move the caret in the name field
    if (ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); next(); }
  };
  // Tap anywhere on the scene (not on a control) to go on.
  main.addEventListener("click", (ev) => { if (!ev.target.closest("button, a, input, form")) next(); });
  document.addEventListener("keydown", onKey);
  const onResize = () => aimTail();
  window.addEventListener("resize", onResize);
  play();

  return function unmount() {
    token++;
    clearAll();
    clearInterval(typing);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
  };
}
