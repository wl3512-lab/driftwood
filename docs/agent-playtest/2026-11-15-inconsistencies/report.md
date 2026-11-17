# Driftwood user testing and fixes — 15 November 2026

Three independent testers covered saved gameplay results, UI/UX, and hands-on actions. The main session exercised first-time and returning-player journeys and reran the focused regressions. Persona: a first-time player with no gardening knowledge, using a laptop or phone and relying on the game's prompts to finish the garden.

## Ranked findings

1. **H1 — Hold controls covered by the conversation panel.** This could prevent pointer/touch completion entirely, so it took priority over presentation fixes.
2. **H2 — Field-guide cards unreadable on phones.** The game's central learning takeaway shrank to approximately 4–10px text.
3. **M1 — Almanac allowed background keyboard actions.** Reading could silently activate a second tool or advance a chore.
4. **M2 — Successful replay did not restore crops.** Catching a flaw with one star could leave the ending and earlier plots damaged.
5. **M3 — Draggable tools rejected the promised tap alternative.** Players relying on tapping could not use the advertised interaction.

Two further concrete inconsistencies: **M4**, stale pour instructions during the hold stage; **M5**, the newly added spinach missing from Rowan's seed handoff and dinner.

## Fix details and reproduction

### H1 — Covered hold target · Interaction · fixed

Surface: hands-on hold action, 1512×830 and 844×390 touch.

Reproduce: open `v2/tests/actions-fixture.html?kind=hold`, press the target ring, release early, then try to finish. Before the fix, the ring's centre at approximately (756,577) was covered by `.dock`; hit testing returned the conversation panel and holding never began.

Expected: the ring receives pointer/touch input, early release offers a retry, and a full hold advances. Smallest patch: account for the overlapping dock in action bounds and clamp the hold control into the reachable target area in `v2/actions/runner.js`.

Evidence: `../2026-11-15-hands-audit/hold-hit.png` and `../2026-11-15-hands-audit/regressions/*-hold-retry.png`. Regression: `scripts/test-v2-hands-regressions.cjs` checks actual hit testing, early release, completion, and cleanup with mouse and CDP touch.

### H2 — Unreadable field guide · Visual · fixed

Surface: collected five-card guide at 390×844, 375×667, 568×320, and 844×390.

Reproduce: collect all five cards, then open Field guide from the map. Before the fix, the collection forced all cards into one row, making tips approximately 4.42px upright, 6.48px at 568px wide, and 9.63px at 844px wide.

Expected: readable cards that can be reached by normal scrolling. Smallest patch: narrow/short-screen rules in `v2/css/map.css` retain reading-size cards, wrap the collection, and allow page height to grow. The desktop layout remains unchanged.

Evidence: `../2026-11-15-ui-audit/*-guide-before.png` and `*-guide-after.png`. Regression: `scripts/test-v2-guide-layout.cjs` checks five cards, tips at least 14px, no horizontal overflow or unreachable card edges, map round trips, and ending content at five sizes.

### M1 — Keyboard input leaked through the almanac · Interaction · fixed

Surface: level 3 almanac and level 1 chore, desktop and both phone orientations.

Reproduce: open the almanac with `/`, then press `M` or a chore number key. Before the fix, the native modal made background elements inert, but the document listener still acted on their shortcuts. A magnifier could appear behind the book, or a chore could advance unseen.

Expected: reading operates only the modal. Smallest patch: return from the level's document key handler while a native dialog is open, in `v2/ui/level-view.js`.

Evidence: `../2026-11-15-ui-audit/*-almanac-before.png`, `*-almanac-after.png`, and `*-chore-after.png`. Regression: `scripts/test-v2-modal-isolation.cjs` also checks packet Escape/back behavior, focus restoration, and the reverse magnifier→almanac→Escape sequence.

### M2 — One-star catch replay failed to restore crops · Feedback · fixed

Surface: Level 1 replay, Level 4 earlier plots, and Rowan's dinner.

Reproduce: be fooled on the first play; replay and catch the drift after one wrong flaw choice and one wrong rule choice. Both runs earn one star. Before the fix, the save only held best stars and the first-play fooled flag, so the successful catch was indistinguishable from continued failure.

Expected: successful replays restore the crop while the guide keeps its intended first-play history. Smallest patch: persist a separate monotonic `caught` flag, then use one catch rule in `v2/progress.js`, `v2/engine/stew.js`, and `v2/ui/finished-garden.js`. Legacy records keep their existing inference.

Evidence and detailed browser reproduction: `gameplay/report.md` and its desktop/touch screenshots. Regression: `v2/tests/replay-results.test.js` uses the real reducer and save/load functions; a later fooled replay cannot erase a previous catch.

### M3 — No tap alternative for draggable tools · Interaction · fixed

Surface: draggable cover/planting-style tools on desktop and touch phone.

Reproduce: tap a draggable tool, then tap its destination. Before the fix the runner only said to drag, contrary to the game's tap promise. Expected: tap the tool to select it, then tap a destination; a wrong target explains the error without changing the garden.

Smallest patch: reuse the existing target buttons for selected draggable tools in `v2/actions/runner.js`. Evidence: `../2026-11-15-hands-audit/regressions/*-tap-target.png`. The focused regression checks wrong-target recovery; original mouse/touch drag tests still pass.

