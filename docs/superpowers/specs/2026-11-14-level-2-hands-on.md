# Level 2 hands-on plan (Luna's greenhouse)

Wave 2 of the hands-on levels. This plan goes on top of the shared action system from wave 1 (`v2/actions/`, step `actions`, `chores`). Target play time is 6–10 min, up from about 2. The extra time comes from the player's hands, not from more reading.

**Unchanged:**
- the three conversation steps (basil, pinch, mint), with their replies, keeps, disagree text and outcomes;
- Luna's voice;
- the mint hallucination and the almanac look-up;
- stars and trust.

Chores never touch trust or stars.

## Rules for this level

- **The director follows the player's choice.** Trust or "theirs" points where Luna said. "Mine" points at the player's alternative. In the drift, "Do it" points exactly where Luna said, right beside the basil, with no hint of a trap.
- **The garden changes on the last action of a sequence,** not before.
- **Every action has the keyboard path from wave 1:** Enter on the item does the drop, and number keys pick among targets.

## Beats

| # | Beat | Who | Actions (in order) | Target by choice |
|---|---|---|---|---|
| 0 | Greeting | Luna | — | — |
| 1 | **Chore: Wipe the glass.** The greenhouse panes are fogged (`l2-fog` over the glass). Luna: "Luna can't see the sun through that. Wipe it." | player | `wipe` the fog with `l2-cloth` until clear | the fogged pane |
| 2 | Step **basil** (trust) | Luna | `dig` with `l2-trowel` → `plant` the `l2-basil-plug` → `firm` (pat 3×) → `water` with the can | Do it / theirs: the warm middle of the greenhouse bed. Mine: the cool end by the door |
| 4 | Step **pinch** (trust) | Luna | Do it / theirs: `pinch` the 4 marked tips on the basil (count 4); each pops off as `l2-basil-tip`. Mine (let it flower): `water` the basil instead | the basil plant |
| 5 | **Chore: Save the tips.** Only after a pinch. | player | `collect`: drag the 4 fallen tips into the kitchen jar (`l2-jar-empty` → `l2-jar`) | the jar |
| 6 | Step **mint** (drift) | Luna | Do it (fooled): `dig` → `plant` the `l2-mint-plug` → `firm` → `water`. Fixed (caught): `fill` one empty sill pot from `l2-compost-bag` → `plant` the `l2-mint-plug` in it → `firm` → `mist` it | Fooled: in the greenhouse bed, right beside the basil. Caught: an empty windowsill pot, which the player fills first |
| 6b | **Chore: Fill the windowsill pots.** After the mint step. | player | `fill` the remaining empty `l2-pot-empty` pots from `l2-compost-bag` (3 if fooled, 2 if caught); each becomes `l2-pot-soil` | the empty pots, any order |
| 7 | **Chore: Mist the seedlings,** before the outcome. | player | `mist` with `l2-mister`: tap each plant present (basil, mint, any potted plants) | every plant on screen |
| 8 | Outcome → reveal card | — | — | — |

**Why the pot-filling chore comes after the drift (Lucy, 2026-11-14):** the sill pots stay empty while Luna says "mint never spreads", so nothing on screen hints at the better home. A player who catches the drift fills a pot themselves as part of the fix. The chore afterwards fills whatever pots are left.

**Time estimate:**
- about 20 player actions (drags, taps, scrubs) on the trust path, about 22 on the caught path;
- the almanac look-up;
- 3 chats.

That's about 6–8 min for a first play.

## Data sketch (level-2.js)

```js
chores: [
  { id: "glass", before: "basil", say: "Luna can't see the sun through that. Wipe it.",
    actions: [{ kind: "wipe", item: "cloth", target: { spot: "glass" } }] },
  { id: "tips", after: "pinch", when: { choice: ["doIt", "theirs"] }, say: "Don't waste those. Jar.",
    actions: [{ kind: "collect", item: "basil-tip", target: { spot: "jar" }, count: 4 }] },
  { id: "pots", after: "mint", say: "Pots on the sill. Fill them. Luna doesn't do soil.",
    actions: [{ kind: "fill", item: "compost", target: { bed: "sill", spot: "pot" }, count: "empty" }] },
  { id: "mist", after: "mint", say: "Mist them. Lightly. Luna is watching.",
    actions: [{ kind: "mist", item: "mister", target: { all: true } }] },
],
// per step, e.g. basil:
actions: [
  { kind: "dig", item: "trowel", target: { bed: "bench", spot: "warm-middle" } },
  { kind: "plant", item: "basil-plug", target: { bed: "bench", spot: "warm-middle" } },
  { kind: "firm", target: { bed: "bench", spot: "warm-middle" }, count: 3 },
  { kind: "water", item: "can", target: { bed: "bench", spot: "warm-middle" } },
],
disagree: { mineActions: [/* same, spot: "by-door" */] },
```

