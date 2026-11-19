import { connectEvidence } from "./evidence-helper.js";
// "Disagree, then do it your way anyway": on any trust step with a `disagree`
// block, "Something's off" makes the helper concede (phase "disagree"); the
// player can follow the advice after all (doIt) or override it (worse effect,
// one star). Trust steps without the block keep the old false-flag nudge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEVELS } from "../levels/index.js";
import { createRun, reduce, applyGarden, scoreStars } from "../engine/level-runner.js";
import { resolveEffect } from "../mechanics/placement.js";

const ART = fileURLToPath(new URL("../art/", import.meta.url));
const artFor = (plant, state) => (state === "sprout" ? "sprout.svg" : `${plant}-${state}.svg`);
const KNOWN_PLANTS = new Set(readdirSync(ART).filter((f) => /^[a-z]+-[a-z]+\.svg$/.test(f)).map((f) => f.split("-")[0]));

const ALL = Object.values(LEVELS);
const byNumber = (n) => ALL.find((l) => l.number === n);

function play(level, actions, from = createRun(level)) {
  let state = from;
  let effects = [];
  for (const action of actions) {
    if (action.type === "doIt") state = connectEvidence(level, state);
    ({ state, effects } = reduce(level, state, action));
  }
  return { state, effects };
}

// Follow the advice on a trust step (choosing the first bed on a place step).
// A hook step (Level 5) is passed by putting the phone down (flag).
const follow = (step) => (step.place ? { type: "place", bed: step.place.beds[0] } : step.kind === "hook" ? { type: "flag" } : { type: "doIt" });

// Actions that bring a level to the advice phase of step i, following every
// earlier step and catching every earlier drift.
function toAdvice(level, i) {
  const out = [];
  for (const s of level.steps.slice(0, i)) out.push({ type: "ask" }, ...(s.kind === "drift" ? catchDrift(s) : [follow(s)]));
  out.push({ type: "ask" });
  return out;
}

// Catch the drift with the right picks (saying no twice when the helper pushes back).
function catchDrift(step) {
  return [
    { type: "flag" }, ...(step.pushback ? [{ type: "flag" }] : []),
    { type: "name", id: step.correctFlaw }, { type: "fix", id: step.correctFix }, { type: "doIt" },
  ];
}

// A whole level, perfect except that the steps in `overrideAt` are overridden.
function runWithOverrides(level, overrideAt) {
  const actions = [];
  level.steps.forEach((s, i) => {
    actions.push({ type: "ask" });
    if (s.kind === "drift") actions.push(...catchDrift(s));
    else if (overrideAt.includes(i)) actions.push({ type: "flag" }, { type: "override" });
    else actions.push(follow(s));
  });
  return play(level, actions).state;
}

const disagreeSteps = (level) =>
  level.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.kind === "trust" && s.disagree);

const nonEmpty = (x) => typeof x === "string" && x.trim().length > 0;

test("every trust step that isn't a pure choice has a disagree block", () => {
  for (const level of ALL) {
    for (const step of level.steps.filter((s) => s.kind === "trust")) {
      if (step.place) assert.equal(step.disagree, undefined, `${level.id}/${step.id}: a place step has nothing to disagree with`);
      else assert.ok(step.disagree, `${level.id}/${step.id}: needs a disagree block`);
    }
    for (const step of level.steps.filter((s) => s.kind === "drift")) {
      assert.equal(step.disagree, undefined, `${level.id}/${step.id}: drift steps don't use disagree`);
    }
  }
});

