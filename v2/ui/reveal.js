// The reveal: a hard cut from the cozy garden to the dark CRT, naming the flaw.
import { h, focusFirst } from "./dom.js";
import { starText } from "./map.js";
import { fill } from "./text.js";
import { memoryVars } from "../mechanics/placement.js";

export function renderReveal(root, level, state, { onContinue, name = "friend" }) {
  const vars = { name, ...memoryVars(level, state.memory) };
  const t = (text) => fill(text, vars);
  const r = level.reveal;
  // Left-aligned column: the flaw, then three short labelled lines that each say one thing.
  const row = (label, text) => h("div", { class: "reveal__row" },
    h("dt", { class: "reveal__label" }, label), h("dd", { class: "reveal__text" }, t(text)));
  root.replaceChildren(
    h("main", { class: "crt reveal" },
      h("div", { class: "reveal__col" },
        h("div", { class: "reveal__top" },
          h("p", { class: "crt__kicker" }, state.fooled ? "// YOU TRUSTED IT //" : "// YOU CAUGHT IT //"),
          h("p", { class: "reveal__stars", role: "img", "aria-label": `${state.stars} of 3 stars` }, starText(state.stars))),
        h("h1", { class: "reveal__flaw", tabindex: -1, "data-autofocus": true }, t(r.flaw).toUpperCase()),
        r.flawGloss ? h("p", { class: "reveal__gloss" }, t(r.flawGloss)) : null,
        h("dl", { class: "reveal__rows" },
          row("What happened", state.fooled ? r.fooledLine : r.caughtLine),
          r.realWorld ? row("In real life", r.realWorld) : null,
          row(state.fooled ? "Next time" : "Keep doing this", r.tip)),
        // Optional sign-off from the helper, e.g. Biscuit handing over to Bugs after Level 4.
        r.handoff ? h("div", { class: "reveal__handoff" },
          h("img", { class: "reveal__handoff-pet", src: level.helper.sprite, alt: "" }),
          h("p", { class: "reveal__handoff-line" },
            h("span", { class: "reveal__handoff-name" }, level.helper.name), t(r.handoff))) : null,
        h("button", { class: "btn btn--crt reveal__go", onclick: onContinue }, "Add to field guide →"))));
  focusFirst(root);
}
