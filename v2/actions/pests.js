// Pests: tap each bug on the plant; it gets flicked off and spins away.
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "pests",
  mode: "tap",
  spot: (a) => a.spot || "bug",
  noun: (a) => (a.item === "hand" ? "hand" : "spray bottle"),
  say: (a, n) => `Tap the ${a.count} bugs in the ${n.list(a.targets)} to flick them off`,
  done: (a, n, tg) => `Cleared the bugs off the ${n.bed(tg.bed)}.`,
  async animate(layer, at, { reduced, spot }) {
    const bug = spawn(layer, art(spot || "bug", { size: 22 }), at.x, at.y);
    const side = at.x % 2 ? 1 : -1;
    await burst([bug], () => play(bug, [
      { transform: "translate(-50%, -50%) translate(0, 0) rotate(0deg)" },
      { transform: `translate(-50%, -50%) translate(${side * 60}px, -50px) rotate(${side * 540}deg)`, opacity: 0 },
    ], { duration: reduced ? 120 : 480, easing: "cubic-bezier(.2,.8,.4,1)" }));
  },
};
