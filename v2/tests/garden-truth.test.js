// No line contradicts the garden: every path through every version of each
// level (tests/paths-helper.js), checked against the beds as they stood when
// the line was said. One test per line the 2026-11-19 audit found false.
import { test } from "node:test";
import assert from "node:assert/strict";
import L1 from "../levels/level-1.js";
import L2 from "../levels/level-2.js";
import L3 from "../levels/level-3.js";
import L4 from "../levels/level-4.js";
import L5 from "../levels/level-5.js";
import { everyPath } from "./paths-helper.js";
import { createRun, reduce, pendingChore, byGarden, gardenIs, currentStep } from "../engine/level-runner.js";
import { resolveLevel } from "../engine/variants.js";

const PATHS = { 1: everyPath(L1), 2: everyPath(L2), 3: everyPath(L3), 4: everyPath(L4), 5: everyPath(L5) };
const has = (beds, bed, plant, state) => (beds[bed] || []).some((p) => p.plant === plant && (!state || p.state === state));
const lines = (n, re) => PATHS[n].flatMap((p) => p.said.filter((l) => re.test(l.text)).map((l) => ({ ...l, path: p })));
const name = (l) => `${JSON.stringify(l.path.picks)} ${l.path.path.join(",")}`;

test("every path walks to the reveal", () => {
  for (const [n, paths] of Object.entries(PATHS)) {
    assert.ok(paths.length > 10, `L${n} has paths`);
    for (const p of paths) assert.equal(p.final.phase, "reveal", `L${n} ${p.path.join(",")}`);
  }
});

test("L1: the lettuce is never called happy in the East bed while it's bolted there", () => {
  const happy = lines(1, /happy in the east bed/i);
  assert.ok(happy.length > 0);
  for (const l of happy) assert.ok(!has(l.beds, "east", "lettuce", "bolted"), name(l));
  // …and the bolted replay gets the true answer.
  assert.ok(lines(1, /East bed IS the shady one/).every((l) => has(l.beds, "east", "lettuce", "bolted")));
  assert.ok(lines(1, /East bed IS the shady one/).length > 0);
});

test("L1: no 'Salad! You grew that' over bolted lettuce, and none for a skipped harvest", () => {
  for (const l of lines(1, /^Salad!/)) assert.ok(!has(l.beds, "east", "lettuce", "bolted"), name(l));
  for (const p of everyPath(L1, { skip: true })) assert.ok(!p.said.some((l) => /^Salad!|Lunch is lunch/.test(l.text)), p.path.join(","));
});

test("L1: watering goes to the bed the sunflowers are actually in", () => {
  for (const p of PATHS[1]) {
    const water = p.plans.find((x) => x.stepId === "water" && x.action === "doIt");
    if (!water) continue;
    const corner = p.path[0] === "mine";
    const beds = water.plan.find((a) => a.kind === "water").targets.map((t) => t.bed);
    assert.deepEqual(beds, corner ? ["corner", "east"] : ["south", "east"]);
    assert.match(water.plan.find((a) => a.kind === "water").say, corner ? /Shady corner/ : /South bed/);
  }
});

test("L1: the heatwave replay's premise matches its card (part shade, but shade cloth in a heatwave)", () => {
  const v = resolveLevel(L1, { "more-lettuce": 1 });
  const step = v.steps.find((s) => s.id === "more-lettuce");
  const card = v.evidence.find((e) => e.id === "lettuce");
  assert.match(step.chip, /shade cloth/i);
  assert.ok(card.lines.includes("Part shade keeps it cool"));
  assert.ok(card.lines.some((x) => /shade cloth/i.test(x)));
  assert.match(step.badOutcome, /heatwave/i);
});

test("L2: nobody says the basil has the bed to itself; the mint's spot isn't called beside the basil", () => {
  assert.equal(lines(2, /bed to itself/i).length, 0);
  assert.doesNotMatch(L2.spots["beside-basil"].label, /basil/);
});

