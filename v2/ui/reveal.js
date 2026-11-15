// The reveal: the garden you just played stays behind, dimmed, and a trading
// card for the flaw flips in over it. Front: the helper, the flaw in block
// letters, the stars you earned, one tip, and a stamp (BUSTED, or IT FOOLED
// YOU on a grey cracked card). Tap or Enter turns it over: where you meet the
// flaw in real life, and what happened this time. "Add to field guide →"
// flies the card into its slot in the leather guide, then goes on.
// Design: docs/design-options/2026-11-13-reveal-card (option B).
import { h } from "./dom.js";
import { fill } from "./text.js";
import { memoryVars } from "../mechanics/placement.js";
import { blockTitle } from "./block-type.js";
import { sfx, sting } from "../audio/index.js";

// ---------- pure helpers (unit-tested) ----------

// What the card says for this result.
export function revealCopy(level, state) {
  const fooled = Boolean(state.fooled);
  const r = level.reveal;
  return {
    outcome: fooled ? "fooled" : "caught",
    stamp: fooled ? "It fooled you" : "Busted",
    stampBlock: fooled ? "IT FOOLED\nYOU" : "BUSTED",
    tipLabel: fooled ? "Next time" : "Keep doing this",
    thisTime: fooled ? r.fooledLine : r.caughtLine,
    stars: Math.min(3, Math.max(0, Math.floor(Number(state.stars)) || 0)),
  };
}

// The flaw in block letters: one word per line ("FALSE\nMEMORY").
export const flawLines = (flaw) => String(flaw).trim().toUpperCase().split(/\s+/).join("\n");

// The guide's five slots, in map order: each earlier card as it was saved,
// the current level's slot empty (the card is about to fly in).
export function guideSlots(order, guide = [], currentId) {
  return order.map((id, i) => {
    const card = guide.find((c) => c.levelId === id);
    const status = id === currentId || !card ? "empty" : card.fooled ? "fooled" : "caught";
    return { n: i + 1, id, status, current: id === currentId };
  });
}

// Two fixed layouts drawn at design size, then scaled to fit the window.
export const LAYOUTS = {
  wide: { cw: 440, ch: 616, gap: 80, side: 260, sideTalk: 380 },
  // sideTalk: the helper's line is drawn bigger when the stage shrinks (it
  // must read at 16px on screen), so a talking side is wider.
  compact: { cw: 252, ch: 352, gap: 28, side: 236, sideTalk: 340 },
  // Phones held upright: the big card on top, the field guide and the button
  // in a row under it (side by side, the card would shrink to a stamp). A
  // helper's line gets its own full-width row above them.
  tall: { cw: 440, ch: 616, gap: 22, side: 440, sideTalk: 440, under: 170, underTalk: 300 },
};
export function stageSize(name, talk) {
  const L = LAYOUTS[name];
  if (L.under) return { w: L.cw, h: L.ch + L.gap + (talk ? L.underTalk : L.under) };
  return { w: L.cw + L.gap + (talk ? L.sideTalk : L.side), h: L.ch };
}
// The wide card unless it would have to shrink below 80%; the compact one
// may grow a little on mid-size screens. pad is the margin kept on each side.
export function pickLayout(vw, vh, talk, pad = 16) {
  const fit = (name) => {
    const s = stageSize(name, talk);
    return Math.min((vw - 2 * pad) / s.w, (vh - 2 * pad) / s.h);
  };
  if (vw <= 640 && vh > 500 && vh >= vw * 1.3) return { name: "tall", scale: Math.min(1, fit("tall")) };
  const wide = fit("wide");
  if (wide >= 0.8) return { name: "wide", scale: Math.min(1, wide) };
  return { name: "compact", scale: Math.max(0.5, Math.min(1.35, fit("compact"))) };
}

// ---------- the screen ----------

const PALETTE = {
  caught: { name: "#3b2a1a", shadow: "#ffb347", stamp: "#c7301f", on: "#ffb347", edge: "#222", off: "#eadbb4", offEdge: "#cdbb8f" },
  fooled: { name: "#5e554c", shadow: "#bfb5a0", stamp: "#4c4a6b", on: "#c9a36a", edge: "#222", off: "#d6cebd", offEdge: "#bfb5a0" },
};
const GUIDE_INK = { fill: "#3b2a1a", shadow: "#e0a040" };
const NS = "http://www.w3.org/2000/svg";

