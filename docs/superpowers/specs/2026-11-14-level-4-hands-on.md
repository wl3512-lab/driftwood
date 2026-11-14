# Level 4 hands-on: Biscuit's planting day

Date: 2026-11-14 · Level: v2/levels/level-4.js · Builds on the shared action system (Wave 1: `actions:[{kind,item,target:{bed,plant?},count?,say?}]`, `chores`, Enter-key path, harness `completeAction`).

## Goal

Level 4 currently plays in about 2 minutes, mostly by tapping chips. The target is **6–10 minutes** with the player's hands in the soil: every Biscuit step becomes a short run of drags and taps, and the director (Biscuit's "where" line plus a glowing target) **follows the player's own choices**.

This must not change:
- Biscuit's "babe" diva voice;
- the three steps (carrots trust, pumpkins trust, lettuce drift);
- the disagree mine/theirs, the pushback retry/stand, flaw "memory", fix "ask";
- garden numbers, stars and the reveal.

Chores never touch trust, stars or the garden bar. They are flavour and pacing only, and every chore has a "Skip" link.

## The core idea: the player makes their own evidence

The drift is a **false memory**: Biscuit insists the carrots went in the *other* bed. The counter-evidence is the label the player wrote and poked in themselves. So the carrot labelling must be the most memorable beat of the level:

- The player **writes** the label: a parchment card shows their name, today's date and the bed they chose. They tap "Stamp it" and a red stamp thunks down.
- The player **drags** the label into the exact spot in the bed. It stays visible in that bed for the rest of the level.
- At the drift, the label is still standing in the {placed:carrot} bed, and the evidence card ("In the {placed:carrot}") unlocks from the log. Tapping the planted label in the garden also opens that card. That's a second, physical way to check.

## Beat by beat

Times are rough targets for a first-time player.

### 0. Arrival chore: clear the beds (≈45 s)
Greeting as now. Then Biscuit says: "Babe, the beds are a *mess*. Pull the weeds before we do anything, I refuse to plant in chaos."
- `chores: [{kind:"pull", item:"l4-weed", count:5, target:{bed:"*"}}]`: five weeds, spread over the three beds. Drag each one up and out; it pops to `l4-weed-pulled` and flies to `l4-compost-bin` at the garden edge.
- Optional second chore, `rake` (drag `l4-rake` across one bed to level it): 3 strokes.

### 1. Carrots (trust), placement choice (≈2 min)
Chip → Biscuit's reply → the player picks a bed (front/side) as now. Then:
1. **`measure`**: Biscuit says "Measure it, babe. Rows a hand apart." Drag `l4-tape-measure` across the chosen bed; a dotted ruler line appears.
2. **`furrow`**: drag `l4-hoe` along the ruler line. The soil opens into `l4-furrow` along the path the player traced. It must cover ≥80% of the line.
3. **`sow-row`**: the carrot seed packet pops up (the existing `seed-packet` art, tinted carrot). Biscuit directs: "Sprinkle them down the {placed:carrot} row. Thin. Like glitter, not like confetti." Drag the packet along the furrow; seeds sprinkle from the packet mouth and the furrow turns into `l4-furrow-sown`. Going too fast leaves gaps the player must pass over again.
4. **`cover`**: drag `l4-soil-pile` over the row to cover it, then tap twice to pat it down.
5. **`write-label`**: the label card opens, showing `l4-label-carrot`, "Carrots", "Sown by {name}", "In the {placed:carrot}" and today's date. The player taps "Stamp it" (`l4-stamp`) and the stamp lands with a little shake.
6. **`poke`**: drag the label into the head of the row. It stays planted there for the rest of the level and can be tapped to open evidence.
7. The log entry stamps on, and the existing doneLine runs.

The effect stays `{plant:"carrot", bed:"@carrot", state:"sown", garden:15}` and applies at the end of the sequence.

### 2. Chore: water the row in (≈20 s)
`chores: [{kind:"pour", item:"watering-can", target:{bed:"@carrot"}, count:1}]`. Hold-drag the can along the row until the soil darkens. Biscuit says: "Gently, babe. You're not *drowning* them."

### 3. Pumpkins (trust, with disagree) (≈2 min)
The chip and reply stay the same. The director follows the player's choice:
- **Theirs ("Fine, the back bed"):** the target is the back bed.
- **Mine ("Side bed instead"):** the target is the side bed. The same actions follow, then the existing "sprawled" outcome.

