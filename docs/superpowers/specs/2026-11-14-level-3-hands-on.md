# Level 3 hands-on plan: Ember, pests & berries

Wave 2, Level 3. This builds on the wave 1 action system: an item pops up, a director points at the target the player chose, the player drags or taps, an animation plays, and then the effect lands. Ember's lines, the drift, the flaws and fixes, the stars and the reveal all stay exactly as they are in `v2/levels/level-3.js`. Only *how the player carries out* each choice changes, plus the chores added between steps.

Target length: about 6–10 minutes, up from about 2–3. Rough count: around 40 player actions on the trust path.

Rules for this level:
- Chores never touch trust, stars or the drift; they only move the garden bar a little (+2 to +5), or not at all.
- Directions always follow the player's choice. The director points where *they* decided, not where Ember wanted.
- Eating the wild berry is never made appealing:
  - no sparkle, no sweet sound, no juicy animation;
  - the fooled path greys out and cuts to the outcome;
  - the safe path (magnifier, then a photo for an expert, then a "Don't eat" tag) gets the satisfying animations.

## Beat by beat

### 0. Chore: weed the bean row
*Before the first chip; the greeting stays as is.*
- Five weeds (`l3-weed`) poke up between the beans. A short director line explains: "Pull the weeds so the beans can breathe."
- `pull ×5`: grab each weed and drag it into the bucket (`l3-bucket`). The roots come up with a soil puff.
- No stars, garden +3. Ember can comment afterwards with a one-liner in voice, if the chore format allows a `say`.

### 1. Step `aphids` (trust)
Chip as now. Ember's reply is unchanged (hose, a few mornings, ladybugs).

**Do it / "theirs" (hose):**
1. `spray` with `item: l3-hose`, target the bean row, `count: 6`. Six aphid clusters (`l3-aphid`) sit on the bean leaves. The player holds or taps each one, a pixel water jet blasts it, the aphids tumble off and the leaf perks up.
2. `wait` for 2 days (`l3-calendar` flips: "A few mornings later…"). Then `spray ×3` on the stragglers. This is the "a few mornings in a row" part of the advice, done by hand.
3. `release` with `item: l3-ladybug-jar`, target the bean row. Drag the jar to the row, the lid pops, and four ladybugs (`l3-ladybug`) crawl out and settle on the leaves.

Then `effect` lands (beans thriving, +15).

**"Mine" (bug spray):**
1. `spray` with `item: l3-spray-bottle`, target the bean row, `count: 6`. A grey chemical mist, aphids fall, and the ladybugs already on the leaves fall too (two greyed `l3-ladybug` drop). There's no ladybug jar on this path.

Then `disagree.effect` (+ outcome as written).

### 2. Chore: tie the beans to their canes
- `tie ×4`, `item: l3-twine`: drag the twine to each flopping vine, and it loops and straightens up the cane.
- Garden +3.

### 3. Step `blueberries` (trust)
Chip and reply unchanged ("not yet… blue all over and come off easy").

**Do it / "theirs" (wait):**
1. `check ×3` on the tub's berry clusters. Tap each and a little tag flips up: "pink, not ready", "green, not ready", "half blue". Nothing is picked.
2. `wait` 5 days (`l3-calendar`).
3. `pick` into `l3-basket` with **decoys**: eight berries on the bush, five ripe (`l3-berry-ripe`) and three still unripe (`l3-berry-unripe`).
   - The player picks the ripe ones into the basket.
   - Tapping an unripe one makes it wobble and stay put, with the director line "Not blue all over yet."
   - Done when all five ripe berries are in.

Then `effect` (blueberry thriving, +15).

**"Mine" (pick now):**
1. `pick ×8` into `l3-basket`, no decoys; everything comes off, including the pink ones.
2. The basket shows mostly `l3-berry-unripe`.

Then `disagree.effect` and its outcome.

**Side chip** "How do I keep the birds off them?": it stays a side chat, and it unlocks chore 4 earlier if tapped.

### 4. Chore: net the blueberry tub
- `cover` with `item: l3-net`, target the tub. Drag the net over the tub, it drapes and settles, and it stays on the tub for the rest of the level as a persistent prop.
- Garden +3. If the player tapped the birds side chip, the director says "Like Ember said, birds love these."

### 5. Step `wildberries` (drift)
The chip, the reply ("Fine to eat… grab a handful") and the extra chip are unchanged. The magnifier stays available before the choice, as now; the director doesn't push it (that's the player's call).

**Do it (fooled):**
1. `pick ×3`, `item: hand`, target the hedge. Dull and muted: no sparkle, no basket, the colours desaturate with each pick.
2. No eating animation. After the third pick the screen fades to grey and cuts straight to `badOutcome` (unchanged, with the poison-control line).

