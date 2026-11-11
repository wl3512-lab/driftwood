import { test } from "node:test";
import assert from "node:assert/strict";
import { placeStepFor, resolveBed, resolveEffect, memoryVars, logEntries } from "../mechanics/placement.js";
import { nextPressureEffect, pressureLevel, shouldTick } from "../mechanics/pressure.js";

// Fixtures, not the real levels, so copy edits never break these.
const PLACE_LEVEL = {
  beds: [{ id: "front", label: "Front bed" }, { id: "side", label: "Side bed" }, { id: "back", label: "Back bed" }],
  steps: [
    { kind: "trust", place: { item: "carrot", beds: ["front", "side"], prompt: "Where?" } },
    { kind: "drift" },
  ],
};

test("placement: placeStepFor finds the step that places an item", () => {
  assert.equal(placeStepFor(PLACE_LEVEL, "carrot"), PLACE_LEVEL.steps[0]);
  assert.equal(placeStepFor(PLACE_LEVEL, "pumpkin"), undefined);
});

test("placement: @item and @other:item follow the player's choice", () => {
  assert.equal(resolveBed(PLACE_LEVEL, { carrot: "side" }, "@carrot"), "side");
  assert.equal(resolveBed(PLACE_LEVEL, { carrot: "side" }, "@other:carrot"), "front");
  assert.equal(resolveBed(PLACE_LEVEL, { carrot: "front" }, "@other:carrot"), "side");
  assert.equal(resolveBed(PLACE_LEVEL, {}, "@carrot"), null, "nothing placed yet");
  assert.equal(resolveBed(PLACE_LEVEL, { pea: "front" }, "@other:pea"), null, "no step places it");
  assert.equal(resolveBed(PLACE_LEVEL, {}, "back"), "back", "plain beds pass through");
  assert.equal(resolveBed(PLACE_LEVEL, {}, undefined), undefined);
});

test("placement: resolveEffect resolves the main bed and extra beds without mutating", () => {
  const effect = Object.freeze({ plant: "carrot", bed: "@carrot", state: "growing",
    extra: Object.freeze([Object.freeze({ plant: "lettuce", bed: "@other:carrot", state: "growing" })]) });
  assert.deepEqual(resolveEffect(PLACE_LEVEL, { carrot: "side" }, effect), {
    plant: "carrot", bed: "side", state: "growing", extra: [{ plant: "lettuce", bed: "front", state: "growing" }],
  });
  assert.deepEqual(resolveEffect(PLACE_LEVEL, {}, { water: true }), { water: true });
  assert.equal(resolveEffect(PLACE_LEVEL, {}, undefined), undefined);
});

test("placement: text vars and the planting log", () => {
  assert.deepEqual(memoryVars(PLACE_LEVEL, { carrot: "front" }), { "placed:carrot": "front bed", "other:carrot": "side bed" });
  assert.deepEqual(memoryVars(PLACE_LEVEL, {}), {});
  assert.deepEqual(logEntries(PLACE_LEVEL, { carrot: "front" }),
    [{ item: "carrot", bed: "front", text: "You sowed carrots in the front bed." }]);
  assert.deepEqual(logEntries(PLACE_LEVEL, {}), []);
});

const PRESSURE_STEP = { kind: "drift", pressure: { tickMs: 8000, effects: [{ plant: "flower", state: "thirsty" }, { plant: "flower", state: "wilted" }] } };

test("pressure: nextPressureEffect walks the effects, then runs out", () => {
  assert.equal(nextPressureEffect(PRESSURE_STEP, { pressure: 0 }).state, "thirsty");
  assert.equal(nextPressureEffect(PRESSURE_STEP, { pressure: 1 }).state, "wilted");
  assert.equal(nextPressureEffect(PRESSURE_STEP, { pressure: 2 }), null);
  assert.equal(nextPressureEffect({ kind: "trust" }, { pressure: 0 }), null);
});

test("pressure: pressureLevel runs 0 → 1 over the step's effects", () => {
  assert.equal(pressureLevel(PRESSURE_STEP, { pressure: 0 }), 0);
  assert.equal(pressureLevel(PRESSURE_STEP, { pressure: 1 }), 0.5);
  assert.equal(pressureLevel(PRESSURE_STEP, { pressure: 9 }), 1);
  assert.equal(pressureLevel({}, { pressure: 3 }), 0);
  assert.equal(pressureLevel(undefined, { pressure: 0 }), 0);
});