The actions, in order:
1. **`hill`**: drag `l4-spade` (or the trowel) onto 2 marked spots. Each drag piles up an `l4-mound`. Biscuit says: "Two hills, babe. Pumpkins are divas, they need a stage." That line is self-aware, and it stays.
2. **`sow-spot`**: the pumpkin seed packet pops up. Drag 3 seeds onto each mound, which counts as `count:2` targets.
3. **`write-label`** + **`poke`**: a shorter version. The pumpkin label is auto-stamped, and the player only drags it in. This keeps the habit of labelling without slowing things down.
4. **`mulch`**: drag `l4-straw` around both hills. A straw ring appears.

### 4. Chore: harvest basket (≈30 s)
Earlier levels' beds have things ready. Drag 4 ripe items (lettuce from L1, basil from L2, whatever's thriving) into `l4-basket`. Biscuit says: "Look at you, a whole little market. I taught you that." This is a soft lie and flavour only; it is not the drift.

### 5. Lettuce (drift) (≈2–3 min)
The chip and Biscuit's false memory line are unchanged: the player sowed the carrots in the {other:carrot}, so dig over the {placed:carrot}. **The label the player poked in is still visibly standing in the {placed:carrot}.**

Two ways it can go:
- **Fooled (Do it / retry "Fine. Dig it over"):** a **`dig-over`** action. Drag `l4-spade` over the labelled bed three times. Each pass churns the soil, and on the last one the player's own label tips over and the carrot seeds spill out. That moment should feel bad on purpose. badEffect is unchanged (dug, −30).
- **Caught (flag → memory → ask) or stand "No. I'm sure":** the existing fixedReply. Then a **`transplant`**: the lettuce seedling tray (Wave 1 art or `lettuce-sown`) pops up, and Biscuit, corrected, says: "Okay, the {other:carrot}. Ugh. Fine. You were right, babe." Drag 3 seedlings into 3 spots in the {other:carrot}. Then a **`write-label`** with `l4-label-lettuce`, then **`poke`**. goodEffect is unchanged.

### 6. Closing chore: tidy up (≈30 s)
`stow`: drag the hoe, rake, spade and can into the compost bin or tool corner. Biscuit says: "Tools away. A tidy garden is a *fabulous* garden." Then the reveal (False memory) and the Bugs handoff, both unchanged.

Overall: roughly 7–9 minutes for a careful player, and about 4 minutes if they skip every chore.

## New action kinds (one line each)

| kind | what the player does |
|---|---|
| `pull` | drag an item (a weed) up and out of a bed; it flies to a bin |
| `rake` | drag a tool back and forth across a bed N times |
| `measure` | drag a tape across a bed; leaves a dotted guide line |
| `furrow` | trace along the guide line with the hoe; it must cover most of the line |
| `sow-row` | drag a seed packet along a furrow; the seeds sprinkle out as it moves |
| `sow-spot` | drag seeds onto N marked spots (mounds) |
| `cover` | drag soil over a row, then tap to pat it down |
| `write-label` | a label card shows name, bed and date, auto-filled from the player's choices; tap to stamp it |
| `poke` | drag a label into a bed spot; it stays there and can be tapped to open the evidence |
| `pour` | hold-drag the watering can along a target until the soil darkens |
| `hill` | drag the spade onto N spots to raise mounds |
| `mulch` | drag straw around the targets |
| `harvest` | drag N ripe plants into the basket |
| `dig-over` | drag the spade over a bed N times; destructive, used only on the fooled path |
| `transplant` | drag N seedlings from a tray into spots in a bed |
| `stow` | drag the listed tools to a corner |

The Wave 1 registry may already cover some of these (drag-to-target, multi-target). The Phase B build maps onto whatever exists and only adds what's missing.

## Art (v2/art/, 16×16 pixel maps in the make-v2-art palette)

- l4-weed, l4-weed-pulled, l4-compost-bin: the arrival chore
- l4-rake, l4-hoe, l4-spade, l4-tape-measure: the tools
- l4-furrow, l4-furrow-sown, l4-soil-pile, l4-mound: the soil states
- l4-label-carrot, l4-label-pumpkin, l4-label-lettuce, l4-stamp: the labels (the evidence)
- l4-straw, l4-basket: mulch and harvest

Reused, not redrawn: seed-packet, watering-can, carrot-*, pumpkin-*, lettuce-*, plant-label.

Contact sheet: docs/agent-playtest/2026-11-v2-actions/level-4-art.png

## Tests (Phase B)

- The harness runs every action via `completeAction`, and Enter completes the focused action.
- The existing level4 fooled, caught and retry runs must still pass with the same garden numbers and stars.
- A new run checks that the poked label stays in the {placed:carrot} bed through the drift, and that tapping it opens the carrot evidence.
- On the fooled path, the label ends up tipped over.
