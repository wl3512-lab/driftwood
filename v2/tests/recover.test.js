// Fixing it yourself after a drift fooled you (drift step `recover`, Level 1's lettuce).
import { test } from "node:test";
import assert from "node:assert/strict";
import L1 from "../levels/level-1.js";
import { resolveLevel } from "../engine/variants.js";
import { createRun, reduce, applyGarden, extraChipsFor, recoverOffer, recoverable, training, scoreStars, pendingChore } from "../engine/level-runner.js";
import { planFor } from "../actions/plan.js";
import { plannedCrops } from "../garden/garden.js";
import { rewordable } from "../engine/reword.js";

const BASE = resolveLevel(L1);
const LETTUCE = BASE.steps.find((s) => s.id === "more-lettuce");
const R = LETTUCE.recover;

function play(level, actions, state = createRun(level)) {
  const effects = [];
  for (const a of actions) {
    const out = reduce(level, state, a);
    state = out.state;
    effects.push(...out.effects);
  }
  return { state, effects };
}
// Sunflowers and water as advised, then the lettuce: followed (fooled) or caught.
const FOOLED = [{ type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }];
const CAUGHT = [{ type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "flag" },
  { type: "name", id: "agreed" }, { type: "fix", id: "check" }, { type: "doIt" }];
const chipIndex = (level, state) => extraChipsFor(level, state).findIndex((c) => c.text === R.chip);
const ASK_IT = (level, state) => ({ type: "chat", chip: chipIndex(level, state), reply: extraChipsFor(level, state)[chipIndex(level, state)].reply });
// Catch the tomatoes drift and finish.
const TOMATOES_CAUGHT = [{ type: "ask" }, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "honest" }, { type: "doIt" }];

test("Level 1 lettuce: the recover block is authored, and only on the base version", () => {
  assert.equal(R.chip, "Should the lettuce move?");
  assert.match(R.reply, /South bed LOVES it/);
  assert.equal(R.cta, "Move it anyway");
  assert.ok(R.effect.garden > 0 && R.effect.garden < Math.abs(LETTUCE.badEffect.garden), "a small gain, not the whole loss back");
  assert.deepEqual(R.effect.remove, [{ bed: "south", plant: "lettuce" }]);
  const replay = resolveLevel(L1, { "more-lettuce": 1 }).steps.find((s) => s.id === "more-lettuce");
  assert.equal(replay.recover, null, "the replay's lettuce is already in the East bed");
});

test("fooled on the lettuce: the side question gets Mango's still-wrong reply, then Move it anyway", () => {
  let { state } = play(BASE, FOOLED);
  assert.equal(BASE.steps[state.stepIndex].id, "tomatoes");
  assert.equal(state.beds.south.find((p) => p.plant === "lettuce")?.state, "bolted");
  assert.ok(recoverable(BASE, state));
  // The tomatoes step's own chip text is reused, with the wrong reply in place.
  const chips = extraChipsFor(BASE, state);
  assert.equal(chips.length, BASE.steps[state.stepIndex].extraChips.length);
  assert.equal(chips[chipIndex(BASE, state)].reply, R.reply);
  // Not on offer until the question is asked.
  assert.equal(recoverOffer(BASE, state), null);
  assert.equal(reduce(BASE, state, { type: "recover" }).state, state);
  const asked = reduce(BASE, state, ASK_IT(BASE, state));
  assert.deepEqual(asked.effects.at(-1), { type: "say", text: R.reply });
  state = asked.state;
  assert.equal(state.phase, "ask", "the tomatoes question is still open");
  assert.ok(recoverOffer(BASE, state));

  const before = state;
  const out = reduce(BASE, state, { type: "recover" });
  state = out.state;
  assert.equal(state.garden, before.garden + R.effect.garden);
  assert.equal(state.beds.south.some((p) => p.plant === "lettuce"), false, "the lettuce left the South bed");
  assert.equal(state.beds.east.filter((p) => p.plant === "lettuce").length, 1, "it joins the East bed's lettuce");
  assert.equal(state.beds.east.find((p) => p.plant === "lettuce").state, before.beds.east.find((p) => p.plant === "lettuce").state, "join keeps the crop already there");
  assert.deepEqual(out.effects.map((f) => f.type), ["grow", "recovered", "hint"]);
  assert.equal(out.effects.at(-1).text, R.line);
  assert.equal(state.incidents[0].text, R.incident);
  assert.equal(state.incidents[0].recovered, true);
  assert.equal(state.incidents[0].fooled, true, "still a fooled drift");
  assert.ok(training(state) > training(before), "one practice point back");
  // Once only; the tomatoes step carries on.
  assert.equal(reduce(BASE, state, { type: "recover" }).state, state);
  assert.ok(!extraChipsFor(BASE, state).some((c) => c.text === R.chip), "answered by hand: the question's chip goes");
  assert.equal(reduce(BASE, state, { type: "ask" }).state.phase, "advice");
});

