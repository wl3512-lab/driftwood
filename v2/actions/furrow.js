// Furrow (Level 4): drag the hoe to each mark down the row; it scrapes in
// pixel steps, clods hop, and an open furrow is left in the soil (the marks
// join into one furrow running down the bed).
//   { kind: "furrow", item: "l4-hoe", target: [{ spot, bed }, …] }
import { sprite } from "./sprites.js";
import { play, spawn, burst, rand } from "./fx.js";
import { fadeMarks, turned } from "./l4-px.js";

export default {
  kind: "furrow",
  mode: "drag",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Drag the ${n.item(a.item)} along the row: ${a.targets.length} marks in the ${n.bed(a.targets[0].bed)}`,
  done: (a, n, tg) => `Furrow dug at the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const sweep = Math.round(Math.min(at.h, 56) * 0.8);
    const tool = spawn(layer, face(), at.x + 14, at.y - sweep / 2 - 10, "act__fx--tool");
    const r = rand(Math.round(at.x));
    const clods = Array.from({ length: reduced ? 1 : 5 }, () => spawn(layer, sprite("clod", { size: 10 }), at.x, at.y + 6));
    await burst([tool, ...clods], () => Promise.all([
      play(tool, [
        { transform: "translate(-50%, -50%) translateY(0) rotate(-10deg)" },
        { transform: `translate(-50%, -50%) translateY(${sweep}px) rotate(6deg)`, offset: 0.45 },
        { transform: `translate(-50%, -50%) translateY(${sweep * 0.2}px) rotate(-10deg)`, offset: 0.7 },
        { transform: `translate(-50%, -50%) translateY(${sweep}px) rotate(6deg)`, opacity: 0 },
      ], { duration: reduced ? 140 : 820, easing: "steps(8, end)" }),
      ...clods.map((c, i) => {
        const dx = (r() - 0.5) * 28;
        return play(c, [
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 0 },
          { transform: `translate(-50%, -50%) translate(${dx * 0.6}px, -22px)`, opacity: 1, offset: 0.4 },
          { transform: `translate(-50%, -50%) translate(${dx}px, 4px)`, opacity: 0 },
        ], { duration: reduced ? 120 : 420, delay: reduced ? 0 : 120 + i * 90, easing: "steps(6, end)" });
      }),
    ]));
  },
  land({ a, tg, stamp, artNode }) {
    stamp(tg, turned(artNode("l4-furrow", 56)), { cover: true, cls: "act-mark--cover l4-mark l4-mark--furrow" });
    // Every mark dug: the tape's guide line has done its job.
    if (document.querySelectorAll(".act-marks .l4-mark--furrow").length >= a.targets.length) fadeMarks(".l4-guide", { delay: 200 });
  },
};
