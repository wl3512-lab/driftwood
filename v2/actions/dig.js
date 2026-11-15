// Dig: tap the bed and the trowel goes there; it scoops twice and clods of soil fly up.
import { sprite } from "./sprites.js";
import { play, spawn, burst, rand } from "./fx.js";

export default {
  kind: "dig",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: () => "trowel",
  say: (a, n) => `Tap the ${n.list(a.targets)} to dig`,
  done: (a, n, tg) => `Dug the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const tool = spawn(layer, face(), at.x, at.y - Math.min(30, at.h * 0.1), "act__fx--tool");
    const r = rand(at.x + 7);
    const clods = Array.from({ length: reduced ? 2 : 6 }, () => spawn(layer, sprite("clod", { size: 10 }), at.x, at.y + at.h * 0.05));
    await burst([tool, ...clods], () => Promise.all([
      play(tool, [
        { transform: "translate(-50%, -50%) rotate(0deg) translateY(0)" },
        { transform: "translate(-50%, -50%) rotate(-30deg) translateY(10px)", offset: 0.25 },
        { transform: "translate(-50%, -50%) rotate(10deg) translateY(-6px)", offset: 0.5 },
        { transform: "translate(-50%, -50%) rotate(-30deg) translateY(10px)", offset: 0.75 },
        { transform: "translate(-50%, -50%) rotate(0deg) translateY(-4px)", opacity: 0 },
      ], { duration: reduced ? 150 : 760 }),
      ...clods.map((c, i) => {
        const dx = (r() - 0.5) * at.w * 0.5;
        return play(c, [
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 0 },
          { transform: `translate(-50%, -50%) translate(${dx * 0.6}px, ${-at.h * 0.35}px)`, opacity: 1, offset: 0.45 },
          { transform: `translate(-50%, -50%) translate(${dx}px, ${at.h * 0.08}px)`, opacity: 0 },
        ], { duration: reduced ? 150 : 520, delay: reduced ? 0 : 180 + (i % 2) * 260, easing: "ease-out" });
      }),
    ]));
  },
};
