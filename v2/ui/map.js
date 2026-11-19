// Level map (five plots) and the field guide.
import { h, focusFirst } from "./dom.js";
import { isUnlocked, practiceFor } from "../progress.js";
import { trainBar } from "./train-bar.js";
import { blockText, blockTitle } from "./block-type.js";
import { mountWorld, timeFor, BED_X } from "./world.js";
import { soundToggle } from "../audio/toggle.js";

// The garden's name as a block-letter heading (ink on parchment, a gold shadow).
export const gardenTitle = (name) => blockText(name ? `${name}'s garden` : "Your garden", { fill: "#3b2a1a", shadow: "#e2b86a" });

export const starText = (n) => {
  const filled = Math.min(3, Math.max(0, Math.floor(Number(n)) || 0));
  return "★".repeat(filled) + "☆".repeat(3 - filled);
};

// What each plot grows on the map: thriving once done, sprouts while it waits.
const CROPS = {
  "level-1": ["lettuce", "sunflower", "lettuce"],
  "level-2": ["basil", "mint", "basil"],
  "level-3": ["blueberry", "bean", "blueberry"],
  "level-4": ["carrot", "pumpkin", "carrot"],
  "level-5": ["flower", "flower", "flower"],
};
const cropArt = (plant, done) => `./art/${plant}-${done ? "thriving" : "growing"}.svg`;

// The time of day the map last showed, so coming back after a level animates
// the sun to the new bed. Kept outside the saved progress on purpose.
const SEEN_KEY = "dw2_map_time";
const readSeen = () => { try { const v = localStorage.getItem(SEEN_KEY); return v === null ? null : Number(v); } catch { return null; } };
const writeSeen = (t) => { try { localStorage.setItem(SEEN_KEY, String(t)); } catch { /* fine */ } };
const calm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Beds' boxes, relative to the world, for the sun's beam.
export const bedRects = (host) => () => {
  const hr = host.getBoundingClientRect();
  return [...host.querySelectorAll(".plot__box")].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - hr.left + r.width / 2, top: r.top - hr.top, w: r.width, h: r.height };
  });
};

// Returns an unmount function (stops the sky's animation and resize watching).
export function renderMap(root, { progress, map, levels, onPlay, onGuide, onIntro = null, onEnding = null }) {
  const ids = map.map((m) => m.id);
  const open = map.map((m) => isUnlocked(progress, m.number, ids) && Boolean(levels[m.id]));
  const allDone = Boolean(onEnding);
  let next = map.findIndex((m, i) => open[i] && !progress.levels[m.id]);
  if (next < 0) next = map.length - 1;
  const time = timeFor(next, allDone);

  const plots = map.map((m, i) => {
    const unlocked = isUnlocked(progress, m.number, ids);
    const built = Boolean(levels[m.id]);
    const done = progress.levels[m.id];
    let status = "▶ Play";
    if (!unlocked) status = "Locked";
    else if (!built) status = "Coming soon";
    else if (done) status = starText(done.stars);
    const isNext = !allDone && i === next && open[i];
    const state = !open[i] ? "locked" : done ? "done" : "open";
    return h("li", { class: "plots__bed", style: `--x: ${BED_X[i] * 100}%` },
      h("button", {
        class: `plot plot--${state}${isNext ? " plot--next" : ""}`, disabled: !open[i], "data-level": m.id, "data-sfx": "map-select",
        "aria-label": `Level ${m.number}: ${m.title}, with ${m.helper}. ${done ? `${done.stars} of 3 stars` : status.replace("▶ ", "")}`,
        onclick: () => onPlay(m.id),
      },
        h("span", { class: "plot__stake" },
          h("span", { class: "plot__num" }, `LEVEL ${m.number}`),
          unlocked ? h("span", { class: "plot__title" }, m.title) : null,
          h("span", { class: done ? "plot__stars" : "plot__status" }, status),
          // Each helper's training at a glance, once its plot is open.
          unlocked && built ? trainBar(m.helper, practiceFor(progress, m.id), { className: "plot__train" }).el : null),
        h("span", { class: "plot__crops", "aria-hidden": "true" },
          (CROPS[m.id] || []).map((c) => h("img", { src: cropArt(c, Boolean(done)), alt: "", width: 32, height: 32 }))),
        h("span", { class: "plot__box", "aria-hidden": "true" }),
        h("img", { class: "plot__pet", src: m.sprite, alt: "", width: 64, height: 64 })));
  });

  let extra = false;
  try { extra = localStorage.getItem("dw2_extra_chores") === "1"; } catch { /* session only */ }
  const extras = h("button", { class: "btn map__extras", "aria-pressed": String(extra), onclick: () => {
    extra = !extra;
    try { localStorage.setItem("dw2_extra_chores", extra ? "1" : "0"); } catch { /* storage unavailable */ }
    extras.setAttribute("aria-pressed", String(extra));
    extras.textContent = `Extra garden jobs: ${extra ? "on" : "off"}`;
  } }, `Extra garden jobs: ${extra ? "on" : "off"}`);
  const main = h("main", { class: "map world", "data-next": allDone ? "done" : ids[next] },
    h("div", { class: "map__head" },
      h("h1", { class: "map__title" }, gardenTitle(progress.name)),
      h("div", { class: "map__actions" },
        onIntro ? h("button", { class: "btn", "data-sfx": "ui-tap", onclick: onIntro }, "▸ Watch intro") : null,
        h("button", { class: "btn", "data-sfx": "ui-tap", onclick: onGuide }, `Field guide ${progress.guide.length}/${map.length}`),
        soundToggle())),
    h("ol", { class: "plots" }, plots),
    h("div", { class: "map__options" }, extras, h("p", {}, "Core gardening and every AI lesson are always included.")),
    onEnding ? h("p", { class: "map__done" },
      h("button", { class: "btn btn--gold", "data-sfx": "begin", onclick: onEnding }, "Your finished garden →")) : null);
  root.replaceChildren(main);

  // The sky: start where the player last saw it and travel to now.
  const seen = readSeen();
  const from = seen !== null && Number.isFinite(seen) && seen < time && !calm() ? seen : time;
  const world = mountWorld(main, { time: from, getBeds: bedRects(main), bedIds: ids });
  if (from !== time) world.travel(time, 1700);
  writeSeen(time);
  focusFirst(main.querySelector(".plots"));
  return () => world.destroy();
}

