// Rowan's stew dinner rating (engine/stew.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateStew, verdict, DISHES, LOST, caughtOn } from "../engine/stew.js";
import { MAP, LEVELS } from "../levels/index.js";
import { PLANTS } from "../levels/plants.js";
import { POT_SLOTS, potMap } from "../ui/story-art.js";

const IDS = MAP.map((m) => m.id);
const all = (stars, fooled) => ({ levels: Object.fromEntries(IDS.map((id) => [id, { stars, fooled }])) });

test("the final corrected crop in each level reaches Rowan's dinner", () => {
  const dinner = rateStew(all(3, false), IDS);
  for (const level of Object.values(LEVELS)) {
    const final = level.steps.findLast((s) => s.kind === "drift").goodEffect;
    // Unidentified wild berries are tagged and left alone, never served.
    for (const crop of [final, ...(final.extra || [])].filter((c) => c.plant !== "wildberry")) {
      assert.equal(dinner.dishes.find((d) => d.id === crop.plant)?.present, true, `${crop.plant} reaches dinner`);
    }
  }
});

test("a crop planted only after correcting Biscuit is absent if his advice was followed", () => {
  const dinner = rateStew(all(1, true), IDS);
  const spinach = dinner.dishes.find((d) => d.id === "spinach");
  assert.ok(spinach, "spinach is on the menu");
  assert.equal(spinach.present, false);
  assert.match(spinach.why, /never planted/i);
});

test("spinach has a visible chunk in the stew pot", () => {
  assert.ok(POT_SLOTS.includes("spinach"));
  assert.notDeepEqual(potMap(POT_SLOTS), potMap(POT_SLOTS.filter((id) => id !== "spinach")));
});

test("every dish is a plant the levels grow, and every level can lose one", () => {
  for (const d of DISHES) assert.ok(PLANTS.some((p) => p.id === d.id), d.id);
  for (const id of IDS) assert.ok(DISHES.some((d) => d.id === LOST[id].dish && d.level === id), id);
});

test("caught all five, three stars each: five bowls, every kind, and he says so", () => {
  const r = rateStew(all(3, false), IDS);
  assert.equal(r.bowls, 5);
  assert.equal(r.kinds, DISHES.length);
  assert.equal(r.missing.length, 0);
  assert.equal(r.line, "Thirteen kinds, all thriving. Splendid.");
});

test("fooled in Levels 4 and 5: carrots, unplanted spinach and meadow flowers are missing", () => {
  const p = all(3, false);
  p.levels["level-4"] = { stars: 1, fooled: true };
  p.levels["level-5"] = { stars: 1, fooled: true };
  const r = rateStew(p, IDS);
  assert.deepEqual(r.missing.map((d) => d.id), ["carrot", "spinach", "flower"]);
  assert.equal(r.missing[0].why, LOST["level-4"].why);
  assert.equal(r.bowls, 4);
  assert.equal(r.line, "A good pot. I missed the carrots, and two more.");
});

test("one gap: a fine pot, and he says what he missed", () => {
  const p = all(3, false);
  p.levels["level-1"] = { stars: 1, fooled: true };
  assert.equal(rateStew(p, IDS).line, "A fine pot. I missed the tomatoes.");
});

test("fooled everywhere: a thin pot, fewest bowls", () => {
  const r = rateStew(all(1, true), IDS);
  assert.equal(r.missing.length, 6);
  assert.ok(r.bowls <= 2, `${r.bowls}`);
  assert.equal(r.line, "Thin, but honest. I missed the tomatoes, and five more.");
});

test("a replay that catches the drift fills the gap again", () => {
  assert.equal(caughtOn({ stars: 3, fooled: true }), true);
  assert.equal(caughtOn({ stars: 1, fooled: true }), false);
  assert.equal(caughtOn(undefined), false);
});

test("every kind there but weak plants: no gap, but fewer bowls and a different line", () => {
  const r = rateStew(all(1, false), IDS);
  assert.equal(r.missing.length, 0);
  assert.ok(r.bowls < 5);
  assert.equal(r.line, "Thirteen kinds. Some had a hard season.");
});

test("unplayed levels are missing, never crash, and the bowls stay 1..5", () => {
  const r = rateStew({}, IDS);
  assert.equal(r.kinds, 0);
  assert.equal(r.bowls, 1);
  assert.equal(rateStew(null, IDS).bowls, 1);
  assert.ok(verdict(1, 0, []).length > 0);
});

test("at dinner, a helper under 75% trained glitches; 75% and up sits still", async () => {
  const { trainedFor } = await import("../progress.js");
  const { DINNER_GLITCH_BELOW } = await import("../ui/stew-dinner.js");
  assert.equal(DINNER_GLITCH_BELOW, 0.75);
  const progress = { levels: { "level-1": { trained: 0.5 }, "level-2": { trained: 5 / 6 }, "level-3": { stars: 2 } } };
  assert.ok(trainedFor(progress, "level-1") < DINNER_GLITCH_BELOW, "half trained glitches");
  assert.ok(trainedFor(progress, "level-2") >= DINNER_GLITCH_BELOW, "five sixths sits still");
  assert.ok(trainedFor(progress, "level-3") < DINNER_GLITCH_BELOW, "2 stars (old save) = 2/3 glitches");
});
