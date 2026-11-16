// The earlier plots Level 4 (and the ending) draw from saved progress.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";
import { finishedPlot, earlierPlots } from "../ui/finished-garden.js";
import { plantSrc } from "../garden/garden.js";

const L1 = LEVELS["level-1"];
const good = L1.steps.at(-1).goodEffect;
const bad = L1.steps.at(-1).badEffect;

test("finishedPlot: caught (stars above 1) shows the good sprite", () => {
  const plot = finishedPlot(L1, { stars: 3, fooled: false });
  assert.equal(plot.caught, true);
  assert.equal(plot.src, plantSrc(good.plant, good.state));
  assert.equal(plot.levelId, "level-1");
  assert.equal(plot.helper, L1.helper.name);
  assert.equal(plot.alt, `${good.plant}, ${good.state}`);
});

test("finishedPlot: fooled with 1 star shows the bad sprite", () => {
  const plot = finishedPlot(L1, { stars: 1, fooled: true });
  assert.equal(plot.caught, false);
  assert.equal(plot.src, plantSrc(bad.plant, bad.state));
});

test("finishedPlot: caught on the first play but 1 star still counts as caught", () => {
  assert.equal(finishedPlot(L1, { stars: 1, fooled: false }).caught, true);
});

test("finishedPlot: no record, or no level → null", () => {
  assert.equal(finishedPlot(L1, undefined), null);
  assert.equal(finishedPlot(undefined, { stars: 3, fooled: false }), null);
});

test("earlierPlots: keeps the order asked for and skips unfinished levels", () => {
  const progress = { levels: { "level-1": { stars: 3, fooled: false }, "level-3": { stars: 1, fooled: true } } };
  const plots = earlierPlots(["level-1", "level-2", "level-3"], LEVELS, progress);
  assert.deepEqual(plots.map((p) => [p.levelId, p.caught]), [["level-1", true], ["level-3", false]]);
  assert.deepEqual(earlierPlots(["level-1"], LEVELS, null), []);
  assert.deepEqual(earlierPlots(["level-1"], LEVELS, { levels: {} }), []);
});

test("finishedPlot: Level 3's plot is its blueberry bush, either way", () => {
  const L3 = LEVELS["level-3"];
  const caught = finishedPlot(L3, { stars: 3, fooled: false });
  const fooled = finishedPlot(L3, { stars: 1, fooled: true });
  assert.equal(caught.src, plantSrc("blueberry", "thriving"));
  assert.equal(fooled.src, plantSrc("blueberry", "pecked"));
  assert.deepEqual([caught.caught, fooled.caught], [true, false]);
});