### M4 — Pour instruction remained during soaking · Feedback · fixed

Surface: pour→hold sequence, desktop and touch phone.

Reproduce: pour into a target that requires soaking. The mode changed to hold, but the primary instruction still described pouring. Expected: the main text says to hold the named target until the ring fills, including after an early release.

Smallest patch: derive the primary instruction from the active stage in `v2/actions/runner.js`. Evidence: `../2026-11-15-hands-audit/regressions/*-soak.png`; regression checks instruction transition, keyboard completion, and pointer retry.

### M5 — Spinach missing from handoff/dinner · Feedback · fixed

The concurrent Level 4 update added spinach planting to its caught branch, but the seed pouch and dinner still listed the previous crop set. The pouch now includes spinach; the dinner lists and visibly draws it in the pot when planted, and explains its absence on a fooled run. A high-rated dinner with several missing dishes now says “A good pot” instead of contradicting its rating with “Thin.” This is an integration correction to the other session's addition, not a new level design.

Smallest patch: correct `v2/levels/wizard.js`, add the caught-branch dish in `v2/engine/stew.js`, and give it a visible slot in `v2/ui/story-art.js`. Regression coverage in `v2/tests/stew.test.js` and `v2/tests/wizard.test.js` checks the final corrected crop, missing reason, actual pot pixels, handoff seeds, and rating copy.

## Coverage and evidence

- Onboarding and returning-player manifest: `../2026-11-15-navigation/results.json`, with screenshot states for naming, real seed handoff, first job, map, empty guide, intro replay, and cancelling New game. Desktop 1512×830, portrait 390×844, and small landscape 568×320.
- Full mixed-result five-level journeys and focused dinners: `../2026-11-15-integration-final/results.json` and screenshots. All four final runs passed, including laptop and phone full journeys and desktop/phone dinner cases. These use the pre-existing deterministic helper lines and automatic hands-on completion; separate tests below exercise real inputs.
- Real hands-on coverage: eleven existing shared-action groups and desktop/touch original planting/drag flows; details in `../2026-11-15-hands-audit/report.md`.
- UI keyboard and readable-guide coverage: `../2026-11-15-ui-audit/report.md`.
- Final command outputs are preserved in `validation.log`.

The initial 334 unit tests all passed before the new regressions were added. Each functional regression was observed failing before its fix.

Final unit suite: **347 passed, zero failures**. `scripts/build.sh` produced the 2.4 MB `_site/` bundle. The built game's onboarding/navigation checks also passed at all three screen sizes. `sw.js` is bumped to `dw-v36` for the next release; this session did not deploy the game.

## Audit limits and decisions

This is a functional playtest and targeted UI audit, not a complete accessibility certification. No axe-core scan ran because it was unavailable. Optional live AI rewording, installed-PWA/offline behavior, and every browser/assistive-technology combination were not exhaustively tested.

Level 5 starts with its own healthy beds by explicit design specification; previous levels' plant state is not copied into its mechanics. The earlier-plots strip and dinner read saved results. First-play fooled labels in the field guide intentionally remain historical after better replays. Malformed localStorage containing hand-edited record types is a low-priority robustness follow-up; normal play does not create that state.

Initial parallel browser runs against Python's static server produced `net::ERR_CONNECTION_RESET` and incomplete page loads. Final verification uses a Node static server; connection-reset failures were retained in logs during investigation and were not treated as proof of game defects.

The workspace had extensive pre-existing edits and another active Claude session. Its overlapping-animation rewrite, potted-plant rendering, and spinach artwork/gameplay were preserved. This session's action fixes are additive to that rewrite.

That session also tightened AI rewording to preserve exactly the named crops. Its old quote/label-normalization fixture omitted the crop and failed the new contract; the fixture now retains sunflowers, and direct added/dropped-crop rejection checks protect the stricter rule. Production rewording code was preserved.

After the seven-fix browser checkpoint (344 unit tests), that session began conditional chore/wait changes. The latest 347-test unit run and rebuild include current files; the earlier full-flow screenshots do not certify subsequent external feature edits. `verification-state.json` records the inspected file hashes so Claude can distinguish the handoff from later changes.

## Self-critique and follow-up

The independent gameplay reviewer marked the initial four drafted findings KEEP: they name concrete game interactions, have distinct reproductions, and are neither generic nor duplicates. Hold hit-testing and guide readability were subsequently demonstrated in real browser runs; the spinach integration is specific to the concurrent Level 4 update. Seven findings retained, no generic recommendations padded into the list.

Quick fixes in this pass address the seven reproduced issues. No structural redesign is required by these findings. A future dedicated accessibility pass can evaluate automated contrast/semantics and assistive-technology behavior; no unrelated polish project was started.

Driftwood feels like a small box of garden cards and tools: the prompts make each helper approachable, and the consequences give the lesson a physical shape. It is easier to trust the controls when a tap works as promised, a hold target can actually be reached, and the cards remain readable in a hand. The corrections here strengthen that continuity without changing the game's visual character or teaching approach.

## Claude notification

Sent the self-contained `claude-handoff.md` to Claude Code with tools disabled. Claude acknowledged receipt; its exact response is saved in `claude-response.txt`. The notification explicitly identifies the later concurrent chore changes as requiring their own browser checks.