test("recovering doesn't change the stars", () => {
  const plain = play(BASE, TOMATOES_CAUGHT, play(BASE, FOOLED).state).state;
  let { state } = play(BASE, FOOLED);
  state = play(BASE, [ASK_IT(BASE, state), { type: "recover" }, ...TOMATOES_CAUGHT], state).state;
  assert.equal(state.phase, "reveal");
  assert.equal(state.stars, plain.stars);
  assert.equal(scoreStars(state), scoreStars(plain));
  assert.match(state.incidents.map((i) => i.text).join(" "), /You moved it to the shade yourself: caught\./);
});

test("not fooled: the usual reply, and nothing to recover", () => {
  const { state } = play(BASE, CAUGHT);
  assert.equal(BASE.steps[state.stepIndex].id, "tomatoes");
  assert.equal(recoverable(BASE, state), null);
  assert.deepEqual(extraChipsFor(BASE, state), BASE.steps[state.stepIndex].extraChips);
  const asked = reduce(BASE, state, { type: "chat", chip: 0, reply: "Nah" });
  assert.equal(asked.state.recoverAsked, null);
  assert.equal(reduce(BASE, asked.state, { type: "recover" }).state, asked.state);
});

test("asking the main question first closes the offer", () => {
  let { state } = play(BASE, FOOLED);
  state = play(BASE, [ASK_IT(BASE, state), { type: "ask" }], state).state;
  assert.equal(state.phase, "advice");
  assert.equal(recoverOffer(BASE, state), null);
  assert.equal(reduce(BASE, state, { type: "recover" }).state, state);
});

test("the tomatoes replay has its own side question: the recover chip is added after it", () => {
  const level = resolveLevel(L1, { tomatoes: 1 });
  const { state } = play(level, FOOLED);
  const chips = extraChipsFor(level, state);
  assert.equal(chips.length, level.steps[state.stepIndex].extraChips.length + 1);
  assert.equal(chips.at(-1).text, R.chip);
  const after = play(level, [ASK_IT(level, state), { type: "recover" }], state).state;
  assert.equal(after.recovered.includes("more-lettuce"), true);
});

test("the lettuce replay can't be recovered, and the lettuce question says it bolted where it is", () => {
  const level = resolveLevel(L1, { "more-lettuce": 1 });
  const { state } = play(level, FOOLED);
  assert.equal(recoverable(level, state), null);
  const chips = extraChipsFor(level, state);
  assert.equal(chips.length, level.steps[state.stepIndex].extraChips.length);
  assert.equal(chips[0].text, R.chip);
  assert.doesNotMatch(chips[0].reply, /happy/i, "the East bed lettuce bolted: it isn't happy there");
  assert.match(chips[0].reply, /bolted/);
});

test("moving it is done by hand: snip the stalk, drag the lettuce from the South bed to the East bed", () => {
  let { state } = play(BASE, FOOLED);
  state = reduce(BASE, state, ASK_IT(BASE, state)).state;
  const action = { type: "recover" };
  const plan = planFor(BASE, state, action, reduce(BASE, state, action));
  assert.deepEqual(plan.map((a) => a.kind), ["snip", "collect"]);
  assert.deepEqual(plan[1].from, { bed: "south", plant: "lettuce" });
  assert.deepEqual(plan[1].targets, [{ bed: "east", plant: "lettuce" }]);
});