// The field guide: five collectible cards in one row on the night lawn. Found
// cards show the pet, the flaw in block letters, a stamp and the level's tip;
// the rest lie face down.
export function renderGuide(root, { progress, map, levels = {}, onBack }) {
  const found = map.filter((m) => progress.guide.some((c) => c.levelId === m.id)).length;
  const cards = map.map((m) => {
    const card = progress.guide.find((c) => c.levelId === m.id);
    if (!card) {
      return h("li", { class: "guide__card guide__card--empty" },
        h("span", { class: "gc__back", "aria-hidden": "true" },
          h("span", { class: "gc__backmark" }, blockText("?", { fill: "#ffb347", shadow: "#3d1d0e", align: "center" }))),
        h("p", { class: "gc__backnum" }, `Level ${m.number}`),
        h("p", { class: "sr-only" }, `${m.helper}: not found yet.`));
    }
    const reveal = levels[m.id]?.reveal;
    const flaw = reveal?.flaw || card.flaw;
    const tip = reveal?.tip || card.tip;
    const status = card.fooled ? "it fooled you" : "you caught it";
    return h("li", { class: `guide__card ${card.fooled ? "guide__card--fooled" : "guide__card--caught"}` },
      h("p", { class: "gc__top" }, h("span", {}, `${m.number}/${map.length}`), h("span", {}, m.helper)),
      h("span", { class: "gc__art" }, h("img", { src: m.sprite, alt: "" })),
      h("p", { class: "gc__stamp" },
        blockText(card.fooled ? "FOOLED" : "BUSTED", { fill: card.fooled ? "#4c4a6b" : "#c7301f", align: "center" }),
        h("span", { class: "sr-only" }, ` ${m.helper} · ${status}`)),
      h("h2", { class: "gc__name" },
        blockTitle(flaw.toUpperCase().split(" ").join("\n"), { fill: card.fooled ? "#5e554c" : "#3b2a1a", shadow: card.fooled ? "#bfb5a0" : "#ffb347" }),
        h("span", { class: "sr-only" }, flaw)),
      h("p", { class: "gc__tip" }, tip));
  });
  const main = h("main", { class: "world guide" },
    h("header", { class: "guide__head" },
      h("h1", { class: "guide__title" }, "FIELD GUIDE"),
      h("p", { class: "guide__count" }, `${found}/${map.length} found`),
      h("button", { class: "btn btn--crt guide__back", "data-autofocus": true, onclick: onBack }, "← Back to the garden")),
    h("ul", { class: "guide__cards guide__row" }, cards));
  root.replaceChildren(main);
  const world = mountWorld(main, { time: 4, beam: false });
  focusFirst(root);
  return () => world.destroy();
}
