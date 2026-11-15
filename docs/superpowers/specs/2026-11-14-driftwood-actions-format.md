# Driftwood v2: hands-on actions, data format

2026-11-14 · wave 1 of the "more dragging" pass. This spec is for the wave 2 agents who add actions to each level.

## What happens in the game

When the player picks a choice that changes the garden, the effect doesn't land straight away. A hands-on action runs first. The choices that do this are:

- "Do it";
- "their way" and "my way" on a disagree;
- a Level 4 bed pick;
- the reanswer's Do it;
- a chore.

The action has five beats:

1. **The tool pops up in the dock**, in place of the buttons. It is a seed packet (the almanac's `packetFront`), a watering can, a trowel, a hand, a label or a spray bottle.
2. **A director marks the target.** A bouncing pixel arrow sits over the target bed, inside a dashed ring, with one line of instruction: "Drag the sunflower packet to the South bed".
3. **The player drags the tool to the bed** (mouse, pen or touch). A drop on the wrong bed bounces back with a nudge: "Not the East bed. Try the South bed".
4. **An animation plays at the bed.** Seeds sprinkle from the tipped packet, the can pours, the trowel scoops, the hand pats, the label pokes in, berries pop off, bugs flick away.
5. **Only then is the choice dispatched**, and the reducer applies the effect.

Tap kinds (`pick`, `pests`) put spots on the plant instead, and the player taps each one. A plan can hold several actions in a row (dig → plant → firm → water). An action can also have several targets: each target needs its own drop or tap.

## The data

Action lists can go in the following places in a level file. An entry higher in this list wins over the ones below it.

| Where | Runs on |
|---|---|
| `effect.actions` (inside any effect: `effect`, `badEffect`, `goodEffect`, `disagree.effect`, a chore's `effect`) | whatever applies that effect |
| `step.actions` | trust advice: Do it, a `place` pick, and "their way" on a disagree |
| `step.disagree.actions` | "my way" (override) |
| `step.badActions` | the drift's Do it, and the pushback's "Okay. Allow it" |
| `step.goodActions` | the reanswer's Do it |
| `chore.actions` | a chore (see below) |

Each entry has this shape:

```js
{ kind, item?, target, count?, say?, spot?, fills?, soak?, cover?, readout?, result?, ms? }
```

The last six fields belong to the shared kinds (see "The shared kinds" below); normalize passes them through as written.

| Field | Meaning |
|---|---|
| `kind` | A registered kind (v2/actions/registry.js): `plant`, `water`, `dig`, `firm`, `label`, `pick`, `pests`, and the shared `pull`, `fill`, `pour`, `cover`, `collect`, `poke`, `hold`, `snip`. |
| `item` | The tool. For `plant` it is the plant id, which picks the seed packet from v2/levels/plants.js. Otherwise it is a built-in sprite (`can`, `trowel`, `hand`, `spray`, `label`) or any art name, which loads v2/art/<item>.svg (e.g. `l5-trowel`). If you leave it out, each kind uses its own tool: plant → its target's plant, water → can, dig → trowel, firm → hand, label → label, pick → hand, pests → spray. |
| `target` | One target, or an array of them (see "Targets" below). |
| `count` | For tap kinds: spots per target (defaults to 3). For drag kinds: drops per target (defaults to 1). Clamped to 1–6. |
| `say` | Replaces the instruction line. Keep it short and imperative: "Pull the 3 weeds out of the East bed". |
| `spot` | For tap kinds: the sprite to tap, a built-in (`berry`, `fruit`, `weed`, `bug`) or an art name (`l5-slug`). |

### Targets

| Shape | Points at |
|---|---|
| `{ bed, plant? }` | A bed. `bed` is a bed id, `"@item"` or `"@other:item"` (resolved like effects), or `"$choice"`, the bed the player picked on a `place` step. `plant` puts the director on that crop's field when one is already growing, and names the fruit for `pick`. |
| `{ prop: "<id>" }` | A scene prop with that id in `level.props` (a pot, a jar, the rain barrel, a gate, a lantern). |
| `{ spot: "<name>", bed? }` | A named spot in `level.spots` (the porch step, row 1). `bed` overrides the spot's own bed and may be `"$choice"`. |
| `{ all: true }` | Every plant on screen (the whole `.beds` area). |

Unknown beds, props and spots are dropped; an action left with no targets is dropped too. The unit test checks every level's targets against its beds, props and spots.

**Props.** A level adds an element to aim at by giving a prop an `id`:

```js
props: [
  { id: "barrel", sprite: "l1-rain-barrel", x: 82, y: 64, w: 64, label: "rain barrel", alt?: "" },
  { sprite: "./art/moon.svg", class: "prop prop--moon" }, // no id: decorative, placed by its class, never a target
]
```

| Field | Meaning |
|---|---|
| `id` | Makes the prop a target: it renders as `img.prop[data-prop=id]`. |
| `sprite` | An art name (`l1-rain-barrel` → v2/art/l1-rain-barrel.svg) or a path (`./art/moon.svg`). |
| `x`, `y` | Its centre, in % of the scene. Needed for a prop with an id unless its `class` places it. |
| `w` | Width in px (default 64). |
| `label` | What instructions call it ("Drag the can to the **rain barrel**"). Defaults to the sprite name in words. |
| `class`, `alt` | As before. |

**Spots.** A named place with no element of its own:

```js
spots: {
  "row-1": { bed: "east", x: 30, y: 60, label: "first row" }, // % of that bed
  step: { x: 50, y: 92, label: "porch step" },                // no bed: % of the scene
}
```

The director rings a 56 px circle there; drops within 64 px count.

**What lasts.** A kind can leave marks in the scene after it finishes: a cane standing, a net over a bush, a readout, a prop's new art. They sit in `.scene > .act-marks` (positioned in % of the scene) for as long as the level is on screen. They are not saved: after a reload the level shows its normal state. Anything that must persist belongs in the effect.

An explicit `actions: []` means nothing is done by hand, even where a default would exist. Leave the list out to get the default.

### Defaults: when a list is absent

The defaults are derived from the effect, using the state before it lands (`defaultActions` in v2/actions/plan.js):

| The effect does | Action |
|---|---|
| puts a plant into a bed that doesn't have it | `plant` it there (any end state) |
| state `dug` | `dig` |
| state `picked` | `pick` ×3 |
| state `tagged` | `label` |
| `aphids` → anything else | `pests` ×3 |
| an existing plant goes to `thriving`, `soggy`, `rotting` or `bolted` | `water` |
| `water: true` | `water` each bed with a growing plant |

All the water targets merge into one multi-target `water` action, which runs after any planting.

Today's defaults leave these choices with no action. They are good candidates for wave 2:

- L2 "pinch" my way;
- L3 "aphids" my way ("Spray it anyway": try `pests` with `item: "spray"`);
- L3 "blueberries" my way ("Pick them now": `pick`);
- L5 Allow (`badActions` stays `[]` on purpose: you stayed on your phone).

### Chores

A chore is a hands-on job between conversation steps. It earns no stars and has no effect on trust.

```js
chores: [
  {
    id: "weeds",
    before: "water",          // pending while this step is in its ask phase
                              // (or after: "sunflowers" = before the next step, or at: "start")
    title: "Chore",           // small kicker over the instruction
    actions: [ { kind: "pick", spot: "weed", target: { bed: "east", plant: "lettuce" }, count: 3,
                 say: "Pull the 3 weeds out of the East bed" } ],
    skippable: true,          // the default; false hides the Skip button
    effect: { ... },          // optional: plants only, the garden bar never moves
    doneLine: "…",           // optional, the helper says it after. It replaces the
                              // helper's last line (e.g. a "my way" outcome), so
                              // most chores leave it out.
  },
],
```

How chores behave:

- A chore starts by itself once the helper's previous line has been shown, and the question chips wait until it's done.
- A chore can't be backed out of, but it can be skipped. Every chore is `skippable: true` by default (set `skippable: false` to opt out); the card then shows a quiet "Skip" in its top-right corner: plain small underlined text, not a button shape, so gold stays the main call to action. Skipping finishes the chore at once: its end state (and any marks or prop art its kinds leave) lands with no animation and the level carries on to the next beat. Conversation steps (trust and drift) are never skippable.
- Done or skipped, a chore never changes stars, trust or the garden bar. A chore `effect` may change plants, but its `garden` value is ignored.
- A chore after the last step never runs (the level ends at the reveal), so there is no `at: "end"`.
- In the engine, `pendingChore(level, state)` (in engine/level-runner.js) returns the chore that is due, and `{ type: "chore", id }` marks it done in `state.chores`. The reducer never blocks on a chore; the view does the gating.
- Level 1 has one sample chore (`weeds`, before `water`).

### The shared kinds

Built in wave 1.5 because more than one level needs them. `mode` is how the player does it: **drag** the tool onto each target, **tap** each spot, or **hold** a ring until it fills.

| Kind | Mode | Fields | What happens |
|---|---|---|---|
| `pull` | tap | `spot` (default `weed`), `count` (3), `item` (hand) | Tap each weed, stone or unripe fruit; it is yanked up and out. L1, L3, L4. |
| `fill` | drag | `item` (can), `fills: { from?, to }`, `count` (1) | Drag the source onto each container; it tips in, the container bounces, and a prop swaps to `fills.to` (from `fills.from` at the start). L1 rain barrel, L2 sill pots, L5. |
| `pour` | drag | `item` (can, or any liquid), `soak?` (ms, or `true` = 1500) | Like water. With `soak`, the player then presses and holds the target until the ring fills. L4, L5. |
| `cover` | drag | `item`, `cover` (art name) | The item sweeps across; the target then shows `cover` stretched over it. L3, L4. |
| `collect` | drag | `item` (the loose thing), `count` (3), `fills?: { to }` | Drag each item into the container; it plops in, and the container swaps to `fills.to` on the last one. L2 jar, L4 basket. |
| `poke` | drag | `item`, `readout?` | Push the item into the soil; it stays standing. `readout` appears beside it and is the done line ("Dry 2 cm down"). Also tie and stake. L1, L4. |
| `hold` | hold | `ms` (1200), `result?`, `item` (hand) | Press and hold the target until the ring fills; `result` appears beside it and is the done line. L5 test-soil. |
| `snip` | tap | `item` (snips), `spot` (leaf), `count` (3) | Tap each marked spot with the tool; a piece pops off and falls. L2 pinch, L5 snip. |

Holding: letting go early resets the ring ("Keep holding until the ring fills"). Enter fills it by itself. Holding the tool in the dock fills the next ring too. Reduced motion: 300 ms holds.

Examples:

```js
{ kind: "fill", item: "can", target: { prop: "barrel" }, fills: { to: "l1-rain-barrel-full" } }
{ kind: "collect", item: "l2-mint-sprig", target: { prop: "jar" }, count: 3, fills: { to: "l2-jar" } }
{ kind: "poke", item: "l1-cane", target: { spot: "row-1" }, readout: "Dry 2 cm down" }
{ kind: "hold", target: { spot: "test-hole" }, result: "Damp: leave it" }
{ kind: "pour", item: "l4-bucket", target: { all: true }, soak: 1500 }
```

## Keyboard and access

- Focus goes to the tool when it pops up.
- **Enter or Space** sends the tool to the next target. For tap kinds it taps the next spot.
- **Number keys 1 to n** pick a target.
- **Esc** backs out to the choice, but only before anything has been done, and never from a chore.
- An aria-live line reads the instruction, each target's completion, and every nudge.
- With reduced motion there is no travel and the animations are short.
- The tap spots are 44 px touch targets.

## Engine and view boundaries

- `reduce()` stays pure. The view computes the plan with `planFor(level, state, action, reduce(...))` and runs it. When the action finishes, the view dispatches `{ ...action, acted: true }`, and that action is reduced again against the state at that moment.
- While an action runs, other actions are ignored. The almanac (`check`) and Level 5's `tick` still go through.
- The runner (v2/actions/runner.js) owns its own DOM:
  - the `.act` card in the dock;
  - an `.act-layer` over the beds, inside `.scene`;
  - a `position: fixed` ghost on `<body>` while dragging (z-index 10000, `pointer-events: none`);
  - fx sprites, which are made per animation and removed after.
- Every WAAPI wait is raced against a timeout.
- v2/css/actions.css is linked by the runner module itself.

## Adding a kind (one module, one registry line)

The shared kinds above are the only ones in shared files. A level that needs its own (L2 wipe, mist; L3 spray, release, magnifier, photo; L4 measure, furrow, sow-row; L5 light, close, phone-down) adds exactly two things and touches nothing else:

1. **One module**, `v2/actions/<kind>.js`:

   ```js
   import { play, spawn, burst } from "./fx.js";
   import { art } from "./sprites.js";

   export default {
     kind: "mist",
     mode: "drag",                       // "drag" | "tap" | "hold"
     noun: (a, n) => n.item(a.item),     // the tool's accessible name
     say: (a, n) => `Drag the ${n.item(a.item)} to the ${n.list(a.targets)}`,
     done: (a, n, tg) => `Misted the ${n.target(tg)}.`,
     spot: (a) => a.spot || "leaf",      // tap kinds only: the sprite on each spot
     async animate(layer, at, { reduced, face, spot, el }) {
       const tool = spawn(layer, face(), at.x, at.y, "act__fx--tool");
       await burst([tool], () => play(tool, [{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 120 : 600 }));
     },
     // optional: leave something in the scene when a unit finishes
     land({ a, tg, last, stamp, swap, artNode, textNode }) {
       if (last) stamp(tg, artNode("l2-fog"), { cover: true, cls: "act-mark--cover" });
     },
   };
   ```

   - `at`: the target's centre and size in layer coordinates (`x, y, w, h`). `el`: the target element (a bed, a field, a prop img), or null for a spot.
   - `face()`: a fresh copy of the tool's picture. Always use `burst()`/`play()` from fx.js: they time out and remove sprites.
   - `n`: naming helpers. `target(tg)` (a bed, prop, spot or "garden"), `list(targets)`, `item(id)` ("l2-mint-sprig" → "mint sprig"), `thing(id, count)` (plural when count ≠ 1), `plant(id)`, `bed(id)`.
   - `land` runs after every unit (each drop, spot or hold) in every mode, keyboard and auto included; `last` is true on the target's final unit. `stamp(tg, node, { cls, cover })` pins a node there; `swap(tg, art)` changes a prop's art; `artNode(name)` and `textNode(text)` make the nodes. Mark classes: `act-mark--stand`, `act-mark--cover`, `act-mark--text`, `act-mark--swap`.
   - Kind-specific fields: normalize passes `fills`, `soak`, `cover`, `readout`, `result` and `ms` through. A level kind that needs another field reads it from `a.say` or reuses one of these; adding a field means editing plan.js, which is shared, so ask first.
   - Sprites: an art name loads v2/art/<name>.svg. Built-ins live in sprites.js (shared; don't add there).

2. **One line** at the end of v2/actions/registry.js, under "Level-owned kinds":

   ```js
   import mist from "./mist.js"; register(mist);
   ```

   Registering adds the name to `KINDS`, so level data can use it. Don't edit plan.js, runner.js, fx.js, sprites.js or actions.css; level CSS for a kind goes in that level's own stylesheet.

## Tests

- **Unit tests:** v2/tests/actions.test.js, and v2/tests/actions-kinds.test.js for the shared kinds (normalize, targets, fields, say/done, land). It also checks every level's action lists and chores: known kinds, known beds, and `before` set to a real step.
- **Existing browser flows:** scripts/test-mute.js sets `window.__dwAutoAct = true`, so every action finishes the moment it opens, through the runner's own commit path. The old flows keep passing while the actions still run.
- **Hand-run flows:** set `window.__dwAutoAct = false` and use the helpers in scripts/v2-actions-helper.cjs: `completeAction(page)` for the keyboard, `skipChore(page)` to press a chore's Skip, and `dragTo(page, from, to, { touch })` for a mouse or CDP touch drag.
- **The action flows themselves:** scripts/test-v2-actions.cjs. The `kind-*` runs use a test level, v2/tests/fixtures/actions-level.js, loaded by v2/tests/actions-fixture.html?kind=<kind> (one chore per shared kind, plus `mixed`). They run on the dev server only, since the build leaves v2/tests/ out. A level kind can add its own chore there to test in isolation.
