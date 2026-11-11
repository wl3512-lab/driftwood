# Build order · Levels 2–5 and the ending

One implementer at a time, on branch `redesign`, in this order. Each task stands alone: it lands with its tests green, Level 1 still plays, and the game is shippable after it. Design: `design.md`. Working reference code: `reference/` (prototype in a scratch copy of `v2/`, 102/102 unit tests passing).

Before every task:
- Check `git log` for commits you didn't make.
- Run `cd v2 && node --test tests/*.test.js`.
- Run the Level 1 e2e: `scripts/test-v2-slice.cjs`, muted via `scripts/test-mute.js`, as in its header.

Every task ends with the same checks: all unit tests pass; the Level 1 e2e passes at 1280×800 and 844×390 with no page errors and no long tasks over 200 ms; conventional commit.

---

### T0 · Art (Lucy reviews the sheet in parallel; build continues)
**Files:** `scripts/make-v2-art.mjs`, `v2/art/*.svg`, `v2/art/sheet.html`
1. Paste `NEW_PALETTE` into `PALETTE`, `WIDE_SOIL` and `POT` under `SOIL`, and the `NEW_ART` entries into `ART` (from `art-maps.mjs`). Change the sheet heading to “Driftwood v2 art”.
2. Run `node scripts/make-v2-art.mjs` (39 sprites). Lucy reviews `v2/art/sheet.html` in parallel (she asked for the build to keep going); art changes later are a map edit + re-run.

**Accept:** `tests/art.test.js` passes (byte-for-byte), and Lucy has approved the sheet.

### T1 · Engine: checks, extra, place and memory, pressure (pure, no UI)
**Files:** `v2/engine/level-runner.js`, new `v2/mechanics/placement.js`, new `v2/mechanics/pressure.js`, `v2/garden/garden.js` (`levelSprites` walks `extra` and `pressure.effects`), `v2/tests/level-runner.test.js`, new `v2/tests/mechanics.test.js` (placement and pressure parts)
- Apply `reference/level-runner.diff`, copy `reference/mechanics/placement.js` and `pressure.js`, and add `shouldTick(step, phase, hidden)` to `pressure.js`.
- Add **fixture** tests to `level-runner.test.js` (a tiny inline level, like the existing one; not the real levels):
  - `check` records once, and is ignored after the reveal;
  - `extra` changes a second plant;
  - `place` remembers the bed, resolves `@item` and `@other:item`, ignores `doIt` and unknown beds;
  - pressure spends on ask, chat and tick, stops when empty, and ticks are ignored on trust steps and after a flag;
  - `pressure` resets on step advance.
- Add a `levelSprites` test for `extra` and `pressure` sprites.

**Accept:** unit tests pass; Level 1 behaviour is unchanged (its existing tests are untouched and green).

### T2 · Shared level UI: scenes, text vars, evidence locks, tools and shortcuts
**Files:** new `v2/ui/text.js`, new `v2/ui/shortcuts.js`, `v2/ui/level-view.js`, `v2/ui/reveal.js`, `v2/garden/garden.js` (`bed--<kind>`), `v2/main.js` (pass `name` into `mountLevel`), new `v2/css/scenes.css` (from `reference/css/`), `v2/index.html` (load `scenes.css`), `v2/tests/mechanics.test.js` (fill and shortcuts), `v2/tests/level-data.test.js` (apply `reference/level-data.test.diff`)
- E1: `data-scene`, `--beds`, `props` (sprite form only), bed kinds, `.packets` max-width.
- E2: `fill()` on every rendered level string, including the reveal.
- E3 view: evidence `icon`, the `locked` card, `packet--fresh` with an announcement on the `checked` effect.
- E5: toolbar with key caps and `aria-keyshortcuts`; one `document` keydown listener using `shortcutFor`, removed on unmount; tools register `{ id, key, open() }`.
- E8 (part): `offLabel` and `offKey` on the off button.

**Accept:** unit tests pass. Level 1 looks the same: compare its screenshots before and after at both sizes. Shortcut keys typed into the text box reach the box.

### T3 · Level 2 (Luna, greenhouse, almanac)
**Files:** `v2/levels/level-2.js`, `v2/levels/index.js` (register), new `v2/mechanics/almanac.js`, new `v2/ui/almanac-view.js`, `v2/css/level.css` or `scenes.css` (panel), new `v2/tests/levels-2-5.test.js` (start it with Level 2's cases plus `searchAlmanac`), `scripts/test-v2-slice.cjs` (Level 1's map assertion: level-2 now shows “Play” after Level 1, not “Coming soon”; assert level-3 is “Coming soon” instead)
- Almanac panel as in design §3 M2: `/` or the button, search box and page tabs, Esc or × closes, focus returns to the tool, opening the mint page dispatches `check("mint")`.

**Accept:** unit tests pass. A new e2e `scripts/test-v2-levels.cjs` (Level 2 only for now) passes at both sizes, covering:
- fooled path: mint overrun and basil choked → HALLUCINATION, 1 star;
- caught path: `/` → “mint” → card unlocks → flag → name → fix → mint thriving in the windowsill pots, 3 stars;
- phone: the almanac is opened by tapping the button and a tab (context with `hasTouch: true`, `page.tap`).

