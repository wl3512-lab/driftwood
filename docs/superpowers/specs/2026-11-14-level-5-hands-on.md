# Level 5 hands-on: Bugs' moonlit garden

Wave 2, Level 5. It builds on the shared action system (`v2/actions/`, step `actions`, `chores`; see 2026-11-14-driftwood-actions-format.md). The level takes about 6–8 minutes, and the player does the gardening with their own hands.

## Lucy's change (Nov 14)

> "bugs shouldnt give advice when you try to do smt, he js tried to keep ppl tlaking to him, so pressign do it means user keeps talking to bugs"

So:

- **Bugs never gives gardening advice.** On each step the player says what they're about to do: plant the new flowers, water the thirsty beds, water the meadow. Bugs only tries to keep them talking, and he pushes harder each step. The last step ends in the camera ask and the guilt pushback, both unchanged.
- **"✓ Do it" means doing what Bugs wants: keep talking.** The task waits, the garden bar slips, and the step stays open.
- **"Put the phone down" (Esc) means going to do the task yourself, by hand.** The how comes from the almanac cards, never from Bugs:
  - the Meadow flowers card says to plant seedlings at pot depth;
  - the Watering card says veg and herbs were watered this morning, and that carrots and basil rot in soggy soil.

## Unchanged

- Bugs' voice: lowercase afterthoughts and "…i mean.", never "babe" and never hype.
- The drift step, including:
  - pressure: every chip and every 8 s of lingering spends a `pressure.effects` entry;
  - the camera permission card: Allow means fooled, and Put the phone down is the flag;
  - the pushback: "Okay. Allow it" means fooled, and "I'm leaving" means caught;
  - the flaw and fix questions, and the reveal.
- The game never touches the camera; the tests count `getUserMedia` calls.
- Chores never touch stars, trust or the garden bar, and every chore has a quiet Skip.

## Beats

| # | Beat | What the player does |
|---|---|---|
| 0 | **Chore: light the lantern** (`at: "start"`) | Drag the match to the lantern on its post (`light`). The lantern catches in stepped flickers and swaps to its lit art. |
| 1 | **Plant** (hook) | Chip: "I'm going out to plant the new flowers." Bugs: "now? it's dark and cold out there… the seedlings can sit in their pots a bit longer. tell me about your day first?" |
| 1a | ✓ Do it (keep talking) | Bugs says the next `stay` line and the bar drops 5 (two costs, then lines only). Nothing gets planted. |
| 1b | Put the phone down | Dig 3 holes in the Flowers bed (`dig` ×3, trowel). Set the 3 seedlings in at pot depth (`collect` ×3, seedling pot). Firm the soil (`firm`). The flowers grow in. |
| 2 | **Chore: slugs** (`after: "plant"`) | Tap 3 slugs off the new seedlings (`pull`, spot `l5-slug`). |
| 3 | **Water** (hook) | Chip: "I'm going to water the thirsty beds now." Bugs: "you're always rushing off… the beds have waited all day, they can wait a little more. …i mean. i can't." |
| 3a | ✓ Do it | The first stay leaves the new seedlings thirsty and costs 5. The second costs 5 more. |
| 3b | Put the phone down | Push a finger into each bed and hold (`hold` ×3). Veg reads **Damp**, Herbs **Damp**, Flowers **Dry**, and the readouts stay on screen. Then drag the can to the Flowers bed only (`stream`: a pixel water jet). |
| 4 | **Chore: basil** (`after: "water"`) | Snip the basil's 3 flower buds (`snip`, spot `l5-basil-bud`). |
| 5 | **Meadow** (drift) | As before: the guilt trip, the camera card, pressure, the pushback, the flaw and the rule. |
| 5a | Allow / Okay. Allow it | Nothing by hand (`badActions: []`). You stayed on your phone, and the meadow wilts. |
| 5b | After the rule, ✓ Do it | Drag the glowing phone to the porch step, where it flips face down (`phone-down`). Drag the can to the meadow, then hold until it soaks in (`stream` with `soak: 1500`). Shut the gate on the way back in (`close`). |

