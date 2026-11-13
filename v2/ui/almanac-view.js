// The almanac: a high-tech book, a pixel-art device with a glowing screen,
// shown as a non-modal panel over the scene. Every level has one. Its first
// screen page holds that level's fact cards (level.evidence, rendered and kept
// current by the level view, passed in as ctx.cards): the cards live in the
// book, not on the garden, so checking a helper's claim is a deliberate look.
// Level 2 adds a searchable book (level.almanac) under the cards: a search box
// and a row of page tabs. Document tools (ui/tools.js definePage, e.g. Level
// 4's planting log) are further screen pages, switched by the device's ◀ ▶
// buttons and page tabs along the bottom bezel.
// Registered with ui/tools.js; the level view owns the toolbar button and the
// "/" shortcut and calls open() to toggle the panel, or open(pageId) for a
// page's own key.
//
// Ways in and around:
//   keyboard  "/" opens (search box focused) · a page's key opens on that page
//             · ←/→ (or ↑/↓, Home/End) move between tabs, Tab walks them · Esc closes
//   mouse     the Almanac button, the device buttons, the tabs, the × button
//   touch     the same buttons (44px+); the first tab gets focus, not the
//             search box, so the keyboard doesn't jump up on open
// Focus goes back to the Almanac button whenever the panel closes from inside.
// Showing a book page whose id is a locked evidence card dispatches check(id),
// and the level view pops and announces the card. Reading the cards list
// itself checks nothing: a locked card stays locked until its tool unlocks it.
import { h, finePointer } from "./dom.js";
import { defineTool } from "./tools.js";
import { keyCap } from "./shortcuts.js";
import { searchAlmanac } from "../mechanics/almanac.js";

let panels = 0; // unique ids if a level is ever mounted twice

defineTool("almanac", ({ level, scene, button, dispatch, getState, t, cards, pages = [] }) => {
  const book = level.almanac || { title: "Almanac", pages: [], notFound: "" };
  const searchable = book.pages.length > 0;
  const lockedIds = new Set(level.evidence.filter((e) => e.locked).map((e) => e.id));
  const uid = `almanac-${++panels}`;
  let shown = null; // the book page on display, or null

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

  // Screen page 1: the fact cards (and Level 2's searchable book).
  const cardsSheet = h("div", { class: "almanac__sheet", "data-sheet": "cards" },
    h("h2", { class: "almanac__title", id: `${uid}-title` }, t(book.title)),
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

  // Every screen page: the cards first, then one per document page.
  const sheets = [
    { id: "cards", title: "Fact cards", el: cardsSheet },
    ...pages.map((p) => ({
      id: p.id, title: p.view.title, key: p.key, view: p.view,
      el: h("div", { class: "almanac__sheet", "data-sheet": p.id, hidden: true },
        h("h2", { class: "almanac__title" }, p.view.title),
        p.view.body),
    })),
  ];
  let current = "cards";
  const sheetTabs = sheets.map((s) => h("button", {
    type: "button", class: "almanac__sheet-tab", "data-sheet": s.id, "aria-pressed": String(s.id === "cards"),
    onclick: () => showSheet(s.id, true),
  }, s.title, s.key && finePointer() && h("kbd", { class: "kbd", "aria-hidden": "true" }, keyCap(s.key))));
  const multi = sheets.length > 1;
  const flip = (dir, label, glyph) => h("button", {
    type: "button", class: "almanac__flip", "aria-label": label,
    onclick: () => showSheet(sheets[(sheets.findIndex((s) => s.id === current) + dir + sheets.length) % sheets.length].id, true),
  }, glyph);
  const status = h("span", { class: "almanac__status-page" });

  const panel = h("section", {
    class: "almanac", id: uid, role: "dialog", "aria-modal": "false", "aria-label": t(book.title), hidden: true,
  },
  h("div", { class: "almanac__bezel" },
    h("span", { class: "almanac__status", "aria-hidden": "true" },
      h("span", { class: "almanac__led" }), "ALMANAC", status),
    close),
  h("div", { class: "almanac__screen" }, sheets.map((s) => s.el)),
  multi && h("div", { class: "almanac__controls", role: "group", "aria-label": "Almanac pages" },
    flip(-1, "Previous page", "◀"),
    h("div", { class: "almanac__sheet-tabs" }, sheetTabs),
    flip(1, "Next page", "▶")));

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
    for (const row of [tabs, sheetTabs]) {
      const i = row.indexOf(document.activeElement);
      if (i < 0) continue;
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: row.length - 1 }[ev.key];
      if (to == null) return;
      ev.preventDefault();
      const next = row[(to + row.length) % row.length];
      next.focus();
      next.click();
      return;
    }
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

  // Put one screen page on the device. `fromTab`: the player switched pages
  // inside the book, so focus stays on the device's own controls.
  function showSheet(id, fromTab) {
    const sheet = sheets.find((s) => s.id === id) || sheets[0];
    current = sheet.id;
    for (const s of sheets) s.el.hidden = s !== sheet;
    for (const tb of sheetTabs) tb.setAttribute("aria-pressed", String(tb.dataset.sheet === sheet.id));
    status.textContent = multi ? ` · page ${sheets.indexOf(sheet) + 1}/${sheets.length}` : "";
    panel.querySelector(".almanac__screen").scrollTop = 0;
    if (sheet.id === "cards") clearNews();
    if (fromTab) {
      const tb = sheetTabs.find((x) => x.dataset.sheet === sheet.id);
      if (!panel.contains(document.activeElement) || !document.activeElement.matches(".almanac__flip")) tb?.focus({ preventScroll: true });
    }
    sheet.view?.show(getState());
  }

  function clearNews() {
    button.classList.remove("tool--news");
    sheetTabs[0]?.classList.remove("almanac__sheet-tab--news");
  }

  // open() toggles the book on its fact cards; open(id) toggles it on that page.
  function open(id) {
    if (!panel.hidden && (id == null || current === id)) { hide(false); return; }
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    showSheet(id || "cards", false);
    if (current !== "cards" || !searchable) close.focus({ preventScroll: true });
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
  showSheet("cards", false);
  return {
    open,
    // A card just unlocked: mark the book (and its cards tab) unless the cards are on screen.
    markNews() {
      if (!panel.hidden && current === "cards") return;
      button.classList.add("tool--news");
      if (multi) sheetTabs[0].classList.add("almanac__sheet-tab--news");
    },
    update(state) {
      // The reveal is about the garden: put the book away so it doesn't cover the outcome.
      if (state.phase === "reveal") hide(false);
      for (const s of sheets) s.view?.update?.(state);
    },
    destroy() { panel.remove(); },
  };
});
