// Photo (Level 3): drag the camera to a plant. A stepped pixel flash, and a
// polaroid of it stays pinned beside the plant, captioned for the expert.
//   { kind: "photo", item: "l3-camera", target, result?: "For the garden centre" }
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

const caption = (a) => a.result || "For the expert";

export default {
  kind: "photo",
  mode: "drag",
  noun: (a, n) => n.item(a.item || "l3-camera"),
  say: (a, n) => `Drag the camera to the ${n.list(a.targets)} to take a photo`,
  done: (a, n, tg) => `Took a photo of the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const cam = spawn(layer, face(), at.x, at.y - 30, "act__fx--tool");
    const flash = spawn(layer, document.createElement("div"), at.x, at.y, "l3-flash");
    const pic = spawn(layer, art("l3-photo", { size: 40 }), at.x, at.y - 30);
    pic.style.opacity = "0";
    await burst([cam, flash, pic], async () => {
      await play(cam, [
        { transform: "translate(-50%, -50%) translateY(-8px)" },
        { transform: "translate(-50%, -50%) translateY(0)" },
      ], { duration: reduced ? 80 : 220, easing: "steps(3, end)" });
      await play(flash, [{ opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { opacity: 0.6, offset: 0.5 }, { opacity: 0 }],
        { duration: reduced ? 120 : 360, easing: "steps(4, end)" });
      await Promise.all([
        play(cam, [{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 80 : 200, easing: "steps(2, end)" }),
        play(pic, [
          { transform: "translate(-50%, -50%) translate(0, 0) rotate(0deg)", opacity: 1 },
          { transform: "translate(-50%, -50%) translate(36px, -26px) rotate(-6deg)", opacity: 1 },
        ], { duration: reduced ? 100 : 420, easing: "steps(5, end)" }),
      ]);
    });
  },
  land({ a, tg, last, stamp }) {
    if (!last) return;
    const box = document.createElement("div");
    box.className = "l3-polaroid";
    const label = document.createElement("span");
    label.textContent = caption(a);
    box.append(art("l3-photo", { size: 40 }), label);
    stamp(tg, box, { cls: "l3-photo-mark" });
  },
};
