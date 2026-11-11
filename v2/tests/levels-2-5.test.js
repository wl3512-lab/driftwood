// Levels 2–5 through the reducer, end to end, plus the rules their new
// mechanics depend on. Wording-independent: it plays by ids and fields.
// Each level's cases join this file as that level is built (T3: Level 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";
import { createRun, reduce } from "../engine/level-runner.js";
import { PLACEHOLDER } from "../ui/text.js";
import { searchAlmanac } from "../mechanics/almanac.js";

function play(level, actions) {
  let state = createRun(level);
  for (const a of actions) state = reduce(level, state, a).state;
  return state;
}
// Trust steps: ask, then Do it (or place in the first listed bed).
function toDrift(level, placeIn) {
  const acts = [];
  for (const step of level.steps.slice(0, -1)) {
    acts.push({ type: "ask" });
    acts.push(step.place ? { type: "place", bed: placeIn ?? step.place.beds[0] } : { type: "doIt" });
  }
  acts.push({ type: "ask" });
  return acts;
}
const drift = (level) => level.steps.at(-1);
const plantsIn = (state) => Object.values(state.beds).flat();

for (const id of ["level-2"]) {
  const level = LEVELS[id];

  test(`${id}: fooled path → reveal, 1 star, bad sprite in the garden`, () => {
    const s = play(level, [...toDrift(level), { type: "doIt" }]);
    assert.equal(s.phase, "reveal");
    assert.equal(s.stars, 1);
    const bad = drift(level).badEffect;
    assert.ok(plantsIn(s).some((p) => p.plant === bad.plant && p.state === bad.state), `${bad.plant}-${bad.state} shown`);
  });

  test(`${id}: caught path, right picks → 3 stars, good sprite`, () => {
    const d = drift(level);
    const s = play(level, [...toDrift(level), { type: "flag" }, { type: "name", id: d.correctFlaw },
      { type: "fix", id: d.correctFix }, { type: "doIt" }]);
    assert.equal(s.phase, "reveal");
    assert.equal(s.stars, 3);
    const good = d.goodEffect;
    assert.ok(plantsIn(s).some((p) => p.plant === good.plant && p.state === good.state));
  });

  test(`${id}: only known placeholders in its text`, () => {
    const placed = level.steps.filter((s) => s.place).map((s) => s.place.item);
    const allowed = new Set(["name", ...placed.flatMap((i) => [`placed:${i}`, `other:${i}`])]);
    const walk = (v) => {
      if (typeof v === "string") for (const m of v.matchAll(PLACEHOLDER)) assert.ok(allowed.has(m[1]), `{${m[1]}} in "${v}"`);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(level);
  });

  test(`${id}: evidence for the drift is locked until checked, and some tool or step can unlock it`, () => {
    const card = level.evidence.find((e) => e.id === drift(level).badEffect.plant);
    if (!card.locked) return; // Level 5's evidence is the wilting meadow itself
    const unlockers = [
      ...(level.almanac?.pages || []).map((p) => p.id),
      ...Object.values(level.inspect?.subjects || {}).map((s) => s.unlocks),
      ...level.steps.filter((s) => s.place).map((s) => s.place.item),
    ];
    assert.ok(unlockers.includes(card.id), `${card.id} can be unlocked`);
  });

  test(`${id}: every tool has a unique single key and a label`, () => {
    const keys = (level.tools || []).map((t) => t.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const t of level.tools || []) assert.ok(t.id && t.label && t.key, `${t.id}: id, label, key`);
  });
}

// ---------- Level 2 · Luna · the almanac ----------
const L2 = LEVELS["level-2"];

test("level-2: the greenhouse scene, two beds, and the almanac tool on '/'", () => {
  assert.equal(L2.scene, "greenhouse");
  assert.equal(L2.beds.length, 2);
  assert.deepEqual(L2.tools.map((t) => [t.id, t.key]), [["almanac", "/"]]);
});

test("level-2: the mint card starts locked and only the almanac's mint page opens it", () => {
  const card = L2.evidence.find((e) => e.id === "mint");
  assert.ok(card.locked, "mint card is locked");
  assert.ok(L2.almanac.pages.some((p) => p.id === "mint"), "an almanac page has the card's id");
  assert.equal(L2.evidence.filter((e) => e.locked).length, 1, "nothing else is locked");
});

test("level-2: almanac pages are well formed and every tab can be searched for by its own title", () => {
  const ids = L2.almanac.pages.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "unique page ids");
  assert.ok(L2.almanac.title && L2.almanac.notFound);
  for (const p of L2.almanac.pages) {
    assert.ok(p.title && p.lines.length > 0 && p.keywords.length > 0, `${p.id}: title, lines, keywords`);
    assert.equal(searchAlmanac(L2.almanac.pages, p.title)?.id, p.id, `searching "${p.title}" finds it`);
  }
});

