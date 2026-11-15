// The reveal card's copy, the field guide's slots and the fit-to-window layout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, MAP } from "../levels/index.js";
import { revealCopy, flawLines, guideSlots, pickLayout, stageSize } from "../ui/reveal.js";

const L4 = LEVELS["level-4"];
const ORDER = MAP.map((m) => m.id);

test("caught: BUSTED stamp, 'Keep doing this', the caught line", () => {
  const c = revealCopy(L4, { fooled: false, stars: 2 });
  assert.equal(c.outcome, "caught");
  assert.equal(c.stamp, "Busted");
  assert.equal(c.stampBlock, "BUSTED");
  assert.equal(c.tipLabel, "Keep doing this");
  assert.equal(c.thisTime, L4.reveal.caughtLine);
  assert.equal(c.stars, 2);
});

test("fooled: IT FOOLED YOU stamp, 'Next time', the fooled line", () => {
  const c = revealCopy(L4, { fooled: true, stars: 1 });
  assert.equal(c.outcome, "fooled");
  assert.equal(c.stamp, "It fooled you");
  assert.equal(c.tipLabel, "Next time");
  assert.equal(c.thisTime, L4.reveal.fooledLine);
});

test("stars are clamped to 0..3 whole stars", () => {
  assert.equal(revealCopy(L4, { stars: 7 }).stars, 3);
  assert.equal(revealCopy(L4, { stars: -1 }).stars, 0);
  assert.equal(revealCopy(L4, { stars: "x" }).stars, 0);
});

test("every level has the copy the card needs", () => {
  for (const m of MAP) {
    const r = LEVELS[m.id].reveal;
    for (const key of ["flaw", "flawGloss", "tip", "realWorld", "caughtLine", "fooledLine"]) assert.ok(r[key], `${m.id} reveal.${key}`);
  }
});

test("flaw names break one word per line", () => {
  assert.equal(flawLines("False memory"), "FALSE\nMEMORY");
  assert.equal(flawLines("Sycophancy"), "SYCOPHANCY");
  assert.equal(flawLines(" Emotional  manipulation "), "EMOTIONAL\nMANIPULATION");
});

test("guide slots: earlier cards as saved, the current level's slot left empty for the card", () => {
  const guide = [
    { levelId: "level-1", fooled: false }, { levelId: "level-2", fooled: true },
    { levelId: "level-4", fooled: false }, // a replay: the slot still waits for the new card
  ];
  const slots = guideSlots(ORDER, guide, "level-4");
  assert.deepEqual(slots.map((s) => s.status), ["caught", "fooled", "empty", "empty", "empty"]);
  assert.deepEqual(slots.map((s) => s.n), [1, 2, 3, 4, 5]);
  assert.deepEqual(slots.filter((s) => s.current).map((s) => s.id), ["level-4"]);
});

test("layout: the wide card on laptops, the compact one on phones, always inside the window", () => {
  for (const [w, h, talk, name] of [[1512, 830, true, "wide"], [1280, 800, false, "wide"], [844, 390, true, "compact"], [568, 320, true, "compact"], [568, 320, false, "compact"]]) {
    const pick = pickLayout(w, h, talk);
    assert.equal(pick.name, name, `${w}×${h}`);
    const s = stageSize(pick.name, talk);
    assert.ok(s.w * pick.scale <= w - 32 + 0.01 && s.h * pick.scale <= h - 32 + 0.01, `${w}×${h} fits`);
  }
  assert.equal(pickLayout(1512, 830, true).scale, 1, "never drawn larger than designed on a laptop");
  // Upright phones: the card on top, the guide under it, still inside the window.
  for (const [w, h] of [[390, 844], [375, 667], [360, 780]]) {
    for (const talk of [true, false]) {
      const pick = pickLayout(w, h, talk);
      assert.equal(pick.name, "tall", `${w}×${h}`);
      const s = stageSize("tall", talk);
      assert.ok(s.w * pick.scale <= w - 32 + 0.01 && s.h * pick.scale <= h - 32 + 0.01, `${w}×${h} fits`);
      // A talking helper takes a row of its own: the card gives up a little.
      assert.ok(pick.scale >= (talk ? 0.66 : 0.7), `${w}×${h}: the card stays big (${pick.scale.toFixed(2)})`);
    }
  }
});
