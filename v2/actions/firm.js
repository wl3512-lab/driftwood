// Firm: tap the bed and your hand goes there; it pats the soil down twice.
import { sprite } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "firm",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: () => "hand",
  say: (a, n) => `Tap the ${n.list(a.targets)} to firm the soil`,
  done: (a, n, tg) => `Firmed the soil in the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const hand = spawn(layer, face(), at.x, at.y - 10, "act__fx--tool");
    const dust = spawn(layer, sprite("clod", { size: 18 }), at.x, at.y + 26);
    await burst([hand, dust], () => Promise.all([
      play(hand, [
        { transform: "translate(-50%, -50%) translateY(-14px)" },
        { transform: "translate(-50%, -50%) translateY(6px) scaleY(0.9)", offset: 0.3 },
        { transform: "translate(-50%, -50%) translateY(-10px)", offset: 0.55 },
        { transform: "translate(-50%, -50%) translateY(6px) scaleY(0.9)", offset: 0.8 },
        { transform: "translate(-50%, -50%) translateY(-12px)", opacity: 0 },
      ], { duration: reduced ? 150 : 700 }),
      play(dust, [
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.4, 0.6)", opacity: 0.8, offset: 0.35 },
        { transform: "translate(-50%, -50%) scale(2, 0.4)", opacity: 0 },
      ], { duration: reduced ? 150 : 700 }),
    ]));
  },
};