function svg(tag, attrs = {}, ...kids) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  node.append(...kids);
  return node;
}

// A 9×9 pixel star with a stepped edge.
const STAR = ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..#####..", ".###.###.", ".##...##."];
function star(fillColor, edge) {
  const rects = (off) => STAR.flatMap((row, y) => [...row].map((c, x) => (c === "#"
    ? svg("rect", { x: x + off, y: y + off, width: 1.02, height: 1.02 }) : null)).filter(Boolean));
  return svg("svg", { viewBox: "0 0 9.6 9.6", "aria-hidden": "true", "shape-rendering": "crispEdges" },
    svg("g", { fill: edge }, ...rects(0.45)), svg("g", { fill: fillColor }, ...rects(0)));
}
// Two pixel arrows chasing each other.
function flipIcon() {
  const r = [[1, 1, 4, 1], [1, 2, 1, 2], [5, 0, 1, 3], [6, 1, 1, 1], [3, 6, 4, 1], [6, 4, 1, 2], [2, 5, 1, 3], [1, 6, 1, 1]];
  return svg("svg", { viewBox: "0 0 8 8", "aria-hidden": "true", "shape-rendering": "crispEdges", fill: "currentColor" },
    ...r.map(([x, y, width, height]) => svg("rect", { x, y, width, height })));
}
// Jagged cracks from a point under the stamp (0..100 × 0..140).
const CRACKS = ["M66 30 L56 26 L48 31 L36 24 L28 28 L16 20", "M66 30 L76 24 L82 14 L92 10 L100 4",
  "M84 44 L88 56 L86 66 L94 78 L92 92 L100 104", "M66 30 L70 38 L64 44", "M88 56 L100 54"];

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function renderReveal(root, level, state, { onContinue, name = "friend", guide = [], order = null }) {
  const vars = { name, ...memoryVars(level, state.memory) };
  const t = (text) => fill(text, vars);
  const r = level.reveal;
  const copy = revealCopy(level, state);
  const pal = PALETTE[copy.outcome];
  const ids = order || Array.from({ length: 5 }, (_, i) => (i + 1 === level.number ? level.id : `level-${i + 1}`));
  const total = ids.length;
  const rm = reducedMotion();
  const pet = level.helper;
  const caught = copy.outcome === "caught";

  // The level stays in place behind the card, put away: inert, hidden from
  // screen readers, its dock faded out, the garden dimmed.
  const behind = root.querySelector("main.level");
  if (behind) {
    behind.inert = true;
    behind.setAttribute("aria-hidden", "true");
    behind.classList.add("level--behind", `level--behind-${copy.outcome}`);
  }

  // ---- front ----
  const top = () => h("div", { class: "rc__top" },
    h("span", { class: "rc__num" }, `${level.number} / ${total}`),
    h("span", { class: "rc__flip", "aria-hidden": "true" }, flipIcon(), "Flip"));
  const flawId = `reveal-flaw-${level.id}`;
  const stars = h("div", { class: "reveal__stars rc__stars", role: "img", "aria-label": `${copy.stars} of 3 stars` },
    [0, 1, 2].map((i) => h("span", { class: `rc__star ${i < copy.stars ? "is-on" : "is-off"}` },
      i < copy.stars ? star(pal.on, pal.edge) : star(pal.off, pal.offEdge))));
  const stamp = h("p", { class: "rc__stamp" },
    blockTitle(copy.stampBlock, { fill: pal.stamp, align: "center" }),
    h("span", { class: "sr-only" }, copy.stamp));
  const gloss = r.flawGloss ? t(r.flawGloss) : "";
  const front = h("section", { class: "rc__face rc__front", "aria-label": "Card front" },
    top(),
    h("div", { class: "rc__art" }, h("img", { src: pet.sprite, alt: pet.name })),
    h("h2", { class: "rc__name", id: flawId },
      blockTitle(flawLines(t(r.flaw)), { fill: pal.name, shadow: pal.shadow, build: true, base: rm ? 0 : 0.6 }),
      h("span", { class: "sr-only" }, t(r.flaw))),
    gloss ? h("p", { class: "rc__gloss" }, `${gloss.charAt(0).toUpperCase()}${gloss.slice(1)}.`) : null,
    stars,
    h("div", { class: "rc__tip" },
      h("span", { class: "rc__label" }, copy.tipLabel),
      h("p", { class: "rc__tiptext" }, t(r.tip))),
    caught
      ? [h("div", { class: "rc__foil", "aria-hidden": "true" }), h("div", { class: "rc__sparkles", "aria-hidden": "true" })]
      : svg("svg", { class: "rc__cracks", viewBox: "0 0 100 140", preserveAspectRatio: "none", "aria-hidden": "true" },
        ...CRACKS.map((d) => svg("path", { d, pathLength: 1 }))),
    stamp);

  // ---- back ----
  const back = h("section", { class: "rc__face rc__back", "aria-label": "Card back" },
    top(),
    r.realWorld ? h("div", { class: "rc__block" },
      h("span", { class: "rc__label" }, "In real life"),
      h("p", { class: "rc__big" }, t(r.realWorld))) : null,
    r.realWorld ? h("div", { class: "rc__rule" }) : null,
    h("div", { class: "rc__block" },
      h("span", { class: "rc__label" }, "This time"),
      h("p", { class: "rc__small" }, t(copy.thisTime))),
    h("img", { class: "rc__backpet", src: pet.sprite, alt: "" }));
  back.inert = true;
  back.setAttribute("aria-hidden", "true");

  const inner = h("div", { class: "rc__inner" }, front, back);
  const tilt = h("div", { class: "rc__tilt" }, inner);
  const shake = h("div", { class: "rc__shake" }, tilt);
  const drop = h("div", { class: "rc__drop" }, shake);
  const fly = h("div", { class: "rc__fly" }, drop);
  const hit = h("button", { class: "rc__hit", type: "button", "aria-pressed": "false", "aria-label": `Flip the ${t(r.flaw)} card`, "aria-describedby": flawId });
  const card = h("div", { class: "rc" }, fly, hit);

  // ---- side: the hand-off, the field guide, the button ----
  const slots = guideSlots(ids, guide, level.id);
  const slotEls = slots.map((s) => h("li", { class: `fg__slot fg__slot--${s.status}${s.current ? " fg__slot--target" : ""}` },
    h("span", { class: "fg__no", "aria-hidden": "true" }, String(s.n)),
    h("span", { class: "sr-only" }, s.status === "empty" ? `Card ${s.n} empty` : `Card ${s.n} collected`)));
  const had = slots.filter((s) => s.status !== "empty").length;
  const book = h("div", { class: "fg", role: "img", "aria-label": `Field guide, ${had} of ${total} cards` },
    h("div", { class: "fg__spine" }),
    h("div", { class: "fg__cover" },
      h("div", { class: "fg__title" }, blockTitle("FIELD\nGUIDE", GUIDE_INK)),
      h("ol", { class: "fg__slots" }, slotEls)));
  const talk = r.handoff ? h("div", { class: "reveal__handoff" },
    h("img", { class: "reveal__handoff-pet", src: pet.sprite, alt: "" }),
    h("p", { class: "reveal__handoff-line" },
      h("span", { class: "reveal__handoff-name" }, pet.name), t(r.handoff))) : null;
  const go = h("button", { class: "btn btn--do reveal__go", type: "button" }, "Add to field guide →");
  const side = h("div", { class: "reveal__side" }, talk, book, go);

  const stage = h("div", { class: "reveal__stage" }, card, side);
  const overlay = h("div", {
    class: `reveal reveal--${copy.outcome}${rm ? " reveal--still" : ""}`,
    role: "dialog", "aria-modal": "true", "aria-labelledby": flawId, "data-outcome": copy.outcome,
  }, h("div", { class: "reveal__dim", "aria-hidden": "true" }), stage);
  if (behind) root.append(overlay);
  else root.replaceChildren(h("main", { class: "level level--behind reveal-host" }), overlay);

  // ---- fit: pick a layout and scale it to the window ----
  let scale = 1;
  function layout() {
    if (!overlay.isConnected) return window.removeEventListener("resize", layout);
    const pick = pickLayout(window.innerWidth, window.innerHeight, Boolean(talk));
    const size = stageSize(pick.name, Boolean(talk));
    scale = pick.scale;
    overlay.dataset.layout = pick.name;
    stage.style.width = `${size.w}px`;
    stage.style.height = `${size.h}px`;
    stage.style.setProperty("--k", String(scale));
    const L = LAYOUTS[pick.name];
    stage.style.setProperty("--side", `${talk ? L.sideTalk : L.side}px`);
    if (L.under) stage.style.setProperty("--under", `${talk ? L.underTalk : L.under}px`);
  }
  layout();
  window.addEventListener("resize", layout);

  // ---- flip ----
  let flipped = false;
  let added = false;
  function flip() {
    if (added) return;
    finishIntro();
    sfx("card-flip");
    flipped = !flipped;
    inner.classList.toggle("is-flipped", flipped);
    hit.setAttribute("aria-pressed", String(flipped));
    front.inert = flipped;
    back.inert = !flipped;
    front.setAttribute("aria-hidden", String(flipped));
    back.setAttribute("aria-hidden", String(!flipped));
  }
  hit.addEventListener("click", flip);
  if (!rm) {
    const foil = front.querySelector(".rc__foil");
    hit.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || added) return;
      const b = hit.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - 0.5;
      const y = (e.clientY - b.top) / b.height - 0.5;
      tilt.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
      if (foil) foil.style.backgroundPosition = `${50 + x * 120}% 0`;
    });
    hit.addEventListener("pointerleave", () => { tilt.style.transform = ""; });
  }

  // Keep Tab inside the card screen (the level behind is inert as well).
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const stops = [hit, go].filter((b) => !b.disabled);
    const i = stops.indexOf(document.activeElement);
    const next = stops[(i + (e.shiftKey ? -1 : 1) + stops.length) % stops.length];
    if (next) { e.preventDefault(); next.focus(); }
  });

  // ---- intro (about 2.4 s; any press finishes it at once) ----
  const anims = [];
  const A = (target, keyframes, opts) => {
    if (!target?.animate) return null;
    const a = target.animate(keyframes, { fill: "both", easing: "cubic-bezier(.2,.8,.3,1)", ...opts });
    anims.push(a);
    return a;
  };
  const starEls = [...stars.children];
  const cracks = [...front.querySelectorAll(".rc__cracks path")];
  const foil = front.querySelector(".rc__foil");
  const sparkles = front.querySelector(".rc__sparkles");
  const fade = (target, delay, duration = 220) => A(target, [{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: "linear" });
  // Sound: the caught / fooled sting as the card drops, a slam per star, the
  // stamp. A press that finishes the intro cuts the slams still to come.
  const heard = [];
  const hear = (name, ms, opts) => heard.push(sfx(name, { ...opts, delay: ms / 1000 }));
  sting(caught ? "caught" : "fooled", { delay: rm ? 0 : 0.15 });
  {
    let k = 0;
    starEls.forEach((s, i) => {
      if (!s.classList.contains("is-on")) return;
      hear("star", rm ? 250 + k * 90 : 1000 + i * 250 + 175, { i: k });
      k += 1;
    });
    hear("stamp", rm ? 400 : (caught ? 1800 : 2050) + 210);
  }
  if (rm) {
    fade(drop, 0, 250);
    starEls.forEach((s) => fade(s, 250));
    cracks.forEach((c) => fade(c, 400));
    fade(stamp, 400);
    [talk, book, go].forEach((x) => fade(x, 300, 250));
  } else {
    A(drop, [
      { transform: "translateY(-55%) rotateY(-95deg) rotateZ(-10deg)", opacity: 0 },
      { transform: "translateY(3%) rotateY(10deg) rotateZ(1deg)", opacity: 1, offset: 0.7 },
      { transform: "none", opacity: 1 }], { duration: 650, delay: 150 });
    [book, go].forEach((x, i) => A(x, [{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: 500 + i * 80 }));
    starEls.forEach((s, i) => {
      const at = 1000 + i * 250;
      if (s.classList.contains("is-on")) {
        A(s, [{ opacity: 0, transform: "scale(2.8) rotate(-25deg)" }, { opacity: 1, transform: "scale(.85)", offset: 0.75 }, { opacity: 1, transform: "none" }],
          { duration: 230, delay: at, easing: "cubic-bezier(.5,0,.9,.5)" });
        A(shake, [{ transform: "none" }, { transform: "translateY(5px)" }, { transform: "none" }], { duration: 140, delay: at + 175, fill: "none" });
      } else {
        fade(s, 900, 200);
      }
    });
    const stampAt = caught ? 1800 : 2050;
    cracks.forEach((c, i) => A(c, [{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0 }],
      { duration: 260, delay: 1800 + i * 50, easing: "steps(6)" }));
    A(stamp, [
      { opacity: 0, transform: "translate(-50%,-50%) rotate(-24deg) scale(2.6)" },
      { opacity: 1, transform: "translate(-50%,-50%) rotate(-12deg) scale(.94)", offset: 0.8 },
      { opacity: 1, transform: "translate(-50%,-50%) rotate(-12deg) scale(1)" }], { duration: 260, delay: stampAt, easing: "cubic-bezier(.6,0,.9,.4)" });
    A(shake, [{ transform: "none" }, { transform: "translate(-7px,4px) rotate(-1deg)" }, { transform: "translate(6px,-3px) rotate(.8deg)" }, { transform: "translate(-3px,2px)" }, { transform: "none" }],
      { duration: 260, delay: stampAt + 210, fill: "none" });
    if (foil) {
      A(foil, [{ opacity: 0, backgroundPosition: "100% 0" }, { opacity: 1, backgroundPosition: "50% 0", offset: 0.5 }, { opacity: 0.35, backgroundPosition: "0 0" }],
        { duration: 900, delay: stampAt + 300, easing: "ease-in-out" });
      A(sparkles, [{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0 }], { duration: 900, delay: stampAt + 300 });
    }
    if (talk) A(talk, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: stampAt + 350, easing: "cubic-bezier(.3,1.5,.5,1)" });
  }
  if (rm && foil) foil.style.opacity = "0.35";
  // Finish every intro animation, the block letters' CSS build-in included.
  function finishIntro() {
    heard.splice(0).forEach((x) => x.stop());
    const css = overlay.getAnimations?.({ subtree: true }) || [];
    for (const a of [...anims, ...css]) {
      if (a.__fly) continue;
      try { a.finish(); } catch (_) { /* an infinite animation: leave it */ }
    }
  }

  // ---- add to the field guide, then go on ----
  let left = false;
  const leave = () => { if (left) return; left = true; window.removeEventListener("resize", layout); onContinue(); };
  go.addEventListener("click", () => {
    if (added) return leave(); // a second press skips the rest of the flight
    added = true;
    finishIntro();
    sfx("card-fly");
    hit.disabled = true;
    tilt.style.transform = "";
    const slot = slotEls[slots.findIndex((s) => s.current)];
    const land = () => {
      if (slot) {
        slot.className = `fg__slot fg__slot--${copy.outcome}`;
        slot.lastChild.textContent = `Card ${level.number} collected`;
      }
      book.setAttribute("aria-label", `Field guide, ${had + 1} of ${total} cards`);
    };
    let flight;
    if (rm || !slot) {
      flight = fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
    } else {
      const c = fly.getBoundingClientRect(), s = slot.getBoundingClientRect();
      const dx = (s.left + s.width / 2 - (c.left + c.width / 2)) / scale;
      const dy = (s.top + s.height / 2 - (c.top + c.height / 2)) / scale;
      const k = s.width / c.width;
      flight = fly.animate([
        { transform: "none", opacity: 1 },
        { transform: `translate(${dx * 0.15}px, -40px) scale(1.06) rotate(-6deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(10deg)`, opacity: 1, offset: 0.92 },
        { transform: `translate(${dx}px, ${dy}px) scale(${k * 0.9})`, opacity: 0 }],
      { duration: 750, easing: "cubic-bezier(.5,0,.4,1)", fill: "forwards" });
    }
    flight.__fly = true;
    flight.finished.then(() => {
      land();
      sfx("card-land");
      if (!rm && slot) {
        const bump = book.animate([{ transform: "none" }, { transform: "scale(1.08) rotate(-2deg)" }, { transform: "scale(.97)" }, { transform: "none" }], { duration: 320 });
        bump.__fly = true;
        slot.animate([{ boxShadow: "0 0 0 0 rgba(255,236,120,.9)" }, { boxShadow: "0 0 0 10px rgba(255,236,120,0)" }], { duration: 500 }).__fly = true;
      }
      setTimeout(leave, rm ? 250 : 450);
    }, leave);
  });

  hit.focus({ preventScroll: true });
}
