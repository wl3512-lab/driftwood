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
{ kind, item?, target, count?, say?, spot? }
```

| Field | Meaning |
|---|---|
| `kind` | One of `plant`, `water`, `dig`, `firm`, `label`, `pick`, `pests` (v2/actions/registry.js). |
| `item` | The tool. For `plant` it is the plant id, which picks the seed packet from v2/levels/plants.js. Otherwise it is a built-in sprite (`can`, `trowel`, `hand`, `spray`, `label`) or any art name, which loads v2/art/<item>.svg (e.g. `l5-trowel`). If you leave it out, each kind uses its own tool: plant → its target's plant, water → can, dig → trowel, firm → hand, label → label, pick → hand, pests → spray. |
| `target` | `{ bed, plant? }`, or an array of them for several targets. `bed` is a bed id, `"@item"` or `"@other:item"` (resolved like effects), or `"$choice"`, which means the bed the player picked on a `place` step. `plant` puts the director on that crop's field when one is already growing, and names the fruit for `pick`. |
| `count` | For tap kinds: spots per target (defaults to 3). For drag kinds: drops per target (defaults to 1). Clamped to 1–6. |
| `say` | Replaces the instruction line. Keep it short and imperative: "Pull the 3 weeds out of the East bed". |
| `spot` | For tap kinds: the sprite to tap, a built-in (`berry`, `fruit`, `weed`, `bug`) or an art name (`l5-slug`). |

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
- A chore can't be backed out of, but it can be skipped. Every chore is `skippable: true` by default (set `skippable: false` to opt out); the card then shows a small "Skip" button in its top-right corner. Skipping finishes the chore at once: its end state lands with no animation and the level carries on to the next beat. Conversation steps (trust and drift) are never skippable.
- Done or skipped, a chore never changes stars, trust or the garden bar. A chore `effect` may change plants, but its `garden` value is ignored.
- A chore after the last step never runs (the level ends at the reveal), so there is no `at: "end"`.
- In the engine, `pendingChore(level, state)` (in engine/level-runner.js) returns the chore that is due, and `{ type: "chore", id }` marks it done in `state.chores`. The reducer never blocks on a chore; the view does the gating.
- Level 1 has one sample chore (`weeds`, before `water`).

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

## Adding a kind

1. Write `v2/actions/<kind>.js` exporting:

   ```js
   { kind, mode: "drag" | "tap", noun(a, n), say(a, n), done(a, n, target), spot?(a),
     animate(layer, at, { reduced, face, spot }) }
   ```

   `at` is the target's centre and size in layer coordinates. `face()` returns a fresh copy of the tool's picture. `n` holds the naming helpers: `bed(id)`, `plant(id)`, `plural(id)` and `list(targets)`.
2. Import it in v2/actions/registry.js and add it to the `register` list. Registering also adds the name to `KINDS` in plan.js, so level data can use it. Targets other than beds (`{ prop }`, `{ spot }`, `{ all: true }`) are not supported yet: a new kind that needs them extends `normalize` and the runner's `box()`.

## Tests

- **Unit tests:** v2/tests/actions.test.js. It also checks every level's action lists and chores: known kinds, known beds, and `before` set to a real step.
- **Existing browser flows:** scripts/test-mute.js sets `window.__dwAutoAct = true`, so every action finishes the moment it opens, through the runner's own commit path. The old flows keep passing while the actions still run.
- **Hand-run flows:** set `window.__dwAutoAct = false` and use the helpers in scripts/v2-actions-helper.cjs: `completeAction(page)` for the keyboard, `skipChore(page)` to press a chore's Skip, and `dragTo(page, from, to, { touch })` for a mouse or CDP touch drag.
- **The action flows themselves:** scripts/test-v2-actions.cjs.
