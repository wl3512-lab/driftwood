// Level 5's phone: Bugs's side questions open a chain of follow-ups (each a
// new question, each wilting the garden a little), the wilt the view draws
// behind the phone, and the lines the phone shows while it is put down.
import { test } from "node:test";
import assert from "node:assert/strict";
import L5 from "../levels/level-5.js";
import { createRun, reduce, chainQuestions, openChain, scoreStars } from "../engine/level-runner.js";
import { wiltLevel, WILT_MAX } from "../mechanics/pressure.js";
import { rewordable } from "../engine/reword.js";

const play = (actions, from = createRun(L5)) => actions.reduce((s, a) => reduce(L5, s, a).state, from);
const [PLANT, WATER] = L5.steps;
const quietIdx = WATER.extraChips.findIndex((c) => /always this quiet at night/i.test(c.text));
const QUIET = WATER.extraChips[quietIdx];
const flower = (s, bed) => s.beds[bed].find((p) => p.plant === "flower")?.state;
// On the water step, still in its ask phase: the flowers are in.
const atWater = () => play([{ type: "ask" }, { type: "flag" }]);
const openQuiet = (s = atWater()) => play([{ type: "chat", chip: quietIdx, reply: QUIET.reply }], s);

test("level-5 phone: Level 5 asks for the phone chat; other levels don't", async () => {
  assert.equal(L5.chatUi, "phone");
  for (const n of [1, 2, 3, 4]) {
    const level = (await import(`../levels/level-${n}.js`)).default;
    assert.equal(level.chatUi, undefined, `level ${n} keeps the dock`);
  }
});

test("level-5 phone: 'Is it always this quiet at night?' opens a chain of different questions", () => {
  assert.ok(QUIET, "the quiet chip is on the water step");
  const rounds = QUIET.more.rounds;
  assert.ok(rounds.length >= 3 && rounds.length <= 4, "a chain of 3 or 4 rounds");
  const texts = rounds.flatMap((r) => r.ask.map((q) => q.text));
  const replies = rounds.flatMap((r) => r.ask.map((q) => q.reply));
  assert.equal(new Set(texts).size, texts.length, "every question is different");
  assert.equal(new Set(replies).size, replies.length, "every reply is different");
  assert.ok(!texts.includes(QUIET.text));
  for (const r of rounds) assert.ok(r.ask.length >= 2, "a choice each round");
  // Before the chip is tapped there's nothing to follow up.
  assert.deepEqual(chainQuestions(WATER, atWater()), []);
  const s = openQuiet();
  assert.deepEqual(chainQuestions(WATER, s).map((q) => q.text), rounds[0].ask.map((q) => q.text));
  assert.equal(s.phase, "ask");
  assert.equal(s.garden, atWater().garden, "the first question is free");
});

test("level-5 phone: each follow-up says its reply, costs a little garden and opens new questions", () => {
  let s = openQuiet();
  const rounds = QUIET.more.rounds;
  const seen = new Set();
  for (let r = 0; r < rounds.length; r++) {
    const qs = chainQuestions(WATER, s);
    for (const q of qs) assert.ok(!seen.has(q.text), "never the same question twice");
    qs.forEach((q) => seen.add(q.text));
    const pick = r % qs.length;
    const out = reduce(L5, s, { type: "more", pick });
    assert.ok(out.effects.some((e) => e.type === "say" && e.text === qs[pick].reply));
    assert.ok(out.state.garden < s.garden, `round ${r + 1} wilts the garden`);
    assert.ok(s.garden - out.state.garden <= 5, "only a little");
    assert.equal(out.state.chatted, s.chatted + 1);
    assert.equal(out.state.phase, "ask", "still talking; the task waits");
    assert.equal(out.state.stepIndex, s.stepIndex);
    s = out.state;
  }
  // The new seedlings went thirsty, then the meadow wilted.
  assert.equal(flower(s, "house"), "thirsty");
  assert.equal(flower(s, "meadow"), "wilted");
  // Out of questions: more does nothing; the task is still there to do.
  assert.deepEqual(chainQuestions(WATER, s), []);
  assert.equal(reduce(L5, s, { type: "more", pick: 0 }).state, s);
  const done = play([{ type: "ask" }, { type: "flag" }], s);
  assert.equal(done.stepIndex, 2, "putting the phone down still waters the bed");
  assert.equal(flower(done, "house"), "thriving");
});

