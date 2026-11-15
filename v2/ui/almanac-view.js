// The almanac: a wooden seed shelf, opened as a modal over the level (a small
// square icon button, the page behind dimmed and inert, the dock sliding down).
// Chosen by Lucy as "Almanac Option A" in
// docs/design-options/2026-11-13-almanac-cutscene/options.html.
//
// The shelf holds one big seed packet per plant across all five levels
// (levels/plants.js, rules in mechanics/shelf.js). A packet from a level the
// player hasn't reached is locked: a silhouette stamped "Level N". Tapping (or
// Enter on) an open packet lifts it to the middle and turns it over (reduced
// motion: a crossfade) to its back: the plant's name, its FACT CARD (the
// level's evidence card, the one thing to check a helper against), how it
// grows, care rows (a row that repeats the fact card is hidden), "Watch for",
// and a strip of when to plant, harvest, soil and good neighbours.
//
// A card that is locked in this level (Level 3's warning before the
// magnifier, Level 4's label before the log) shows only its hint on the back,
// so the packet gives nothing away early. Turning over a packet whose id is a
// page of the level's book (Level 2) is looking it up: it dispatches
// check(id), which unlocks the card there and then.
//
// Level 2 also gets a "Look up a plant" box on top of the shelf: typing marks
// the matching packet, Enter (or Look up) turns it over. A document page
// (ui/tools.js definePage, Level 4's planting log) is the book's COVER: a tab
// beside "Seed shelf" in the header, and the page the book opens on.
//
// Ways in and around:
//   keyboard  "/" opens (on the cover, else the shelf, with the search box
//             focused in Level 2) · Tab walks the packets · Enter turns one
//             over · Esc turns it back, Esc again closes · ←/→ move between tabs
//   mouse     the Almanac button, the tabs, the packets, the × button, the backdrop
//   touch     the same (44px+); nothing auto-focuses a text box
// Focus goes back to the Almanac button whenever the book closes from inside.
import { h, finePointer } from "./dom.js";
import { defineTool } from "./tools.js";
import { blockTitle } from "./block-type.js";
import { searchAlmanac } from "../mechanics/almanac.js";
import { shelfPackets, factCard, repeatsCard } from "../mechanics/shelf.js";
import { LEVELS } from "../levels/index.js";
import { sfx } from "../audio/index.js";

let panels = 0; // unique ids if a level is ever mounted twice

const levelByNumber = (n) => Object.values(LEVELS).find((l) => l.number === n);
const helperOf = (n) => levelByNumber(n)?.helper?.name || "the almanac";
const art = (name) => `./art/${name}.svg`;
// Dark or light ink on a packet's colour band.
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? "#1d140b" : "#fff6dc";
}

// 7×7 pixel icons for the back's labels.
const ICONS = {
  sun: ["...#...", ".#.#.#.", "..###..", "#######", "..###..", ".#.#.#.", "...#..."],
  water: ["...#...", "..###..", "..###..", ".#####.", ".#####.", ".#####.", "..###.."],
  space: [".......", "#.....#", "##...##", "#######", "##...##", "#.....#", "......."],
  tip: ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", "#.....#"],
  lock: ["..###..", ".#...#.", ".#...#.", "#######", "###.###", "###.###", "#######"],
  seed: [".......", "...#...", "..###..", ".#####.", ".#####.", "..###..", "...#..."],
  basket: [".......", "..###..", ".#...#.", "#######", ".#####.", ".#####.", "..###.."],
  soil: ["...#...", "..#.#..", ".......", "#######", "#.#.#.#", "#######", ".#.#.#."],
  pals: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#...", "......."],
};
const SVG = "http://www.w3.org/2000/svg";
function icon(name) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "ico");
  svg.setAttribute("viewBox", "0 0 7 7");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("shape-rendering", "crispEdges");
  ICONS[name].forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== "#") return;
    const r = document.createElementNS(SVG, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", 1); r.setAttribute("height", 1);
    svg.append(r);
  }));
  return svg;
}

