import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, reduce, training } from "../engine/level-runner.js";
import { emptyProgress, recordLevel, trainedFor } from "../progress.js";

// A tiny level (one trust step, one drift) so wording edits never break these tests.
const LEVEL = {
  id: "fixture",
  gardenStart: 30,
  beds: [{ id: "sun", light: "sunny" }],
  startPlants: {},
  falseFlagNudge: "Looks fine.",
  evidence: [],
  reveal: { flaw: "f", tip: "t" },
  steps: [
    { id: "a", kind: "trust", reply: "good A", effect: { garden: 10 } },
    { id: "c", kind: "drift", reply: "bad C",
      badEffect: { garden: -30 }, badOutcome: "pale C",
      flawOptions: [{ id: "x", label: "X" }, { id: "agreed", label: "Agreed" }],
      correctFlaw: "agreed", flawHints: { x: "not X" },
      fixOptions: [{ id: "honest", label: "Be honest" }, { id: "nice", label: "Be nice" }],
      correctFix: "honest", fixHints: { nice: "not nice" },
      fixedReply: "honest C", goodEffect: { garden: 25 }, goodOutcome: "red C" },
  ],
};

// Every training value along the way, after each action.
function trace(actions) {
  let state = createRun(LEVEL);
  const out = [training(state)];
  for (const a of actions) { state = reduce(LEVEL, state, a).state; out.push(training(state)); }
  return { state, out };
}
const START = [{ type: "ask" }, { type: "doIt" }, { type: "ask" }];

test("training rises a step for the catch, the flaw and the rule, and ends full", () => {
  const { state, out } = trace([...START, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.deepEqual(out, [0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1]);
  assert.equal(state.stars, 3);
});

test("a wrong pick earns less, and the end matches the stars", () => {
  const { state, out } = trace([...START, { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" },
    { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.deepEqual(out.slice(4), [1 / 3, 1 / 3, 1 / 3, 2 / 3, 2 / 3]);
  assert.equal(state.stars, 2);
});

test("being fooled earns no training", () => {
  const { state } = trace([...START, { type: "doIt" }]);
  assert.equal(state.fooled, true);
  assert.equal(state.phase, "reveal");
  assert.equal(training(state), 0);
});

test("a false flag takes a point back, and training stays in 0…1", () => {
  const paths = [
    [{ type: "ask" }, { type: "flag" }, { type: "doIt" }, { type: "ask" }, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "nice" }, { type: "fix", id: "honest" }, { type: "doIt" }],
    [...START, { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" }, { type: "fix", id: "nice" }, { type: "fix", id: "honest" }, { type: "doIt" }],
  ];
  for (const p of paths) {
    const { state, out } = trace(p);
    assert.equal(state.phase, "reveal");
    assert.ok(out.every((v) => v >= 0 && v <= 1));
  }
});

// Two drifts: the helper slips twice, so training fills in sixths and the
// level only ends after the second.
const TWO = { ...LEVEL, steps: [...LEVEL.steps, { ...LEVEL.steps[1], id: "d", reply: "bad D", badOutcome: "pale D", goodOutcome: "red D" }] };
function trace2(actions) {
  let state = createRun(TWO);
  const out = [training(state)];
  const effects = [];
  for (const a of actions) { const r = reduce(TWO, state, a); state = r.state; effects.push(...r.effects); out.push(training(state)); }
  return { state, out, effects };
}
const CATCH = [{ type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" }];

test("two drifts: training fills a sixth at a time and the level ends after the second", () => {
  const { state, out, effects } = trace2([...START, ...CATCH, { type: "ask" }, ...CATCH]);
  assert.deepEqual(out.slice(3), [0, 1 / 6, 2 / 6, 3 / 6, 3 / 6, 3 / 6, 4 / 6, 5 / 6, 1, 1]);
  assert.equal(state.phase, "reveal");
  assert.equal(state.stars, 3);
  assert.ok(effects.some((e) => e.type === "hint" && e.text === "red C"), "the first drift's outcome is a hint");
  assert.ok(effects.some((e) => e.type === "outcome" && e.text === "red D"));
});

test("two drifts: fooled once, caught once is half trained and 2 stars; fooled twice is 1 star", () => {
  const once = trace2([...START, { type: "doIt" }, { type: "ask" }, ...CATCH]).state;
  assert.equal(once.phase, "reveal");
  assert.equal(training(once), 1 / 2);
  assert.equal(once.stars, 2);
  assert.equal(once.fooled, true);
  const twice = trace2([...START, { type: "doIt" }, { type: "ask" }, { type: "doIt" }]).state;
  assert.equal(twice.stars, 1);
  assert.equal(training(twice), 0);
});

test("misses on the first drift don't cost points on the second", () => {
  const { state } = trace2([...START, { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" },
    { type: "ask" }, ...CATCH]);
  assert.equal(training(state), 5 / 6);
  assert.equal(state.stars, 2);
});

test("progress keeps the best training per level and derives it for old saves", () => {
  let p = recordLevel(emptyProgress(), LEVEL, { stars: 3, fooled: false });
  assert.equal(trainedFor(p, "fixture"), 1);
  p = recordLevel(p, LEVEL, { stars: 1, fooled: true });
  assert.equal(trainedFor(p, "fixture"), 1, "a worse replay keeps the best");
  assert.equal(trainedFor({ levels: { "level-1": { stars: 2, fooled: false } } }, "level-1"), 2 / 3, "old save: from stars");
  assert.equal(trainedFor({ levels: {} }, "level-2"), 0);
  assert.equal(trainedFor({ levels: { "level-1": { stars: 1, trained: 2 / 3 } } }, "level-1"), 2 / 3);
});
