import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, reduce, scoreStars } from "../engine/level-runner.js";

// A tiny level, independent of the real Level 1 copy, so wording edits never break these tests.
const LEVEL = {
  id: "fixture",
  gardenStart: 30,
  beds: [{ id: "sun", light: "sunny" }, { id: "dark", light: "shady" }],
  startPlants: { dark: [{ plant: "lettuce", state: "growing" }] },
  falseFlagNudge: "Looks fine.",
  steps: [
    { id: "a", kind: "trust", reply: "good A", doneLine: "done A",
      effect: { plant: "sunflower", bed: "sun", state: "growing", garden: 15 } },
    { id: "b", kind: "trust", reply: "good B", effect: { water: true, garden: 10 } },
    { id: "c", kind: "drift", reply: "bad C",
      badEffect: { plant: "tomato", bed: "dark", state: "damaged", garden: -30 },
      flawOptions: [{ id: "x", label: "X" }, { id: "agreed", label: "Agreed" }],
      correctFlaw: "agreed", flawHints: { x: "not X" },
      fixOptions: [{ id: "honest", label: "Be honest" }, { id: "nice", label: "Be nice" }],
      correctFix: "honest", fixHints: { nice: "not nice" },
      fixedReply: "honest C",
      goodEffect: { plant: "tomato", bed: "sun", state: "thriving", garden: 25 } },
  ],
};

function play(actions) {
  let state = createRun(LEVEL);
  const effects = [];
  for (const action of actions) {
    const out = reduce(LEVEL, state, action);
    state = out.state;
    effects.push(...out.effects);
  }
  return { state, effects };
}

const TRUST = [{ type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }, { type: "ask" }];

test("createRun copies start plants and does not share them with the level", () => {
  const state = createRun(LEVEL);
  assert.deepEqual(state.beds, { sun: [], dark: [{ plant: "lettuce", state: "growing" }] });
  state.beds.dark[0].state = "thriving";
  assert.equal(LEVEL.startPlants.dark[0].state, "growing");
});

test("trust steps grow the garden and move on", () => {
  const { state, effects } = play([{ type: "ask" }, { type: "doIt" }]);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.phase, "ask");
  assert.equal(state.garden, 45);
  assert.deepEqual(state.beds.sun, [{ plant: "sunflower", state: "growing" }]);
  assert.deepEqual(effects.map((e) => e.type), ["say", "grow", "say"]);
});

test("watering turns every growing plant into a thriving one", () => {
  const { state } = play([{ type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }]);
  assert.equal(state.beds.sun[0].state, "thriving");
  assert.equal(state.beds.dark[0].state, "thriving");
  assert.equal(state.garden, 55);
});

test("asking the drift question starts the drift", () => {
  const { state, effects } = play(TRUST);
  assert.equal(state.phase, "advice");
  assert.equal(state.drift, 0.6);
  assert.equal(effects.at(-1).text, "bad C");
});

test("doing the drifted advice damages the garden, reveals, and scores 1 star", () => {
  const { state } = play([...TRUST, { type: "doIt" }]);
  assert.equal(state.phase, "reveal");
  assert.equal(state.fooled, true);
  assert.equal(state.drift, 1);
  assert.equal(state.garden, 25);
  assert.deepEqual(state.beds.dark.at(-1), { plant: "tomato", state: "damaged" });
  assert.equal(state.stars, 1);
});

