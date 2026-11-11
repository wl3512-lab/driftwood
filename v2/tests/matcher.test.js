import { test } from "node:test";
import assert from "node:assert/strict";
import { matchTyped, pickRedirect } from "../engine/matcher.js";

const step = { keywords: [["tomato", "tomatoes"], ["shade", "shady", "corner"]] };

test("a question mentioning a step keyword asks the step", () => {
  assert.equal(matchTyped(step, "Can TOMATOES go in the corner?"), "ask");
  assert.equal(matchTyped(step, "tomatoes in the shady corner?"), "ask");
});

test("keywords match case-insensitively on both sides", () => {
  assert.equal(matchTyped({ keywords: [["Tomato"]] }, "any tomato here?"), "ask");
  assert.equal(matchTyped({ keywords: [["Tomato"]] }, "ANY TOMATO HERE?"), "ask");
});

test("an unrelated question is redirected", () => {
  assert.equal(matchTyped(step, "what is the meaning of life"), "redirect");
  assert.equal(matchTyped(step, ""), "redirect");
});

test("redirect lines cycle", () => {
  const level = { redirects: ["one", "two"] };
  assert.deepEqual([0, 1, 2, 3].map((n) => pickRedirect(level, n)), ["one", "two", "one", "two"]);
});

const real = {
  tomato: { keywords: [["tomato", "tomatoes"], ["shade", "shady", "corner"]] },
  water: { keywords: [["water", "watering", "watered", "waters"]] },
};

test("every group must match: a tomato question without shade is redirected", () => {
  assert.equal(matchTyped(real.tomato, "should I plant tomatoes in full sun?"), "redirect");
  assert.equal(matchTyped(real.tomato, "what about the corner"), "redirect");
});

test("matching is whole-word, not substring", () => {
  assert.equal(matchTyped(real.water, "how do I grow watermelon"), "redirect");
  assert.equal(matchTyped(real.water, "When should I water?"), "ask");
  assert.equal(matchTyped(real.water, "is watering daily ok"), "ask");
});

test("a plain-string group matches like a one-item group", () => {
  assert.equal(matchTyped({ keywords: ["tomato"] }, "my tomato looks sad"), "ask");
  assert.equal(matchTyped({ keywords: ["tomato"] }, "my tomatoes look sad"), "redirect");
  assert.equal(matchTyped({ keywords: ["tomato", ["shade", "corner"]] }, "tomato in the corner"), "ask");
});