// ---- a seed packet's front (the shelf's button; the cutscene's radish) ----
// attrs go on the element (a <button> unless `as` says otherwise). `band` and
// `meta` replace the usual "SEEDS · LV n" and "FROM <helper>" lines.
export function packetFront(plant, { locked = false, isNew = false, tilt = 0, as = "button", band = null, meta = null, attrs = {} } = {}) {
  const note = plant.kind === "note";
  return h(as, {
    ...attrs,
    class: `pk${locked ? " pk--locked" : ""}${note ? " pk--note" : ""}${attrs.class ? ` ${attrs.class}` : ""}`,
    "data-plant": plant.id,
    style: `--c: ${plant.color}; --c-ink: ${inkFor(plant.color)}; --tilt: ${tilt}deg`,
  },
  h("span", { class: "pk__crimp", "aria-hidden": "true" }),
  h("span", { class: "pk__band", "aria-hidden": "true" }, band || (locked ? (note ? "NOTES" : "SEEDS") : `${note ? "NOTES" : "SEEDS"} · LV ${plant.level}`)),
  h("span", { class: "pk__win", "aria-hidden": "true" }, h("img", { src: art(plant.art || plant.stages.at(-1)), alt: "", width: 32, height: 32 })),
  h("span", { class: "pk__name", "aria-hidden": "true" }, locked ? "???" : plant.name.toUpperCase()),
  h("span", { class: "pk__meta", "aria-hidden": "true" }, meta || (locked ? " " : `FROM ${helperOf(plant.level).toUpperCase()}`)),
  locked && h("span", { class: "pk__stamp", "aria-hidden": "true" }, icon("lock"), `LEVEL ${plant.level}`),
  isNew && !locked && h("span", { class: "pk__new", "aria-hidden": "true" }, "NEW"),
  h("span", { class: "pk__dot", "aria-hidden": "true" }));
}

// ---- the back of a packet ----
const sunny = (line) => {
  const parts = String(line).split(/\s*(☀+)/);
  return parts.map((part) => (/^☀+$/.test(part)
    ? h("span", { class: "fact__suns", role: "img", "aria-label": `${part.length} suns` }, [...part].map(() => icon("sun")))
    : part));
};

