// Water-row (Level 4): tap the row and the can goes there; it tips, a pixel stream of
// water pours from the spout to the soil, splashes, and a dark wet patch soaks
// outward in steps. With `soak`, the player then holds until the ring fills.
//   { kind: "water-row", item?: "can", target, soak?: 1200 }
// The stream and drops reuse Level 3's liquid look (.l3-jet, .l3-drop in
// v2/css/l3-spray.css, loaded here the way spray.js loads it), so water looks
// the same in every level. Reduced motion: no travel, a short still stream.
import { play, spawn, burst, clearLabels } from "./fx.js";
import { patch } from "./l4-px.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-l3-spray-css]")) {
  const link = Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/l3-spray.css", import.meta.url).href,
  });
  link.dataset.l3SprayCss = "";
  document.head.append(link);
}

function div(cls, style = "") {
  const el = document.createElement("div");
  el.className = cls;
  if (style) el.style.cssText = style;
  return el;
}

export default {
  kind: "water-row",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: () => "watering can",
  say: (a, n) => `Tap the ${n.list(a.targets)} to water it${a.soak ? ", then hold it to soak the row" : ""}`,
  done: (a, n, tg) => `The ${n.target(tg)} is soaked.`,
  async animate(layer, at, { reduced, face }) {
    const soil = at.y + Math.min(at.h * 0.18, 26);
    const top = soil - Math.min(96, Math.max(60, at.h * 0.5));
    const can = spawn(layer, face(), at.x - 18, top, "act__fx--tool");
    // The spout of the tipped can sits up and to the right of its centre.
    const sx = Math.round(at.x + 10);
    const sy = Math.round(top + 6);
    const fall = Math.max(24, Math.round(soil - sy));
    // The jet is drawn lying left to right from its start: turned 90° it pours straight down.
    const stream = div("l3-jet", `left:${sx}px; top:${sy}px; width:${fall}px; transform:translateY(-50%) rotate(90deg)`);
    const wide = Math.round(Math.min(at.w * 0.55, 150));
    const wet = patch(wide, 12, "#4a2f1a", "position:absolute; opacity:.0;");
    wet.style.left = `${at.x - wide / 2 + 10}px`;
    wet.style.top = `${soil - 4}px`;
    const splash = reduced ? [] : Array.from({ length: 6 }, () => spawn(layer, div("l3-drop"), sx, soil - 2, "l3-splash"));
    layer.append(wet, stream);
    const ms = reduced ? 220 : 1500;
    // A result label in the stream's way fades for the pour.
    const clear = clearLabels(layer, [can, stream, wet], { reduced });
    await clear.hide();
    await burst([can, stream, wet, ...splash], () => Promise.all([
      play(can, [
        { transform: "translate(-50%, -50%) rotate(0deg)" },
        { transform: "translate(-50%, -50%) rotate(40deg)", offset: 0.15 },
        { transform: "translate(-50%, -50%) rotate(44deg)", offset: 0.8 },
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 0 },
      ], { duration: ms, easing: "steps(6, end)" }),
      // The stream reveals from the spout in pixel steps, flows, then cuts off.
      (async () => {
        await play(stream, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: reduced ? 80 : 260, delay: reduced ? 0 : ms * 0.15, easing: "steps(6, end)" });
        await play(stream, [{ backgroundPosition: "0 0" }, { backgroundPosition: "24px 0" }], { duration: 240, iterations: reduced ? 1 : Math.max(1, Math.round((ms * 0.55) / 240)), easing: "steps(4, end)" });
        await play(stream, [{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 60 : 120, easing: "steps(2, end)" });
      })(),
      play(wet, [
        { opacity: 0, transform: "scaleX(0.2)" },
        { opacity: 0.55, transform: "scaleX(0.4)", offset: 0.3 },
        { opacity: 0.6, transform: "scaleX(1)", offset: 0.85 },
        { opacity: 0.6, transform: "scaleX(1)" },
      ], { duration: ms, easing: "steps(5, end)" }),
      ...splash.map((d, i) => {
        const side = i % 2 ? 1 : -1;
        const r = 12 + (i % 3) * 8;
        return play(d, [
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 0 },
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 1, offset: 0.1 },
          { transform: `translate(-50%, -50%) translate(${side * r}px, -${10 + (i % 3) * 5}px)`, opacity: 1, offset: 0.55 },
          { transform: `translate(-50%, -50%) translate(${side * r * 1.3}px, 6px)`, opacity: 0 },
        ], { duration: 520, delay: 420 + i * 120, easing: "steps(5, end)" });
      }),
    ]));
    await clear.show();
  },
  land({ tg, last, stamp }) {
    if (!last) return;
    // The soil stays dark where it soaked in, then dries back over a few seconds.
    const m = stamp(tg, patch(96, 14, "#4a2f1a", "opacity:.45;"), { cls: "l4-mark l4-mark--wet" });
    try { m?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 4000, easing: "steps(4, end)", fill: "forwards" }).finished.then(() => m.remove(), () => {}); } catch (_) { /* no WAAPI: it stays */ }
  },
};
