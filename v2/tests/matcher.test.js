import { test } from "node:test";
import assert from "node:assert/strict";
import { matchTyped, pickRedirect } from "../engine/matcher.js";

const step = { keywords: ["tomato", "shade", "corner"] };

test("a question mentioning a step keyword asks the step", () => {
  assert.equal(matchTyped(step, "Can TOMATOES go by the fence?"), "ask");
  assert.equal(matchTyped(step, "what about the corner"), "ask");
});

test("an unrelated question is redirected", () => {
  assert.equal(matchTyped(step, "what is the meaning of life"), "redirect");
  assert.equal(matchTyped(step, ""), "redirect");
});

test("redirect lines cycle", () => {
  const level = { redirects: ["one", "two"] };
  assert.deepEqual([0, 1, 2, 3].map((n) => pickRedirect(level, n)), ["one", "two", "one", "two"]);
});
