// Levels 2–5 through the reducer, end to end, plus the rules their new
// mechanics depend on. Wording-independent: it plays by ids and fields.
// Each level's cases join this file as that level is built (T3: Level 2, T4: Level 3, T5: Level 4, T6: Level 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../levels/index.js";
import { createRun, reduce, pendingChore } from "../engine/level-runner.js";
const CHORES = { pendingChore };
import { PLACEHOLDER } from "../ui/text.js";
import { searchAlmanac } from "../mechanics/almanac.js";
import { compare } from "../mechanics/magnifier.js";
import { memoryVars, logEntries } from "../mechanics/placement.js";
import { fill } from "../ui/text.js";

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
    // A hook step (Level 5) is passed by putting the phone down.
    acts.push(step.place ? { type: "place", bed: placeIn ?? step.place.beds[0] } : step.kind === "hook" ? { type: "flag" } : { type: "doIt" });
  }
  acts.push({ type: "ask" });
  return acts;
}
const drift = (level) => level.steps.at(-1);
// Refuse the drift; a helper with a pushback block needs a second no.
const refuse = (level) => (drift(level).pushback ? [{ type: "flag" }, { type: "flag" }] : [{ type: "flag" }]);
const plantsIn = (state) => Object.values(state.beds).flat();

for (const id of ["level-2", "level-3", "level-4", "level-5"]) {
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
    const s = play(level, [...toDrift(level), ...refuse(level), { type: "name", id: d.correctFlaw },
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
    // A page tool (the log, the almanac's cover) has no key or button of its own.
    const keys = (level.tools || []).filter((t) => !t.page).map((t) => t.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const t of level.tools || []) assert.ok(t.id && t.label && (t.key || t.page), `${t.id}: id, label, key`);
    for (const t of level.tools || []) if (t.page) assert.equal(t.key ?? t.sprite, undefined, `${t.id}: a page has no key or icon`);
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

// ---------- Level 3 · Ember · the magnifier ----------
const L3 = LEVELS["level-3"];

test("level-3: the hedge at dusk, three beds with a wild one holding the berries, and Magnify on 'm'", () => {
  assert.equal(L3.scene, "hedge-dusk");
  assert.equal(L3.beds.length, 3);
  const wild = L3.beds.filter((b) => b.kind === "wild");
  assert.equal(wild.length, 1, "one wild bed");
  assert.deepEqual(L3.startPlants[wild[0].id].map((p) => p.plant), ["wildberry"], "the wild bed starts with the berries");
  assert.deepEqual(L3.tools.map((t) => [t.id, t.key]), [["magnifier", "m"]]);
});

test("level-3: the wild berry card is the only locked card and the hedge subject unlocks it", () => {
  const card = L3.evidence.find((e) => e.id === "wildberry");
  assert.ok(card.locked, "wildberry card is locked");
  assert.equal(L3.evidence.filter((e) => e.locked).length, 1, "nothing else is locked");
  assert.equal(L3.inspect.subjects.wildberry.unlocks, "wildberry");
  assert.equal(L3.inspect.reference, "blueberry");
  for (const id of Object.keys(L3.inspect.subjects)) {
    assert.ok(Object.values(L3.startPlants).flat().some((p) => p.plant === id), `${id} is a plant in the garden`);
  }
});

test("level-3: the drift picks the berries and the fix tags the bush", () => {
  const d = drift(L3);
  assert.deepEqual([d.badEffect.plant, d.badEffect.state], ["wildberry", "picked"]);
  assert.deepEqual([d.goodEffect.plant, d.goodEffect.state], ["wildberry", "tagged"]);
  assert.equal(d.correctFlaw, "reckless");
  assert.equal(d.correctFix, "expert");
  assert.match(d.badOutcome, /poison control/i, "the fooled outcome says what to do in real life");
});

// ---------- compare (mechanics/magnifier.js) ----------
test("compare: the wild berry differs from the shop blueberry on every row", () => {
  const out = compare(L3.inspect, "wildberry");
  assert.equal(out.subject, L3.inspect.subjects.wildberry);
  assert.equal(out.rows.length, L3.inspect.features.length);
  for (const row of out.rows) {
    assert.ok(row.name && row.subject && row.reference, `${row.name}: both sides filled in`);
    assert.equal(row.same, false, `${row.name} differs`);
    assert.notEqual(row.subject, row.reference);
  }
  assert.equal(out.same, false);
  assert.equal(out.verdict, L3.inspect.verdictDifferent);
});

test("compare: the reference matches itself on every row", () => {
  const out = compare(L3.inspect, "blueberry");
  assert.equal(out.same, true);
  assert.equal(out.rows.length, L3.inspect.features.length);
  assert.ok(out.rows.every((r) => r.same && r.subject === r.reference));
  assert.equal(out.verdict, L3.inspect.verdictSame);
});

test("compare: a subject with a note returns the note and no rows", () => {
  const out = compare(L3.inspect, "bean");
  assert.equal(out.rows.length, 0);
  assert.equal(out.same, null);
  assert.equal(out.verdict, L3.inspect.subjects.bean.note);
});

test("compare: an unknown subject is null", () => {
  assert.equal(compare(L3.inspect, "mango"), null);
  assert.equal(compare(L3.inspect, ""), null);
});

test("level-3: nothing the game vouches for calls the wild berry safe or edible", () => {
  // Ember's drift reply ("Fine to eat") is the lie the level is about; it is
  // excluded. Everything the magnifier, the cards, the fixed reply, the
  // outcomes and the reveal say must never affirm that the berries are safe.
  const d = drift(L3);
  const texts = [];
  const walk = (v) => {
    if (typeof v === "string") texts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(L3.inspect);
  walk(L3.evidence);
  walk([d.fixedReply, d.goodOutcome, d.badOutcome, L3.falseFlagNudge]);
  walk(L3.reveal);
  for (const id of Object.keys(L3.inspect.subjects)) {
    const out = compare(L3.inspect, id);
    walk([out.verdict, ...out.rows.map((r) => `${r.name} ${r.subject} ${r.reference}`)]);
  }
  assert.ok(texts.length > 20, "the walk covered the level's text");
  const claim = /\b(is|are|it's|they're|fine|ok|okay|safe)\s+to\s+eat\b|\bedible\b|\b(is|are|it's|they're)\s+safe\b|\bsafe\s+(berry|berries|bush|plant)\b/i;
  // "wouldn't prove it's safe", "whether something is safe", "Ember said the
  // berries were fine to eat": a denial, a question or reported speech is not
  // the game's own claim, so those clauses are cut before the check.
  const negated = /\b(n't|not|never|prove[sd]?|whether)\b[^.?!]*?\bsafe\b|\b(said|says|told)\b[^.?!]*/gi;
  for (const text of texts) assert.doesNotMatch(text.replace(negated, ""), claim, `"${text}" must not call the berries safe`);
  // And the verdict for the wild berry says plainly that looking is not enough.
  assert.match(compare(L3.inspect, "wildberry").verdict, /expert/i);
  assert.match(d.fixedReply, /don't eat/i);
  assert.match(d.fixedReply, /expert/i);
});

// ---------- Level 4 · Biscuit · placement and the log ----------
const L4 = LEVELS["level-4"];
const L4drift = drift(L4);
const bedLabel = (id) => L4.beds.find((b) => b.id === id).label.toLowerCase();
const otherOf = (bed) => (bed === "front" ? "side" : "front");
const t4 = (text, memory) => fill(text, { name: "Lucy", ...memoryVars(L4, memory) });

test("level-4: shape — garden by day, three beds, the log tool, finished plots from levels 1–3", () => {
  assert.equal(L4.scene, "garden-day");
  assert.deepEqual(L4.beds.map((b) => b.id), ["front", "side", "back"]);
  assert.deepEqual(L4.tools.map((t) => [t.id, t.key]), [["log", undefined]], "the log is the almanac's cover: no key of its own");
  assert.equal(L4.props[0].from, "finished");
  assert.deepEqual(L4.props[0].levels, ["level-1", "level-2", "level-3"]);
  const carrots = L4.steps.find((s) => s.place);
  assert.equal(carrots.place.item, "carrot");
  assert.deepEqual(carrots.place.beds, ["front", "side"]);
  assert.equal(L4drift.correctFlaw, "memory");
  assert.equal(L4drift.correctFix, "ask");
});

for (const bed of ["front", "side"]) {
  test(`level-4: carrots in the ${bed} bed, fooled → that bed gets dug over`, () => {
    const s = play(L4, [...toDrift(L4, bed), { type: "doIt" }]);
    assert.equal(s.phase, "reveal");
    assert.equal(s.memory.carrot, bed);
    assert.ok(s.beds[bed].some((p) => p.plant === "carrot" && p.state === "dug"), `carrot dug in ${bed}`);
    assert.ok(!s.beds[otherOf(bed)].some((p) => p.plant === "carrot"), "no carrot in the other bed");
    assert.ok(s.beds.back.some((p) => p.plant === "pumpkin"), "pumpkins went in the back");
  });

  test(`level-4: carrots in the ${bed} bed, caught → carrots grow there, spinach in the other bed`, () => {
    const s = play(L4, [...toDrift(L4, bed), ...refuse(L4), { type: "name", id: "memory" },
      { type: "fix", id: "ask" }, { type: "doIt" }]);
    assert.equal(s.phase, "reveal");
    assert.equal(s.stars, 3);
    assert.ok(s.beds[bed].some((p) => p.plant === "carrot" && p.state === "growing"));
    assert.ok(s.beds[otherOf(bed)].some((p) => p.plant === "spinach"));
    assert.ok(!s.beds[bed].some((p) => p.plant === "spinach"), "spinach stays out of the carrot bed");
  });

  test(`level-4: Biscuit's drift names the ${bed} bed the player chose, and the other bed`, () => {
    const memory = { carrot: bed };
    const vars = memoryVars(L4, memory);
    assert.equal(vars["placed:carrot"], bedLabel(bed));
    assert.equal(vars["other:carrot"], bedLabel(otherOf(bed)));
    const reply = t4(L4drift.reply, memory);
    assert.doesNotMatch(reply, PLACEHOLDER);
    assert.ok(reply.includes(bedLabel(bed)) && reply.includes(bedLabel(otherOf(bed))), reply);
    for (const text of [L4drift.badOutcome, L4drift.goodOutcome, L4drift.fixedReply]) {
      assert.doesNotMatch(t4(text, memory), PLACEHOLDER);
    }
  });
}

test("level-4: on the carrot step, Do it does nothing and the back bed is not an option", () => {
  const before = play(L4, [{ type: "ask" }]);
  assert.equal(before.phase, "advice");
  assert.equal(reduce(L4, before, { type: "doIt" }).state, before);
  assert.equal(reduce(L4, before, { type: "place", bed: "back" }).state, before);
  const after = reduce(L4, before, { type: "place", bed: "side" }).state;
  assert.equal(after.stepIndex, 1);
  assert.equal(after.memory.carrot, "side");
});

test("level-4: the planting log reads back where the carrots went", () => {
  assert.deepEqual(logEntries(L4, {}), []);
  const [entry] = logEntries(L4, { carrot: "front" });
  assert.equal(entry.item, "carrot");
  assert.equal(entry.bed, "front");
  assert.equal(entry.text, "You sowed carrots in the front bed.");
});

test("level-4: the carrot label can only be checked once the carrots are placed", () => {
  const start = createRun(L4);
  assert.equal(reduce(L4, start, { type: "check", id: "carrot" }).state, start);
  const placed = play(L4, [{ type: "ask" }, { type: "place", bed: "front" }]);
  const checked = reduce(L4, placed, { type: "check", id: "carrot" });
  assert.deepEqual(checked.state.checks, ["carrot"]);
  assert.ok(checked.effects.some((e) => e.type === "checked" && e.id === "carrot"));
  const card = L4.evidence.find((e) => e.id === "carrot");
  assert.equal(t4(card.lines.join(" "), { carrot: "front" }).includes("front bed"), true);
});

test("level-4: Biscuit keeps her voice and the reveal names the false memory", () => {
  const texts = [L4.greeting, ...L4.steps.flatMap((s) => [s.reply, s.doneLine, s.fixedReply, s.falseFlagNudge]), L4.falseFlagNudge]
    .filter((x) => typeof x === "string").join(" ");
  assert.match(texts, /\b(babe|iconic|legend|girl)\b/i);
  assert.match(L4.reveal.flaw, /memory/i);
  assert.ok(L4.reveal.realWorld && L4.reveal.tip, "reveal has a tip and a real-world note");
});

// ── Level 5: Bugs, pressure and the permission card ───────────────────────
import { nextPressureEffect, pressureLevel, shouldTick } from "../mechanics/pressure.js";
import { createPressureClock } from "../ui/pressure-clock.js";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const L5 = LEVELS["level-5"];
const D5 = drift(L5);
const meadow = (state) => state.beds.meadow.find((p) => p.plant === "flower");

test("level-5: shape — moonlit garden, no tools, a drift with pressure and a permission card", () => {
  assert.equal(L5.scene, "meadow-night");
  assert.deepEqual(L5.beds.map((b) => b.id), ["veg", "herbs", "house", "meadow"]);
  assert.deepEqual(L5.tools, []);
  assert.equal(D5.kind, "drift");
  assert.equal(D5.pressure.tickMs, 8000);
  assert.equal(D5.pressure.effects.length, 2);
  assert.deepEqual(D5.permission, { title: "Bugs wants to use your camera", body: "to see how you're feeling", allow: "Allow" });
  assert.equal(D5.offLabel, "Put the phone down");
  assert.equal(D5.offKey, "Escape");
  assert.equal(D5.correctFlaw, "feelings");
  assert.equal(D5.correctFix, "honest");
  assert.ok(D5.flawOptions.some((o) => o.id === "feelings") && D5.fixOptions.some((o) => o.id === "honest"));
});

test("level-5: hook steps leave pressure at zero and the meadow still thirsty", () => {
  const s = play(L5, toDrift(L5).slice(0, -1)); // both hook steps done, drift not yet asked
  assert.equal(s.stepIndex, 2);
  assert.equal(s.pressure, 0);
  assert.equal(meadow(s).state, "thirsty");
  assert.equal(pressureLevel(D5, s), 0);
  // ticks on hook steps and before asking are ignored
  const early = play(L5, [{ type: "ask" }]);
  assert.equal(reduce(L5, early, { type: "tick" }).state, early);
  assert.equal(reduce(L5, s, { type: "tick" }).state, s);
});

test("level-5: every chip on the drift step costs the meadow — wilted, then the garden slips, then nothing more", () => {
  const atDrift = play(L5, toDrift(L5).slice(0, -1));
  const [chat1, chat2] = D5.extraChips;
  const one = reduce(L5, atDrift, { type: "chat", reply: chat1.reply });
  assert.equal(one.state.pressure, 1);
  assert.equal(meadow(one.state).state, "wilted");
  assert.ok(one.state.garden < atDrift.garden);
  assert.ok(one.effects.some((e) => e.type === "grow") && one.effects.some((e) => e.type === "say" && e.text === chat1.reply));
  assert.equal(pressureLevel(D5, one.state), 0.5);
  const two = reduce(L5, one.state, { type: "chat", reply: chat2.reply });
  assert.equal(two.state.pressure, 2);
  assert.equal(meadow(two.state).state, "wilted");
  assert.ok(two.state.garden < one.state.garden, "the bar keeps dropping while you talk");
  assert.equal(pressureLevel(D5, two.state), 1);
  assert.equal(nextPressureEffect(D5, two.state), null);
  // exhausted: asking still moves to advice but spends nothing; more chat changes nothing
  const asked = reduce(L5, two.state, { type: "ask" });
  assert.equal(asked.state.phase, "advice");
  assert.equal(asked.state.pressure, 2);
  assert.equal(asked.state.garden, two.state.garden);
  const more = reduce(L5, asked.state, { type: "chat", reply: chat1.reply });
  assert.equal(more.state.garden, asked.state.garden);
  assert.equal(pressureLevel(D5, more.state), 1);
});

test("level-5: lingering ticks spend in advice only, and never after walking away", () => {
  const advice = play(L5, toDrift(L5)); // ask spent one: wilted
  assert.equal(advice.phase, "advice");
  assert.equal(meadow(advice).state, "wilted");
  const ticked = reduce(L5, advice, { type: "tick" });
  assert.equal(ticked.state.pressure, 2);
  assert.equal(meadow(ticked.state).state, "wilted");
  assert.ok(ticked.state.garden < advice.garden);
  const pushed = reduce(L5, advice, { type: "flag" }).state;
  assert.equal(pushed.phase, "pushback");
  assert.equal(reduce(L5, pushed, { type: "tick" }).state, pushed);
  const flagged = reduce(L5, pushed, { type: "flag" }).state;
  assert.equal(flagged.phase, "name");
  assert.equal(reduce(L5, flagged, { type: "tick" }).state, flagged);
  assert.equal(shouldTick(D5, "advice", false), true);
  assert.equal(shouldTick(D5, "advice", true), false);
  assert.equal(shouldTick(D5, "ask", false), false);
  assert.equal(shouldTick(D5, "flag", false), false);
  assert.equal(shouldTick(D5, "pushback", false), false);
  assert.equal(shouldTick(L5.steps[0], "advice", false), false);
});

test("level-5: Allow (doIt) wilts the meadow and reveals fooled; Walk away and the honest fix revive it", () => {
  const fooled = play(L5, [...toDrift(L5), { type: "doIt" }]);
  assert.equal(fooled.phase, "reveal");
  assert.equal(fooled.fooled, true);
  assert.equal(meadow(fooled).state, "wilted");
  assert.equal(fooled.stars, 1);
  const caught = play(L5, [...toDrift(L5), ...refuse(L5), { type: "name", id: "feelings" },
    { type: "fix", id: "honest" }, { type: "ask" }, { type: "doIt" }]);
  assert.equal(caught.phase, "reveal");
  assert.equal(caught.fooled, false);
  assert.equal(meadow(caught).state, "thriving");
  assert.equal(caught.stars, 3);
  assert.match(L5.reveal.flaw, /manipulation/i);
});

test("level-5: the meadow starts visibly thirsty, matching the evidence card", () => {
  const start = createRun(L5);
  assert.notEqual(meadow(start).state, "thriving");
  assert.equal(meadow(start).state, "thirsty");
  assert.ok(L5.evidence.find((e) => e.id === "flower").lines.some((l) => /thirsty|drooping/i.test(l)));
});

test("level-5: the whole garden is here — earlier crops thriving, an empty bed for the new flowers, the meadow", () => {
  const start = createRun(L5);
  const earlier = new Set(["level-1", "level-2", "level-3", "level-4"].flatMap((id) => LEVELS[id].steps)
    .flatMap((s) => [s.effect, s.goodEffect, ...(s.goodEffect?.extra || [])]).filter((e) => e?.plant).map((e) => e.plant));
  for (const id of ["veg", "herbs"]) {
    assert.ok(start.beds[id].length > 0, `${id} is planted`);
    for (const p of start.beds[id]) {
      assert.ok(earlier.has(p.plant), `${id}: ${p.plant} grew in an earlier level`);
      assert.equal(p.state, "thriving", `${id}: ${p.plant}`);
    }
  }
  assert.deepEqual(start.beds.house, [], "the bed by the house waits for the new flowers");
  // one crop a bed: on a phone a bed only stays full of its crop with one
  for (const [id, list] of Object.entries(start.beds)) assert.ok(list.length <= 1, `${id}: one crop`);
  assert.ok(L5.beds.length >= 4, "at least four beds");
});

test("level-5: Bugs never gives advice — every step before the drift is a hook, and put the phone down does the task", () => {
  const hooks = L5.steps.slice(0, -1);
  assert.deepEqual(hooks.map((s) => s.kind), ["hook", "hook"]);
  assert.equal(L5.steps.filter((s) => s.kind === "trust").length, 0);
  const advice = /pot depth|same depth|deeper|firm|roots|damp|dry|soggy|rot|water (only|just)|thirsty ones/i;
  for (const s of hooks) {
    assert.match(s.chip, /^I'm (going|heading)/, `${s.id}: the player says what they're about to do`);
    assert.doesNotMatch(s.reply, advice, `${s.id}: no advice in the reply`);
    for (const x of s.stay) assert.doesNotMatch(x.line, advice, `${s.id}: no advice in "${x.line}"`);
    assert.doesNotMatch(s.doneLine, advice, `${s.id}: no advice in the done line`);
    assert.equal(s.offLabel, "Put the phone down");
    assert.equal(s.offKey, "Escape");
    assert.equal(s.disagree, undefined);
    assert.ok(s.stay.length >= 2, `${s.id}: Bugs escalates`);
  }
  assert.doesNotMatch(D5.fixedReply, /roots/i, "even fixed, Bugs only lets you go");
  const [plant] = hooks;
  assert.equal(plant.effect.plant, "flower");
  assert.equal(plant.effect.bed, "house");
  const planted = play(L5, [{ type: "ask" }, { type: "flag" }]);
  assert.equal(planted.beds.house.find((p) => p.plant === "flower").state, "growing", "new flowers in the bed by the house");
  assert.equal(planted.stayed, 0);
  const watered = play(L5, [{ type: "ask" }, { type: "flag" }, { type: "ask" }, { type: "flag" }]);
  assert.equal(watered.beds.house.find((p) => p.plant === "flower").state, "thriving");
  assert.equal(watered.beds.veg.find((p) => p.plant === "carrot").state, "thriving", "the damp beds are left alone");
  assert.equal(meadow(watered).state, "thirsty", "the meadow is left for the drift");
});

test("level-5: Do it on a hook = keep talking — the task waits, the garden slips, the step stays open, one star", () => {
  const asked = play(L5, [{ type: "ask" }]);
  assert.equal(asked.phase, "advice");
  const one = reduce(L5, asked, { type: "doIt" });
  assert.equal(one.state.phase, "advice", "still on the plant step");
  assert.equal(one.state.stepIndex, 0);
  assert.deepEqual(one.state.beds.house, [], "nothing planted while you talk");
  assert.ok(one.state.garden < asked.garden, "the garden slips");
  assert.equal(one.state.stayed, 1);
  assert.ok(one.effects.some((e) => e.type === "say" && e.text === L5.steps[0].stay[0].line));
  // Bugs runs out of new lines and costs: the last line again, nothing more lost.
  let s = one.state;
  for (let i = 0; i < 4; i++) s = reduce(L5, s, { type: "doIt" }).state;
  const floor = s.garden;
  const again = reduce(L5, s, { type: "doIt" });
  assert.equal(again.state.garden, floor);
  assert.ok(again.effects.some((e) => e.type === "say" && e.text === L5.steps[0].stay.at(-1).line));
  // Put the phone down after all: the flowers go in, on to the water step.
  const down = reduce(L5, s, { type: "flag" }).state;
  assert.equal(down.stepIndex, 1);
  assert.equal(down.pressure, 0, "the stay count resets for the next step");
  // On the water step, staying leaves the new seedlings thirsty.
  const w = reduce(L5, reduce(L5, down, { type: "ask" }).state, { type: "doIt" }).state;
  assert.equal(w.beds.house.find((p) => p.plant === "flower").state, "thirsty");
  // A caught run that stayed even once ends on 2 stars.
  const d = D5;
  const run = play(L5, [{ type: "ask" }, { type: "doIt" }, { type: "flag" }, { type: "ask" }, { type: "flag" },
    { type: "ask" }, { type: "flag" }, { type: "flag" }, { type: "name", id: d.correctFlaw }, { type: "fix", id: d.correctFix }, { type: "doIt" }]);
  assert.equal(run.phase, "reveal");
  assert.equal(run.stars, 2);
});

test("level-5: putting the phone down is done by hand — the plans for each step", async () => {
  await import("../actions/registry.js"); // registers the level-owned kinds (light, close, phone-down)
  const { planFor } = await import("../actions/plan.js");
  const plan = (state, action) => planFor(L5, state, action, reduce(L5, state, action)).map((a) => a.kind);
  const atPlant = play(L5, [{ type: "ask" }]);
  assert.deepEqual(plan(atPlant, { type: "flag" }), ["dig", "collect", "firm"]);
  assert.deepEqual(plan(atPlant, { type: "doIt" }), [], "keeping talking is nothing by hand");
  const atWater = play(L5, [{ type: "ask" }, { type: "flag" }, { type: "ask" }]);
  assert.deepEqual(plan(atWater, { type: "flag" }), ["hold", "hold", "hold", "stream"]);
  const holds = L5.steps[1].actions.filter((a) => a.kind === "hold");
  assert.deepEqual(holds.map((h) => [h.target.bed, h.result]), [["veg", "Damp"], ["herbs", "Damp"], ["house", "Dry"]]);
  const atDrift = play(L5, toDrift(L5));
  assert.deepEqual(plan(atDrift, { type: "doIt" }), [], "Allow: you stayed on your phone");
  const reanswer = play(L5, [...toDrift(L5), ...refuse(L5), { type: "name", id: D5.correctFlaw }, { type: "fix", id: D5.correctFix }]);
  assert.deepEqual(plan(reanswer, { type: "doIt" }), ["phone-down", "stream", "close"]);
  assert.ok(D5.goodActions.find((a) => a.kind === "stream").soak, "the meadow is soaked: hold until it fills");
  assert.deepEqual(L5.chores.map((c) => c.id), ["lantern", "slugs", "basil"]);
});

test("level-5: the almanac has the how — watering facts and pot depth — since Bugs won't say", () => {
  const card = L5.evidence.find((e) => e.id === "water");
  assert.ok(card, "a watering evidence card");
  assert.equal(card.locked, undefined, "readable from the start");
  const text = card.lines.join(" ");
  assert.match(text, /watered this morning/i);
  assert.match(text, /rot/i);
  assert.match(text, /carrot/i);
  assert.match(text, /basil/i);
  assert.match(L5.evidence.find((e) => e.id === "flower").lines.join(" "), /pot depth/i);
});

test("level-5: every Bugs line after the greeting pulls you to stay and talk", () => {
  const PULL = /stay|talk|tell me|with me|wait/i;
  for (const s of L5.steps) {
    for (const t of [s.reply, s.doneLine, s.disagree?.reply, ...(s.extraChips || []).map((c) => c.reply)]) {
      if (typeof t === "string") assert.match(t, PULL, `${s.id}: ${t}`);
    }
  }
  assert.match(D5.pushback.reply, PULL);
  assert.match(L5.greeting, /app/, "Bugs is an app on your phone");
  assert.match(D5.reply, /camera/);
});

test("level-5: Bugs keeps his lyrical voice — ellipses and a lowercase 'i mean', never Biscuit's 'babe'", () => {
  const texts = [L5.greeting, ...L5.steps.flatMap((s) => [s.reply, s.doneLine, s.fixedReply, ...(s.extraChips || []).map((c) => c.reply)]),
    L5.falseFlagNudge].filter((x) => typeof x === "string").join(" ");
  assert.doesNotMatch(texts, /\b(babe|iconic|legend|girl)\b/i);
  assert.match(texts, /i mean/);
  assert.match(texts, /…/);
  assert.ok(L5.reveal.realWorld && L5.reveal.tip && L5.reveal.flawGloss, "reveal has gloss, tip and a real-world note");
});

test("level-5: the game never touches the camera (no getUserMedia / mediaDevices outside tests)", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === "tests" || name === "node_modules") continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(name) && /getUserMedia|mediaDevices/.test(readFileSync(p, "utf8"))) hits.push(p);
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});

test("pressure clock: runs only in advice on a timed step while visible; stops on destroy", () => {
  const listeners = {};
  const doc = {
    hidden: false,
    addEventListener: (n, f) => { listeners[n] = f; },
    removeEventListener: (n) => { delete listeners[n]; },
  };
  const ticks = [];
  const clock = createPressureClock((a) => ticks.push(a), doc);
  assert.equal(clock.running(), false);
  clock.sync(D5, "ask");
  assert.equal(clock.running(), false);
  clock.sync(D5, "advice");
  assert.equal(clock.running(), true);
  clock.sync(D5, "advice"); // same step+phase: no restart, still running
  assert.equal(clock.running(), true);
  doc.hidden = true; listeners.visibilitychange();
  assert.equal(clock.running(), false);
  doc.hidden = false; listeners.visibilitychange();
  assert.equal(clock.running(), true);
  clock.sync(D5, "flag");
  assert.equal(clock.running(), false);
  clock.sync(L5.steps[0], "advice"); // untimed step
  assert.equal(clock.running(), false);
  clock.sync(D5, "advice");
  clock.destroy();
  assert.equal(clock.running(), false);
  assert.equal(listeners.visibilitychange, undefined);
  assert.deepEqual(ticks, []); // 8 s never elapsed
});

// Ember says "not yet": the berries ripen first, and only then are they
// picked (the pick chore waits for ripe berries, and the view holds it back
// for its wait while the tub ripens). Picked early, there's no ripe pick.
test("level-3: wait for the blueberries, they ripen, then the pick chore; picked early, no ripe pick", () => {
  const { pendingChore } = CHORES;
  const iBerries = L3.steps.findIndex((s) => s.id === "blueberries");
  const upTo = [];
  for (const step of L3.steps.slice(0, iBerries)) upTo.push({ type: "ask" }, { type: "doIt" });
  // Chores before the blueberries question are done along the way.
  const through = (acts) => {
    let state = createRun(L3);
    for (const a of acts) {
      for (let c = pendingChore(L3, state); c; c = pendingChore(L3, state)) state = reduce(L3, state, { type: "chore", id: c.id }).state;
      state = reduce(L3, state, a).state;
    }
    return state;
  };
  const step = L3.steps[iBerries];
  assert.equal(step.actions, undefined, "saying yes to waiting picks nothing yet");
  assert.equal(through([...upTo, { type: "ask" }]).beds.tub[0].state, "growing", "unripe while Ember says not yet");
  for (const choice of [[{ type: "doIt" }], [{ type: "flag" }, { type: "doIt" }]]) {
    const waited = through([...upTo, { type: "ask" }, ...choice]);
    assert.equal(waited.beds.tub[0].state, "thriving", "the berries ripen");
    const chore = pendingChore(L3, waited);
    assert.equal(chore.id, "pick", "the pick comes after the ripening");
    assert.ok(chore.wait.ms >= 3000 && chore.wait.ms <= 4000 && /ripen/i.test(chore.wait.line));
    assert.deepEqual(chore.actions.map((a) => [a.kind, a.spot]), [["pick", "l3-berry-ripe"]]);
    const after = reduce(L3, waited, { type: "chore", id: "pick" }).state;
    assert.equal(after.stars, waited.stars); assert.equal(after.garden, waited.garden);
    assert.equal(pendingChore(L3, after).id, "net");
  }
  const early = through([...upTo, { type: "ask" }, { type: "flag" }, { type: "override" }]);
  assert.equal(early.beds.tub[0].state, "growing");
  assert.equal(pendingChore(L3, early).id, "net", "picked early: no ripe pick chore");
});
