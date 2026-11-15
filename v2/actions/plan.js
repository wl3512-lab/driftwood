// What the player has to do with their hands before a choice lands.
// Pure: (level, state, action, out) → a list of actions, no DOM.
//
// A choice that applies a garden effect (Do it, their way / my way, a bed
// pick, the reanswer, a chore) first runs a hands-on action: drag the packet
// to the bed, the can over each bed, tap each berry. The level data may spell
// the actions out; otherwise they are derived from the effect itself.
//
// Level data (see docs/superpowers/specs/2026-11-14-driftwood-actions-format.md):
//   step.actions            the trust advice (Do it, a place pick, "theirs"),
//                           and a hook step's flag (put the phone down, do the task)
//   step.stayActions        a hook step's Do it (stay on the phone; default none)
//   step.disagree.actions   "mine": the player's own way
//   step.badActions         the drift's Do it (and the pushback's retry)
//   step.goodActions        the reanswer's Do it
//   effect.actions          on any effect, wins over the lists above
//   chore.actions           a level.chores entry
// Each entry: { kind, item?, target: { bed, plant? } | [targets], count?, say? }.
// An explicit [] means "nothing to do by hand". Bed "$choice" is the bed the
// player picked on a place step; "@item" refs resolve like effects do.

import { resolveBed } from "../mechanics/placement.js";
import { currentStep, pendingChore } from "../engine/level-runner.js";

export const KINDS = ["plant", "water", "dig", "firm", "label", "pick", "pests",
  "pull", "fill", "pour", "cover", "collect", "poke", "hold", "snip"];
// Wave 2 registers more kinds (registry.js); plan.js accepts any registered name.
export function addKind(name) { if (!KINDS.includes(name)) KINDS.push(name); }
// The tool each kind hands the player when the data names none.
export const DEFAULT_ITEM = { plant: "packet", water: "can", dig: "trowel", firm: "hand", label: "label", pick: "hand", pests: "spray",
  pull: "hand", fill: "can", pour: "can", cover: "hand", collect: "berry", poke: "label", hold: "hand", snip: "snips" };
// Tap kinds put `count` spots on the target (berries, bugs); this many if unset.
export const DEFAULT_COUNT = { pick: 3, pests: 3, pull: 3, snip: 3, collect: 3 };
// Fields a kind reads, passed through as written (see the format spec).
const EXTRA = ["fills", "soak", "cover", "readout", "result", "ms"];

// Which list in the level data answers this action.
export function sourceFor(level, state, action) {
  const step = currentStep(level, state);
  if (action.type === "chore") return (level.chores || []).find((c) => c.id === action.id)?.actions;
  if (!step) return undefined;
  if (state.phase === "advice" && step.kind === "trust" && (action.type === "doIt" || action.type === "place")) return step.actions;
  if (state.phase === "advice" && step.kind === "hook") return action.type === "flag" ? step.actions : action.type === "doIt" ? (step.stayActions ?? []) : undefined;
  if (state.phase === "disagree" && action.type === "doIt") return step.actions;
  if (state.phase === "disagree" && action.type === "override") return step.disagree?.actions;
  if ((state.phase === "advice" || state.phase === "pushback") && step.kind === "drift" && action.type === "doIt") return step.badActions;
  if (state.phase === "reanswer" && action.type === "doIt") return step.goodActions;
  return undefined;
}

// The actions to run before `out` (reduce's result for `action`) is applied.
export function planFor(level, state, action, out) {
  // flag only ever lands an effect on a hook step (put the phone down, do the task).
  if (!["doIt", "override", "place", "chore", "flag"].includes(action.type)) return [];
  const grows = out.effects.filter((fx) => fx.type === "grow").map((fx) => fx.effect);
  const memory = out.state.memory || state.memory;
  const fromEffect = grows.find((e) => Array.isArray(e.actions))?.actions;
  const listed = fromEffect ?? sourceFor(level, state, action);
  const ctx = { level, memory, choice: action.bed };
  if (Array.isArray(listed)) return normalize(listed, ctx);
  return normalize(grows.flatMap((e) => defaultActions(level, state, e)), ctx);
}

