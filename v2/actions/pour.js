// Pour: like water, with any liquid item. With `soak` (ms), after the pour
// the player presses and holds the target until the ring fills.
//   { kind: "pour", item?: "can" | "<art>", target, soak?: 1500 }
import water from "./water.js";

export default {
  kind: "pour",
  mode: "drag",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Drag the ${n.item(a.item)} to the ${n.list(a.targets)}${a.soak ? ", then hold to soak it" : ""}`,
  done: (a, n, tg) => `Soaked the ${n.target(tg)}.`,
  animate: (layer, at, ctx) => water.animate(layer, at, ctx),
};
