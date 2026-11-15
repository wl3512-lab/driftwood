// Label: drag the plant label to the bed; it pokes down into the soil.
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "label",
  mode: "drag",
  noun: () => "label",
  say: (a, n) => `Drag the label to the ${n.list(a.targets)}`,
  done: (a, n, tg) => `Labelled the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const stake = spawn(layer, face(), at.x, at.y, "act__fx--tool");
    await burst([stake], () => play(stake, [
      { transform: "translate(-50%, -50%) translateY(-40px) rotate(-8deg)", opacity: 0.4 },
      { transform: "translate(-50%, -50%) translateY(4px) rotate(2deg)", opacity: 1, offset: 0.6 },
      { transform: "translate(-50%, -50%) translateY(0) rotate(0deg)", opacity: 1, offset: 0.8 },
      { transform: "translate(-50%, -50%) translateY(0)", opacity: 0 },
    ], { duration: reduced ? 150 : 620, easing: "ease-out" }));
  },
};
