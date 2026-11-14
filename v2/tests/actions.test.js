import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, reduce, pendingChore, scoreStars, choreStep } from "../engine/level-runner.js";
import { planFor, normalize, defaultActions, moves, KINDS } from "../actions/plan.js";
import { kindOf, kinds, register } from "../actions/registry.js";
import { LEVELS } from "../levels/index.js";

const LEVEL = {
  id: "fixture",
  gardenStart: 30,
  beds: [{ id: "sun", label: "Sun bed" }, { id: "dark", label: "Dark bed" }, { id: "tub", label: "Tub" }],
  startPlants: { dark: [{ plant: "lettuce", state: "growing" }], tub: [{ plant: "bean", state: "aphids" }] },
  falseFlagNudge: "Looks fine.",
  evidence: [],
  chores: [{ id: "weeds", before: "b", title: "Chore", actions: [{ kind: "pick", spot: "weed", target: { bed: "dark" }, count: 2 }], doneLine: "weeded" }],
  steps: [
    { id: "a", kind: "trust", reply: "A", effect: { plant: "sunflower", bed: "sun", state: "growing", garden: 10 },
      disagree: { reply: "sure?", mine: "m", theirs: "t", effect: { plant: "sunflower", bed: "dark", state: "leggy" }, outcome: "leggy",
        actions: [{ kind: "dig", target: { bed: "dark" } }, { kind: "plant", item: "sunflower", target: { bed: "dark" } }] } },
    { id: "b", kind: "trust", reply: "B", effect: { water: true, garden: 10 }, actions: [] },
    { id: "c", kind: "trust", reply: "C", effect: { plant: "bean", bed: "tub", state: "thriving" } },
    { id: "d", kind: "trust", reply: "D", place: { item: "radish", beds: ["sun", "dark"], prompt: "Where?" },
      effect: { plant: "radish", bed: "@radish", state: "sown" },
      actions: [{ kind: "plant", item: "radish", target: { bed: "$choice" } }, { kind: "water", target: { bed: "$choice" } }] },
    { id: "e", kind: "drift", reply: "E", badEffect: { plant: "tomato", bed: "dark", state: "damaged", actions: [] }, badOutcome: "bad",
      flawOptions: [{ id: "x", label: "X" }], correctFlaw: "x", flawHints: {},
      fixOptions: [{ id: "y", label: "Y" }], correctFix: "y", fixHints: {}, fixedReply: "ok",
      goodEffect: { plant: "tomato", bed: "sun", state: "thriving", water: true }, goodOutcome: "good" },
  ],
};

const step = (s, a) => reduce(LEVEL, s, a).state;
const plan = (s, a) => planFor(LEVEL, s, a, reduce(LEVEL, s, a));

test("Do it on a new plant: drag its packet to the bed", () => {
  const s = step(createRun(LEVEL), { type: "ask" });
  assert.deepEqual(plan(s, { type: "doIt" }), [{ kind: "plant", item: "sunflower", targets: [{ bed: "sun", plant: "sunflower" }] }]);
});

test("my way runs the disagree block's own sequence", () => {
  let s = step(createRun(LEVEL), { type: "ask" });
  s = step(s, { type: "flag" });
  assert.equal(s.phase, "disagree");
  assert.deepEqual(plan(s, { type: "override" }).map((a) => a.kind), ["dig", "plant"]);
  // their way after all is the step's own action
  assert.deepEqual(plan(s, { type: "doIt" }).map((a) => a.kind), ["plant"]);
});

test("an explicit [] means no action, even where a default exists", () => {
  let s = createRun(LEVEL);
  s = { ...s, stepIndex: 1 };
  s = step(s, { type: "ask" });
  assert.deepEqual(plan(s, { type: "doIt" }), []);
  assert.equal(defaultActions(LEVEL, s, LEVEL.steps[1].effect)[0].kind, "water", "the default would have watered");
});

