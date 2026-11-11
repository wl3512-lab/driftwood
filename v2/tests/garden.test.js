import { test } from "node:test";
import assert from "node:assert/strict";
import { levelSprites } from "../garden/garden.js";
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
