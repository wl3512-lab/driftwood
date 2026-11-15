// Level 3's magnifier: a "magnify mode" over the garden plus a non-modal panel
// that shows one plant close up beside the labelled shop blueberry, feature by
// feature (mechanics/magnifier.js does the comparing). Registered with
// ui/tools.js; the level view owns the toolbar button and the "M" shortcut and
// calls open() to toggle the mode.
//
// Ways in and around:
//   keyboard  "M" enters magnify mode and puts focus on the first plant that
//             can be inspected · ←/→ (or ↑/↓, Home/End) move between those
//             plants, wrapping · Enter/Space inspects · Esc leaves the mode
//   mouse     the Magnify button, then click a plant; hovering a plant
//             previews it in the panel (fine pointers only)
//   touch     tap Magnify, then tap a plant (no hover)
// Inspecting a subject that `unlocks` an evidence card dispatches check(id),
// and the level view pops and announces the card.
//
// The level view rebuilds the bed markup on every render, so the plants are
// re-marked as inspectable in update(state) and focus is put back on the plant
// the player was on (the old element is gone by then).
import { h, finePointer } from "./dom.js";
import { defineTool } from "./tools.js";
import { compare } from "../mechanics/magnifier.js";
import { sfx } from "../audio/index.js";

let panels = 0; // unique ids if a level is ever mounted twice

const PLANT = ".plant[data-inspect]";

