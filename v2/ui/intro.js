// The splash: the DRIFTWOOD title over the garden at sunset. A new player's
// Begin goes straight into the opening cutscene, where Master Rowan asks
// their name (ui/cutscene.js); there is no separate name screen.
import { h, focusFirst } from "./dom.js";
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
