// Snip: tap each marked spot with the tool; a piece pops off and falls.
//   { kind: "snip", item?: "snips" | "<art>", spot?: "leaf" | "<art>", target, count }
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "snip",
  mode: "tap",
  spot: (a) => a.spot || "leaf",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Snip the ${a.count} ${n.thing(a.spot || "leaf", a.count)} on the ${n.list(a.targets)}`,
  done: (a, n, tg) => `Snipped the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, spot, face }) {
    const tool = spawn(layer, face(), at.x + 18, at.y - 16, "act__fx--tool act__fx--small");
    const piece = spawn(layer, art(spot || "leaf", { size: 22 }), at.x, at.y);
    await burst([tool, piece], () => Promise.all([
      play(tool, [
        { transform: "translate(-50%, -50%) rotate(-20deg) scale(0.6)" },
        { transform: "translate(-50%, -50%) rotate(10deg) scale(0.6)", offset: 0.4 },
        { transform: "translate(-50%, -50%) rotate(-20deg) scale(0.6)", opacity: 0 },
      ], { duration: reduced ? 120 : 420 }),
      play(piece, [
        { transform: "translate(-50%, -50%)" },
        { transform: "translate(-50%, -50%) translate(-6px, -14px) rotate(-30deg)", offset: 0.4 },
        { transform: "translate(-50%, -50%) translate(-20px, 40px) rotate(-160deg)", opacity: 0 },
      ], { duration: reduced ? 120 : 520, delay: reduced ? 0 : 140, easing: "ease-in" }),
    ]));
  },
};
