import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";
import { createRun, currentStep, reduce, training } from "../engine/level-runner.js";
import { revealCopy } from "../ui/reveal.js";
import { shouldTick } from "../mechanics/pressure.js";
import { createPressureClock } from "../ui/pressure-clock.js";

function play(level, { cite = false, fooled = [] } = {}) {
  let state = createRun(level);
  for (let i = 0; state.phase !== "reveal" && i < 100; i++) {
    const step = currentStep(level, state);
    const send = (a) => { state = reduce(level, state, a).state; };
    if (state.phase === "ask") send({ type: "ask" });
    else if (state.phase === "advice") send(step.kind === "trust"
      ? step.place ? { type: "place", bed: step.place.beds[0] } : { type: "doIt" }
      : { type: fooled.includes(step.id) ? "doIt" : "flag" });
    else if (state.phase === "pushback") send({ type: "flag" });
    else if (state.phase === "name") send({ type: "name", id: step.correctFlaw });
    else if (state.phase === "fix") send({ type: "fix", id: step.correctFix });
    else if (state.phase === "reanswer") {
      if (cite) {
        send({ type: "check", id: step.evidenceId });
        send({ type: "cite", id: step.evidenceId });
      }
      send({ type: "doIt" });
    }
  }
  assert.equal(state.phase, "reveal");
  return state;
}

test("every drift identifies the independent source behind its decision", () => {
  for (const level of Object.values(LEVELS)) for (const s of level.steps.filter(s => s.kind === "drift")) {
    assert.ok(s.evidenceId, `${level.id}/${s.id} needs a source`);
    assert.ok(level.evidence.some(e => e.id === s.evidenceId));
  }
});

test("guessing the right quiz answers without evidence cannot earn full rewards", () => {
  for (const level of Object.values(LEVELS)) {
    const state = play(level);
    assert.equal(state.stars, 2, level.id);
    assert.ok(training(state) < 1, level.id);
  }
});

test("checking and connecting the relevant source earns the last star", () => {
  for (const level of Object.values(LEVELS)) {
    const state = play(level, { cite: true });
    assert.equal(state.stars, 3, level.id);
    assert.equal(training(state), 1, level.id);
    assert.ok(state.incidents.every(i => i.verified));
  }
});

test("Biscuit's mixed result describes the early mistake and the later catch accurately", () => {
  const level = LEVELS["level-4"];
  const state = play(level, { cite: true, fooled: ["carrot-date"] });
  const text = revealCopy(level, state).thisTime;
  assert.match(text, /mud|rotted/);
  assert.doesNotMatch(text, /You dug up|You dug over/);
  assert.match(text, /left.*alone/);
});

test("clock eligibility excludes inspection and thinking", () => {
  const step = { pressure: { tickMs: 100 } };
  assert.equal(shouldTick(step, "advice", false, true), false);
  assert.equal(shouldTick(step, "advice", false, false), true);
});

test("pressure pauses for inspection, resumes with reading time, and cleans up", t => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const listeners = new Map(), actions = [];
  const doc = { hidden: false, addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k) };
  const clock = createPressureClock(a => actions.push(a), doc);
  const step = { pressure: { tickMs: 100 } };
  clock.sync(step, "advice", { paused: true, readingMs: 200 });
  t.mock.timers.tick(1000);
  assert.equal(actions.length, 0);
  clock.sync(step, "advice", { paused: false, readingMs: 200 });
  t.mock.timers.tick(199);
  assert.equal(actions.length, 0);
  t.mock.timers.tick(1);
  assert.equal(actions.length, 1);
  clock.destroy();
  t.mock.timers.tick(1000);
  assert.equal(actions.length, 1);
  assert.equal(listeners.size, 0);
});
