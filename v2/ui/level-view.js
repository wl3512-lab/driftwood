// The level screen: garden scene on top, conversation dock below.
// All game rules live in engine/level-runner.js; this file only turns
// clicks into runner actions and runner state into DOM.
import { h, announce, finePointer } from "./dom.js";
import { createRun, reduce, currentStep } from "../engine/level-runner.js";
import { matchTyped, pickRedirect } from "../engine/matcher.js";
import { renderBeds, levelSprites } from "../garden/garden.js";
import { setDrift } from "../garden/drift.js";

export function mountLevel(root, level, { onDone, onExit }) {
  let state = createRun(level);
  let said = level.greeting;
  let asked = null;
  let hint = null;
  let grown = null;
  let outcome = null;
  let typedLast = false;
  let redirects = 0;
  let focusKey = null; // phase|step|line last given focus; focus only moves when it changes

  // Warm the cache so a plant that appears mid-level (the damaged tomato) never flashes blank.
  const preloaded = levelSprites(level).map((src) => Object.assign(new Image(), { src }));

  // Persistent shell, so the drift filter can transition instead of snapping.
  const meterText = h("span", { class: "meter__text" });
  const meterFill = h("div", { class: "meter__fill" });
  const beds = h("div", { class: "beds" });
  const scene = h("section", { class: "scene", "aria-label": "Your garden" },
    h("div", { class: "fence", "aria-hidden": "true" }),
    h("div", { class: "scene__top" },
      h("button", { class: "btn btn--map", onclick: () => onExit?.() }, "← Map"),
      h("div", { class: "goal" },
        h("img", { class: "goal__sign", src: "./art/goal-sign.svg", alt: "", width: 40, height: 40 }),
        h("div", {},
          h("p", { class: "goal__level" }, `LEVEL ${level.number}`),
          h("h1", { class: "goal__title" }, level.goal.title),
          h("p", { class: "goal__ask" }, level.goal.ask))),
      h("div", { class: "meter", role: "status" },
        meterText, h("div", { class: "meter__bar", "aria-hidden": "true" }, meterFill))),
    h("div", { class: "scene__ground" },
      beds,
      h("ul", { class: "packets", "aria-label": "Seed packets" },
        level.evidence.map((e) =>
          h("li", { class: "packet", "data-evidence": e.id },
            h("img", { src: "./art/seed-packet.svg", alt: "", width: 32, height: 32 }),
            h("strong", {}, e.title),
            e.lines.map((line) => h("span", {}, line)))))),
    h("img", { class: "helper", src: level.helper.sprite, alt: "", width: 80, height: 112 }),
    h("img", { class: "can", src: "./art/watering-can.svg", alt: "", width: 64, height: 64 }),
    h("div", { class: "scanlines", "aria-hidden": "true" }));
  const dock = h("section", { class: "dock", "aria-label": `Talk to ${level.helper.name}` });
  const main = h("main", { class: "level" }, scene, dock);
  main.preloaded = preloaded; // keep the Image objects alive while the level is mounted
  root.replaceChildren(main);

  function dispatch(action) {
    const out = reduce(level, state, action);
    if (out.state === state && out.effects.length === 0) return;
    const prev = state;
    state = out.state;
    hint = null;
    const newStep = prev.stepIndex !== state.stepIndex;
    if (newStep) asked = null; // the "You:" echo belongs to the step that just ended
    if (newStep || prev.phase !== state.phase) typedLast = false;
    for (const fx of out.effects) {
      if (fx.type === "say") said = fx.text;
      if (fx.type === "hint") hint = fx.text;
      if (fx.type === "grow") grown = fx.effect;
      if (fx.type === "rule") asked = `New rule: “${fx.text}”`;
      if (fx.type === "outcome") outcome = fx.text;
    }
    render();
  }

  function render() {
    const keep = dock.contains(document.activeElement) ? document.activeElement.dataset.fid : null;
    main.dataset.phase = state.phase;
    meterText.textContent = `Garden ${state.garden}%`;
    meterFill.style.width = `${state.garden}%`;
    beds.replaceChildren(...renderBeds(level, state));
    setDrift(scene, state.drift);
    if (grown) { celebrate(grown); grown = null; }
    dock.replaceChildren(...dockFor(currentStep(level, state)));
    placeFocus(keep);
  }

  // Focus follows new content only. A hint or a repeated line keeps the
  // player's place (the hint is spoken through the live region instead).
  function placeFocus(keep) {
    const key = `${state.phase}|${state.stepIndex}|${said}`;
    const fresh = key !== focusKey;
    focusKey = key;
    const byFid = (fid) => dock.querySelector(`[data-fid="${fid}"]`);
    const bubbleEl = dock.querySelector(".bubble");
    let target = null;
    let speak = null;
    if (state.phase === "reveal") {
      if (fresh) { target = byFid("see"); speak = outcome; }
    } else if (fresh) {
      if (typedLast && finePointer()) { target = byFid("input"); speak = said; }
      else target = bubbleEl; // its text is read on focus, so no announce
    } else {
      target = keep ? byFid(keep) : null;
    }
    target?.focus({ preventScroll: !fresh });
    if (hint) speak = hint;
    if (speak) announce(speak);
  }

  function celebrate(effect) {
    if (effect.plant) {
      beds.querySelector(`[data-bed="${effect.bed}"] [data-plant="${effect.plant}"]`)?.classList.add("plant--new");
    }
    if (effect.water) {
      scene.classList.remove("is-watering");
      void scene.offsetWidth; // restart the animation
      scene.classList.add("is-watering");
      setTimeout(() => scene.classList.remove("is-watering"), 1200);
    }
  }

  function dockFor(step) {
    const parts = [];
    if (asked) parts.push(h("p", { class: "you" }, h("span", { class: "sr-only" }, "You: "), asked));

    const actions = [];
    if (state.phase === "advice") {
      actions.push(
        h("button", { class: "btn btn--do", "data-fid": "do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"),
        h("button", { class: "btn btn--off", "data-fid": "off", onclick: () => dispatch({ type: "flag" }) }, "? Something's off"));
    }
    if (state.phase === "reanswer") {
      actions.push(h("button", { class: "btn btn--do", "data-fid": "do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"));
    }
    const glitch = state.phase === "advice" && step.kind === "drift";
    const caught = state.phase === "name" || state.phase === "fix";
    parts.push(bubble(said, { glitch, caught, actions }));

    if (hint) parts.push(h("p", { class: "hint", role: "note" }, hint));
    if (state.phase === "ask") parts.push(...askControls(step));
    if (state.phase === "name") {
      parts.push(...picks("name", `What is ${level.helper.name} doing wrong?`, step.flawOptions,
        (id) => dispatch({ type: "name", id })));
    }
    if (state.phase === "fix") {
      parts.push(...picks("fix", `Give ${level.helper.name} a rule.`, step.fixOptions,
        (id) => dispatch({ type: "fix", id })));
    }
    if (state.phase === "reveal") {
      // The run is over: let the player look at the garden, then go on when ready.
      const final = state;
      parts.push(h("div", { class: "ending" },
        outcome && h("p", { class: "outcome" }, outcome),
        h("button", { class: "btn", "data-fid": "see", onclick: () => onDone(final) }, "See what happened →")));
    }
    return parts;
  }

  function bubble(text, { glitch, caught, actions }) {
    const cls = ["bubble", glitch && "bubble--glitch", caught && "bubble--caught"].filter(Boolean).join(" ");
    return h("div", { class: cls, tabindex: -1 },
      h("p", { class: "bubble__who" }, level.helper.name.toUpperCase()),
      h("p", { class: "bubble__text" }, text),
      caught && h("span", { class: "stamp", "aria-hidden": "true" }, "CAUGHT"),
      actions.length > 0 && h("div", { class: "bubble__actions" }, actions));
  }

  function askControls(step) {
    const chip = (text, fid, onclick) => h("button", { class: "chip", "data-fid": fid, onclick }, text);
    const chips = [
      chip(step.chip, "chip-0", () => { asked = step.chip; typedLast = false; dispatch({ type: "ask" }); }),
      ...(step.extraChips || []).map((c, i) =>
        chip(c.text, `chip-${i + 1}`, () => { asked = c.text; typedLast = false; dispatch({ type: "chat", reply: c.reply }); })),
    ];
    const input = h("input", {
      "aria-label": `Ask ${level.helper.name} something`, placeholder: "or type a question…",
      maxlength: 140, autocomplete: "off", "data-fid": "input",
    });
    const form = h("form", {
      class: "ask-form",
      onsubmit: (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        asked = text;
        typedLast = true;
        if (matchTyped(step, text) === "ask") dispatch({ type: "ask" });
        else dispatch({ type: "chat", reply: pickRedirect(level, redirects++) });
      },
    }, input, h("button", { class: "btn", type: "submit", "data-fid": "ask" }, "Ask"));
    return [h("div", { class: "chips", role: "group", "aria-label": "Suggested questions" }, chips), form];
  }

  function picks(kind, prompt, options, onPick) {
    const promptId = `prompt-${kind}`;
    return [
      h("p", { class: "prompt", id: promptId }, prompt),
      h("div", { class: "picks", role: "group", "aria-labelledby": promptId },
        options.map((o) => h("button", { class: "pick", "data-fid": `pick-${o.id}`, onclick: () => onPick(o.id) }, o.label))),
    ];
  }

  render();
}
