// After Level 4, Biscuit signs off and tells the player Bugs is only company.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";

test("level-4 reveal has Biscuit's hand-off introducing Bugs as a companion", () => {
  const line = LEVELS["level-4"].reveal.handoff;
  assert.ok(line, "handoff line");
  assert.match(line, /Bugs/);
  assert.match(line, /companion/i);
  assert.match(line, /on your own/i);
  assert.match(line, /babe/i, "in Biscuit's voice");
});

test("only level 4 has a hand-off", () => {
  for (const id of ["level-1", "level-2", "level-3", "level-5"]) assert.equal(LEVELS[id].reveal.handoff, undefined, id);
});
