// Runs a plan (actions/plan.js) in the level screen: the tool pops up in the
// dock, a bouncing arrow marks each target bed, the player drags the tool
// there (pointer events: mouse, pen and touch) or taps each spot, an animation
// plays, and only then does `onDone` let the level apply the effect.
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
import { sprite, art } from "./sprites.js";
import { play, wait } from "./fx.js";

// The stylesheet ships with the module, so index.html needs no new link.
if (typeof document !== "undefined" && !document.querySelector("link[data-actions-css]")) {
  document.head.append(Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/actions.css", import.meta.url).href,
  }));
  document.head.lastChild.dataset.actionsCss = "";
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const DRAG_START = 5; // px before a press becomes a drag

// plan: normalized actions. scene: the element the beds live in.
// names: { bed(id), plant(id), list(targets) }. itemFor(action) → the tool's face.
export function runPlan({ plan, scene, names, itemFor, onDone, onCancel = null, title = null }) {
  const reduced = reducedMotion();
  const layer = h("div", { class: "act-layer", "aria-hidden": "true" });
  scene.append(layer);
  const live = h("p", { class: "sr-only", "aria-live": "polite" });
  const card = h("div", { class: "act", role: "group", "aria-label": "Do it by hand" });
  let ai = 0;            // current action
  let done = [];         // per target of the current action: true once finished
  let left = [];         // tap kinds: spots left per target
  let busy = false;
  let over = false;
  let ghost = null;
  let item = null;
  const timers = new Set();

  const action = () => plan[ai];
  const kind = () => kindOf(action().kind);
  const nextTarget = () => done.findIndex((d) => !d);

  function targetEl(tg) {
    const bed = scene.querySelector(`[data-bed="${tg.bed}"]`);
    return (tg.plant && bed?.querySelector(`[data-field="${tg.plant}"]`)) || bed;
  }
  // A target's box in layer coordinates, plus its viewport rect.
  function box(tg) {
    const el = targetEl(tg);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const l = layer.getBoundingClientRect();
    return { x: r.left - l.left + r.width / 2, y: r.top - l.top + r.height / 2, w: r.width, h: r.height, rect: r };
  }

  function begin() {
    const a = action();
    done = a.targets.map(() => false);
    left = a.targets.map(() => a.count || 1);
    renderCard();
    renderDirector();
    say(a.say ? a.say : kind().say(a, names));
  }

  function say(text) {
    live.textContent = "";
    live.textContent = text;
    announce(text);
  }

  function renderCard() {
    const a = action();
    const k = kind();
    const multi = a.targets.length > 1 || (a.count || 1) > 1;
    const total = a.targets.length * (a.count || 1);
    const count = total - left.reduce((n, x) => n + x, 0);
    item = h("button", {
      class: `act__item act__item--${a.kind}`, type: "button", "data-act-item": a.kind,
      "aria-label": `${k.noun(a, names)}. Press Enter to use it${a.targets.length > 1 ? `, or 1 to ${a.targets.length} to pick a bed` : ""}.`,
      "aria-keyshortcuts": "Enter Space",
    }, itemFor(a));
    item.addEventListener("pointerdown", onPointerDown);
    item.addEventListener("keydown", onItemKey);
    card.dataset.kind = a.kind;
    card.dataset.busy = String(busy);
    card.replaceChildren(...[
      item,
      h("div", { class: "act__text" },
        title && h("p", { class: "act__title" }, title),
        h("p", { class: "act__say" }, a.say || k.say(a, names)),
        h("p", { class: "act__how", "aria-hidden": "true" },
          k.mode === "tap" ? "Tap each one · or press Enter" : "Drag it there · or press Enter"),
        multi && h("p", { class: "act__count" }, h("span", { class: "sr-only" }, "Done "), `${count}/${total}`),
        plan.length > 1 && h("p", { class: "act__steps", "aria-hidden": "true" }, plan.map((_, i) => h("span", { class: i < ai ? "is-done" : i === ai ? "is-now" : "" })))),
      onCancel && ai === 0 && count === 0 && h("button", { class: "btn btn--off act__back", type: "button", "data-act-back": "", onclick: cancel },
        "Back", h("kbd", { class: "kbd", "aria-hidden": "true" }, "Esc")),
      live].filter(Boolean));
  }

  // Arrows over every target still to do (numbered when there are several),
  // and the spots to tap for tap kinds.
  function renderDirector() {
    layer.replaceChildren();
    const a = action();
    const k = kind();
    a.targets.forEach((tg, i) => {
      if (done[i]) return;
      const b = box(tg);
      if (!b) return;
      const arrow = h("div", { class: "act__arrow", style: `left:${b.x}px; top:${b.y - b.h / 2 + Math.min(44, b.h * 0.4)}px`, "data-target": tg.bed },
        sprite("arrow", { size: 28 }),
        a.targets.length > 1 && h("span", { class: "act__num" }, String(i + 1)));
      const ring = h("div", { class: "act__ring", style: `left:${b.x - b.w / 2}px; top:${b.y - b.h / 2}px; width:${b.w}px; height:${b.h}px` });
      layer.append(ring, arrow);
      if (k.mode === "tap") {
        for (let s = 0; s < left[i]; s++) {
          const n = a.count || 1;
          const j = (a.count || 1) - left[i] + s; // stable position for each spot
          const px = b.x - b.w * 0.32 + (b.w * 0.64) * ((j + 0.5) / n);
          const py = b.y - b.h * 0.08 + ((j % 2) ? b.h * 0.16 : -b.h * 0.06);
          const spot = h("button", {
            class: "act__spot", type: "button", style: `left:${px}px; top:${py}px`,
            "data-spot": `${tg.bed}-${j}`, tabindex: -1, "aria-hidden": "true",
          }, art(k.spot(a), { size: 26 }));
          spot.addEventListener("click", (ev) => { ev.preventDefault(); tapSpot(i, spot); });
          layer.append(spot);
        }
      }
    });
  }

  // ---- pointer drag ----
  let press = null;
  function onPointerDown(ev) {
    if (busy || over || (ev.button !== undefined && ev.button > 0)) return;
    ev.preventDefault();
    item.focus({ preventScroll: true });
    try { item.setPointerCapture(ev.pointerId); } catch (_) { /* fine */ }
    press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, touch: ev.pointerType === "touch", dragging: false };
    item.addEventListener("pointermove", onPointerMove);
    item.addEventListener("pointerup", onPointerUp);
    item.addEventListener("pointercancel", onPointerCancel);
  }
  function lift(x, y) {
    ghost = h("div", { class: "act__ghost", "aria-hidden": "true" });
    ghost.append(itemFor(action()));
    document.body.append(ghost);
    item.classList.add("is-lifted");
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
    item?.removeEventListener("pointermove", onPointerMove);
    item?.removeEventListener("pointerup", onPointerUp);
    item?.removeEventListener("pointercancel", onPointerCancel);
    press = null;
    layer.querySelectorAll(".act__ring.is-hot").forEach((r) => r.classList.remove("is-hot"));
  }
  function onPointerCancel() { const g = ghost; endPress(); bounceBack(g); }
  function onPointerUp(ev) {
    if (!press) return;
    const { dragging, touch } = press;
    endPress();
    if (!dragging) {
      // A tap on the tool: tap kinds go to the next spot; drag kinds need the drag.
      if (kind().mode === "tap") return go(nextTarget());
      return nudge(`Drag it to the ${names.bed(action().targets[nextTarget()].bed)}`);
    }
    const x = ev.clientX;
    const y = ev.clientY - (touch ? 44 : 0);
    const hit = hitTarget(x, y);
    const g = ghost;
    ghost = null;
    if (hit >= 0) return commit(hit, { from: g });
    const bed = bedAt(x, y);
    const want = names.bed(action().targets[nextTarget()].bed);
    bounceBack(g);
    nudge(bed && bed !== action().targets[nextTarget()].bed
      ? `Not the ${names.bed(bed)}. Try the ${want}`
      : `Drop it on the ${want}`);
  }
  // Which undone target is under (x, y), with a little slack round small beds.
  function hitTarget(x, y) {
    const a = action();
    for (let i = 0; i < a.targets.length; i++) {
      if (done[i]) continue;
      const el = scene.querySelector(`[data-bed="${a.targets[i].bed}"]`);
      const r = el?.getBoundingClientRect();
      if (r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12) return i;
    }
    return -1;
  }
  function bedAt(x, y) {
    for (const el of scene.querySelectorAll("[data-bed]")) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.bed;
    }
    return null;
  }
  function hover(x, y) {
    const hit = hitTarget(x, y);
    const rings = layer.querySelectorAll(".act__ring");
    let n = 0;
    action().targets.forEach((_, i) => { if (!done[i]) { rings[n]?.classList.toggle("is-hot", i === hit); n++; } });
  }
  function bounceBack(g) {
    item?.classList.remove("is-lifted");
    if (!g) return;
    const r = item.getBoundingClientRect();
    const x = Number(g.dataset.x); const y = Number(g.dataset.y);
    const to = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) translate(-50%, -50%)`;
    play(g, [{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }, { transform: to, opacity: 0.4 }],
      { duration: reduced ? 0 : 260, easing: "cubic-bezier(.3,1.4,.6,1)" }).then(() => g.remove());
  }
  function nudge(text) {
    item?.classList.remove("is-nudge");
    void item?.offsetWidth;
    item?.classList.add("is-nudge");
    const say_ = card.querySelector(".act__say");
    if (say_) { say_.textContent = text; say_.classList.add("is-wrong"); }
    say(text);
    later(() => {
      if (!say_ || over) return;
      say_.classList.remove("is-wrong");
      say_.textContent = action().say || kind().say(action(), names);
    }, 2200);
  }

  // ---- keyboard ----
  function onItemKey(ev) {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); go(nextTarget()); }
  }
  // The level's document keydown calls this first while an action runs.
  function key(ev) {
    if (over) return false;
    if (ev.key === "Escape" && onCancel && ai === 0 && done.every((d) => !d) && !busy && untouched()) { cancel(); return true; }
    const n = Number(ev.key);
    if (Number.isInteger(n) && n >= 1 && n <= action().targets.length && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      if (!done[n - 1]) go(n - 1); else nudge(`The ${names.bed(action().targets[n - 1].bed)} is done`);
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
    if (busy || over || i < 0) return;
    if (kind().mode === "tap") {
      const spot = layer.querySelector(`.act__spot[data-spot^="${action().targets[i].bed}-"]`);
      return tapSpot(i, spot, opts);
    }
    commit(i, opts);
  }

  async function commit(i, { from = null, instant = false } = {}) {
    if (busy || over || done[i]) return;
    busy = true;
    card.dataset.busy = "true";
    const a = action();
    const tg = a.targets[i];
    const line = card.querySelector(".act__say");
    if (line) { line.classList.remove("is-wrong"); line.textContent = a.say || kind().say(a, names); }
    const b = box(tg);
    if (!instant && b) {
      // The tool travels to the bed (from where it was dropped, or from the dock).
      const g = from || h("div", { class: "act__ghost", "aria-hidden": "true" }, itemFor(a));
      if (!from) document.body.append(g);
      const start = from ? `translate(${from.dataset.x}px, ${from.dataset.y}px) translate(-50%, -50%)` : (() => {
        const r = item.getBoundingClientRect();
        return `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) translate(-50%, -50%)`;
      })();
      const end = `translate(${b.rect.left + b.rect.width / 2}px, ${b.rect.top + b.rect.height / 2 - Math.min(70, b.rect.height * 0.3)}px) translate(-50%, -50%)`;
      item.classList.add("is-lifted");
      await play(g, [{ transform: start }, { transform: end }],
        { duration: reduced || from ? 160 : 460, easing: "cubic-bezier(.3,.7,.4,1)" });
      g.remove();
      await kind().animate(layer, b, { reduced, spot: kind().spot?.(a), face: () => itemFor(a) });
    } else {
      from?.remove();
    }
    if (over) return;
    left[i] -= 1;
    busy = false;
    item?.classList.remove("is-lifted");
    if (left[i] > 0) { renderCard(); renderDirector(); if (!instant) item?.focus({ preventScroll: true }); return; }
    done[i] = true;
    say(kind().done(a, names, tg));
    advance(instant);
  }

  async function tapSpot(i, spot, { instant = false } = {}) {
    if (busy || over || done[i] || left[i] <= 0) return;
    busy = true;
    card.dataset.busy = "true";
    const a = action();
    const b = box(a.targets[i]);
    if (!instant && spot && b) {
      const l = layer.getBoundingClientRect();
      const r = spot.getBoundingClientRect();
      spot.remove();
      await kind().animate(layer, { x: r.left - l.left + r.width / 2, y: r.top - l.top + r.height / 2, w: b.w, h: b.h }, { reduced, spot: kind().spot?.(a), face: () => itemFor(a) });
    } else {
      spot?.remove();
    }
    if (over) return;
    left[i] -= 1;
    busy = false;
    if (left[i] <= 0) {
      done[i] = true;
      say(kind().done(a, names, a.targets[i]));
      return advance(instant);
    }
    renderCard();
    renderDirector();
    if (!instant) item?.focus({ preventScroll: true });
  }

  function advance(instant) {
    if (done.every(Boolean)) {
      ai += 1;
      if (ai >= plan.length) return finish();
      begin();
    } else {
      renderCard();
      renderDirector();
    }
    if (!instant) item?.focus({ preventScroll: true });
  }

  function finish() {
    if (over) return;
    over = true;
    cleanup();
    onDone();
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
    ghost?.remove();
    ghost = null;
    layer.remove();
    window.removeEventListener("resize", onResize);
    if (window.__dwAct === api) delete window.__dwAct;
  }
  const onResize = () => { if (!over && !busy) renderDirector(); };
  window.addEventListener("resize", onResize);

  // Finish everything now through the commit path (test runs, and a level that unmounts mid-action).
  function completeAll() {
    let guard = 64;
    while (!over && guard-- > 0) {
      busy = false;
      const i = nextTarget();
      if (i < 0) { advance(true); continue; }
      if (kind().mode === "tap") tapSpot(i, null, { instant: true });
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
    refresh: () => { if (!over && !busy) renderDirector(); },
    get kind() { return action()?.kind; },
  };
  begin();
  window.__dwAct = api;
  if (window.__dwAutoAct === true) queueMicrotask(completeAll);
  return api;
}

export { wait };
