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
      badOutcome: "pale C",
      flawOptions: [{ id: "x", label: "X" }, { id: "agreed", label: "Agreed" }],
      correctFlaw: "agreed", flawHints: { x: "not X" },
      fixOptions: [{ id: "honest", label: "Be honest" }, { id: "nice", label: "Be nice" }],
      correctFix: "honest", fixHints: { nice: "not nice" },
      fixedReply: "honest C",
      goodEffect: { plant: "tomato", bed: "sun", state: "thriving", garden: 25 },
      goodOutcome: "red C" },
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

test("each ending reports what grew, so the view can stop and show it", () => {
  const fooled = play([...TRUST, { type: "doIt" }]);
  assert.deepEqual(fooled.effects.slice(-2).map((e) => e.type), ["grow", "outcome"]);
  assert.equal(fooled.effects.at(-1).text, "pale C");
  const caught = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.deepEqual(caught.effects.slice(-2).map((e) => e.type), ["grow", "outcome"]);
  assert.equal(caught.effects.at(-1).text, "red C");
});

// ── Levels 2–5 engine extensions: check, extra, place, pressure ──────────
// A second tiny fixture: step 1 places an item, step 2 has pressure and refs the placed bed.
const MORE = {
  id: "fixture-more",
  gardenStart: 50,
  beds: [{ id: "front", label: "Front bed", light: "sunny" }, { id: "side", label: "Side bed", light: "part-shade" },
    { id: "back", label: "Back bed", light: "sunny" }],
  startPlants: { back: [{ plant: "flower", state: "thriving" }] },
  falseFlagNudge: "Looks fine.",
  steps: [
    { id: "p", kind: "trust", reply: "sow it", doneLine: "sown",
      place: { item: "carrot", beds: ["front", "side"], prompt: "Where?" },
      effect: { plant: "carrot", bed: "@carrot", state: "sown", garden: 10 } },
    { id: "q", kind: "drift", reply: "dig it",
      pressure: { tickMs: 8000, effects: [
        { plant: "flower", bed: "back", state: "thirsty", garden: -5 },
        { plant: "flower", bed: "back", state: "wilted", garden: -5 },
      ] },
      badEffect: { plant: "carrot", bed: "@carrot", state: "dug", garden: -30 },
      badOutcome: "dug",
      flawOptions: [{ id: "mem", label: "Memory" }], correctFlaw: "mem", flawHints: {},
      fixOptions: [{ id: "log", label: "Check the log" }], correctFix: "log", fixHints: {},
      fixedReply: "ok",
      goodEffect: { plant: "carrot", bed: "@carrot", state: "growing", garden: 25,
        extra: [{ plant: "lettuce", bed: "@other:carrot", state: "growing" }] },
      goodOutcome: "carrots" },
  ],
};

function playMore(actions, level = MORE) {
  let state = createRun(level);
  const effects = [];
  for (const action of actions) {
    const out = reduce(level, state, action);
    state = out.state;
    effects.push(...out.effects);
  }
  return { state, effects };
}

const CAUGHT_MORE = [{ type: "flag" }, { type: "name", id: "mem" }, { type: "fix", id: "log" }, { type: "doIt" }];

test("createRun starts with no checks, no memory and no pressure spent", () => {
  const state = createRun(LEVEL);
  assert.deepEqual(state.checks, []);
  assert.deepEqual(state.memory, {});
  assert.equal(state.pressure, 0);
});

test("check records an id once, works mid-level, and is ignored after the reveal", () => {
  let out = reduce(LEVEL, createRun(LEVEL), { type: "check", id: "label" });
  assert.deepEqual(out.state.checks, ["label"]);
  assert.deepEqual(out.effects, [{ type: "checked", id: "label" }]);
  const again = reduce(LEVEL, out.state, { type: "check", id: "label" });
  assert.equal(again.state, out.state);
  assert.deepEqual(again.effects, []);
  // mid-level (name phase) still works, and leaves the phase alone
  const atName = play([...TRUST, { type: "flag" }]).state;
  out = reduce(LEVEL, atName, { type: "check", id: "label" });
  assert.equal(out.state.phase, "name");
  assert.deepEqual(out.state.checks, ["label"]);
  // no id → ignored
  assert.equal(reduce(LEVEL, atName, { type: "check" }).state, atName);
  // after the reveal → ignored
  const done = play([...TRUST, { type: "doIt" }]).state;
  const late = reduce(LEVEL, done, { type: "check", id: "label" });
  assert.equal(late.state, done);
  assert.deepEqual(late.effects, []);
});

