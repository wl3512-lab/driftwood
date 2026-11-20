// Rowan's stew dinner (ui/ending.js): what made it to the table, and how he
// rates it. Pure functions over saved progress, no DOM.
//
// Every crop the levels grow is a dish, served only if it actually came
// through healthy: the save keeps how each crop ended (record.crops,
// engine/crops.js), so bitter lettuce, binned beans or soggy basil are gaps on
// the table, each with a line saying what happened. Rosemary is on the menu
// only once a play has grown it (one version of Level 2 has none). Saves from
// before crops were recorded use the old rule: a level the player was fooled
// on (and hasn't since caught on a replay) loses its main drift's dish.
// Rowan's rating weighs variety, then health (read from the stars).
import { healthy, cropState } from "./crops.js";

// Dishes in menu order. where: pot | side | after | table. bed: the one bed
// the dish comes from (the meadow, not the new flowers by the house).
// optional: listed only when a play grew it.
export const DISHES = [
  { id: "tomato", name: "tomatoes", where: "pot", level: "level-1" },
  { id: "bean", name: "beans", where: "pot", level: "level-3" },
  { id: "carrot", name: "carrots", where: "pot", level: "level-4" },
  { id: "pumpkin", name: "pumpkin", where: "pot", level: "level-4" },
  { id: "spinach", name: "spinach", where: "pot", level: "level-4", requiresCatch: true, missingWhy: "The spinach was never planted" },
  { id: "basil", name: "basil", where: "pot", level: "level-2" },
  { id: "rosemary", name: "rosemary", where: "pot", level: "level-2", optional: true },
  { id: "lettuce", name: "purple salad", where: "side", level: "level-1" },
  { id: "blueberry", name: "blueberries", where: "side", level: "level-3" },
  { id: "mint", name: "mint tea", where: "after", level: "level-2" },
  { id: "sunflower", name: "sunflowers", where: "table", level: "level-1" },
  { id: "flower", name: "meadow flowers", where: "table", level: "level-5", bed: "meadow" },
];

// Why a dish is missing, by the state its crop ended in.
export const WHY = {
  tomato: { damaged: "The tomatoes never got enough sun to ripen" },
  lettuce: { bolted: "The lettuce bolted and went bitter" },
  sunflower: { leggy: "The sunflowers came up spindly in the shade" },
  basil: { soggy: "The basil's roots went soggy", choked: "Mint choked the basil" },
  rosemary: { rotting: "The rosemary's roots rotted" },
  bean: { aphids: "The beans were lost to the spray and the aphids" },
  blueberry: { pecked: "The birds got the blueberries while you were ill", growing: "The blueberries were picked before they ripened" },
  carrot: { dug: "The carrots were dug up", rotting: "The carrots rotted in the soaked bed", thirsty: "The carrot seeds dried out" },
  flower: { wilted: "The meadow wilted" },
};
const whyFor = (d, state) => WHY[d.id]?.[state] || `The ${d.name} had a hard season`;

// The dish each level's drift costs when it fooled you, and why.
export const LOST = {
  "level-1": { dish: "tomato", why: "Tomatoes in the shade never ripened" },
  "level-2": { dish: "basil", why: "Mint choked the basil" },
  "level-3": { dish: "blueberry", why: "The birds got the blueberries while you were ill" },
  "level-4": { dish: "carrot", why: "The carrots were dug up" },
  "level-5": { dish: "flower", why: "The meadow wilted" },
};

// Caught: the same rule as the finished plots (ui/finished-garden.js): a
// successful catch, independent of its stars. Older saves have no caught flag:
// their first-play result and best stars retain the catch information available.
// A save that has the caught flag is trusted as is: with several drifts a level
// can earn 2 stars and still lose the main one.
export const caughtOn = (record) => Boolean(record) && (typeof record.caught === "boolean" ? record.caught : record.stars > 1 || record.fooled === false);

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const word = (n) => WORDS[n] || String(n);

// rateStew(progress, levelIds) → {
//   bowls 1..5, kinds (dishes on the table), total, health 0..1,
//   dishes: [{ ...dish, present, why }], missing: [dish], line }
export function rateStew(progress, levelIds = Object.keys(LOST)) {
  const records = progress?.levels || {};
  const dishes = DISHES.filter((d) => levelIds.includes(d.level)).flatMap((d) => {
    const rec = records[d.level];
    const state = cropState(rec, d.id, d.bed);
    if (d.optional && !state) return [];
    if (!rec) return [{ ...d, present: false, why: "Not grown yet" }];
    if (state !== undefined) {
      // What actually grew (record.crops).
      if (state === null) return [{ ...d, present: false, why: d.missingWhy || `The ${d.name} never went in` }];
      const ok = healthy(d.id, state);
      return [{ ...d, present: ok, why: ok ? null : whyFor(d, state) }];
    }
    // An old save: only the main drift's dish is known.
    const unplanted = d.requiresCatch && !caughtOn(rec);
    const lost = LOST[d.level]?.dish === d.id && !caughtOn(rec);
    return [{ ...d, present: !lost && !unplanted, why: unplanted ? d.missingWhy : lost ? LOST[d.level].why : null }];
  });
  const missing = dishes.filter((d) => !d.present);
  const kinds = dishes.length - missing.length;
  const total = dishes.length;
  const stars = levelIds.map((id) => Math.max(0, Math.min(3, records[id]?.stars || 0)));
  const health = stars.length ? stars.reduce((a, b) => a + b, 0) / (stars.length * 3) : 0;
  // He loves variety most, then health.
  const score = total ? 0.6 * (kinds / total) + 0.4 * health : 0;
  const bowls = Math.max(1, Math.min(5, Math.round(score * 5)));
  return { bowls, kinds, total, health, dishes, missing, line: verdict(bowls, kinds, missing) };
}

// One short, dry line naming what made it good or what was missing.
export function verdict(bowls, kinds, missing) {
  const names = missing.map((d) => d.name);
  if (names.length === 0) {
    return bowls >= 5 ? `${cap(word(kinds))} kinds, all thriving. Splendid.` : `${cap(word(kinds))} kinds. Some had a hard season.`;
  }
  if (names.length === 1) return `A fine pot. I missed the ${names[0]}.`;
  if (names.length === 2) return `A good pot. I missed the ${names[0]} and the ${names[1]}.`;
  return `${bowls >= 4 ? "A good pot." : "Thin, but honest."} I missed the ${names[0]}, and ${word(names.length - 1)} more.`;
}
