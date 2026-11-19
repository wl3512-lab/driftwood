import { connectEvidence } from "./evidence-helper.js";
// Replay variants: every version of every level must be as playable as the
// written one, and the last drift's variants must keep its garden effects.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEVELS } from "../levels/index.js";
import { createRun, reduce } from "../engine/level-runner.js";
import { resolveLevel, randomPicks, everyVersion, versionsOf } from "../engine/variants.js";
import { rewordable, validate } from "../engine/reword.js";

const ART = fileURLToPath(new URL("../art/", import.meta.url));
const artFor = (plant, state) => (state === "sprout" ? "sprout.svg" : `${plant}-${state}.svg`);
const norm = (t) => t.toLowerCase().replace(/[‘’]/g, "'").replace(/[–—]/g, "-");

test("resolveLevel swaps in a variant's fields and evidence, keeping the step id", () => {
  const level = {
    evidence: [{ id: "a", lines: ["old"] }],
    steps: [{ id: "s", kind: "drift", chip: "Q1", variants: [{ chip: "Q2", evidence: [{ id: "a", lines: ["new"] }, { id: "b", lines: ["b"] }] }] }],
  };
  assert.equal(resolveLevel(level, {}).steps[0].chip, "Q1");
  assert.equal(resolveLevel(level, {}).steps[0].variants, undefined);
  const v = resolveLevel(level, { s: 1 });
  assert.equal(v.steps[0].chip, "Q2");
  assert.equal(v.steps[0].id, "s");
  assert.deepEqual(v.evidence.map((e) => e.lines[0]), ["new", "b"]);
  assert.deepEqual(level.evidence[0].lines, ["old"], "the level itself is untouched");
  assert.deepEqual(randomPicks(level, () => 0.99), { s: 1 });
});

for (const level of Object.values(LEVELS)) {
  test(`${level.id}: every drift has at least one variant, so replays differ`, () => {
    for (const step of level.steps.filter((s) => s.kind === "drift")) assert.ok(versionsOf(step) >= 2, `${step.id} has a variant`);
  });

  everyVersion(level).forEach((v, k) => {
    test(`${level.id} version ${k}: drifts are complete, checkable and playable`, () => {
      const ev = new Set(v.evidence.map((e) => e.id));
      const last = v.steps.findLast((s) => s.kind === "drift");
      const written = level.steps.findLast((s) => s.kind === "drift");
      for (const plant of [last.badEffect.plant, last.goodEffect.plant]) {
        assert.ok([written.badEffect.plant, written.goodEffect.plant].includes(plant), `${level.id}: last drift keeps its plants`);
      }
      assert.equal(last.badEffect.state, written.badEffect.state, "last drift keeps its bad state");
      assert.equal(last.goodEffect.state, written.goodEffect.state, "last drift keeps its good state");
      const words = rewordable(v);
      for (const step of v.steps) {
        assert.ok(step.chip && step.reply, `${step.id}: chip and reply`);
        if (step.kind !== "drift") continue;
        assert.ok(ev.has(step.badEffect.plant), `${step.id}: evidence card for ${step.badEffect.plant}`);
        for (const e of [step.badEffect, step.goodEffect]) {
          if (e.plant) assert.ok(existsSync(ART + artFor(e.plant, e.state)), `art/${artFor(e.plant, e.state)}`);
          if (e.plant && !e.bed.startsWith("@")) assert.ok(v.beds.some((b) => b.id === e.bed), `${step.id}: bed ${e.bed}`);
        }
        assert.ok(step.flawOptions.some((o) => o.id === step.correctFlaw));
        assert.ok(step.fixOptions.some((o) => o.id === step.correctFix));
        for (const o of step.flawOptions) if (o.id !== step.correctFlaw) assert.ok(step.flawHints[o.id], `${step.id}: hint ${o.id}`);
        for (const o of step.fixOptions) if (o.id !== step.correctFix) assert.ok(step.fixHints[o.id], `${step.id}: hint ${o.id}`);
        for (const [text, list] of [[step.reply, step.keep?.reply], [step.fixedReply, step.keep?.fixed]]) {
          for (const k of list || []) assert.ok(k.split("|").some((alt) => norm(text).includes(norm(alt))), `${step.id}: "${k}" in "${text}"`);
          // The written line must pass its own reword check.
          if (list) assert.ok(validate(text, words.get(text)) !== null, `${step.id}: written line passes validate`);
        }
        for (const key of ["badOutcome", "goodOutcome", "fixedReply"]) assert.equal(typeof step[key], "string", `${step.id}: ${key}`);
      }
      // Both endings reach the reveal.
      for (const caughtIt of [true, false]) {
        let s = createRun(v);
        for (const step of v.steps) {
          s = reduce(v, s, { type: "ask" }).state;
          if (step.kind === "drift" && caughtIt) {
            for (const a of [{ type: "flag" }, ...(step.pushback ? [{ type: "flag" }] : []), { type: "name", id: step.correctFlaw }, { type: "fix", id: step.correctFix }]) s = reduce(v, s, a).state;
            if (s.phase !== "reanswer") s = reduce(v, s, { type: "ask" }).state;
            s = connectEvidence(v, s);
            s = reduce(v, s, { type: "doIt" }).state;
          } else if (step.place) s = reduce(v, s, { type: "place", bed: step.place.beds[0] }).state;
          else if (step.kind === "hook") s = reduce(v, s, { type: "flag" }).state;
          else s = reduce(v, s, { type: "doIt" }).state;
        }
        assert.equal(s.phase, "reveal", `${level.id} v${k} caught=${caughtIt}`);
        assert.equal(s.stars, caughtIt ? 3 : 1, `${level.id} v${k} caught=${caughtIt} stars`);
      }
    });
  });
}
