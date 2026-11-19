import { connectEvidence } from "./evidence-helper.js";
// Guards every level file against the mistakes the runner can't survive:
// a level that doesn't end on a drift, a correct answer missing from its
// options, a wrong option with no hint, a bed or sprite that doesn't exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { LEVELS, MAP } from "../levels/index.js";
import { createRun, reduce } from "../engine/level-runner.js";

const ART = fileURLToPath(new URL("../art/", import.meta.url));
// Sprite paths are used as <img src> on v2/index.html, so they resolve against v2/.
const PAGE_DIR = fileURLToPath(new URL("../", import.meta.url));
const artFor = (plant, state) => (state === "sprout" ? "sprout.svg" : `${plant}-${state}.svg`);

for (const level of Object.values(LEVELS)) {
  test(`${level.id}: shape`, () => {
    assert.ok(level.steps.length >= 2);
    assert.equal(level.steps.at(-1).kind, "drift", "the last step must be the drift");
    assert.ok(level.steps.filter((s) => s.kind === "drift").length >= 2, "at least two drifts per level, so training fills in steps");
    for (const key of ["flaw", "body", "fooledLine", "caughtLine", "tip"]) assert.ok(level.reveal[key], `reveal.${key}`);
    assert.ok(MAP.some((m) => m.id === level.id), "level is on the map");
  });

  test(`${level.id}: steps`, () => {
    // "@item" / "@other:item" refs must name an item some step places.
    const placed = new Set(level.steps.filter((s) => s.place).map((s) => s.place.item));
    const bedIds = { has: (b) => level.beds.some((x) => x.id === b) || (/^@(other:)?([a-z]+)$/.test(b) && placed.has(b.replace(/^@(other:)?/, ""))) };
    for (const step of level.steps) {
      assert.ok(step.chip && step.reply, `${step.id}: chip and reply`);
      const effects = step.kind === "drift" ? [step.badEffect, step.goodEffect] : [step.effect];
      for (const e of effects) {
        if (e.plant) assert.ok(bedIds.has(e.bed), `${step.id}: bed ${e.bed} exists`);
        for (const x of e.extra || []) assert.ok(bedIds.has(x.bed), `${step.id}: extra bed ${x.bed} exists`);
      }
      // Pressure effects are applied as written (never resolved), so they must name real beds.
      for (const p of step.pressure?.effects || []) {
        assert.ok(!String(p.bed).startsWith("@"), `${step.id}: pressure effects can't use @item beds`);
        assert.ok(level.beds.some((x) => x.id === p.bed), `${step.id}: pressure bed ${p.bed} exists`);
      }
      if (step.place) for (const b of step.place.beds) assert.ok(level.beds.some((x) => x.id === b), `${step.id}: place bed ${b}`);
      if (step.kind !== "drift") continue;
      assert.ok(step.flawOptions.some((o) => o.id === step.correctFlaw), "correct flaw is an option");
      assert.ok(step.fixOptions.some((o) => o.id === step.correctFix), "correct fix is an option");
      for (const o of step.flawOptions) if (o.id !== step.correctFlaw) assert.ok(step.flawHints[o.id], `hint for ${o.id}`);
      for (const o of step.fixOptions) if (o.id !== step.correctFix) assert.ok(step.fixHints[o.id], `hint for ${o.id}`);
      assert.ok(step.fixedReply);
      for (const key of ["badOutcome", "goodOutcome"]) assert.equal(typeof step[key], "string", `${step.id}: ${key} line`);
    }
  });

  test(`${level.id}: every sprite it uses exists`, () => {
    const used = [];
    for (const list of Object.values(level.startPlants || {})) used.push(...list);
    for (const step of level.steps) {
      for (const e of [step.effect, step.badEffect, step.goodEffect, step.disagree?.effect, ...(step.pressure?.effects || [])]) {
        if (e?.plant) used.push(e);
        for (const x of e?.extra || []) used.push(x);
      }
    }
    for (const e of level.evidence) assert.ok(existsSync(ART + `${e.icon || "seed-packet"}.svg`), `evidence icon ${e.icon}`);
    for (const t of level.tools || []) if (!t.page) assert.ok(existsSync(resolve(PAGE_DIR, t.sprite)), `tool sprite ${t.sprite}`);
    for (const p of level.props || []) if (p.sprite) assert.ok(existsSync(resolve(PAGE_DIR, p.sprite)), `prop ${p.sprite}`);
    for (const p of used) assert.ok(existsSync(ART + artFor(p.plant, p.state)), `art/${artFor(p.plant, p.state)}`);
    for (const f of ["seed-packet.svg", "watering-can.svg"]) assert.ok(existsSync(ART + f), `art/${f}`);
    assert.ok(existsSync(resolve(PAGE_DIR, level.helper.sprite)), `helper sprite ${level.helper.sprite}`);
  });

  test(`${level.id}: evidence and start plants`, () => {
    const bedIds = new Set(level.beds.map((b) => b.id));
    const evidenceIds = new Set(level.evidence.map((e) => e.id));
    for (const step of level.steps) {
      if (step.kind === "drift") {
        assert.ok(step.badEffect, `${step.id}: drift step needs badEffect`);
        assert.ok(step.badEffect.plant, `${step.id}: badEffect needs a plant`);
        assert.ok(evidenceIds.has(step.badEffect.plant), `${step.id}: evidence item for ${step.badEffect.plant}`);
      }
    }
    for (const id of Object.keys(level.startPlants || {})) assert.ok(bedIds.has(id), `startPlants bed ${id} exists`);
  });

  test(`${level.id}: options and hints line up`, () => {
    for (const step of level.steps) {
      if (step.kind === "trust") assert.ok(step.effect, `${step.id}: trust step needs effect`);
      if (step.kind !== "drift") continue;
      assert.ok(step.badEffect, `${step.id}: drift step needs badEffect`);
      assert.ok(step.goodEffect, `${step.id}: drift step needs goodEffect`);
      for (const [opts, hints, correct, name] of [
        [step.flawOptions, step.flawHints, step.correctFlaw, "flaw"],
        [step.fixOptions, step.fixHints, step.correctFix, "fix"],
      ]) {
        const ids = opts.map((o) => o.id);
        assert.equal(new Set(ids).size, ids.length, `${step.id}: ${name} option ids unique`);
        assert.ok(ids.includes(correct), `${step.id}: correct ${name} is an option`);
        for (const key of Object.keys(hints)) assert.ok(ids.includes(key), `${step.id}: ${name} hint "${key}" is an option id`);
      }
    }
  });

  test(`${level.id}: helper matches its map entry`, () => {
    const entry = MAP.find((m) => m.id === level.id);
    assert.ok(entry, "on the map");
    assert.equal(level.helper.sprite, entry.sprite);
  });
}

