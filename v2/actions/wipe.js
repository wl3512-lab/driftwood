// Wipe (Level 2): drag the cloth over the fogged glass; each pass scrubs
// back and forth, a few drips run down, and the fog thins. The last pass
// clears it. Use count for the number of passes (Level 2 uses 3).
//   { kind: "wipe", item?: "l2-cloth", target: { prop }, count? }
import { play, spawn, burst } from "./fx.js";

// The drips use Level 3's liquid look (.l3-drop), loaded the way spray.js does.
if (typeof document !== "undefined" && !document.querySelector("link[data-l3-spray-css]")) {
  const link = Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/l3-spray.css", import.meta.url).href,
  });
  link.dataset.l3SprayCss = "";
  document.head.append(link);
}
const drop = () => Object.assign(document.createElement("div"), { className: "l3-drop" });

export default {
  kind: "wipe",
  mode: "drag",
  noun: (a, n) => n.item(a.item || "l2-cloth"),
  say: (a, n) => `Drag the ${n.item(a.item || "l2-cloth")} over the ${n.list(a.targets)} to wipe it${a.count > 1 ? ` (${a.count} wipes)` : ""}`,
  done: (a, n, tg) => `The ${n.target(tg)} is clear.`,
  async animate(layer, at, { reduced, face }) {
    const cloth = spawn(layer, face(), at.x, at.y, "act__fx--tool act__fx--small");
    const sweep = Math.max(16, Math.min(at.w * 0.4, 60));
    const drips = reduced ? [] : [-0.3, 0.05, 0.35].map((f) => spawn(layer, drop(), at.x + f * at.w, at.y + at.h * 0.2, "l3-splash"));
    drips.forEach((d) => { d.style.opacity = "0"; });
    await burst([cloth, ...drips], () => Promise.all([
      play(cloth, reduced
        ? [{ transform: "translate(-50%, -50%)" }, { transform: "translate(-50%, -50%)", opacity: 0 }]
        : [
          { transform: "translate(-50%, -50%) translateX(0) rotate(0deg)" },
          { transform: `translate(-50%, -50%) translateX(${-sweep}px) rotate(-8deg)`, offset: 0.2 },
          { transform: `translate(-50%, -50%) translateX(${sweep}px) rotate(8deg)`, offset: 0.45 },
          { transform: `translate(-50%, -50%) translateX(${-sweep}px) rotate(-8deg)`, offset: 0.7 },
          { transform: "translate(-50%, -50%) translateX(0) rotate(0deg)", offset: 0.88 },
          { transform: "translate(-50%, -50%) translateX(0)", opacity: 0 },
        ], { duration: reduced ? 200 : 900, easing: "steps(4, end)" }),
      ...drips.map((d, i) => play(d, [
        { transform: "translate(-50%, -50%) translateY(0)", opacity: 1 },
        { transform: `translate(-50%, -50%) translateY(${Math.min(at.h * 0.5, 30)}px)`, opacity: 1, offset: 0.8 },
        { transform: `translate(-50%, -50%) translateY(${Math.min(at.h * 0.5, 30)}px)`, opacity: 0 },
      ], { duration: 700, delay: 250 + i * 120, easing: "steps(5, end)" })),
    ]));
  },
  // The fog thins with each pass and is gone after the last.
  land({ a, tg, i, last, el }) {
    if (!el) return;
    const total = a.count || 1;
    const left = last ? 0 : Math.max(0, Number(el.dataset.wipesLeft ?? total) - 1);
    el.dataset.wipesLeft = String(left);
    el.style.opacity = String(left / total);
    if (last) el.dataset.wiped = "true";
  },
};
