// Close (Level 5): tap a gate and the hand goes there; it pushes the gate shut in stepped
// frames and the gate swaps to its closed art.
//   { kind: "close", item?: "hand", target: { prop }, fills?: { to: "l5-gate-closed" } }
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "close",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Tap the ${n.list(a.targets)} to shut it`,
  done: (a, n, tg) => `Shut the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face, el }) {
    const hand = spawn(layer, face(), at.x - Math.max(20, at.w * 0.4), at.y, "act__fx--tool act__fx--small");
    await burst([hand], () => Promise.all([
      play(hand, [
        { transform: "translate(-50%, -50%) translateX(0)" },
        { transform: `translate(-50%, -50%) translateX(${Math.max(20, at.w * 0.6)}px)`, offset: 0.7 },
        { transform: `translate(-50%, -50%) translateX(${Math.max(20, at.w * 0.6)}px)`, opacity: 0 },
      ], { duration: reduced ? 120 : 640, easing: "steps(5, end)" }),
      el ? play(el, [{ scale: "1 1" }, { scale: "0.7 1", offset: 0.6 }, { scale: "1 1" }],
        { duration: reduced ? 100 : 640, easing: "steps(4, end)", fill: "none" }) : null,
    ]));
  },
  land({ a, tg, last, swap }) {
    if (last && tg.prop) swap(tg, a.fills?.to || "l5-gate-closed");
  },
};