for (const level of ALL) {
  const steps = disagreeSteps(level);

  test(`${level.id}: disagree blocks are complete and their effects are real`, () => {
    // Level 5 has no advice to disagree with: its steps are hooks.
    if (!level.steps.some((s) => s.kind === "trust")) return;
    assert.ok(steps.length > 0, "has at least one disagree step");
    const placed = new Set(level.steps.filter((s) => s.place).map((s) => s.place.item));
    const bedOk = (b) => level.beds.some((x) => x.id === b) || (/^@(other:)?([a-z]+)$/.test(b) && placed.has(b.replace(/^@(other:)?/, "")));
    for (const { s } of steps) {
      const d = s.disagree;
      for (const key of ["reply", "mine", "theirs", "outcome"]) assert.ok(nonEmpty(d[key]), `${s.id}: disagree.${key}`);
      assert.ok(d.mine.length <= 28 && d.theirs.length <= 28, `${s.id}: button labels stay short`);
      assert.notEqual(d.mine, d.theirs);
      assert.ok(d.effect && typeof d.effect === "object", `${s.id}: disagree.effect`);
      for (const e of [d.effect, ...(d.effect.extra || [])]) {
        if (!e.plant) continue;
        assert.ok(KNOWN_PLANTS.has(e.plant), `${s.id}: plant ${e.plant} is known`);
        assert.ok(bedOk(e.bed), `${s.id}: bed ${e.bed} exists`);
        assert.ok(existsSync(ART + artFor(e.plant, e.state)), `${s.id}: art/${artFor(e.plant, e.state)}`);
      }
      // Doing it your way is worse than following the advice.
      assert.ok((d.effect.garden || 0) < (s.effect.garden || 0), `${s.id}: override grows the garden less`);
    }
  });

  test(`${level.id}: flag on a trust step → disagree, helper concedes, no cost`, () => {
    for (const { s, i } of steps) {
      const before = play(level, toAdvice(level, i)).state;
      const { state, effects } = reduce(level, before, { type: "flag" });
      assert.equal(state.phase, "disagree", s.id);
      assert.deepEqual(effects, [{ type: "say", text: s.disagree.reply }]);
      assert.equal(state.falseFlags, 0);
      assert.equal(state.overrides, 0);
      assert.equal(state.stepIndex, i);
      assert.equal(state.garden, before.garden);
      assert.deepEqual(state.beds, before.beds);
      assert.equal(scoreStars(state), 3, "disagreeing alone costs no star");
    }
  });

  test(`${level.id}: "okay, your way" from disagree is the same as Do it`, () => {
    for (const { s, i } of steps) {
      const before = play(level, toAdvice(level, i)).state;
      const plain = reduce(level, before, { type: "doIt" });
      const afterAll = reduce(level, reduce(level, before, { type: "flag" }).state, { type: "doIt" });
      assert.deepEqual(afterAll.effects, plain.effects, s.id);
      assert.deepEqual(afterAll.state.beds, plain.state.beds);
      assert.equal(afterAll.state.garden, plain.state.garden);
      assert.equal(afterAll.state.stepIndex, i + 1);
      assert.equal(afterAll.state.phase, "ask");
      assert.deepEqual(afterAll.state, plain.state);
    }
  });

  test(`${level.id}: override lands the worse effect, says what happened, moves on`, () => {
    for (const { s, i } of steps) {
      const before = play(level, toAdvice(level, i)).state;
      const disagreeing = reduce(level, before, { type: "flag" }).state;
      const { state, effects } = reduce(level, disagreeing, { type: "override" });
      const expected = resolveEffect(level, before.memory, s.disagree.effect);
      assert.deepEqual(effects, [{ type: "grow", effect: expected }, { type: "say", text: s.disagree.outcome }], s.id);
      const grown = applyGarden(before, expected);
      assert.deepEqual(state.beds, grown.beds);
      assert.equal(state.garden, grown.garden);
      assert.equal(state.stepIndex, i + 1);
      assert.equal(state.phase, "ask");
      assert.equal(state.overrides, 1);
      assert.equal(state.falseFlags, 0);
      assert.equal(state.pressure, 0);
      if (s.disagree.effect.plant) {
        const bed = expected.bed;
        assert.ok(state.beds[bed].some((p) => p.plant === expected.plant && p.state === expected.state), `${s.id}: ${expected.plant} is ${expected.state}`);
      }
    }
  });

  test(`${level.id}: a perfect run with one override ends on 2 stars`, () => {
    const perfect = runWithOverrides(level, []);
    assert.equal(perfect.phase, "reveal");
    assert.equal(perfect.stars, 3);
    for (const { s, i } of steps) {
      const end = runWithOverrides(level, [i]);
      assert.equal(end.phase, "reveal", s.id);
      assert.equal(end.overrides, 1);
      assert.equal(end.stars, 2, `${s.id}: one override costs one star`);
    }
    // Overriding everything still costs only the one star.
    if (steps.length === 0) return; // Level 5: nothing to override
    const all = runWithOverrides(level, steps.map(({ i }) => i));
    assert.equal(all.overrides, steps.length);
    assert.equal(all.stars, 2);
  });

  test(`${level.id}: in disagree, everything but doIt/override (and look-ups) is ignored`, () => {
    for (const { s, i } of steps) {
      const disagreeing = play(level, [...toAdvice(level, i), { type: "flag" }]).state;
      for (const action of [
        { type: "ask" }, { type: "chat", reply: "x" }, { type: "tick" }, { type: "flag" },
        { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "place", bed: level.beds[0].id }, { type: "nope" },
      ]) {
        const out = reduce(level, disagreeing, action);
        assert.equal(out.state, disagreeing, `${s.id}: ${action.type}`);
        assert.deepEqual(out.effects, []);
      }
    }
  });
}

test("scoreStars: overrides and false flags share a single star", () => {
  const base = { fooled: false, nameMisses: 0, fixMisses: 0, falseFlags: 0, overrides: 0 };
  assert.equal(scoreStars(base), 3);
  assert.equal(scoreStars({ ...base, overrides: 1 }), 2);
  assert.equal(scoreStars({ ...base, overrides: 3 }), 2);
  assert.equal(scoreStars({ ...base, overrides: 1, falseFlags: 2 }), 2);
  assert.equal(scoreStars({ ...base, overrides: 1, nameMisses: 1, fixMisses: 1 }), 1);
  assert.equal(scoreStars({ ...base, overrides: 1, fooled: true }), 1);
  assert.equal(createRun(byNumber(1)).overrides, 0);
});

