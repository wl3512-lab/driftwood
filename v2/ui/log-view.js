// Level 4's planting log: a page of the almanac (see ui/tools.js) listing where
// the player put things (state.memory), the player's own record against the
// helper's "memory". The "L" key opens the almanac straight on this page.
//
// Showing the page counts as checking the evidence for every logged item
// (dispatch check(item)), which unlocks the "Your label" card.
import { h } from "./dom.js";
import { definePage } from "./tools.js";
import { logEntries } from "../mechanics/placement.js";

definePage("log", ({ level, dispatch, t }) => {
  const list = h("ul", { class: "log__list" });
  const body = h("div", { class: "log-page" },
    h("p", { class: "log__by" }, t("Kept by {name}")),
    list);

  function render(state) {
    const entries = logEntries(level, state.memory);
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
