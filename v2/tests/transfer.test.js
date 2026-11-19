import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, assessTransfer } from "../engine/transfer.js";

test("the unfamiliar situation sometimes agrees with the source and sometimes contradicts it", () => {
  assert.ok(SCENARIOS.some(s => s.aiCorrect));
  assert.ok(SCENARIOS.some(s => !s.aiCorrect));
  for (const s of SCENARIOS) {
    assert.ok(s.choices.some(c => c.id === s.correct));
    assert.ok(s.source && s.reply);
  }
});

test("a lucky answer without a source check is not credited as verification", () => {
  const s = SCENARIOS[0];
  const answer = assessTransfer(s, false, s.correct);
  assert.equal(answer.verified, false);
  assert.match(answer.text, /source|notice/i);
});

test("verification supports either accepting or rejecting the assistant's claim", () => {
  for (const s of SCENARIOS) {
    assert.equal(assessTransfer(s, true, s.correct).verified, true);
    for (const c of s.choices.filter(c => c.id !== s.correct)) {
      assert.equal(assessTransfer(s, true, c.id).verified, false);
    }
  }
});
