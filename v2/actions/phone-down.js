// Phone down (Level 5): drag the glowing phone out of your hand and onto a
// spot or prop (the porch step); it flips face down there, glow off, and stays.
//   { kind: "phone-down", item?: "l5-phone-glow", target: { prop } | { spot }, fills?: { to: "l5-phone-down" } }
import { play, spawn, burst } from "./fx.js";
import { art } from "./sprites.js";

export default {
  kind: "phone-down",
  mode: "drag",
  noun: () => "phone",
  say: (a, n) => `Put the phone down: drag it to the ${n.list(a.targets)}`,
  done: (a, n, tg) => `The phone is face down on the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const lit = spawn(layer, face(), at.x, at.y - 10, "act__fx--tool");
    const down = spawn(layer, art("l5-phone-down", { size: 44 }), at.x, at.y - 10);
    down.style.opacity = "0";
    // A flip in stepped frames: squash the lit face to a line, then the back appears.
    await burst([lit, down], () => Promise.all([
      play(lit, [
        { transform: "translate(-50%, -50%) scaleX(1)" },
        { transform: "translate(-50%, -50%) scaleX(0.1)", opacity: 1, offset: 0.99 },
        { transform: "translate(-50%, -50%) scaleX(0.1)", opacity: 0 },
      ], { duration: reduced ? 100 : 360, easing: "steps(3, end)" }),
      play(down, [
        { transform: "translate(-50%, -50%) scaleX(0.1)", opacity: 1 },
        { transform: "translate(-50%, -50%) translateY(10px) scaleX(1)", opacity: 1 },
      ], { duration: reduced ? 100 : 360, delay: reduced ? 100 : 360, easing: "steps(3, end)" }),
    ]));
  },
  land({ a, tg, last, stamp, artNode }) {
    if (last) stamp(tg, artNode(a.fills?.to || "l5-phone-down", 40), { cls: "act-mark--stand" });
  },
};
