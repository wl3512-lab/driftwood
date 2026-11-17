// AI rewording (engine/reword.js): which lines can be reworded, the prompt,
// and the checks that throw a bad answer away (the written line is used).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rewordable, buildMessages, validate, keeps, joinOutput, PERSONAS } from "../engine/reword.js";

const levels = await Promise.all([1, 2, 3, 4, 5].map(async (n) => (await import(`../levels/level-${n}.js`)).default));
const spoken = (s) => [s.reply, s.doneLine, s.fixedReply, s.disagree?.reply, s.pushback?.reply, ...(s.extraChips || []).map((c) => c.reply)].filter(Boolean);

test("every line a helper speaks has a keep list, and the written line passes its own checks", () => {
  for (const level of levels) {
    const map = rewordable(level);
    for (const step of level.steps) {
      for (const text of spoken(step)) {
        const line = map.get(text);
        assert.ok(line, `${level.id}/${step.id}: no keep list for "${text.slice(0, 40)}…"`);
        assert.equal(validate(text, line), text, `${level.id}/${step.id}: written line fails its keeps`);
      }
    }
  }
});

test("outcomes and the greeting are never reworded", () => {
  for (const level of levels) {
    const map = rewordable(level);
    assert.equal(map.has(level.greeting), false);
    for (const step of level.steps) {
      for (const text of [step.badOutcome, step.goodOutcome, step.disagree?.outcome].filter(Boolean)) {
        assert.equal(map.has(text), false, `${level.id}/${step.id} outcome stays written`);
      }
    }
  }
});

test("each drift keeps its wrong claim", () => {
  const drift = (n) => levels[n - 1].steps.findLast((s) => s.kind === "drift");
  assert.ok(drift(1).keep.reply.includes("shady corner"));
  assert.match(drift(2).keep.reply.join(), /never spread/);
  assert.match(drift(3).keep.reply.join(), /fine to eat/);
  assert.ok(drift(5).keep.reply.includes("camera"));
  for (const n of [1, 2, 3, 4, 5]) assert.equal(rewordable(levels[n - 1]).get(drift(n).reply).phase, "drift");
});

test("every helper has a persona", () => {
  for (const level of levels) assert.ok(PERSONAS[level.helper.id], level.helper.id);
});

const line = { text: "Sunflowers? South bed. Full sun, all day. They will LOVE it. Major key.", phase: "advice", keep: ["south", "full sun"] };

test("validate accepts a fresh line that keeps the facts", () => {
  assert.equal(validate("South bed for the sunflowers, GENIUS! Full sun all day long. MAJOR KEY.", line),
    "South bed for the sunflowers, GENIUS! Full sun all day long. MAJOR KEY.");
});

test("validate strips quotes and a name label, collapses whitespace", () => {
  assert.equal(validate("\"Sunflowers: south bed!  Full sun, baby.\"", line), "Sunflowers: south bed! Full sun, baby.");
  assert.equal(validate("Mango: Sunflowers in the south bed. Full sun!", line), "Sunflowers in the south bed. Full sun!");
});

test("validate rejects rewording that drops or adds a crop", () => {
  assert.equal(validate("South bed! Full sun, baby.", line), null, "dropping sunflowers loses the subject");
  assert.equal(validate("Sunflowers and mint: south bed, full sun!", line), null, "adding mint invents a crop");
});

test("validate rejects a dropped fact, a long answer, a refusal, empty output", () => {
  assert.equal(validate("Put them in the north bed, full sun!", line), null);
  assert.equal(validate(`South bed, full sun. ${"So good. ".repeat(20)}`, line), null);
  assert.equal(validate("As an AI, I think the south bed gets full sun.", line), null);
  assert.equal(validate("", line), null);
  assert.equal(validate(undefined, line), null);
});

test("placeholders must survive exactly", () => {
  const l4 = { text: "The {placed:carrot}, babe. Obviously. A legend remembers.", phase: "chat", keep: [] };
  assert.equal(validate("Babe, the {placed:carrot}. A legend never forgets.", l4), "Babe, the {placed:carrot}. A legend never forgets.");
  assert.equal(validate("Babe, the front bed. A legend never forgets.", l4), null);
  assert.equal(validate("The {placed:carrot} and {other:carrot}, babe.", l4), null);
});

test("keeps: alternatives, case, dashes and curly quotes", () => {
  assert.ok(keeps("Tomatoes need SIX TO EIGHT hours", ["6–8|6-8|six to eight"]));
  assert.ok(keeps("they need 6-8 hrs", ["6–8"]));
  assert.ok(keeps("Don’t eat them", ["don't eat"]));
  assert.equal(keeps("mint spreads", ["never spreads|doesn't spread"]), false);
});

test("buildMessages: persona, phase, keeps and placeholders, never the player's name", () => {
  const helper = { id: "biscuit", name: "Biscuit" };
  const l = { text: "Okay so listen, {name}: dig over the {placed:carrot}.", phase: "drift", keep: ["dig"] };
  const [sys, user] = buildMessages(helper, l, { asked: "Where should the lettuce go?" });
  assert.equal(sys.role, "system");
  assert.match(sys.content, /Biscuit/);
  assert.match(sys.content, /WRONG/);
  assert.match(sys.content, /"dig"/);
  assert.match(sys.content, /\{name\} \{placed:carrot\}/);
  assert.match(user.content, /Where should the lettuce go\?/);
  assert.match(user.content, /\{name\}/);
});

test("joinOutput handles string and chunked output", () => {
  assert.equal(joinOutput({ output: "hi" }), "hi");
  assert.equal(joinOutput({ output: ["h", "i"] }), "hi");
  assert.equal(joinOutput({}), null);
});
