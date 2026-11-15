// Measure (Level 4): drag the tape measure onto the bed; the tape runs out
// down it in pixel steps and leaves a dotted guide line where the row goes
// (down the middle: Level 4's row-a…row-c spots sit on it).
//   { kind: "measure", item: "l4-tape-measure", target: { bed } }
import { play, spawn, burst } from "./fx.js";
import { block } from "./l4-px.js";

export default {
  kind: "measure",
  mode: "drag",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Drag the ${n.item(a.item)} to the ${n.list(a.targets)} to mark the row`,
  done: (a, n, tg) => `Row marked across the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const run = Math.round(Math.min(at.h * 0.58, 320));
    const y0 = at.y + at.h * 0.02 - run / 2;
    const tool = spawn(layer, face(), at.x, y0, "act__fx--tool");
    // The tape: yellow with ink ticks every 8 px, running down in steps.
    const tape = block(6, run, "background:repeating-linear-gradient(180deg,#3b2a1a 0 2px,#f0c850 2px 8px); box-shadow:2px 0 0 #c9a530; transform-origin:50% 0;");
    tape.style.left = `${at.x - 3}px`;
    tape.style.top = `${y0}px`;
    layer.append(tape);
    const ms = reduced ? 160 : 900;
    await burst([tool, tape], () => Promise.all([
      play(tape, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)", offset: 0.6 }, { transform: "scaleY(1)", opacity: 1, offset: 0.85 }, { transform: "scaleY(1)", opacity: 0 }],
        { duration: ms, easing: "steps(10, end)" }),
      play(tool, [
        { transform: "translate(-50%, -50%) translateY(0)" },
        { transform: `translate(-50%, -50%) translateY(${run}px)`, offset: 0.6 },
        { transform: `translate(-50%, -50%) translateY(${run}px)`, opacity: 0 },
      ], { duration: ms, easing: "steps(10, end)" }),
    ]));
  },
  land({ tg, last, stamp }) {
    if (!last) return;
    // The guide runs down the middle of the bed (the row spots sit on it).
    const line = document.createElement("div");
    line.className = "l4-guide";
    line.style.cssText = "width:0; height:58%; margin-top:2%; border-left:4px dotted #3b2a1a; opacity:.6;";
    stamp(tg, line, { cover: true, cls: "act-mark--cover l4-mark l4-mark--guide" });
  },
};
