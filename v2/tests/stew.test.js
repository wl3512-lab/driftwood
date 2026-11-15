// Rowan's stew dinner rating (engine/stew.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateStew, verdict, DISHES, LOST, caughtOn } from "../engine/stew.js";
import { MAP } from "../levels/index.js";
import { PLANTS } from "../levels/plants.js";

const IDS = MAP.map((m) => m.id);
const all = (stars, fooled) => ({ levels: Object.fromEntries(IDS.map((id) => [id, { stars, fooled }])) });

test("every dish is a plant the levels grow, and every level can lose one", () => {
  for (const d of DISHES) assert.ok(PLANTS.some((p) => p.id === d.id), d.id);
  for (const id of IDS) assert.ok(DISHES.some((d) => d.id === LOST[id].dish && d.level === id), id);
});

test("caught all five, three stars each: five bowls, every kind, and he says so", () => {
  const r = rateStew(all(3, false), IDS);
  assert.equal(r.bowls, 5);
  assert.equal(r.kinds, 12);
  assert.equal(r.missing.length, 0);
  assert.equal(r.line, "Twelve kinds, all thriving. Splendid.");
});

test("fooled in Levels 4 and 5: carrots and meadow flowers missing, fewer bowls, he names both", () => {
  const p = all(3, false);
  p.levels["level-4"] = { stars: 1, fooled: true };
  p.levels["level-5"] = { stars: 1, fooled: true };
  const r = rateStew(p, IDS);
  assert.deepEqual(r.missing.map((d) => d.id), ["carrot", "flower"]);
  assert.equal(r.missing[0].why, LOST["level-4"].why);
  assert.equal(r.bowls, 4);
  assert.equal(r.line, "A good pot. I missed the carrots and the meadow flowers.");
});

test("one gap: a fine pot, and he says what he missed", () => {
  const p = all(3, false);
  p.levels["level-1"] = { stars: 1, fooled: true };
  assert.equal(rateStew(p, IDS).line, "A fine pot. I missed the tomatoes.");
});

test("fooled everywhere: a thin pot, fewest bowls", () => {
  const r = rateStew(all(1, true), IDS);
  assert.equal(r.missing.length, 5);
  assert.ok(r.bowls <= 2, `${r.bowls}`);
  assert.equal(r.line, "Thin, but honest. I missed the tomatoes, and four more.");
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
  assert.equal(r.line, "Twelve kinds. Some had a hard season.");
});

test("unplayed levels are missing, never crash, and the bowls stay 1..5", () => {
  const r = rateStew({}, IDS);
  assert.equal(r.kinds, 0);
  assert.equal(r.bowls, 1);
  assert.equal(rateStew(null, IDS).bowls, 1);
  assert.ok(verdict(1, 0, []).length > 0);
});
