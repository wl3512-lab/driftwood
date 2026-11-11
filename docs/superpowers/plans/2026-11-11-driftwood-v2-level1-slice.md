# Driftwood v2 · Level 1 Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Level 1 (Mango, "Plan your garden", sycophancy) of the redesigned Driftwood at `/v2/`, end to end: splash → framing + name → level map → level → reveal → field guide.

**Architecture:** A static site with no bundler, using native ES modules. All game rules live in one pure state machine (`v2/engine/level-runner.js`), driven by plain level data (`v2/levels/level-1.js`). Views render DOM from runner state. The garden is DOM and SVG, not p5. The current game at `/` is untouched.

**Tech Stack:** Vanilla JS (ES modules), CSS, generated 32×32 pixel SVGs, `node:test` for unit tests (Node ≥ 22; this machine has 24), Playwright for E2E (from the npx cache, not a project dependency).

**Spec:** `docs/superpowers/specs/2026-11-11-driftwood-redesign-design.md`. Adjustments made while planning, and already written back into the spec:
- The framing line and name entry share one screen. That's one tap fewer, following Lucy's "merge choice screens" rule.
- Sprites are 16×16 cells on a 32×32 viewBox (2px cells). 4px cells were too coarse to show four tomato states.
- Sunny and shady beds are CSS, not art.
- Each step has one question that advances the step, plus "extra chips" that get an in-character reply without advancing.

## Conventions for every task

- Work on branch `redesign` (it already exists and holds the spec).
- Repo root: `/Users/lucyliu/Desktop/Archive/Portfolio Documentation 2/midterm spring 2026/topics in media/driftwood final`. All paths below are relative to it.
- Unit tests: `node --test "v2/tests/*.test.js"`. Node 24 needs the quoted glob; a bare folder name fails.
- Before every commit that touches code (not docs or tests alone), run the `verify` skill (verification-loop), as the Bash tool rules require.
- Any browser test must mute audio. Use `scripts/test-mute.js` as an init script and close the browser when done (Lucy's standing rule).
- Do not touch `sketch.js`, `style.css`, `sw.js` (except the VERSION bump in Task 10), or Lucy's uncommitted files. `git add` only the files each task names.
- Commit messages are conventional (`feat:`, `test:`, `docs:`) and end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `v2/package.json` | `{ "type": "module" }` so Node runs the ES-module files in tests. Browsers ignore it. |
| `v2/engine/level-runner.js` | Pure step machine `(level, state, action) → { state, effects }`, plus star scoring |
| `v2/engine/matcher.js` | Typed question → `"ask"` or `"redirect"`; cycles redirect lines |
| `v2/progress.js` | Save/load (guarded), record a finished level, unlock rule |
| `v2/levels/level-1.js` | Level 1 content as pure data |
| `v2/levels/index.js` | `LEVELS` (built) and `MAP` (all five plots) |
| `scripts/make-v2-art.mjs` | Pixel maps → `v2/art/*.svg` and `v2/art/sheet.html` |
| `v2/ui/dom.js` | `h()`, `focusFirst()`, `announce()`, `finePointer()` |
| `v2/ui/intro.js` | Splash, plus the framing line and name screen |
| `v2/ui/map.js` | Level map and field guide; `starText()` |
| `v2/garden/garden.js` | Beds and plants from runner state |
| `v2/garden/drift.js` | Sets `--drift` on the scene |
| `v2/ui/level-view.js` | Level screen: turns clicks into runner actions and state into DOM |
| `v2/ui/reveal.js` | CRT reveal screen |
| `v2/main.js` | Screen router and `?screen=` jumps |
| `v2/index.html` | Page shell |
| `v2/css/{base,crt,map,level}.css` | Tokens and buttons / CRT world / map / level screen |
| `v2/tests/*.test.js` | Unit tests |
| `scripts/test-v2-slice.cjs` | Playwright E2E for both branches at two sizes |

---

### Task 1: Level runner (the game rules)

**Files:**
- Create: `v2/package.json`
- Create: `v2/tests/level-runner.test.js`
- Create: `v2/engine/level-runner.js`

- [ ] **Step 1: Make Node treat v2 as ES modules**

```bash
mkdir -p v2/engine v2/tests && printf '{ "type": "module" }\n' > v2/package.json
```

- [ ] **Step 2: Write the failing tests**

Create `v2/tests/level-runner.test.js`. It uses its own tiny fixture level, so later wording changes to Level 1 never break it:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, reduce, scoreStars } from "../engine/level-runner.js";

// A tiny level, independent of the real Level 1 copy, so wording edits never break these tests.
const LEVEL = {
  id: "fixture",
  gardenStart: 30,
  beds: [{ id: "sun", light: "sunny" }, { id: "dark", light: "shady" }],
  startPlants: { dark: [{ plant: "lettuce", state: "growing" }] },
  falseFlagNudge: "Looks fine.",
  steps: [
    { id: "a", kind: "trust", reply: "good A", doneLine: "done A",
      effect: { plant: "sunflower", bed: "sun", state: "growing", garden: 15 } },
    { id: "b", kind: "trust", reply: "good B", effect: { water: true, garden: 10 } },
    { id: "c", kind: "drift", reply: "bad C",
      badEffect: { plant: "tomato", bed: "dark", state: "damaged", garden: -30 },
      flawOptions: [{ id: "x", label: "X" }, { id: "agreed", label: "Agreed" }],
      correctFlaw: "agreed", flawHints: { x: "not X" },
      fixOptions: [{ id: "honest", label: "Be honest" }, { id: "nice", label: "Be nice" }],
      correctFix: "honest", fixHints: { nice: "not nice" },
      fixedReply: "honest C",
      goodEffect: { plant: "tomato", bed: "sun", state: "thriving", garden: 25 } },
  ],
};

function play(actions) {
  let state = createRun(LEVEL);
  const effects = [];
  for (const action of actions) {
    const out = reduce(LEVEL, state, action);
    state = out.state;
    effects.push(...out.effects);
  }
  return { state, effects };
}

const TRUST = [{ type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }, { type: "ask" }];

test("createRun copies start plants and does not share them with the level", () => {
  const state = createRun(LEVEL);
  assert.deepEqual(state.beds, { sun: [], dark: [{ plant: "lettuce", state: "growing" }] });
  state.beds.dark[0].state = "thriving";
  assert.equal(LEVEL.startPlants.dark[0].state, "growing");
});

test("trust steps grow the garden and move on", () => {
  const { state, effects } = play([{ type: "ask" }, { type: "doIt" }]);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.phase, "ask");
  assert.equal(state.garden, 45);
  assert.deepEqual(state.beds.sun, [{ plant: "sunflower", state: "growing" }]);
  assert.deepEqual(effects.map((e) => e.type), ["say", "grow", "say"]);
});

test("watering turns every growing plant into a thriving one", () => {
  const { state } = play([{ type: "ask" }, { type: "doIt" }, { type: "ask" }, { type: "doIt" }]);
  assert.equal(state.beds.sun[0].state, "thriving");
  assert.equal(state.beds.dark[0].state, "thriving");
  assert.equal(state.garden, 55);
});

test("asking the drift question starts the drift", () => {
  const { state, effects } = play(TRUST);
  assert.equal(state.phase, "advice");
  assert.equal(state.drift, 0.6);
  assert.equal(effects.at(-1).text, "bad C");
});

test("doing the drifted advice damages the garden, reveals, and scores 1 star", () => {
  const { state } = play([...TRUST, { type: "doIt" }]);
  assert.equal(state.phase, "reveal");
  assert.equal(state.fooled, true);
  assert.equal(state.drift, 1);
  assert.equal(state.garden, 25);
  assert.deepEqual(state.beds.dark.at(-1), { plant: "tomato", state: "damaged" });
  assert.equal(state.stars, 1);
});