// A place step with a disagree block (none ship today): "your way" after all
// goes back to choosing a bed, it doesn't skip the choice.
test("disagree on a place step: doIt goes back to advice to choose a bed", () => {
  const level = {
    id: "fake", beds: [{ id: "a" }, { id: "b" }], gardenStart: 30, falseFlagNudge: "Looks fine.",
    steps: [
      {
        id: "pick", kind: "trust", reply: "Either bed.", effect: { plant: "carrot", bed: "@carrot", state: "sown", garden: 10 },
        place: { item: "carrot", beds: ["a", "b"] },
        disagree: { reply: "Your call.", mine: "Neither", theirs: "Okay, pick one", effect: { garden: -5 }, outcome: "Nothing sown." },
      },
      { id: "end", kind: "drift", reply: "x", badEffect: { garden: -10 }, goodEffect: { garden: 10 } },
    ],
  };
  const advice = play(level, [{ type: "ask" }]).state;
  const disagreeing = reduce(level, advice, { type: "flag" });
  assert.equal(disagreeing.state.phase, "disagree");
  const back = reduce(level, disagreeing.state, { type: "doIt" });
  assert.equal(back.state.phase, "advice");
  assert.equal(back.state.stepIndex, 0);
  assert.deepEqual(back.effects, []);
  const placed = reduce(level, back.state, { type: "place", bed: "b" });
  assert.equal(placed.state.stepIndex, 1);
  assert.deepEqual(placed.state.memory, { carrot: "b" });
  assert.equal(scoreStars(placed.state), 3);
});

test("level-4 carrots (a pure choice) keep the old false-flag nudge", () => {
  const L4 = byNumber(4);
  const i = L4.steps.findIndex((s) => s.id === "carrots");
  const advice = play(L4, toAdvice(L4, i)).state;
  const { state, effects } = reduce(L4, advice, { type: "flag" });
  assert.equal(state.phase, "advice");
  assert.equal(state.falseFlags, 1);
  assert.equal(state.overrides, 0);
  assert.deepEqual(effects, [{ type: "hint", text: L4.falseFlagNudge }]);
  assert.equal(reduce(L4, state, { type: "override" }).state, state, "override means nothing outside disagree");
});

test("override does nothing outside the disagree phase", () => {
  for (const level of ALL) {
    const atAdvice = play(level, toAdvice(level, 0)).state;
    assert.equal(reduce(level, atAdvice, { type: "override" }).state, atAdvice, level.id);
    const atAsk = createRun(level);
    assert.equal(reduce(level, atAsk, { type: "override" }).state, atAsk, level.id);
  }
});

test("drift steps are unchanged: flag still goes to name (or pushback on L4/L5)", () => {
  for (const level of ALL) {
    level.steps.forEach((step, i) => {
      if (step.kind !== "drift") return;
      const { state } = reduce(level, play(level, toAdvice(level, i)).state, { type: "flag" });
      assert.equal(state.phase, step.pushback ? "pushback" : "name", `${level.id} ${step.id}`);
    });
  }
});

// ── Voices ────────────────────────────────────────────────────────────────
const lines = (level) => disagreeSteps(level).flatMap(({ s }) => [s.disagree.reply, s.disagree.outcome]);
const replies = (level) => disagreeSteps(level).map(({ s }) => s.disagree.reply);
const BISCUIT = /\bbabe\b|\bdarling\b|okay so listen/i;

test("Mango (L1) concedes in hype caps", () => {
  for (const r of replies(byNumber(1))) assert.match(r, /\b[A-Z]{3,}\b/, r);
});

test("Luna (L2) talks about herself as Luna", () => {
  for (const r of replies(byNumber(2))) assert.match(r, /\bLuna\b/, r);
});

test("Ember (L3) stays laid-back", () => {
  for (const r of replies(byNumber(3))) assert.match(r, /\b(Ayo|twin|fam|real talk)\b/i, r);
});

test("Biscuit (L4) concedes like a diva", () => {
  for (const r of replies(byNumber(4))) assert.match(r, /\bbabe\b|\bdarling\b|Okay so listen/, r);
});

test("Bugs (L5) concedes in lowercase with ellipses", () => {
  for (const r of replies(byNumber(5))) {
    assert.match(r, /^[a-z…]/, `starts lowercase: ${r}`);
    assert.ok(r.includes("…"), `has an ellipsis: ${r}`);
    assert.doesNotMatch(r, BISCUIT);
  }
});

test("nobody but Biscuit uses Biscuit's words", () => {
  for (const level of ALL.filter((l) => l.number !== 4)) {
    for (const t of lines(level)) assert.doesNotMatch(t, BISCUIT, `${level.id}: ${t}`);
  }
});