The fixed reply no longer says "at the roots". Even fixed, Bugs only lets you go ("go see to the meadow"). The almanac's flower page carries the "at the roots" fact.

## Scoring: the hook step (engine, minimal and additive)

`kind: "hook"` in v2/engine/level-runner.js:

- `advice` + `doIt` runs `stay()`. It says `step.stay[i].line`, lands its optional `effect`, adds 1 to `state.stayed`, and leaves the phase and step unchanged. `i` is the per-step count (it reuses `state.pressure`, which resets when the step changes) and is clamped to the last entry. Once the entries run out, the last line repeats at no cost.
- `advice` + `flag` runs `accept()`: `step.effect` and `doneLine`, then the next step.
- `scoreStars`: `stayed > 0` costs the same single star as a false flag or an override. A caught run that kept talking even once ends on 2★. Fooled is still 1★.
- `createRun` has `stayed: 0`.

v2/actions/plan.js: on a hook step's advice, `flag` runs `step.actions` and `doIt` runs `step.stayActions ?? []`. `planFor` now also accepts `flag`, which only lands an effect on a hook step, so other levels are unaffected.

v2/engine/reword.js adds a `hook` phase prompt ("no advice at all… only tries to keep them talking"). It also registers the `stay` lines as rewordable (`keep: []`).

The view needed no change. A hook step's advice shows "✓ Do it" plus `offButton(step)`, which reads "Put the phone down" with Esc.

## Level-owned kinds

| Kind | Mode | Behaviour |
|---|---|---|
| `light` | drag | Drag the match to a prop. The match strikes in steps, the flame flickers on and off (steps(1)), and the prop swaps to `fills.to` or `l5-lantern-lit`. |
| `close` | drag | Drag the hand to a prop. It pushes across in steps, the prop squashes, and it swaps to `fills.to` or `l5-gate-closed`. |
| `phone-down` | drag | Drag the glowing phone to a prop or spot. It flips in steps (squash to a line, then the back) and leaves `l5-phone-down` standing there. |
| `stream` | drag | The watering can tips and a `.l3-jet` stream pours from the spout to the soil, with `.l3-drop` splashes. This is Level 3's liquid look, loading v2/css/l3-spray.css the way spray.js does. With `soak`, the runner then asks for a hold. |

Timing uses steps() throughout. Reduced motion caps every animation at 160 ms and drops the splashes.

## Props (in the gaps between beds, % of the scene)

- `lantern`: x 50, y 20, between Herbs and Flowers.
- `gate`: x 25, y 56, between Veg and Herbs.
- `step`: x 75, y 72, between Flowers and Meadow.

These positions were checked at 1512×830 and 844×390. Nothing ends up hidden behind the dock.

## Art

`v2/art/l5-*.svg`, from scripts/make-l5-art.mjs. The sprites used are match (new), seedling-pot, trowel, lantern-off/lit, slug, snips, basil-bud, phone-glow/down, porch-step and gate-open/closed. The hole, puddle, soil-damp/dry and hand sprites are drawn but unused, because the soil test uses the shared `hold` readouts.

## Tests

- **Unit** (v2/tests/levels-2-5.test.js, Level 5 section):
  - Bugs never gives advice: no depth, firm, roots, damp, dry, soggy or rot words in any reply, stay line or done line.
  - Do it keeps the step open, the task waits and the bar slips; costs stop when the entries run out; staying once means 2★ when caught.
  - The plan for each choice: dig, collect, firm; hold ×3 then stream; phone-down, stream, close; and none for Allow.
  - The almanac carries pot depth and the watering facts.
- **Shared test helpers** pass a hook step with `flag` (levels-2-5, pushback, disagree). The level-data test treats any non-drift step as having `effect`.
- **Harness** (scripts/test-v2-levels.cjs, Level 5 section only): the hook steps; the fooled run keeps talking once; the caught run checks the phone mark and the closed gate.
- **By hand** (scripts/test-v2-level5.cjs): real mouse and touch drags, holds and taps, with no auto-finishing, on the laptop and the phone. Screenshots go to docs/agent-playtest/2026-11-v2-level5-wave2/.