test("L3: 'the ladybugs stayed' only when no spray got them; no 'hose 'em again' on a path never hosed", () => {
  const stayed = lines(3, /ladybugs stayed/i);
  assert.ok(stayed.length > 0);
  for (const l of stayed) assert.ok(!has(l.beds, "row", "bean", "aphids"), name(l));
  assert.equal(lines(3, /hose 'em again/i).length, 0);
  // Sprayed "my way" first, the spray drift doesn't claim it got the ladybugs "too".
  for (const l of lines(3, /got the ladybugs too/)) assert.ok(!has(l.beds, "row", "bean", "aphids"), name(l));
});

test("L4: the carrots come up in neat rows only if the bed was healthy; their state follows", () => {
  for (const p of PATHS[4]) {
    const out = p.said.find((l) => l.stepId === "spinach" && l.kind === "outcome");
    if (p.path.at(-1) !== "catch") continue;
    const bed = p.final.memory.carrot;
    const before = out.beds[bed].find((x) => x.plant === "carrot").state;
    const after = p.final.beds[bed].find((x) => x.plant === "carrot").state;
    if (/neat little rows/.test(out.text)) assert.equal(before, "sown", name({ path: p }));
    if (before === "rotting" || before === "thirsty") {
      assert.equal(after, before, "the spinach catch doesn't heal the carrots");
      assert.match(out.text, /hardly any/);
    } else assert.equal(after, "growing");
    if (p.final.recovered.includes("carrot-date")) assert.match(out.text, /rescued/);
  }
});

test("L4: pumpkins never go on the carrots, and the spinach never goes on either", () => {
  for (const p of PATHS[4]) {
    for (const [bed, list] of Object.entries(p.final.beds)) {
      const plants = list.map((x) => x.plant);
      assert.ok(!(plants.includes("pumpkin") && plants.includes("carrot")), `${bed}: ${name({ path: p })}`);
      assert.ok(!(plants.includes("spinach") && (plants.includes("carrot") || plants.includes("pumpkin"))), `${bed}: ${name({ path: p })}`);
    }
    for (const x of p.plans.filter((x) => x.stepId === "pumpkins" || x.stepId === "spinach")) {
      for (const a of x.plan) for (const t of a.targets) if (t.bed) assert.ok(!(a.item === "pumpkin" && t.bed === p.final.memory.carrot));
    }
  }
});

test("L5: Bugs never says you only just opened the app or are on the couch; the meadow, not 'everything', blooms", () => {
  assert.equal(lines(5, /only just opened|on the couch/i).length, 0);
  assert.equal(lines(5, /everything bloomed/i).length, 0);
  for (const l of lines(5, /in full bloom/)) assert.ok(l.path.final.beds.meadow.some((x) => x.plant === "flower" && x.state === "thriving"));
});

test("the reveal's fallback lines name no single version's claim", () => {
  assert.doesNotMatch(L1.reveal.fooledLine, /full sun\. Mango agreed/);
  assert.doesNotMatch(L3.reveal.fooledLine, /grab a handful/);
});

test("a skipped chore lands nothing: no effect (Level 3's beans stay untied), no doneLine", () => {
  const level = resolveLevel(L3);
  let state = createRun(level);
  const step = (a) => { state = reduce(level, state, a).state; };
  while (pendingChore(level, state)) step({ type: "chore", id: pendingChore(level, state).id, skipped: true, acted: true });
  step({ type: "ask" }); step({ type: "doIt" }); // hose the aphids: clean beans
  while (pendingChore(level, state)) step({ type: "chore", id: pendingChore(level, state).id, skipped: true, acted: true });
  step({ type: "ask" }); step({ type: "flag" }); step({ type: "name", id: "reckless" }); step({ type: "fix", id: "label" }); step({ type: "doIt" });
  const tie = pendingChore(level, state);
  assert.equal(tie.id, "tie");
  const skipped = reduce(level, state, { type: "chore", id: "tie", skipped: true, acted: true });
  assert.deepEqual(skipped.effects, []);
  assert.equal(skipped.state.beds.row[0].state, "thriving", "skipped: not staked");
  assert.ok(skipped.state.chores.includes("tie"));
  const done = reduce(level, state, { type: "chore", id: "tie", acted: true });
  assert.equal(done.state.beds.row[0].state, "staked");
});

test("ifGarden: every matching entry applies, objects merge, and the same object comes back while nothing changes", () => {
  const level = { beds: [{ id: "a", label: "A bed" }], steps: [] };
  const obj = { line: "x", effect: { plant: "p", bed: "a", state: "growing", garden: 5 },
    ifGarden: [{ when: { bed: "a", plant: "p", state: "sad" }, line: "sad", effect: { state: "sad" } }, { when: { recovered: "s1" }, line: "fixed" }] };
  const sad = { beds: { a: [{ plant: "p", state: "sad" }] }, recovered: [] };
  const got = byGarden(level, sad, obj);
  assert.equal(got.line, "sad");
  assert.deepEqual(got.effect, { plant: "p", bed: "a", state: "sad", garden: 5 });
  assert.equal(byGarden(level, sad, obj), got, "cached");
  assert.equal(byGarden(level, { beds: { a: [] }, recovered: [] }, obj), obj);
  assert.equal(byGarden(level, { beds: { a: [{ plant: "p", state: "sad" }] }, recovered: ["s1"] }, obj).line, "fixed");
  assert.equal(gardenIs(level, { beds: { a: [] } }, { bed: "a", plant: "p", absent: true }), true);
  assert.equal(gardenIs(level, { beds: { a: [] }, incidents: [{ stepId: "s", fooled: true }] }, { fooled: "s" }), true);
  assert.equal(gardenIs(level, { beds: { a: [] }, incidents: [{ stepId: "s", fooled: true, recovered: true }] }, { fooled: "s" }), false);
});

test("a variant that replaces a field an ifGarden entry rewrites brings its own ifGarden", () => {
  for (const L of [L1, L2, L3, L4, L5]) {
    for (const step of L.steps) {
      if (!step.ifGarden) continue;
      const fields = new Set(step.ifGarden.flatMap(({ when, ...f }) => Object.keys(f)));
      for (const v of step.variants || []) {
        if (Object.keys(v).some((k) => fields.has(k))) assert.ok("ifGarden" in v, `${L.id} ${step.id}`);
      }
    }
  }
});

test("currentStep keeps its identity while the garden doesn't change (the pressure clock compares steps)", () => {
  const level = resolveLevel(L4);
  let state = createRun(level);
  state = reduce(level, state, { type: "ask" }).state;
  state = reduce(level, state, { type: "place", bed: "front" }).state;
  assert.equal(currentStep(level, state), currentStep(level, state));
});
