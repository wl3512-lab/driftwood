// Release (Level 3): drag a jar of good bugs to the bed. It tips, the lid pops,
// and the ladybugs crawl out onto the plant, where they stay for the level.
//   { kind: "release", item: "l3-ladybug-jar", target }
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

const BUGS = [[-0.28, -0.18], [0.24, -0.26], [-0.08, 0.12], [0.3, 0.1]];
const spread = (at) => ({ w: Math.min(at.w, 150), h: Math.min(at.h, 90) });

export default {
  kind: "release",
  mode: "drag",
  noun: (a, n) => n.item(a.item || "l3-ladybug-jar"),
  say: (a, n) => `Drag the ${n.item(a.item || "l3-ladybug-jar")} to the ${n.list(a.targets)} and let them out`,
  done: (a, n, tg) => `The ladybugs are on the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const jar = spawn(layer, face(), at.x, at.y - 24, "act__fx--tool");
    const s = spread(at);
    const bugs = BUGS.map(() => spawn(layer, art("l3-ladybug", { size: 18 }), at.x + 6, at.y - 34, "l3-bug"));
    bugs.forEach((b) => { b.style.opacity = "0"; });
    await burst([jar, ...bugs], async () => {
      await play(jar, [
        { transform: "translate(-50%, -50%) rotate(0deg)" },
        { transform: "translate(-50%, -50%) rotate(-10deg)", offset: 0.3 },
        { transform: "translate(-50%, -50%) rotate(35deg)" },
      ], { duration: reduced ? 120 : 420, easing: "steps(4, end)" });
      await Promise.all([
        ...bugs.map((b, i) => {
          const [fx, fy] = BUGS[i];
          const x = fx * s.w - 6;
          const y = fy * s.h + 34;
          return play(b, [
            { transform: "translate(-50%, -50%) translate(0, 0) rotate(0deg)", opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${x * 0.4}px, ${y * 0.3}px) rotate(${i % 2 ? 40 : -40}deg)`, opacity: 1, offset: 0.4 },
            { transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
          ], { duration: reduced ? 120 : 760, delay: reduced ? 0 : i * 140, easing: "steps(8, end)" });
        }),
        play(jar, [{ transform: "translate(-50%, -50%) rotate(35deg)", opacity: 1 }, { transform: "translate(-50%, -50%) translateY(-14px) rotate(0deg)", opacity: 0 }],
          { duration: reduced ? 120 : 380, delay: reduced ? 0 : 640, easing: "steps(3, end)" }),
      ]);
    });
  },
  land({ tg, last, rect, stamp }) {
    if (!last) return;
    const s = spread({ w: rect?.width || 120, h: rect?.height || 80 });
    const box = document.createElement("div");
    box.className = "l3-ladies";
    BUGS.forEach(([fx, fy]) => {
      const b = art("l3-ladybug", { size: 16 });
      const wrap = document.createElement("span");
      wrap.style.left = `${fx * s.w}px`;
      wrap.style.top = `${fy * s.h}px`;
      wrap.append(b);
      box.append(wrap);
    });
    stamp(tg, box, { cls: "l3-ladies-mark" });
  },
};
