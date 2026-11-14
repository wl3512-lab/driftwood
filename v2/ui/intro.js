// Splash (CRT title) and the intro: the one framing line plus name entry,
// merged on one screen so there's one less tap before play.
import { h, focusFirst, finePointer } from "./dom.js";
import { blockText } from "./block-type.js";

let splashShown = false; // the title builds in, cell by cell, the first time only

export function renderSplash(root, { onBegin }) {
  root.replaceChildren(
    h("main", { class: "crt splash" },
      h("h1", { class: "crt__title crt__title--block" }, blockText("DRIFTWOOD", {
        fill: "#69f0ae", shadow: "#0b5a33", align: "center",
        build: !splashShown && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      })),
      h("img", { class: "crt__sprite", src: "../icons/parrot.svg", alt: "", width: 80, height: 112 }),
      h("p", { class: "crt__line" }, "A short game about the AI helpers we trust."),
      h("button", { class: "btn btn--crt", "data-autofocus": true, onclick: onBegin }, "Begin")));
  splashShown = true;
  focusFirst(root);
}

export function renderIntro(root, { onSubmit }) {
  const input = h("input", {
    id: "player-name", name: "name", autocomplete: "nickname", maxlength: 24,
    placeholder: "your name",
  });
  const submit = h("button", { class: "btn btn--crt", type: "submit" }, "Enter the garden");
  const form = h("form", {
    class: "intro__form",
    onsubmit: (e) => { e.preventDefault(); onSubmit(input.value.trim()); },
  },
    h("label", { for: "player-name" }, "What should they call you?"),
    input,
    submit);

  root.replaceChildren(
    h("main", { class: "crt intro" },
      h("img", { class: "crt__sprite", src: "../icons/parrot.svg", alt: "", width: 80, height: 112 }),
      h("h1", { class: "crt__line crt__line--big" }, "These animals are AI assistants, like ChatGPT with fur."),
      h("p", { class: "crt__line" }, "Ask them for help building your garden."),
      form));
  // Touch: focus the button, not the field, so the keyboard doesn't jump up unasked.
  (finePointer() ? input : submit).focus({ preventScroll: true });
}
