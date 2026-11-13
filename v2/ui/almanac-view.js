// The almanac: a non-modal panel over the scene. Every level has one, and it
// holds that level's fact cards (level.evidence, rendered and kept current by
// the level view, passed in as ctx.cards): the cards live in the book, not on
// the garden, so checking a helper's claim is a deliberate look. Level 2 adds
// a searchable book (level.almanac) under the cards: a search box and a row of
// page tabs. Registered with ui/tools.js; the level view owns the toolbar
// button and the "/" shortcut and calls open() to toggle the panel.
//
// Ways in and around:
//   keyboard  "/" opens (search box focused) · ←/→ (or ↑/↓, Home/End) move
//             between page tabs, Tab also walks them · Esc closes
//   mouse     the Almanac button, the tabs, the × button
//   touch     the same buttons (44px+); the first tab gets focus, not the
//             search box, so the keyboard doesn't jump up on open
// Focus goes back to the Almanac button whenever the panel closes from inside.
// Showing a page whose id is a locked evidence card dispatches check(id),
// and the level view pops and announces the card. Reading the cards list
// itself checks nothing: a locked card stays locked until its tool unlocks it.
import { h, finePointer } from "./dom.js";
import { defineTool } from "./tools.js";
import { searchAlmanac } from "../mechanics/almanac.js";

let panels = 0; // unique ids if a level is ever mounted twice

defineTool("almanac", ({ level, scene, button, dispatch, t, cards }) => {
  const book = level.almanac || { title: "Almanac", pages: [], notFound: "" };
  const searchable = book.pages.length > 0;
  const lockedIds = new Set(level.evidence.filter((e) => e.locked).map((e) => e.id));
  const uid = `almanac-${++panels}`;
  let shown = null; // the page on display, or null

  const input = h("input", {
    id: `${uid}-q`, type: "search", class: "almanac__q", autocomplete: "off", spellcheck: "false",
    maxlength: 40, placeholder: "e.g. mint", enterkeyhint: "search",
  });
  const tabs = book.pages.map((p) => h("button", {
    type: "button", class: "almanac__tab", "data-page": p.id, "aria-pressed": "false",
    onclick: () => show(p),
  }, t(p.title)));
  const result = h("div", { class: "almanac__page", id: `${uid}-page`, "aria-live": "polite" });
  const close = h("button", { type: "button", class: "almanac__close", "aria-label": "Close almanac", onclick: () => hide(true) }, "×");
  const panel = h("section", {
    class: "almanac", id: uid, role: "dialog", "aria-modal": "false", "aria-labelledby": `${uid}-title`, hidden: true,
  },
  h("div", { class: "almanac__head" },
    h("h2", { class: "almanac__title", id: `${uid}-title` }, t(book.title)),
    close),
  cards && h("div", { class: "almanac__cards" },
    h("p", { class: "almanac__label" }, "Fact cards"),
    cards),
  searchable && h("form", {
    class: "almanac__search", role: "search",
    onsubmit: (e) => { e.preventDefault(); lookUp(input.value, true); },
  },
  h("label", { for: input.id, class: "almanac__label" }, "Look up a plant"),
  h("div", { class: "almanac__row" }, input, h("button", { type: "submit", class: "btn almanac__go" }, "Look up"))),
  searchable && h("div", { class: "almanac__tabs", role: "group", "aria-label": "Pages" }, tabs),
  searchable && result);

  button.setAttribute("aria-controls", uid);
  button.setAttribute("aria-expanded", "false");
  scene.append(panel);

  // Typing looks up as you go; an empty box clears the page.
  input.addEventListener("input", () => lookUp(input.value, false));

  panel.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault(); // the level view's shortcut listener skips handled keys
      hide(true);
      return;
    }
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
    if (to == null) return;
    ev.preventDefault();
    const next = tabs[(to + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });

  function lookUp(query, submitted) {
    if (!query.trim()) { render(null, ""); return; }
    const page = searchAlmanac(book.pages, query);
    if (page) show(page);
    else if (submitted || query.trim().length >= 3) render(null, t(book.notFound));
    else render(null, "");
  }

  function show(page) {
    render(page);
    if (lockedIds.has(page.id)) dispatch({ type: "check", id: page.id });
  }

  function render(page, message = "") {
    shown = page;
    for (const tab of tabs) tab.setAttribute("aria-pressed", String(tab.dataset.page === page?.id));
    if (page) {
      result.replaceChildren(
        h("h3", { class: "almanac__page-title" }, t(page.title)),
        ...page.lines.map((line) => h("p", {}, t(line))));
    } else {
      result.replaceChildren(...(message ? [h("p", { class: "almanac__none" }, message)] : []));
    }
  }

  function open() {
    if (!panel.hidden) { hide(false); return; }
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    button.classList.remove("tool--news"); // the new card is in view now
    if (!searchable) close.focus({ preventScroll: true });
    else (finePointer() ? input : (tabs.find((tb) => tb.dataset.page === shown?.id) || tabs[0])).focus({ preventScroll: true });
  }

  function hide(returnFocus) {
    if (panel.hidden) return;
    const inside = panel.contains(document.activeElement);
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (returnFocus || inside) button.focus({ preventScroll: true });
  }

  render(null, "");
  return {
    open,
    // The reveal is about the garden: put the book away so it doesn't cover the outcome.
    update(state) { if (state.phase === "reveal") hide(false); },
    destroy() { panel.remove(); },
  };
});
