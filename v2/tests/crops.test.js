// What each level actually grew (engine/crops.js): saved with progress, served
// at Rowan's dinner only if it came through healthy, and carried into later levels.
import { test } from "node:test";
import assert from "node:assert/strict";
import { healthy, cropsOf, mergeCrops, cropState, carryOver, levelPlants } from "../engine/crops.js";
import { rateStew, DISHES } from "../engine/stew.js";
import { emptyProgress, recordLevel } from "../progress.js";
import { MAP, LEVELS } from "../levels/index.js";
import { resolveLevel } from "../engine/variants.js";
import { HANDOFFS } from "../levels/wizard.js";
import { everyPath } from "./paths-helper.js";

const IDS = MAP.map((m) => m.id);
// Finish every level on its first (as-written) path that matches `want`.
function finishAll(want = () => true) {
  let progress = emptyProgress();
  for (const id of IDS) {
    const p = everyPath(LEVELS[id]).find((x) => want(id, x)) || everyPath(LEVELS[id]).at(-1);
    progress = recordLevel(progress, p.level, p.final);
  }
  return progress;
}
const caughtAll = (id, p) => !p.path.some((c) => c === "fool" || c === "fool+fix" || c === "mine");

test("healthy: thriving, staked and growing count; a bush picked unripe and the hard-season states don't", () => {
  for (const s of ["thriving", "staked", "growing"]) assert.equal(healthy("tomato", s), true, s);
  for (const s of ["bolted", "damaged", "leggy", "soggy", "rotting", "choked", "aphids", "pecked", "dug", "thirsty", "wilted", "sown"]) assert.equal(healthy("x", s), false, s);
  assert.equal(healthy("blueberry", "growing"), false);
  assert.equal(healthy("mint", "overrun"), true, "mint that took over still makes tea");
});

test("recordLevel saves the crops as the level ended, keeping the best play per crop", () => {
  const L1 = resolveLevel(LEVELS["level-1"], { "more-lettuce": 1 });
  const bolted = everyPath(LEVELS["level-1"]).find((p) => p.picks["more-lettuce"] === 1 && p.path[2] === "fool");
  let progress = recordLevel(emptyProgress(), L1, bolted.final);
  assert.equal(cropState(progress.levels["level-1"], "lettuce"), "bolted");
  const good = everyPath(LEVELS["level-1"]).find((p) => p.path[2] === "catch");
  progress = recordLevel(progress, L1, good.final);
  assert.equal(cropState(progress.levels["level-1"], "lettuce"), "thriving", "a later healthy play fills the gap");
  progress = recordLevel(progress, L1, bolted.final);
  assert.equal(cropState(progress.levels["level-1"], "lettuce"), "thriving", "and a worse replay doesn't undo it");
  assert.deepEqual(mergeCrops(undefined, { a: { x: "sad" } }), { a: { x: "sad" } });
});

test("Level 3 fooled on the wild berries: the saved bush is the pecked one, as on the shelf", () => {
  const L3 = LEVELS["level-3"];
  const p = everyPath(L3).find((x) => x.path.at(-1) === "fool");
  assert.equal(cropsOf(L3, p.final).tub.blueberry, "pecked");
});

test("dinner: everything caught, everything served, and no parsley or rosemary that never grew", () => {
  const r = rateStew(finishAll(caughtAll), IDS);
  assert.equal(r.missing.length, 0, r.missing.map((d) => d.id).join());
  assert.ok(!r.dishes.some((d) => d.id === "parsley"), "parsley is never planted");
  assert.ok(!r.dishes.some((d) => d.id === "rosemary"), "the as-written Level 2 grows no rosemary");
  assert.ok(r.dishes.every((d) => d.present));
});

test("dinner serves only what actually grew healthily, with a line for each gap", () => {
  const cases = [
    { id: "level-1", picks: { "more-lettuce": 1 }, path: (p) => p[2] === "fool" && p[3] === "catch", dish: "lettuce", why: /bolted and went bitter/ },
    { id: "level-1", picks: {}, path: (p) => p[0] === "mine", dish: "sunflower", why: /spindly/ },
    { id: "level-2", picks: { "soak-basil": 0 }, path: (p) => p[2] === "fool" && p[3] === "catch", dish: "basil", why: /soggy/ },
    { id: "level-2", picks: { "soak-basil": 1 }, path: (p) => p[2] === "fool" && p[3] === "catch", dish: "rosemary", why: /rotted/ },
    { id: "level-3", picks: { "bug-spray": 0 }, path: (p) => p[1] === "fool" && p[3] === "catch", dish: "bean", why: /spray and the aphids/ },
    { id: "level-3", picks: {}, path: (p) => p.at(-1) === "fool", dish: "blueberry", why: /birds got the blueberries/ },
    { id: "level-4", picks: { "carrot-date": 0 }, path: (p) => p[1] === "fool" && p.at(-1) === "catch", dish: "carrot", why: /rotted/ },
  ];
  for (const c of cases) {
    const paths = everyPath(LEVELS[c.id]).filter((p) => Object.entries(c.picks).every(([k, v]) => p.picks[k] === v));
    const p = paths.find((x) => c.path(x.path));
    let progress = finishAll(caughtAll);
    progress = { ...progress, levels: { ...progress.levels, [c.id]: undefined } };
    delete progress.levels[c.id];
    progress = recordLevel(progress, p.level, p.final);
    const r = rateStew(progress, IDS);
    const d = r.dishes.find((x) => x.id === c.dish);
    assert.ok(d, `${c.dish} on the menu`);
    assert.equal(d.present, false, `${c.id} ${c.dish}`);
    assert.match(d.why, c.why);
  }
});

