// What each level actually grew, as saved progress keeps it, and what the
// later levels and Rowan's dinner make of it. Pure functions, no DOM.
//
// record.crops = { [bed]: { [plant]: state } }: the beds as a level ended
// (progress.js recordLevel), best play kept per crop: a crop that once came
// through healthy stays healthy, like the caught flag. A level's `plot.fooled`
// (Level 3: the birds got the blueberries while you were sick) overrides its
// plant when the main drift fooled you. Saves from before crops were recorded
// have none: the dinner falls back to the old main-drift rule, and carry-over
// keeps the level as written.

// Grew well enough to eat (or put in a vase). "growing" counts, except for
// blueberries: a bush left "growing" had its berries picked before they ripened.
export function healthy(plant, state) {
  if (state === "thriving" || state === "staked") return true;
  if (state === "growing") return plant !== "blueberry";
  if (plant === "mint" && state === "overrun") return true; // too much mint is still mint tea
  return false;
}

// The crops a finished run ended with (state.beds), with the level's plot override.
export function cropsOf(level, state) {
  const crops = {};
  for (const [bed, list] of Object.entries(state?.beds || {})) {
    if (!list?.length) continue;
    crops[bed] = Object.fromEntries(list.map((p) => [p.plant, p.state]));
  }
  const plot = level?.plot?.fooled;
  if (plot?.plant && state?.lastFooled) {
    for (const plants of Object.values(crops)) if (plants[plot.plant]) plants[plot.plant] = plot.state;
  }
  return crops;
}

// Keep the best: a crop healthy in either save stays healthy; otherwise the latest.
export function mergeCrops(prev, next) {
  if (!prev) return next;
  const out = {};
  for (const bed of new Set([...Object.keys(prev), ...Object.keys(next || {})])) {
    const a = prev[bed] || {};
    const b = next?.[bed] || {};
    out[bed] = {};
    for (const plant of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const keepOld = a[plant] != null && (b[plant] == null || (healthy(plant, a[plant]) && !healthy(plant, b[plant])));
      out[bed][plant] = keepOld ? a[plant] : b[plant];
    }
  }
  return out;
}

// A plant's saved state in a level record: in one bed, or its best across beds
// (Level 1's lettuce can be in two). undefined when the record has no crops
// (an old save), null when the plant never grew there.
export function cropState(record, plant, bed = null) {
  if (!record?.crops) return undefined;
  if (bed) return record.crops[bed]?.[plant] ?? null;
  const states = Object.values(record.crops).map((plants) => plants[plant]).filter((s) => s != null);
  return states.find((s) => healthy(plant, s)) ?? states[0] ?? null;
}

// A level as this player finds it, after their earlier levels:
//   level.carry = [{ from, plant, bed, states?: { [savedState]: state }, otherwise }]
//     a start plant from an earlier level: kept as written if it came through
//     healthy there (or there's no saved record of it); else states[saved] or `otherwise`.
//   chore.needs = { from, plant, not: [states] }
//     a chore that needs that earlier crop: dropped when it ended in one of `not`.
export function carryOver(level, progress) {
  const saved = (from, plant) => cropState(progress?.levels?.[from], plant);
  const carry = level.carry || [];
  const needy = (level.chores || []).some((c) => c.needs);
  if (!carry.length && !needy) return level;
  const startPlants = { ...(level.startPlants || {}) };
  for (const c of carry) {
    const s = saved(c.from, c.plant);
    if (s === undefined || healthy(c.plant, s)) continue;
    const list = startPlants[c.bed] || [];
    const to = c.states?.[s] ?? c.otherwise;
    startPlants[c.bed] = to ? list.map((p) => (p.plant === c.plant ? { ...p, state: to } : p)) : list.filter((p) => p.plant !== c.plant);
  }
  const chores = (level.chores || []).filter((ch) => {
    if (!ch.needs) return true;
    const s = saved(ch.needs.from, ch.needs.plant);
    return s === undefined || !(ch.needs.not || []).includes(s);
  });
  return { ...level, startPlants, chores };
}

// Every plant a level (as played: one version of each slip) can put in a bed,
// on any path. Rowan's handoff only hands over these seeds (no parsley that
// never goes in; rosemary only on the version that plants it).
export function levelPlants(level) {
  const out = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== "object") return;
    if (typeof v.plant === "string" && (typeof v.bed === "string" || v.state)) out.add(v.plant);
    Object.values(v).forEach(walk);
  };
  walk([level.startPlants, level.steps, level.chores]);
  return out;
}
