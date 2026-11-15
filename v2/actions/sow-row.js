// Sow-row (Level 4): tap each mark down the open furrow; at each mark
// it tips and walks down the row while seeds drop in, pixel by pixel. The furrow
// shows its seeds, then closes over as the crop's own row takes the bed.
//   { kind: "sow-row", item: "seed-packet", target: [{ spot, bed }, …] }
import { sprite } from "./sprites.js";
import { play, spawn, burst, rand } from "./fx.js";
import { fadeMarks, turned } from "./l4-px.js";

export default {
  kind: "sow-row",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Sprinkle the seeds down the furrow in the ${n.bed(a.targets[0].bed)}: tap each mark`,
  done: (a, n, tg) => `Seeds in at the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const sweep = Math.round(Math.min(at.h, 56) * 0.9);
    const left = at.x - 30;
    const packet = spawn(layer, face(), left, at.y - sweep / 2, "act__fx--tool");
    const r = rand(Math.round(at.x * 5 + at.y));
    const n = reduced ? 3 : 12;
    const ms = reduced ? 180 : 1100;
    // Seeds leave the packet's mouth as it walks right, so each falls a little further along.
    const seeds = Array.from({ length: n }, (_, i) => spawn(layer, sprite("seed", { size: 9 }), left + 14, at.y - sweep / 2 + (sweep * i) / n));
    await burst([packet, ...seeds], () => Promise.all([
      play(packet, [
        { transform: "translate(-50%, -50%) rotate(0deg)" },
        { transform: "translate(-50%, -50%) rotate(120deg)", offset: 0.15 },
        { transform: `translate(-50%, -50%) translateY(${sweep}px) rotate(120deg)`, offset: 0.85 },
        { transform: `translate(-50%, -50%) translateY(${sweep}px) rotate(120deg)`, opacity: 0 },
      ], { duration: ms, easing: "steps(10, end)" }),
      ...seeds.map((s, i) => play(s, [
        { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(-50%, -50%) translate(${16 + (r() - 0.5) * 4}px, ${8 + r() * 6}px)`, opacity: 1, offset: 0.85 },
        { transform: `translate(-50%, -50%) translate(16px, 14px)`, opacity: 0 },
      ], { duration: reduced ? 120 : 360, delay: reduced ? 0 : 160 + i * ((ms - 500) / n), easing: "steps(5, end)" })),
    ]));
  },
  land({ a, tg, stamp, artNode }) {
    const key = tg.spot || tg.bed;
    fadeMarks(`.l4-mark--furrow[data-mark="${key}"], [data-mark="${key}"].l4-mark--furrow`, { ms: 1 });
    stamp(tg, turned(artNode("l4-furrow-sown", 56)), { cover: true, cls: "act-mark--cover l4-mark l4-mark--sown" });
    // The whole row sown: the furrow closes over; the crop's own row shows from here on.
    if (document.querySelectorAll(".act-marks .l4-mark--sown").length >= a.targets.length) fadeMarks(".l4-mark--sown, .l4-mark--furrow, .l4-guide", { delay: 1800, ms: 600 });
  },
};
