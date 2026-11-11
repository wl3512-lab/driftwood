// The level screen: garden scene on top, conversation dock below.
// All game rules live in engine/level-runner.js; this file only turns
// clicks into runner actions and runner state into DOM.
import { h, focusFirst, announce } from "./dom.js";
import { createRun, reduce, currentStep } from "../engine/level-runner.js";
import { matchTyped, pickRedirect } from "../engine/matcher.js";
import { renderBeds } from "../garden/garden.js";
import { setDrift } from "../garden/drift.js";

// Long enough to see the garden change before the reveal cuts in.
const REVEAL_DELAY_MS = { fooled: 2200, caught: 1400 };

export function mountLevel(root, level, { onDone }) {
  let state = createRun(level);
  let said = level.greeting;
  let asked = null;
  let hint = null;
  let grown = null;
  let typedLast = false;
  let redirects = 0;

  // Persistent shell, so the drift filter can transition instead of snapping.
  const meterText = h("span", { class: "meter__text" });
  const meterFill = h("div", { class: "meter__fill" });
  const beds = h("div", { class: "beds" });
  const scene = h("section", { class: "scene", "aria-label": "Your garden" },
    h("div", { class: "fence", "aria-hidden": "true" }),
    h("div", { class: "scene__top" },
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
  root.replaceChildren(main);

  function dispatch(action) {
    const out = reduce(level, state, action);
    if (out.state === state && out.effects.length === 0) return;
    state = out.state;
    hint = null;
    for (const fx of out.effects) {
      if (fx.type === "say") said = fx.text;
      if (fx.type === "hint") hint = fx.text;
      if (fx.type === "grow") grown = fx.effect;
      if (fx.type === "rule") asked = `New rule: “${fx.text}”`;
    }
    render();
    announce(hint || said);
    if (state.phase === "reveal") {
      const final = state;
      setTimeout(() => onDone(final), final.fooled ? REVEAL_DELAY_MS.fooled : REVEAL_DELAY_MS.caught);
    }
  }

  function render() {
    main.dataset.phase = state.phase;
    meterText.textContent = `Garden ${state.garden}%`;
    meterFill.style.width = `${state.garden}%`;
    beds.replaceChildren(...renderBeds(level, state));
    setDrift(scene, state.drift);
    if (grown) { celebrate(grown); grown = null; }
    dock.replaceChildren(...dockFor(currentStep(level, state)));
    focusFirst(dock);
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
        h("button", { class: "btn btn--do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"),
        h("button", { class: "btn btn--off", onclick: () => dispatch({ type: "flag" }) }, "? Something's off"));
    }
    if (state.phase === "reanswer") {
      actions.push(h("button", { class: "btn btn--do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"));
    }
    const glitch = state.phase === "advice" && step.kind === "drift";
    const caught = state.phase === "name" || state.phase === "fix";
    parts.push(bubble(said, { glitch, caught, actions, focus: !(typedLast && state.phase === "ask") }));

    if (hint) parts.push(h("p", { class: "hint", role: "note" }, hint));
    if (state.phase === "ask") parts.push(...askControls(step));
    if (state.phase === "name") {
      parts.push(h("p", { class: "prompt" }, `What is ${level.helper.name} doing wrong?`),
        picks(step.flawOptions, (id) => dispatch({ type: "name", id })));
    }
    if (state.phase === "fix") {
      parts.push(h("p", { class: "prompt" }, `Give ${level.helper.name} a rule.`),
        picks(step.fixOptions, (id) => dispatch({ type: "fix", id })));
    }
    return parts;
  }

  function bubble(text, { glitch, caught, actions, focus }) {
    const cls = ["bubble", glitch && "bubble--glitch", caught && "bubble--caught"].filter(Boolean).join(" ");
    return h("div", { class: cls, tabindex: -1, "data-autofocus": focus || null },
      h("p", { class: "bubble__who" }, level.helper.name.toUpperCase()),
      h("p", { class: "bubble__text" }, text),
      caught && h("span", { class: "stamp", "aria-hidden": "true" }, "CAUGHT"),
      actions.length > 0 && h("div", { class: "bubble__actions" }, actions));
  }

  function askControls(step) {
    const chip = (text, onclick) => h("button", { class: "chip", onclick }, text);
    const chips = [
      chip(step.chip, () => { asked = step.chip; typedLast = false; dispatch({ type: "ask" }); }),
      ...(step.extraChips || []).map((c) =>
        chip(c.text, () => { asked = c.text; typedLast = false; dispatch({ type: "chat", reply: c.reply }); })),
    ];
    const input = h("input", {
      "aria-label": `Ask ${level.helper.name} something`, placeholder: "or type a question…",
      maxlength: 140, autocomplete: "off", "data-autofocus": typedLast || null,
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
    }, input, h("button", { class: "btn", type: "submit" }, "Ask"));
    return [h("div", { class: "chips", role: "group", "aria-label": "Suggested questions" }, chips), form];
  }

  function picks(options, onPick) {
    return h("div", { class: "picks", role: "group" },
      options.map((o) => h("button", { class: "pick", onclick: () => onPick(o.id) }, o.label)));
  }

  render();
}
