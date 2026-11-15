// Plant: drag the seed packet to the bed; it tips over the soil, gives a
// couple of shakes, and the seeds sprinkle out of it into the bed.
import { sprite } from "./sprites.js";
import { play, spawn, burst, rand } from "./fx.js";

export default {
  kind: "plant",
  mode: "drag",
  noun: (a, n) => `${n.plant(a.item)} packet`,
  say: (a, n) => `Drag the ${n.plant(a.item)} packet to the ${n.list(a.targets)}`,
  done: (a, n, tg) => `Planted the ${n.plural(a.item)} in the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const r = rand(Math.round(at.x + at.y));
    const top = at.y - Math.min(70, at.h * 0.3);
    const packet = spawn(layer, face(), at.x, top, "act__fx--tool");
    const spread = Math.min(at.w * 0.4, 130);
    const fall = Math.min(at.h * 0.45, 120);
    const n = reduced ? 4 : 16;
    const seeds = Array.from({ length: n }, () => spawn(layer, sprite("seed", { size: 12 }), at.x + 14, top + 22));
    const tip = play(packet, [
      { transform: "translate(-50%, -50%) rotate(0deg)" },
      { transform: "translate(-50%, -50%) rotate(125deg)", offset: 0.22 },
      { transform: "translate(-50%, -50%) rotate(110deg) translateX(-6px)", offset: 0.4 },
      { transform: "translate(-50%, -50%) rotate(130deg) translateX(6px)", offset: 0.58 },
      { transform: "translate(-50%, -50%) rotate(115deg)", offset: 0.8 },
      { transform: "translate(-50%, -50%) rotate(115deg) translateY(-10px)", opacity: 0 },
    ], { duration: reduced ? 180 : 1100, easing: "ease-in-out" });
    await burst([packet, ...seeds], () => Promise.all([tip, ...seeds.map((s, i) => {
      const dx = (r() - 0.5) * 2 * spread;
      const dy = fall * (0.55 + r() * 0.45);
      return play(s, [
        { transform: "translate(-50%, -50%) translate(0, 0) rotate(0deg)", opacity: 0 },
        { opacity: 1, offset: 0.1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${(r() - 0.5) * 300}deg)`, opacity: 1, offset: 0.8 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0 },
      ], { duration: reduced ? 150 : 650, delay: reduced ? 0 : 230 + i * 40, easing: "cubic-bezier(.45,0,.9,.55)" });
    })]));
  },
};
