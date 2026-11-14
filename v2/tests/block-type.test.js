// Block lettering: the heavy 5×7 grid, line layout and the build-in order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { blockCells, GLYPHS, canBlock } from "../ui/block-type.js";

test("every glyph is 5 columns by 7 rows", () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    assert.equal(rows.length, 7, ch);
    for (const row of rows) assert.match(row, /^[.#]{5}$/, ch);
  }
});

test("columns are doubled: I is 6 cells wide on its top row", () => {
  const { width, height, cells } = blockCells("I");
  assert.equal(width, 6);
  assert.equal(height, 7);
  assert.deepEqual(cells.filter((c) => c.y === 0).map((c) => c.x), [0, 1, 2, 3, 4, 5]);
  // The stem (one source column) becomes two cells.
  assert.deepEqual(cells.filter((c) => c.y === 3).map((c) => c.x), [2, 3]);
});

test("newlines stack lines 10 units apart; width follows the longest line", () => {
  const { width, height, cells } = blockCells("FALSE\nMEMORY");
  assert.equal(width, 6 * 7 - 1);
  assert.equal(height, 17);
  assert.ok(cells.some((c) => c.line === 1 && c.y >= 10));
  assert.ok(cells.every((c) => c.y < height));
});

test("lowercase is drawn as capitals; unknown marks are blank", () => {
  assert.deepEqual(blockCells("ab").cells, blockCells("AB").cells);
  assert.equal(blockCells("~").cells.length, 0);
});

test("centred lines are offset to the middle", () => {
  const left = blockCells("IT\nI");
  const mid = blockCells("IT\nI", { align: "center" });
  const minX = (b) => Math.min(...b.cells.filter((c) => c.line === 1).map((c) => c.x));
  assert.equal(minX(left), 0);
  assert.equal(minX(mid), 3.5);
});

test("the build-in runs left to right, the same way every time, within about a second", () => {
  const a = blockCells("EMOTIONAL\nMANIPULATION");
  const b = blockCells("EMOTIONAL\nMANIPULATION");
  assert.deepEqual(a, b, "deterministic");
  const first = a.cells.filter((c) => c.x < 7).map((c) => c.delay);
  const last = a.cells.filter((c) => c.x > a.width - 7).map((c) => c.delay);
  assert.ok(Math.max(...first) < Math.min(...last), "the left edge starts before the right edge");
  assert.ok(Math.max(...a.cells.map((c) => c.delay)) < 1.2);
});

test("canBlock: only text the grid can draw", () => {
  assert.equal(canBlock("Tester's garden"), true);
  assert.equal(canBlock("TRUST, BUT CHECK."), true);
  assert.equal(canBlock("Zoë's garden"), false);
  assert.equal(canBlock("Ana 🌱"), false);
});
