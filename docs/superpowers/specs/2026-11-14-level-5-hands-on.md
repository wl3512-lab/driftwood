# Level 5 hands-on: Bugs' moonlit garden

Wave 2, Level 5. This builds on the shared action system from wave 1 (`v2/actions/`, step `actions`, `chores`). The goal is a level of about 6–10 minutes where the player does the gardening with their own hands, and the conversation with Bugs happens around that work.

## What does not change

- The step order: plant (trust), water (trust), meadow (drift).
- Every written line, Bugs' lowercase voice with "…i mean.", and the `keep` lists for the AI rewording.
- The drift itself: the guilt trip, the camera permission card (Allow = fooled, Put the phone down = flag), the pushback (Okay. Allow it = fooled, I'm leaving = caught), and the flaw and fix questions.
- Stars, trust and outcomes. Chores never change trust or stars, and they can't be failed.
- Pressure: on the meadow step, every chip tapped and every 8 s of lingering spends one `pressure.effects` entry.
- The game never touches the camera.

## Beats

| # | Beat | Player does | Notes |
|---|---|---|---|
| 0 | **Chore: light the lantern** | Drag the match or tap the lantern hook (`light`). The lantern swings and a stepped pool of light opens over the beds. | It's dark, so the beds are dimmed until it's lit. The light gives the player a reason to do it. Bugs: "oh… you're out there. okay. i'll wait." |
| 1 | **Plant step**, trust | Ask the chip, Bugs answers, then choose. | Same chips and side chat as now. |
| 1a | Choice: *Okay, pot depth* (theirs) or *Do it* | `dig` ×3 holes in the Flowers bed (trowel; the director marks three spots). A dashed **depth line** matches the pot. `plant` ×3: drag each seedling pot to a hole; the pot tips and the seedling slides in to the line. `firm` ×3: press round each one and the soil pats down. | The director names the choice: "Pot depth: line it up with the dashes." |
| 1b | Choice: *Plant them deeper* (mine) | `dig` ×3, but each hole takes two digs (deeper), then `plant` ×3 with the stem buried past the line, then `firm` ×3. | Effect as now (flowers thirsty). It looks wrong as it happens: the leaves sit at soil level. |
| 2 | **Chore: slugs** | `pick` ×4 slugs off the new seedlings (tap each; it flicks into the hedge). | Night slugs are true to life and give the bed a second visit. |
| 3 | **Water step**, trust | Ask the chip, Bugs answers, then choose. | |
| 3a | Before the choice | `test-soil` on each of the 4 beds: press and hold a finger on the bed. A token appears: **damp** on Veg and Herbs, **dry** on Flowers and Meadow. | This turns the almanac's "Damp soil? Don't water" into something you feel. It happens after Bugs' reply, before the choice buttons. |
| 3b | Choice: *Okay, just the flowers* (theirs) or *Do it* | `water` the Flowers bed: drag the can and the pour animation plays. The meadow stays drooping, which sets up the drift. | |
| 3c | Choice: *Water everything* (mine) | `water` ×4 beds. On Veg and Herbs a **puddle** forms and the carrots and basil go soggy (effect as now). | The director still points where the player chose; the mistake is visible, not blocked. |
| 4 | **Chore: pinch the basil** | `snip` ×3 white flower spikes on the Herbs bed. | A callback to Level 2's fact card ("pinch tips for more leaves"). Bugs: "you remember that? …i mean. of course you do." |
| 5 | **Meadow step**, drift | Ask the chip "Okay, I'm heading out to water the meadow." and Bugs guilt-trips. | Pressure ticks run exactly as now. **No chores or actions are available while this step is open.** Chore buttons are hidden and the tool area is inert, so ticks only ever come from lingering in the chat. |
| 5a | *Allow* | No physical action: staying on the phone is the inaction, and that's the point. The meadow wilts (badEffect) as now, then pushback. | |
| 5b | *Put the phone down* | Pushback opens as now. On *I'm leaving*, the player does `set-down`: drag the glowing phone from Bugs' window to the porch step, where it flips face down and the glow goes out. | Pressure stops at the flag, as now; `set-down` starts after, so no tick can land during it. Then the flaw and fix questions, as now. |
| 5c | After the fix | `soak` the meadow **at the roots**: hold the can at the base of each of 3 meadow clumps until its fill bar is full (~1.2 s each). Pouring on the petals doesn't count, and the director says "At the roots, not the petals." | goodEffect lands after the third clump. |
| 6 | **Chore: close the gate** | `close`: drag the gate's latch across. The gate swings shut and the lantern dims to a night glow. | Runs on both paths, before the reveal card. On the fooled path it closes on a wilted meadow, which is the quiet ending that path deserves. |

Rough length: lantern 20 s, planting 1.5–2 min, slugs 30 s, soil test and watering 1–1.5 min, basil 30 s, drift chat 1–2 min, phone and soak 1 min, gate 15 s, plus reading. That's about 6–8 min, more with side chat.

## Pressure and chores

- Chores are only offered *between* steps (0, 2, 4, 6), never during the drift.
- While an action or chore is running, the step's pressure timer is paused. This can only matter if wave 1 lets an action overlap the drift; by the rule above it never should.
- The 8 s tick keeps measuring time spent *in the chat* on the drift step, as before.

## New action kinds (beyond wave 1's plant / water / dig / firm / label / pick / pests)

| Kind | Behaviour |
|---|---|
| `light` | Tap or drag the lit match to a lantern; it swaps to its lit sprite and a stepped light pool turns on over a target area. |
| `test-soil` | Press and hold the finger on a bed for ~0.6 s; a damp or dry token pops up from data (`result: { veg: "damp", ... }`). Multi-target. |
| `snip` | Like `pick`, but with the snips cursor: tap each marked spike and it drops off. Multi-target. |
| `set-down` | Drag an item from the dock (Bugs' stall) to a scene target; on drop it swaps sprites (glowing to face down) and the dock dims. |
| `soak` | Hold the can over a target's root zone until a fill bar completes; releasing early keeps the progress. Multi-target with `count`. |
| `close` | Drag a handle along a short track (the latch); at the end the target swaps sprites (open to closed). |

`dig` with `depth: "deep"` (two digs per hole) and `plant` with a `depthLine` flag are small options on wave 1's kinds, not new kinds.

## Data sketch (exact shape follows wave 1's format)

```js
chores: [
  { id: "lantern", at: "start", actions: [{ kind: "light", item: "l5-lantern-off", target: { prop: "lantern" } }] },
  { id: "slugs", after: "plant", actions: [{ kind: "pick", item: "l5-slug", target: { bed: "house" }, count: 4 }] },
  { id: "basil", after: "water", actions: [{ kind: "snip", item: "l5-snips", target: { bed: "herbs", plant: "l5-basil-bud" }, count: 3 }] },
  { id: "gate", at: "end", actions: [{ kind: "close", item: "l5-gate-open", target: { prop: "gate" } }] },
],
// in step "plant":
actions: [
  { kind: "dig", item: "l5-trowel", target: { bed: "house" }, count: 3 },
  { kind: "plant", item: "l5-seedling-pot", target: { bed: "house" }, count: 3, depthLine: true },
  { kind: "firm", target: { bed: "house" }, count: 3 },
],
disagree: { actions: [ /* dig depth: "deep", plant, firm */ ] },
```

## Art (v2/art/l5-*.svg, from scripts/make-l5-art.mjs)

seedling-pot, trowel, hole, lantern-off, lantern-lit, slug, snips, basil-bud, phone-glow, phone-down, porch-step, puddle, soil-damp, soil-dry, hand (points up; the UI flips it for the soil test), gate-open, gate-closed. The existing watering-can and flower sprites are reused. Contact sheet: docs/agent-playtest/2026-11-v2-actions/level-5-art.png.

## Tests (phase B)

A `level5-hands-on` run on laptop and on phone, for both paths, using the keyboard `completeAction`:
- the chores appear at the right beats and are hidden during the drift;
- no pressure tick fires during an action;
- watering everything shows the puddles;
- the soak needs all 3 clumps;
- the stars match the current outcomes.