test("dinner after fixing it yourself: the rescued crop is served", () => {
  for (const [id, picks, dish] of [["level-2", { "soak-basil": 0 }, "basil"], ["level-2", { "soak-basil": 1 }, "rosemary"], ["level-4", { "carrot-date": 0 }, "carrot"], ["level-3", { "bug-spray": 0 }, "bean"]]) {
    const p = everyPath(LEVELS[id]).find((x) => Object.entries(picks).every(([k, v]) => x.picks[k] === v) && x.path.includes("fool+fix") && x.path.at(-1) === "catch" && !x.path.includes("mine"));
    let progress = finishAll(caughtAll);
    delete progress.levels[id];
    progress = recordLevel(progress, p.level, p.final);
    const d = rateStew(progress, IDS).dishes.find((x) => x.id === dish);
    assert.equal(d.present, true, `${id} ${dish}`);
  }
});

test("dinner: the old-save fallback no longer says wild berries got in the bowl", () => {
  const r = rateStew({ levels: { "level-3": { stars: 1, fooled: true } } }, ["level-3"]);
  assert.doesNotMatch(r.missing.map((d) => d.why).join(" "), /Wild berries got in the bowl/);
  assert.ok(!DISHES.some((d) => d.id === "parsley"));
});

test("carry-over: Level 5's Veg carrots and Herbs basil follow how Levels 4 and 2 ended", () => {
  const L5 = LEVELS["level-5"];
  const start = (lvl) => Object.fromEntries(Object.entries(lvl.startPlants).map(([b, l]) => [b, l.map((p) => p.state).join()]));
  assert.equal(carryOver(L5, emptyProgress()).startPlants.veg[0].state, "thriving", "no record: as written");
  const fine = finishAll(caughtAll);
  assert.deepEqual(start(carryOver(L5, fine)), start(L5));
  const bad = { ...fine, levels: { ...fine.levels,
    "level-4": { ...fine.levels["level-4"], crops: { front: { carrot: "dug" }, back: { pumpkin: "growing" } } },
    "level-2": { ...fine.levels["level-2"], crops: { bench: { basil: "choked", mint: "overrun" } } } } };
  const got = carryOver(L5, bad);
  assert.equal(got.startPlants.veg[0].state, "dug");
  assert.equal(got.startPlants.herbs[0].state, "growing");
  const rotted = { ...bad, levels: { ...bad.levels, "level-4": { crops: { front: { carrot: "rotting" } } } } };
  assert.equal(carryOver(L5, rotted).startPlants.veg[0].state, "growing", "watered this morning: never shown soggy");
});

test("carry-over: Level 4's 'pick blueberries off your old bush' only if the birds didn't get it", () => {
  const L4 = LEVELS["level-4"];
  const has = (lvl) => lvl.chores.some((c) => c.id === "harvest");
  assert.ok(has(carryOver(L4, emptyProgress())));
  assert.ok(has(carryOver(L4, { levels: { "level-3": { crops: { tub: { blueberry: "thriving" } } } } })));
  assert.ok(!has(carryOver(L4, { levels: { "level-3": { crops: { tub: { blueberry: "pecked" } } } } })));
});

test("Rowan hands over only seeds the played version plants: no parsley, rosemary only on its replay", () => {
  const L2 = LEVELS["level-2"];
  const v0 = levelPlants(resolveLevel(L2, { "soak-basil": 0 }));
  const v1 = levelPlants(resolveLevel(L2, { "soak-basil": 1 }));
  assert.deepEqual(HANDOFFS["level-2"].seeds.filter((s) => v0.has(s)), ["basil", "mint"]);
  assert.deepEqual(HANDOFFS["level-2"].seeds.filter((s) => v1.has(s)), ["basil", "rosemary", "mint"]);
  for (const id of IDS) {
    const all = levelPlants(LEVELS[id]); // every version
    for (const s of HANDOFFS[id].seeds) assert.ok(all.has(s), `${id} hands over ${s}, which some version plants`);
  }
});