test("checking never changes the score", () => {
  const { state } = play([{ type: "check", id: "a" }, ...TRUST, { type: "check", id: "b" }, { type: "flag" },
    { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(state.stars, 3);
  assert.deepEqual(state.checks, ["a", "b"]);
});

test("effect.extra changes a second plant after the main one", () => {
  const { state } = playMore([{ type: "ask" }, { type: "place", bed: "front" }, { type: "ask" }, ...CAUGHT_MORE]);
  assert.deepEqual(state.beds.front, [{ plant: "carrot", state: "growing" }]);
  assert.deepEqual(state.beds.side, [{ plant: "lettuce", state: "growing" }]);
  // extra also updates a plant that is already there
  const level = { ...LEVEL, steps: [{ id: "x", kind: "trust", reply: "r",
    effect: { plant: "sunflower", bed: "sun", state: "growing", extra: [{ plant: "lettuce", bed: "dark", state: "damaged" }] } }] };
  let s = reduce(level, createRun(level), { type: "ask" }).state;
  s = reduce(level, s, { type: "doIt" }).state;
  assert.deepEqual(s.beds.dark, [{ plant: "lettuce", state: "damaged" }]);
});

test("place remembers the bed, resolves @item, and behaves like Do it", () => {
  const { state, effects } = playMore([{ type: "ask" }, { type: "place", bed: "side" }]);
  assert.deepEqual(state.memory, { carrot: "side" });
  assert.deepEqual(state.beds.side, [{ plant: "carrot", state: "sown" }]);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.phase, "ask");
  assert.equal(state.garden, 60);
  assert.deepEqual(effects.slice(-2), [
    { type: "grow", effect: { plant: "carrot", bed: "side", state: "sown", garden: 10 } },
    { type: "say", text: "sown" },
  ]);
});

test("place resolves @item in the fooled ending and @other:item in the caught one", () => {
  for (const [bed, other] of [["front", "side"], ["side", "front"]]) {
    const fooled = playMore([{ type: "ask" }, { type: "place", bed }, { type: "ask" }, { type: "doIt" }]);
    assert.deepEqual(fooled.state.beds[bed], [{ plant: "carrot", state: "dug" }]);
    assert.equal(fooled.effects.find((e) => e.type === "grow" && e.effect.state === "dug").effect.bed, bed);
    const caught = playMore([{ type: "ask" }, { type: "place", bed }, { type: "ask" }, ...CAUGHT_MORE]);
    assert.deepEqual(caught.state.beds[bed], [{ plant: "carrot", state: "growing" }]);
    assert.deepEqual(caught.state.beds[other], [{ plant: "lettuce", state: "growing" }]);
    assert.equal(caught.state.stars, 3);
  }
});

test("on a placement step, Do it and unknown beds are ignored", () => {
  const asked = playMore([{ type: "ask" }]).state;
  for (const action of [{ type: "doIt" }, { type: "place", bed: "back" }, { type: "place", bed: "nowhere" }, { type: "place" }]) {
    const out = reduce(MORE, asked, action);
    assert.equal(out.state, asked);
    assert.deepEqual(out.effects, []);
  }
  // place outside a placement step or outside advice is ignored too
  assert.equal(reduce(MORE, createRun(MORE), { type: "place", bed: "front" }).state.stepIndex, 0);
  const atDrift = playMore([{ type: "ask" }, { type: "place", bed: "front" }, { type: "ask" }]).state;
  assert.equal(reduce(MORE, atDrift, { type: "place", bed: "side" }).state, atDrift);
  assert.equal(reduce(LEVEL, play([{ type: "ask" }]).state, { type: "place", bed: "sun" }).state.stepIndex, 0);
});

const AT_PRESSURE = [{ type: "ask" }, { type: "place", bed: "front" }];

test("pressure: ask, chat and tick each spend the next effect, then stop when empty", () => {
  let { state, effects } = playMore([...AT_PRESSURE, { type: "ask" }]);
  assert.equal(state.pressure, 1);
  assert.deepEqual(state.beds.back, [{ plant: "flower", state: "thirsty" }]);
  assert.equal(state.garden, 55);
  assert.deepEqual(effects.slice(-2).map((e) => e.type), ["grow", "say"]);
  ({ state, effects } = playMore([...AT_PRESSURE, { type: "chat", reply: "hm" }]));
  assert.equal(state.pressure, 1);
  assert.deepEqual(effects.slice(-2).map((e) => e.type), ["grow", "say"]);
  ({ state } = playMore([...AT_PRESSURE, { type: "ask" }, { type: "tick" }]));
  assert.equal(state.pressure, 2);
  assert.deepEqual(state.beds.back, [{ plant: "flower", state: "wilted" }]);
  assert.equal(state.garden, 50);
  // empty: further ticks and chat spend nothing
  const spent = state;
  const t = reduce(MORE, spent, { type: "tick" });
  assert.equal(t.state, spent);
  assert.deepEqual(t.effects, []);
  // chips are offered while asking: two spend everything, the third only talks
  ({ state, effects } = playMore([...AT_PRESSURE, { type: "chat", reply: "a" }, { type: "chat", reply: "b" },
    { type: "chat", reply: "c" }]));
  assert.equal(state.pressure, 2);
  assert.equal(state.phase, "ask");
  assert.deepEqual(state.beds.back, [{ plant: "flower", state: "wilted" }]);
  assert.deepEqual(effects.at(-1), { type: "say", text: "c" });
  assert.notEqual(effects.at(-2).type, "grow");
  // and asking after that spends nothing either
  ({ state } = playMore([...AT_PRESSURE, { type: "chat", reply: "a" }, { type: "chat", reply: "b" }, { type: "ask" }]));
  assert.equal(state.pressure, 2);
  assert.equal(state.garden, 50);
});

test("ticks are ignored on trust steps and after a flag", () => {
  const start = createRun(MORE);
  assert.equal(reduce(MORE, start, { type: "tick" }).state, start);
  assert.equal(reduce(LEVEL, createRun(LEVEL), { type: "tick" }).state.pressure, 0);
  const flagged = playMore([...AT_PRESSURE, { type: "ask" }, { type: "flag" }]).state;
  assert.equal(flagged.phase, "name");
  const t = reduce(MORE, flagged, { type: "tick" });
  assert.equal(t.state, flagged);
  assert.deepEqual(t.effects, []);
  const done = playMore([...AT_PRESSURE, { type: "ask" }, { type: "doIt" }]).state;
  assert.equal(reduce(MORE, done, { type: "tick" }).state, done);
});

test("pressure spent resets when a step advances", () => {
  const level = { ...MORE, steps: [
    { id: "t", kind: "trust", reply: "r", effect: { garden: 0 },
      pressure: { tickMs: 8000, effects: [{ plant: "flower", bed: "back", state: "thirsty" }] } },
    ...MORE.steps.slice(1),
  ] };
  let s = reduce(level, createRun(level), { type: "ask" }).state;
  assert.equal(s.pressure, 1);
  s = reduce(level, s, { type: "doIt" }).state;
  assert.equal(s.stepIndex, 1);
  assert.equal(s.pressure, 0);
  const placed = playMore([{ type: "ask" }, { type: "place", bed: "front" }]).state;
  assert.equal(placed.pressure, 0);
});

test("the new actions never mutate the level or the state", () => {
  const level = deepFreeze(structuredClone(MORE));
  for (const actions of [
    [{ type: "check", id: "a" }, { type: "ask" }, { type: "place", bed: "side" }, { type: "ask" }, { type: "tick" },
      { type: "chat", reply: "x" }, { type: "tick" }, ...CAUGHT_MORE],
    [{ type: "ask" }, { type: "place", bed: "front" }, { type: "tick" }, { type: "ask" }, { type: "doIt" }],
  ]) {
    let state = deepFreeze(createRun(level));
    for (const action of actions) state = deepFreeze(reduce(level, state, action).state);
  }
});
