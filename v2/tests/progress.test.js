import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProgress, loadProgress, saveProgress, recordLevel, isUnlocked } from "../progress.js";

function fakeStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}
const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
const LEVEL = { id: "level-1", reveal: { flaw: "Sycophancy", tip: "Ask what could go wrong." } };

test("load returns empty progress when nothing is saved, storage is missing, or storage throws", () => {
  assert.deepEqual(loadProgress(fakeStorage()), emptyProgress());
  assert.deepEqual(loadProgress(null), emptyProgress());
  assert.deepEqual(loadProgress(throwing), emptyProgress());
});

test("load survives corrupt JSON", () => {
  const s = fakeStorage();
  s.setItem("dw2_progress", "{not json");
  assert.deepEqual(loadProgress(s), emptyProgress());
});

test("save then load round-trips", () => {
  const s = fakeStorage();
  const p = { ...emptyProgress(), name: "Ada" };
  saveProgress(s, p);
  assert.deepEqual(loadProgress(s), p);
});

test("save does not throw when storage is blocked", () => {
  assert.doesNotThrow(() => saveProgress(throwing, emptyProgress()));
});

test("recordLevel adds one field-guide card and keeps the best stars", () => {
  let p = recordLevel(emptyProgress(), LEVEL, { stars: 1, fooled: true });
  assert.deepEqual(p.levels["level-1"], { stars: 1, fooled: true });
  assert.deepEqual(p.guide, [{ levelId: "level-1", flaw: "Sycophancy", tip: "Ask what could go wrong.", fooled: true }]);
  p = recordLevel(p, LEVEL, { stars: 3, fooled: false });
  assert.equal(p.levels["level-1"].stars, 3);
  assert.equal(p.levels["level-1"].fooled, true, "first play is remembered");
  assert.equal(p.guide.length, 1);
  p = recordLevel(p, LEVEL, { stars: 1, fooled: true });
  assert.equal(p.levels["level-1"].stars, 3, "a worse replay keeps the best");
});

test("load rejects wrong field types and non-object JSON", () => {
  const s = fakeStorage();
  s.setItem("dw2_progress", '{"levels":null,"guide":"x","name":5}');
  const loaded = loadProgress(s);
  assert.deepEqual(loaded, emptyProgress());
  assert.doesNotThrow(() => recordLevel(loaded, LEVEL, { stars: 2, fooled: false }));
  for (const raw of ["[]", '"str"', "null", "7"]) {
    s.setItem("dw2_progress", raw);
    assert.deepEqual(loadProgress(s), emptyProgress());
  }
});

test("only level 1 is open at first; finishing a level opens the next", () => {
  const ids = ["level-1", "level-2", "level-3"];
  const fresh = emptyProgress();
  assert.equal(isUnlocked(fresh, 1, ids), true);
  assert.equal(isUnlocked(fresh, 2, ids), false);
  const after = recordLevel(fresh, LEVEL, { stars: 2, fooled: false });
  assert.equal(isUnlocked(after, 2, ids), true);
  assert.equal(isUnlocked(after, 3, ids), false);
});

test("load drops field-guide entries that aren't objects with a string levelId", () => {
  const s = fakeStorage();
  const good = { levelId: "level-1", flaw: "Sycophancy", tip: "Ask.", fooled: true };
  s.setItem("dw2_progress", JSON.stringify({
    name: "Ada", levels: {}, guide: [null, 7, "level-1", [], { levelId: 3 }, { flaw: "x" }, good],
  }));
  assert.deepEqual(loadProgress(s).guide, [good]);
});