test("every map entry's sprite exists (levels 2-5 included)", () => {
  for (const m of MAP) assert.ok(existsSync(resolve(PAGE_DIR, m.sprite)), `${m.id}: ${m.sprite}`);
});

// The real Level 1, end to end through the reducer.
function playReal(actions) {
  const level = LEVELS["level-1"];
  let state = createRun(level);
  for (const action of actions) {
    if (action.type === "doIt") state = connectEvidence(level, state);
    state = reduce(level, state, action).state;
  }
  return state;
}
// Every step of Level 1 in order: trust steps are followed; each drift is
// either followed (fooled) or caught with the right picks.
function walkL1(catchIt) {
  const actions = [];
  for (const step of LEVELS["level-1"].steps) {
    actions.push({ type: "ask" });
    if (step.kind === "drift" && catchIt) {
      actions.push({ type: "flag" }, { type: "name", id: step.correctFlaw }, { type: "fix", id: step.correctFix }, { type: "doIt" });
    } else actions.push({ type: "doIt" });
  }
  return actions;
}

test("level 1 fooled path ends on the reveal with 1 star", () => {
  const state = playReal(walkL1(false));
  assert.equal(state.phase, "reveal");
  assert.equal(state.stars, 1);
});

test("level 1 caught path with the right picks earns 3 stars", () => {
  const state = playReal(walkL1(true));
  assert.equal(state.phase, "reveal");
  assert.equal(state.stars, 3);
});
