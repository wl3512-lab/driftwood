// Collect: drag each loose item into a container; it plops in, and the
// container shows its filled art on the last one.
//   { kind: "collect", item: "<loose item art>", target: container, count, fills?: { from?, to } }
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "collect",
  mode: "drag",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Drag ${a.count > 1 ? `${a.count} ${n.thing(a.item, a.count)}` : `the ${n.item(a.item)}`} into the ${n.list(a.targets)}`,
  done: (a, n, tg) => `The ${n.target(tg)} is full.`,
  async animate(layer, at, { reduced, face, el }) {
    const it = spawn(layer, face(), at.x, at.y - Math.max(40, at.h * 0.6), "act__fx--tool act__fx--small");
    await burst([it], () => Promise.all([
      play(it, [
        { transform: "translate(-50%, -50%) translateY(0) scale(1)" },
        { transform: `translate(-50%, -50%) translateY(${Math.max(40, at.h * 0.6)}px) scale(0.7)`, offset: 0.7 },
        { transform: `translate(-50%, -50%) translateY(${Math.max(40, at.h * 0.6)}px) scale(0.3)`, opacity: 0 },
      ], { duration: reduced ? 120 : 460, easing: "ease-in" }),
      el ? play(el, [{ scale: "1" }, { scale: "1.1 0.88", offset: 0.75 }, { scale: "1" }],
        { duration: reduced ? 100 : 520, fill: "none" }) : null,
    ]));
  },
  land({ a, tg, last, swap }) {
    if (last && a.fills?.to) swap(tg, a.fills.to);
  },
};