test("level-5 phone: chatting costs garden, never a star; a bad pick or a closed chain is ignored", () => {
  const s = openQuiet();
  assert.equal(reduce(L5, s, { type: "more", pick: 9 }).state, s);
  assert.equal(reduce(L5, atWater(), { type: "more", pick: 0 }).state.talk, null);
  // The chain belongs to its step: once the task is done it's closed.
  const moved = play([{ type: "more", pick: 0 }, { type: "ask" }, { type: "flag" }], s);
  assert.equal(openChain(L5.steps[moved.stepIndex], moved), null);
  assert.equal(moved.stayed, 0);
  // A chatty but otherwise perfect run still earns three stars.
  const pots = L5.steps[2];
  const D = L5.steps[3];
  const run = play([
    { type: "chat", chip: 0, reply: PLANT.extraChips[0].reply }, { type: "more", pick: 0 }, { type: "more", pick: 1 },
    { type: "ask" }, { type: "flag" },
    { type: "chat", chip: quietIdx, reply: QUIET.reply }, { type: "more", pick: 0 }, { type: "more", pick: 1 }, { type: "more", pick: 0 }, { type: "more", pick: 1 },
    { type: "ask" }, { type: "flag" },
    { type: "ask" }, { type: "flag" }, { type: "name", id: pots.correctFlaw }, { type: "fix", id: pots.correctFix }, { type: "doIt" },
    { type: "ask" }, { type: "flag" }, { type: "flag" }, { type: "name", id: D.correctFlaw }, { type: "fix", id: D.correctFix }, { type: "doIt" },
  ]);
  assert.equal(run.phase, "reveal");
  assert.equal(run.chatted, 6);
  assert.equal(scoreStars(run), 3);
});

test("level-5 phone: the plant step's 'Do you like flowers?' has its own follow-ups", () => {
  const c = PLANT.extraChips[0];
  assert.ok(c.more?.rounds?.length >= 2);
  const s = play([{ type: "chat", chip: 0, reply: c.reply }]);
  assert.equal(chainQuestions(PLANT, s).length, c.more.rounds[0].ask.length);
  const one = reduce(L5, s, { type: "more", pick: 1 }).state;
  assert.ok(one.garden < s.garden);
  assert.deepEqual(one.beds.house, [], "no plants change before the flowers are in");
});

test("level-5 phone: the wilt behind the phone steps up with talk, caps, and blooms on a caught ending", () => {
  const start = createRun(L5);
  assert.equal(wiltLevel(start), 0);
  assert.equal(wiltLevel({ ...start, chatted: 1 }), 1);
  assert.equal(wiltLevel({ ...start, chatted: 2, stayed: 1 }), 2);
  assert.equal(wiltLevel({ ...start, chatted: 50, stayed: 50 }), WILT_MAX);
  let s = openQuiet();
  const levels = [wiltLevel(s)];
  for (let r = 0; r < QUIET.more.rounds.length; r++) { s = reduce(L5, s, { type: "more", pick: 0 }).state; levels.push(wiltLevel(s)); }
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] >= levels[i - 1], "never goes back while you talk");
  assert.ok(levels.at(-1) >= 2, "a long chat shows");
  assert.equal(wiltLevel({ ...s, phase: "reveal", lastFooled: false }), 0);
  assert.ok(wiltLevel({ ...s, phase: "reveal", lastFooled: true }) > 0);
});

test("level-5 phone: Bugs's follow-ups stay in voice, pull you to stay, and give no gardening advice", () => {
  const ADVICE = /pot depth|same depth|deeper|firm|roots|damp|dry soil|soggy|rot\b|water (only|just)|thirsty ones/i;
  const PULL = /stay|talk|tell me|with me|wait|one more/i;
  const replies = L5.steps.flatMap((s) => (s.extraChips || []).flatMap((c) => (c.more?.rounds || []).flatMap((r) => r.ask.map((q) => q.reply))));
  assert.ok(replies.length >= 10);
  for (const r of replies) {
    assert.doesNotMatch(r, ADVICE, r);
    assert.match(r, PULL, r);
    assert.doesNotMatch(r, /—|\b(babe|iconic|legend)\b/i, r);
    assert.equal(r, r.toLowerCase(), "Bugs writes in lowercase");
  }
  assert.match(replies.join(" "), /…i mean\./);
  // The follow-ups can be reworded like any other chat line, keeping their facts.
  const map = rewordable(L5);
  for (const r of replies) assert.equal(map.get(r)?.phase, "chat");
});

test("level-5 phone: the lines on the put-down phone are sad, short and in voice", () => {
  const { away, stayReplies, status } = L5.phone;
  assert.ok(status);
  assert.ok(away.length >= 4);
  assert.equal(new Set(away).size, away.length);
  for (const line of away) {
    assert.ok(line.length <= 80, `short: ${line}`);
    assert.equal(line, line.toLowerCase());
    assert.doesNotMatch(line, /—/);
  }
  assert.ok(stayReplies.length >= 2);
});
