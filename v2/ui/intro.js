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

// saved: { name, done, total } for a returning player, who gets Continue and
// New game (with a second "are you sure" tap); null for a first visit (Begin).
export function renderSplash(root, { onBegin, onNew = () => {}, saved = null }) {
  const choices = h("div", { class: "splash__btns" });
  const showChoices = () => {
    choices.replaceChildren(
      h("div", { class: "splash__row" },
        h("button", { class: "btn btn--crt btn--gold", "data-autofocus": true, onclick: onBegin }, "Continue ▸"),
        h("button", { class: "btn btn--crt splash__new", onclick: confirmNew }, "New game")),
      h("p", { class: "splash__save" }, `${saved.name}'s garden · ${saved.done} of ${saved.total} levels`));
  };
  const confirmNew = () => {
    choices.replaceChildren(
      h("p", { class: "splash__save splash__warn", id: "splash-warn" }, "Start over? Your garden and field guide get erased."),
      h("div", { class: "splash__row" },
        h("button", { class: "btn btn--crt btn--gold", "aria-describedby": "splash-warn", onclick: onNew }, "Yes, start over"),
        h("button", { class: "btn btn--crt splash__new", "data-autofocus": true, onclick: () => { showChoices(); focusFirst(choices); } }, "Keep my garden")));
    focusFirst(choices);
  };
  if (saved) showChoices();
  else choices.append(h("button", { class: "btn btn--crt btn--gold", "data-autofocus": true, onclick: onBegin }, "Begin ▸"));
  const main = h("main", { class: "world splash" },
    h("div", { class: "splash__sign" },
      h("h1", { class: "crt__title crt__title--block" }, blockText("DRIFTWOOD", {
        fill: "#3b2a1a", shadow: "#ffb347", align: "left",
        build: !splashShown && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      })),
      h("p", { class: "crt__line" }, "A short game about the AI helpers we trust."),
      choices),
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
