// Water: drag the can over each bed; it tips and a stream of drops pours.
import { sprite } from "./sprites.js";
import { play, spawn, burst, rand } from "./fx.js";

export default {
  kind: "water",
  mode: "drag",
  noun: () => "watering can",
  say: (a, n) => `Drag the watering can to the ${n.list(a.targets)}`,
  done: (a, n, tg) => `Watered the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const top = at.y - Math.min(70, at.h * 0.3);
    const can = spawn(layer, face(), at.x, top, "act__fx--tool");
    const r = rand(Math.round(at.x * 3 + at.y));
    const fall = Math.min(at.h * 0.45, 120);
    const n = reduced ? 3 : 18;
    const drops = Array.from({ length: n }, () => spawn(layer, sprite("drop", { size: 13 }), at.x + 34, top + 14));
    const pour = play(can, [
      { transform: "translate(-50%, -50%) rotate(0deg)" },
      { transform: "translate(-50%, -50%) rotate(40deg)", offset: 0.18 },
      { transform: "translate(-50%, -50%) rotate(44deg)", offset: 0.5 },
      { transform: "translate(-50%, -50%) rotate(38deg)", offset: 0.85 },
      { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 0 },
    ], { duration: reduced ? 200 : 1300, easing: "ease-in-out" });
    await burst([can, ...drops], () => Promise.all([pour, ...drops.map((d, i) => {
      const dx = (r() - 0.4) * Math.min(at.w * 0.3, 70);
      return play(d, [
        { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 0 },
        { opacity: 1, offset: 0.1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${fall}px)`, opacity: 0.95, offset: 0.88 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${fall}px) scale(1.8, 0.3)`, opacity: 0 },
      ], { duration: reduced ? 150 : 520, delay: reduced ? 0 : 220 + i * 45, easing: "ease-in" });
    })]));
  },
};