// Defaults from what the effect does to each plant.
export function defaultActions(level, state, effect) {
  if (!effect) return [];
  const list = [];
  const water = [];
  const prevOf = (bed, plant) => state.beds?.[bed]?.find((p) => p.plant === plant)?.state ?? null;
  const rows = [effect.plant && effect, ...(effect.extra || [])].filter((x) => x && x.plant && x.bed);
  for (const x of rows) {
    const prev = prevOf(x.bed, x.plant);
    const target = { bed: x.bed, plant: x.plant };
    if (x.state === "dug") list.push({ kind: "dig", target });
    else if (x.state === "picked") list.push({ kind: "pick", target });
    else if (x.state === "tagged") list.push({ kind: "label", target });
    // A plant new to the bed is sown by hand, however it turns out.
    else if (prev === null) list.push({ kind: "plant", item: x.plant, target });
    else if (prev === "aphids" && x.state !== "aphids") list.push({ kind: "pests", target });
    else if (prev !== null && prev !== x.state && ["thriving", "soggy", "rotting", "bolted"].includes(x.state)) water.push(target);
  }
  if (effect.water) {
    // Watering everywhere: each bed with a growing plant gets the can.
    for (const [bed, plants] of Object.entries(state.beds || {})) {
      const p = plants.find((q) => q.state === "growing");
      if (p) water.push({ bed, plant: p.plant });
    }
  }
  const seen = new Set();
  const targets = water.filter((tg) => !seen.has(tg.bed) && seen.add(tg.bed));
  if (targets.length > 0) list.push({ kind: "water", target: targets });
  return list;
}

// Fill in items, counts and beds; drop anything that can't be played.
// A target is one of
//   { bed, plant? }      a bed (or one plant's field in it); bed may be "$choice" or a memory ref
//   { prop: "<id>" }     a scene prop with that id (level.props[].id → [data-prop])
//   { spot: "<name>" }   a named spot (level.spots[name]); its own bed, or the scene
//   { all: true }        every plant on screen
// Unknown beds, props and spots are dropped (and so is an action left with none).
function target(tg, { level, memory, choice, beds, props, spots }) {
  if (!tg || typeof tg !== "object") return null;
  if (tg.all) return { all: true };
  if (tg.prop != null) return props.has(tg.prop) ? { prop: tg.prop } : null;
  if (tg.spot != null) {
    const s = spots[tg.spot];
    if (!s) return null;
    const ref = tg.bed ?? s.bed;
    if (ref == null) return { spot: tg.spot };
    const bed = ref === "$choice" || ref === "{bed}" ? choice : resolveBed(level, memory, ref);
    return bed && (beds.size === 0 || beds.has(bed)) ? { spot: tg.spot, bed } : null;
  }
  const bed = tg.bed === "$choice" || tg.bed === "{bed}" ? choice : resolveBed(level, memory, tg.bed);
  return bed && (beds.size === 0 || beds.has(bed)) ? { ...tg, bed } : null;
}

export function normalize(list, { level, memory = {}, choice } = {}) {
  const ctx = {
    level, memory, choice,
    beds: new Set((level?.beds || []).map((b) => b.id)),
    props: new Set((level?.props || []).map((p) => p.id).filter(Boolean)),
    spots: level?.spots || {},
  };
  const out = [];
  for (const a of list || []) {
    if (!a || !KINDS.includes(a.kind)) continue;
    const raw = Array.isArray(a.target) ? a.target : Array.isArray(a.targets) ? a.targets : [a.target];
    const targets = raw.map((tg) => target(tg, ctx)).filter(Boolean);
    if (targets.length === 0) continue;
    const entry = { kind: a.kind, item: a.item || (a.kind === "plant" ? targets[0].plant : null) || DEFAULT_ITEM[a.kind], targets };
    const count = a.count ?? DEFAULT_COUNT[a.kind];
    if (count != null) entry.count = Math.max(1, Math.min(6, count));
    if (a.say) entry.say = a.say;
    if (a.spot) entry.spot = a.spot;
    for (const f of EXTRA) if (a[f] != null) entry[f] = a[f];
    out.push(entry);
  }
  return out;
}

// Number of separate hand moves the plan asks for (drops plus taps).
export function moves(plan) {
  return plan.reduce((n, a) => n + a.targets.length * (a.count || 1), 0);
}

export { pendingChore };