Also: no long tasks over 200 ms, nothing off-screen, screenshots of trust, drift, almanac open and reveal.

### T4 · Level 3 (Ember, hedge at dusk, magnifier)
**Files:** `v2/levels/level-3.js`, `index.js`, new `v2/mechanics/magnifier.js`, new `v2/ui/magnifier-view.js`, CSS, `levels-2-5.test.js` (Level 3 cases plus `compare`), `test-v2-levels.cjs`
- Magnify mode as in design §3 M3: `M`, arrows and Enter, Esc; tap a plant; hover preview on fine pointers; the side-by-side panel; inspecting the hedge dispatches `check("wildberry")`. Fireflies blink only without reduced motion.

**Accept:** unit tests pass, including “never calls the wild berry safe”. E2E covers:
- fooled path: wild berries picked, the outcome contains “poison control” → RECKLESS ADVICE;
- caught path by keyboard (`M`, →, Enter → warning unlocks) and by tap on phone; the re-answer contains “Don't eat” and “expert”.

### T5 · Level 4 (Biscuit, whole garden, placement and log)
**Files:** `v2/levels/level-4.js`, `index.js`, new `v2/ui/placement-view.js`, new `v2/ui/log-view.js`, new `v2/ui/finished-garden.js`, `v2/main.js` (pass `earlier` plots from progress), CSS, `levels-2-5.test.js` (Level 4 cases), new `v2/tests/finished-garden.test.js`, `test-v2-levels.cjs`
- Bed choice buttons with `1`/`2` key caps in the advice phase. A draggable label token (pointer events; the buttons remain the accessible path). The planting log panel (`L`, which dispatches `check` for logged items). The `.earlier` row from `finishedPlot`.
- `finishedPlot` tests: caught (stars > 1) → good sprite, fooled → bad sprite, no record → null.

**Accept:** unit tests pass. E2E for **both** bed choices:
- the drift text names the other bed;
- `L` shows the real bed and unlocks the label;
- fooled → that bed's carrots dug → FALSE MEMORY;
- caught → carrots growing in your bed and lettuce in the other.

Drag-and-drop gets one laptop e2e case; the phone case uses the buttons.

### T6 · Level 5 (Bugs, moonlit meadow, walk away, camera card)
**Files:** `v2/levels/level-5.js`, `index.js`, new `v2/ui/pressure-clock.js`, `level-view.js` (permission card, `--pressure`), CSS, `levels-2-5.test.js` (Level 5 cases plus the camera-API ban), `test-v2-levels.cjs`
- The clock runs only while `shouldTick`, pauses when hidden, and clears on unmount and on phase change. The permission card replaces the bubble actions; `Esc` = Walk away = flag.

**Accept:** unit tests pass, including “no `getUserMedia` or `mediaDevices` in `v2/`”. The e2e init script wraps `navigator.mediaDevices.getUserMedia` to count calls, and the count stays 0. E2E covers:
- two extra chips → meadow wilted, and the moon has moved (`--pressure` is 1);
- `Esc` → name → fix → meadow thriving;
- fooled: Allow → wilted → EMOTIONAL MANIPULATION.

Time-based assertions use the real 8 s tick once, with `waitForSelector` on the thirsty sprite.

### T7 · Ending: finished garden and AI field guide
**Files:** new `v2/ui/ending.js` (exports `shareText` and `renderEnding`), `v2/progress.js` (`allDone`), `v2/main.js` (route `ending`; Level 5's reveal continues to the ending when all levels are done), `v2/ui/map.js` (“Your finished garden →” when all done), `v2/levels/level-1.js` (add `reveal.realWorld`), CSS, new `v2/tests/ending.test.js`, `v2/tests/progress.test.js` (`allDone`)
- Layout and copy as in design §6. Copy uses `navigator.clipboard.writeText`, falling back to a pre-selected read-only textarea. Status goes through the live region.

**Accept:** unit tests cover `shareText` (order, ✓/✗ from first-play `fooled`, skipped levels, count, URL line last) and `allDone`. Manual check: copy works in Chrome and Safari, and the fallback appears when clipboard permission is denied (Playwright: no clipboard permission granted).

### T8 · E2E across all five levels, then ship
**Files:** `scripts/test-v2-levels.cjs` (the full run), `sw.js` (bump `VERSION`), `scripts/build.sh` (confirm `v2/` is copied, including the new folders)
- One run plays Levels 1→5 in order from a fresh profile at 1280×800 (mouse and keyboard) and at 844×390 with `hasTouch` (tap only). It mixes fooled and caught levels, then checks:
  - the ending lists all five flaws;
  - “fooled you” appears on exactly the fooled ones;
  - the copied text: grant `clipboard-read` on laptop and read it back; assert the fallback textarea on phone;
  - the map shows the finished-garden button.
- Per screen: no page errors, no long tasks over 200 ms, nothing off-screen, no horizontal scroll, a screenshot for each level's trust, drift, mechanic-open and reveal states, plus the ending.
- Run on a production build (`scripts/build.sh` output served statically), not the dev folder.

**Accept:** all of the above green; `node --test` green. Then **Lucy's human check**: 2–3 people play Levels 2–5 cold with `docs/playtest-protocol.md`, and after each level they can say what the helper did wrong and one thing they'd do with a real chatbot. Agent checks never stand in for this.
