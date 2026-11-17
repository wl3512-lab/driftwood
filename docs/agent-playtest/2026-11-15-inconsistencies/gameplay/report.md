# Gameplay and saved-result testing — 15 November 2026

## Fixed: a successful one-star replay failed to restore the garden

Reproduction (Level 1, Mango):

1. Complete a first run by following the bad tomato advice (fooled, one star).
2. Replay and flag the tomato advice.
3. Choose an incorrect flaw, then the correct flaw; choose an incorrect rule, then the correct rule.
4. Complete the corrected planting. This is a successful catch, worth one star.
5. Open Level 4's prior plots or the dinner result.

Before the fix, saved progress only remembered best stars and the first play's fooled flag. Both runs were worth one star, so the finished plot still showed damaged tomatoes and Rowan's dinner still omitted them despite the successful catch.

Progress now stores an independent persistent `caught` flag. The finished-plot and dinner calculations share the same catch rule; the guide keeps the intended first-play history. Later fooled replays cannot erase an earlier catch. Older records still infer the catch information available from their stars and first-play flag.

## Verification

- Baseline: 334 unit tests passed.
- Added regression file `v2/tests/replay-results.test.js`: four tests failed before the fix for the expected lost-result reason; all five pass after it.
- Full unit suite after fix: 339 tests passed, zero failures.
- Real browser interactions at 1512×830 and 844×390 against `http://127.0.0.1:8777/v2/` passed: one-star catch persisted; first-play fooled guide preserved; reload into Level 4 showed the healthy earlier plot; dinner had no missing Level 1 dishes; zero page errors.
- Screenshots: `1512-caught-one-star.png`, `844-caught-one-star.png`, and the corresponding `*-restored-earlier-plot.png`.
- Browser driver: `/tmp/driftwood-replay-browser.cjs` (uses auto completion for hands-on jobs, real clicks for questions and decisions).

## Findings intentionally left unchanged

- Level 5's healthy starting carrots and basil are independent of prior results. This is explicitly required by `docs/superpowers/specs/2026-11-11-driftwood-levels-2-5-design.md`, paragraph beginning “Garden: each level has its own beds,” and supports the Level 5 watered-bed evidence and basil chore.
- Low priority robustness issue: malformed localStorage can contain truthy non-object level records or string-valued stars. The loader accepts these; they can unlock later content or produce inconsistent score text. This state is not produced by normal play, so no additional save-format migration was added in this pass.

## Fixed: new spinach crop omitted from the seed handoff and dinner

During this audit a concurrent change replaced Level 4's lettuce with a distinct spinach crop. Rowan's handoff still supplied only carrot and pumpkin seeds, and his dinner still listed twelve crops with no spinach. The Level 4 handoff now includes spinach, and the dinner includes it in its menu and as a visible pot chunk. Because the current level plants spinach only after the player corrects Biscuit, fooled Level 4 runs correctly report that it was never planted. Dinner totals now include thirteen kinds.

Four new behavior checks failed before this patch (corrected final crop reaches dinner; absent spinach on the fooled path; visible pot representation; handoff seeds and line) and all pass after it. Shelf assertions now compare exact packet IDs against the current plant catalogue instead of a stale total; potted crops are checked for real alignment with their pot props while ordinary garden beds retain the original density checks.

The earlier laptop/full and phone/full browser flows passed without page errors or long tasks on :8786. Final reruns covering the spinach dinner change are recorded separately in `docs/agent-playtest/2026-11-15-integration-final/results.json`.

Final verification: `node --test v2/tests/*.test.js` passed all 344 tests after the latest patches (log `/tmp/driftwood-gameplay-final.log`). All four final browser flows passed with zero page errors and no long tasks: laptop/full, phone/full, ending/stew-mac, ending/stew-phone. The four results are in `docs/agent-playtest/2026-11-15-integration-final/results.json`. The dinner's high-rated multi-gap line now says “A good pot,” consistent with its four bowls; the existing low-rated “Thin, but honest” line is preserved.

The full-flow pages had already loaded their modules when the final verdict-copy patch landed. A separate exact-symptom browser check reloaded the latest code at 1512×830 and 844×390: four bowls plus three missing dishes says “A good pot. I missed the carrots, and two more.” Both sizes had zero page errors. Final screenshots are `2026-11-15-integration-final/1512-four-bowl-verdict-final.png` and `844-four-bowl-verdict-final.png`; driver `/tmp/driftwood-verdict-browser.cjs`.
