// Draws the beds and their plants from runner state. Re-rendered on every
// change; it's a handful of <img> tags, so there's no diffing to do.
import { h } from "../ui/dom.js";

const LIGHT_ICON = { sunny: "☀", "part-shade": "⛅", shady: "☁" };

export function plantSrc(plant, state) {
  return state === "sprout" ? "./art/sprout.svg" : `./art/${plant}-${state}.svg`;
}

// Every plant sprite this level can show (start plants, each effect and its
// extra plants, disagree overrides, pressure effects, and the thriving state watering can turn
// "growing" into), so the view can preload them.
export function levelSprites(level) {
  const shown = [];
  for (const list of Object.values(level.startPlants || {})) shown.push(...list);
  for (const step of level.steps) {
    for (const e of [step.effect, step.badEffect, step.goodEffect, step.disagree?.effect, ...(step.pressure?.effects || [])]) {
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

// Big crops, and sown beds (raked rows, each with its label stake), get one
// sprite per tile; small crops are planted denser, with a second, staggered
// layer of rows between the first.
const BIG = new Set(["tomato", "sunflower", "pumpkin", "blueberry", "wildberry"]);
export function fieldDensity(plant, state) {
  return BIG.has(plant) || state === "sown" ? "big" : "dense";
}

// bed.kind ("pots" | "wild" | "meadow") adds bed--<kind>, styled in css/scenes.css.
// A planted bed reads as full: each crop is a .field (its share of the bed)
// painted with its sprite as a repeated background at the bed's pixel scale,
// so a bed of carrots is rows of carrots, not one carrot in empty soil. Two
// crops split the bed into zones. The <img> stays one per crop: it carries
// data-plant, the state class and the alt text, and lies over its whole field
// (drawing nothing itself) so the magnifier and tests address the crop as one
// thing and a tap anywhere on it lands on it.
export function renderBeds(level, state) {
  return level.beds.map((bed) =>
    h("div", { class: ["bed", `bed--${bed.light}`, bed.kind && `bed--${bed.kind}`].filter(Boolean).join(" "), "data-bed": bed.id },
      h("span", { class: "bed__label" }, `${bed.label} ${LIGHT_ICON[bed.light]}`),
      h("div", { class: "bed__plants" },
        state.beds[bed.id].map((p) => {
          const src = plantSrc(p.plant, p.state);
          return h("div", {
            class: `field field--${fieldDensity(p.plant, p.state)} field--${p.state}`, "data-field": p.plant,
            // Inline, so the url resolves against the page like the <img> src does.
            style: `background-image: url("${src}")`,
          },
          h("img", {
            class: `plant plant--${p.state}`, "data-plant": p.plant,
            src, alt: `${p.plant}, ${p.state}`, width: 64, height: 64,
          }));
        }))));
}
