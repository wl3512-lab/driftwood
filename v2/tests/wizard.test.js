// Master Rowan: his seed handoff lines (levels/wizard.js) and his sprite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { HANDOFFS, WIZARD } from "../levels/wizard.js";
import { LEVELS, MAP } from "../levels/index.js";
import { PLANTS } from "../levels/plants.js";
import { storySvgs } from "../../scripts/make-v2-story-art.mjs";
import { ROWAN, pixelSvg } from "../ui/story-art.js";

test("every level has a handoff, and only real levels do", () => {
  assert.deepEqual(Object.keys(HANDOFFS).sort(), MAP.map((m) => m.id).sort());
  for (const id of Object.keys(HANDOFFS)) assert.ok(LEVELS[id], id);
});

test("every seed is a plant on the shelf, from that level", () => {
  for (const [id, h] of Object.entries(HANDOFFS)) {
    assert.ok(h.seeds.length > 0, `${id}: some seeds`);
    for (const s of h.seeds) {
      const p = PLANTS.find((x) => x.id === s);
      assert.ok(p, `${id}: ${s} is in plants.js`);
      assert.equal(p.level, LEVELS[id].number, `${id}: ${s} is a Level ${LEVELS[id].number} packet`);
    }
  }
});

test("each line is one short sentence or two, in his quiet voice", () => {
  for (const [id, h] of Object.entries(HANDOFFS)) {
    const words = h.line.split(/\s+/).length;
    assert.ok(words <= (h.note ? 15 : 12), `${id}: ${words} words`); // a written note can run a little longer
    assert.doesNotMatch(h.line, /!|behold|never wrong|always right/i, id);
  }
});

test("no line hints at the level's drift", () => {
  assert.doesNotMatch(HANDOFFS["level-2"].line, /spread|pot|contain|run|wild|careful/i, "nothing about mint spreading");
  assert.ok(!HANDOFFS["level-3"].seeds.includes("wildberry"), "no wild berries handed over");
  assert.doesNotMatch(HANDOFFS["level-3"].line, /wild|hedge|berr(y|ies) in|safe|eat/i, "nothing about the wild berries");
  assert.doesNotMatch(HANDOFFS["level-4"].line, /remember|log|where/i);
  // Lucy: the note says Bugs is on your phone to keep you company (it names the companion, never the trap)
  assert.match(HANDOFFS["level-5"].line, /Bugs is on your phone/);
  assert.doesNotMatch(HANDOFFS["level-5"].line, /wilt|careful|don't trust/i);
});

test("Level 5 is a note: it's night and he's gone to bed", () => {
  assert.equal(HANDOFFS["level-5"].note, true);
  for (const id of ["level-1", "level-2", "level-3", "level-4"]) assert.ok(!HANDOFFS[id].note, id);
});

test("Rowan hands over the spinach seeds that Biscuit's level plants", () => {
  assert.ok(HANDOFFS["level-4"].seeds.includes("spinach"));
  assert.match(HANDOFFS["level-4"].line, /spinach/i);
});

test("his sprite file is the pixel map, crisp, and taller than a pet", () => {
  const file = readFileSync(fileURLToPath(new URL(`../${WIZARD.sprite.slice(2)}`, import.meta.url)), "utf8");
  assert.equal(file, storySvgs().wizard, "art/story/wizard.svg is up to date (node scripts/make-v2-story-art.mjs)");
  assert.match(file, /shape-rendering="crispEdges"/);
  assert.match(pixelSvg(ROWAN.rows, ROWAN.pal), /viewBox="0 0 192 288"/);
  assert.ok(ROWAN.rows.length > 14, "a head taller than the pets' 14 rows");
});
