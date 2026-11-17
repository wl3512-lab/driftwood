// The ending's first screen: Master Rowan's stew dinner. The table shows
// what the garden grew (engine/stew.js): veg and herbs in the pot, purple
// salad and blueberries on the side, mint tea, sunflowers and meadow flowers
// in vases. A drift that fooled you leaves a gap. Rowan sits behind the pot,
// the pets (smaller: his little helpers) at the table, and he rates the stew.
// Chosen by Lucy: "The stew dinner" in docs/design-options/2026-11-14-wizard/options.html.
import { h } from "./dom.js";
import { rateStew } from "../engine/stew.js";
import { WIZARD } from "../levels/wizard.js";
import { trainedFor } from "../progress.js";

// A helper you never trained past this still glitches at the table.
export const DINNER_GLITCH_BELOW = 0.75;
import {
  pixelSvg, potMap, POT_SLOTS, VASES, BERRY_BOWL, BERRY_BOWL_EMPTY, SALAD, SALAD_EMPTY, TEA, TEA_EMPTY,
  RATING_BOWL, RATING_BOWL_EMPTY,
} from "./story-art.js";

const art = (map, cls, attrs = {}) => { const d = h("div", { class: cls, ...attrs }); d.innerHTML = pixelSvg(map.rows, map.pal); return d; };
const WHERE = [["pot", "In the pot"], ["side", "On the side"], ["after", "After"], ["table", "On the table"]];
// Pets at the table, in level order: two left of Rowan, three right.
const SEATS = [6, 16, 70, 82, 94];

export function stewDinner({ progress, map, name = "friend", onDown = () => {} }) {
  const r = rateStew(progress, map.map((m) => m.id));
  const has = (id) => r.dishes.find((d) => d.id === id)?.present ?? false;
  const dish = (m, cls, x, label, id) => art(m, `stew__dish ${cls}`, { style: `--x:${x}%`, role: "img", "aria-label": label, "data-dish": id, "data-present": String(has(id)) });
  const inPot = POT_SLOTS.filter(has);
  const potNames = r.dishes.filter((d) => d.where === "pot" && d.present).map((d) => d.name);
  const menuLine = ([where, label]) => {
    const ds = r.dishes.filter((d) => d.where === where);
    if (!ds.length) return null;
    return h("p", { class: "stew__menu-row" }, h("span", { class: "stew__menu-k" }, `${label}: `),
      ds.flatMap((d, i) => [i ? ", " : "", d.present ? d.name : h("del", { class: "stew__gap" }, d.name)]));
  };
  const why = r.missing.filter((d) => d.why).map((d) => {
    const lvl = map.find((m) => m.id === d.level);
    return h("li", {}, `${d.why}${lvl ? ` (Level ${lvl.number})` : ""}`);
  });
  const bowls = Array.from({ length: 5 }, (_, i) => art(i < r.bowls ? RATING_BOWL : RATING_BOWL_EMPTY, `stew__bowl${i < r.bowls ? "" : " stew__bowl--empty"}`));

  return h("section", { class: "stew", "aria-labelledby": "ending-dinner", "data-bowls": r.bowls },
    h("div", { class: "stew__sky", "aria-hidden": "true" }, h("div", { class: "stew__sun" })),
    h("div", { class: "stew__hills", "aria-hidden": "true" }),
    h("div", { class: "stew__fence", "aria-hidden": "true" }),
    h("div", { class: "stew__lawn", "aria-hidden": "true" }),
    map.map((m, i) => h("img", { class: `stew__pet${trainedFor(progress, m.id) < DINNER_GLITCH_BELOW ? " stew__pet--glitch" : ""}`, src: m.sprite, alt: "", width: 80, height: 112, style: `--x:${SEATS[i] ?? 50}%`, "data-helper": m.helper })),
    h("div", { class: "stew__rowan" },
      h("p", { class: "stew__bub", id: "stew-line" },
        h("span", { class: "stew__who" }, WIZARD.name.toUpperCase()), " ",
        h("span", { class: "stew__say" }, r.line),
        h("i", { class: "stew__tail", "aria-hidden": "true" })),
      h("img", { class: "stew__wiz", src: WIZARD.sprite, alt: "Master Rowan", width: 192, height: 288 })),
    h("div", { class: "stew__table", "aria-hidden": "true" }),
    h("div", { class: "stew__ontable" },
      dish(has("lettuce") ? SALAD : SALAD_EMPTY, "stew__dish--salad", 27, has("lettuce") ? "A bowl of purple salad" : "An empty salad bowl", "lettuce"),
      dish(has("sunflower") ? VASES.sunflower : VASES.empty, "stew__dish--vase", 37, has("sunflower") ? "Sunflowers in a vase" : "An empty vase", "sunflower"),
      h("div", { class: "stew__dish stew__dish--pot", style: "--x:50%", role: "img", "aria-label": `The stew pot: ${potNames.join(", ") || "empty"}`, "data-dish": "pot", "data-chunks": inPot.join(" ") },
        h("div", { class: "stew__steam", "aria-hidden": "true" }, inPot.length ? [0, 1, 2].map((i) => h("i", { style: `--d:${i * 0.45}s;--sx:${22 + i * 26}%` })) : null),
        art(potMap(inPot), "stew__pot")),
      dish(has("flower") ? VASES.flower : VASES.wilted, "stew__dish--vase", 61, has("flower") ? "Meadow flowers in a vase" : "Wilted meadow flowers in a vase", "flower"),
      dish(has("blueberry") ? BERRY_BOWL : BERRY_BOWL_EMPTY, "stew__dish--berries", 76, has("blueberry") ? "A glass bowl of blueberries" : "An empty glass bowl", "blueberry"),
      dish(has("mint") ? TEA : TEA_EMPTY, "stew__dish--tea", 88, has("mint") ? "A cup of mint tea" : "An empty cup", "mint")),
    h("div", { class: "stew__menu" },
      h("h1", { class: "stew__title", id: "ending-dinner", tabindex: -1, "data-autofocus": true }, `${name}'s garden stew`),
      WHERE.map(menuLine),
      why.length ? h("ul", { class: "stew__why" }, why) : null),
    h("div", { class: "stew__rating", role: "img", "aria-label": `${WIZARD.name}'s rating: ${r.bowls} of 5 bowls` },
      h("div", { class: "stew__bowls" }, bowls),
      h("p", { class: "stew__kinds", "aria-hidden": "true" }, `${r.kinds} of ${r.total} kinds`)),
    h("button", { class: "btn btn--crt btn--gold stew__down", onclick: onDown }, "Your field guide ↓"));
}
