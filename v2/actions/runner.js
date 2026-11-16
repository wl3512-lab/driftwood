// Runs a plan (actions/plan.js) in the level screen: the tool pops up in the
// dock, a bouncing arrow marks each target, the player taps the target (the
// tool goes there by itself), drags the tool there (a one-off "carry this
// there" move), taps each spot, or presses and holds until a ring fills
// (pointer events: mouse, pen and touch). Each move counts the moment it is
// made and its animation plays on while the player makes the next one (moves
// overlap, they never queue or get refused); `onDone` lets the level apply
// the effect once every move is made and the last animation has ended.
//
// Targets: a bed (or one plant's field in it), a prop ([data-prop] in the
// scene), a named spot (level.spots, inside a bed or the scene), or the whole
// garden ({ all: true }). A kind's land() can leave marks that stay in the
// scene (a stake standing, a net over a bush, a readout) and swap a prop's art.
//
// Keyboard: Enter/Space on the tool sends it to the next target; 1…n pick a
// target; Esc cancels back to the choice (when `cancellable` and nothing is
// done yet). Reduced motion: no travel, short animations. Every wait has a
// timeout. Sprites are made when needed and removed after.
//
// Test runs (scripts/test-mute.js sets window.__dwAutoAct = true) finish each
// plan straight away through the same commit path the keyboard uses.
import { h, announce } from "../ui/dom.js";
import { kindOf } from "./registry.js";
import { sprite, art, artUrl, hasSprite } from "./sprites.js";
import { play, wait } from "./fx.js";
import { sfx } from "../audio/index.js";

// The stylesheet ships with the module, so index.html needs no new link.
if (typeof document !== "undefined" && !document.querySelector("link[data-actions-css]")) {
  document.head.append(Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/actions.css", import.meta.url).href,
  }));
  document.head.lastChild.dataset.actionsCss = "";
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const DRAG_START = 5; // px before a press becomes a drag

const HOLD_MS = 1200;
// The longest a move's marks wait for its animation (fx.js paces each one to
// ≤ 250 ms; a kind that chains a few can run a little over).
const LAND_MS = 320;
const SPOT = 56; // a named spot's box, px
// Half a tap spot's reach: the 44px button (css/actions.css .act__spot) turned
// 8° in its wiggle spans ~50px, plus a pixel to spare.
const SPOT_REACH = 26;
const ARROW_H = 28; // the director arrow's sprite
const ZONE = 56; // a tap-the-target button's least size, px (≥ 44 to touch)

