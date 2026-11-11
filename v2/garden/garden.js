// Draws the beds and their plants from runner state. Re-rendered on every
// change; it's a handful of <img> tags, so there's no diffing to do.
import { h } from "../ui/dom.js";

const LIGHT_ICON = { sunny: "☀", "part-shade": "⛅", shady: "☁" };

export function plantSrc(plant, state) {
  return state === "sprout" ? "./art/sprout.svg" : `./art/${plant}-${state}.svg`;
}

// Every plant sprite this level can show (start plants, each effect and its
// extra plants, pressure effects, and the thriving state watering can turn
// "growing" into), so the view can preload them.
export function levelSprites(level) {
  const shown = [];
  for (const list of Object.values(level.startPlants || {})) shown.push(...list);
  for (const step of level.steps) {
    for (const e of [step.effect, step.badEffect, step.goodEffect, ...(step.pressure?.effects || [])]) {
      if (e?.plant) shown.push(e);
      for (const x of e?.extra || []) if (x?.plant) shown.push(x);
    }
  }
  const srcs = new Set();
  for (const p of shown) {
    srcs.add(plantSrc(p.plant, p.state));
    if (p.state === "growing") srcs.add(plantSrc(p.plant, "thriving"));
  }
  return [...srcs];
}

// bed.kind ("pots" | "wild" | "meadow") adds bed--<kind>, styled in css/scenes.css.
export function renderBeds(level, state) {
  return level.beds.map((bed) =>
    h("div", { class: ["bed", `bed--${bed.light}`, bed.kind && `bed--${bed.kind}`].filter(Boolean).join(" "), "data-bed": bed.id },
      h("span", { class: "bed__label" }, `${bed.label} ${LIGHT_ICON[bed.light]}`),
      h("div", { class: "bed__plants" },
        state.beds[bed.id].map((p) =>
          h("img", {
            class: `plant plant--${p.state}`, "data-plant": p.plant,
            src: plantSrc(p.plant, p.state), alt: `${p.plant}, ${p.state}`, width: 64, height: 64,
          })))));
}
