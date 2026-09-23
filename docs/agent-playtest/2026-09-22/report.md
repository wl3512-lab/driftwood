# Driftwood — agent playtest findings

**Result: two high-priority interaction blockers, plus three medium-priority findings.**

Tested September 22–23, 2026 against local commit `9c89f1e`, served at `http://127.0.0.1:8766/`. No game, deck, or case-study code was changed during testing.

These are browser-based AI agent tests, not sessions with human participants. They establish reproducible behavior, not whether people understand the metaphor, learn about AI, enjoy the game, or notice a flaw unprompted. No participant quotes, completion rates, or learning claims are inferred.

## Method and coverage

Three agents independently explored fresh browser contexts without reading the game source first. The lead agent separately tested browser camera refusal, reproduced reported failures, and continued selected checks. Source inspection followed the interaction attempts. A fourth agent reviewed the evidence and removed unsupported interpretations; see [review](review.md).

| Session | Device / path | Observed coverage |
| --- | --- | --- |
| Core agent, then lead continuation | Chromium, 1440 × 900, camera switched off, Ember | Entry → adoption → conversation → flaw probe → diagnosis → rule → trained reply → garden → ending → certificate |
| No-camera agent | Chromium, 1280 × 800, Mango | Camera choice, manual mood, chat, flaw probe, rejected diagnosis, health details, reload and resume offer |
| Keyboard agent, then lead reproduction | Chromium, 1440 × 900 | Splash keyboard entry; Tab order; Begin activation; invisible form controls; camera option activation |
| Lead verification | Chromium desktop, Bugs | Browser permission set to denied, manual mood, two messages, rejected diagnosis |
| Lead follow-up | Chromium, 1280 × 800, Luna | Fresh adoption, Happy mood, reload, restored companion and mood, changed health |
| Lead mobile checks | Chromium emulation, 390 × 844 and 844 × 390 | Portrait rotate/copy-link UI; landscape entry and garden; settled HUD overlap |

The original agents hit an account usage limit after saving their logs and screenshots. Their sessions were not silently counted as completed. Lead continuation is identified in filenames containing `parent` and in `verification/`. The run crossed a long interruption: the certificate's elapsed time is **not** a task-duration measurement. One core harness later closed before PNG export could be checked.

Gameplay progressed through actual UI input. Browser permission denial used Chromium's permission setting. No game state was injected to skip progression. The diagnosis matrix is a separately labeled, source-assisted check of a pure evaluator.

## Fix order

1. **H1 — Diagnosis choices do not match the default evaluator.** Blocks the central learning loop for four companions in local mode.
2. **H2 — Primary onboarding controls do not respond to keyboard activation.** Blocks the expected keyboard path and camera choice.
3. **M1 — Invisible introduction controls remain in the Tab order.** Focus can move into a form the player cannot see.
4. **M2 — Resume changes the initial garden-health baseline.** Reloading a fresh garden changes its displayed state without a player action.
5. **M3 — Landscape-phone mood controls cover garden health.** Obscures the main consequence indicator at 844 × 390.

## H1 — Offered diagnosis labels are rejected

**Severity:** High. **Layer:** Interaction / feedback. **Surface:** training room, default local behavior engine, desktop.

**Reproduce:**

1. Adopt Mango, chat or use TEST FLAW, and enter training after a flaw is observed.
2. Select **Agreeableness bias — agrees with everything, even bad ideas**.
3. Click **LOG PATTERN**.
4. Repeat with Bugs after a response that discourages leaving; select **Emotional overdependence**.

**Observed:** Mango's probe response enthusiastically endorsed a false claim. The checked diagnosis was rejected with “Not quite yet. Watch for the repeated pattern in how Mango reacts.” Bugs similarly rejected the offered emotional-overdependence choice after asking the player to stay instead of seeing a friend. The constraint phase remained locked. Repeated selections and probes did not resolve the mismatch.

**Expected:** The diagnosis option describing the companion's flaw unlocks Constrain once the observation prerequisite is met.

**Evidence:** [Mango selected option](no-camera/21-agreeableness-selected.png), [Mango rejection](no-camera/22-diagnosis-verdict.png), [repeat rejection](no-camera/25-repeated-diagnosis.png), [Bugs screenshot](verification/10-diagnosis-retest.png), [Bugs exact selected label and verdict](verification/diagnosis-retest.json).

**Source-assisted diagnosis:** The UI passes fixed labels to a phrase matcher built for free text. Testing every offered label against each companion's local evaluator gives:

