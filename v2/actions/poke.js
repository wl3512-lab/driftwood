// Poke: drag the item into the soil at a spot; it stays standing there. An
// optional readout appears beside it (a soil probe: "Dry 2 cm down").
// Also covers tie and stake. A tool that does its job and goes (twine tying
// the beans to their cane) leaves nothing behind: `stays: false`, the
// default for twine (a brown ball was left lying in the soil).
//   { kind: "poke", item, target, readout?: "text", stays?: boolean }
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "poke",
  mode: "drag",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Push the ${n.item(a.item)} into the ${n.list(a.targets)}`,
  done: (a, n, tg) => (a.readout ? `${a.readout}.` : `It's in the ${n.target(tg)}.`),
  async animate(layer, at, { reduced, face }) {
    const tool = spawn(layer, face(), at.x, at.y, "act__fx--tool");
    await burst([tool], () => play(tool, [
      { transform: "translate(-50%, -50%) translateY(-46px) rotate(-6deg)", opacity: 0.5 },
      { transform: "translate(-50%, -50%) translateY(6px) rotate(2deg)", opacity: 1, offset: 0.6 },
      { transform: "translate(-50%, -50%) translateY(0) rotate(0deg)" },
    ], { duration: reduced ? 120 : 520, easing: "ease-out" }));
  },
  land({ a, tg, last, stamp, artNode, textNode }) {
    if (!last) return;
    if (a.stays ?? !/twine|string/.test(a.item || "")) stamp(tg, artNode(a.item), { cls: "act-mark--stand" });
    if (a.readout) stamp(tg, textNode(a.readout), { cls: "act-mark--text" });
  },
};
