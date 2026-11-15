// Mist (Level 2): drag the spray bottle to a plant. It squeezes three times;
// each squeeze throws a short puff of mist (Level 3's .l3-jet--mist) and a fan
// of pixel droplets (.l3-drop) that bead on the leaves, then wink out.
// Stepped timing throughout, no glow; reduced motion caps each step at 160 ms.
//   { kind: "mist", item: "l2-mister", target }
// The liquid look is shared with Level 3: v2/css/l3-spray.css, loaded here the
// way spray.js loads it.
import { play, spawn, burst, rand } from "./fx.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-l3-spray-css]")) {
  const link = Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/l3-spray.css", import.meta.url).href,
  });
  link.dataset.l3SprayCss = "";
  document.head.append(link);
}

const SQUEEZES = 3;
const PER_SQUEEZE = 6;

function div(cls, style = "") {
  const el = document.createElement("div");
  el.className = cls;
  if (style) el.style.cssText = style;
  return el;
}

export default {
  kind: "mist",
  mode: "drag",
  noun: (a, n) => n.item(a.item || "l2-mister"),
  say: (a, n) => `Drag the ${n.item(a.item || "l2-mister")} to the ${n.list(a.targets)} to mist it`,
  done: (a, n, tg) => `Misted the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const T = (ms) => (reduced ? Math.min(ms, 160) : ms);
    const r = rand(Math.round(at.x * 7 + at.y));
    // The bottle sits up and to the right; its nozzle (top left of the art) aims down-left at the leaves.
    const bx = at.x + Math.min(60, Math.max(36, at.w * 0.3));
    const by = at.y - Math.min(50, Math.max(30, at.h * 0.3));
    const bottle = spawn(layer, face(), bx, by, "act__fx--tool l3-nozzle");
    const tx = bx - 20;
    const ty = by - 20;
    const px = at.x - Math.min(10, at.w * 0.05);
    const py = at.y;
    const len = Math.hypot(px - tx, py - ty);
    const ang = Math.atan2(py - ty, px - tx) * 180 / Math.PI;
    const puff = div("l3-jet l3-jet--mist", `left:${tx}px; top:${ty}px; width:${len}px; transform:translateY(-50%) rotate(${ang}deg)`);
    layer.append(puff);
    const n = reduced ? 4 : SQUEEZES * PER_SQUEEZE;
    const spreadX = Math.min(at.w * 0.3, 70);
    const spreadY = Math.min(at.h * 0.3, 44);
    const drops = Array.from({ length: n }, () => {
      const d = spawn(layer, div("l3-drop"), px, py, "l3-splash");
      d.style.opacity = "0";
      return d;
    });
    const land = drops.map(() => ({ x: (r() - 0.5) * 2 * spreadX, y: (r() - 0.4) * 2 * spreadY }));
    const squeeze = T(380);

    await burst([bottle, puff, ...drops], async () => {
      for (let s = 0; s < (reduced ? 1 : SQUEEZES); s++) {
        const mine = drops.filter((_, i) => (reduced ? true : Math.floor(i / PER_SQUEEZE) === s));
        await Promise.all([
          play(bottle, [
            { transform: "translate(-50%, -50%) rotate(-10deg) scale(1)" },
            { transform: "translate(-50%, -50%) rotate(-10deg) scale(0.9, 1.08)", offset: 0.4 },
            { transform: "translate(-50%, -50%) rotate(-10deg) scale(1)" },
          ], { duration: squeeze, easing: "steps(3, end)" }),
          // The puff bursts out in pixel steps and thins away.
          play(puff, [
            { clipPath: "inset(0 100% 0 0)", opacity: 0.85, backgroundPosition: "0 0" },
            { clipPath: "inset(0 0 0 0)", opacity: 0.85, backgroundPosition: "9px 0", offset: 0.5 },
            { clipPath: "inset(0 0 0 60%)", opacity: 0, backgroundPosition: "18px 0" },
          ], { duration: squeeze, easing: "steps(6, end)" }),
          // Droplets land on the leaves and bead there.
          ...mine.map((d) => {
            const { x, y } = land[drops.indexOf(d)];
            return play(d, [
              { transform: "translate(-50%, -50%) translate(0, 0) scale(0.5)", opacity: 1 },
              { transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`, opacity: 1, offset: 0.5 },
              { transform: `translate(-50%, -50%) translate(${x}px, ${y + 4}px) scale(1)`, opacity: 1 },
            ], { duration: squeeze + T(120), easing: "steps(5, end)" });
          }),
        ]);
      }
      // All the beads wink out together, then the bottle lifts away.
      await Promise.all([
        ...drops.map((d) => play(d, [{ opacity: 1 }, { opacity: 0 }], { duration: T(360), easing: "steps(3, end)" })),
        play(bottle, [{ opacity: 1 }, { transform: "translate(-50%, -50%) rotate(-10deg) translateY(-12px)", opacity: 0 }], { duration: T(240), easing: "steps(3, end)" }),
      ]);
    });
  },
};