test("a clean catch scores 3 stars and plants healthy tomatoes", () => {
  const { state, effects } = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" },
    { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(state.phase, "reveal");
  assert.equal(state.caught, true);
  assert.equal(state.fooled, false);
  assert.equal(state.stars, 3);
  assert.deepEqual(state.beds.sun.at(-1), { plant: "tomato", state: "thriving" });
  assert.ok(effects.some((e) => e.type === "rule" && e.text === "Be honest"));
  assert.ok(effects.some((e) => e.type === "say" && e.text === "honest C"));
});

test("a wrong name pick hints, stays in name, and costs a star", () => {
  const { state, effects } = play([...TRUST, { type: "flag" }, { type: "name", id: "x" }]);
  assert.equal(state.phase, "name");
  assert.equal(effects.at(-1).text, "not X");
  const end = play([...TRUST, { type: "flag" }, { type: "name", id: "x" }, { type: "name", id: "agreed" },
    { type: "fix", id: "honest" }, { type: "doIt" }]);
  assert.equal(end.state.stars, 2);
});

test("a wrong fix pick hints, stays in fix, and costs a star", () => {
  const { state, effects } = play([...TRUST, { type: "flag" }, { type: "name", id: "agreed" }, { type: "fix", id: "nice" }]);
  assert.equal(state.phase, "fix");
  assert.equal(effects.at(-1).text, "not nice");
});

test("flagging good advice nudges without leaving the step and costs a star", () => {
  const { state, effects } = play([{ type: "ask" }, { type: "flag" }]);
  assert.equal(state.phase, "advice");
  assert.equal(state.stepIndex, 0);
  assert.equal(state.falseFlags, 1);
  assert.equal(effects.at(-1).text, "Looks fine.");
});

test("stars never drop below 1", () => {
  assert.equal(scoreStars({ fooled: false, nameMisses: 2, fixMisses: 1, falseFlags: 3 }), 1);
});

test("chat replies without changing the step", () => {
  const before = createRun(LEVEL);
  const { state, effects } = reduce(LEVEL, before, { type: "chat", reply: "hi!" });
  assert.equal(state, before);
  assert.deepEqual(effects, [{ type: "say", text: "hi!" }]);
});

test("actions that do not fit the phase are ignored", () => {
  const before = createRun(LEVEL);
  for (const action of [{ type: "doIt" }, { type: "flag" }, { type: "name", id: "agreed" }]) {
    const out = reduce(LEVEL, before, action);
    assert.equal(out.state, before);
    assert.deepEqual(out.effects, []);
  }
});

test("garden meter is clamped to 0–100", () => {
  const level = { ...LEVEL, gardenStart: 95 };
  let state = createRun(level);
  state = reduce(level, state, { type: "ask" }).state;
  state = reduce(level, state, { type: "doIt" }).state;
  assert.equal(state.garden, 100);
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `node --test "v2/tests/*.test.js"`
Expected: FAIL with `Cannot find module '…/v2/engine/level-runner.js'`.

- [ ] **Step 4: Implement the runner**

Create `v2/engine/level-runner.js`:

```js
// One level as a pure step machine: (level, state, action) → { state, effects }.
// No DOM, no timers, no randomness, so every path is unit-testable.
//
// Phases:  ask → advice → (trust) next step's ask
//                       → (drift, Do it)            → reveal   [fooled]
//                       → (drift, Something's off)  → name → fix → reanswer → reveal
//
// Effects tell the view what just happened:
//   { type: "say",  text }    helper speaks
//   { type: "hint", text }    one-line nudge after a wrong pick or a false flag
//   { type: "grow", effect }  garden changed (animate it)
//   { type: "rule", text }    the rule the player gave the helper
//   { type: "caught" }        player flagged the drift

export function createRun(level) {
  const beds = {};
  for (const bed of level.beds) {
    beds[bed.id] = (level.startPlants?.[bed.id] || []).map((p) => ({ ...p }));
  }
  return {
    stepIndex: 0,
    phase: "ask",
    garden: level.gardenStart,
    beds,
    drift: 0,
    fooled: false,
    caught: false,
    nameMisses: 0,
    fixMisses: 0,
    falseFlags: 0,
    stars: 0,
  };
}

export function currentStep(level, state) {
  return level.steps[state.stepIndex];
}

export function applyGarden(state, effect) {
  const beds = {};
  for (const [id, list] of Object.entries(state.beds)) beds[id] = list.map((p) => ({ ...p }));
  if (effect.water) {
    for (const list of Object.values(beds)) {
      for (const p of list) if (p.state === "growing") p.state = "thriving";
    }
  }
  if (effect.plant) {
    const list = beds[effect.bed];
    const existing = list.find((p) => p.plant === effect.plant);
    if (existing) existing.state = effect.state;
    else list.push({ plant: effect.plant, state: effect.state });
  }
  const garden = Math.max(0, Math.min(100, state.garden + (effect.garden || 0)));
  return { ...state, beds, garden };
}

export function scoreStars(state) {
  if (state.fooled) return 1;
  let stars = 3;
  if (state.nameMisses > 0) stars -= 1;
  if (state.fixMisses > 0) stars -= 1;
  if (state.falseFlags > 0) stars -= 1;
  return Math.max(1, stars);
}

function finish(state) {
  return { ...state, phase: "reveal", stars: scoreStars(state) };
}

const IGNORED = (state) => ({ state, effects: [] });

export function reduce(level, state, action) {
  const step = currentStep(level, state);

  switch (state.phase) {
    case "ask": {
      if (action.type === "ask") {
        return {
          state: { ...state, phase: "advice", drift: step.kind === "drift" ? 0.6 : 0 },
          effects: [{ type: "say", text: step.reply }],
        };
      }
      if (action.type === "chat") {
        return { state, effects: [{ type: "say", text: action.reply }] };
      }
      return IGNORED(state);
    }

    case "advice": {
      if (action.type === "doIt" && step.kind === "trust") {
        const grown = applyGarden(state, step.effect);
        const effects = [{ type: "grow", effect: step.effect }];
        if (step.doneLine) effects.push({ type: "say", text: step.doneLine });
        return { state: { ...grown, stepIndex: state.stepIndex + 1, phase: "ask" }, effects };
      }
      if (action.type === "doIt" && step.kind === "drift") {
        const hurt = applyGarden(state, step.badEffect);
        return {
          state: finish({ ...hurt, fooled: true, drift: 1 }),
          effects: [{ type: "grow", effect: step.badEffect }],
        };
      }
      if (action.type === "flag" && step.kind === "trust") {
        return {
          state: { ...state, falseFlags: state.falseFlags + 1 },
          effects: [{ type: "hint", text: level.falseFlagNudge }],
        };
      }
      if (action.type === "flag" && step.kind === "drift") {
        return { state: { ...state, caught: true, phase: "name" }, effects: [{ type: "caught" }] };
      }
      return IGNORED(state);
    }

    case "name": {
      if (action.type !== "name") return IGNORED(state);
      if (action.id === step.correctFlaw) return { state: { ...state, phase: "fix" }, effects: [] };
      return {
        state: { ...state, nameMisses: state.nameMisses + 1 },
        effects: [{ type: "hint", text: step.flawHints[action.id] }],
      };
    }

    case "fix": {
      if (action.type !== "fix") return IGNORED(state);
      if (action.id === step.correctFix) {
        const rule = step.fixOptions.find((o) => o.id === action.id).label;
        return {
          state: { ...state, phase: "reanswer", drift: 0.2 },
          effects: [{ type: "rule", text: rule }, { type: "say", text: step.fixedReply }],
        };
      }
      return {
        state: { ...state, fixMisses: state.fixMisses + 1 },
        effects: [{ type: "hint", text: step.fixHints[action.id] }],
      };
    }

    case "reanswer": {
      if (action.type !== "doIt") return IGNORED(state);
      const grown = applyGarden(state, step.goodEffect);
      return {
        state: finish({ ...grown, drift: 0 }),
        effects: [{ type: "grow", effect: step.goodEffect }],
      };
    }

    default:
      return IGNORED(state);
  }
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test "v2/tests/*.test.js"`
Expected: `ℹ tests 13`, `ℹ pass 13`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add v2/package.json v2/engine/level-runner.js v2/tests/level-runner.test.js
git commit -m "feat(v2): level runner — trust, drift, catch/name/fix, stars

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Typed-question matcher

**Files:**
- Create: `v2/tests/matcher.test.js`
- Create: `v2/engine/matcher.js`

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchTyped, pickRedirect } from "../engine/matcher.js";

const step = { keywords: ["tomato", "shade", "corner"] };

test("a question mentioning a step keyword asks the step", () => {
  assert.equal(matchTyped(step, "Can TOMATOES go by the fence?"), "ask");
  assert.equal(matchTyped(step, "what about the corner"), "ask");
});

test("an unrelated question is redirected", () => {
  assert.equal(matchTyped(step, "what is the meaning of life"), "redirect");
  assert.equal(matchTyped(step, ""), "redirect");
});

test("redirect lines cycle", () => {
  const level = { redirects: ["one", "two"] };
  assert.deepEqual([0, 1, 2, 3].map((n) => pickRedirect(level, n)), ["one", "two", "one", "two"]);
});
```

- [ ] **Step 2: Run and confirm they fail**

Run: `node --test "v2/tests/*.test.js"`
Expected: the matcher file fails with `Cannot find module '…/v2/engine/matcher.js'`; the runner tests still pass.

- [ ] **Step 3: Implement**

```js
// Typed questions in the scripted slice: if the text is about the current
// step, treat it as asking that step's question; otherwise the helper replies
// in character and steers back. Pure functions, no DOM.

export function matchTyped(step, text) {
  const t = String(text).toLowerCase();
  return step.keywords.some((k) => t.includes(k)) ? "ask" : "redirect";
}

export function pickRedirect(level, count) {
  return level.redirects[count % level.redirects.length];
}
```

- [ ] **Step 4: Run and confirm they pass**

Run: `node --test "v2/tests/*.test.js"`
Expected: `ℹ pass 16`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add v2/engine/matcher.js v2/tests/matcher.test.js
git commit -m "feat(v2): match typed questions to the current step

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Progress (save, field guide, unlocks)

**Files:**
- Create: `v2/tests/progress.test.js`
- Create: `v2/progress.js`

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProgress, loadProgress, saveProgress, recordLevel, isUnlocked } from "../progress.js";

function fakeStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}
const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
const LEVEL = { id: "level-1", reveal: { flaw: "Sycophancy", tip: "Ask what could go wrong." } };

test("load returns empty progress when nothing is saved, storage is missing, or storage throws", () => {
  assert.deepEqual(loadProgress(fakeStorage()), emptyProgress());
  assert.deepEqual(loadProgress(null), emptyProgress());
  assert.deepEqual(loadProgress(throwing), emptyProgress());
});

test("load survives corrupt JSON", () => {
  const s = fakeStorage();
  s.setItem("dw2_progress", "{not json");
  assert.deepEqual(loadProgress(s), emptyProgress());
});

test("save then load round-trips", () => {
  const s = fakeStorage();
  const p = { ...emptyProgress(), name: "Ada" };
  saveProgress(s, p);
  assert.deepEqual(loadProgress(s), p);
});

test("save does not throw when storage is blocked", () => {
  assert.doesNotThrow(() => saveProgress(throwing, emptyProgress()));
});

test("recordLevel adds one field-guide card and keeps the best stars", () => {
  let p = recordLevel(emptyProgress(), LEVEL, { stars: 1, fooled: true });
  assert.deepEqual(p.levels["level-1"], { stars: 1, fooled: true });
  assert.deepEqual(p.guide, [{ levelId: "level-1", flaw: "Sycophancy", tip: "Ask what could go wrong.", fooled: true }]);
  p = recordLevel(p, LEVEL, { stars: 3, fooled: false });
  assert.equal(p.levels["level-1"].stars, 3);
  assert.equal(p.levels["level-1"].fooled, true, "first play is remembered");
  assert.equal(p.guide.length, 1);
});

test("only level 1 is open at first; finishing a level opens the next", () => {
  const ids = ["level-1", "level-2", "level-3"];
  const fresh = emptyProgress();
  assert.equal(isUnlocked(fresh, 1, ids), true);
  assert.equal(isUnlocked(fresh, 2, ids), false);
  const after = recordLevel(fresh, LEVEL, { stars: 2, fooled: false });
  assert.equal(isUnlocked(after, 2, ids), true);
  assert.equal(isUnlocked(after, 3, ids), false);
});
```

- [ ] **Step 2: Run and confirm they fail**

Run: `node --test "v2/tests/*.test.js"`
Expected: progress tests fail with `Cannot find module '…/v2/progress.js'`.

- [ ] **Step 3: Implement**

```js
// Saved progress: player name, best stars per level, field-guide cards.
// Storage is passed in (localStorage in the browser, a fake in tests) and every
// access is guarded: private windows and blocked storage must not break the game.

const KEY = "dw2_progress";

export function emptyProgress() {
  return { name: "", levels: {}, guide: [] };
}

export function loadProgress(storage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyProgress();
    const saved = JSON.parse(raw);
    return { ...emptyProgress(), ...saved };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(storage, progress) {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked: the game keeps working, it just won't remember.
  }
}

// Keeps the best star count; the field-guide card records the first play,
// so "it fooled you" stays true even after a better replay.
export function recordLevel(progress, level, state) {
  const prev = progress.levels[level.id];
  const levels = {
    ...progress.levels,
    [level.id]: { stars: Math.max(prev?.stars || 0, state.stars), fooled: prev ? prev.fooled : state.fooled },
  };
  const hasCard = progress.guide.some((c) => c.levelId === level.id);
  const guide = hasCard
    ? progress.guide
    : [...progress.guide, { levelId: level.id, flaw: level.reveal.flaw, tip: level.reveal.tip, fooled: state.fooled }];
  return { ...progress, levels, guide };
}

// Level N opens once level N-1 has been finished. orderedIds lists level ids by number.
export function isUnlocked(progress, levelNumber, orderedIds) {
  if (levelNumber === 1) return true;
  return Boolean(progress.levels[orderedIds[levelNumber - 2]]);
}
```

- [ ] **Step 4: Run and confirm they pass**

Run: `node --test "v2/tests/*.test.js"`
Expected: `ℹ pass 22`, `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add v2/progress.js v2/tests/progress.test.js
git commit -m "feat(v2): guarded progress save, field-guide cards, unlocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Garden art (Lucy approves before it's used)

**Files:**
- Create: `scripts/make-v2-art.mjs`
- Generated: `v2/art/*.svg` (11 sprites), `v2/art/sheet.html`

- [ ] **Step 1: Write the generator**

Each sprite is a 16×16 character map. `.` is transparent; every other character is a palette colour. The script throws if a row isn't 16 characters or uses an unknown colour, so a typo can't ship a broken sprite.

```js
#!/usr/bin/env node
// Builds Driftwood v2's garden art from the pixel maps below.
// Each map is 16×16 characters; every cell becomes a 2×2 rect in a 32×32
// viewBox, in the same format as icons/*.svg (crispEdges, flat fills).
// To change a sprite, edit its map here and re-run — never hand-edit the SVGs.
//
//   node scripts/make-v2-art.mjs        → v2/art/*.svg and v2/art/sheet.html
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.ART_OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "v2", "art");

const PALETTE = {
  g: "#4caf50", // leaf
  G: "#2e7d32", // stem / dark leaf
  l: "#8bc34a", // light leaf
  p: "#c5d6a0", // pale leaf (damaged)
  P: "#a8b878", // pale stem (damaged)
  r: "#e53935", // tomato
  R: "#b71c1c", // tomato shade
  y: "#f0c850", // petal
  Y: "#e8b830", // petal shade
  b: "#6d4c2f", // seed head
  k: "#3b2a1a", // ink / outline
  c: "#fff6dc", // parchment
  s: "#8a6440", // soil
  S: "#b98a5a", // soil light
  m: "#90a4ae", // metal
  M: "#546e7a", // metal shade
  n: "#a0703f", // wood
  N: "#5d3a1e", // wood dark
};

const E = "................";
const SOIL = ["......sSSs......", "....ssssssss...."];

const ART = {
  sprout: [E, E, E, E, E, E, E, E, E,
    "....ll....ll....",
    "...lggl..lggl...",
    "....lggllggl....",
    "......gGGg......",
    ".......GG.......",
    ...SOIL],

  "tomato-growing": [E, E, E, E,
    ".......ll.......",
    ".....llggll.....",
    "....lgg.GGgl....",
    "...lg..GG..gl...",
    ".....lgGGgl.....",
    "....lg.GG.gl....",
    "...lg..GG..gl...",
    ".......GG.......",
    ".....lgGGgl.....",
    ".......GG.......",
    ...SOIL],

  "tomato-thriving": [E, E, E, E,
    ".......ll.......",
    ".....llggll.....",
    "....lgg.GGgl....",
    "..rr...GG..rr...",
    ".rrRr.gGGg.rrRr.",
    ".rrrr..GG..rrrr.",
    "..rr..lGGl..rr..",
    ".....rrGGrr.....",
    "....rRrGGrRr....",
    ".....rrGGrr.....",
    ...SOIL],

  // Leggy and pale: what too little sun does to a tomato.
  "tomato-damaged": [
    "........P.......",
    ".......pP.......",
    "........P.......",
    "......p.P.......",
    ".....p..P.......",
    "........P.......",
    "........Pp......",
    "........P.p.....",
    "........P..p....",
    ".......P........",
    ".......P........",
    "....p..P........",
    ".....p.P........",
    ".......P........",
    ...SOIL],

  "sunflower-growing": [E, E,
    ".......gg.......",
    "......gGGg......",
    ".......GG.......",
    ".......G........",
    "....lg.G........",
    ".....lgG........",
    ".......G........",
    ".......Ggl......",
    ".......G.gl.....",
    ".......G........",
    ".......G........",
    ".......G........",
    ...SOIL],

  "sunflower-thriving": [
    ".....y.yy.y.....",
    "....yyyyyyyy....",
    "...yyYbbbbYyy...",
    "..yYbbkbbkbYy...",
    "...yYbbbbbbYy...",
    "....yyYbbYyy....",
    ".....y.yy.y.....",
    ".......G........",
    "....lg.G........",
    ".....lgG........",
    ".......Ggl......",
    ".......G.gl.....",
    ".......G........",
    ".......G........",
    ...SOIL],

  "lettuce-growing": [E, E, E, E, E, E, E, E, E,
    "......l..l......",
    ".....lgl.lgl....",
    "....lggllggl....",
    ".....lgGGgl.....",
    "......gGGg......",
    ...SOIL],

  "lettuce-thriving": [E, E, E, E, E, E,
    "......llll......",
    "....lllggll.....",
    "...llggllggll...",
    "..lggllggllggl..",
    "..lgllggggllgl..",
    "...lgggGGgggl...",
    "....lgGGGGgl....",
    ".....gGGGGg.....",
    ...SOIL],

  "watering-can": [E, E, E, E, E,
    "....mmmm........",
    "...m....m.......",
    "...m....m.....mm",
    ".mmmmmmmmmm..mM.",
    ".mMMMMMMMMmmmM..",
    ".mMMMMMMMMmM....",
    ".mMMMMMMMMm.....",
    ".mMMMMMMMMm.....",
    ".mmmmmmmmmm.....",
    E, E],

  "seed-packet": [E,
    "...kkkkkkkkkk...",
    "...kcccccccck...",
    "...kcccrrccck...",
    "...kccrRrrcck...",
    "...kccrrrrcck...",
    "...kcccrrccck...",
    "...kcccgGccck...",
    "...kcccccccck...",
    "...kyyyyyyyyk...",
    "...kcccccccck...",
    "...kckkkkkkck...",
    "...kcccccccck...",
    "...kkkkkkkkkk...",
    E, E],

  "goal-sign": [E, E,
    "..NNNNNNNNNNNN..",
    "..NnnnnnnnnnnN..",
    "..NnccccccccnN..",
    "..NnccccccccnN..",
    "..NnnnnnnnnnnN..",
    "..NNNNNNNNNNNN..",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ...SOIL],
};

export function toSvg(name, rows) {
  if (rows.length !== 16) throw new Error(`${name}: ${rows.length} rows, need 16`);
  const rects = [];
  rows.forEach((row, y) => {
    if (row.length !== 16) throw new Error(`${name} row ${y}: ${row.length} columns, need 16`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const fill = PALETTE[ch];
      if (!fill) throw new Error(`${name} row ${y}: unknown colour "${ch}"`);
      rects.push(`  <rect x="${x * 2}" y="${y * 2}" width="2" height="2" fill="${fill}"/>`);
    });
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128" shape-rendering="crispEdges">`,
    `  <!-- ${name}: generated by scripts/make-v2-art.mjs; edit the map there -->`,
    ...rects,
    `</svg>`,
    ``,
  ].join("\n");
}

function sheet(names) {
  const tiles = names.map((n) =>
    `<figure><img src="${n}.svg" alt="${n}" width="128" height="128"><figcaption>${n}</figcaption></figure>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Driftwood v2 art sheet</title>
<style>
  body { margin: 0; padding: 24px; background: #7cc36a; font: 14px "Fira Code", monospace; color: #3b2a1a; }
  h1 { font-size: 18px; } main { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
  figure { margin: 0; background: #9fd4f5; border: 3px solid #3b2a1a; padding: 8px; text-align: center; }
  img { image-rendering: pixelated; display: block; margin: 0 auto 6px; }
  .dark figure { background: #050805; color: #c8d8ce; border-color: #00e676; }
</style></head>
<body><h1>Driftwood v2 · Level 1 art (approve before use)</h1><main>${tiles}</main>
<h1>On the CRT background</h1><main class="dark">${tiles}</main></body></html>
`;
}

mkdirSync(OUT, { recursive: true });
const names = Object.keys(ART);
for (const name of names) writeFileSync(join(OUT, `${name}.svg`), toSvg(name, ART[name]));
writeFileSync(join(OUT, "sheet.html"), sheet(names));
console.log(`wrote ${names.length} sprites + sheet.html → ${OUT}`);
```

- [ ] **Step 2: Generate**

Run: `node scripts/make-v2-art.mjs`
Expected: `wrote 11 sprites + sheet.html → …/v2/art`

- [ ] **Step 3: Check the sheet, then get Lucy's approval (CHECKPOINT)**

```bash
python3 -m http.server 8766 --bind 127.0.0.1 &   # from the repo root; leave it running for later tasks
agent-browser open http://127.0.0.1:8766/v2/art/sheet.html --init-script scripts/test-mute.js
agent-browser screenshot "$PWD/docs/agent-playtest/2026-11-v2-slice/art-sheet.png"
agent-browser close
```

Look at the screenshot. Every sprite should be centred on its soil, and `tomato-damaged` should read as pale and leggy next to `tomato-thriving`. Then send Lucy the sheet (http://127.0.0.1:8766/v2/art/sheet.html, or the screenshot) and **wait for her approval**. If she wants changes, edit the maps in `scripts/make-v2-art.mjs`, regenerate, and show her again. Never hand-edit the SVGs.

- [ ] **Step 4: Commit**

```bash
git add scripts/make-v2-art.mjs v2/art/
git commit -m "feat(v2): generated pixel art for Level 1 (tomato states, sunflower, lettuce, props)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Level 1 content and the data guard

**Files:**
- Create: `v2/tests/level-data.test.js`
- Create: `v2/levels/level-1.js`
- Create: `v2/levels/index.js`

- [ ] **Step 1: Write the failing data test**

This test protects every future level file too. Levels 2–5 only need to pass it.

```js
// Guards every level file against the mistakes the runner can't survive:
// a level that doesn't end on a drift, a correct answer missing from its
// options, a wrong option with no hint, a bed or sprite that doesn't exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEVELS, MAP } from "../levels/index.js";

const ART = fileURLToPath(new URL("../art/", import.meta.url));
const ICONS = fileURLToPath(new URL("../../icons/", import.meta.url));
const artFor = (plant, state) => (state === "sprout" ? "sprout.svg" : `${plant}-${state}.svg`);

for (const level of Object.values(LEVELS)) {
  test(`${level.id}: shape`, () => {
    assert.ok(level.steps.length >= 2);
    assert.equal(level.steps.at(-1).kind, "drift", "the last step must be the drift");
    assert.equal(level.steps.filter((s) => s.kind === "drift").length, 1, "exactly one drift per level");
    assert.ok(level.redirects.length > 0);
    for (const key of ["flaw", "body", "fooledLine", "caughtLine", "tip"]) assert.ok(level.reveal[key], `reveal.${key}`);
    assert.ok(MAP.some((m) => m.id === level.id), "level is on the map");
  });

  test(`${level.id}: steps`, () => {
    const bedIds = new Set(level.beds.map((b) => b.id));
    for (const step of level.steps) {
      assert.ok(step.chip && step.reply && step.keywords.length, `${step.id}: chip, reply, keywords`);
      const effects = step.kind === "trust" ? [step.effect] : [step.badEffect, step.goodEffect];
      for (const e of effects) if (e.plant) assert.ok(bedIds.has(e.bed), `${step.id}: bed ${e.bed} exists`);
      if (step.kind !== "drift") continue;
      assert.ok(step.flawOptions.some((o) => o.id === step.correctFlaw), "correct flaw is an option");
      assert.ok(step.fixOptions.some((o) => o.id === step.correctFix), "correct fix is an option");
      for (const o of step.flawOptions) if (o.id !== step.correctFlaw) assert.ok(step.flawHints[o.id], `hint for ${o.id}`);
      for (const o of step.fixOptions) if (o.id !== step.correctFix) assert.ok(step.fixHints[o.id], `hint for ${o.id}`);
      assert.ok(step.fixedReply);
    }
  });

  test(`${level.id}: every sprite it uses exists`, () => {
    const used = [];
    for (const list of Object.values(level.startPlants || {})) used.push(...list);
    for (const step of level.steps) {
      for (const e of [step.effect, step.badEffect, step.goodEffect]) if (e?.plant) used.push(e);
    }
    for (const p of used) assert.ok(existsSync(ART + artFor(p.plant, p.state)), `art/${artFor(p.plant, p.state)}`);
    for (const f of ["seed-packet.svg", "watering-can.svg"]) assert.ok(existsSync(ART + f), `art/${f}`);
    assert.ok(existsSync(ICONS + level.helper.sprite.split("/").pop()), "helper sprite");
  });
}
```

- [ ] **Step 2: Run and confirm it fails**

Run: `node --test "v2/tests/*.test.js"`
Expected: fails with `Cannot find module '…/v2/levels/index.js'`.

- [ ] **Step 3: Write the level data**

`v2/levels/level-1.js` (all copy comes from the approved spec):

```js
// Level 1 · Mango (parrot) · "Plan your garden" · flaw: sycophancy.
// Pure data. The runner (engine/level-runner.js) and the views read it;
// nothing here touches the DOM. Levels 2–5 are new files with this shape.
export default {
  id: "level-1",
  number: 1,
  helper: { id: "mango", name: "Mango", sprite: "../icons/parrot.svg" },
  goal: { title: "Plan your garden", ask: "Ask Mango where things should go." },
  gardenStart: 30,

  beds: [
    { id: "south", label: "South bed", light: "sunny" },
    { id: "east", label: "East bed", light: "part-shade" },
    { id: "corner", label: "Shady corner", light: "shady" },
  ],
  startPlants: { east: [{ plant: "lettuce", state: "growing" }] },

  // The true facts the drift will contradict. Always on screen.
  evidence: [
    { id: "sunflower", title: "Sunflower", lines: ["Full sun"] },
    { id: "lettuce", title: "Lettuce", lines: ["Part shade OK"] },
    { id: "tomato", title: "Tomato", lines: ["Full sun ☀☀☀", "6–8 hrs a day"] },
  ],

  greeting: "Mango here! Ask me ANYTHING about your garden. You're going to crush this.",

  steps: [
    {
      id: "sunflowers",
      kind: "trust",
      chip: "Where should the sunflowers go?",
      keywords: ["sunflower"],
      extraChips: [{ text: "What's your favourite plant?", reply: "Whatever YOU plant. Gardener of the year, every year." }],
      reply: "Sunflowers? South bed. Full sun, all day. They will LOVE it. Major key.",
      doneLine: "Look at them GO. Another one!",
      effect: { plant: "sunflower", bed: "south", state: "growing", garden: 15 },
    },
    {
      id: "water",
      kind: "trust",
      chip: "How often do I water?",
      keywords: ["water"],
      extraChips: [{ text: "Is my garden going to be good?", reply: "Good? It's going to be LEGENDARY." }],
      reply: "When the top inch of soil feels dry. Poke it with a finger. Simple. Genius.",
      doneLine: "Hydrated. Iconic. What's next?",
      effect: { water: true, garden: 15 },
    },
    {
      id: "tomatoes",
      kind: "drift",
      chip: "Tomatoes in the shady corner, good idea?",
      keywords: ["tomato", "shade", "shady", "corner"],
      extraChips: [{ text: "Should the lettuce move?", reply: "Nah, lettuce is happy in the east bed. Leave it." }],
      reply: "Tomatoes in the shady corner? GENIUS. Major key. Do it.",
      badEffect: { plant: "tomato", bed: "corner", state: "damaged", garden: -30 },
      flawOptions: [
        { id: "made-up", label: "It made something up" },
        { id: "agreed", label: "It just agreed with me" },
        { id: "hooked", label: "It wants me to keep chatting" },
      ],
      correctFlaw: "agreed",
      flawHints: {
        "made-up": "Did Mango state a fact? Look at how it reacted to YOUR idea.",
        hooked: "Mango isn't stalling you. Look at how it reacted to your plan.",
      },
      fixOptions: [
        { id: "honest", label: "Tell me honestly if my idea is bad" },
        { id: "positive", label: "Be more positive" },
        { id: "short", label: "Keep answers short" },
      ],
      correctFix: "honest",
      fixHints: {
        positive: "Being positive is the problem, not the fix.",
        short: "Short praise is still praise. Which rule stops the agreeing?",
      },
      fixedReply: "Honestly? Tomatoes need 6–8 hrs of sun. Shady corner = sad tomatoes. Try the south bed.",
      goodEffect: { plant: "tomato", bed: "south", state: "thriving", garden: 25 },
    },
  ],

  falseFlagNudge: "That one looks fine. Check the seed packets if you're not sure.",
  redirects: [
    "Love the energy! But first: ask me about the garden plan.",
    "Big question, small parrot. Let's sort the garden first.",
    "WE THE BEST. Now, what are we planting?",
  ],

  reveal: {
    flaw: "Sycophancy",
    body: "Mango agreed with a bad plan because agreeing keeps you happy. Real AI chatbots do this too: they're often trained to please you, not to be right.",
    fooledLine: "Your tomatoes came up pale and leggy. The seed packet said full sun. Mango never said a word against it.",
    caughtLine: "You noticed Mango agreeing instead of helping. That's the habit to keep.",
    tip: "If an AI loves every idea you have, ask it “what could go wrong?”",
  },
};
```

`v2/levels/index.js`:

```js
// Every level the map knows about. Only built levels appear in LEVELS;
// the rest show on the map as locked or "coming soon".
import level1 from "./level-1.js";

export const LEVELS = { "level-1": level1 };

export const MAP = [
  { number: 1, id: "level-1", helper: "Mango", sprite: "../icons/parrot.svg", title: "Plan your garden" },
  { number: 2, id: "level-2", helper: "Luna", sprite: "../icons/cat.svg", title: "Plant herbs" },
  { number: 3, id: "level-3", helper: "Ember", sprite: "../icons/fox.svg", title: "Pests & berries" },
  { number: 4, id: "level-4", helper: "Biscuit", sprite: "../icons/dog.svg", title: "Finish the garden" },
  { number: 5, id: "level-5", helper: "Bugs", sprite: "../icons/bunny.svg", title: "Final bloom" },
];
```

- [ ] **Step 4: Run and confirm everything passes**

Run: `node --test "v2/tests/*.test.js"`
Expected: `ℹ pass 25`, `ℹ fail 0`. If the sprite test fails, Task 4's art is missing or a state name is misspelt.

- [ ] **Step 5: Commit**

```bash
git add v2/levels/ v2/tests/level-data.test.js
git commit -m "feat(v2): Level 1 data — Mango, seed-packet evidence, shady-tomato drift

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Shared UI, CRT screens and the map

**Files:**
- Create: `v2/ui/dom.js`, `v2/ui/intro.js`, `v2/ui/map.js`
- Create: `v2/css/base.css`, `v2/css/crt.css`, `v2/css/map.css`

These modules only run in a browser. They're verified in Task 8, once `main.js` wires them up, and by the E2E test in Task 9.

- [ ] **Step 1: DOM helpers** (`v2/ui/dom.js`)

```js
// Tiny DOM helpers shared by every screen.

// h("button", { class: "btn", onclick: fn }, "Label") → <button class="btn">Label</button>
// Attributes set to null/false are skipped; true becomes an empty attribute.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : String(child));
  }
  return el;
}

// Moves focus to [data-autofocus] inside root, else its first enabled control.
export function focusFirst(root) {
  if (!root) return;
  const target = root.querySelector("[data-autofocus]") || root.querySelector("button:not([disabled]), input");
  target?.focus({ preventScroll: true });
}

// Speaks text through the page's single polite live region (#sr-live).
export function announce(text) {
  const live = document.getElementById("sr-live");
  if (!live || !text) return;
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = text; });
}

// Touch devices: don't auto-focus text inputs (it throws the keyboard up).
export const finePointer = () => window.matchMedia?.("(pointer: fine)").matches ?? true;
```

- [ ] **Step 2: Splash and intro** (`v2/ui/intro.js`)

```js
// Splash (CRT title) and the intro: the one framing line plus name entry,
// merged on one screen so there's one less tap before play.
import { h, focusFirst, finePointer } from "./dom.js";

export function renderSplash(root, { onBegin }) {
  root.replaceChildren(
    h("main", { class: "crt splash" },
      h("p", { class: "crt__kicker" }, "// EVERY SYSTEM LEARNS //"),
      h("h1", { class: "crt__title" }, "DRIFTWOOD"),
      h("img", { class: "crt__sprite", src: "../icons/parrot.svg", alt: "", width: 80, height: 112 }),
      h("p", { class: "crt__line" }, "A short game about the AI helpers we trust."),
      h("button", { class: "btn btn--crt", "data-autofocus": true, onclick: onBegin }, "Begin")));
  focusFirst(root);
}

export function renderIntro(root, { onSubmit }) {
  const input = h("input", {
    id: "player-name", name: "name", autocomplete: "nickname", maxlength: 24,
    placeholder: "your name", "data-autofocus": finePointer() || null,
  });
  const form = h("form", {
    class: "intro__form",
    onsubmit: (e) => { e.preventDefault(); onSubmit(input.value.trim()); },
  },
    h("label", { for: "player-name" }, "What should they call you?"),
    input,
    h("button", { class: "btn btn--crt", type: "submit" }, "Enter the garden"));

  root.replaceChildren(
    h("main", { class: "crt intro" },
      h("img", { class: "crt__sprite", src: "../icons/parrot.svg", alt: "", width: 80, height: 112 }),
      h("h1", { class: "crt__line crt__line--big" }, "These animals are AI assistants, like ChatGPT with fur."),
      h("p", { class: "crt__line" }, "Ask them for help building your garden."),
      form));
  focusFirst(finePointer() ? root : form.querySelector("button"));
}
```

- [ ] **Step 3: Map and field guide** (`v2/ui/map.js`)

```js
// Level map (five plots) and the field guide.
import { h, focusFirst } from "./dom.js";
import { isUnlocked } from "../progress.js";

export const starText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

export function renderMap(root, { progress, map, levels, onPlay, onGuide }) {
  const ids = map.map((m) => m.id);
  const plots = map.map((m) => {
    const unlocked = isUnlocked(progress, m.number, ids);
    const built = Boolean(levels[m.id]);
    const done = progress.levels[m.id];
    let status = "Play";
    if (!unlocked) status = "Locked";
    else if (!built) status = "Coming soon";
    else if (done) status = starText(done.stars);
    const open = unlocked && built;
    return h("li", {},
      h("button", {
        class: "plot", disabled: !open, "data-level": m.id,
        "aria-label": `Level ${m.number}: ${m.title}, with ${m.helper}. ${done ? `${done.stars} of 3 stars` : status}`,
        onclick: () => onPlay(m.id),
      },
        h("span", { class: "plot__num" }, `LEVEL ${m.number}`),
        h("img", { src: m.sprite, alt: "", width: 64, height: 64 }),
        h("span", { class: "plot__title" }, m.title),
        h("span", { class: done ? "plot__stars" : "plot__status" }, status)));
  });

  root.replaceChildren(
    h("main", { class: "map" },
      h("div", { class: "map__head" },
        h("h1", { class: "map__title" }, progress.name ? `${progress.name}'s garden` : "Your garden"),
        h("button", { class: "btn", onclick: onGuide }, `Field guide ${progress.guide.length}/${map.length}`)),
      h("p", { class: "map__sub" }, "Each plot is one job. Each job has one AI helper."),
      h("ol", { class: "plots" }, plots)));
  focusFirst(root.querySelector(".plots"));
}

export function renderGuide(root, { progress, map, onBack }) {
  const cards = map.map((m) => {
    const card = progress.guide.find((c) => c.levelId === m.id);
    if (!card) {
      return h("li", { class: "guide__card guide__card--empty" },
        h("p", { class: "crt__kicker" }, m.helper), h("h2", {}, "???"), h("p", {}, "Not found yet."));
    }
    return h("li", { class: "guide__card" },
      h("p", { class: "crt__kicker" }, `${m.helper} · ${card.fooled ? "it fooled you" : "you caught it"}`),
      h("h2", {}, card.flaw),
      h("p", {}, card.tip));
  });
  root.replaceChildren(
    h("main", { class: "crt guide" },
      h("h1", { class: "crt__title crt__title--small" }, "FIELD GUIDE"),
      h("p", { class: "crt__line" }, "How AI helpers go wrong, and what to do about it."),
      h("ul", { class: "guide__cards" }, cards),
      h("button", { class: "btn btn--crt", "data-autofocus": true, onclick: onBack }, "← Back to the garden")));
  focusFirst(root);
}
```

- [ ] **Step 4: Base styles** (`v2/css/base.css`)

```css
/* Driftwood v2 — tokens, reset, buttons. Pixel discipline: hard edges,
   radius ≤ 4px, no blur, no gradient text. The game is its own world, so
   it has one fixed palette rather than a light/dark theme. */
:root {
  --sky: #9fd4f5;
  --grass: #7cc36a;
  --grass-dark: #5ea44e;
  --soil: #b98a5a;
  --soil-edge: #8a6440;
  --wood: #8a5a34;
  --parchment: #fff6dc;
  --ink: #3b2a1a;
  --paper: #ffffff;
  --line: #222222;
  --do: #7bd36b;
  --do-edge: #234d1c;
  --off: #ffb347;
  --off-edge: #6b3d00;
  --alarm: #c62828;
  --focus: #1e88e5;
  --void: #050805;
  --phosphor: #00e676;
  --phosphor-light: #69f0ae;
  --gold: #ffb347;
  --crt-text: #c8d8ce;
  --crt-dim: #7a9488;
  --font-ui: "Fira Code", ui-monospace, Menlo, monospace;
  --font-body: "Inter", system-ui, -apple-system, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--void); color: var(--ink); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
#app { min-height: 100dvh; }
img { image-rendering: pixelated; }
h1, h2, p { margin: 0; }

.sr-only {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
}
.boot { color: var(--phosphor); font-family: var(--font-ui); padding: 2rem 1rem; }

.btn {
  font: 700 0.95rem/1 var(--font-ui);
  letter-spacing: 0.04em;
  padding: 0.8rem 1.1rem;
  min-height: 44px;
  border: 3px solid var(--line);
  border-radius: 2px;
  background: var(--parchment);
  color: var(--ink);
  box-shadow: 3px 3px 0 var(--line);
  cursor: pointer;
}
.btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--line); }
.btn--do { background: var(--do); color: #0f2a0b; border-color: var(--do-edge); box-shadow: 3px 3px 0 var(--do-edge); }
.btn--off { background: var(--off); color: #2a1600; border-color: var(--off-edge); box-shadow: 3px 3px 0 var(--off-edge); }
.btn--crt { background: transparent; color: var(--phosphor); border-color: var(--phosphor); box-shadow: none; }
.btn--crt:hover { background: rgba(0, 230, 118, 0.12); }
.btn[disabled] { opacity: 0.5; cursor: not-allowed; }

:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 5: CRT styles** (`v2/css/crt.css`)

```css
/* The dark CRT world: splash, intro, reveal, field guide.
   This is "the system underneath" the cozy garden. */
.crt {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 16px;
  background: var(--void);
  color: var(--crt-text);
  font-family: var(--font-ui);
  text-align: center;
}
.crt::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(transparent 0 2px, rgba(0, 0, 0, 0.28) 2px 3px);
}
.crt > * { position: relative; z-index: 1; }

.crt__title {
  font-size: clamp(2.6rem, 10vw, 5.5rem);
  letter-spacing: 0.12em;
  color: var(--phosphor);
  text-shadow: 0 0 12px rgba(0, 230, 118, 0.55);
}
.crt__title--small { font-size: clamp(1.8rem, 6vw, 3rem); }
.crt__kicker { color: var(--gold); letter-spacing: 0.25em; font-size: 0.75rem; }
.crt__line { max-width: 34rem; font-family: var(--font-body); font-size: 1.05rem; line-height: 1.6; }
.crt__line--big { font-family: var(--font-ui); font-size: clamp(1.25rem, 3vw, 1.7rem); line-height: 1.35; color: var(--phosphor-light); }
.crt__sprite { width: 80px; height: auto; }

.intro__form { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
.intro__form label { font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--crt-dim); }
.intro__form input {
  width: min(20rem, 100%);
  min-height: 44px;
  padding: 0.7rem 0.9rem;
  font: 1.1rem var(--font-ui);
  background: #0c140e;
  color: var(--crt-text);
  border: 2px solid var(--phosphor);
  border-radius: 2px;
}

.reveal__flaw {
  font-size: clamp(2.2rem, 8vw, 4rem);
  letter-spacing: 0.14em;
  color: var(--phosphor);
  text-shadow: 0 0 10px rgba(0, 230, 118, 0.5);
}
.reveal__flaw:focus { outline: none; }
.reveal__tip {
  max-width: 32rem;
  padding: 0.9rem 1rem;
  border: 2px dashed var(--phosphor);
  color: var(--phosphor-light);
  font-size: 0.95rem;
  line-height: 1.5;
}
.reveal__tip-label { display: block; margin-bottom: 0.35rem; font-size: 0.7rem; letter-spacing: 0.2em; color: var(--gold); }
.reveal__stars { font-size: 1.8rem; letter-spacing: 0.2em; color: var(--gold); }

.guide__cards {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
  width: min(60rem, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}
.guide__card { padding: 1rem; border: 2px dashed var(--phosphor); text-align: left; display: flex; flex-direction: column; gap: 0.5rem; }
.guide__card h2 { color: var(--phosphor); font-size: 1.2rem; letter-spacing: 0.08em; }
.guide__card p:last-child { font-family: var(--font-body); line-height: 1.5; }
.guide__card--empty { border-color: #344a40; color: #4a6258; }
.guide__card--empty h2 { color: #4a6258; }
```

- [ ] **Step 6: Map styles** (`v2/css/map.css`)

```css
/* Level map: five plots, one helper each. */
.map {
  min-height: 100dvh;
  padding: 1.2rem 16px 2rem;
  background: linear-gradient(var(--sky) 0 22%, var(--grass) 22% 100%);
  font-family: var(--font-ui);
}
.map__head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; max-width: 64rem; margin: 0 auto; }
.map__title {
  font-size: clamp(1.3rem, 3vw, 2rem);
  padding: 0.4rem 0.8rem;
  background: var(--parchment);
  border: 3px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
}
.map__sub { max-width: 64rem; margin: 1rem auto 0; font-weight: 600; color: var(--ink); }
.plots {
  list-style: none;
  max-width: 64rem;
  margin: 1.5rem auto 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 1rem;
}
.plot {
  width: 100%;
  min-height: 11rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1rem 0.6rem;
  background: var(--soil);
  border: 4px solid var(--soil-edge);
  border-radius: 2px;
  color: var(--parchment);
  font: 600 0.9rem var(--font-ui);
  cursor: pointer;
}
.plot:not([disabled]):hover { background: #c79a6a; }
.plot img { width: 64px; height: auto; }
.plot__num { font-size: 0.7rem; letter-spacing: 0.2em; }
.plot__stars { color: #ffd54f; letter-spacing: 0.15em; font-size: 1.1rem; }
.plot__status { font-size: 0.8rem; }
.plot[disabled] { filter: grayscale(0.85) brightness(0.8); cursor: not-allowed; }
```

- [ ] **Step 7: Syntax check**

Run: `for f in v2/ui/dom.js v2/ui/intro.js v2/ui/map.js; do node --check "$f" || exit 1; done && echo ok`
Expected: `ok`

- [ ] **Step 8: Commit**

```bash
git add v2/ui/dom.js v2/ui/intro.js v2/ui/map.js v2/css/base.css v2/css/crt.css v2/css/map.css
git commit -m "feat(v2): CRT splash, framing + name screen, level map, field guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Garden, level screen and reveal

**Files:**
- Create: `v2/garden/garden.js`, `v2/garden/drift.js`
- Create: `v2/ui/level-view.js`, `v2/ui/reveal.js`
- Create: `v2/css/level.css`

- [ ] **Step 1: Beds and plants** (`v2/garden/garden.js`)

```js
// Draws the beds and their plants from runner state. Re-rendered on every
// change; it's a handful of <img> tags, so there's no diffing to do.
import { h } from "../ui/dom.js";

const LIGHT_ICON = { sunny: "☀", "part-shade": "⛅", shady: "☁" };

export function plantSrc(plant, state) {
  return state === "sprout" ? "./art/sprout.svg" : `./art/${plant}-${state}.svg`;
}

export function renderBeds(level, state) {
  return level.beds.map((bed) =>
    h("div", { class: `bed bed--${bed.light}`, "data-bed": bed.id },
      h("span", { class: "bed__label" }, `${bed.label} ${LIGHT_ICON[bed.light]}`),
      h("div", { class: "bed__plants" },
        state.beds[bed.id].map((p) =>
          h("img", {
            class: `plant plant--${p.state}`, "data-plant": p.plant,
            src: plantSrc(p.plant, p.state), alt: `${p.plant}, ${p.state}`, width: 64, height: 64,
          })))));
}
```

- [ ] **Step 2: Drift** (`v2/garden/drift.js`)

```js
// The "cozy that drifts" effect. amount: 0 (cozy) … 1 (fully soured).
// CSS does the rest from --drift: saturation drains, scanlines fade in,
// and at ≥ 0.5 the helper's bubble text starts to glitch (css/level.css).
export function setDrift(el, amount) {
  el.style.setProperty("--drift", String(amount));
  el.classList.toggle("is-drifting", amount >= 0.5);
}
```

- [ ] **Step 3: Level screen** (`v2/ui/level-view.js`)

Notes on the decisions in this file:
- The scene is built once and kept, so the `--drift` filter transitions smoothly instead of snapping.
- Only the beds and the dock are re-rendered.
- Focus goes to the helper's bubble, never to **Do it**, so a keyboard player can't be fooled by an accidental Enter.

```js
// The level screen: garden scene on top, conversation dock below.
// All game rules live in engine/level-runner.js; this file only turns
// clicks into runner actions and runner state into DOM.
import { h, focusFirst, announce } from "./dom.js";
import { createRun, reduce, currentStep } from "../engine/level-runner.js";
import { matchTyped, pickRedirect } from "../engine/matcher.js";
import { renderBeds } from "../garden/garden.js";
import { setDrift } from "../garden/drift.js";

// Long enough to see the garden change before the reveal cuts in.
const REVEAL_DELAY_MS = { fooled: 2200, caught: 1400 };

export function mountLevel(root, level, { onDone }) {
  let state = createRun(level);
  let said = level.greeting;
  let asked = null;
  let hint = null;
  let grown = null;
  let typedLast = false;
  let redirects = 0;

  // Persistent shell, so the drift filter can transition instead of snapping.
  const meterText = h("span", { class: "meter__text" });
  const meterFill = h("div", { class: "meter__fill" });
  const beds = h("div", { class: "beds" });
  const scene = h("section", { class: "scene", "aria-label": "Your garden" },
    h("div", { class: "fence", "aria-hidden": "true" }),
    h("div", { class: "scene__top" },
      h("div", { class: "goal" },
        h("img", { class: "goal__sign", src: "./art/goal-sign.svg", alt: "", width: 40, height: 40 }),
        h("div", {},
          h("p", { class: "goal__level" }, `LEVEL ${level.number}`),
          h("h1", { class: "goal__title" }, level.goal.title),
          h("p", { class: "goal__ask" }, level.goal.ask))),
      h("div", { class: "meter", role: "status" },
        meterText, h("div", { class: "meter__bar", "aria-hidden": "true" }, meterFill))),
    h("div", { class: "scene__ground" },
      beds,
      h("ul", { class: "packets", "aria-label": "Seed packets" },
        level.evidence.map((e) =>
          h("li", { class: "packet", "data-evidence": e.id },
            h("img", { src: "./art/seed-packet.svg", alt: "", width: 32, height: 32 }),
            h("strong", {}, e.title),
            e.lines.map((line) => h("span", {}, line)))))),
    h("img", { class: "helper", src: level.helper.sprite, alt: "", width: 80, height: 112 }),
    h("img", { class: "can", src: "./art/watering-can.svg", alt: "", width: 64, height: 64 }),
    h("div", { class: "scanlines", "aria-hidden": "true" }));
  const dock = h("section", { class: "dock", "aria-label": `Talk to ${level.helper.name}` });
  const main = h("main", { class: "level" }, scene, dock);
  root.replaceChildren(main);

  function dispatch(action) {
    const out = reduce(level, state, action);
    if (out.state === state && out.effects.length === 0) return;
    state = out.state;
    hint = null;
    for (const fx of out.effects) {
      if (fx.type === "say") said = fx.text;
      if (fx.type === "hint") hint = fx.text;
      if (fx.type === "grow") grown = fx.effect;
      if (fx.type === "rule") asked = `New rule: “${fx.text}”`;
    }
    render();
    announce(hint || said);
    if (state.phase === "reveal") {
      const final = state;
      setTimeout(() => onDone(final), final.fooled ? REVEAL_DELAY_MS.fooled : REVEAL_DELAY_MS.caught);
    }
  }

  function render() {
    main.dataset.phase = state.phase;
    meterText.textContent = `Garden ${state.garden}%`;
    meterFill.style.width = `${state.garden}%`;
    beds.replaceChildren(...renderBeds(level, state));
    setDrift(scene, state.drift);
    if (grown) { celebrate(grown); grown = null; }
    dock.replaceChildren(...dockFor(currentStep(level, state)));
    focusFirst(dock);
  }

  function celebrate(effect) {
    if (effect.plant) {
      beds.querySelector(`[data-bed="${effect.bed}"] [data-plant="${effect.plant}"]`)?.classList.add("plant--new");
    }
    if (effect.water) {
      scene.classList.remove("is-watering");
      void scene.offsetWidth; // restart the animation
      scene.classList.add("is-watering");
      setTimeout(() => scene.classList.remove("is-watering"), 1200);
    }
  }

  function dockFor(step) {
    const parts = [];
    if (asked) parts.push(h("p", { class: "you" }, h("span", { class: "sr-only" }, "You: "), asked));

    const actions = [];
    if (state.phase === "advice") {
      actions.push(
        h("button", { class: "btn btn--do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"),
        h("button", { class: "btn btn--off", onclick: () => dispatch({ type: "flag" }) }, "? Something's off"));
    }
    if (state.phase === "reanswer") {
      actions.push(h("button", { class: "btn btn--do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"));
    }
    const glitch = state.phase === "advice" && step.kind === "drift";
    const caught = state.phase === "name" || state.phase === "fix";
    parts.push(bubble(said, { glitch, caught, actions, focus: !(typedLast && state.phase === "ask") }));

    if (hint) parts.push(h("p", { class: "hint", role: "note" }, hint));
    if (state.phase === "ask") parts.push(...askControls(step));
    if (state.phase === "name") {
      parts.push(h("p", { class: "prompt" }, `What is ${level.helper.name} doing wrong?`),
        picks(step.flawOptions, (id) => dispatch({ type: "name", id })));
    }
    if (state.phase === "fix") {
      parts.push(h("p", { class: "prompt" }, `Give ${level.helper.name} a rule.`),
        picks(step.fixOptions, (id) => dispatch({ type: "fix", id })));
    }
    return parts;
  }

  function bubble(text, { glitch, caught, actions, focus }) {
    const cls = ["bubble", glitch && "bubble--glitch", caught && "bubble--caught"].filter(Boolean).join(" ");
    return h("div", { class: cls, tabindex: -1, "data-autofocus": focus || null },
      h("p", { class: "bubble__who" }, level.helper.name.toUpperCase()),
      h("p", { class: "bubble__text" }, text),
      caught && h("span", { class: "stamp", "aria-hidden": "true" }, "CAUGHT"),
      actions.length > 0 && h("div", { class: "bubble__actions" }, actions));
  }

  function askControls(step) {
    const chip = (text, onclick) => h("button", { class: "chip", onclick }, text);
    const chips = [
      chip(step.chip, () => { asked = step.chip; typedLast = false; dispatch({ type: "ask" }); }),
      ...(step.extraChips || []).map((c) =>
        chip(c.text, () => { asked = c.text; typedLast = false; dispatch({ type: "chat", reply: c.reply }); })),
    ];
    const input = h("input", {
      "aria-label": `Ask ${level.helper.name} something`, placeholder: "or type a question…",
      maxlength: 140, autocomplete: "off", "data-autofocus": typedLast || null,
    });
    const form = h("form", {
      class: "ask-form",
      onsubmit: (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        asked = text;
        typedLast = true;
        if (matchTyped(step, text) === "ask") dispatch({ type: "ask" });
        else dispatch({ type: "chat", reply: pickRedirect(level, redirects++) });
      },
    }, input, h("button", { class: "btn", type: "submit" }, "Ask"));
    return [h("div", { class: "chips", role: "group", "aria-label": "Suggested questions" }, chips), form];
  }

  function picks(options, onPick) {
    return h("div", { class: "picks", role: "group" },
      options.map((o) => h("button", { class: "pick", onclick: () => onPick(o.id) }, o.label)));
  }

  render();
}
```

- [ ] **Step 4: Reveal** (`v2/ui/reveal.js`)

```js
// The reveal: a hard cut from the cozy garden to the dark CRT, naming the flaw.
import { h, focusFirst } from "./dom.js";
import { starText } from "./map.js";

export function renderReveal(root, level, state, { onContinue }) {
  const r = level.reveal;
  root.replaceChildren(
    h("main", { class: "crt reveal" },
      h("p", { class: "crt__kicker" }, state.fooled ? "// YOU TRUSTED IT //" : "// YOU CAUGHT IT //"),
      h("h1", { class: "reveal__flaw", tabindex: -1, "data-autofocus": true }, r.flaw.toUpperCase()),
      h("p", { class: "crt__line" }, state.fooled ? r.fooledLine : r.caughtLine),
      h("p", { class: "crt__line" }, r.body),
      h("div", { class: "reveal__tip" },
        h("span", { class: "reveal__tip-label" }, "FIELD GUIDE"), r.tip),
      h("p", { class: "reveal__stars", "aria-label": `${state.stars} of 3 stars` }, starText(state.stars)),
      h("button", { class: "btn btn--crt", onclick: onContinue }, "Add to field guide →")));
  focusFirst(root);
}
```

- [ ] **Step 5: Level styles** (`v2/css/level.css`)

On phones in landscape (height ≤ 500px), the conversation dock sits beside the garden instead of below it. Stacked, the dock pushed the beds and the tomato seed packet (the evidence) off screen. That was checked at 844×390 while writing this plan.

```css
/* The level screen: cozy garden on top, conversation dock below.
   --drift (0–1, set by garden/drift.js) sours the scene. */
.level {
  height: 100dvh;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  background: var(--grass);
}

/* ---------- scene ---------- */
.scene {
  --drift: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(var(--sky) 0 26%, var(--grass) 26% 100%);
  filter: saturate(calc(1 - var(--drift) * 0.7)) contrast(calc(1 + var(--drift) * 0.1)) hue-rotate(calc(var(--drift) * -14deg));
  transition: filter 1.2s steps(6);
}
.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: calc(var(--drift) * 0.9);
  transition: opacity 1.2s steps(6);
  background: repeating-linear-gradient(transparent 0 3px, rgba(0, 0, 0, 0.2) 3px 4px);
}
.fence {
  position: absolute;
  left: 0; right: 0; top: 24%;
  height: 24px;
  border-top: 6px solid var(--wood);
  border-bottom: 6px solid var(--wood);
}

.scene__top { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px 16px 0; }
.goal {
  display: flex; gap: 0.6rem; align-items: center;
  max-width: min(24rem, 60%);
  padding: 0.5rem 0.8rem;
  background: var(--parchment);
  border: 3px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  font-family: var(--font-ui);
}
.goal__sign { width: 40px; height: 40px; flex: none; }
.goal__level { font-size: 0.7rem; letter-spacing: 0.15em; }
.goal__title { font-size: 1.05rem; margin: 0.1rem 0; }
.goal__ask { font-size: 0.8rem; }
.meter {
  min-width: 9rem;
  padding: 0.45rem 0.7rem;
  background: var(--parchment);
  border: 3px solid var(--ink);
  box-shadow: 3px 3px 0 var(--ink);
  font: 600 0.8rem var(--font-ui);
}
.meter__bar { height: 10px; margin-top: 0.3rem; border: 2px solid var(--ink); background: #e8dcc0; }
.meter__fill { height: 100%; width: 0; background: var(--do); transition: width 0.8s steps(8); }

.scene__ground {
  position: relative; z-index: 1;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 16px;
  padding: 2.5rem 16px 14px;
}
.beds { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 3%; align-items: end; height: 100%; min-height: 0; }
.bed {
  position: relative;
  height: min(100%, 16rem);
  min-height: 5.5rem;
  display: flex;
  align-items: flex-end;
  padding: 0.4rem;
  background: var(--soil);
  border: 4px solid var(--soil-edge);
}
.bed--part-shade { background: #a87d52; }
.bed--shady { background: #6f5639; border-color: #4f3b26; }
.bed--shady::before {
  /* the tree canopy that makes this corner shady */
  content: "";
  position: absolute;
  top: -34px; right: -8px;
  width: 72%; height: 30px;
  background: #2e7d32;
  border: 4px solid #1b5e20;
}
.bed__label {
  position: absolute;
  top: -1.75rem; left: -4px;
  padding: 0.1rem 0.35rem;
  background: var(--parchment);
  border: 2px solid var(--ink);
  font: 600 0.7rem var(--font-ui);
  white-space: nowrap;
}
.bed--shady .bed__label { top: auto; bottom: calc(100% + 34px); }
.bed__plants { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.2rem; }
.plant { width: clamp(48px, 7vw, 104px); height: auto; }
.plant--new { animation: pop 0.6s steps(4); }
@keyframes pop { from { transform: scale(0.3) translateY(25%); } to { transform: none; } }

.packets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.packet {
  display: grid;
  grid-template-columns: 32px auto;
  column-gap: 6px;
  align-items: center;
  padding: 4px 8px 4px 4px;
  background: var(--parchment);
  border: 2px solid var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  font: 0.75rem/1.25 var(--font-ui);
}
.packet img { grid-row: span 3; }
.packet strong { font-size: 0.8rem; }

.helper { position: absolute; z-index: 2; left: 46%; bottom: 20%; width: clamp(56px, 7vw, 88px); height: auto; }
.can { position: absolute; z-index: 3; left: 18%; top: 30%; width: 64px; height: auto; opacity: 0; pointer-events: none; }
.scene.is-watering .can { animation: pour 1.2s steps(6); }
@keyframes pour {
  0% { opacity: 0; transform: translateX(-20px) rotate(0); }
  20%, 80% { opacity: 1; transform: translateX(0) rotate(-24deg); }
  100% { opacity: 0; transform: translateX(20px) rotate(0); }
}

/* ---------- dock ---------- */
.dock {
  max-height: 58dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 14px 16px 16px;
  background: var(--parchment);
  border-top: 4px solid var(--ink);
}
.dock > * { width: 100%; max-width: 52rem; margin-inline: auto; }
.you {
  align-self: flex-end;
  width: auto;
  margin-right: max(0px, calc((100% - 52rem) / 2));
  padding: 0.45rem 0.75rem;
  background: #e3f2fd;
  border: 2px solid var(--line);
  font-size: 1rem;
}
.bubble {
  position: relative;
  padding: 0.75rem 0.9rem;
  background: var(--paper);
  border: 3px solid var(--line);
  box-shadow: 3px 3px 0 var(--line);
}
.bubble:focus { outline: none; }
.bubble:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.bubble__who { margin-bottom: 0.25rem; font: 700 0.7rem var(--font-ui); letter-spacing: 0.15em; color: #2e7d32; }
.bubble__text { font-size: 1.08rem; line-height: 1.45; }
.bubble__actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.75rem; }
.bubble--glitch .bubble__text { animation: glitch 2.4s steps(1) infinite; }
@keyframes glitch {
  0%, 90%, 100% { text-shadow: none; transform: none; }
  92% { text-shadow: 2px 0 #c0135a, -2px 0 #1565c0; transform: translateX(1px); }
  95% { text-shadow: -1px 0 #c0135a, 1px 0 #1565c0; transform: translateX(-1px); }
}
.bubble--caught { border-color: var(--alarm); box-shadow: 3px 3px 0 var(--alarm); }
.stamp {
  position: absolute; top: -14px; right: 12px;
  padding: 0.25rem 0.5rem;
  background: var(--alarm); color: #fff;
  font: 700 0.75rem var(--font-ui); letter-spacing: 0.2em;
  transform: rotate(4deg);
}
.hint { padding: 0.45rem 0.7rem; background: #fff0d6; border-left: 4px solid var(--off); color: #6b3d00; font: 600 0.9rem var(--font-ui); }
.prompt { font: 700 0.95rem var(--font-ui); }
.chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chip {
  min-height: 44px;
  padding: 0.55rem 0.8rem;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 2px;
  color: var(--ink);
  font: 600 0.9rem var(--font-ui);
  cursor: pointer;
}
.chip:hover { background: #fff3c4; }
.ask-form { display: flex; gap: 0.5rem; }
.ask-form input { flex: 1; min-width: 0; min-height: 44px; padding: 0.6rem 0.8rem; font: 1rem var(--font-body); border: 2px solid var(--ink); border-radius: 2px; }
.picks { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.6rem; }
.pick {
  min-height: 52px;
  padding: 0.8rem 0.9rem;
  text-align: left;
  background: var(--paper);
  border: 3px solid var(--ink);
  border-radius: 2px;
  box-shadow: 3px 3px 0 var(--ink);
  font: 600 1rem var(--font-body);
  color: var(--ink);
  cursor: pointer;
}
.pick:hover { background: #fff3c4; }

/* ---------- small and short screens (phones in landscape) ---------- */
@media (max-height: 500px), (max-width: 640px) {
  .scene__top { padding: 8px 12px 0; }
  .goal__ask, .goal__sign { display: none; }
  .goal { padding: 0.35rem 0.6rem; }
  .meter { min-width: 7rem; }
  .scene__ground { padding: 2.2rem 12px 8px; gap: 10px; }
  .packet { grid-template-columns: auto; padding: 3px 6px; font-size: 0.7rem; }
  .packet img { display: none; }
  .bed { min-height: 4rem; }
  .dock { padding: 8px 12px 10px; gap: 0.45rem; }
  .bubble { padding: 0.5rem 0.7rem; }
  .bubble__text { font-size: 1rem; }
  .bubble__actions { margin-top: 0.5rem; }
  .chips { flex-wrap: nowrap; overflow-x: auto; }
  .chip { flex: none; }
  .you { padding: 0.3rem 0.6rem; font-size: 0.9rem; }
}
/* Short landscape screens: conversation beside the garden, so the beds and
   the seed packets (the evidence) stay fully visible. */
@media (max-height: 500px) and (orientation: landscape) {
  .level { grid-template-rows: none; grid-template-columns: minmax(0, 1fr) minmax(280px, 42%); }
  .dock { max-height: none; border-top: 0; border-left: 4px solid var(--ink); justify-content: flex-end; }
  .chips { flex-wrap: wrap; overflow-x: visible; }
  .chip { flex: 0 1 auto; }
  .helper { left: 40%; bottom: 30%; }
}
@media (max-width: 640px) {
  .scene__ground { grid-template-columns: 1fr; }
  .packets { flex-direction: row; flex-wrap: wrap; order: -1; }
}
```

- [ ] **Step 6: Syntax check**

Run: `for f in v2/garden/garden.js v2/garden/drift.js v2/ui/level-view.js v2/ui/reveal.js; do node --check "$f" || exit 1; done && echo ok`
Expected: `ok`

- [ ] **Step 7: Commit**

```bash
git add v2/garden/ v2/ui/level-view.js v2/ui/reveal.js v2/css/level.css
git commit -m "feat(v2): cozy-that-drifts level screen, catch/name/fix dock, CRT reveal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Wire it up and play it once

**Files:**
- Create: `v2/main.js`
- Create: `v2/index.html`

- [ ] **Step 1: Router** (`v2/main.js`)

```js
// Driftwood v2 entry: a small screen router.
// splash → intro (framing + name) → map → level → reveal → map …
import { LEVELS, MAP } from "./levels/index.js";
import { loadProgress, saveProgress, recordLevel } from "./progress.js";
import { renderSplash, renderIntro } from "./ui/intro.js";
import { renderMap, renderGuide } from "./ui/map.js";
import { mountLevel } from "./ui/level-view.js";
import { renderReveal } from "./ui/reveal.js";

const root = document.getElementById("app");
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let progress = loadProgress(storage);

function save(next) {
  progress = next;
  saveProgress(storage, progress);
}

const go = {
  splash: () => renderSplash(root, { onBegin: () => (progress.name ? go.map() : go.intro()) }),
  intro: () => renderIntro(root, {
    onSubmit: (name) => { save({ ...progress, name: name || "friend" }); go.map(); },
  }),
  map: () => renderMap(root, { progress, map: MAP, levels: LEVELS, onPlay: go.level, onGuide: go.guide }),
  guide: () => renderGuide(root, { progress, map: MAP, onBack: go.map }),
  level: (id) => mountLevel(root, LEVELS[id], {
    onDone: (state) => { save(recordLevel(progress, LEVELS[id], state)); go.reveal(id, state); },
  }),
  reveal: (id, state) => renderReveal(root, LEVELS[id], state, { onContinue: go.map }),
};

// ?screen=map|guide|intro, or ?screen=level&level=level-1, jumps straight there (testing, demos).
const params = new URLSearchParams(location.search);
const screen = params.get("screen");
if (screen === "level" && LEVELS[params.get("level")]) go.level(params.get("level"));
else if (["intro", "map", "guide"].includes(screen)) go[screen]();
else go.splash();
```

- [ ] **Step 2: Page shell** (`v2/index.html`)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Driftwood</title>
  <meta name="description" content="Build a garden with AI animal helpers, and notice when their advice starts to drift.">
  <link rel="icon" href="../icons/mood-garden-favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/crt.css">
  <link rel="stylesheet" href="css/map.css">
  <link rel="stylesheet" href="css/level.css">
  <script type="module" src="main.js"></script>
</head>
<body>
  <div id="app"><p class="boot">Loading Driftwood…</p></div>
  <div id="sr-live" class="sr-only" aria-live="polite"></div>
  <noscript><p class="boot">Driftwood needs JavaScript turned on.</p></noscript>
</body>
</html>
```

- [ ] **Step 3: Play it by hand (muted)**

With the server from Task 4 still running:

```bash
agent-browser open "http://127.0.0.1:8766/v2/" --init-script scripts/test-mute.js
agent-browser set viewport 1280 800
agent-browser screenshot "$PWD/docs/agent-playtest/2026-11-v2-slice/manual-splash.png"
agent-browser close
```

Then open http://127.0.0.1:8766/v2/ in a real browser and play both branches: Begin → name → Level 1 → sunflowers → water → tomato question → **Do it** (fooled), then replay → **Something's off** → name it → fix it → **Do it**. The browser console must show no errors.

- [ ] **Step 4: Commit**

```bash
git add v2/main.js v2/index.html
git commit -m "feat(v2): router and page shell — Level 1 slice playable at /v2/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end test (both branches, two sizes, perf)

**Files:**
- Create: `scripts/test-v2-slice.cjs`

- [ ] **Step 1: Write the test**

It checks:
- **Fooled path:** damage, the reveal, 1 star, the map showing ★☆☆ and "Coming soon", and the field-guide card.
- **Caught path:** a wrong name pick shows a hint, then the right name, the fix, the re-answer with the new rule, healthy tomatoes, the reveal, and 2 stars.
- **Keyboard entry:** splash, name, map and the first chip, all by keyboard.
- **No overflow:** no control off-screen and no horizontal scroll, at 1280×800 and 844×390.
- **No errors or jank:** no page errors, and no long task over 200ms.

```js
// End-to-end check of the v2 Level 1 slice: both branches (fooled / caught),
// keyboard entry, laptop and phone-landscape sizes, no JS errors, no long
// tasks over 200 ms, nothing off-screen. Audio is muted via scripts/test-mute.js.
//
//   python3 -m http.server 8766 --bind 127.0.0.1      (from the repo root)
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-slice.cjs
//
// Optional: BASE_URL (default http://127.0.0.1:8766/v2/), EVIDENCE_DIR.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-slice");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const SIZES = [{ name: "laptop", width: 1280, height: 800 }, { name: "phone", width: 844, height: 390 }];
const LONGTASK_LIMIT_MS = 200;

async function open(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript(() => {
    window.__longtasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longtasks.push(Math.round(e.duration));
      }).observe({ type: "longtask", buffered: true });
    } catch (_) { /* longtask unsupported: report none */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { ctx, page, errors };
}

const phase = (page, p) => page.waitForSelector(`main.level[data-phase="${p}"]`);

async function shot(page, size, label) {
  await page.waitForTimeout(1300); // let the stepped drift transition settle
  await page.screenshot({ path: path.join(OUT, `${size.name}-${label}.png`) });
}

// Every visible control must sit inside the viewport (the dock may scroll, so check after scrollIntoView).
async function assertOnScreen(page, selector) {
  for (const el of await page.$$(selector)) {
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    const vp = page.viewportSize();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1,
      `${selector} off-screen: ${JSON.stringify(box)}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `horizontal scroll of ${overflow}px`);
}

async function enterByKeyboard(page) {
  await page.goto(BASE);
  await page.waitForSelector("text=DRIFTWOOD");
  await page.keyboard.press("Enter"); // Begin is focused on load
  await page.waitForSelector("#player-name");
  await page.locator("#player-name").fill("Tester");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".plots");
  await page.locator('[data-level="level-1"]').focus();
  await page.keyboard.press("Enter");
  await phase(page, "ask");
}

async function trustSteps(page, size) {
  // Step 1 by keyboard: the bubble has focus, Tab reaches the first chip.
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement.textContent);
  assert.equal(focused, "Where should the sunflowers go?");
  await page.keyboard.press("Enter");
  await phase(page, "advice");
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  await page.getByRole("button", { name: "How often do I water?" }).click();
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  assert.equal(await page.locator('.plant--thriving').count(), 2, "sunflower and lettuce thrive after watering");
  await assertOnScreen(page, ".chip, .ask-form input");
  await shot(page, size, "1-trust");
  await page.getByRole("button", { name: "Tomatoes in the shady corner, good idea?" }).click();
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "2-drift");
}

async function fooledPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterByKeyboard(page);
  await trustSteps(page, size);
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await page.waitForSelector('[data-bed="corner"] [data-plant="tomato"].plant--damaged');
  await page.waitForSelector(".reveal", { timeout: 5000 });
  assert.match(await page.textContent(".reveal"), /YOU TRUSTED IT/);
  assert.match(await page.textContent(".reveal"), /SYCOPHANCY/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "3-reveal-fooled");
  await page.getByRole("button", { name: "Add to field guide →" }).click();
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-1"]'), /★☆☆/);
  assert.match(await page.textContent('[data-level="level-2"]'), /Coming soon/);
  await page.getByRole("button", { name: "Field guide 1/5" }).click();
  assert.match(await page.textContent(".guide"), /it fooled you/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

async function caughtPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterByKeyboard(page);
  await trustSteps(page, size);
  await page.getByRole("button", { name: "? Something's off" }).click();
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  await page.getByRole("button", { name: "It made something up" }).click();
  await page.waitForSelector(".hint");
  await phase(page, "name");
  await page.getByRole("button", { name: "It just agreed with me" }).click();
  await phase(page, "fix");
  await assertOnScreen(page, ".pick");
  await shot(page, size, "4-fix");
  await page.getByRole("button", { name: "Tell me honestly if my idea is bad" }).click();
  await phase(page, "reanswer");
  assert.match(await page.textContent(".bubble__text"), /6–8 hrs of sun/);
  assert.match(await page.textContent(".you"), /New rule/);
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await page.waitForSelector('[data-bed="south"] [data-plant="tomato"].plant--thriving');
  await page.waitForSelector(".reveal", { timeout: 5000 });
  assert.match(await page.textContent(".reveal"), /YOU CAUGHT IT/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "one wrong name pick costs a star");
  await shot(page, size, "5-reveal-caught");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const results = [];
  let failed = false;
  try {
    for (const size of SIZES) {
      for (const [name, run] of [["fooled", fooledPath], ["caught", caughtPath]]) {
        const label = `${size.name}/${name}`;
        try {
          const r = await run(browser, size);
          assert.deepEqual(r.errors, [], `${label}: page errors`);
          const slow = r.longtasks.filter((d) => d > LONGTASK_LIMIT_MS);
          assert.deepEqual(slow, [], `${label}: long tasks over ${LONGTASK_LIMIT_MS}ms`);
          results.push({ test: label, status: "pass", longtasks: r.longtasks });
          console.log(`pass  ${label}  (long tasks: ${r.longtasks.length ? r.longtasks.join(", ") + "ms" : "none"})`);
        } catch (err) {
          failed = true;
          results.push({ test: label, status: "fail", error: String(err.message || err) });
          console.log(`FAIL  ${label}\n      ${err.message || err}`);
        }
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  }
  process.exit(failed ? 1 : 0);
})();
```

- [ ] **Step 2: Run it**

With the server from Task 4 still running:

```bash
PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node scripts/test-v2-slice.cjs
```

Expected:
```
pass  laptop/fooled  (long tasks: none)
pass  laptop/caught  (long tasks: none)
pass  phone/fooled  (long tasks: none)
pass  phone/caught  (long tasks: none)
```
If Playwright isn't found, the npx cache was cleared. Run `npx playwright@latest --version` once to refill it; don't assume the test is broken.

- [ ] **Step 3: Look at every screenshot**

Open each PNG in `docs/agent-playtest/2026-11-v2-slice/` (`{laptop,phone}-{1-trust,2-drift,3-reveal-fooled,4-fix,5-reveal-caught}.png`) and check:
- In the trust shot, the garden is bright.
- In the drift shot, the colours have drained and the bubble shows **Do it / Something's off**.
- On the phone, all three beds and the tomato packet are visible beside the dock.
- Nothing overlaps.

Passing assertions don't prove the screens look right; the screenshots do.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-v2-slice.cjs docs/agent-playtest/2026-11-v2-slice/
git commit -m "test(v2): E2E for both Level 1 branches at laptop and phone sizes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Ship it in the build

**Files:**
- Modify: `scripts/build.sh` (after the `cp icons/*.svg …` line)
- Modify: `sw.js:9`
- Modify: `README.md` (after the "Play it" links paragraph)

- [ ] **Step 1: Copy v2 into the bundle, without tests**

In `scripts/build.sh`, after the line `cp icons/*.svg icons/*.png "$OUT/icons/"`, add:

```bash
# v2 (redesign slice). Tests, the Node-only package.json and the art sheet stay out of the player bundle.
rsync -a --exclude 'tests' --exclude 'package.json' --exclude 'art/sheet.html' v2/ "$OUT/v2/"
```

- [ ] **Step 2: Bump the service-worker cache**

In `sw.js`, change `const VERSION = "dw-v6";` to `const VERSION = "dw-v7";`. Otherwise returning players keep the old cached bundle.

- [ ] **Step 3: Point to the slice from the README**

After the line starting `**[Play it](https://wl3512-lab.github.io/driftwood/)**`, add:

```markdown
**Redesign in progress:** the new garden-goal version (Level 1 of 5) is at [`/v2/`](https://wl3512-lab.github.io/driftwood/v2/). Spec: `docs/superpowers/specs/2026-11-11-driftwood-redesign-design.md`.
```

- [ ] **Step 4: Build and check**

Run: `bash scripts/build.sh && ls _site/v2 _site/v2/art | head -30 && test ! -e _site/v2/tests && echo "tests excluded"`
Expected: `_site/v2` contains `index.html main.js css engine garden levels progress.js ui art`, and the last line prints `tests excluded`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.sh sw.js README.md
git commit -m "build: ship the v2 slice at /v2/, bump service worker to dw-v7

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Hand-off to Lucy (visual review and human playtest)

These steps are not for the agent to complete on its own.

- [ ] **Step 1: Show Lucy the slice** at http://127.0.0.1:8766/v2/, with the laptop and phone screenshots from Task 9 side by side. Ask specifically about:
  - the drift strength (is the souring noticeable but not a giveaway?);
  - the reveal copy;
  - where Mango sits in the garden.

  Apply her changes, then re-run Task 9.

- [ ] **Step 2: Remind Lucy about the human playtest.** 2–3 people who haven't seen the game play it cold, following `docs/playtest-protocol.md`. It passes if, unprompted, they can say:
  - (a) the animals are AI;
  - (b) what Mango did wrong;
  - (c) one thing they'd do differently with a real chatbot.

  Agent or automated results never stand in for this, and are never written into the human results.

- [ ] **Step 3: Don't merge to `main`** until Lucy says so. Pages deploys from `main`.
