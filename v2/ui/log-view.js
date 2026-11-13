// Level 4's planting log: the almanac's cover (see ui/tools.js) listing where
// the player put things (state.memory), the player's own record against the
// helper's "memory". It has no button or key: opening the almanac shows it.
//
// The cover shows a small map of the garden's beds, the sown ones marked with
// a plant label (decoration: the entries below carry the same facts in words).
//
// Showing the page counts as checking the evidence for every logged item
// (dispatch check(item)), which unlocks the "Your label" card.
import { h } from "./dom.js";
import { definePage } from "./tools.js";
import { logEntries } from "../mechanics/placement.js";

definePage("log", ({ level, dispatch, t }) => {
  const list = h("ul", { class: "log__list" });
  const map = h("div", { class: "log__map", "aria-hidden": "true" });
  const body = h("div", { class: "log-page" },
    h("p", { class: "log__by" }, h("span", { class: "log__day" }, "Day 1"), " · ", t("Kept by {name}")),
    map,
    list);

  function renderMap(entries) {
    map.replaceChildren(...level.beds.map((bed) => {
      const sown = entries.filter((e) => e.bed === bed.id);
      return h("div", { class: `log__bed${sown.length ? " log__bed--sown" : ""}`, "data-map-bed": bed.id },
        h("span", { class: "log__soil" }, ...sown.map((e) =>
          h("span", { class: "log__marker" }, h("img", { src: "./art/plant-label.svg", alt: "" }), `${e.item}s`))),
        h("span", { class: "log__bed-name" }, bed.label));
    }));
  }

  function render(state) {
    const entries = logEntries(level, state.memory);
    renderMap(entries);
    list.replaceChildren(...(entries.length
      ? entries.map((e) => h("li", { class: "log__entry", "data-item": e.item, "data-bed": e.bed }, e.text))
      : [h("li", { class: "log__none" }, "Nothing written yet.")]));
  }

  return {
    title: "Planting log",
    body,
    show(state) {
      render(state);
      // Reading your own log is checking the evidence for everything in it.
      for (const e of logEntries(level, state.memory)) dispatch({ type: "check", id: e.item });
    },
    update: render,
  };
});
