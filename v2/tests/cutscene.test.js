import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BEATS, DRIFT_LINE, END_LINE, RADISH, RADISH_CARD, totalMs, beatsFor, lineFor } from "../ui/cutscene.js";
import { canBlock } from "../ui/block-type.js";
import { PLANTS } from "../levels/plants.js";
import { MAP } from "../levels/index.js";

test("the script has seven beats at most, in order, each with words and a duration", () => {
  assert.deepEqual(BEATS.map((b) => b.id), ["name", "garden", "helpers", "dinner", "drift", "almanac", "go"]);
  assert.ok(BEATS.length <= 7, "no more than seven beats before play");
  for (const b of BEATS) {
    assert.equal(typeof b.text, "string");
    assert.ok(b.text.trim().length > 0, `${b.id}: a caption`);
    assert.ok(Number.isFinite(b.ms) && b.ms >= 500 && b.ms <= 6000, `${b.id}: ${b.ms}ms`);
  }
});

test("Rowan's lines are short (Lucy can't read fast) and never claim the almanac is always right", () => {
  for (const b of BEATS) {
    const words = b.text.split(/\s+/).length;
    assert.ok(words <= 14, `${b.id}: ${words} words`);
    assert.doesNotMatch(b.text, /never wrong|always right|behold/i, b.id);
  }
  assert.match(BEATS.find((b) => b.id === "almanac").text, /checked every season/);
  assert.doesNotMatch(END_LINE, /never wrong|(?<!not )always right|almanac is\.?$/i);
  assert.match(BEATS.find((b) => b.id === "helpers").text, /ChatGPT with fur/);
});

test("the first watch asks the name; a rewatch skips it", () => {
  assert.equal(beatsFor(true)[0].id, "name");
  assert.deepEqual(beatsFor(false).map((b) => b.id), ["garden", "helpers", "dinner", "drift", "almanac", "go"]);
  assert.equal(lineFor(BEATS[1], "Ada"), "Welcome, Ada. My garden. Little grows yet.");
  assert.match(lineFor(BEATS[1], ""), /friend/);
});

test("the whole cutscene runs about 15 seconds of animation, then waits for taps", () => {
  assert.equal(totalMs(), 15100);
  assert.ok(totalMs(beatsFor(false)) <= 15000, "a rewatch is short enough to sit through");
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
