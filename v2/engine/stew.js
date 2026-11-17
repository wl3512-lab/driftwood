// Rowan's stew dinner (ui/ending.js): what made it to the table, and how he
// rates it. Pure functions over saved progress, no DOM.
//
// Every crop the levels grow is a dish. A level the player was fooled on
// (and hasn't since caught on a replay) loses its affected dishes: those are the gaps on
// the table. Plant health is read from the stars (a proxy: the save keeps
// stars and catch history, not each plant's final state).

// Dishes in menu order. where: pot | side | after | table.
export const DISHES = [
  { id: "tomato", name: "tomatoes", where: "pot", level: "level-1" },
  { id: "bean", name: "beans", where: "pot", level: "level-3" },
  { id: "carrot", name: "carrots", where: "pot", level: "level-4" },
  { id: "pumpkin", name: "pumpkin", where: "pot", level: "level-4" },
  { id: "spinach", name: "spinach", where: "pot", level: "level-4", requiresCatch: true, missingWhy: "The spinach was never planted" },
  { id: "basil", name: "basil", where: "pot", level: "level-2" },
  { id: "rosemary", name: "rosemary", where: "pot", level: "level-2" },
  { id: "parsley", name: "parsley", where: "pot", level: "level-2" },
  { id: "lettuce", name: "purple salad", where: "side", level: "level-1" },
  { id: "blueberry", name: "blueberries", where: "side", level: "level-3" },
  { id: "mint", name: "mint tea", where: "after", level: "level-2" },
  { id: "sunflower", name: "sunflowers", where: "table", level: "level-1" },
  { id: "flower", name: "meadow flowers", where: "table", level: "level-5" },
];

// The dish each level's drift costs when it fooled you, and why.
export const LOST = {
  "level-1": { dish: "tomato", why: "Tomatoes in the shade never ripened" },
  "level-2": { dish: "basil", why: "Mint choked the basil" },
  "level-3": { dish: "blueberry", why: "Wild berries got in the bowl" },
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
  const dishes = DISHES.filter((d) => levelIds.includes(d.level)).map((d) => {
    const rec = records[d.level];
    if (!rec) return { ...d, present: false, why: "Not grown yet" };
    const unplanted = d.requiresCatch && !caughtOn(rec);
    const lost = LOST[d.level]?.dish === d.id && !caughtOn(rec);
    return { ...d, present: !lost && !unplanted, why: unplanted ? d.missingWhy : lost ? LOST[d.level].why : null };
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
