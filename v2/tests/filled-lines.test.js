// Every line a level shows, filled in the way the game fills it ({name},
// {placed:x}, {other:x}), must read right: no leftover braces, and wherever a
// line says what was sown or planted, the word there is a plant. Level 4's
// concede line once read "you planted the log in the front bed": the AI
// rewording had dropped "carrots", so engine/reword.js now refuses a reword
// that changes which plants a line names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fill } from "../ui/text.js";
import { memoryVars, placeStepFor } from "../mechanics/placement.js";
import { rewordable, validate, plantsNamed } from "../engine/reword.js";

const levels = await Promise.all([1, 2, 3, 4, 5].map(async (n) => (await import(`../levels/level-${n}.js`)).default));

// Every string in the level data that reads as text (has a space).
function texts(level) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") { if (/\s/.test(v)) out.push(v); } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(level);
  return out;
}

// Each memory a run can end with: every placement step, every bed it allows.
function memories(level) {
  const items = [...new Set(level.steps.filter((s) => s.place).map((s) => s.place.item))];
  let all = [{}];
  for (const item of items) all = all.flatMap((m) => placeStepFor(level, item).place.beds.map((bed) => ({ ...m, [item]: bed })));
  return all;
}

const SOWN = /\b(?:sowed|sow|sown|planted|plant|planting)\s+(?:the|your|some|my|a|an)\s+(?:(?:own|new|young|little)\s+)?([a-z]+)/gi;

test("no filled-in line, in any level, keeps a brace or sows a non-plant", () => {
  for (const level of levels) {
    for (const memory of memories(level)) {
      const vars = { name: "Tester", ...memoryVars(level, memory) };
      for (const text of texts(level)) {
        const line = fill(text, vars);
        assert.doesNotMatch(line, /[{}]/, `${level.id} ${JSON.stringify(memory)}: leftover brace in "${line}"`);
        for (const m of line.matchAll(SOWN)) {
          assert.ok(plantsNamed(m[1]).length, `${level.id}: "${m[0]}" names no plant in "${line}"`);
        }
      }
    }
  }
});

test("a reword that swaps a plant for another word is thrown away", () => {
  const L4 = levels[3];
  const step = L4.steps.find((s) => s.fixedReply);
  const line = rewordable(L4).get(step.fixedReply);
  assert.equal(validate(step.fixedReply, line), step.fixedReply, "the written line passes");
  const bad = "Okay so listen... a legend can admit it. Your log shows you planted the log in the {placed:carrot}, and the label's right there. Just leave it be. The spinach belongs in the {other:carrot}.";
  assert.equal(validate(bad, line), null, "carrots dropped: rejected");
  const added = step.fixedReply.replace("Leave it alone.", "Leave it alone, and the tomatoes too.");
  assert.equal(validate(added, line), null, "a plant added: rejected");
});

test("the plant check ignores placeholders and reads plurals", () => {
  assert.deepEqual(plantsNamed("you planted the log in the {placed:carrot}"), []);
  assert.deepEqual(plantsNamed("Blueberries, wild berries and carrots"), ["blueberr", "carrot", "wildberr"]);
});
