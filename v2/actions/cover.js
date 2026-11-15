// Cover: drag an item over the target; it sweeps across, and the target then
// shows the cover sprite (soil over a seed row, a net over a bush, mulch).
//   { kind: "cover", item, target, cover: "<art>" }
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "cover",
  mode: "drag",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Drag the ${n.item(a.item)} over the ${n.list(a.targets)}`,
  done: (a, n, tg) => `Covered the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const sweep = Math.min(at.w * 0.35, 90);
    const tool = spawn(layer, face(), at.x - sweep, at.y, "act__fx--tool");
    await burst([tool], () => play(tool, [
      { transform: "translate(-50%, -50%) translateX(0) rotate(-8deg)" },
      { transform: `translate(-50%, -50%) translateX(${sweep * 2}px) rotate(8deg)`, offset: 0.45 },
      { transform: `translate(-50%, -50%) translateX(${sweep * 0.6}px) rotate(-6deg)`, offset: 0.75 },
      { transform: `translate(-50%, -50%) translateX(${sweep}px)`, opacity: 0 },
    ], { duration: reduced ? 150 : 900, easing: "ease-in-out" }));
  },
  land({ a, tg, last, stamp, artNode }) {
    if (last && a.cover) stamp(tg, artNode(a.cover), { cover: true, cls: "act-mark--cover" });
  },
};
