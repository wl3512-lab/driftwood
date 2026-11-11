// The reveal: a hard cut from the cozy garden to the dark CRT, naming the flaw.
import { h, focusFirst } from "./dom.js";
import { starText } from "./map.js";

export function renderReveal(root, level, state, { onContinue }) {
  const r = level.reveal;
  root.replaceChildren(
    h("main", { class: "crt reveal" },
      h("p", { class: "crt__kicker" }, state.fooled ? "// YOU TRUSTED IT //" : "// YOU CAUGHT IT //"),
      h("h1", { class: "reveal__flaw", tabindex: -1, "data-autofocus": true }, r.flaw.toUpperCase()),
      r.flawGloss ? h("p", { class: "reveal__gloss" }, r.flawGloss) : null,
      h("p", { class: "crt__line" }, state.fooled ? r.fooledLine : r.caughtLine),
      h("p", { class: "crt__line" }, r.body),
      h("div", { class: "reveal__tip" },
        h("span", { class: "reveal__tip-label" }, "FIELD GUIDE"), r.tip),
      h("p", { class: "reveal__stars", role: "img", "aria-label": `${state.stars} of 3 stars` }, starText(state.stars)),
      h("button", { class: "btn btn--crt", onclick: onContinue }, "Add to field guide →")));
  focusFirst(root);
}