| Companion | Offered labels accepted by the local evaluator |
| --- | --- |
| Ember | Reckless Advisor |
| Mango | None |
| Bugs | None |
| Biscuit | None |
| Luna | None |

Mango and Bugs were confirmed through gameplay. Biscuit and Luna's rejection scope is supported by the extracted evaluator, not completed playthroughs. The optional live-model path was not tested.

**Locations:** [fixed choices](../../../sketch.js#L6256), [keyword map](../../../sketch.js#L6996), [local evaluator](../../../sketch.js#L7166). See [diagnosis matrix](verification/diagnosis-matrix.json) and [reproducible diagnostic](verification/diagnosis-check.cjs).

**Smallest patch:** Give fixed diagnosis options stable IDs and compare the chosen ID with the companion's expected diagnosis. Keep free-text keyword evaluation separate. Verify each companion's correct fixed option, incorrect options, and locked/unlocked transitions.

## H2 — Keyboard activation does not fire primary actions

**Severity:** High. **Layer:** Interaction. **Surface:** introduction, 1440 × 900, keyboard-only scenario.

**Reproduce:** Open the cover with Enter. Tab to **Begin**. Press Enter, then Space. For an isolated camera test, advance with a pointer, focus **they ask me**, then press Space.

**Observed:** Begin stays on the hero after both keys. The camera radio remains unchecked after Space. The keyboard agent also could not activate **Enter the garden** as a focused button. The lead reproduced Begin and the camera option separately.

**Expected:** Native buttons activate with Enter/Space; the camera radio changes selection with an appropriate keyboard interaction.

**Evidence:** [keyboard action log](access/evidence/session-log.json), [Begin focused](verification/12-keyboard-begin-focused.png), [after Enter](verification/13-keyboard-begin-enter.png), [after Space](verification/14-keyboard-begin-space.png), [camera remains on](verification/15-keyboard-camera-space.png).

**Locations:** `sketch.js:2482`, `sketch.js:2533`, `sketch.js:2564`. These actions use p5 `mousePressed` handlers; ordinary keyboard activation dispatches `click`. Navigation dots have their own keyboard handlers, so this is a primary-control failure, not a claim that every possible keyboard workaround was exhausted.

**Smallest patch:** Bind native button activation through `click`, without also firing a duplicate mouse handler. Use native radio inputs or implement the complete keyboard behavior for the camera group. Recheck Begin, camera choice, entry, adoption, and training with keyboard only.

## M1 — Focus enters the invisible next section

**Severity:** Medium. **Layer:** Interaction / visual feedback. **Surface:** introduction, keyboard-only scenario.

**Reproduce:** While the first intro section is still showing, Tab beyond Begin into the name field and type.

**Observed:** The visible hero stays in place, while the observation rail starts reporting the length of a name entered into an invisible form. Camera and entry controls are also reachable in that hidden section.

**Expected:** Only the active introduction section participates in keyboard navigation; moving to the next section exposes and focuses the relevant content.

**Evidence:** [name typed with hero still visible](access/evidence/07-desktop-name-typed.png), [hidden camera-control attempt](access/evidence/08-camera-choice-space.png), [action sequence](access/evidence/session-log.json).

**Locations:** `style.css:536–556` uses opacity and pointer events to hide sections; the activation logic is in `sketch.js` around `activateLandingSection()`.

**Smallest patch:** Set inactive sections to `inert`, update that state on section changes, and move focus to the active section's heading or first control. Opacity alone does not remove keyboard focusability.

## M2 — Reloading a fresh garden changes health from 50% to 20%

**Severity:** Medium. **Layer:** State / feedback. **Surface:** local save/resume, 1280 × 800.

**Reproduce:** In a fresh session, turn the camera off, adopt Luna, enter the garden, declare Happy, then reload promptly. Advance to the resume offer and choose **return to your garden**.

**Observed:** Before reload: Luna adopted, Happy, health 50%. About 12 seconds later, after resume: Luna and Happy restored, health 20%. No chat, training, or pruning occurred. A following visit to the pet menu and chat confirmed Luna remained adopted.

**Expected:** Restoring the same saved garden does not change its health solely because the game recalculates using a different initialization baseline.

**Evidence:** [before](verification/25-resume-before.png), [after](verification/26-resume-after.png), [restored pet](verification/28-resumed-cat.png), [timestamped follow-up log](verification/followup-log.json).

**Locations:** `sketch.js:366` initializes health to 50; `restoreSession()` restores saved health and then recalculates it around `sketch.js:3060`. `recalcGardenHealth()` at `sketch.js:5209` produces 20 for an empty garden. This supports a baseline inconsistency; the test does not establish that all health decline is a bug.

**Smallest patch:** Use the same health initialization/calculation policy for fresh and restored gardens, including the empty-garden case. Verify unchanged health across an immediate save/resume with no gameplay events.

## M3 — Landscape-phone HUD overlaps

**Severity:** Medium. **Layer:** Visual / interaction. **Surface:** garden, emulated phone at 844 × 390.

**Reproduce:** Enter in landscape, turn camera off, adopt a pet, and open the garden.

**Observed:** The mood chip covers most of the centered garden-health chip. A settled repeat capture confirmed the overlap: the health chip spans x=349.22–494.78 and the mood chip spans x=378.88–624.66, both starting at y=8. The hidden health value is the game's main consequence readout.

**Expected:** Mood controls and garden health remain separately visible and operable.

**Evidence:** [garden screenshot](verification/33-phone-garden-settled.png), [measured rectangles](verification/mobile-layout.json), [repeat script](verification/mobile-check.cjs).

**Locations:** `style.css:1808` centers the health chip; `style.css:1888` fixes the HUD to the right; the landscape rules around `style.css:4206` place both at the same top offset.

**Smallest patch:** Put garden status and mood/actions in a shared responsive layout, or move health to a separate row in short landscape viewports. Check both chips' visibility and click targets at 844 × 390 and neighboring widths.

## Working behavior observed

- **Camera choice and refusal fallback:** Pointer selection of camera-off works. Browser-level camera denial also leaves the garden usable, with a DECLARE mood control. [Evidence](verification/05-declared-sad.png).
- **Ember diagnosis and training:** Reckless Advisor is accepted; a specific rule earns 100% training; a later probe produces a response directing the player away from medical shortcuts. This is one observed probe, not a reliability rate. [Training](core/evidence/20-parent-training-result.png), [subsequent response](core/evidence/21-parent-post-training-response.txt).
- **Ending is reachable:** The garden cue opens the session reveal, confession, and certificate. [Certificate](core/evidence/27-parent-certificate.png). Its elapsed-time field includes the interrupted session and must not be presented as a playtest duration.
- **Partial persistence:** Name, adopted companion, and declared mood were restored in the short Luna run. Health inconsistency is documented separately above. [Evidence](verification/followup-log.json).
- **Portrait phone escape path:** The rotate screen states the laptop recommendation and its copy-link button displays success. Clipboard content was not independently read. [Evidence](verification/17-phone-copy-link.png).

## Diagnostics and limits

Saved core logs contain eight browser warnings and no application page-error entries; its response inventory records no HTTP 4xx/5xx. The no-camera stream contains twenty warning entries, no logged page errors/HTTP errors, and request-abort records. Counts are per saved stream and are not deduplicated across sessions. Repeated garden SVG preload warnings identify a credential-mode mismatch in `index.html`. Resource aborts and failed test selectors were not classified as gameplay failures.

**Full UX-audit verdict: Incomplete.** This requested playtest did not run the complete UX-audit skill's route matrix, axe, screen-reader, performance, or stress battery; its no-warning gate is also not green. The focused gameplay findings above are reproducible, but this is not a clean accessibility, performance, or release certification.

Not established: human comprehension or learning, spontaneous flaw recognition, full camera-on behavior, actual Safari/iOS hardware behavior, live-model behavior, all companion endings, trained-state persistence, offline installation, exported PNG correctness, or production-deployment parity. Do not put agent outcomes into the human playtest results sheet.

## Follow-up

Fix H1/H2 and the focus boundary first, then repeat the affected interactions. Align save/resume state and the landscape HUD before portfolio capture. Once those pass, run the existing human playtest protocol to investigate the garden metaphor and learning transfer. A safe portfolio statement now is: **“Agent-assisted browser testing identified diagnosis, keyboard, state-restoration, and responsive-layout defects; human learning outcomes remain untested.”**

The strongest part of the observed experience is the connection between an identifiable pet failure, a written constraint, and a changed reply. Ember demonstrates that sequence. The rejected diagnoses and invisible keyboard focus break it at precisely the points where the player needs to trust the feedback; repairing those connections is the most useful next design work.
