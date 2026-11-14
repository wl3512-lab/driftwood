// Pick: tap each fruit (or weed) on the plant; it pops off and drops away.
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

const SPOT = { wildberry: "berry", blueberry: "berry", tomato: "fruit", pumpkin: "fruit", weed: "weed" };

export default {
  kind: "pick",
  mode: "tap",
  spot: (a) => a.spot || SPOT[a.targets[0]?.plant] || "berry",
  noun: () => "hand",
  say: (a, n) => {
    const what = a.spot === "weed" ? "weeds" : n.plural(a.targets[0]?.plant || "berry");
    return `Tap the ${a.count} ${what} in the ${n.list(a.targets)} to pick them`;
  },
  done: (a, n, tg) => `Picked them all in the ${n.bed(tg.bed)}.`,
  async animate(layer, at, { reduced, spot }) {
    const fruit = spawn(layer, art(spot || "berry", { size: 22 }), at.x, at.y);
    await burst([fruit], () => play(fruit, [
      { transform: "translate(-50%, -50%) translate(0, 0) scale(1)" },
      { transform: "translate(-50%, -50%) translate(6px, -22px) scale(1.25)", offset: 0.35 },
      { transform: "translate(-50%, -50%) translate(14px, 30px) scale(0.6)", opacity: 0 },
    ], { duration: reduced ? 120 : 460, easing: "ease-out" }));
  },
};
