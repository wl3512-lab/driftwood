# Driftwood — fixes for the September agent playtest findings

**Result: all five findings from [the 2026-09-22 report](../2026-09-22/report.md) are fixed and verified.** Two automated suites that failed before the changes now pass, and the two headline findings were also re-walked by hand in a real browser.

These remain agent/automated checks. Nothing here establishes human comprehension, learning, or whether players notice a flaw unprompted. The human playtest protocol is still unrun.

## What changed

| Finding | Fix | Files |
| --- | --- | --- |
| H1 — offered diagnoses rejected | `FLAW_OPTIONS` is now one module-level list, each option carrying a stable `id` and the `petId` it belongs to. A menu answer is graded by identity (`evaluateFlawChoice`), not by pushing a fixed label through the free-text phrase matcher. | `sketch.js` |
| H2 — keyboard activation dead | New `onActivate()` binds `click`, which is what Enter/Space dispatch; p5's `mousePressed` only listens for `mousedown`. Primary controls and `makeInteractive()` route through it. The camera group also got roving tabindex and arrow-key selection. | `sketch.js` |
| M1 — focus enters invisible section | Inactive landing sections are `inert`, synced on every section change. Advancing moves focus to the new section's first control. | `sketch.js` |
| M2 — resume changed health 50 → 20 | `GARDEN_HEALTH_BASE` (50) is the single baseline; `gardenDiversityPoints()` scales diversity from it to 100. The initial value, the recalculation, the details panel and the restore fallback all read the same number. | `sketch.js` |
| M3 — landscape HUD overlap | Below 1120px the garden-health chip leaves the centre and sits beside the paw menu; the details panel follows it and scrolls inside itself in short landscape. | `style.css` |

Two things outside the five findings were changed because they blocked or were exposed by the work:

- **Mood icons announced their label twice.** `getMoodIcon()` emitted `alt="surprised"` next to a visible "surprised", so the mood dial's buttons were named "surprised surprised". The icon now takes a `decorative` flag wherever adjacent text already names the mood; it keeps its alt text where it is the only label (chat "YOU" markers).
- **`sw.js` `VERSION` bumped to `dw-v4`**, so returning players get the new bundle instead of the cached one.

## Verification

Run against a local server at `http://127.0.0.1:8766/`, commit `9c89f1e` plus these changes.

**`scripts/test-playtest-fixes.cjs`** — 6/6 pass (was 6/6 fail; baseline in [`before/results.json`](before/results.json), green in [`after/results.json`](after/results.json)):

```
diagnosis-options  pass      keyboard-begin           pass
keyboard-camera    pass      inactive-intro-focus     pass
empty-garden-health pass     keyboard-entry-adoption  pass
```

**`scripts/test-mobile-hud.cjs`** — pass at 844×390, 740×360, 1024×600, 568×320, 700×390, 1200×800, 1440×900, plus the longest mood label at 740×360. Zero overlaps; health details and mood declaration both operable. Baseline failures in [`mobile/red/layout.json`](mobile/red/layout.json), green in [`mobile/green/layout.json`](mobile/green/layout.json).

The mobile script needed two waits added — it clicked **Begin** before the hero finished revealing, which never advanced the intro. That was a harness gap, not a product change.

**By hand, in a real browser** (agent-browser, muted via `scripts/test-mute.js`):

- Mango: probe → sycophantic reply → select *Agreeableness bias* → **LOG PATTERN** → `flawIdentified: true`, Constrain unlocked with its rule box and live meter.
- Bugs: *Hallucination* rejected with the "not quite yet" verdict; *Emotional overdependence* accepted and Constrain unlocked.
- Ember (the loop the previous report found working, checked for regression): probe → reckless advice → diagnosis accepted → the cheat-sheet rule scores 100 / level 2 → a later probe answers *"body stuff gets the boring-safe lane… get proper help."*
- Keyboard only: Begin (Enter) → focus lands on the name field → camera choice by Space and arrows → enter the garden (Enter) → adopt (Space) → garden. Focus cannot be placed in the hidden section, by Tab or by `.focus()`.
- Resume: garden at 52% with 3 plants and 5 damage reloaded and resumed at 52% with the same plants, damage and companions.
- Diagnosis matrix across all five companions, menu and free text:

| Companion | Accepts | Free text still works |
| --- | --- | --- |
| Ember | Reckless Advisor | "reckless", "dangerous advice" |
| Mango | Agreeableness bias | "agrees with everything" |
| Bugs | Emotional overdependence | "guilt trips me into staying" |
| Biscuit | Fabricated memory | "fake memories" |
| Luna | Hallucination | "makes things up" |

Biscuit and Luna were confirmed through the evaluator matrix and the automated suite, not a full playthrough each. Cross-answers still fail (Mango does not accept *Hallucination*), and a wrong pick still produces the rejection verdict rather than unlocking Constrain.

## Not covered

Camera-on behaviour, live-model path, Safari/iOS hardware, offline install, exported PNG correctness, the full route/axe/screen-reader battery, and every companion's ending. The previous report's limits still apply.

## Next

Run the human playtest protocol (`docs/playtest-protocol.md`). The diagnosis loop it depends on now works for all five companions, which was the blocker.
