// Stream (Level 5): drag the watering can to a bed; it tips and a pixel water
// stream pours from the spout to the soil, splashing at the roots. With
// `soak`, the player then holds the bed until the ring fills (runner.js).
// The liquid look is Level 3's (.l3-jet, .l3-drop in v2/css/l3-spray.css),
// loaded here the way spray.js loads it, so water looks the same everywhere.
//   { kind: "stream", item?: "can", target, soak?: 1500 }
import { play, spawn, burst } from "./fx.js";

if (typeof document !== "undefined" && !document.querySelector("link[data-l3-spray-css]")) {
  const link = Object.assign(document.createElement("link"), {
    rel: "stylesheet", href: new URL("../css/l3-spray.css", import.meta.url).href,
  });
  link.dataset.l3SprayCss = "";
  document.head.append(link);
}

function div(cls, style = "") {
  const el = document.createElement("div");
  el.className = cls;
  if (style) el.style.cssText = style;
  return el;
}

export default {
  kind: "stream",
  mode: "drag",
  noun: (a, n) => n.item(a.item || "can"),
  say: (a, n) => `Drag the watering can to the ${n.list(a.targets)}${a.soak ? ", then hold to soak it" : ""}`,
  done: (a, n, tg) => `Watered the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const T = (ms) => (reduced ? Math.min(ms, 160) : ms);
    // The can sits up and to the left; the stream falls to the soil below it.
    const cx = at.x - 30;
    const cy = Math.max(36, at.y - Math.min(80, at.h * 0.32));
    const can = spawn(layer, face(), cx, cy, "act__fx--tool");
    const tx = cx + 22;            // the spout, once tipped
    const ty = cy + 8;
    const gx = at.x + 18;          // where it lands
    const gy = at.y + Math.min(60, at.h * 0.2);
    const len = Math.hypot(gx - tx, gy - ty);
    const ang = Math.atan2(gy - ty, gx - tx) * 180 / Math.PI;
    const jet = div("l3-jet", `left:${tx}px; top:${ty}px; width:${len}px; height:8px; transform:translateY(-50%) rotate(${ang}deg)`);
    layer.append(jet);
    const drops = reduced ? [] : Array.from({ length: 10 }, () => spawn(layer, div("l3-drop"), gx, gy, "l3-splash"));
    const tip = "translate(-50%, -50%) rotate(42deg)";
    await burst([can, jet, ...drops], async () => {
      await play(can, [{ transform: "translate(-50%, -50%) rotate(0deg)" }, { transform: tip }],
        { duration: T(260), easing: "steps(3, end)" });
      const shoot = play(jet, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
        { duration: T(240), easing: "steps(5, end)" });
      const flow = play(jet, [{ backgroundPosition: "0 0" }, { backgroundPosition: "24px 0" }],
        { duration: T(240), iterations: reduced ? 1 : 4, easing: "steps(4, end)" });
      await shoot;
      const splash = drops.map((d, i) => {
        const a = (-160 + (i / Math.max(1, drops.length - 1)) * 140) * Math.PI / 180;
        const r = 18 + (i % 3) * 8;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        return play(d, [
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 1 },
          { transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px)`, opacity: 1, offset: 0.55 },
          { transform: `translate(-50%, -50%) translate(${sx * 1.3}px, ${sy + 22}px)`, opacity: 0 },
        ], { duration: 480, delay: (i % 4) * 80, easing: "steps(5, end)" });
      });
      await Promise.all([flow, ...splash]);
      await Promise.all([
        play(jet, [{ opacity: 1 }, { opacity: 0 }], { duration: T(120), easing: "steps(2, end)" }),
        play(can, [{ transform: tip, opacity: 1 }, { transform: "translate(-50%, -50%) rotate(0deg) translateY(-10px)", opacity: 0 }],
          { duration: T(220), easing: "steps(3, end)" }),
      ]);
    });
  },
};