test("level-2: the fix puts the mint in its own pot, away from the basil", () => {
  const d = drift(L2);
  const pots = L2.beds.find((b) => b.kind === "pots");
  assert.ok(pots, "a bed of pots");
  assert.equal(d.goodEffect.bed, pots.id, "good effect: mint in the pots");
  const basilBed = L2.steps.find((s) => s.effect?.plant === "basil").effect.bed;
  assert.equal(d.badEffect.bed, basilBed, "bad effect: mint next to the basil");
  assert.notEqual(d.goodEffect.bed, basilBed);
});

test("level-2: effect.extra — the mint overruns and the basil is choked", () => {
  const s = play(L2, [...toDrift(L2), { type: "doIt" }]);
  const basilBed = L2.steps.find((s2) => s2.effect?.plant === "basil").effect.bed;
  assert.deepEqual(s.beds[basilBed].map((p) => `${p.plant}-${p.state}`).sort(), ["basil-choked", "mint-overrun"]);
});

test("level-2: caught path keeps the basil thriving", () => {
  const d = drift(L2);
  const s = play(L2, [...toDrift(L2), { type: "flag" }, { type: "name", id: d.correctFlaw },
    { type: "fix", id: d.correctFix }, { type: "doIt" }]);
  assert.ok(plantsIn(s).some((p) => p.plant === "basil" && p.state === "thriving"));
  assert.ok(!plantsIn(s).some((p) => p.state === "overrun" || p.state === "choked"));
});

test("level-2: checking mint records once, works mid-level, is ignored after the reveal", () => {
  let s = createRun(L2);
  const out = reduce(L2, s, { type: "check", id: "mint" });
  assert.deepEqual(out.state.checks, ["mint"]);
  assert.deepEqual(out.effects, [{ type: "checked", id: "mint" }]);
  assert.equal(reduce(L2, out.state, { type: "check", id: "mint" }).state, out.state, "second check ignored");
  const mid = play(L2, [{ type: "ask" }, { type: "doIt" }, { type: "check", id: "mint" }]);
  assert.deepEqual(mid.checks, ["mint"], "works mid-level");
  assert.equal(mid.phase, "ask", "checking never moves the level on");
  s = play(L2, [...toDrift(L2), { type: "doIt" }]);
  assert.equal(reduce(L2, s, { type: "check", id: "mint" }).state, s, "no checks after the reveal");
  assert.equal(reduce(L2, createRun(L2), { type: "check", id: "nope" }).effects.length, 0, "unknown ids ignored");
});

test("level-2: checking never changes the score", () => {
  const d = drift(L2);
  const s = play(L2, [{ type: "check", id: "mint" }, ...toDrift(L2), { type: "flag" },
    { type: "name", id: d.correctFlaw }, { type: "fix", id: d.correctFix }, { type: "doIt" }]);
  assert.equal(s.stars, 3);
});

// ---------- searchAlmanac ----------
test("almanac search: whole words, prefixes, plurals, nothing for junk", () => {
  const pages = L2.almanac.pages;
  assert.equal(searchAlmanac(pages, "Mint")?.id, "mint");
  assert.equal(searchAlmanac(pages, "  MINT  ")?.id, "mint");
  assert.equal(searchAlmanac(pages, "does spearmint spread?")?.id, "mint");
  assert.equal(searchAlmanac(pages, "mints")?.id, "mint", "a plural finds the page");
  assert.equal(searchAlmanac(pages, "rose")?.id, "rosemary", "3+ letter prefix");
  assert.equal(searchAlmanac(pages, "min")?.id, "mint");
  assert.equal(searchAlmanac(pages, "mi"), null, "under 3 letters is too short for a prefix");
  assert.equal(searchAlmanac(pages, ""), null);
  assert.equal(searchAlmanac(pages, "zz"), null);
  assert.equal(searchAlmanac(pages, "how do I grow a tree"), null);
});

test("almanac search: the first word that names a page wins", () => {
  const pages = L2.almanac.pages;
  assert.equal(searchAlmanac(pages, "rosemary and mint")?.id, "rosemary");
  assert.equal(searchAlmanac(pages, "mint next to basil?")?.id, "mint");
  assert.equal(searchAlmanac(pages, "will the mint spread")?.id, "mint", "small words don't prefix-match pages");
});

test("almanac search: copes with missing input", () => {
  assert.equal(searchAlmanac([], "mint"), null);
  assert.equal(searchAlmanac(undefined, "mint"), null);
  assert.equal(searchAlmanac(L2.almanac.pages, null), null);
  assert.equal(searchAlmanac(L2.almanac.pages, undefined), null);
});