// card: { title, lines, lockedLine, evidence } (mechanics/shelf.js factCard),
// or null for no fact card. `kicker` replaces "LEVEL n · <HELPER>'S GARDEN";
// `extra` goes inside the fact card, under its lines (the cutscene's crossed-out
// claim); no onFlipBack, no Flip back button (the cutscene's packet).
export function packetBack(plant, { card = null, t = (x) => x, pop = false, onFlipBack = null, kicker = null, extra = null } = {}) {
  const lines = (card?.lines || []).map(t);
  const sealed = Boolean(card?.lockedLine); // locked in this level: show only the hint
  const helper = helperOf(plant.level);
  const note = plant.kind === "note";
  const cardTitle = card && t(card.title);
  const fact = card && h("div", {
    class: `fact${sealed ? " fact--locked" : ""}${pop && !sealed ? " fact--fresh" : ""}`,
    "data-evidence": card.evidence,
  },
  h("span", { class: "fact__tab" }, icon("tip"), "FACT CARD"),
  cardTitle && cardTitle !== plant.name && h("p", { class: "fact__title" }, cardTitle),
  sealed
    ? h("p", { class: "fact__locked" }, t(card.lockedLine))
    : h("p", { class: "fact__lines" }, lines.map((line, i) => [
      i > 0 && h("span", { class: "fact__dot", "aria-hidden": "true" }, " · "),
      h("span", { class: "fact__line" }, sunny(line)),
    ])),
  extra);
  const names = plant.stageNames || ["Seed", "Growing", "Thriving"];
  const stages = plant.stages.length > 0 && h("div", { class: "back__grows" },
    h("p", { class: "back__lab" }, "HOW IT GROWS"),
    h("ol", { class: "stages" }, plant.stages.map((s, i) => [
      i > 0 && h("li", { class: "stages__arrow", "aria-hidden": "true" }, "→"),
      h("li", {}, h("img", { src: art(s), alt: "", width: 32, height: 32 }), h("span", {}, names[i])),
    ])));
  const keep = (v) => v && !repeatsCard(v, lines);
  const watch = !sealed && plant.watch && keep(plant.watch[1]) && h("div", { class: "watch" },
    h("img", { src: art(plant.watch[0]), alt: "", width: 32, height: 32 }),
    h("p", {}, h("b", {}, "WATCH FOR"), plant.watch[1]));
  const careRows = sealed ? [] : [["sun", "SUN", plant.sun], ["water", "WATER", plant.water], ["space", "SPACE", plant.space], ["tip", "TIP", plant.tip]]
    .filter(([, , v]) => keep(v));
  const care = careRows.length > 0 && h("div", { class: "back__care" },
    h("p", { class: "back__lab" }, "CARE"),
    h("dl", { class: "care" }, careRows.map(([ic, label, v]) => h("div", {}, h("dt", {}, icon(ic), label), h("dd", {}, v)))));
  const moreRows = sealed ? [] : [["seed", "PLANT", plant.plant], ["basket", "HARVEST", plant.harvest], ["soil", "SOIL", plant.soil], ["pals", "GOOD NEXT TO", plant.pals]]
    .filter(([, , v]) => keep(v));
  const more = moreRows.length > 0 && h("dl", { class: "more" },
    moreRows.map(([ic, label, v]) => h("div", {}, h("dt", {}, icon(ic), label), h("dd", {}, v))));
  const left = (stages || watch) && h("div", { class: "back__col" }, stages, watch);
  return h("div", {
    class: `back${note ? " back--note" : ""}`, role: "group", tabindex: -1,
    "aria-label": `${plant.name}, back of the ${note ? "note" : "packet"}`, "data-plant": plant.id,
    style: `--c: ${plant.color}`,
  },
  h("div", { class: "back__top" },
    h("div", { class: "back__heading" },
      h("p", { class: "back__kick" }, kicker || `LEVEL ${plant.level} · ${helper.toUpperCase()}'S GARDEN`),
      h("h3", { class: "back__name" }, h("span", { class: "back__swatch", "aria-hidden": "true" }), plant.name.toUpperCase())),
    onFlipBack && h("button", { type: "button", class: "back__flip", "data-flipback": "", onclick: onFlipBack }, "↻ Flip back")),
  fact,
  (left || care) && h("div", { class: "back__body" }, left, care),
  more);
}