// plan: normalized actions. scene: the element the beds and props live in.
// names: { target(tg), list(targets), item(id), thing(id, n), plant(id) }.
// itemFor(action) → the tool's face. spots: level.spots.
// skippable: a chore's quiet "Skip" link, which finishes it at once with no animation.
export function runPlan({ plan, scene, names, itemFor, onDone, onCancel = null, title = null, skippable = false, spots = {} }) {
  const reduced = reducedMotion();
  const layer = h("div", { class: "act-layer", "aria-hidden": "true" });
  // The director (arrows, rings, spots, tap buttons) lives in its own box, so
  // redrawing it never cuts short the fx sprites of a move still playing.
  const dir = h("div", { class: "act-dir" });
  layer.append(dir);
  scene.append(layer);
  const live = h("p", { class: "sr-only", "aria-live": "polite" });
  const card = h("div", { class: "act", role: "group", "aria-label": "Do it by hand" });
  let ai = 0;            // current action
  let done = [];         // per target of the current action: true once finished
  let left = [];         // tap kinds: spots left per target
  let taken = [];        // tap kinds: per target, the spot numbers already tapped
  // Moves never wait for each other: a drop, tap or hold counts at once, and
  // its animation plays while the player carries on. `flying` holds the moves
  // still animating; each lands its marks when its animation ends (or at once
  // on Skip). The card finishes once every action is done and nothing flies.
  const flying = new Set();
  let soakBusy = false;  // a soak move on its way: the hold ring comes next
  let ending = false;    // every action done; waiting for the last moves to land
  let over = false;
  let ghost = null;
  let item = null;
  let itemAt = -1;       // the action the tool button was made for
  let hold = null;       // the ring being held: { i, el, t0, ms, auto, raf }
  let soaking = -1;      // a drag kind with `soak`: the target waiting for its hold
  let tapSelected = false; // a draggable tool picked up by tapping, awaiting its destination
  // A drag kind with `from`: the things to carry sit on something in the
  // scene (basil tips on the basil, berries on Level 4's shelf bush). The
  // player drags each one off it; the card keeps only the words and count.
  let picked = new Set(); // the scene pieces already carried off
  let armedPick = -1;     // the piece picked up with a tap, waiting for its target
  let soaked = null;     // resolves the soak hold
  const timers = new Set();

  const action = () => plan[ai];
  const kind = () => kindOf(action().kind);
  const nextTarget = () => done.findIndex((d) => !d);
  // mode "tap" is either spots to tap (pull, pick…: the kind has spot art) or,
  // with `tapTarget`, a tap on the target itself: the tool travels there and
  // does its thing, as a drop would (dig, water, spray…).
  // An action can ask for it with `tap: true` (Level 4's spade heaping hills).
  const targetTap = () => (kind().mode === "tap" && !!kind().tapTarget) || (kind().mode === "drag" && action().tap === true);
  const spotTap = () => kind().mode === "tap" && !kind().tapTarget;

  const keyOf = (tg) => tg.bed && !tg.spot ? tg.bed : tg.prop || tg.spot || "all";
  const bedEl = (id) => scene.querySelector(`[data-bed="${id}"]`);
  // The element a target lives on (a spot has none of its own: its bed, or null).
  function targetEl(tg) {
    if (tg.prop) return scene.querySelector(`[data-prop="${tg.prop}"]`);
    if (tg.all) return scene.querySelector(".beds") || scene;
    if (tg.spot) return null;
    const bed = bedEl(tg.bed);
    return (tg.plant && bed?.querySelector(`[data-field="${tg.plant}"]`)) || bed;
  }
  // A target's viewport rect. A spot is a small box at its x/y (% of its bed, or of the scene).
  function rectOf(tg) {
    if (tg.spot) {
      const s = spots[tg.spot] || {};
      const base = (tg.bed && bedEl(tg.bed)) || scene;
      const r = base.getBoundingClientRect();
      const x = r.left + r.width * (s.x ?? 50) / 100;
      const y = r.top + r.height * (s.y ?? 50) / 100;
      return { left: x - SPOT / 2, top: y - SPOT / 2, right: x + SPOT / 2, bottom: y + SPOT / 2, width: SPOT, height: SPOT };
    }
    return targetEl(tg)?.getBoundingClientRect() || null;
  }
  // A target's box in layer coordinates, plus its viewport rect.
  function box(tg) {
    const r = rectOf(tg);
    if (!r) return null;
    const l = layer.getBoundingClientRect();
    return { x: r.left - l.left + r.width / 2, y: r.top - l.top + r.height / 2, w: r.width, h: r.height, rect: r };
  }

  // ---- marks that stay: a kind's land() calls these ----
  function marks() {
    let m = scene.querySelector(":scope > .act-marks");
    if (!m) { m = h("div", { class: "act-marks", "aria-hidden": "true" }); scene.append(m); }
    return m;
  }
  const artNode = (name, size = 52) => art(name, { size });
  const textNode = (text) => h("span", { class: "act-mark__text" }, text);
  // Pin node to the target, in % of the scene so it stays put when the beds re-render.
  function stamp(tg, node, { cls = "", cover = false } = {}) {
    const r = rectOf(tg);
    const sr = scene.getBoundingClientRect();
    if (!r || !sr.width || !sr.height) return null;
    const pct = (v, of) => `${(v / of) * 100}%`;
    const style = cover
      ? `left:${pct(r.left - sr.left, sr.width)}; top:${pct(r.top - sr.top, sr.height)}; width:${pct(r.width, sr.width)}; height:${pct(r.height, sr.height)}`
      : `left:${pct(r.left - sr.left + r.width / 2, sr.width)}; top:${pct(r.top - sr.top + r.height / 2, sr.height)}`;
    const m = h("div", { class: `act-mark ${cls}`.trim(), style, "data-mark": keyOf(tg) }, node);
    marks().append(m);
    return m;
  }
  // A prop shows new art (the jar fills); any other target gets the art stamped on it.
  function swap(tg, name) {
    const el = tg.prop && targetEl(tg);
    if (el?.tagName === "IMG" && !hasSprite(name)) { el.src = artUrl(name); el.dataset.art = name; return; }
    stamp(tg, artNode(name, 48), { cls: "act-mark--swap" });
  }

  function begin() {
    const a = action();
    done = a.targets.map(() => false);
    left = a.targets.map(() => a.count || 1);
    taken = a.targets.map(() => new Set());
    itemAt = -1; // a new tool
    soaking = -1;
    tapSelected = false;
    picked = new Set();
    armedPick = -1;
    if (a.fills?.from) a.targets.forEach((tg) => tg.prop && swap(tg, a.fills.from));
    renderCard();
    renderDirector();
    say(a.say ? a.say : kind().say(a, names));
  }

  function say(text) {
    live.textContent = "";
    live.textContent = text;
    announce(text);
  }

  // The scene element the pieces sit on, or null when the action has none or
  // it is not on screen (the shelf is hidden on a phone): then the dock's tool.
  function sourceEl() {
    const f = action()?.from;
    if (!f || ending) return null;
    const el = f.plot ? scene.querySelector(`[data-plot="${f.plot}"]`) : targetEl(f);
    const r = el?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? el : null;
  }
  const fromScene = () => kind().mode === "drag" && !targetTap() && !!sourceEl();
  const sourceName = () => { const f = action().from; return f.label || (f.plot ? "bush" : names.target(f)); };
  const totalMoves = () => action().targets.length * (action().count || 1);
  const freePick = () => { for (let j = 0; j < totalMoves(); j++) if (!picked.has(j)) return j; return -1; };

  function instruction() {
    if (soaking >= 0) return `Hold the ${names.target(action().targets[soaking])} until the ring fills`;
    if (tapSelected) return `Tap the ${names.list(action().targets.filter((_, i) => !done[i]))}`;
    return action().say || kind().say(action(), names);
  }

  function renderCard() {
    const a = action();
    const k = kind();
    const multi = a.targets.length > 1 || (a.count || 1) > 1;
    const how = soaking >= 0 || k.mode === "hold" ? "Press and hold · or press Enter"
      : targetTap() && a.targets.length === 1 ? `Tap the ${names.target(a.targets[0])} · or press Enter`
      : targetTap() || k.mode === "tap" ? "Tap each one · or press Enter"
      : fromScene() ? `Drag one off the ${sourceName()} · or tap it, then the target · Enter`
      : "Drag · or tap tool, then target · Enter";
    const total = a.targets.length * (a.count || 1);
    const count = total - left.reduce((n, x) => n + x, 0);
    // The tool stays the same element for the whole action: rebuilding it
    // mid-drag would drop the pointer capture (and the drag with it).
    if (!item || itemAt !== ai) {
      item?.remove();
      item = h("button", {
        class: `act__item act__item--${a.kind}`, type: "button", "data-act-item": a.kind,
        "aria-label": `${k.noun(a, names)}. Press Enter to use it${a.targets.length > 1 ? `, or 1 to ${a.targets.length} to pick one` : ""}.`,
        "aria-keyshortcuts": "Enter Space",
      }, itemFor(a));
      item.addEventListener("pointerdown", onPointerDown);
      item.addEventListener("keydown", onItemKey);
      itemAt = ai;
    }
    // Pieces in the scene: the tool button stays for the keyboard only.
    const inScene = fromScene();
    item.classList.toggle("act__item--scene", inScene);
    if (inScene) card.dataset.source = "scene"; else delete card.dataset.source;
    card.dataset.kind = a.kind;
    card.dataset.mode = soaking >= 0 ? "hold" : targetTap() || tapSelected ? "tap-target" : k.mode;
    setBusy();
    for (const el of [...card.children]) if (el !== item) el.remove();
    if (item.parentNode !== card) card.prepend(item);
    card.append(...[
      h("div", { class: "act__text" },
        title && h("p", { class: "act__title" }, title),
        h("p", { class: "act__say" }, instruction()),
        h("p", { class: "act__how", "aria-hidden": "true" }, how),
        multi && h("p", { class: "act__count" }, h("span", { class: "sr-only" }, "Done "), `${count}/${total}`),
        plan.length > 1 && h("p", { class: "act__steps", "aria-hidden": "true" }, plan.map((_, i) => h("span", { class: i < ai ? "is-done" : i === ai ? "is-now" : "" })))),
      onCancel && ai === 0 && count === 0 && h("button", { class: "btn btn--off act__back", type: "button", "data-act-back": "", onclick: cancel },
        "Back", h("kbd", { class: "kbd", "aria-hidden": "true" }, "Esc")),
      skippable && h("button", { class: "act__skip", type: "button", "data-act-skip": "", onclick: skip }, "Skip"),
      live].filter(Boolean));
  }
  // data-busy: a move is still animating (tests wait on it; input never does).
  function setBusy() { card.dataset.busy = String(flying.size > 0 || soakBusy || !!hold); }

  // Arrows over every target still to do (numbered when there are several),
  // the spots to tap for tap kinds, and the rings to hold for hold kinds.
  function renderDirector() {
    // A piece being dragged stays the same element (removing it would drop the drag).
    const keep = press?.pick >= 0 ? press.el : null;
    for (const c of [...dir.children]) if (c !== keep) c.remove();
    if (ending) return;
    const a = action();
    const k = kind();
    a.targets.forEach((tg, i) => {
      if (done[i]) return;
      if (soaking >= 0 && i !== soaking) return;
      const b = box(tg);
      if (!b) return;
      const small = b.h <= 120;
      // Inside the top of a big bed (below its sign, when the sign is staked
      // inside the bed on a phone); just above a small prop or spot.
      const sign = signBottom(tg);
      let top = small ? b.y - b.h / 2 - 16
        : Math.max(b.y - b.h / 2 + Math.min(44, b.h * 0.4), sign == null ? -Infinity : sign - layer.getBoundingClientRect().top + 40);
      // Above a small target, the arrow could land on a bed's sign or a HUD
      // button (phones): then it hangs under the target, pointing up.
      const up = small && arrowBlocked(b.x, top);
      if (up) top = b.y + b.h / 2 + 16 + ARROW_H;
      const arrow = h("div", { class: `act__arrow${up ? " act__arrow--up" : ""}`, style: `left:${b.x}px; top:${top}px`, "data-target": keyOf(tg) },
        sprite("arrow", { size: 28 }),
        a.targets.length > 1 && h("span", { class: "act__num" }, String(i + 1)));
      const ring = h("div", { class: `act__ring${tg.spot ? " act__ring--spot" : ""}`, style: `left:${b.x - b.w / 2}px; top:${b.y - b.h / 2}px; width:${b.w}px; height:${b.h}px` });
      // Tap the target: a clear button over it (before its ring, so hovering
      // it lights the ring).
      if ((targetTap() || tapSelected) && soaking < 0) dir.append(zone(tg, i, b));
      dir.append(ring, arrow);
      if (soaking === i || (k.mode === "hold" && soaking < 0)) return dir.append(holdRing(i, b));
      if (spotTap()) {
        const n = a.count || 1;
        const fit = spotBounds(tg);
        for (let j = 0; j < n; j++) {
          if (taken[i].has(j)) continue; // each spot keeps its place; a tapped one is gone
          let px; let py;
          if (b.w < 52 * n) { // a small target: the spots sit in a ring round it
            const ang = -Math.PI / 2 + (2 * Math.PI * j) / n;
            const rad = n > 1 ? Math.max(34, b.w / 2) : 0;
            px = b.x + Math.cos(ang) * rad; py = b.y + Math.sin(ang) * rad;
          } else {
            px = b.x - b.w * 0.32 + (b.w * 0.64) * ((j + 0.5) / n);
            py = b.y - b.h * 0.08 + ((j % 2) ? b.h * 0.16 : -b.h * 0.06);
          }
          px = fit.x(px); py = fit.y(py);
          const spot = h("button", {
            class: "act__spot", type: "button", style: `left:${px}px; top:${py}px`,
            "data-spot": `${keyOf(tg)}-${j}`, tabindex: -1, "aria-hidden": "true",
          }, art(k.spot(a), { size: 26 }));
          spot.addEventListener("click", (ev) => { ev.preventDefault(); tapSpot(i, spot); });
          dir.append(spot);
        }
      }
    });
    if (fromScene()) renderPicks(keep);
  }

  // The pieces to carry, spread over their source in the scene; fewer as
  // they are carried off (the source's data-picked counts them, for its art).
  function renderPicks(keep) {
    const a = action();
    const src = sourceEl();
    const r = src.getBoundingClientRect();
    const l = layer.getBoundingClientRect();
    const n = totalMoves();
    src.dataset.picked = String(picked.size);
    src.style.setProperty("--picked", String(picked.size));
    const fx = clampTo(Math.max(l.left, 0), Math.min(l.right, innerWidth), SPOT_REACH);
    const fy = clampTo(Math.max(l.top, 0), Math.min(l.bottom, innerHeight), SPOT_REACH);
    for (let j = 0; j < n; j++) {
      if (picked.has(j) || keep?.dataset.pick === String(j)) continue;
      // On a big source (a bed of basil) they spread over it; round a small
      // one (the 44px bush on the shelf) they sit in a ring, a finger apart.
      const small = r.width < 48 * n;
      const ang = -Math.PI / 2 + (2 * Math.PI * j) / n;
      const rad = Math.max(30, r.width / 2);
      const x = fx(small ? r.left + r.width / 2 + Math.cos(ang) * rad : r.left + r.width * (0.22 + 0.56 * ((j + 0.5) / n))) - l.left;
      const y = fy(small ? r.top + r.height / 2 + Math.sin(ang) * rad : r.top + r.height * ((j % 2) ? 0.5 : 0.3)) - l.top;
      const el = h("button", {
        class: `act__pick${armedPick === j ? " is-armed" : ""}`, type: "button", style: `left:${x}px; top:${y}px`,
        "data-pick": String(j), tabindex: -1, "aria-hidden": "true",
      }, art(a.item, { size: 28 }));
      el.addEventListener("pointerdown", (ev) => onPickDown(ev, el, j));
      dir.append(el);
    }
  }

  // Would an arrow whose foot is at (x, top), in layer px, sit on a bed's sign
  // or on the top bar / a tool button? (The arrow is 28px and bobs 10px up.)
  function arrowBlocked(x, top) {
    const l = layer.getBoundingClientRect();
    const a = { left: l.left + x - 16, right: l.left + x + 16, top: l.top + top - ARROW_H - 10, bottom: l.top + top };
    return [...scene.querySelectorAll(".bed__label, .scene__top > *, .tools .tool")].some((el) => {
      const q = el.getBoundingClientRect();
      return q.width && Math.min(a.right, q.right) - Math.max(a.left, q.left) > 2 && Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top) > 2;
    });
  }
  // The bottom of a bed target's sign when the sign stands inside the bed
  // (short landscape screens, css/scenes.css), in viewport px; else null.
  function signBottom(tg) {
    const bedId = tg.prop ? null : tg.bed || spots[tg.spot]?.bed;
    const bed = bedId && bedEl(bedId);
    const sign = bed?.querySelector(":scope > .bed__label");
    if (!sign) return null;
    const sr = sign.getBoundingClientRect();
    return sr.top >= bed.getBoundingClientRect().top ? sr.bottom : null;
  }
  // Where a target's tap buttons may go, in viewport px: inside its bed (a
  // ring round a narrow bed used to spill into the next bed and off the
  // garden's left edge on phones), below the bed's sign when the sign stands
  // inside it (belowSign), and inside the visible scene. A target that is not
  // in a bed (a prop) only keeps its buttons on screen.
  function areaOf(tg, { belowSign = true } = {}) {
    const lr = layer.getBoundingClientRect();
    let left = Math.max(lr.left, 0); let top = Math.max(lr.top, 0);
    let right = Math.min(lr.right, innerWidth); let bottom = Math.min(lr.bottom, innerHeight);
    // In stacked layouts the conversation grows upward over the scene.
    // Keep controls above that opaque panel so low props/spots remain usable.
    const dock = scene.closest(".level")?.querySelector(".dock")?.getBoundingClientRect();
    if (dock && dock.left <= left && dock.right >= right && dock.top > top && dock.top < bottom) bottom = dock.top;
    const bedId = tg.bed || spots[tg.spot]?.bed;
    const bed = bedId && !tg.prop ? bedEl(bedId) : null;
    if (bed) {
      const r = bed.getBoundingClientRect();
      left = Math.max(left, r.left); top = Math.max(top, r.top, belowSign ? (signBottom(tg) ?? -Infinity) + 2 : -Infinity);
      right = Math.min(right, r.right); bottom = Math.min(bottom, r.bottom);
    }
    return { left, top, right, bottom, lr };
  }
  // Clamp a centre so a box reaching `reach` px each way stays inside lo…hi
  // (centred when it can't fit).
  const clampTo = (lo, hi, reach) => (v) => {
    const a = lo + reach; const z = hi - reach;
    return a > z ? (a + z) / 2 : Math.min(z, Math.max(a, v));
  };
  // Where a tap spot's centre may go: the whole wiggling button stays inside.
  function spotBounds(tg) {
    const { left, top, right, bottom, lr } = areaOf(tg);
    const x = clampTo(left, right, SPOT_REACH); const y = clampTo(top, bottom, SPOT_REACH);
    return { x: (v) => x(v + lr.left) - lr.left, y: (v) => y(v + lr.top) - lr.top };
  }
  // Tap the target: a clear button over target i, at least ZONE px square
  // (a small prop or spot grows to a finger's size), kept inside its bed.
  function zone(tg, i, b) {
    const { left, top, right, bottom, lr } = areaOf(tg, { belowSign: false });
    const w = Math.max(44, Math.min(Math.max(ZONE, b.w), right - left));
    const hh = Math.max(44, Math.min(Math.max(ZONE, b.h), bottom - top));
    const cx = clampTo(left, right, w / 2)(b.rect.left + b.rect.width / 2);
    const cy = clampTo(top, bottom, hh / 2)(b.rect.top + b.rect.height / 2);
    const el = h("button", {
      class: "act__zone", type: "button", tabindex: -1, "aria-hidden": "true",
      style: `left:${cx - w / 2 - lr.left}px; top:${cy - hh / 2 - lr.top}px; width:${w}px; height:${hh}px`,
      "data-zone": keyOf(tg), "data-i": String(i),
    });
    el.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); commit(i); });
    return el;
  }

  // ---- press and hold ----
  function holdRing(i, b) {
    const { left, top, right, bottom, lr } = areaOf(action().targets[i]);
    const x = clampTo(left, right, 36)(b.x + lr.left) - lr.left;
    const y = clampTo(top, bottom, 36)(b.y + lr.top) - lr.top;
    const el = h("button", {
      class: "act__hold", type: "button", style: `left:${x}px; top:${y}px; --p:0`,
      "data-hold": keyOf(action().targets[i]), "data-i": String(i), tabindex: -1, "aria-hidden": "true",
    }, h("span", { class: "act__hold-fill" }));
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button > 0) return;
      ev.preventDefault();
      try { el.setPointerCapture(ev.pointerId); } catch (_) { /* fine */ }
      startHold(i);
    });
    const let_go = () => { if (hold && hold.el === el) stopHold(); };
    el.addEventListener("pointerup", let_go);
    el.addEventListener("pointercancel", let_go);
    el.addEventListener("contextmenu", (ev) => ev.preventDefault()); // a long press on touch
    return el;
  }
  const holdMs = () => {
    const a = action();
    const ms = soaking >= 0 ? (typeof a.soak === "number" ? a.soak : 1500) : (a.ms || HOLD_MS);
    return reduced ? 300 : Math.max(300, Math.min(ms, 4000));
  };
  // auto: keyboard or a test run; it fills by itself and can't be let go.
  function startHold(i, { auto = false } = {}) {
    if (over || ending || hold) return;
    const el = dir.querySelector(`.act__hold[data-i="${i}"]`);
    if (!el) return;
    const ms = holdMs();
    hold = { i, el, t0: performance.now(), ms, auto, raf: 0 };
    el.classList.add("is-holding");
    setBusy();
    const me = hold;
    const tick = (now) => {
      if (over || hold !== me) return;
      const p = Math.min(1, (now - me.t0) / me.ms);
      el.style.setProperty("--p", p.toFixed(3));
      if (p >= 1) return holdDone();
      me.raf = requestAnimationFrame(tick);
    };
    me.raf = requestAnimationFrame(tick);
    // rAF stalls in a background tab: the timer finishes it anyway.
    later(() => { if (hold === me) holdDone(); }, ms + 250);
  }
  function stopHold() {
    if (!hold || hold.auto) return;
    cancelAnimationFrame(hold.raf);
    hold.el.classList.remove("is-holding");
    hold.el.style.setProperty("--p", "0");
    hold = null;
    setBusy();
    nudge("Keep holding until the ring fills");
  }
  function holdDone() {
    const { i, el, raf } = hold;
    cancelAnimationFrame(raf);
    hold = null;
    el.style.setProperty("--p", "1");
    el.classList.add("is-full");
    if (soaked) { const r = soaked; soaked = null; setBusy(); return r(); }
    // Out of the director, so redrawing it leaves the ring's pop playing.
    layer.append(el);
    move(i, () => play(el, [{ scale: "1" }, { scale: "1.25", opacity: 0 }], { duration: reduced ? 80 : 260 }).then(() => el.remove()));
  }

  // ---- pointer drag ----
  let press = null;
  function onPointerDown(ev) {
    // Never refused while an earlier move animates: that one plays on.
    if (over || ending || press || (ev.button !== undefined && ev.button > 0)) return;
    // Hold kinds: holding the tool fills the next ring too.
    if (soaking >= 0 || kind().mode === "hold") {
      ev.preventDefault();
      try { item.setPointerCapture(ev.pointerId); } catch (_) { /* fine */ }
      startHold(soaking >= 0 ? soaking : nextTarget());
      const up = () => { item?.removeEventListener("pointerup", up); item?.removeEventListener("pointercancel", up); if (hold && !hold.auto) stopHold(); };
      item.addEventListener("pointerup", up);
      item.addEventListener("pointercancel", up);
      return;
    }
    ev.preventDefault();
    item.focus({ preventScroll: true });
    startPress(ev, item, -1);
  }
  // A press on one of the pieces in the scene: drag it, or tap to pick it up.
  function onPickDown(ev, el, j) {
    if (over || ending || press || soaking >= 0 || (ev.button !== undefined && ev.button > 0)) return;
    ev.preventDefault();
    startPress(ev, el, j);
  }
  function startPress(ev, el, pick) {
    try { el.setPointerCapture(ev.pointerId); } catch (_) { /* fine */ }
    press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, touch: ev.pointerType === "touch", dragging: false, el, pick };
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("lostpointercapture", onPointerCancel);
  }
  function lift(x, y) {
    ghost = h("div", { class: "act__ghost", "aria-hidden": "true" });
    ghost.append(itemFor(action()));
    document.body.append(ghost);
    press.el.classList.add("is-lifted");
    moveGhost(x, y);
  }
  function moveGhost(x, y) {
    if (!ghost) return;
    // On touch the tool rides above the finger, so the player can see it.
    const lift = press?.touch ? 44 : 0;
    ghost.style.transform = `translate(${x}px, ${y - lift}px) translate(-50%, -50%)`;
    ghost.dataset.x = x; ghost.dataset.y = y - lift;
  }
  function onPointerMove(ev) {
    if (!press || ev.pointerId !== press.id) return;
    if (!press.dragging && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > DRAG_START) {
      press.dragging = true;
      lift(ev.clientX, ev.clientY);
    }
    if (press.dragging) { moveGhost(ev.clientX, ev.clientY); hover(ev.clientX, ev.clientY - (press.touch ? 44 : 0)); }
  }
  function endPress() {
    const el = press?.el || item;
    el?.removeEventListener("pointermove", onPointerMove);
    el?.removeEventListener("pointerup", onPointerUp);
    el?.removeEventListener("pointercancel", onPointerCancel);
    el?.removeEventListener("lostpointercapture", onPointerCancel);
    press = null;
    dir.querySelectorAll(".act__ring.is-hot").forEach((r) => r.classList.remove("is-hot"));
  }
  // Capture lost (the card re-rendered, the window lost focus) counts as a cancel:
  // the tool flies home instead of staying stuck on screen.
  function onPointerCancel() { if (!press) return; const g = ghost; const home = press.el; ghost = null; endPress(); bounceBack(g, home); }
  function onPointerUp(ev) {
    if (!press) return;
    const { dragging, touch, el: home, pick } = press;
    endPress();
    if (!dragging && pick >= 0) {
      // A tap on a piece picks it up (a second tap puts it back); then tap the target.
      armedPick = armedPick === pick ? -1 : pick;
      tapSelected = armedPick >= 0;
      renderCard();
      renderDirector();
      say(instruction());
      return;
    }
    if (!dragging) {
      // A draggable tool also supports picking it up and placing it with two taps.
      if (targetTap() || kind().mode === "tap") return go(nextTarget());
      tapSelected = true;
      renderCard();
      renderDirector();
      say(instruction());
      return;
    }
    const x = ev.clientX;
    const y = ev.clientY - (touch ? 44 : 0);
    const hit = hitTarget(x, y);
    const g = ghost;
    ghost = null;
    if (hit >= 0) return commit(hit, { from: g, pick });
    const there = labelAt(x, y);
    const want = names.target(action().targets[nextTarget()]);
    bounceBack(g, home);
    nudge(there && there !== want ? `Not the ${there}. Try the ${want}` : `Drop it on the ${want}`);
  }
  // Which undone target the drop at (x, y) is for. Beds get 16px of slack;
  // spots and small props are grown to at least 96px so a finger dropping a
  // little short still hits them. Where two grown boxes overlap (two hills
  // side by side), the nearest target wins.
  function hitTarget(x, y) {
    if (ending) return -1;
    const a = action();
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < a.targets.length; i++) {
      if (done[i]) continue;
      const r = rectOf(a.targets[i]);
      if (!r) continue;
      const sx = Math.max(16, (96 - r.width) / 2);
      const sy = Math.max(16, (96 - r.height) / 2);
      if (x < r.left - sx || x > r.right + sx || y < r.top - sy || y > r.bottom + sy) continue;
      const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  // Tap-the-target kinds: a tap on the wrong bed or prop says which one is wanted.
  function onSceneClick(ev) {
    if (over || ending || hold || soaking >= 0 || !(targetTap() || tapSelected)) return;
    if (ev.target?.closest?.(".act__zone, .act, .scene__top, .tools, button, a, input, textarea, [role='button']")) return;
    const there = labelAt(ev.clientX, ev.clientY);
    const i = nextTarget();
    if (!there || i < 0) return;
    const want = names.target(action().targets[i]);
    if (there !== want) nudge(`Not the ${there}. Tap the ${want}`);
  }
  scene.addEventListener("click", onSceneClick);
  // The name of whatever is under (x, y): a prop, else a bed.
  function labelAt(x, y) {
    const inside = (el) => { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
    const prop = [...scene.querySelectorAll("[data-prop]")].find(inside);
    if (prop) return names.target({ prop: prop.dataset.prop });
    const bed = [...scene.querySelectorAll("[data-bed]")].find(inside);
    return bed ? names.target({ bed: bed.dataset.bed }) : null;
  }
  function hover(x, y) {
    const hit = hitTarget(x, y);
    const rings = dir.querySelectorAll(".act__ring");
    let n = 0;
    action().targets.forEach((_, i) => { if (!done[i]) { rings[n]?.classList.toggle("is-hot", i === hit); n++; } });
  }
  function bounceBack(g, home = item) {
    home?.classList.remove("is-lifted");
    item?.classList.remove("is-lifted");
    if (!g) return;
    const r = (home?.isConnected ? home : item).getBoundingClientRect();
    const x = Number(g.dataset.x); const y = Number(g.dataset.y);
    const to = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) translate(-50%, -50%)`;
    play(g, [{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }, { transform: to, opacity: 0.4 }],
      { duration: reduced ? 0 : 260, easing: "cubic-bezier(.3,1.4,.6,1)" }).then(() => g.remove());
  }
  function nudge(text) {
    sfx("act-wrong");
    item?.classList.remove("is-nudge");
    void item?.offsetWidth;
    item?.classList.add("is-nudge");
    const say_ = card.querySelector(".act__say");
    if (say_) { say_.textContent = text; say_.classList.add("is-wrong"); }
    say(text);
    later(() => {
      if (!say_ || over) return;
      say_.classList.remove("is-wrong");
      say_.textContent = instruction();
    }, 2200);
  }

  // ---- keyboard ----
  function onItemKey(ev) {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); if (!ev.repeat) go(nextTarget()); }
  }
  // The level's document keydown calls this first while an action runs.
  function key(ev) {
    if (over) return false;
    if (ev.key === "Escape" && onCancel && ai === 0 && done.every((d) => !d) && flying.size === 0 && untouched()) { cancel(); return true; }
    const n = Number(ev.key);
    if (Number.isInteger(n) && n >= 1 && n <= action().targets.length && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      if (!done[n - 1]) go(n - 1); else nudge(`The ${names.target(action().targets[n - 1])} is done`);
      return true;
    }
    // Enter/Space anywhere (focus lost to the page) uses the tool too.
    if ((ev.key === "Enter" || ev.key === " ") && !card.contains(document.activeElement) && document.activeElement === document.body) {
      go(nextTarget());
      return true;
    }
    return ev.key === "Escape"; // swallow Esc: nothing else should close mid-action
  }
  const untouched = () => left.every((x) => x === (action().count || 1));

  // Send the tool to target i (keyboard, tap on the tool, auto).
  function go(i, opts = {}) {
    if (over || ending) return;
    if (soaking >= 0) return startHold(soaking, { auto: true });
    if (soakBusy || i < 0) return;
    if (kind().mode === "hold") return startHold(i, { auto: true });
    if (spotTap()) {
      const spot = dir.querySelector(`.act__spot[data-spot^="${keyOf(action().targets[i])}-"]`);
      return tapSpot(i, spot, opts);
    }
    commit(i, opts);
  }

  // A drop or tap on target i: it counts now, and the tool's trip there and
  // the kind's animation play while the player goes on to the next one.
  function commit(i, { from = null, instant = false, pick = -1 } = {}) {
    if (over || ending || soakBusy || soaking >= 0 || done[i] || left[i] <= 0) { from?.remove(); return; }
    const a = action();
    const k = kind();
    const tg = a.targets[i];
    // Pieces in the scene: this move carries one off (the one dragged, the
    // one picked up with a tap, else the next one: keyboard and auto runs).
    let pieceAt = null;
    if (a.from) {
      const j = pick >= 0 ? pick : armedPick >= 0 ? armedPick : freePick();
      const pieceEl = j >= 0 && dir.querySelector(`.act__pick[data-pick="${j}"]`);
      if (pieceEl && !from) { const r = pieceEl.getBoundingClientRect(); pieceAt = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      if (j >= 0) picked.add(j);
      armedPick = -1;
      tapSelected = false;
    }
    item?.classList.remove("is-lifted");
    const line = card.querySelector(".act__say");
    if (line) { line.classList.remove("is-wrong"); line.textContent = a.say || k.say(a, names); }
    const b = box(tg);
    if (instant || !b) { from?.remove(); return move(i, null); }
    // The tool travels to the bed (from where it was dropped, or from the dock).
    const start = from ? { x: Number(from.dataset.x), y: Number(from.dataset.y) } : pieceAt || (() => {
      const r = item.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })();
    // A tap on the target (dig, water, hoe…) answers at once: the kind's
    // animation brings its own tool there, so there is no trip to wait for.
    const trip = from || pieceAt || !targetTap();
    const run = async () => {
      if (trip) await travel();
      await k.animate(layer, b, { reduced, spot: k.spot?.(a), face: () => itemFor(a), el: targetEl(tg) });
    };
    const travel = async () => {
      const g = from || h("div", { class: "act__ghost", "aria-hidden": "true" }, itemFor(a));
      if (!from) document.body.append(g);
      const end = `translate(${b.rect.left + b.rect.width / 2}px, ${b.rect.top + b.rect.height / 2 - Math.min(70, b.rect.height * 0.3)}px) translate(-50%, -50%)`;
      try {
        await play(g, [{ transform: `translate(${start.x}px, ${start.y}px) translate(-50%, -50%)` }, { transform: end }],
          { duration: reduced || from ? 160 : 460, easing: "cubic-bezier(.3,.7,.4,1)" });
      } finally { g.remove(); }
    };
    if (a.soak && left[i] === 1) return soakMove(i, run);
    move(i, run);
  }

  // Soak (a drag kind with `soak`): after the tool's animation, the player
  // holds the target until the ring fills; only then does the move count.
  let soakSeq = 0;
  async function soakMove(i, run) {
    const me = ++soakSeq;
    soakBusy = true;
    setBusy();
    try { await run(); } catch (err) { console.warn("action animation failed", err); }
    if (over || me !== soakSeq) return;
    soakBusy = false;
    soaking = i;
    renderCard();
    renderDirector();
    say(`Hold the ${names.target(action().targets[i])} until the ring fills`);
    await new Promise((res) => { soaked = res; });
    if (over || me !== soakSeq || soaking !== i) return;
    soaking = -1;
    move(i, null);
  }

  // One move on target i of the current action counts at once: the count
  // and the arrows update, and the next action opens as soon as this one's
  // targets are all done. `run` (its animation) plays on; when it ends the
  // kind leaves its marks (stake, net, readout). No run: the marks land now.
  function move(i, run) {
    const a = action();
    const k = kind();
    const tg = a.targets[i];
    left[i] -= 1;
    const last = left[i] <= 0;
    const f = { landed: false };
    f.land = () => {
      if (f.landed) return;
      f.landed = true;
      flying.delete(f);
      try {
        k.land?.({ a, tg, i, last, el: targetEl(tg), rect: rectOf(tg), stamp, swap, artNode, textNode });
      } catch (err) { console.warn("action land failed", err); }
      setBusy();
      settle();
    };
    if (last) done[i] = true;
    if (run) {
      flying.add(f);
      // Its marks land when the animation ends, LAND_MS at the latest; under
      // reduced motion at once (the animation, if any, plays on its own).
      const played = Promise.resolve().then(run).catch((err) => console.warn("action animation failed", err));
      if (reduced) f.land();
      else Promise.race([played, wait(LAND_MS)]).then(() => { if (!over) f.land(); });
    } else {
      f.land();
    }
    if (last) say(k.done(a, names, tg));
    advance(!run);
  }

  // A tap on one of target i's spots (a berry, a weed, a tip).
  function tapSpot(i, spot, { instant = false } = {}) {
    if (over || ending || soakBusy || done[i] || left[i] <= 0) return;
    const a = action();
    const k = kind();
    const tg = a.targets[i];
    const n = a.count || 1;
    const j = spot ? Number(spot.dataset.spot.split("-").pop()) : [...Array(n).keys()].find((x) => !taken[i].has(x));
    taken[i].add(j);
    const b = box(tg);
    let run = null;
    if (!instant && spot && b) {
      const l = layer.getBoundingClientRect();
      const r = spot.getBoundingClientRect();
      const at = { x: r.left - l.left + r.width / 2, y: r.top - l.top + r.height / 2, w: b.w, h: b.h };
      run = () => k.animate(layer, at, { reduced, spot: k.spot?.(a), face: () => itemFor(a), el: targetEl(tg) });
    }
    spot?.remove();
    move(i, run);
  }

  function advance(instant) {
    if (done.every(Boolean)) {
      if (ai + 1 >= plan.length) {
        // Every action done: the card finishes once the last moves land.
        ending = true;
        renderCard();
        renderDirector();
        return settle();
      }
      ai += 1;
      begin();
    } else {
      renderCard();
      renderDirector();
    }
    if (!instant && !press) item?.focus({ preventScroll: true });
  }
  function settle() { if (ending && !over && flying.size === 0) finish(); }

  function finish() {
    if (over) return;
    over = true;
    cleanup();
    onDone();
  }
  // Skip a chore: the end state lands straight away, then the level carries on.
  function skip() {
    if (over) return;
    completeAll();
  }
  function clearHold() {
    if (hold) cancelAnimationFrame(hold.raf);
    hold = null;
    soaked = null;
    soaking = -1;
  }
  function cancel() {
    if (over) return;
    over = true;
    cleanup();
    onCancel?.();
  }
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }
  function cleanup() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    endPress();
    clearHold();
    ghost?.remove();
    ghost = null;
    layer.remove();
    window.removeEventListener("resize", onResize);
    scene.removeEventListener("click", onSceneClick);
    watch?.disconnect();
    if (window.__dwAct === api) delete window.__dwAct;
  }
  const onResize = () => { if (!over && !hold) renderDirector(); };
  window.addEventListener("resize", onResize);
  // The scene can still be settling (fonts, art, a chore at the very start):
  // re-place the arrows whenever its box changes.
  let lastBox = "";
  const watch = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
    const r = scene.getBoundingClientRect();
    const key_ = `${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
    if (key_ !== lastBox) { lastBox = key_; onResize(); }
  }) : null;
  watch?.observe(scene);
  const beds = scene.querySelector(".beds");
  if (beds) watch?.observe(beds);

  // Finish everything now through the commit path (test runs, and a level that unmounts mid-action).
  function completeAll() {
    // Moves still animating land their marks now.
    for (const f of [...flying]) f.land();
    let guard = 64;
    while (!over && guard-- > 0) {
      // A soak or hold in progress: dropped here; its target is done below.
      if (soaking >= 0 || hold || soakBusy) { clearHold(); soakBusy = false; soakSeq += 1; continue; }
      if (ending) { settle(); break; }
      const i = nextTarget();
      if (i < 0) { advance(true); continue; }
      if (spotTap()) tapSpot(i, null, { instant: true });
      else if (kind().mode === "hold") move(i, null);
      else commit(i, { instant: true });
    }
  }

  const api = {
    card,
    key,
    focus: () => item?.focus({ preventScroll: true }),
    destroy: () => { over = true; cleanup(); },
    completeAll,
    // Re-place the arrows after the beds re-render.
    refresh: () => { if (!over && !hold) renderDirector(); },
    get kind() { return action()?.kind; },
  };
  begin();
  window.__dwAct = api;
  if (window.__dwAutoAct === true) queueMicrotask(completeAll);
  return api;
}

export { wait };
