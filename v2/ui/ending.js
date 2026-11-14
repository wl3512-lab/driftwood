// The ending: the finished garden (cozy) over the complete AI field guide (CRT),
// with a copyable text version of the guide.
import { h, focusFirst, announce } from "./dom.js";
import { starText } from "./map.js";
import { finishedPlot } from "./finished-garden.js";

const CAUGHT = "✓";
const FOOLED = "✗";

// The guide card saved for a level (first-play result), if any.
function cardFor(progress, id) {
  return (progress?.guide || []).find((c) => c.levelId === id) || null;
}

// Levels in map order that have been played, with their card and record.
function entries(progress, map, levels) {
  return map
    .map((m) => ({ meta: m, level: levels[m.id], record: progress?.levels?.[m.id], card: cardFor(progress, m.id) }))
    .filter((e) => e.level && e.record);
}

function wasFooled(entry) {
  if (entry.card && typeof entry.card.fooled === "boolean") return entry.card.fooled;
  return Boolean(entry.record?.fooled);
}

// Plain text of the field guide, for sharing. Unplayed levels are left out.
export function shareText(progress, map, levels, url) {
  const played = entries(progress, map, levels);
  const caught = played.filter((e) => !wasFooled(e)).length;
  const lines = played.map((e) => {
    const fooled = wasFooled(e);
    const tip = e.card?.tip || e.level.reveal.tip;
    return `${fooled ? FOOLED : CAUGHT} ${e.level.reveal.flaw}${fooled ? " (fooled me)" : ""}: ${tip}`;
  });
  return [
    "My AI field guide from Driftwood",
    `I caught ${caught} of ${map.length} AI flaws.`,
    "",
    ...lines,
    "",
    `Play it: ${url}`,
  ].join("\n");
}

// The share link: this page's folder, with any query dropped.
export function shareUrl(href) {
  try { return new URL("./", href).href; } catch { return href; }
}

function plotCard(entry) {
  const plot = finishedPlot(entry.level, entry.record);
  const stars = entry.record.stars;
  return h("li", { class: `ending__plot ${plot?.caught ? "ending__plot--caught" : "ending__plot--fooled"}` },
    plot ? h("img", { class: "ending__plant", src: plot.src, alt: plot.alt, width: 64, height: 64 }) : null,
    h("img", { class: "ending__helper", src: entry.meta.sprite, alt: "", width: 40, height: 40 }),
    h("p", { class: "ending__plot-title" }, `${entry.meta.number}. ${entry.meta.title}`),
    h("p", { class: "ending__plot-helper" }, `with ${entry.meta.helper}`),
    h("p", { class: "ending__plot-stars", role: "img", "aria-label": `${stars} of 3 stars` }, starText(stars)));
}

function guideCard(entry) {
  const fooled = wasFooled(entry);
  const r = entry.level.reveal;
  return h("li", { class: `guide__card ending__card ${fooled ? "ending__card--fooled" : "ending__card--caught"}` },
    h("p", { class: "crt__kicker" }, `${entry.meta.helper} · level ${entry.meta.number}`),
    h("h3", {}, r.flaw),
    r.flawGloss ? h("p", { class: "ending__gloss" }, r.flawGloss) : null,
    h("p", { class: "ending__tip" }, entry.card?.tip || r.tip),
    r.realWorld ? h("p", { class: "ending__where" }, h("strong", {}, "Where you'll meet it: "), r.realWorld) : null,
    h("p", { class: "ending__badge" }, fooled ? "It fooled you" : "You caught it"));
}

// Copies text; resolves true on success, false when the clipboard is missing or refused.
async function copyText(text, clipboard) {
  if (!clipboard?.writeText) return false;
  try { await clipboard.writeText(text); return true; } catch { return false; }
}

export function renderEnding(root, { progress, map, levels, onBack, name = "friend", href = location.href, clipboard = navigator.clipboard }) {
  const played = entries(progress, map, levels);
  const caught = played.filter((e) => !wasFooled(e)).length;
  const stars = played.reduce((sum, e) => sum + (e.record.stars || 0), 0);
  const text = shareText(progress, map, levels, shareUrl(href));

  const status = h("p", { class: "ending__status", role: "status", "aria-live": "polite" });
  const fallback = h("div", { class: "ending__fallback", hidden: true });
  const copyBtn = h("button", { class: "btn btn--crt", onclick: async () => {
    const ok = await copyText(text, clipboard);
    if (ok) {
      status.textContent = "Copied. Paste it anywhere.";
      fallback.hidden = true;
      announce("Copied. Paste it anywhere.");
      return;
    }
    status.textContent = "";
    const area = h("textarea", { class: "ending__text", readonly: true, rows: Math.min(12, text.split("\n").length + 1), "aria-label": "Your field guide as text" }, text);
    fallback.replaceChildren(area, h("p", { class: "ending__hint" }, "Press Ctrl+C / ⌘C to copy."));
    fallback.hidden = false;
    area.focus();
    area.select();
    // Focus alone can leave most of the textarea below the fold on a landscape phone.
    if (typeof area.scrollIntoView === "function") area.scrollIntoView({ block: "center", behavior: "instant" });
    announce("Select the text and press Ctrl C or Command C to copy.");
  } }, "Copy my field guide");

  root.replaceChildren(
    h("main", { class: "ending" },
      h("section", { class: "ending__garden", "aria-labelledby": "ending-garden" },
        h("h1", { class: "map__title", id: "ending-garden", tabindex: -1, "data-autofocus": true }, `${name}'s garden`),
        h("p", { class: "map__sub" }, "Five plots, five helpers, one finished garden."),
        h("ol", { class: "ending__plots" }, played.map(plotCard))),
      h("section", { class: "crt ending__guide", "aria-labelledby": "ending-guide" },
        h("h2", { class: "crt__title crt__title--small", id: "ending-guide" }, "AI FIELD GUIDE"),
        h("p", { class: "crt__line ending__score" }, `You caught ${caught} of ${map.length} · ★ ${stars}/${map.length * 3}`),
        h("ul", { class: "guide__cards ending__cards" }, played.map(guideCard)),
        h("div", { class: "ending__share" },
          copyBtn,
          status,
          fallback),
        h("button", { class: "btn btn--crt", onclick: onBack }, "← Back to the garden"))));
  focusFirst(root);
}
