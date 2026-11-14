// Level map (five plots) and the field guide.
import { h, focusFirst } from "./dom.js";
import { isUnlocked } from "../progress.js";
import { blockText } from "./block-type.js";

// The garden's name as a block-letter heading (ink on parchment, a gold shadow).
export const gardenTitle = (name) => blockText(name ? `${name}'s garden` : "Your garden", { fill: "#3b2a1a", shadow: "#e2b86a" });

export const starText = (n) => {
  const filled = Math.min(3, Math.max(0, Math.floor(Number(n)) || 0));
  return "★".repeat(filled) + "☆".repeat(3 - filled);
};

export function renderMap(root, { progress, map, levels, onPlay, onGuide, onIntro = null, onEnding = null }) {
  const ids = map.map((m) => m.id);
  const plots = map.map((m) => {
    const unlocked = isUnlocked(progress, m.number, ids);
    const built = Boolean(levels[m.id]);
    const done = progress.levels[m.id];
    let status = "Play";
    if (!unlocked) status = "Locked";
    else if (!built) status = "Coming soon";
    else if (done) status = starText(done.stars);
    const open = unlocked && built;
    return h("li", {},
      h("button", {
        class: "plot", disabled: !open, "data-level": m.id,
        "aria-label": `Level ${m.number}: ${m.title}, with ${m.helper}. ${done ? `${done.stars} of 3 stars` : status}`,
        onclick: () => onPlay(m.id),
      },
        h("span", { class: "plot__num" }, `LEVEL ${m.number}`),
        h("img", { src: m.sprite, alt: "", width: 64, height: 64 }),
        h("span", { class: "plot__title" }, m.title),
        h("span", { class: done ? "plot__stars" : "plot__status" }, status)));
  });

  root.replaceChildren(
    h("main", { class: "map" },
      h("div", { class: "map__head" },
        h("h1", { class: "map__title" }, gardenTitle(progress.name)),
        h("div", { class: "map__actions" },
          onIntro ? h("button", { class: "btn", onclick: onIntro }, "▸ Watch intro") : null,
          h("button", { class: "btn", onclick: onGuide }, `Field guide ${progress.guide.length}/${map.length}`))),
      h("p", { class: "map__sub" }, "Each plot is one job. Each job has one AI helper."),
      onEnding ? h("p", { class: "map__done" },
        h("button", { class: "btn", onclick: onEnding }, "Your finished garden →")) : null,
      h("ol", { class: "plots" }, plots)));
  focusFirst(root.querySelector(".plots"));
}

export function renderGuide(root, { progress, map, onBack }) {
  const cards = map.map((m) => {
    const card = progress.guide.find((c) => c.levelId === m.id);
    if (!card) {
      return h("li", { class: "guide__card guide__card--empty" },
        h("p", { class: "crt__kicker" }, m.helper), h("h2", {}, "???"), h("p", {}, "Not found yet."));
    }
    return h("li", { class: "guide__card" },
      h("p", { class: "crt__kicker" }, `${m.helper} · ${card.fooled ? "it fooled you" : "you caught it"}`),
      h("h2", {}, card.flaw),
      h("p", {}, card.tip));
  });
  root.replaceChildren(
    h("main", { class: "crt guide" },
      h("h1", { class: "crt__title crt__title--small" }, "FIELD GUIDE"),
      h("p", { class: "crt__line" }, "How AI helpers go wrong, and what to do about it."),
      h("ul", { class: "guide__cards" }, cards),
      h("button", { class: "btn btn--crt", "data-autofocus": true, onclick: onBack }, "← Back to the garden")));
  focusFirst(root);
}
