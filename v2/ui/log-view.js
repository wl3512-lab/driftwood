// Level 4's planting log: a small non-modal panel listing where the player
// put things (state.memory), the player's own record against the helper's
// "memory". Registered with ui/tools.js; the level view owns the toolbar
// button and the "L" shortcut and calls open() to toggle the panel.
//
// Opening the log counts as checking the evidence for every logged item
// (dispatch check(item)), which unlocks the "Your label" card.
//
// Ways in and around:
//   keyboard  "L" opens (the close button gets focus) · Esc closes
//   mouse / touch  the Log button, the × button (44px+)
// Focus goes back to the Log button whenever the panel closes from inside.
import { h } from "./dom.js";
import { defineTool } from "./tools.js";
import { logEntries } from "../mechanics/placement.js";

let panels = 0; // unique ids if a level is ever mounted twice

defineTool("log", ({ level, scene, button, dispatch, getState, t }) => {
  const uid = `log-${++panels}`;
  const list = h("ul", { class: "log__list" });
  const close = h("button", { type: "button", class: "log__close", "aria-label": "Close planting log", onclick: () => hide(true) }, "×");
  const panel = h("section", {
    class: "log", id: uid, role: "dialog", "aria-modal": "false", "aria-labelledby": `${uid}-title`, hidden: true,
  },
  h("div", { class: "log__head" },
    h("h2", { class: "log__title", id: `${uid}-title` }, "Planting log"),
    close),
  h("p", { class: "log__by" }, t("Kept by {name}")),
  list);

  button.setAttribute("aria-controls", uid);
  button.setAttribute("aria-expanded", "false");
  scene.append(panel);

  panel.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    ev.preventDefault(); // the level view's shortcut listener skips handled keys
    hide(true);
  });

  function render(state) {
    const entries = logEntries(level, state.memory);
    list.replaceChildren(...(entries.length
      ? entries.map((e) => h("li", { class: "log__entry", "data-item": e.item, "data-bed": e.bed }, e.text))
      : [h("li", { class: "log__none" }, "Nothing written yet.")]));
  }

  function open() {
    if (!panel.hidden) { hide(false); return; }
    const state = getState();
    render(state);
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    close.focus({ preventScroll: true });
    // Reading your own log is checking the evidence for everything in it.
    for (const e of logEntries(level, state.memory)) dispatch({ type: "check", id: e.item });
  }

  function hide(returnFocus) {
    if (panel.hidden) return;
    const inside = panel.contains(document.activeElement);
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (returnFocus || inside) button.focus({ preventScroll: true });
  }

  render(getState());
  return {
    open,
    update(state) {
      // The reveal is about the garden: put the log away so it doesn't cover the outcome.
      if (state.phase === "reveal") hide(false);
      else if (!panel.hidden) render(state);
    },
    destroy() { panel.remove(); },
  };
});
