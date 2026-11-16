// The "Trained" bar: how trained a helper is, 0…1 (engine/level-runner.js
// training(), progress.js trainedFor()). Drawn like the garden meter: a
// label over a pixel bar that fills in steps. set() returns true the moment
// it first reaches full, so the dock can make the helper hop.
import { h } from "./dom.js";

export function trainBar(name, value = 0, { className = "" } = {}) {
  const fill = h("span", { class: "train__fill" });
  const el = h("span", { class: `train ${className}`.trim(), role: "img" },
    h("span", { class: "train__text", "aria-hidden": "true" }, "Trained"),
    h("span", { class: "train__bar", "aria-hidden": "true" }, fill));
  let now = -1;
  function set(v) {
    const next = Math.max(0, Math.min(1, Number(v) || 0));
    if (next === now) return false;
    const was = now;
    now = next;
    const pct = Math.round(next * 100);
    fill.style.width = `${pct}%`;
    el.dataset.trained = String(pct);
    el.setAttribute("aria-label", `${name} trained ${pct}%`);
    return was >= 0 && was < 1 && next >= 1;
  }
  set(value);
  return { el, set };
}
