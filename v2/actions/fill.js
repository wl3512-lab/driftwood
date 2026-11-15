// Fill: tap each container and the source goes there; it tips in, the container
// bounces, and its art swaps to the filled sprite.
//   { kind: "fill", item, target, fills: { from?, to }, count? }
import { sprite } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "fill",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Tap the ${n.list(a.targets)} to fill it with the ${n.item(a.item)}`,
  done: (a, n, tg) => `Filled the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face, el }) {
    const top = at.y - Math.max(36, at.h * 0.6);
    const tool = spawn(layer, face(), at.x, top, "act__fx--tool");
    const bits = Array.from({ length: reduced ? 2 : 7 }, () => spawn(layer, sprite("clod", { size: 9 }), at.x + 18, top + 18));
    await burst([tool, ...bits], () => Promise.all([
      play(tool, [
        { transform: "translate(-50%, -50%) rotate(0deg)" },
        { transform: "translate(-50%, -50%) rotate(55deg)", offset: 0.3 },
        { transform: "translate(-50%, -50%) rotate(55deg)", offset: 0.8 },
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 0 },
      ], { duration: reduced ? 150 : 900 }),
      ...bits.map((b, i) => play(b, [
        { transform: "translate(-50%, -50%)", opacity: 0 },
        { opacity: 1, offset: 0.1 },
        { transform: `translate(-50%, -50%) translate(${-18 + (i % 3) * 6}px, ${at.y - top}px)`, opacity: 0 },
      ], { duration: reduced ? 120 : 380, delay: reduced ? 0 : 200 + i * 60, easing: "ease-in" })),
      el ? play(el, [{ scale: "1" }, { scale: "1.08 0.92", offset: 0.85 }, { scale: "1" }],
        { duration: reduced ? 100 : 900, fill: "none" }) : null,
    ]));
  },
  // The container shows its filled art once its last drop is in.
  land({ a, tg, last, swap }) {
    if (last && a.fills?.to) swap(tg, a.fills.to);
  },
};