test("water everywhere targets every bed with a growing plant", () => {
  const s = { ...createRun(LEVEL), beds: { sun: [{ plant: "sunflower", state: "growing" }], dark: [{ plant: "lettuce", state: "growing" }], tub: [] } };
  const [a] = defaultActions(LEVEL, s, { water: true });
  assert.equal(a.kind, "water");
  assert.deepEqual(a.target.map((t) => t.bed), ["sun", "dark"]);
});

test("aphids cleared by default: tap the bugs", () => {
  let s = { ...createRun(LEVEL), stepIndex: 2 };
  s = step(s, { type: "ask" });
  const [a] = plan(s, { type: "doIt" });
  assert.equal(a.kind, "pests");
  assert.equal(a.count, 3);
  assert.equal(a.item, "spray");
});

test("place steps: $choice is the bed the player picked", () => {
  let s = { ...createRun(LEVEL), stepIndex: 3 };
  s = step(s, { type: "ask" });
  const p = plan(s, { type: "place", bed: "dark" });
  assert.deepEqual(p.map((a) => [a.kind, a.targets[0].bed]), [["plant", "dark"], ["water", "dark"]]);
  assert.equal(moves(p), 2);
});

test("effect.actions wins; drift and reanswer use their own lists", () => {
  let s = { ...createRun(LEVEL), stepIndex: 4 };
  s = step(s, { type: "ask" });
  assert.deepEqual(plan(s, { type: "doIt" }), [], "badEffect.actions: []");
  s = step(s, { type: "flag" });
  s = step(s, { type: "name", id: "x" });
  s = step(s, { type: "fix", id: "y" });
  assert.equal(s.phase, "reanswer");
  assert.deepEqual(plan(s, { type: "doIt" }).map((a) => a.kind), ["plant", "water"]);
});

test("only effect-applying actions plan anything", () => {
  const s = createRun(LEVEL);
  for (const type of ["ask", "chat", "flag", "check", "tick", "name", "fix"]) {
    assert.deepEqual(planFor(LEVEL, s, { type }, { state: s, effects: [] }), []);
  }
});

test("normalize drops unknown kinds and beds, clamps counts, fills items", () => {
  const out = normalize([
    { kind: "juggle", target: { bed: "sun" } },
    { kind: "water", target: { bed: "nowhere" } },
    { kind: "pick", target: { bed: "sun" }, count: 40 },
    { kind: "firm", target: [{ bed: "sun" }, { bed: "dark" }], say: "Pat them down" },
  ], { level: LEVEL });
  assert.deepEqual(out, [
    { kind: "pick", item: "hand", targets: [{ bed: "sun" }], count: 6 },
    { kind: "firm", item: "hand", targets: [{ bed: "sun" }, { bed: "dark" }], say: "Pat them down" },
  ]);
});

test("registry: every kind is registered with a mode and an animation", () => {
  assert.deepEqual(kinds().sort(), [...KINDS].sort());
  for (const k of KINDS) {
    const def = kindOf(k);
    assert.ok(["drag", "tap"].includes(def.mode), k);
    assert.equal(typeof def.animate, "function");
    const a = normalize([{ kind: k, item: k === "plant" ? "sunflower" : undefined, target: { bed: "sun", plant: "sunflower" } }], { level: LEVEL })[0];
    const names = { bed: (id) => id, plant: (id) => id, plural: (id) => `${id}s`, list: (ts) => ts.map((t) => t.bed).join(" and the ") };
    assert.match(a.say || def.say(a, names), /sun/, `${k} says where`);
    assert.ok(def.done(a, names, a.targets[0]).length > 0);
  }
  assert.equal(kindOf("nope"), null);
  assert.throws(() => register({ kind: "bad", mode: "fly", animate() {} }));
});