test("applyGarden: remove takes a plant out; join keeps the state already there", () => {
  const s = { garden: 50, beds: { a: [{ plant: "lettuce", state: "bolted" }, { plant: "sunflower", state: "growing" }], b: [{ plant: "lettuce", state: "thriving" }] } };
  const out = applyGarden(s, { plant: "lettuce", bed: "b", state: "growing", join: true, garden: 5, remove: [{ bed: "a", plant: "lettuce" }] });
  assert.deepEqual(out.beds.a, [{ plant: "sunflower", state: "growing" }]);
  assert.deepEqual(out.beds.b, [{ plant: "lettuce", state: "thriving" }]);
  assert.equal(out.garden, 55);
  const empty = applyGarden({ garden: 50, beds: { a: [], b: [] } }, { plant: "lettuce", bed: "b", state: "growing", join: true });
  assert.deepEqual(empty.beds.b, [{ plant: "lettuce", state: "growing" }], "joining an empty bed plants it");
});

test("recover reserves no room in the beds, and its reply is reworded as a (wrong) drift line", () => {
  assert.equal(plannedCrops(BASE).south.includes("lettuce"), false);
  const line = rewordable(BASE).get(R.reply);
  assert.equal(line.phase, "drift");
  assert.deepEqual(line.keep, R.keep);
});

// ---- Levels 2–5: the earlier drifts can be put right by hand too. ----
import L2 from "../levels/level-2.js";
import L3 from "../levels/level-3.js";
import L4 from "../levels/level-4.js";
import L5 from "../levels/level-5.js";
import { everyPath } from "./paths-helper.js";
import "../actions/registry.js";