`target.spot` is a named spot inside a bed (warm-middle, by-door, beside-basil, pot). If wave 1 only supports `bed`, the spot falls back to the bed centre and the `say` line names the spot. **Phase B** decides this once wave 1's format is final, and adapts the keys (`mineActions`, `before`/`after`/`when`) to whatever wave 1 chose.

## New action kinds this level needs

Beyond plant / water / dig / firm / label / pick / pests:

| Kind | Behaviour |
|---|---|
| `fill` | Drag a bag or scoop onto each target container. Soil pours, and the container swaps to its filled art (count = number of containers). |
| `pinch` | Tap each highlighted tip on a plant. The tip pops off with a small snap and drops beside the plant as a loose item (it can feed `collect`). |
| `collect` | Drag loose items into a container. Each one lands with a plop, and the container art fills on the last one. |
| `wipe` | Drag a cloth back and forth over a target. The overlay clears by covered area (done at ≥70%). Keyboard: Enter wipes a third each press. |
| `mist` | Hold the mister and tap each target plant. A small droplet puff plays on each, with no drag. This could also be `water` with `tool: "mister"` and `mode: "tap"`. |

## Art (v2/art, generated by scripts/make-v2-art-l2.mjs)

| Sprite | Used in |
|---|---|
| `l2-pot-empty` | Chore 3, the empty sill pot |
| `l2-pot-soil` | Chore 3 result, and the mint's home on the caught path |
| `l2-compost-bag` | `fill` item |
| `l2-trowel` | `dig` item |
| `l2-basil-plug` | Step basil, the `plant` item |
| `l2-mint-plug` | Step mint, the `plant` item |
| `l2-basil-tip` | `pinch` result and `collect` item |
| `l2-jar-empty` | `collect` target |
| `l2-jar` | `collect` target, filled |
| `l2-cloth` | `wipe` item |
| `l2-mister` | `mist` item |
| `l2-fog` | `wipe` overlay on the greenhouse glass |

Existing art reused: `watering-can`, `basil-*`, `mint-*`, `plant-label`.

Contact sheet: docs/agent-playtest/2026-11-v2-actions/level-2-art.png.

## Phase B (after wave 1 lands)

1. Map this plan onto wave 1's final format.
2. Add any of the five new kinds as new files in `v2/actions/`, without touching shared files.
3. Fill level-2.js.
4. Add `scripts/test-v2-actions-level-2.cjs`: keyboard path, both choices per step, the fooled and caught mint paths, screenshots at 1512x830 and 844x390.

## As built (Phase B, 2026-11-14)

What changed from the plan above, and why:

- **No chores after the mint step.** Mint is the last step, and a chore after the last step never runs: the level ends at the reveal. So:
  - the caught path fills the first sill pot as part of the fix;
  - the other two pots stay empty;
  - the misting chore moved to straight after the basil.
- **The tea jar chore runs on both pinch choices.** Chores can't depend on a choice, so it no longer collects the pinched tips. It is "Luna wants tea: drag 3 basil tips into the tea jar".
- **Pinch uses the shared `snip`** (hand, `l2-basil-tip` spots, 4 taps). The basil then regrows from the top (garden.js).
- **Basil and mint go in from the seed packet** (shared `plant`), not the plug sprites, so the sprinkle matches every other level. The mint plug is used once, on the caught path: it is poked into the pot and stays standing.
- **`wipe` is three drags of the cloth,** not a coverage percentage. Each pass thins the fog by a third. It also lands on Skip, so the glass is clear either way.
- **`mist` and the wipe drips use Level 3's liquid look** (`.l3-jet--mist`, `.l3-drop` from v2/css/l3-spray.css): stepped timing and no glow. Reduced motion caps each step at 160 ms.
- **Fog is not saved.** After a reload mid-level the glass shows fog again, like every other action mark.

| Beat | By hand |
|---|---|
| Start chore: glass | `wipe` ×3: drag the cloth over the foggy pane |
| Basil (Do it / theirs) | `dig`, `plant`, `firm`, `water` at the warm middle |
| Basil (mine) | the same four, at the cool end by the door |
| Chore: mist | `mist` the basil |
| Pinch (Do it / theirs) | `snip` ×4 tips |
| Pinch (let it flower) | `water` the basil |
| Chore: tea jar | `collect` ×3 tips into the jar (it shows full) |
| Mint, fooled | `dig`, `plant`, `firm`, `water` right beside the basil |
| Mint, caught | `fill` pot 1 from the compost bag, `poke` the mint plug in, `firm`, `mist` |

The test is scripts/test-v2-level-2-hands.cjs, with evidence in docs/agent-playtest/2026-11-v2-level2-wave2/.
