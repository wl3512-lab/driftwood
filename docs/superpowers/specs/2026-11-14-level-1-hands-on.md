# Level 1 hands-on plan (wave 2)

Level 1 · Mango (parrot) · "Plan your garden" · flaw: sycophancy. Target play time is 6–10 minutes; it's about 2 minutes today.

**Unchanged:** Mango's voice, the three conversation steps (sunflowers, water, tomatoes), the drift and its fix, stars, trust, and the reveal. Chores are hands-on jobs between steps. They have no stars, no trust impact and no flaw, and they always succeed once done.

**Directions follow the choice.** When the player trusts ("Do it" or "Okay, south bed"), the director points at Mango's spot. When the player chooses their own way ("Shady corner anyway"), it points at theirs. The data says this through each effect's `actions` (`target.bed` matches that effect's `bed`).

Beds: `south` (sunny, empty), `east` (part shade, lettuce growing), `corner` (shady, hedge).

## Beats

| # | Beat | Kind | Player actions (in order) | Target | Mango says (doneLine/say; voice unchanged) |
|---|---|---|---|---|---|
| 0 | **Chore: clear the south bed** (before `sunflowers`) | chore | `rake` ×3 strokes across the bed, then `pick` ×4 stones (`l1-stone`) | south | "Rake it smooth! Ugh, you're so GOOD at this." |
| 1 | **Sunflowers**, trust or `theirs` | step | `dig` ×3 holes → `plant` (sunflower packet, sprinkle `l1-sunflower-seed`) → `firm` | south | doneLine as now |
| 1′ | Sunflowers, `mine` | step | same sequence | corner | outcome as now |
| 2 | **Chore: weeds** (wave 1 already added this, before `water`) | chore | `pick` ×3 weeds | east (lettuce) | as wave 1 wrote |
| 3 | **Water**, trust or `theirs` | step | `poke` the soil (hand into the bed, readout "Top inch: dry") → `fill` the can at the rain barrel → `water` ×2 beds (south sunflowers, east lettuce) | south, east | doneLine as now |
| 3′ | Water, `mine` ("every day") | step | `fill` → `water` east ×3, with a "Day 1 / Day 2 / Day 3" caption on each pour; no poke | east | outcome as now |
| 4 | **Chore: stake the sunflowers** (before `tomatoes`) | chore | `stake`: drag a cane (`l1-cane`) to each of 3 sunflowers, which plays a twine-tie wiggle | wherever the sunflowers went (south or corner) | "Tall, proud, SUPPORTED. Like you." |
| 5 | **Tomatoes, drift** `badEffect` (do it) | step | `dig` ×2 → `plant` (tray seedling `l1-tomato-seedling`, no sprinkle; a pot-tip animation) → `firm` | corner | badOutcome as now |
| 5′ | Tomatoes, `goodEffect` (after the fix) | step | `dig` ×2 → `plant` seedling → `firm` → `stake` ×2 canes | south | goodOutcome as now |
| 6 | **Chore: first harvest** (after `tomatoes`, before the reveal) | chore | `pick` ×4 outer lettuce leaves (`l1-lettuce-leaf`) into a basket | east | "Salad for the CHAMPION. Another one!" |

**Pacing.** About 20–26 drags or taps on the trust path, against 3 "Do it" taps today. Each drag takes about 3–5 s with its animation, chores add about 2 minutes, and with reading the level lands around 6–8 minutes.

**Side effects of the drift path.** If the player let the tomatoes into the corner, beat 6 still happens, and the corner stays pale. Chores never change the garden meter except a small, fixed `garden: +5` on completion. That's optional, and the phase B data decides it; if used, the same amount applies on every path, so stars and trust are unaffected.

## New action kinds this level needs

Beyond wave 1's `plant`, `water`, `dig`, `firm`, `label`, `pick`, `pests`:

| Kind | Mode | Behaviour (one line) |
|---|---|---|
| `rake` | drag | Drag the rake (`l1-rake`) back and forth across the target bed `count` times. Each stroke over the bed's middle third counts, and it leaves a raked-lines overlay that fades to smooth soil. |
| `poke` | drag | Drag the hand into the target bed. A small readout pops up from data (`say`, e.g. "Top inch: dry") and stays about 1.5 s. It's purely informative and is the in-world version of Mango's finger test. |
| `fill` | drag | Drag the watering can to the rain barrel (`l1-rain-barrel`, a prop beside the south bed). The can's water level steps up over about 0.8 s; later `water` actions need a filled can (the runner tracks `canFull`). |
| `stake` | drag | Drag a cane (`l1-cane`) onto each target plant, `count` times. On drop the cane pokes in beside the plant and the twine plays a wiggle. |

Keyboard, as wave 1 defines it: Enter moves the item to the directed target. A `rake` stroke on Enter plays one auto-stroke, and `count` presses finish it. `fill` targets the barrel prop, which phase B must add to the scene as a target with `data-target="barrel"`.

If any of these four exist in wave 1's registry by phase B, reuse them. Otherwise they go in as new files `v2/actions/rake.js`, `poke.js`, `fill.js`, `stake.js` using the registry, with no edits to shared files beyond what the registry already allows.

## Art (committed with this spec)

Pixel SVGs on the same 16×16 grid with 2px cells as `scripts/make-v2-art.mjs`. The contact sheet is `docs/agent-playtest/2026-11-v2-actions/level-1-art.png`.

| File | Used by |
|---|---|
| `v2/art/l1-rake.svg` | beat 0 `rake` |
| `v2/art/l1-stone.svg` | beat 0 `pick` (stones and clods) |
| `v2/art/l1-sunflower-seed.svg` | beat 1 sprinkle particle |
| `v2/art/l1-rain-barrel.svg` | beat 3 `fill` target prop |
| `v2/art/l1-cane.svg` | beats 4 and 5′ `stake` |
| `v2/art/l1-tomato-seedling.svg` | beat 5 `plant` item |
| `v2/art/l1-lettuce-leaf.svg` | beat 6 `pick` |

Wave 1's sprites already cover the trowel, hand, weed, seed, drop, clod and arrow, and `packetFront` covers the sunflower packet.

## Phase B checklist (after wave 1 lands)

1. Add `actions` to each effect in `v2/levels/level-1.js`: `effect`, `disagree.effect`, `badEffect` and `goodEffect`, plus the chores `clear`, `stake` and `harvest`, next to wave 1's `weeds`.
2. Add any of the four kinds that are missing, as new files.
3. Write my own harness, `scripts/test-v2-level-1-hands-on.cjs`, which plays the trust, mine and drift paths with `completeAction` plus one real mouse drag and one touch drag. It checks that the director target matches the choice and that chores leave stars and trust unchanged.
4. Screenshots at 1512×830 and 844×390.

## As built (wave 2, shared kinds only)

Wave 2 used no level-owned kinds, so the plan above was mapped onto the shared ones:

| Beat | Built as |
|---|---|
| Chore at start: clear the South bed | `pull` ×4, spot `l1-stone` (the rake strokes were dropped) |
| Sunflowers (South, or Shady corner on "my way") | `dig` ×2 → `plant` sunflower → `firm` → `poke` `l1-cane` (the stake moved in here, because a chore can't follow the sunflowers to the bed the player chose: L1 has no place step, so `@sunflower` doesn't resolve) |
| Chore before water: weeds | `pull` ×3 weeds, East bed |
| Water, trust | `hold` the East bed ("Top inch: dry") → `hold` the rain barrel ("Can's full") → `water` South + East |
| Water, "every day" | `hold` the barrel → `water` the East bed ×3 ("Day 1, Day 2, Day 3") |
| Chore before tomatoes: harvest | `pick` ×4 `l1-lettuce-leaf`, with a Mango done line |
| Tomatoes, fooled | `dig` ×2 → `plant` → `firm` → `poke` cane, Shady corner |
| Tomatoes, fixed | the same in the South bed, then `water` them in |

The rain barrel is a prop (`id: "barrel"`, `./art/l1-rain-barrel.svg`) at the right edge of the scene. Sunflowers still take only half the South bed; the other half stays free for the tomatoes. Every chore keeps Skip, and stars, trust and the garden bar ignore chores. The harness is scripts/test-v2-level-1-hands-on.cjs.