defineTool("almanac", ({ level, scene, button, dispatch, getState, t, pages = [], reached = level.number }) => {
  const book = level.almanac || { title: "Almanac", pages: [], notFound: "" };
  const searchable = book.pages.length > 0;
  const bookIds = new Set(book.pages.map((p) => p.id));
  const lockedIds = new Set(level.evidence.filter((e) => e.locked).map((e) => e.id));
  const uid = `almanac-${++panels}`;
  const calm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const news = new Set(); // packets whose card unlocked and haven't been turned over since
  const packets = shelfPackets(reached, level.number);
  const open = packets.filter((p) => !p.locked);
  // Level 2's search finds the book's pages first (their keywords: "peppermint"
  // is mint), then any open packet by name; a locked packet stays unfindable.
  const findable = [...book.pages, ...open.filter((p) => !bookIds.has(p.plant.id)).map(({ plant }) =>
    ({ id: plant.id, title: plant.name, keywords: [plant.id, ...plant.name.toLowerCase().split(/[^a-z]+/)] }))];

  // ---- the shelf ----
  const buttons = packets.map(({ plant, locked, isNew }, i) => {
    const live = level.evidence.some((e) => e.id === plant.id);
    const note = plant.kind === "note";
    const label = locked
      ? `Locked packet. Reach Level ${plant.level} to open it.`
      : `${plant.name}, ${note ? "note" : "seed packet"} from Level ${plant.level}. Turn it over to read it.`;
    const btn = packetFront(plant, {
      locked, isNew, tilt: ((i % 3) - 1) * 1.4,
      attrs: {
        type: "button", "data-evidence": live ? plant.id : null,
        "aria-disabled": locked ? "true" : null, "aria-label": label,
        onclick: () => (locked ? nope(btn, plant) : turnOver(btn, plant)),
      },
    });
    return btn;
  });
  const byId = (id) => buttons.find((b) => b.dataset.plant === id);
  const shelf = h("div", { class: "shelf", role: "group", "aria-label": "Seed packets" }, buttons);

  // Level 2's book: look a plant up by name.
  const input = searchable && h("input", {
    id: `${uid}-q`, type: "search", class: "almanac__q", autocomplete: "off", spellcheck: "false",
    maxlength: 40, placeholder: "e.g. mint", enterkeyhint: "search",
  });
  const none = searchable && h("p", { class: "almanac__none", role: "status" });
  const search = searchable && h("form", {
    class: "almanac__search", role: "search",
    onsubmit: (e) => { e.preventDefault(); lookUp(input.value, true); },
  },
  h("label", { for: input.id, class: "almanac__label" }, "Look up a plant"),
  h("div", { class: "almanac__row" }, input, h("button", { type: "submit", class: "btn almanac__go" }, "Look up")),
  none);
  if (input) input.addEventListener("input", () => lookUp(input.value, false));

  const shelfSheet = h("div", { class: "almanac__sheet almanac__sheet--shelf", "data-sheet": "shelf" }, search, shelf);

  // Every screen page: a document page is the cover (first), the shelf comes after it.
  const sheets = [
    ...pages.map((p) => ({
      id: p.id, title: p.view.title, view: p.view,
      hint: "Your own record of what you planted.",
      el: h("div", { class: "almanac__sheet almanac__sheet--cover", "data-sheet": p.id, hidden: true },
        h("div", { class: "monitor" },
          h("h3", { class: "almanac__cover-title" }, p.view.title),
          p.view.body)),
    })),
    { id: "shelf", title: "Seed shelf", hint: "Tap a packet to turn it over.", el: shelfSheet },
  ];
  const first = sheets[0].id;
  const multi = sheets.length > 1;
  let current = first;
  const sheetTabs = sheets.map((s) => h("button", {
    type: "button", class: "almanac__sheet-tab", "data-sheet": s.id, "aria-pressed": String(s.id === first),
    onclick: () => showSheet(s.id, true),
  }, s.title));
  const shelfTab = sheetTabs.find((tb) => tb.dataset.sheet === "shelf");

  const close = h("button", { type: "button", class: "almanac__close", "aria-label": "Close almanac", onclick: () => hide(true) }, "×");
  const hint = h("p", { class: "almanac__hint" });
  const head = h("header", { class: "almanac__head" },
    h("div", { class: "almanac__sign" },
      blockTitle("SEED SHELF", { fill: "#3b2a1a", className: "almanac__sign-type" }),
      h("h2", { class: "sr-only", id: `${uid}-title` }, t(book.title)),
      hint),
    multi && h("div", { class: "almanac__sheet-tabs", role: "group", "aria-label": "Almanac pages" }, sheetTabs),
    h("span", { class: "almanac__count" }, `${open.length} / ${packets.length}`, h("span", { class: "almanac__count-word" }, " PACKETS")),
    close);
  const screen = h("div", { class: "almanac__screen" }, sheets.map((s) => s.el));
  const toast = h("p", { class: "almanac__toast", role: "status", hidden: true });

  const panel = h("section", {
    class: "almanac", id: uid, role: "dialog", "aria-modal": "false", "aria-labelledby": `${uid}-title`, hidden: true,
  }, head, screen, toast);

  button.setAttribute("aria-controls", uid);
  button.setAttribute("aria-expanded", "false");
  // The book opens as a modal: a native <dialog> (showModal) dims the whole
  // page behind it (garden and dock), makes it inert and holds focus inside.
  // Clicking the dimmed backdrop, × or Esc closes it.
  const dialog = h("dialog", { class: "almanac-dialog", "aria-label": t(book.title) }, panel);
  (scene.parentElement || scene).append(dialog);
  dialog.addEventListener("cancel", (ev) => { ev.preventDefault(); if (inspecting) turnBack(); else hide(true); }); // Esc
  dialog.addEventListener("click", (ev) => { if (ev.target === dialog) hide(true); }); // the backdrop
  let closing = null; // the close animation's timer
  // While the book is open the dock slides down out of view (CSS:
  // .level.is-reading), inert and hidden from screen readers; it slides back
  // up as the book fades out.
  const stage = scene.parentElement; // the .level screen
  function dockAway(away) {
    const dock = stage?.querySelector(".dock");
    stage?.classList.toggle("is-reading", away);
    if (!dock) return;
    dock.inert = away;
    if (away) dock.setAttribute("aria-hidden", "true");
    else dock.removeAttribute("aria-hidden");
  }

  panel.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault(); // the level view's shortcut listener skips handled keys
      if (inspecting) turnBack(); else hide(true);
      return;
    }
    const i = sheetTabs.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: sheetTabs.length - 1 }[ev.key];
    if (to == null) return;
    ev.preventDefault();
    const next = sheetTabs[(to + sheetTabs.length) % sheetTabs.length];
    next.focus();
    next.click();
  });

  // ---- Level 2: the search box marks a packet; Enter turns it over ----
  function lookUp(query, submitted) {
    for (const b of buttons) b.classList.remove("pk--found");
    none.textContent = "";
    if (!query.trim()) return;
    const page = searchAlmanac(findable, query);
    const btn = page && byId(page.id);
    if (btn) {
      btn.classList.add("pk--found");
      btn.scrollIntoView?.({ block: "nearest" });
      if (submitted) turnOver(btn, packets.find((p) => p.plant.id === page.id).plant);
    } else if (submitted || query.trim().length >= 3) {
      none.textContent = t(book.notFound);
    }
  }

  // ---- a locked packet shakes and says when it opens ----
  let toastTimer = null;
  function nope(btn, plant) {
    sfx("almanac-locked");
    btn.classList.remove("pk--nope");
    void btn.offsetWidth; // restart the shake
    if (!calm()) btn.classList.add("pk--nope");
    toast.textContent = `Reach Level ${plant.level} to open this packet.`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
  }

  // ---- the back of a packet (packetBack, below) ----
  function backFor(plant, pop) {
    const card = factCard(plant, level, LEVELS, getState().checks);
    return packetBack(plant, { card, t, pop, onFlipBack: () => turnBack() });
  }

  // ---- turning a packet over: lift it to the middle edge-on, swap in the
  // back (also edge-on, so the swap is invisible), turn the back in. ----
  let inspecting = null; // { btn, plant, layer, back, pkt, clone, dx, dy, closing }
  const FALLBACK_MS = 700; // every wait has a timeout, even if an animation is cancelled

  function settle(anim, then) {
    let done = false;
    const run = () => { if (!done) { done = true; clearTimeout(timer); then(); } };
    const timer = setTimeout(run, FALLBACK_MS);
    anim.finished.then(run, run);
  }

  function turnOver(btn, plant) {
    clearTimeout(toastTimer);
    toast.hidden = true;
    if (inspecting || panel.hidden) return;
    sfx("almanac-flip");
    // Turning over a page of the level's book is looking it up (Level 2).
    if (bookIds.has(plant.id) && lockedIds.has(plant.id)) dispatch({ type: "check", id: plant.id });
    const pop = news.has(plant.id) || (bookIds.has(plant.id) && lockedIds.has(plant.id));
    news.delete(plant.id);
    btn.classList.remove("pk--fresh", "pk--found");
    const back = backFor(plant, pop);
    const dim = h("div", { class: "inspect__dim", onclick: () => turnBack() });
    // The packet is a 3D object: the back is its face, with two paper sheets
    // stacked behind it (its thickness). .pkt turns (the flip), .pkt__tilt leans (rest + mouse).
    const pkt = h("div", { class: "pkt" }, h("div", { class: "pkt__tilt" },
      h("i", { class: "pkt__rear", "aria-hidden": "true" }),
      h("i", { class: "pkt__rear pkt__rear--2", "aria-hidden": "true" }),
      back,
      h("i", { class: "pkt__sheen", "aria-hidden": "true" })));
    const layer = h("div", { class: "inspect" }, dim, pkt);
    if (!calm() && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      layer.addEventListener("pointermove", (ev) => {
        const r = layer.getBoundingClientRect();
        pkt.style.setProperty("--mx", ((ev.clientX - r.left) / r.width - 0.5).toFixed(3));
        pkt.style.setProperty("--my", ((ev.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    }
    head.inert = true;
    screen.inert = true;
    panel.append(layer);
    const pr = panel.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const state = { btn, plant, layer, back, pkt, clone: null, dx: 0, dy: 0, closing: false };
    inspecting = state;
    const focusBack = () => back.querySelector("[data-flipback]")?.focus({ preventScroll: true });
    if (calm() || !back.animate) {
      layer.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      focusBack();
      return;
    }
    const clone = btn.cloneNode(true);
    clone.className = `${btn.className} pk--clone`;
    clone.removeAttribute("aria-label");
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    Object.assign(clone.style, { left: `${br.left - pr.left}px`, top: `${br.top - pr.top}px`, width: `${br.width}px`, height: `${br.height}px` });
    layer.append(clone);
    btn.style.visibility = "hidden";
    state.clone = clone;
    state.dx = pr.width / 2 - (br.left - pr.left + br.width / 2);
    state.dy = pr.height / 2 - (br.top - pr.top + br.height / 2);
    pkt.style.visibility = "hidden";
    dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 440, fill: "both" });
    const lift = clone.animate([
      { transform: "translate(0, 0) perspective(900px) rotateY(0deg) scale(1)" },
      { transform: `translate(${state.dx}px, ${state.dy}px) perspective(900px) rotateY(90deg) scale(1.4)` },
    ], { duration: 220, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
    settle(lift, () => {
      if (inspecting !== state || state.closing) return;
      clone.style.visibility = "hidden";
      pkt.style.visibility = "";
      pkt.animate([
        { transform: "rotateY(-90deg) scale(.8)" },
        { transform: "rotateY(0deg) scale(1)" },
      ], { duration: 220, easing: "cubic-bezier(0, 0, .2, 1)" });
      focusBack();
    });
  }

  // Back onto the shelf (`now`: no animation, e.g. the book is closing).
  function turnBack(now = false) {
    const st = inspecting;
    if (!st || (st.closing && !now)) return;
    st.closing = true;
    if (!now) sfx("almanac-flip-back");
    const done = () => {
      if (inspecting !== st) return;
      inspecting = null;
      st.layer.remove();
      st.btn.style.visibility = "";
      head.inert = false;
      screen.inert = false;
      if (!panel.hidden) st.btn.focus({ preventScroll: true });
    };
    if (now || calm() || !st.clone) {
      if (now || !st.layer.animate) { done(); return; }
      settle(st.layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" }), done);
      return;
    }
    st.layer.querySelector(".inspect__dim").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 440, fill: "forwards" });
    const away = st.pkt.animate([
      { transform: "rotateY(0deg) scale(1)" },
      { transform: "rotateY(-90deg) scale(.8)" },
    ], { duration: 200, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
    settle(away, () => {
      if (inspecting !== st) return;
      st.pkt.style.visibility = "hidden";
      st.clone.style.visibility = "visible";
      settle(st.clone.animate([
        { transform: `translate(${st.dx}px, ${st.dy}px) perspective(900px) rotateY(90deg) scale(1.4)` },
        { transform: "translate(0, 0) perspective(900px) rotateY(0deg) scale(1)" },
      ], { duration: 220, easing: "cubic-bezier(0, 0, .2, 1)", fill: "forwards" }), done);
    });
  }

  // ---- pages and opening ----
  // `fromTab`: the player switched pages inside the book, so focus stays on
  // the tabs. `quiet`: set up only (at mount), so a page's show() (the log's
  // check) never runs until the player has actually opened the book.
  function showSheet(id, fromTab, quiet = false) {
    const sheet = sheets.find((s) => s.id === id) || sheets[0];
    current = sheet.id;
    for (const s of sheets) s.el.hidden = s !== sheet;
    for (const tb of sheetTabs) tb.setAttribute("aria-pressed", String(tb.dataset.sheet === sheet.id));
    hint.textContent = sheet.hint;
    screen.scrollTop = 0;
    if (sheet.id === "shelf") shelfTab?.classList.remove("almanac__sheet-tab--news");
    if (fromTab) sfx("almanac-tab");
    if (fromTab) sheetTabs.find((x) => x.dataset.sheet === sheet.id)?.focus({ preventScroll: true });
    if (!quiet) sheet.view?.show(getState());
  }

  // open() toggles the book, always on its first page (the cover, else the shelf).
  function openBook() {
    if (closing) finishHide(true);
    if (!panel.hidden) { hide(false); return; }
    sfx("almanac-open");
    panel.hidden = false;
    dialog.classList.remove("almanac-dialog--closing");
    if (!dialog.open) dialog.showModal();
    dockAway(true);
    button.setAttribute("aria-expanded", "true");
    button.classList.remove("tool--news"); // the book is open; the packet and the shelf tab keep their own dots
    showSheet(first, false);
    if (current === "shelf" && input && finePointer()) input.focus({ preventScroll: true });
    else close.focus({ preventScroll: true });
  }

  // A short fade and shrink (none under reduced motion), then the book is put away.
  function hide(returnFocus, now = false) {
    if (panel.hidden || closing) return;
    sfx("almanac-close");
    if (now || calm()) { finishHide(returnFocus); return; }
    dockAway(false); // the dock slides back up while the book fades out
    dialog.classList.add("almanac-dialog--closing");
    closing = setTimeout(() => finishHide(returnFocus), 140);
  }

  function finishHide(returnFocus) {
    clearTimeout(closing);
    closing = null;
    if (panel.hidden) return;
    const inside = panel.contains(document.activeElement);
    turnBack(true);
    panel.hidden = true;
    toast.hidden = true;
    dialog.classList.remove("almanac-dialog--closing");
    if (dialog.open) dialog.close();
    dockAway(false);
    // A card unlocked on the cover but the shelf was never looked at: the book keeps the dot.
    if (shelfTab?.classList.contains("almanac__sheet-tab--news")) button.classList.add("tool--news");
    button.setAttribute("aria-expanded", "false");
    if (returnFocus || inside) button.focus({ preventScroll: true });
  }

  function update(state) {
    for (const b of buttons) {
      const id = b.dataset.evidence;
      if (!id) continue;
      b.classList.toggle("pk--sealed", lockedIds.has(id) && !state.checks.includes(id));
      b.classList.toggle("pk--fresh", news.has(id));
    }
  }

  showSheet(first, false, true);
  update(getState());
  return {
    open: openBook,
    // Cards just unlocked: dot their packets (and the book, if it's shut, and
    // the shelf tab, if the shelf isn't showing). A card turned over right now
    // pops on the packet's back instead.
    markNews(ids = []) {
      for (const id of ids) {
        if (inspecting?.plant.id === id && !inspecting.closing) {
          inspecting.back.querySelector(".fact")?.replaceWith(backFor(inspecting.plant, true).querySelector(".fact"));
          continue;
        }
        news.add(id);
      }
      if (news.size === 0) return;
      if (panel.hidden) button.classList.add("tool--news");
      if (multi && (panel.hidden || current !== "shelf")) shelfTab.classList.add("almanac__sheet-tab--news");
      update(getState());
    },
    update(state) {
      // The reveal is about the garden: put the book away so it doesn't cover the outcome.
      if (state.phase === "reveal") hide(false, true);
      update(state);
      for (const s of sheets) s.view?.update?.(state);
    },
    destroy() { clearTimeout(closing); clearTimeout(toastTimer); dialog.remove(); },
  };
});
