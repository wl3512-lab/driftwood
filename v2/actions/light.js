// Light (Level 5): tap a lantern and the match goes there; the flame catches in a few
// stepped flickers and the lantern swaps to its lit art.
//   { kind: "light", item?: "l5-match", target: { prop }, fills?: { to: "l5-lantern-lit" } }
import { play, spawn, burst } from "./fx.js";
import { art } from "./sprites.js";

export default {
  kind: "light",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Tap the ${n.list(a.targets)} to light it`,
  done: (a, n, tg) => `The ${n.target(tg)} is lit.`,
  async animate(layer, at, { reduced, face }) {
    const tool = spawn(layer, face(), at.x - 10, at.y + 6, "act__fx--tool act__fx--small");
    const flame = spawn(layer, art("l5-lantern-lit", { size: 40 }), at.x, at.y);
    flame.style.opacity = "0";
    await burst([tool, flame], () => Promise.all([
      play(tool, [
        { transform: "translate(-50%, -50%) rotate(-30deg)" },
        { transform: "translate(-50%, -50%) rotate(0deg)", offset: 0.5 },
        { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 0 },
      ], { duration: reduced ? 120 : 700, easing: "steps(4, end)" }),
      // The catch: on, off, on, as a pixel flame does (no smooth glow).
      play(flame, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }],
        { duration: reduced ? 120 : 600, delay: reduced ? 0 : 300, easing: "steps(1, end)" }),
    ]));
  },
  land({ a, tg, last, swap }) {
    if (last && tg.prop) swap(tg, a.fills?.to || "l5-lantern-lit");
  },
};
