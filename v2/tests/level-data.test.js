// Guards every level file against the mistakes the runner can't survive:
// a level that doesn't end on a drift, a correct answer missing from its
// options, a wrong option with no hint, a bed or sprite that doesn't exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEVELS, MAP } from "../levels/index.js";

const ART = fileURLToPath(new URL("../art/", import.meta.url));
const ICONS = fileURLToPath(new URL("../../icons/", import.meta.url));
const artFor = (plant, state) => (state === "sprout" ? "sprout.svg" : `${plant}-${state}.svg`);

for (const level of Object.values(LEVELS)) {
  test(`${level.id}: shape`, () => {
    assert.ok(level.steps.length >= 2);
    assert.equal(level.steps.at(-1).kind, "drift", "the last step must be the drift");
    assert.equal(level.steps.filter((s) => s.kind === "drift").length, 1, "exactly one drift per level");
    assert.ok(level.redirects.length > 0);
    for (const key of ["flaw", "body", "fooledLine", "caughtLine", "tip"]) assert.ok(level.reveal[key], `reveal.${key}`);
    assert.ok(MAP.some((m) => m.id === level.id), "level is on the map");
  });

  test(`${level.id}: steps`, () => {
    const bedIds = new Set(level.beds.map((b) => b.id));
    for (const step of level.steps) {
      assert.ok(step.chip && step.reply && step.keywords.length, `${step.id}: chip, reply, keywords`);
      const effects = step.kind === "trust" ? [step.effect] : [step.badEffect, step.goodEffect];
      for (const e of effects) if (e.plant) assert.ok(bedIds.has(e.bed), `${step.id}: bed ${e.bed} exists`);
      if (step.kind !== "drift") continue;
      assert.ok(step.flawOptions.some((o) => o.id === step.correctFlaw), "correct flaw is an option");
      assert.ok(step.fixOptions.some((o) => o.id === step.correctFix), "correct fix is an option");
      for (const o of step.flawOptions) if (o.id !== step.correctFlaw) assert.ok(step.flawHints[o.id], `hint for ${o.id}`);
      for (const o of step.fixOptions) if (o.id !== step.correctFix) assert.ok(step.fixHints[o.id], `hint for ${o.id}`);
      assert.ok(step.fixedReply);
    }
  });

  test(`${level.id}: every sprite it uses exists`, () => {
    const used = [];
    for (const list of Object.values(level.startPlants || {})) used.push(...list);
    for (const step of level.steps) {
      for (const e of [step.effect, step.badEffect, step.goodEffect]) if (e?.plant) used.push(e);
    }
    for (const p of used) assert.ok(existsSync(ART + artFor(p.plant, p.state)), `art/${artFor(p.plant, p.state)}`);
    for (const f of ["seed-packet.svg", "watering-can.svg"]) assert.ok(existsSync(ART + f), `art/${f}`);
    assert.ok(existsSync(ICONS + level.helper.sprite.split("/").pop()), "helper sprite");
  });
}
