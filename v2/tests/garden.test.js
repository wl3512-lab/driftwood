import { test } from "node:test";
import assert from "node:assert/strict";
import { levelSprites, fieldDensity } from "../garden/garden.js";
import { LEVELS } from "../levels/index.js";

test("levelSprites lists every plant sprite a level can show, once each", () => {
  const level = {
    startPlants: { a: [{ plant: "lettuce", state: "growing" }] },
    steps: [
      { kind: "trust", effect: { plant: "sunflower", bed: "a", state: "growing" } },
      { kind: "trust", effect: { water: true } },
      { kind: "drift", badEffect: { plant: "tomato", state: "damaged" }, goodEffect: { plant: "tomato", state: "thriving" } },
    ],
  };
  assert.deepEqual(levelSprites(level).sort(), [
    "./art/lettuce-growing.svg", "./art/lettuce-thriving.svg",
    "./art/sunflower-growing.svg", "./art/sunflower-thriving.svg",
    "./art/tomato-damaged.svg", "./art/tomato-thriving.svg",
  ]);
});

test("level 1 preloads the damaged tomato", () => {
  assert.ok(levelSprites(LEVELS["level-1"]).includes("./art/tomato-damaged.svg"));
});

test("levelSprites also walks effect.extra and pressure.effects", () => {
  const level = {
    startPlants: {},
    steps: [
      { kind: "trust", effect: { plant: "carrot", bed: "@carrot", state: "sown" } },
      { kind: "drift",
        pressure: { tickMs: 8000, effects: [{ plant: "flower", bed: "m", state: "thirsty" }, { plant: "flower", bed: "m", state: "wilted" }] },
        badEffect: { plant: "mint", state: "overrun", extra: [{ plant: "basil", bed: "a", state: "choked" }] },
        goodEffect: { plant: "carrot", state: "growing", extra: [{ plant: "lettuce", bed: "@other:carrot", state: "growing" }] } },
    ],
  };
  assert.deepEqual(levelSprites(level).sort(), [
    "./art/basil-choked.svg",
    "./art/carrot-growing.svg", "./art/carrot-sown.svg", "./art/carrot-thriving.svg",
    "./art/flower-thirsty.svg", "./art/flower-wilted.svg",
    "./art/lettuce-growing.svg", "./art/lettuce-thriving.svg",
    "./art/mint-overrun.svg",
  ]);
});

test("fieldDensity: big crops and sown beds one per tile, small crops staggered", () => {
  assert.equal(fieldDensity("tomato", "thriving"), "big");
  assert.equal(fieldDensity("pumpkin", "growing"), "big");
  assert.equal(fieldDensity("carrot", "sown"), "big");
  assert.equal(fieldDensity("carrot", "growing"), "dense");
  assert.equal(fieldDensity("lettuce", "growing"), "dense");
  assert.equal(fieldDensity("flower", "wilted"), "dense");
});
