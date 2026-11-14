// Splash (CRT title) and the intro: the one framing line plus name entry,
// merged on one screen so there's one less tap before play.
import { h, focusFirst, finePointer } from "./dom.js";
import { blockText } from "./block-type.js";
import { mountWorld, BED_X } from "./world.js";
import { MAP } from "../levels/index.js";

// Sunset over the garden (world.js time 3), the five pets waiting on the path.
const SCENE_TIME = 3;
function pets() {
  return h("div", { class: "world__pets", "aria-hidden": "true" },
    MAP.map((m, i) => h("img", { class: "world__pet", src: m.sprite, alt: "", style: `--x:${BED_X[i] * 100}%` })));
}
// Mounts the sky once the screen is in the document; the returned function stops it.
function sky(main, time) {
  const world = mountWorld(main, { time, beam: false });
  return () => world.destroy();
}

let splashShown = false; // the title builds in, cell by cell, the first time only

export function renderSplash(root, { onBegin }) {
  const main = h("main", { class: "world splash" },
    h("div", { class: "splash__sign" },
      h("h1", { class: "crt__title crt__title--block" }, blockText("DRIFTWOOD", {
        fill: "#3b2a1a", shadow: "#ffb347", align: "left",
        build: !splashShown && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      })),
      h("p", { class: "crt__line" }, "A short game about the AI helpers we trust."),
      h("button", { class: "btn btn--crt btn--gold", "data-autofocus": true, onclick: onBegin }, "Begin ▸")),
    pets());
  root.replaceChildren(main);
  splashShown = true;
  const stop = sky(main, SCENE_TIME);
  focusFirst(root);
  return stop;
}

export function renderIntro(root, { onSubmit }) {
  const input = h("input", {
    id: "player-name", name: "name", autocomplete: "nickname", maxlength: 24,
    placeholder: "your name",
  });
  const submit = h("button", { class: "btn btn--crt btn--gold", type: "submit" }, "Enter the garden");
  const form = h("form", {
    class: "intro__form",
    onsubmit: (e) => { e.preventDefault(); onSubmit(input.value.trim()); },
  },
    h("label", { for: "player-name" }, "What should they call you?"),
    h("span", { class: "intro__row" }, input, submit));

  const main = h("main", { class: "world intro" },
    h("div", { class: "intro__card" },
      h("h1", { class: "crt__line crt__line--big" }, "These animals are AI assistants, like ChatGPT with fur."),
      h("p", { class: "crt__line" }, "Ask them for help building your garden."),
      form),
    pets());
  root.replaceChildren(main);
  const stop = sky(main, SCENE_TIME);
  // Touch: focus the button, not the field, so the keyboard doesn't jump up unasked.
  (finePointer() ? input : submit).focus({ preventScroll: true });
  return stop;
}