test("a clean catch scores 3 stars and plants healthy tomatoes", () => {
  const { state, effects } = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" },
    { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(state.phase, "reveal");
  assert.equal(state.caught, true);
  assert.equal(state.fooled, false);
  assert.equal(state.stars, 3);
  assert.deepEqual(state.beds.sun.at(-1), { plant: "tomato", state: "thriving" });
  assert.ok(effects.some((e) => e.type === "rule" && e.text === "Be honest"));
  assert.ok(effects.some((e) => e.type === "say" && e.text === "honest C"));
});

test("a wrong name pick hints, stays in name, and costs a star", () => {
  const { state, effects } = play([...TRUST, { type: "flag" }, { type: "name", id: "x" }]);
  assert.equal(state.phase, "name");
  assert.equal(effects.at(-1).text, "not X");
  const end = play([...TRUST, { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" },
    { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(end.state.stars, 2);
});

test("a wrong fix pick hints, stays in fix, and costs a star", () => {
  const { state, effects } = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "nice" }]);
  assert.equal(state.phase, "fix");
  assert.equal(effects.at(-1).text, "not nice");
  const end = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "nice" },
    { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(end.state.stars, 2);
});

test("flagging good advice nudges without leaving the step and costs a star", () => {
  const { state, effects } = play([{ type: "ask" }, { type: "flag" }]);
  assert.equal(state.phase, "advice");
  assert.equal(state.stepIndex, 0);
  assert.equal(state.falseFlags, 1);
  assert.equal(effects.at(-1).text, "Looks fine.");
  const end = play([{ type: "ask" }, { type: "flag" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }, { type: "ask" },
    { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(end.state.phase, "reveal");
  assert.equal(end.state.stars, 2);
});

test("wrong name + wrong fix + false flag reduces to 1 star", () => {
  const { state } = play([{ type: "ask" }, { type: "flag" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }, { type: "ask" },
    { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" },
    { type: "fix", id: "nice" }, { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(state.stars, 1);
});

test("unknown option ids in name and fix phases are ignored, not counted as misses", () => {
  const atName = play([...TRUST, { type: "flag" }]).state;
  const n = reduce(LEVEL, atName, { type: "name", id: "bogus" });
  assert.equal(n.state, atName);
  assert.deepEqual(n.effects, []);
  const atFix = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" }]).state;
  const f = reduce(LEVEL, atFix, { type: "fix", id: "bogus" });
  assert.equal(f.state, atFix);
  assert.deepEqual(f.effects, []);
});

test("stars never drop below 1", () => {
  assert.equal(scoreStars({ fooled: false, nameMisses: 2, fixMisses: 1, falseFlags: 3 }), 1);
});

test("chat replies without changing the step", () => {
  const before = createRun(LEVEL);
  const { state, effects } = reduce(LEVEL, before, { type: "chat", reply: "hi!" });
  assert.equal(state, before);
  assert.deepEqual(effects, [{ type: "say", text: "hi!" }]);
});

test("actions that do not fit the phase are ignored", () => {
  const before = createRun(LEVEL);
  for (const action of [{ type: "doIt" }, { type: "flag" }, { type: "name", id: "agreed" }]) {
    const out = reduce(LEVEL, before, action);
    assert.equal(out.state, before);
    assert.deepEqual(out.effects, []);
  }
});

test("actions after the level is finished are ignored (double-tap during reveal)", () => {
  const { state: done } = play([...TRUST, { type: "doIt" }]);
  assert.equal(done.phase, "reveal");
  for (const action of [{ type: "doIt" }, { type: "flag" }, { type: "ask" }]) {
    const out = reduce(LEVEL, done, action);
    assert.equal(out.state, done);
    assert.deepEqual(out.effects, []);
  }
});

function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}

test("reduce never mutates the level or the state it is given", () => {
  const level = deepFreeze(structuredClone(LEVEL));
  const paths = [
    [...TRUST, { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" },
      { type: "fix", id: "nice" }, { type: "fix", id: "honest" }, { type: "doIt" }],
    [{ type: "ask" }, { type: "flag" }, ...TRUST.slice(0), { type: "doIt" }],
  ];
  for (const actions of paths) {
    let state = deepFreeze(createRun(level));
    for (const action of actions) state = deepFreeze(reduce(level, state, action).state);
  }
});

test("garden meter is clamped to 0–100", () => {
  const level = { ...LEVEL, gardenStart: 95 };
  let state = createRun(level);
  state = reduce(level, state, { type: "ask" }).state;
  state = reduce(level, state, { type: "doIt" }).state;
  assert.equal(state.garden, 100);
});
