// The seed shelf's rules (mechanics/shelf.js) and its data (levels/plants.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";
import { PLANTS } from "../levels/plants.js";
import { reachedLevel, shelfPackets, factCard, repeatsCard } from "../mechanics/shelf.js";
import { searchAlmanac } from "../mechanics/almanac.js";
import { existsSync } from "node:fs";

const sprite = (name) => existsSync(new URL(`../art/${name}.svg`, import.meta.url));

const L = (n) => Object.values(LEVELS).find((l) => l.number === n);

test("reachedLevel: the level being played, or the highest one with a record", () => {
  assert.equal(reachedLevel(LEVELS, null, 1), 1);
  assert.equal(reachedLevel(LEVELS, { levels: {} }, 2), 2);
  const saved = { levels: { "level-1": { stars: 3 }, "level-2": { stars: 1 }, "level-3": { stars: 2 } } };
  assert.equal(reachedLevel(LEVELS, saved, 1), 3, "replaying Level 1 keeps later packets open");
  assert.equal(reachedLevel(LEVELS, saved, 4), 4);
});

test("shelfPackets: every plant, by level, later levels locked", () => {
  const shelf = shelfPackets(2, 2);
  assert.equal(shelf.length, PLANTS.length);
  const levels = shelf.map((p) => p.plant.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b), "shelf order is level order");
  for (const p of shelf) {
    assert.equal(p.locked, p.plant.level > 2, `${p.plant.id} locked`);
    assert.equal(p.isNew, p.plant.level === 2, `${p.plant.id} new`);
  }
  assert.equal(shelfPackets(5, 5).filter((p) => p.locked).length, 0, "everything open at Level 5");
});

test("plants.js: one packet per plant, each level's evidence and book pages covered", () => {
  const ids = PLANTS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const level of Object.values(LEVELS)) {
    for (const e of level.evidence || []) {
      assert.ok(ids.includes(e.id), `${level.id} evidence ${e.id} has a packet`);
    }
    for (const page of level.almanac?.pages || []) {
      const plant = PLANTS.find((p) => p.id === page.id);
      assert.ok(plant, `${level.id} almanac page ${page.id} has a packet`);
      assert.equal(plant.level, level.number, `${page.id} sits on its level's shelf`);
    }
  }
  for (const p of PLANTS) {
    for (const s of [...p.stages, p.art, p.watch?.[0]].filter(Boolean)) {
      assert.ok(sprite(s), `${p.id}: sprite ${s} exists`);
    }
    assert.ok(p.name && p.level >= 1 && p.level <= 5, `${p.id} has a name and a level`);
  }
});

test("factCard: the level's own card is live and lockable", () => {
  const carrot = PLANTS.find((p) => p.id === "carrot");
  const sealed = factCard(carrot, L(4), LEVELS, []);
  assert.equal(sealed.live, true);
  assert.equal(sealed.evidence, "carrot");
  assert.match(sealed.lockedLine, /planting log/);
  const open = factCard(carrot, L(4), LEVELS, ["carrot"]);
  assert.equal(open.lockedLine, null);
  assert.ok(open.lines.some((l) => /\{placed:carrot\}/.test(l)), "a live card keeps its run-only lines to fill in");
});

test("factCard: elsewhere, a plant's home card without run-only lines, else its book page", () => {
  const carrot = PLANTS.find((p) => p.id === "carrot");
  const away = factCard(carrot, L(5), LEVELS, []);
  assert.equal(away.live, false);
  assert.equal(away.lockedLine, null, "a card from another level is never locked");
  assert.ok(away.lines.every((l) => !/\{(placed|other):/.test(l)), "no line that only made sense in its own run");
  const tomato = factCard(PLANTS.find((p) => p.id === "tomato"), L(3), LEVELS, []);
  assert.deepEqual(tomato.lines, L(1).evidence.find((e) => e.id === "tomato").lines, "evidence is the source");
  const parsley = factCard(PLANTS.find((p) => p.id === "parsley"), L(2), LEVELS, []);
  assert.ok(parsley && parsley.lines.length > 0, "a plant with only a book page uses the page");
});

test("repeatsCard: a care row that only restates the card is hidden", () => {
  assert.equal(repeatsCard("Full sun", ["Full sun ☀☀☀", "6–8 hrs a day"]), true);
  assert.equal(repeatsCard("Keep it moist", ["Spreads fast underground", "Grow it in its own pot"]), false);
  assert.equal(repeatsCard("Needs warmth to sprout", ["Warm soil to sprout"]), true, "warm ~ warmth");
  assert.equal(repeatsCard("", ["Full sun"]), false);
  assert.equal(repeatsCard("Full sun", []), false);
});

test("Level 2's search still finds mint by keyword (the shelf marks that packet)", () => {
  assert.equal(searchAlmanac(L(2).almanac.pages, "peppermint")?.id, "mint");
});
