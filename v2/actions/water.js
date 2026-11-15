// Water: tap each bed and the can goes there; it tips and a stream pours onto the soil.
// The stream is Level 3's hose jet (v2/css/l3-spray.css: .l3-jet, .l3-drop),
// so every liquid in the game has one pixel look: it reveals from the spout in
// steps, its chunks scroll down it, and it splashes where it lands.
import { play, spawn, burst, clearLabels } from "./fx.js";

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
  kind: "water",
  mode: "tap",
  tapTarget: true, // tap the target itself (runner.js): no dragging
  noun: () => "watering can",
  say: (a, n) => `Tap the ${n.list(a.targets)} to water it`,
  done: (a, n, tg) => `Watered the ${n.target(tg)}.`,
  async animate(layer, at, { reduced, face }) {
    const top = at.y - Math.min(70, at.h * 0.3);
    const can = spawn(layer, face(), at.x, top, "act__fx--tool");
    // The spout: the 64px can's top-right corner once it has tipped 40°.
    const sx = at.x + 32;
    const sy = top + 10;
    // It lands a little further right, on the soil below.
    const ex = sx + 10;
    const ey = sy + Math.max(36, Math.min(at.h * 0.45, 120));
    const len = Math.hypot(ex - sx, ey - sy);
    const ang = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
    const jet = div("l3-jet", `left:${sx}px; top:${sy}px; width:${len}px; transform:translateY(-50%) rotate(${ang}deg)`);
    layer.append(jet);
    // Splash drops wait, hidden, until the stream reaches the soil.
    const drops = reduced ? [] : Array.from({ length: 10 }, () => {
      const d = spawn(layer, div("l3-drop"), ex, ey, "l3-splash");
      d.style.opacity = "0";
      return d;
    });

    const T = (ms) => (reduced ? Math.min(ms, 120) : ms);
    const tilt = (deg) => ({ transform: `translate(-50%, -50%) rotate(${deg}deg)` });
    // A result label in the stream's way fades for the pour.
    const clear = clearLabels(layer, [can, jet], { reduced });
    await clear.hide();
    await burst([can, jet, ...drops], async () => {
      // 1. The can tips.
      await play(can, [tilt(0), tilt(40)], { duration: T(240), easing: "steps(3, end)" });
      // 2. The stream pours out of the spout in pixel steps and keeps flowing.
      const shoot = play(jet, [
        { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0 0 0)" },
      ], { duration: T(200), easing: "steps(5, end)" });
      const flow = play(jet, [
        { backgroundPosition: "0 0" },
        { backgroundPosition: "24px 0" },
      ], { duration: T(240), iterations: reduced ? 1 : 3, easing: "steps(4, end)" });
      const tip = play(can, [tilt(40), tilt(44), tilt(38)], { duration: T(720), easing: "steps(3, end)" });
      await shoot;
      // 3. It splashes where it lands, a few drops at a time.
      const splash = drops.map((d, i) => {
        const a = (-160 + (i / Math.max(1, drops.length - 1)) * 140) * Math.PI / 180;
        const r = 14 + (i % 3) * 7;
        const dx = Math.cos(a) * r;
        const dy = Math.sin(a) * r * 0.6;
        return play(d, [
          { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 1 },
          { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`, opacity: 1, offset: 0.55 },
          { transform: `translate(-50%, -50%) translate(${dx * 1.3}px, ${dy + 14}px)`, opacity: 0 },
        ], { duration: 440, delay: (i % 4) * 80, easing: "steps(5, end)" });
      });
      await Promise.all([flow, tip, ...splash]);
      // 4. The stream cuts off and the can rights itself and goes.
      await Promise.all([
        play(jet, [{ opacity: 1 }, { opacity: 0 }], { duration: T(120), easing: "steps(2, end)" }),
        play(can, [{ ...tilt(38), opacity: 1 }, { ...tilt(0), opacity: 0 }], { duration: T(220), easing: "steps(3, end)" }),
      ]);
    });
    await clear.show();
  },
};
