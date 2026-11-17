import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, reduce } from "../engine/level-runner.js";
import { emptyProgress, recordLevel, saveProgress, loadProgress } from "../progress.js";
import { LEVELS } from "../levels/index.js";
import { rateStew, caughtOn } from "../engine/stew.js";
import { finishedPlot } from "../ui/finished-garden.js";
import { plantSrc } from "../garden/garden.js";

const level = LEVELS["level-1"];
function finish(catchDrift) {
  let state = createRun(level);
  const act = (action) => { state = reduce(level, state, action).state; };
  // Every drift is followed, or caught with a wrong name and a wrong rule first.
  while (state.phase !== "reveal") {
    const step = level.steps[state.stepIndex];
    act({ type: "ask" });
    if (step.kind === "drift" && catchDrift) {
      act({ type: "flag" });
      act({ type: "name", id: step.flawOptions.find((o) => o.id !== step.correctFlaw).id });
      act({ type: "name", id: step.correctFlaw });
      act({ type: "fix", id: step.fixOptions.find((o) => o.id !== step.correctFix).id });
      act({ type: "fix", id: step.correctFix });
    }
    act({ type: "doIt" });
  }
  assert.equal(state.phase, "reveal");
  assert.equal(state.stars, 1);
  return state;
}
function replayed() {
  const first = recordLevel(emptyProgress(), level, finish(false));
  return recordLevel(first, level, finish(true));
}

test("a one-star catch replay remembers the healthy garden while preserving the first-play guide", () => {
  const progress = replayed();
  assert.equal(progress.levels[level.id].stars, 1);
  assert.equal(progress.levels[level.id].fooled, true, "first-play history is unchanged");
  assert.equal(progress.guide[0].fooled, true);
  assert.equal(progress.levels[level.id].caught, true, "a successful catch is independent of stars");
  const storage = { getItem: () => storage.value, setItem: (_, value) => { storage.value = value; } };
  saveProgress(storage, progress);
  assert.equal(caughtOn(loadProgress(storage).levels[level.id]), true);
});

test("a one-star catch replay restores the finished plot's healthy crop", () => {
  const progress = replayed();
  const plot = finishedPlot(level, progress.levels[level.id]);
  const effect = level.steps.at(-1).goodEffect;
  assert.equal(plot.caught, true);
  assert.equal(plot.src, plantSrc(effect.plant, effect.state));
});

test("a one-star catch replay restores the tomatoes to Rowan's dinner", () => {
  const progress = replayed();
  assert.equal(rateStew(progress, [level.id]).dishes.find((d) => d.id === "tomato").present, true);
});

test("a later fooled replay cannot erase a previous one-star catch", () => {
  const progress = recordLevel(replayed(), level, finish(false));
  assert.equal(caughtOn(progress.levels[level.id]), true);
});

test("replaying a legacy save retains its earlier catch", () => {
  for (const record of [{ stars: 1, fooled: false }, { stars: 2, fooled: true }]) {
    const progress = recordLevel({ ...emptyProgress(), levels: { [level.id]: record } }, level, finish(false));
    assert.equal(caughtOn(progress.levels[level.id]), true);
  }
});