defineTool("magnifier", ({ level, scene, button, dispatch, t }) => {
  const inspect = level.inspect;
  const subjects = inspect?.subjects || {};
  const uid = `magnifier-${++panels}`;
  const root = scene.parentElement || scene; // main.level
  let on = false; // magnify mode
  let shown = null; // subject id on display (committed by click/Enter/tap)
  let last = null; // { plant, bed } the player was on, to restore focus after a re-render

  const title = h("h2", { class: "magnifier__title", id: `${uid}-title` }, "Magnifier");
  const body = h("div", { class: "magnifier__body" });
  const close = h("button", { type: "button", class: "magnifier__close", "aria-label": "Close magnifier", onclick: () => leave(true) }, "×");
  const panel = h("section", {
    class: "magnifier", id: uid, role: "dialog", "aria-modal": "false", "aria-labelledby": `${uid}-title`, hidden: true,
  },
  h("div", { class: "magnifier__head" }, title, close),
  body);

  button.setAttribute("aria-controls", uid);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-pressed", "false");
  scene.append(panel);

  // ---- the plants that can be inspected ----
  function plants() { return [...scene.querySelectorAll(PLANT)]; }

  function mark() {
    for (const img of scene.querySelectorAll(".plant")) {
      const subject = subjects[img.dataset.plant];
      if (!subject || !on) {
        img.removeAttribute("data-inspect");
        img.removeAttribute("role");
        img.removeAttribute("tabindex");
        img.removeAttribute("aria-label");
        img.classList.remove("plant--inspect");
        continue;
      }
      img.setAttribute("data-inspect", img.dataset.plant);
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      img.setAttribute("aria-label", `Magnify ${t(subject.title)}`);
      img.classList.add("plant--inspect");
    }
  }

  function bedOf(img) { return img.closest("[data-bed]")?.dataset.bed; }

  function focusPlant(img) {
    if (!img) return;
    last = { plant: img.dataset.plant, bed: bedOf(img) };
    img.focus({ preventScroll: true });
  }

  function findLast() {
    if (!last) return null;
    return scene.querySelector(`[data-bed="${last.bed}"] ${PLANT}[data-plant="${last.plant}"]`) || null;
  }

  // ---- the panel ----
  function render(subjectId, sprite) {
    const out = compare(inspect, subjectId);
    if (!out) return;
    const subject = out.subject;
    const ref = subjects[inspect.reference];
    title.textContent = t(subject.title);
    const pair = h("div", { class: "magnifier__pair" },
      h("figure", { class: "magnifier__fig" },
        h("img", { class: "magnifier__sprite", src: sprite || subject.sprite, alt: "", width: 128, height: 128 }),
        h("figcaption", {}, t(subject.title))),
      out.rows.length > 0 && h("figure", { class: "magnifier__fig magnifier__fig--ref" },
        h("img", { class: "magnifier__sprite", src: ref.sprite, alt: "", width: 128, height: 128 }),
        h("figcaption", {}, t(ref.title))));
    const table = out.rows.length > 0 && h("table", { class: "magnifier__table" },
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, "Feature"),
        h("th", { scope: "col" }, "This plant"),
        h("th", { scope: "col" }, "Shop label"),
        h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Match")))),
      h("tbody", {}, out.rows.map((row) => h("tr", { class: row.same ? "magnifier__row--same" : "magnifier__row--diff" },
        h("th", { scope: "row" }, row.name),
        h("td", {}, row.subject),
        h("td", {}, row.reference),
        h("td", { class: "magnifier__mark", "aria-label": row.same ? "same" : "different" }, row.same ? "=" : "≠")))));
    // (no table when there's nothing to compare: replaceChildren would print "false")
    body.replaceChildren(...[pair, table].filter(Boolean), h("p", { class: out.rows.length ? "magnifier__verdict" : "magnifier__note" }, t(out.verdict)));
    panel.hidden = false;
  }

  function hidePanel() {
    panel.hidden = true;
    shown = null;
  }

  // Click, tap or Enter/Space: show the plant and unlock what it unlocks.
  function inspectPlant(img) {
    const id = img.dataset.plant;
    const subject = subjects[id];
    if (!subject) return;
    focusPlant(img);
    sfx("magnifier-look");
    shown = id;
    render(id, img.getAttribute("src"));
    if (subject.unlocks) dispatch({ type: "check", id: subject.unlocks });
  }

  // ---- mode ----
  function enter() {
    on = true;
    sfx("magnifier-on");
    root.classList.add("is-magnifying");
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-pressed", "true");
    mark();
    focusPlant(findLast() || plants()[0]);
  }

  function leave(returnFocus) {
    if (!on) return;
    sfx("magnifier-off");
    const inside = panel.contains(document.activeElement) || scene.contains(document.activeElement);
    on = false;
    root.classList.remove("is-magnifying");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-pressed", "false");
    hidePanel();
    mark();
    if (returnFocus || inside) button.focus({ preventScroll: true });
  }

  function open() { if (on) leave(false); else enter(); }

  // ---- events (delegated: the plant elements are replaced on every render) ----
  function onClick(ev) {
    if (!on) return;
    const img = ev.target.closest?.(PLANT);
    if (!img || !scene.contains(img)) return;
    ev.preventDefault();
    inspectPlant(img);
  }

  function onKey(ev) {
    if (!on || ev.defaultPrevented) return;
    if (ev.key === "Escape") {
      ev.preventDefault(); // the level view's shortcut listener skips handled keys
      leave(true);
      return;
    }
    const img = document.activeElement?.closest?.(PLANT);
    if (!img || !scene.contains(img)) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      inspectPlant(img);
      return;
    }
    const list = plants();
    const i = list.indexOf(img);
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[ev.key];
    if (to == null || list.length === 0) return;
    ev.preventDefault();
    focusPlant(list[(to + list.length) % list.length]);
  }

  // Fine pointers only: hovering a plant previews it; leaving goes back to what was chosen.
  function onOver(ev) {
    if (!on || !finePointer()) return;
    const img = ev.target.closest?.(PLANT);
    if (!img || !scene.contains(img) || img.dataset.plant === shown) return;
    render(img.dataset.plant, img.getAttribute("src"));
  }
  function onOut(ev) {
    if (!on || !finePointer()) return;
    const img = ev.target.closest?.(PLANT);
    if (!img || img.dataset.plant === shown) return;
    if (shown) render(shown, scene.querySelector(`${PLANT}[data-plant="${shown}"]`)?.getAttribute("src"));
    else panel.hidden = true;
  }

  scene.addEventListener("click", onClick);
  scene.addEventListener("pointerover", onOver);
  scene.addEventListener("pointerout", onOut);
  document.addEventListener("keydown", onKey);

  return {
    open,
    update(state) {
      // The reveal is about the garden: put the glass away so it doesn't cover the outcome.
      if (state.phase === "reveal") { leave(false); return; }
      if (!on) return;
      mark();
      // The beds were just rebuilt; the plant the player was on is a new element now.
      if (!scene.contains(document.activeElement) && !panel.contains(document.activeElement)) {
        const img = findLast();
        if (img) img.focus({ preventScroll: true });
      }
    },
    destroy() {
      on = false;
      root.classList.remove("is-magnifying");
      panel.remove();
      scene.removeEventListener("click", onClick);
      scene.removeEventListener("pointerover", onOver);
      scene.removeEventListener("pointerout", onOut);
      document.removeEventListener("keydown", onKey);
    },
  };
});
