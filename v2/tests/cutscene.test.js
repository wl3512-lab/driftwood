import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BEATS, DRIFT_LINE, RADISH, RADISH_CARD, totalMs } from "../ui/cutscene.js";
import { canBlock } from "../ui/block-type.js";
import { PLANTS } from "../levels/plants.js";
import { MAP } from "../levels/index.js";

test("the script has the five beats, in order, each with words and a duration", () => {
  assert.deepEqual(BEATS.map((b) => b.id), ["meet", "friendly", "drift", "almanac", "go"]);
  for (const b of BEATS) {
    assert.equal(typeof b.text, "string");
    assert.ok(b.text.trim().length > 0, `${b.id}: a caption`);
    assert.ok(Number.isFinite(b.ms) && b.ms >= 500 && b.ms <= 6000, `${b.id}: ${b.ms}ms`);
  }
});

test("the whole cutscene runs about 12.8 seconds", () => {
  assert.equal(totalMs(), 12800);
  assert.ok(totalMs() <= 15000, "short enough to sit through");
});

test("the end title can be drawn in block letters", () => {
  assert.ok(canBlock(BEATS.at(-1).text), BEATS.at(-1).text);
});

test("the drift line comes from Level 1's helper and actually changes", () => {
  assert.equal(DRIFT_LINE.who, MAP[0].helper);
  assert.notEqual(DRIFT_LINE.before, DRIFT_LINE.after);
});

test("the radish is cutscene-only: not on the seed shelf, but drawn like it", () => {
  assert.equal(PLANTS.some((p) => p.id === RADISH.id), false);
  for (const s of [...RADISH.stages, RADISH.watch[0]]) {
    assert.ok(existsSync(fileURLToPath(new URL(`../art/${s}.svg`, import.meta.url))), `art/${s}.svg`);
  }
  assert.deepEqual(RADISH_CARD.lines, ["Ready in 3–4 weeks"]);
});