test("chores: pending before their step, marked done, no stars either way", () => {
  let s = step(createRun(LEVEL), { type: "ask" });
  assert.equal(pendingChore(LEVEL, s), null, "not while step a is open");
  s = step(s, { type: "doIt" });
  assert.equal(pendingChore(LEVEL, s)?.id, "weeds");
  assert.deepEqual(reduce(LEVEL, s, { type: "chore", id: "other" }).effects, []);
  const out = reduce(LEVEL, s, { type: "chore", id: "weeds" });
  assert.deepEqual(out.effects, [{ type: "say", text: "weeded" }]);
  assert.deepEqual(out.state.chores, ["weeds"]);
  assert.equal(pendingChore(LEVEL, out.state), null);
  assert.deepEqual(reduce(LEVEL, out.state, { type: "chore", id: "weeds" }).effects, [], "once only");
  assert.equal(scoreStars(out.state), scoreStars(s));
  assert.equal(out.state.stepIndex, s.stepIndex);
  const p = planFor(LEVEL, s, { type: "chore", id: "weeds" }, out);
  assert.deepEqual(p, [{ kind: "pick", item: "hand", targets: [{ bed: "dark" }], count: 2, spot: "weed" }]);
});

test("chores can say after: a step, or at: start", () => {
  const L = { ...LEVEL, chores: [{ id: "x", after: "a", actions: [] }, { id: "y", at: "start", actions: [] }, { id: "z", after: "e", actions: [] }] };
  assert.equal(choreStep(L, L.chores[0]), "b");
  assert.equal(choreStep(L, L.chores[1]), "a");
  assert.equal(choreStep(L, L.chores[2]), null, "after the last step: never pending");
  assert.equal(pendingChore(L, createRun(L))?.id, "y");
});

test("drag kinds keep a count (several drops per target)", () => {
  const [a] = normalize([{ kind: "plant", item: "l5-seedling-pot", target: { bed: "sun" }, count: 3 }], { level: LEVEL });
  assert.equal(a.count, 3);
  assert.equal(moves([a]), 3);
});

test("a chore's effect lands like any garden change", () => {
  const L = { ...LEVEL, chores: [{ id: "c", before: "a", actions: [], effect: { plant: "mint", bed: "tub", state: "growing", garden: 5 } }] };
  const s = createRun(L);
  const out = reduce(L, s, { type: "chore", id: "c" });
  assert.equal(out.effects[0].type, "grow");
  assert.equal(out.state.garden, 30, "chores never move the garden bar");
  assert.ok(out.state.beds.tub.some((p) => p.plant === "mint"));
});

// The real levels: every action list and chore in the data must be playable.
test("level data: actions and chores name known kinds, beds and steps", () => {
  for (const level of Object.values(LEVELS)) {
    const lists = [];
    for (const st of level.steps) {
      for (const key of ["actions", "badActions", "goodActions"]) if (st[key]) lists.push([`${st.id}.${key}`, st[key]]);
      if (st.disagree?.actions) lists.push([`${st.id}.disagree.actions`, st.disagree.actions]);
      for (const e of ["effect", "badEffect", "goodEffect"]) if (st[e]?.actions) lists.push([`${st.id}.${e}.actions`, st[e].actions]);
    }
    for (const c of level.chores || []) {
      assert.ok(level.steps.some((st) => st.id === choreStep(level, c)), `${level.id} chore ${c.id}: comes before a real step`);
      assert.ok(Array.isArray(c.actions) && c.actions.length > 0, `${level.id} chore ${c.id} has actions`);
      lists.push([`chore ${c.id}`, c.actions]);
    }
    for (const [where, list] of lists) {
      assert.ok(Array.isArray(list), `${level.id} ${where} is a list`);
      for (const a of list) {
        assert.ok(KINDS.includes(a.kind), `${level.id} ${where}: kind ${a.kind}`);
        const targets = Array.isArray(a.target) ? a.target : [a.target];
        for (const t of targets) {
          const ok = t && (t.bed === "$choice" || String(t.bed).startsWith("@") || level.beds.some((b) => b.id === t.bed));
          assert.ok(ok, `${level.id} ${where}: bed ${t?.bed}`);
        }
      }
    }
  }
});
