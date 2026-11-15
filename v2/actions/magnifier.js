// Magnifier (Level 3): drag the magnifying glass over a plant. A pixel lens
// shows it up close, with one plain line about what you can (and can't) tell.
//   { kind: "magnifier", item: "magnifier", target, result?: "No label" }
// This is a hands-on action, separate from the M-key magnifier tool
// (mechanics/magnifier.js); it opens no panel and never moves the dock or HUD.
import { play, spawn, burst } from "./fx.js";

export default {
  kind: "magnifier",
  mode: "drag",
  spot: (a) => a.result || "",
  noun: () => "magnifying glass",
  say: (a, n) => `Drag the magnifying glass over the ${n.list(a.targets)}`,
  done: (a, n, tg) => (a.result ? `${a.result}.` : `You looked at the ${n.target(tg)} up close.`),
  async animate(layer, at, { reduced, el, spot }) {
    const lens = document.createElement("div");
    lens.className = "l3-lens";
    const src = el?.querySelector("[data-plant] img, .plant img, img")?.getAttribute("src");
    if (src) lens.append(Object.assign(document.createElement("img"), { src, alt: "" }));
    const fx = spawn(layer, lens, at.x - 30, at.y);
    const note = spot ? spawn(layer, Object.assign(document.createElement("span"), { textContent: spot }), at.x, at.y - 70, "l3-lens__note") : null;
    if (note) note.style.opacity = "0";
    await burst([fx, ...(note ? [note] : [])], async () => {
      await play(fx, [
        { transform: "translate(-50%, -50%) translateX(0) scale(0.6)", opacity: 0 },
        { transform: "translate(-50%, -50%) translateX(0) scale(1)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -50%) translateX(60px) scale(1)", opacity: 1, offset: 0.75 },
        { transform: "translate(-50%, -50%) translateX(30px) scale(1)", opacity: 1 },
      ], { duration: reduced ? 160 : 1100, easing: "steps(8, end)" });
      if (note) await play(note, [{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 80 : 160, easing: "steps(2, end)" });
      await play(fx, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: reduced ? 200 : 900, easing: "steps(3, end)" });
    });
  },
};
