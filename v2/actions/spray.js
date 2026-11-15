// Spray (Level 3): drag the hose (or a spray bottle) to the plant. The nozzle
// settles beside it, a pixel water jet shoots out, and one aphid cluster washes
// off per drop, so `count` drops clear the plant cluster by cluster.
//   { kind: "spray", item: "l3-hose" | "l3-spray-bottle", target, count }
// A spray bottle gives a grey chemical mist instead, and it knocks the
// ladybugs off too (that's the Level 3 "my way").
//
// This is the flagship liquid animation: the jet, splash and mist styling live
// in v2/css/l3-spray.css (loaded below, like the runner loads actions.css), so
// other kinds that show liquid can reuse the .l3-jet / .l3-drop classes.
import { art } from "./sprites.js";
import { play, spawn, burst } from "./fx.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-l3-spray-css]")) {
  const link = Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/l3-spray.css", import.meta.url).href,
  });
  link.dataset.l3SprayCss = "";
  document.head.append(link);
}

// Where each cluster sits on the plant, as a fraction of the target's box.
const CLUSTERS = [[-0.22, -0.12], [0.2, -0.22], [0.02, 0.08], [0.28, 0.06], [-0.3, 0.14], [0.1, -0.32]];
const isMist = (item) => /spray-bottle|^spray$/.test(String(item || ""));

function div(cls, style = "") {
  const el = document.createElement("div");
  el.className = cls;
  if (style) el.style.cssText = style;
  return el;
}

