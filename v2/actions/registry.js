// The action kinds, by name. A kind module is
//   { kind, mode: "drag" | "tap", noun(a, names), say(a, names), done(a, names, target),
//     spot?(a), animate(layer, at, { reduced, spot }) → Promise }
// Wave 2 adds a kind by writing its module and registering it here.
// Importing this file touches no DOM (animate only runs in the browser).
import plant from "./plant.js";
import water from "./water.js";
import dig from "./dig.js";
import firm from "./firm.js";
import label from "./label.js";
import pick from "./pick.js";
import pests from "./pests.js";
import { addKind } from "./plan.js";

const REGISTRY = new Map();
export function register(def) {
  if (!def?.kind || !["drag", "tap"].includes(def.mode) || typeof def.animate !== "function") throw new Error(`bad action kind: ${def?.kind}`);
  REGISTRY.set(def.kind, def);
  addKind(def.kind);
  return def;
}
export const kindOf = (kind) => REGISTRY.get(kind) || null;
export const kinds = () => [...REGISTRY.keys()];

[plant, water, dig, firm, label, pick, pests].forEach(register);
