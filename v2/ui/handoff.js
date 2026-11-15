// Rowan's seed handoff (option B, "Pouch toss and sparkle", in
// docs/design-options/2026-11-14-wizard/options.html): at the start of a
// level's first play he says one short line about the level's seeds, and on
// a tap tosses his pouch at the almanac button; it bursts and the seeds
// sparkle down into the button. About 3 s after the tap; a tap mid-flight or
// Skip goes straight to the level. Reduced motion: no flight, just a fade.
// Level 5 is at night and he has gone to bed: a note and the pouch, left out.
//
// Mounted by main.js over the level screen right after it renders. While it
// is up it is modal: the level is inert, and the level's keys never see a
// key press. When it goes, focus returns to the level.
import { h, announce } from "./dom.js";
import { pixelSvg, POUCH } from "./story-art.js";
import { PLANTS } from "../levels/plants.js";
import { WIZARD } from "../levels/wizard.js";

const plant = (id) => PLANTS.find((p) => p.id === id);
const plantName = (id) => plant(id)?.name || id;
const plantColor = (id) => plant(id)?.color || "#f0b429";
const pouchEl = (cls) => { const d = h("div", { class: cls, "aria-hidden": "true" }); d.innerHTML = pixelSvg(POUCH.rows, POUCH.pal); return d; };

// Total time of the toss after the tap, in ms (the overlay is gone after it).
export const TOSS_MS = 3000;

