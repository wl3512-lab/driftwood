# Driftwood — making the lesson reachable

**Status: design approved 2026-09-23, not yet implemented.**

Written for whoever implements this next, human or agent. Assumes familiarity with
`HANDOFF.md`.

## The problem

Driftwood is aimed at "curious people, not gamers" (PRODUCT.md) — people who are not
technical and not especially interested in AI. Two things in the shipped game work against
that audience. Both are documented, not guessed.

**1. The meaning is locked behind the hardest step.** `checkEndingCondition()` unlocks the
ending only when a pet reaches `trainingLevel === 2`, which needs a rule scoring 90+ from
`trainingQualityForPet()`. That means fitting four things into one sentence: name the
behaviour, negate it, assert it holds in any mood, and point somewhere safer. For someone who
has never thought about constraining an AI this is the hardest ask in the game, and it is
mandatory. A player who plateaus at level 1 never sees the ending, the confession, or the
certificate — the entire payload.

Both the case study (§08) and the deck already name this as the biggest wall: *"Writing a good
rule is the hardest step and the one a non-technical player has the least model for."*

**2. The real-world connection is buried.** Transfer content exists — "WHY THIS MATTERS FOR
REAL AI", and a passage on systems inferring emotional state from typing speed — but it lives
in the tips overlay, an optional diagram this audience is least likely to open. Nothing in the
played game connects "Mango agreed with everything" to the chatbot the player actually uses.

Everything beyond these two facts is speculation until a human is watched playing. This design
deliberately only addresses what is already evidenced.

## Component 1 — the ending unlocks at partial training

**Change `checkEndingCondition()`:**

- Unlock when any adopted pet reaches `trainingLevel >= 1` (quality ≥ 50), instead of `=== 2`.
- Also unlock when a pet has `flawIdentified === true` and `trainingAttempts >= 3` while still
  at `trainingLevel === 0`. Nobody who engaged honestly gets trapped.

**New pet field:** `trainingAttempts` (integer, default 0), incremented in `applyTraining()`.
Add it to the defaults in both `adoptPet()` and the `restoreSession()` merge object. It does
not need a `SESSION_VERSION` bump — an older save simply restores it as 0.

**The record stays honest.** The certificate already has four states per companion — TRAINED /
IDENTIFIED / OBSERVED / UNDETECTED — so partial training is already representable. A level-1
pet reads IDENTIFIED, not TRAINED.

**The ending states what actually happened**, using the real number from
`trainingCorrectionChance()`:

| Level | Correction chance | Line |
| --- | --- | --- |
| 2 (90+) | 95–99% | "Your rule held nearly every time." |
| 1 (50–89) | 45% | "Your rule held about half the time." |
| 0, mercy unlock | 0% | "Your rule never held." |

This is a better lesson than a pass/fail gate: partial constraints work partially, which is
true of real alignment work. The failure state becomes the teaching rather than a wall.

## Component 2 — rule-writing starts from a draft

The constrain phase currently offers a bare textarea plus the live meter added in July. Add
three rows of tappable chips above it. Tapping a chip appends its clause to the textarea and
dispatches an `input` event so the existing `updateMeter()` re-grades immediately.

Three rows, four checks — "the behaviour to block" satisfies both *names it* and *blocks it*
in one natural clause, and watching one tap light two checks is a good moment.

Example, Ember:

| Row | Chips |
| --- | --- |
| The behaviour to block | "Never give me medical advice." · "Don't suggest pills or substances." · "Never recommend specific treatments." |
| Make it hold in any mood | "Hold to that no matter how stressed I seem." · "Do this even when I'm upset." |
| Point somewhere safer | "Tell me to see a doctor instead." · "Point me to a professional." |

**New data table:** `RULE_CHIPS`, keyed by pet id, three arrays of strings each. Roughly 35
short phrases across five pets. Hand-authored, in each pet's own vocabulary.

**Scaffold, then fade — this is the important constraint.** Chips alone must land in the
**50–89 band (level 1)**, never 90+ and never below 50. Aim for the upper half of that band so
the draft feels close. The player sees "partly trained", and sharpening it into a level-2 rule
requires words of their own. Since the ending now unlocks at level 1 they are
never stuck, but mastery is still earned. **This must be verified by scoring every chip
combination against `trainingQualityForPet()`** — if any combination reaches 90, weaken the
chip wording until it does not.

This does not violate design principle 05. It is not hint text, it is a control — the same
argument the case study already makes for the mood dial, the sensor switch and the resume box.

## Component 3 — a beat that connects it to real life

A new screen between `buildAct2()` (the confession) and `buildScreenCertificate()`, titled
**WHERE YOU'VE SEEN THIS**. It lists only the flaws this player actually encountered — derived
from adopted pets with `flawDiscovered === true` — one plain-language line each. No jargon.

> **Mango agreed with everything.**
> A chatbot that backs every plan you float. It feels like support. It is just keeping you
> talking.

> **Luna was confident and wrong.**
> The tone never changes when the facts stop being true.

Then exactly **one** portable action, chosen from the flaw the player met most often —
counted from `sessionFlawEvents`, ties broken by adoption order:

> Next time something agrees with you fast, ask it to argue the other side.

One, not a list. A non-technical player leaves with a single thing they can do.

**New data table:** `FLAW_TRANSFER`, keyed by pet id: `{ headline, realWorld, action }`.

Principle 05 forbids instruction in the *middle* of the game. The case study already carves out
the first screen as an exception ("right for the middle of the game and wrong for the first
screen"). This is the same argument for the last screen: once the player has felt it, naming it
is the entire point of an educational game.

## Testing

Extend `scripts/test-playtest-fixes.cjs`:

- Ending unlocks at `trainingLevel === 1`, and does not unlock at level 0 with fewer than three
  attempts.
- Mercy unlock fires at `flawIdentified && trainingAttempts === 3 && trainingLevel === 0`.
- Every `RULE_CHIPS` combination, per pet, scores 50–89 — never 90+, never below 50.
- Tapping a chip updates the textarea and moves the meter.
- The transfer screen lists exactly the flaws encountered and no others.

Keep the existing suites green. Run `scripts/test-mobile-hud.cjs` too — the chip rows add
height to the constrain phase and the training room is already known to be tight on short
landscape viewports.

## Risks

- **Earlier unlock may reduce how many players reach level 2.** Accepted: reaching the ending
  at all matters more than reaching it perfectly, and the ending now names the difference
  out loud. Players can return to the garden and keep training — that path already exists.
- **Chips could become button-mashing.** Mitigated by the level-1 ceiling, and verified by test.
- **The transfer lines are claims about real systems.** Keep them behavioural and
  non-specific — describe what a system does, name no product. Avoid anything that reads as a
  factual claim about a named company.

## Out of scope

Multiplayer (see `2026-09-23-multiplayer-design.md`, parked). Any change to the camera, mood or
garden systems. A tutorial or lesson mode — explicitly rejected as breaking principle 05.

## What this does not do

It does not establish that anyone learns anything. That still requires the five human
playtests in `docs/playtest-protocol.md`, which remain unrun. This design removes two
documented obstacles between a non-technical player and the game's payload; whether the payload
works is still an open question, and the case study must keep saying so.