export default {
  kind: "spray",
  mode: "drag",
  // Drag kinds don't render spots; the runner still passes spot(a) to animate,
  // which is how animate learns which tool it is.
  spot: (a) => a.item || "l3-hose",
  noun: (a, n) => n.item(a.item || "l3-hose"),
  say: (a, n) => (isMist(a.item)
    ? `Drag the spray bottle to the ${n.list(a.targets)} and spray`
    : `Drag the hose to the ${n.list(a.targets)} and blast the aphids off`),
  done: (a, n, tg) => (isMist(a.item) ? `Sprayed the ${n.target(tg)}.` : `Washed the aphids off the ${n.target(tg)}.`),

  async animate(layer, at, { reduced, face, spot, el }) {
    const mist = isMist(spot);
    // Each drop on the same plant hits the next cluster.
    let k = 0;
    if (el) { k = Number(el.dataset.l3Sprayed || 0); el.dataset.l3Sprayed = String(k + 1); }
    const [fx, fy] = CLUSTERS[k % CLUSTERS.length];
    const lw = layer.clientWidth || 800;
    const px = at.x + fx * Math.min(at.w, 170);
    const py = at.y + fy * Math.min(at.h, 120);

    // The tool sits up and to the left (or right, near the left edge), nozzle aimed at the cluster.
    const reach = Math.min(150, Math.max(90, at.w * 0.35));
    const side = px - reach - 40 < 0 && px + reach + 40 < lw ? -1 : 1;
    const cx = px - side * reach;
    const cy = Math.max(40, py - 70);
    const tool = spawn(layer, face(), cx, cy, `act__fx--tool l3-nozzle${mist ? " l3-nozzle--mist" : ""}`);
    const flip = (mist ? -1 : 1) * side; // the bottle's nozzle points left in its art
    // Nozzle tip, relative to the tool's centre (64px sprite, unflipped hose: right edge, low).
    const tip = mist ? { x: 20 * side, y: -20 } : { x: 30 * side, y: 16 };
    const tx = cx + tip.x;
    const ty = cy + tip.y;
    const dx = px - tx;
    const dy = py - ty;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;

    const jet = div(`l3-jet${mist ? " l3-jet--mist" : ""}`, `left:${tx}px; top:${ty}px; width:${len}px; transform:translateY(-50%) rotate(${ang}deg)`);
    layer.append(jet);

    // The cluster: four aphids on the leaf; the bottle also catches two ladybugs.
    const bugs = [[-12, -8], [11, -11], [2, 9], [-4, -20]].map(([ox, oy]) => spawn(layer, art("l3-aphid", { size: 24 }), px + ox, py + oy, "l3-bug"));
    const ladies = mist ? [[-26, 10], [24, 4]].map(([ox, oy]) => spawn(layer, art("l3-ladybug", { size: 20 }), px + ox, py + oy, "l3-bug")) : [];
    const drops = reduced ? [] : Array.from({ length: mist ? 12 : 12 }, () => spawn(layer, div(`l3-drop${mist ? " l3-drop--mist" : ""}`), px, py, "l3-splash"));
    const all = [tool, jet, ...bugs, ...ladies, ...drops];

    const T = (ms) => (reduced ? Math.min(ms, 160) : ms);
    const aim = `translate(-50%, -50%) scaleX(${flip}) rotate(${side * (mist ? -6 : 14)}deg)`;
    await burst(all, async () => {
      // 1. The nozzle swings into place.
      await play(tool, [
        { transform: `translate(-50%, -50%) scaleX(${flip}) rotate(0deg)`, opacity: 0.6 },
        { transform: aim, opacity: 1 },
      ], { duration: T(220), easing: "steps(3, end)" });
      // 2. The jet shoots out in pixel steps, and keeps flowing.
      const shoot = play(jet, [
        { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0 0 0)" },
      ], { duration: T(260), easing: "steps(6, end)" });
      const flow = play(jet, [
        { backgroundPosition: "0 0" },
        { backgroundPosition: mist ? "18px 0" : "24px 0" },
      ], { duration: T(240), iterations: reduced ? 1 : 4, easing: "steps(4, end)" });
      const kick = play(tool, [
        { transform: aim },
        { transform: `${aim} translate(${-side * 3}px, 2px)`, offset: 0.5 },
        { transform: aim },
      ], { duration: T(240), iterations: reduced ? 1 : 3, easing: "steps(2, end)" });
      await shoot;
      // 3. The cluster washes off: splash out, bugs tumble down and away.
      const away = side;
      const wash = [...bugs, ...ladies].map((b, i) => play(b, [
        { transform: "translate(-50%, -50%) translate(0, 0) rotate(0deg)", opacity: 1, filter: "none" },
        { transform: `translate(-50%, -50%) translate(${away * (8 + i * 4)}px, -6px) rotate(${away * 90}deg)`, opacity: 1, filter: mist ? "grayscale(1)" : "none", offset: 0.3 },
        { transform: `translate(-50%, -50%) translate(${away * (26 + i * 8)}px, ${46 + i * 6}px) rotate(${away * 270}deg)`, opacity: 0, filter: mist ? "grayscale(1)" : "none" },
      ], { duration: T(620), delay: reduced ? 0 : 60 + i * 70, easing: "steps(6, end)" }));
      const splash = drops.map((d, i) => {
        const a = (-150 + (i / Math.max(1, drops.length - 1)) * 120) * Math.PI / 180 + (away < 0 ? 0 : 0);
        const r = 26 + (i % 3) * 10;
        const sx = Math.cos(a) * r * away;
        const sy = Math.sin(a) * r;
        return play(d, [
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 1 },
          { transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px)`, opacity: 1, offset: 0.55 },
          { transform: `translate(-50%, -50%) translate(${sx * 1.3}px, ${sy + 30}px)`, opacity: 0 },
        ], { duration: 520, delay: (i % 4) * 70, easing: "steps(5, end)" });
      });
      await Promise.all([flow, kick, ...wash, ...splash]);
      // 4. The jet cuts off and the nozzle lifts away.
      await Promise.all([
        play(jet, [{ opacity: 1 }, { opacity: 0 }], { duration: T(120), easing: "steps(2, end)" }),
        play(tool, [{ transform: aim, opacity: 1 }, { transform: `${aim} translateY(-12px)`, opacity: 0 }], { duration: T(220), easing: "steps(3, end)" }),
      ]);
    });
  },
};