// mountHandoff(root, { levelId, line, seeds, note, onSeen, onDone }) → unmount()
export function mountHandoff(root, { levelId, line, seeds = [], note = false, onSeen = () => {}, onDone = () => {} }) {
  const calm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const level = root.querySelector("main.level");
  const target = () => root.querySelector('button.tool[data-tool="almanac"]');
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  // ---- what it shows ----
  const packets = h("ul", { class: "ho__pks", "aria-hidden": "true" }, seeds.map((id) =>
    h("li", { class: "ho__pk", style: `--c:${plantColor(id)}`, "data-seed": id },
      h("img", { src: `./art/${id}-thriving.svg`, alt: "", width: 32, height: 32 }),
      h("span", { class: "ho__pk-n" }, plantName(id)))));
  const nextBtn = h("button", { type: "button", class: "btn btn--gold ho__next", onclick: () => toss() }, note ? "Take the seeds ▸" : "Next ▸");
  const skipBtn = h("button", { type: "button", class: "btn ho__skip", onclick: () => finish() }, "Skip ▸▸");
  const seedList = `Seeds: ${seeds.map(plantName).join(", ")}.`;
  const words = h("div", { class: "ho__words" },
    h("p", { class: "ho__line", id: "ho-line" }, line),
    h("p", { class: "sr-only" }, seedList),
    packets,
    h("div", { class: "ho__btns" }, nextBtn, skipBtn));
  // He speaks from a bubble right over his head; the note has no speaker.
  const speaker = note
    ? h("div", { class: "ho__note" },
        h("span", { class: "ho__who" }, "A NOTE BY THE DOOR"),
        words,
        h("p", { class: "ho__sig", "aria-hidden": "true" }, `— ${WIZARD.name}`),
        pouchEl("ho__rest"))
    : h("div", { class: "ho__rowan" },
        h("div", { class: "ho__bub" }, h("span", { class: "ho__who", "aria-hidden": "true" }, WIZARD.name.toUpperCase()), words, h("i", { class: "ho__tail", "aria-hidden": "true" })),
        h("img", { class: "ho__wiz", src: WIZARD.sprite, alt: "", width: 192, height: 288 }),
        pouchEl("ho__hand"));
  const fx = h("div", { class: "ho__fx", "aria-hidden": "true" });
  const add = h("p", { class: "ho__add", "aria-hidden": "true" }, `+${seeds.length} seed${seeds.length === 1 ? "" : "s"}`);
  const box = h("div", {
    class: `ho${note ? " ho--note" : ""}`, role: "dialog", "aria-modal": "true", "aria-labelledby": "ho-line",
    "data-level": levelId, "data-phase": "line",
  }, h("div", { class: "ho__dim" }), speaker, fx, add);

  // ---- modal: the level underneath is inert, its keys see nothing ----
  const before = document.activeElement;
  if (level) level.inert = true;
  root.append(box);
  nextBtn.focus({ preventScroll: true });
  announce(`${note ? "A note from Rowan" : "Rowan"}: ${line} ${seedList}`);

  const onKey = (ev) => {
    if (!box.isConnected) return;
    if (ev.key === "Tab") { // keep focus on the two buttons
      const els = box.dataset.phase === "line" ? [nextBtn, skipBtn] : [];
      ev.preventDefault();
      if (els.length) els[(els.indexOf(document.activeElement) + (ev.shiftKey ? -1 : 1) + els.length) % els.length].focus();
      return;
    }
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (ev.repeat) return;
    if (ev.key === "Escape") finish();
    else if (ev.key === "Enter" || ev.key === " " || ev.key === "ArrowRight") {
      if (ev.key !== "ArrowRight" && document.activeElement === skipBtn) finish();
      else toss();
    }
  };
  window.addEventListener("keydown", onKey, true);
  // A tap anywhere but the buttons goes on: the line, then the toss, then the level.
  box.addEventListener("click", (ev) => { if (!ev.target.closest("button")) toss(); });

  let seen = false;
  const markSeen = () => { if (!seen) { seen = true; onSeen(); } };
  const anims = [];
  const play = (el, frames, opts) => { if (!el?.animate) return null; const a = el.animate(frames, { fill: "both", ...opts }); anims.push(a); return a; };
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  // ---- the toss ----
  function toss() {
    if (box.dataset.phase !== "line") { if (box.dataset.phase === "toss") finish(); return; }
    markSeen();
    box.dataset.phase = "toss";
    box.setAttribute("aria-busy", "true");
    skipBtn.blur();
    nextBtn.blur();
    box.tabIndex = -1;
    box.focus({ preventScroll: true });
    const btn = target();
    if (calm() || !btn || !box.animate) {
      // No flight: the words fade, the tag shows by the button, the overlay fades.
      placeTag(btn);
      box.classList.add("ho--fade");
      later(finish, 900);
      return;
    }
    const b = btn.getBoundingClientRect();
    const goal = center(b);
    const pouch = speaker.querySelector(".ho__hand, .ho__rest");
    const p0 = center(pouch.getBoundingClientRect());
    // 1 · the words go; the packets fold into the pouch (0–0.4 s).
    play(speaker.querySelector(".ho__bub") || words, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 150, easing: "steps(2)" });
    packets.querySelectorAll(".ho__pk").forEach((pk, i) => {
      const c = center(pk.getBoundingClientRect());
      play(pk, [{ transform: "none", opacity: 1 }, { transform: `translate(${p0.x - c.x}px, ${p0.y - c.y}px) scale(0.2)`, opacity: 0 }],
        { duration: 380, delay: i * 40, easing: "steps(5, end)" });
    });
    box.classList.add("ho--tossing");
    // 2 · the pouch arcs up to just under the button (0.4–1.3 s).
    const stop = { x: goal.x - Math.min(70, innerWidth * 0.08), y: goal.y + Math.min(80, innerHeight * 0.16) };
    const dx = stop.x - p0.x, dy = stop.y - p0.y;
    const lift = Math.min(120, innerHeight * 0.25);
    play(pouch, [
      { transform: "none" },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) rotate(200deg)`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) rotate(360deg) scale(1.1)` },
    ], { duration: 900, delay: 400, easing: "steps(12, end)" });
    // 3 · it bursts (1.3 s): the seeds scatter, then sparkle down into the button.
    later(() => {
      play(pouch, [{ opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(1.1)` }, { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(1.6)` }],
        { duration: 120, easing: "steps(2)", composite: "replace" });
      burst(stop, goal);
      play(box.querySelector(".ho__dim"), [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: "steps(4)" });
      play(speaker, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "steps(3)" });
    }, 1300);
    // 4 · the book takes them (2.3 s): a bump, the tag.
    later(() => {
      play(btn, [{ transform: "none" }, { transform: "scale(1.18)" }, { transform: "none" }], { duration: 320, easing: "steps(4)", fill: "none" });
      placeTag(btn);
      play(add, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "steps(2)" });
    }, 2300);
    later(finish, TOSS_MS);
  }
  function placeTag(btn) {
    if (!btn) return;
    const b = btn.getBoundingClientRect();
    add.style.top = `${Math.round(b.bottom + 6)}px`;
    add.style.right = `${Math.max(8, Math.round(innerWidth - b.right))}px`;
    add.classList.add("is-on");
  }
  function burst(from, to) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 28 + (i % 3) * 14;
      const sx = Math.cos(a) * r, sy = Math.sin(a) * r * 0.8;
      const seed = h("i", { class: "ho__seed", style: `left:${from.x}px;top:${from.y}px;--c:${plantColor(seeds[i % seeds.length])}` });
      fx.append(seed);
      play(seed, [
        { transform: "none", opacity: 1 },
        { transform: `translate(${sx}px, ${sy}px)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(0.5)`, opacity: 0.2 },
      ], { duration: 1000, delay: i * 12, easing: "steps(10, end)" });
    }
    [[-18, -14], [16, -18], [20, 12], [-14, 16]].forEach(([x, y], i) => {
      const k = h("i", { class: "ho__spark", style: `left:${to.x + x}px;top:${to.y + y}px` });
      fx.append(k);
      play(k, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: 0.4 }, { transform: "scale(0.4)", opacity: 0 }],
        { duration: 600, delay: 850 + i * 60, easing: "steps(4)" });
    });
  }

  // ---- gone: the level is live again and has focus ----
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    anims.forEach((a) => a.cancel());
    window.removeEventListener("keydown", onKey, true);
    box.remove();
    if (level) level.inert = false;
  }
  function finish() {
    if (closed) return;
    markSeen();
    close();
    const back = before?.isConnected && level?.contains(before) ? before
      : level?.querySelector(".dock [tabindex], .dock button:not([disabled]), .bubble, button:not([disabled])");
    back?.focus({ preventScroll: true });
    onDone();
  }
  return close;
}
