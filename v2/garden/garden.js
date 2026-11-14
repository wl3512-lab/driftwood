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

// Big crops, and sown beds (raked rows, each with its label stake), are "big",
// the rest "dense". Both now draw one sprite per tile; the class stays for
// styling (the staggered second row was dropped as too crowded).
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
// Every crop a level can put in each bed (start plants first, then any effect
// anywhere in its steps or chores, in the order they appear), so a bed keeps
// room for a crop that hasn't been planted yet: in Level 1 the sunflowers take
// half the South bed and the other half waits, bare, for the tomatoes.
const PLANNED = new WeakMap();
export function plannedCrops(level) {
  if (PLANNED.has(level)) return PLANNED.get(level);
  const ids = new Set(level.beds.map((b) => b.id));
  const plan = Object.fromEntries(level.beds.map((b) => [b.id, []]));
  const add = (bed, plant) => { if (ids.has(bed) && plant && !plan[bed].includes(plant)) plan[bed].push(plant); };
  for (const [bed, list] of Object.entries(level.startPlants || {})) for (const p of list) add(bed, p.plant);
  const walk = (v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== "object") return;
    if (typeof v.plant === "string" && typeof v.bed === "string") add(v.bed, v.plant);
    Object.values(v).forEach(walk);
  };
  walk([level.steps, level.chores]);
  PLANNED.set(level, plan);
  return plan;
}

// What each crop looked like the last time its beds were drawn, so a crop that
// changes (pinched basil turning bushy) can grow new leaves on top of the old
// plant instead of regrowing from the soil.
const SEEN = new WeakMap();
const absolute = (src) => (typeof document !== "undefined" ? new URL(src, document.baseURI).href : src);

export function renderBeds(level, state) {
  const planned = plannedCrops(level);
  const seen = SEEN.get(level) || new Map();
  const nowSeen = new Map();
  const out = level.beds.map((bed) => {
    const here = state.beds[bed.id];
    // The crops in planned order, then anything else in the bed; a planned crop
    // not planted yet is an empty field holding its share of the soil.
    const order = [...(planned[bed.id] || [])];
    for (const p of here) if (!order.includes(p.plant)) order.push(p.plant);
    const slots = order.map((plant) => here.find((p) => p.plant === plant) || { plant, empty: true });
    return h("div", { class: ["bed", `bed--${bed.light}`, bed.kind && `bed--${bed.kind}`].filter(Boolean).join(" "), "data-bed": bed.id },
      h("span", { class: "bed__label" }, `${bed.label} ${LIGHT_ICON[bed.light]}`),
      h("div", { class: "bed__plants" },
        slots.map((p) => {
          if (p.empty) return h("div", { class: "field field--empty", "data-for": p.plant, "aria-hidden": "true" });
          const src = plantSrc(p.plant, p.state);
          const key = `${bed.id}|${p.plant}`;
          const was = seen.get(key);
          nowSeen.set(key, src);
          const regrow = was && was !== src;
          return h("div", {
            class: `field field--${fieldDensity(p.plant, p.state)} field--${p.state}${regrow ? " field--regrow" : ""}`, "data-field": p.plant,
            // Inline, so the url resolves against the page like the <img> src does.
            // --was is read by css/level.css, where a relative url would resolve against
            // the stylesheet, so it is made absolute here.
            style: `background-image: url("${src}")${regrow ? `; --was: url("${absolute(was)}")` : ""}`,
          },
          h("img", {
            class: `plant plant--${p.state}`, "data-plant": p.plant,
            src, alt: `${p.plant}, ${p.state}`, width: 64, height: 64,
          }));
        })));
  });
  SEEN.set(level, nowSeen);
  return out;
}
