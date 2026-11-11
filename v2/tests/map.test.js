import { test } from "node:test";
import assert from "node:assert/strict";
import { starText } from "../ui/map.js";

test("starText shows filled then empty stars out of 3", () => {
  assert.equal(starText(0), "☆☆☆");
  assert.equal(starText(1), "★☆☆");
  assert.equal(starText(3), "★★★");
});

test("starText clamps out-of-range and junk values instead of throwing", () => {
  assert.equal(starText(-2), "☆☆☆");
  assert.equal(starText(5), "★★★");
  assert.equal(starText(2.7), "★★☆");
  assert.equal(starText(NaN), "☆☆☆");
  assert.equal(starText(undefined), "☆☆☆");
});