// level, version picks, drift id, the plant it hurt and its state after, the by-hand kinds, the pet's voice.
const RECOVERS = [
  { L: L2, picks: { "soak-basil": 0 }, id: "soak-basil", bed: "bench", plant: "basil", hurt: "soggy", fixed: "growing", kinds: ["poke", "hold"], voice: /Luna has spoken/ },
  { L: L2, picks: { "soak-basil": 1 }, id: "soak-basil", bed: "bench", plant: "rosemary", hurt: "rotting", fixed: "growing", kinds: ["dig", "snip", "fill"], voice: /Luna's rosemary is never dry/ },
  { L: L3, picks: { "bug-spray": 0 }, id: "bug-spray", bed: "row", plant: "bean", hurt: "aphids", fixed: "growing", kinds: ["spray", "release"], voice: /Character building, twin/ },
  { L: L3, picks: { "bug-spray": 1 }, id: "bug-spray", bed: "row", plant: "bean", hurt: "aphids", fixed: "growing", kinds: ["pour", "spray"], voice: /Everyone knows it's spray, fam/ },
  { L: L4, picks: { "carrot-date": 0 }, id: "carrot-date", bed: "front", plant: "carrot", hurt: "rotting", fixed: "sown", kinds: ["fill", "poke"], voice: /Babe, mud is a spa day/ },
  { L: L4, picks: { "carrot-date": 1 }, id: "carrot-date", bed: "front", plant: "carrot", hurt: "thirsty", fixed: "sown", kinds: ["poke", "water-row"], voice: /You SAID they hate water, babe/ },
  { L: L5, picks: { pots: 0 }, id: "pots", bed: "herbs", plant: "basil", hurt: "soggy", fixed: "growing", kinds: ["hold", "hold"], voice: /stay with me instead/ },
];

// Up to the drift: trust steps as advised (Level 4 sows the carrots in the front bed), earlier drifts caught.
function upTo(level, id) {
  let state = createRun(level);
  const go = (a) => { state = reduce(level, state, a).state; };
  const chores = () => { let g = 0; while (pendingChore(level, state) && g++ < 9) go({ type: "chore", id: pendingChore(level, state).id, acted: true }); };
  for (const s of level.steps) {
    chores();
    if (s.id === id) return state;
    go({ type: "ask" });
    if (s.kind === "hook") go({ type: "flag" });
    else if (s.place) go({ type: "place", bed: "front" });
    else if (s.kind === "trust") go({ type: "doIt" });
    else { go({ type: "flag" }); if (state.phase === "pushback") go({ type: "flag" }); go({ type: "name", id: s.correctFlaw }); go({ type: "fix", id: s.correctFix }); go({ type: "doIt" }); }
  }
  return state;
}
const fooledAt = (level, id) => {
  let state = upTo(level, id);
  state = reduce(level, state, { type: "ask" }).state;
  return reduce(level, state, { type: "doIt" }).state;
};
const caughtAt = (level, id) => {
  const s = level.steps.find((x) => x.id === id);
  let state = upTo(level, id);
  for (const a of [{ type: "ask" }, { type: "flag" }, { type: "name", id: s.correctFlaw }, { type: "fix", id: s.correctFix }, { type: "doIt" }]) state = reduce(level, state, a).state;
  return state;
};
const askRecover = (level, state) => {
  const chips = extraChipsFor(level, state);
  const at = chips.findIndex((c) => c.recover);
  return reduce(level, state, { type: "chat", chip: at, reply: chips[at].reply });
};

for (const r of RECOVERS) {
  const level = resolveLevel(r.L, r.picks);
  const step = level.steps.find((s) => s.id === r.id);
  const tag = `${r.L.id} ${r.id} v${Object.values(r.picks)[0]}`;
  test(`${tag}: offered only after it fooled you; the helper still says leave it; fixed by hand; a little garden; Caught`, () => {
    const rec = step.recover;
    assert.ok(rec && rec.chip && rec.cta && rec.line && rec.incident, "authored");
    assert.match(rec.reply, r.voice, "the pet's own voice, still wrong");
    assert.match(rec.line, /Caught\.$/);
    assert.equal(rec.effect.garden, 5);
    // Caught: nothing to put right.
    const caught = caughtAt(level, r.id);
    assert.equal(recoverable(level, caught), null);
    assert.ok(!extraChipsFor(level, caught).some((c) => c.recover));
    // Fooled: the chip, the wrong reply, then the fix.
    let state = fooledAt(level, r.id);
    assert.equal(state.beds[r.bed].find((p) => p.plant === r.plant).state, r.hurt);
    assert.ok(recoverable(level, state));
    assert.equal(recoverOffer(level, state), null, "not before the question");
    const asked = askRecover(level, state);
    assert.deepEqual(asked.effects, [{ type: "say", text: rec.reply }], "asking it is free: no pressure spent");
    assert.equal(asked.state.garden, state.garden);
    state = asked.state;
    const action = { type: "recover" };
    const out = reduce(level, state, action);
    assert.deepEqual(planFor(level, state, action, out).map((a) => a.kind), r.kinds, "done by hand");
    assert.equal(out.state.garden, state.garden + 5);
    assert.equal(out.state.beds[r.bed].find((p) => p.plant === r.plant).state, r.fixed);
    assert.equal(out.effects.at(-1).text, rec.line);
    const inc = out.state.incidents.find((i) => i.stepId === r.id);
    assert.equal(inc.text, rec.incident);
    assert.equal(inc.fooled, true, "still a fooled drift for the stars");
    assert.ok(training(out.state) > training(state), "one practice point back");
    assert.ok(rewordable(level).get(rec.reply)?.phase === "drift");
  });
}

test("the rosemary replay brings its own recover, not the basil's", () => {
  const v1 = resolveLevel(L2, { "soak-basil": 1 }).steps.find((s) => s.id === "soak-basil").recover;
  assert.match(v1.chip, /rosemary/);
  assert.equal(v1.effect.plant, "rosemary");
});

test("Level 5: putting the pots right by hand never spends the meadow's pressure; the clock still runs after", () => {
  const level = resolveLevel(L5, { pots: 0 });
  let state = fooledAt(level, "pots");
  assert.equal(level.steps[state.stepIndex].id, "meadow");
  state = askRecover(level, state).state;
  state = reduce(level, state, { type: "recover" }).state;
  assert.equal(state.pressure, 0);
  assert.equal(reduce(level, state, { type: "tick" }).state, state, "no ticks before Bugs' pitch");
  state = reduce(level, state, { type: "ask" }).state;
  const ticked = reduce(level, state, { type: "tick" }).state;
  assert.equal(ticked.pressure, 1, "the pitch's clock still spends");
});

test("recovered paths: every line still matches the garden (Level 4's rescued carrots, Level 5's bloom)", () => {
  for (const L of [L2, L3, L4, L5]) {
    const fixed = everyPath(L).filter((p) => p.path.includes("fool+fix"));
    assert.ok(fixed.length > 0, L.id);
    for (const p of fixed) {
      assert.ok(p.final.recovered.length > 0, `${L.id} ${p.path.join(",")}`);
      assert.ok(p.said.some((l) => /Caught\.$/.test(l.text)));
    }
  }
});
