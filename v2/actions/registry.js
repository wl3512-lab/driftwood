// The action kinds, by name. A kind module is
//   { kind, mode: "drag" | "tap" | "hold", noun(a, names), say(a, names), done(a, names, target),
//     spot?(a), animate(layer, at, { reduced, spot, face, el }) → Promise,
//     land?({ a, tg, i, last, el, rect, stamp, swap, artNode, textNode }) }
// A level adds a kind by writing one module and one register line here
// (docs/superpowers/specs/2026-11-14-driftwood-actions-format.md, "Adding a kind").
// Importing this file touches no DOM (animate only runs in the browser).
import plant from "./plant.js";
import water from "./water.js";
import dig from "./dig.js";
import firm from "./firm.js";
import label from "./label.js";
import pick from "./pick.js";
import pests from "./pests.js";
import pull from "./pull.js";
import fill from "./fill.js";
import pour from "./pour.js";
import cover from "./cover.js";
import collect from "./collect.js";
import poke from "./poke.js";
import hold from "./hold.js";
import snip from "./snip.js";
import { addKind } from "./plan.js";

const REGISTRY = new Map();
export function register(def) {
  if (!def?.kind || !["drag", "tap", "hold"].includes(def.mode) || typeof def.animate !== "function") throw new Error(`bad action kind: ${def?.kind}`);
  REGISTRY.set(def.kind, def);
  addKind(def.kind);
  return def;
}
export const kindOf = (kind) => REGISTRY.get(kind) || null;
export const kinds = () => [...REGISTRY.keys()];

[plant, water, dig, firm, label, pick, pests].forEach(register);
// Shared by more than one level (wave 1.5).
[pull, fill, pour, cover, collect, poke, hold, snip].forEach(register);
// Level-owned kinds go below, one line each.
import spray from "./spray.js"; register(spray);
import release from "./release.js"; register(release);
import magnifier from "./magnifier.js"; register(magnifier);
import photo from "./photo.js"; register(photo);
import mist from "./mist.js"; register(mist);
import wipe from "./wipe.js"; register(wipe);
import measure from "./measure.js"; register(measure);
import furrow from "./furrow.js"; register(furrow);
import sowRow from "./sow-row.js"; register(sowRow);
import waterRow from "./water-row.js"; register(waterRow);
import light from "./light.js"; register(light);
import close from "./close.js"; register(close);
import phoneDown from "./phone-down.js"; register(phoneDown);
import stream from "./stream.js"; register(stream);
