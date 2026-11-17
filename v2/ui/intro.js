// The splash: the DRIFTWOOD title over Rowan's stew dinner at night. A new player's
// Begin goes straight into the opening cutscene, where Master Rowan asks
// their name (ui/cutscene.js); there is no separate name screen.
import { h, focusFirst } from "./dom.js";
import { blockText } from "./block-type.js";
import { mountWorld } from "./world.js";
import { playThorns } from "./thorns.js";
import { WIZARD } from "../levels/wizard.js";
import { pixelSvg, potMap, VASES, BERRY_BOWL, SALAD, TEA } from "./story-art.js";
import { MAP } from "../levels/index.js";
import { soundToggle } from "../audio/toggle.js";

// Night over the garden (world.js time 4: stars and the moon) and Master
// Rowan's stew dinner laid out in it: Rowan behind the pot, the five helpers
// at the table. Everyone sways; the helpers glitch in turn; the salad, berries,
// flowers and stew slowly rot, then a glitch snaps them back to fresh and it
// starts again. css/splash.css runs all of it (and stills it for reduced motion).
const SCENE_TIME = 4;
const SEATS = [9, 22, 76, 87, 96]; // pets in level order: two left of Rowan, three right
const PETS = ["mango", "luna", "ember", "biscuit", "bugs"];
// A rotten copy of a pixel map: colours sink toward brown and grey, and mould
// specks take over some cells (same cells every time, so it doesn't flicker).
const MOULD = { "1": "#9fae74", "2": "#c9cfb0", "3": "#5e6a3a" };
function rotten({ rows, pal }) {
  const mix = (hex) => {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const k = 0.58, br = [92, 70, 40];
    const c = [r, g, b].map((v, i) => Math.round((v * (1 - k) + br[i] * k) * 0.8));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  const rp = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, k === "k" ? v : mix(v)]));
  const rr = rows.map((row, y) => [...row].map((c, x) => {
    if (c === "." || c === "k") return c;
    const hsh = (x * 73856093 ^ y * 19349663) >>> 0;
    return hsh % 9 === 0 ? "1" : hsh % 13 === 0 ? "2" : hsh % 17 === 0 ? "3" : c;
  }).join(""));
  return { rows: rr, pal: { ...rp, ...MOULD } };
}
function dish(map, cls, x) {
  const d = h("div", { class: `splash__dish ${cls}`, style: `--x:${x}%` });
  d.innerHTML = pixelSvg(map.rows, map.pal, { cls: "px fresh" }) + pixelSvg(rotten(map).rows, rotten(map).pal, { cls: "px rot" });
  return d;
}
function scene() {
  return h("div", { class: "splash__dinner", "aria-hidden": "true" },
    MAP.map((m, i) => h("img", { class: `splash__pet splash__pet--${PETS[i]}`, src: m.sprite, alt: "", style: `--x:${SEATS[i]}%` })),
    h("img", { class: "splash__wiz", src: WIZARD.sprite, alt: "" }),
    h("div", { class: "splash__table" }),
    h("div", { class: "splash__ontable" },
      dish(SALAD, "splash__dish--salad", 16),
      dish(VASES.sunflower, "splash__dish--vase", 33),
      h("div", { class: "splash__dish splash__dish--pot", style: "--x:56%" },
        h("div", { class: "splash__steam" }, [0, 1, 2].map((i) => h("i", { style: `--d:${i * 0.45}s;--sx:${22 + i * 26}%` }))),
        (() => { const d = h("div"); const m = potMap(); d.innerHTML = pixelSvg(m.rows, m.pal, { cls: "px fresh" }) + pixelSvg(rotten(m).rows, rotten(m).pal, { cls: "px rot" }); return d; })()),
      h("img", { class: "splash__lantern", src: "art/l5-lantern-lit.svg", alt: "", style: "--x:44%" }),
      dish(VASES.flower, "splash__dish--vase splash__dish--meadow", 69),
      dish(BERRY_BOWL, "splash__dish--berries", 82),
      dish(TEA, "splash__dish--tea", 93)));
}
// Mounts the sky once the screen is in the document; the returned function stops it.
function sky(main, time) {
  const world = mountWorld(main, { time, beam: false });
  return () => world.destroy();
}

let splashShown = false; // the title builds in, cell by cell, the first time only

// saved: { name, done, total } for a returning player, who gets Continue and
// New game (with a second "are you sure" tap); null for a first visit (Begin).
export function renderSplash(root, { onBegin: begin, onNew: startOver = () => {}, saved = null }) {
  // Begin, Continue and "Yes, start over" grow v1's red thorn vines first.
  let leaving = false;
  const through = (go) => () => { if (leaving) return; leaving = true; playThorns(go); };
  const onBegin = through(begin), onNew = through(startOver);
  const choices = h("div", { class: "splash__btns" });
  const showChoices = () => {
    choices.replaceChildren(
      h("div", { class: "splash__row" },
        h("button", { class: "btn btn--crt btn--gold", "data-autofocus": true, "data-sfx": "begin", onclick: onBegin }, "Continue ▸"),
        h("button", { class: "btn btn--crt splash__new", "data-sfx": "ui-tap", onclick: confirmNew }, "New game")),
      h("p", { class: "splash__save" }, `${saved.name}'s garden · ${saved.done} of ${saved.total} levels`));
  };
  const confirmNew = () => {
    choices.replaceChildren(
      h("p", { class: "splash__save splash__warn", id: "splash-warn" }, "Start over? Your garden and field guide get erased."),
      h("div", { class: "splash__row" },
        h("button", { class: "btn btn--crt btn--gold", "aria-describedby": "splash-warn", "data-sfx": "begin", onclick: onNew }, "Yes, start over"),
        h("button", { class: "btn btn--crt splash__new", "data-autofocus": true, "data-sfx": "ui-back", onclick: () => { showChoices(); focusFirst(choices); } }, "Keep my garden")));
    focusFirst(choices);
  };
  if (saved) showChoices();
  else choices.append(h("button", { class: "btn btn--crt btn--gold", "data-autofocus": true, "data-sfx": "begin", onclick: onBegin }, "Begin ▸"));
  const main = h("main", { class: "world splash" },
    h("div", { class: "splash__sign" },
      h("p", { class: "splash__by" }, "A game by Lucy Liu"),
      h("h1", { class: "crt__title crt__title--block" }, blockText("DRIFTWOOD", {
        fill: "#fff6dc", shadow: "#c62828", align: "left", // cream letters, a red split (css/splash.css adds the cyan)
        build: !splashShown && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      })),
      h("p", { class: "crt__line" }, "A short game about the AI helpers we trust."),
      choices),
    scene(),
    soundToggle({ className: "snd--float" }));
  root.replaceChildren(main);
  splashShown = true;
  const stop = sky(main, SCENE_TIME);
  focusFirst(root);
  return stop;
}
