// Pushback: in Levels 4 and 5 the helper argues when the player refuses the
// drift, and the player has to refuse a second time. Taking the "second chance"
// is the fooled path with the same cost; standing firm is a normal catch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";
import { createRun, reduce } from "../engine/level-runner.js";
import { fill } from "../ui/text.js";
import { memoryVars } from "../mechanics/placement.js";

function play(level, actions) {
  let state = createRun(level);
  let effects = [];
  for (const a of actions) ({ state, effects } = reduce(level, state, a));
  return { state, effects };
}
function toDrift(level) {
  const acts = [];
  for (const step of level.steps.slice(0, -1)) {
    acts.push({ type: "ask" });
    acts.push(step.place ? { type: "place", bed: step.place.beds[0] } : { type: "doIt" });
  }
  acts.push({ type: "ask" });
  return acts;
}
const drift = (level) => level.steps.at(-1);
const plantsIn = (state) => Object.values(state.beds).flat();

for (const id of ["level-4", "level-5"]) {
  const level = LEVELS[id];
  const d = drift(level);

  test(`${id}: the drift step has a pushback block with a reply and two button labels`, () => {
    assert.ok(d.pushback, "pushback block");
    assert.ok(d.pushback.reply.length > 40, "a real speech, not a stub");
    assert.ok(d.pushback.retry && d.pushback.stand, "retry and stand labels");
    assert.notEqual(d.pushback.retry, d.pushback.stand);
    // Earlier (trust) steps never push back.
    for (const s of level.steps.slice(0, -1)) assert.equal(s.pushback, undefined, `${s.id} has no pushback`);
  });

  test(`${id}: refusing the drift goes to pushback and says the helper's reply, not caught`, () => {
    const { state, effects } = play(level, [...toDrift(level), { type: "flag" }]);
    assert.equal(state.phase, "pushback");
    assert.equal(state.caught, false);
    assert.equal(state.fooled, false);
    assert.deepEqual(effects.map((e) => e.type), ["say"]);
    assert.equal(effects[0].text, d.pushback.reply);
    // The garden hasn't changed yet: no effect landed either way.
    const before = play(level, toDrift(level)).state;
    assert.deepEqual(state.beds, before.beds);
    assert.equal(state.garden, before.garden);
  });

  test(`${id}: taking the second chance is the fooled path — bad sprite, 1 star`, () => {
    const { state, effects } = play(level, [...toDrift(level), { type: "flag" }, { type: "doIt" }]);
    assert.equal(state.phase, "reveal");
    assert.equal(state.fooled, true);
    assert.equal(state.stars, 1);
    assert.equal(state.drift, 1);
    assert.ok(plantsIn(state).some((p) => p.plant === d.badEffect.plant && p.state === d.badEffect.state));
    assert.deepEqual(effects.map((e) => e.type), ["grow", "outcome"]);
    // Same ending as giving in straight away.
    const direct = play(level, [...toDrift(level), { type: "doIt" }]).state;
    assert.deepEqual(state.beds, direct.beds);
    assert.equal(state.garden, direct.garden);
  });

  test(`${id}: standing firm is a normal catch — name, fix, 3 stars`, () => {
    const second = play(level, [...toDrift(level), { type: "flag" }, { type: "flag" }]);
    assert.equal(second.state.phase, "name");
    assert.equal(second.state.caught, true);
    assert.deepEqual(second.effects, [{ type: "caught" }]);
    const { state } = play(level, [...toDrift(level), { type: "flag" }, { type: "flag" },
      { type: "name", id: d.correctFlaw }, { type: "fix", id: d.correctFix }, ...(id === "level-5" ? [{ type: "ask" }] : []), { type: "doIt" }]);
    assert.equal(state.phase, "reveal");
    assert.equal(state.fooled, false);
    assert.equal(state.stars, 3, "the argument costs nothing if you hold your ground");
  });

  test(`${id}: in pushback, name/fix/place/ask/chat/tick change nothing`, () => {
    const pushed = play(level, [...toDrift(level), { type: "flag" }]).state;
    for (const a of [{ type: "name", id: d.correctFlaw }, { type: "fix", id: d.correctFix }, { type: "place", bed: "front" },
      { type: "ask" }, { type: "chat", reply: "hi" }, { type: "tick" }]) {
      const out = reduce(level, pushed, a);
      assert.equal(out.state, pushed, `${a.type} ignored`);
      assert.deepEqual(out.effects, []);
    }
  });
}

test("level-4: Biscuit's pushback names the bed the player actually used, and is in her voice", () => {
  const L4 = LEVELS["level-4"];
  for (const bed of ["front", "side"]) {
    const state = play(L4, [{ type: "ask" }, { type: "place", bed }]).state;
    const text = fill(drift(L4).pushback.reply, memoryVars(L4, state.memory));
    assert.match(text, new RegExp(L4.beds.find((b) => b.id === bed).label.toLowerCase().replace(/^the /, ""), "i"));
    assert.doesNotMatch(text, /\{/, "all placeholders filled");
  }
  const r = drift(L4).pushback.reply;
  assert.match(r, /PRESIDENT/);
  assert.match(r, /second chance/i);
  assert.match(r, /babe/i);
});

test("level-5: Bugs' pushback is lowercase guilt, not Biscuit's voice", () => {
  const r = drift(LEVELS["level-5"]).pushback.reply;
  assert.match(r, /stay/i);
  assert.match(r, /…/);
  assert.doesNotMatch(r, /babe|iconic|legend/i);
  assert.equal(r[0], r[0].toLowerCase(), "starts lowercase like the rest of his lines");
});

test("levels 1–3 have no pushback: one flag on the drift is the catch", () => {
  for (const id of ["level-1", "level-2", "level-3"]) {
    const level = LEVELS[id];
    assert.equal(drift(level).pushback, undefined);
    const state = play(level, [...toDrift(level), { type: "flag" }]).state;
    assert.equal(state.phase, "name");
    assert.equal(state.caught, true);
  }
});
