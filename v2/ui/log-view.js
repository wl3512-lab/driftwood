// Level 4's planting log: the almanac's cover (see ui/tools.js) listing where
// the player put things (state.memory), the player's own record against the
// helper's "memory". It has no button or key: opening the almanac shows it.
//
// It reads as an old CRT terminal (css/scenes.css), not as the garden: a
// header line, a wireframe schematic of the beds with the sown ones marked
// (decoration: the log lines below carry the same facts in words), then the
// log as terminal output and a blinking cursor.
//
// Showing the page counts as checking the evidence for every logged item
// (dispatch check(item)), which unlocks the "Your label" card.
import { h } from "./dom.js";
import { definePage } from "./tools.js";
import { logEntries } from "../mechanics/placement.js";

// "Front bed" → "FRONT": the short name the schematic prints in brackets.
const shortName = (label) => label.replace(/\s*bed$/i, "").toUpperCase();

definePage("log", ({ level, dispatch, t }) => {
  const list = h("ul", { class: "log__list" });
  const map = h("div", { class: "log__map", "aria-hidden": "true" });
  const body = h("div", { class: "log-page" },
    h("p", { class: "log__by" },
      h("span", { class: "log__day" }, "Day 1"), " · ", t("User: {name}")),
    map,
    list,
    h("p", { class: "log__prompt", "aria-hidden": "true" }, h("span", { class: "log__cursor" })));

  function renderMap(entries) {
    map.replaceChildren(...level.beds.map((bed) => {
      const sown = entries.filter((e) => e.bed === bed.id);
      return h("div", { class: `log__bed${sown.length ? " log__bed--sown" : ""}`, "data-map-bed": bed.id },
        h("span", { class: "log__bed-name" }, `[${shortName(bed.label)}]`),
        ...sown.map((e) => h("span", { class: "log__marker" }, `${e.item}s ◄`)));
    }));
  }

  function render(state) {
    const entries = logEntries(level, state.memory);
    renderMap(entries);
    list.replaceChildren(...(entries.length
      ? entries.map((e) => {
        const bed = level.beds.find((b) => b.id === e.bed)?.label ?? e.bed;
        return h("li", { class: "log__entry", "data-item": e.item, "data-bed": e.bed },
          "sowed ", h("b", {}, `${e.item}s`), " in ", h("b", {}, bed.toLowerCase()));
      })
      : [h("li", { class: "log__none" }, "no entries yet")]));
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