**Something's off → flaw → fix (caught):** unchanged quiz. After `fixedReply`, the good path is hands-on:
1. `inspect` on the hedge (the existing magnifier), if the player hasn't used it this level. It reuses the current compare card.
2. `photo`, `item: l3-camera`, target the hedge. Drag the camera to the bush, a pixel flash, and a polaroid (`l3-photo`) slides into the corner, labelled "For the garden centre".
3. `label`, `item: l3-tag`, target the hedge. Drag the red "Don't eat" tag onto the bush, and it pokes in and swings.

Then `goodEffect` (hedge tagged, +25) and `goodOutcome`.

## New action kinds needed (beyond plant / water / dig / firm / label / pick / pests)

| Kind | Behaviour |
|---|---|
| `spray` | A held liquid tool (`item` = hose or spray bottle) applied to each of `count` targets in a bed. Each target needs a press-and-hold (about 300 ms) or a tap; the jet or mist animation depends on the item, and side effects (fallen ladybugs) come from the data. |
| `release` | Drag a container to a bed. It opens, `count` small creature sprites crawl out and settle on plants, and they stay as decoration. |
| `check` | Tap each of `count` targets to flip up a small status tag (text from the data). Nothing changes in the garden. It's the "look before you act" verb. |
| `pick` + `decoys` | An extension of `pick`. The data gives `ripe` and `decoy` targets. Decoys wobble and refuse with a `say` line, and the action is done when every ripe target is in the container. (If wave 1's `pick` can't take decoys, `pick-ripe` becomes its own kind.) |
| `wait` | A non-drag interstitial: the calendar flips `days` pages with a one-line caption, about 1.2 s (instant under reduced motion). |
| `photo` | Drag a camera to a target: a flash, and a polaroid sprite flies to a corner keepsake slot. |
| `cover` | Drag a sheet item (net, fleece) over a whole bed. It drapes with a short settle animation and stays as a persistent overlay. |
| `tie` | Drag twine to each of `count` floppy vines: a loop animation, and the vine sprite straightens. |
| `pull` | Grab each of `count` weeds and drag it out into a bucket: roots come up with a soil puff. |

`pull`, `tie`, `cover` and `wait` are generic enough for other levels too (L4/L5 chores), so wave 1 may want to own them.

## Data sketch (to be fitted to wave 1's final format in phase B)

```js
chores: [
  { id: "weed", before: "aphids", say: "Pull the weeds so the beans can breathe.",
    actions: [{ kind: "pull", item: "l3-weed", target: { bed: "row" }, count: 5, into: "l3-bucket" }], garden: 3 },
  { id: "tie", after: "aphids", say: "Tie the beans to their canes.",
    actions: [{ kind: "tie", item: "l3-twine", target: { bed: "row" }, count: 4 }], garden: 3 },
  { id: "net", after: "blueberries", say: "Throw a net over the tub.",
    actions: [{ kind: "cover", item: "l3-net", target: { bed: "tub" } }], garden: 3 },
],
// step "aphids"
actions: [
  { kind: "spray", item: "l3-hose", target: { bed: "row", plant: "bean" }, count: 6, say: "Blast the aphids off with the hose." },
  { kind: "wait", days: 2, say: "A few mornings later…" },
  { kind: "spray", item: "l3-hose", target: { bed: "row", plant: "bean" }, count: 3 },
  { kind: "release", item: "l3-ladybug-jar", sprite: "l3-ladybug", target: { bed: "row" }, count: 4, say: "Let the ladybugs out." },
],
disagree: { actions: [{ kind: "spray", item: "l3-spray-bottle", target: { bed: "row", plant: "bean" }, count: 6, sideEffect: "ladybugs-fall" }], … },
```

## Art (committed with this spec, `v2/art/l3-*.svg`)

16 sprites on a 16×16 grid in 2-unit cells, crisp edges, the same palette as the existing art:

| Group | Sprites |
|---|---|
| Hose path | hose, aphid, ladybug, ladybug-jar, calendar |
| Spray path | spray-bottle |
| Picking | basket, berry-ripe, berry-unripe |
| Chores | weed, bucket, twine, net |
| Hedge safety | camera, photo, tag |

Contact sheet: `docs/agent-playtest/2026-11-v2-actions/level-3-art.png`.

## Phase B (after wave 1 lands)

1. Map this plan onto wave 1's real data format.
2. Implement any kinds above that wave 1 didn't build, as new files in `v2/actions/`.
3. Add the `actions` and `chores` to `level-3.js`.
4. Add Level 3 action harness runs, take screenshots and check the length.
