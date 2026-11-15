// Pull: tap each item (weeds, stones, unripe fruit) and it is yanked up and out.
//   { kind: "pull", spot: "weed" | "<art>", target, count, item?: "hand" }
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "pull",
  mode: "tap",
  spot: (a) => a.spot || "weed",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Pull the ${a.count} ${n.thing(a.spot || "weed", a.count)} out of the ${n.list(a.targets)}`,
  done: (a, n, tg) => `Cleared the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, spot }) {
    const it = spawn(layer, art(spot || "weed", { size: 26 }), at.x, at.y);
    await burst([it], () => play(it, [
      { transform: "translate(-50%, -50%) translateY(0) scaleY(1)" },
      { transform: "translate(-50%, -50%) translateY(4px) scaleY(0.8)", offset: 0.2 },
      { transform: "translate(-50%, -50%) translateY(-34px) scaleY(1.15)", offset: 0.55 },
      { transform: "translate(-50%, -50%) translate(40px, -70px) rotate(200deg)", opacity: 0 },
    ], { duration: reduced ? 120 : 520, easing: "ease-out" }));
  },
};