test("pressure: shouldTick only while asking or deciding, visible, on a timed pressure step", () => {
  assert.equal(shouldTick(PRESSURE_STEP, "ask", false), true);
  assert.equal(shouldTick(PRESSURE_STEP, "advice", false), true);
  assert.equal(shouldTick(PRESSURE_STEP, "advice", true), false, "paused while the tab is hidden");
  for (const phase of ["name", "fix", "reanswer", "reveal"]) assert.equal(shouldTick(PRESSURE_STEP, phase, false), false, phase);
  assert.equal(shouldTick({ kind: "trust" }, "ask", false), false);
  assert.equal(shouldTick(undefined, "ask", false), false);
  const chatOnly = { kind: "drift", pressure: { effects: PRESSURE_STEP.pressure.effects } };
  assert.equal(shouldTick(chatOnly, "advice", false), false, "no tickMs → chat-only pressure, no clock");
});

// ---- text variables and keyboard shortcuts (pure UI helpers) ----
import { fill } from "../ui/text.js";
import { shortcutFor, keyCap, ariaKey, keyName } from "../ui/shortcuts.js";

test("fill: swaps known keys and leaves unknown ones visible", () => {
  assert.equal(fill("Hi, {name}.", { name: "Ada" }), "Hi, Ada.");
  assert.equal(fill("the {placed:carrot} and the {other:carrot}", { "placed:carrot": "front bed", "other:carrot": "side bed" }),
    "the front bed and the side bed");
  assert.equal(fill("{nope} and {name}", { name: "Ada" }), "{nope} and Ada", "missing values stay visible");
  assert.equal(fill("no vars here"), "no vars here");
  assert.equal(fill(undefined), "");
  assert.equal(fill(null, { name: "Ada" }), "");
  assert.equal(fill("{name}", { name: "" }), "", "an empty value is still a value");
  assert.equal(fill("a {b c} d", {}), "a {b c} d", "not a placeholder");
});

const KEYS = [{ id: "almanac", key: "/" }, { id: "log", key: "l" }, { id: "leave", key: "Escape" }];

test("shortcutFor: keys map to ids, case-insensitive, Esc alias", () => {
  assert.equal(shortcutFor({ key: "/" }, KEYS), "almanac");
  assert.equal(shortcutFor({ key: "l" }, KEYS), "log");
  assert.equal(shortcutFor({ key: "L" }, KEYS), "log");
  assert.equal(shortcutFor({ key: "Escape" }, KEYS), "leave");
  assert.equal(shortcutFor({ key: "Esc" }, KEYS), "leave");
  assert.equal(shortcutFor({ key: "x" }, KEYS), null);
  assert.equal(shortcutFor({ key: "/" }, []), null);
  assert.equal(shortcutFor({ key: undefined }, KEYS), null);
});

test("shortcutFor: while typing only Escape counts, so / and letters reach the box", () => {
  assert.equal(shortcutFor({ key: "/" }, KEYS, { typing: true }), null);
  assert.equal(shortcutFor({ key: "l" }, KEYS, { typing: true }), null);
  assert.equal(shortcutFor({ key: "Escape" }, KEYS, { typing: true }), "leave");
});

test("shortcutFor: modifier keys and key repeats never match", () => {
  for (const mod of ["ctrlKey", "metaKey", "altKey"]) assert.equal(shortcutFor({ key: "l", [mod]: true }, KEYS), null, mod);
  assert.equal(shortcutFor({ key: "l", repeat: true }, KEYS), null);
  assert.equal(shortcutFor({ key: "/", shiftKey: true }, KEYS), "almanac", "shift is how some layouts type /");
});

test("key caps, aria-keyshortcuts values and spoken names", () => {
  assert.equal(keyCap("/"), "/");
  assert.equal(keyCap("l"), "L");
  assert.equal(keyCap("Escape"), "Esc");
  assert.equal(ariaKey("/"), "/");
  assert.equal(ariaKey("l"), "L");
  assert.equal(ariaKey("Escape"), "Escape");
  assert.equal(keyName("/"), "slash");
  assert.equal(keyName("l"), "L");
  assert.equal(keyName("Escape"), "Escape");
  assert.equal(keyName("1"), "1");
});
