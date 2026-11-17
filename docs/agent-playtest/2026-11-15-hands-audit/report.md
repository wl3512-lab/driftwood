# Hands-on interaction audit — 15 November 2026

Three reproduced failures fixed in `v2/actions/runner.js`:

1. **Draggable actions had no promised tap alternative.** Open the cover action, tap its tool, then try to tap the destination. The original runner showed “Drag it…” and provided no destination button. Tapping a draggable tool now enables the existing target buttons; the instruction says which target to tap. A wrong target leaves the garden unchanged and explains where to tap. Drag and keyboard controls remain available.
2. **Soaking showed the previous instruction.** In a pour action with a soak stage, finish pouring. The action switched to holding, but its primary instruction still said to tap/pour. The primary instruction now says to hold the named target until its ring fills, including after recovery from an early release.
3. **The expanding conversation covered low hold targets.** In the hold fixture at 1512×830, the hold ring was at approximately (756,577), where `elementFromPoint` returned the conversation dock. A real pointer press never started the hold. Action control bounds now account for the overlapping dock; hold rings stay inside the reachable area and their target bed where applicable.

Each new regression was observed failing before its production fix. The focused browser script checks desktop 1512×830 and touch landscape 844×390, including actual CDP touch presses, wrong-target recovery, keyboard soak completion, early release, completed holds, input hit testing and cleanup.

Evidence:

- `hold-hit.png`: hold control before the bounds fix.
- `regressions/*-hold-retry.png`: reachable hold ring and recovery prompt after the fix.
- `regressions/*-tap-target.png`: tap alternative after selecting a draggable tool.
- `regressions/*-soak.png`: correct primary instruction in the hold stage.

Validation:

- `node --test v2/tests/actions*.test.js`: 25 passed.
- `scripts/test-v2-hands-regressions.cjs`: all four desktop/touch groups passed.
- Existing `scripts/test-v2-actions.cjs` with `ONLY=kind- VIDEO=0`: 11 groups passed, including pull, snip, fill, pour/soak, cover, collect, poke, hold, keyboard, skip and touch, with no captured JavaScript errors or long tasks over 200 ms.
- The same existing script with `ONLY=plant-drag VIDEO=0`: desktop and real touch sunflower planting passed, including wrong drop recovery, pointer dragging, effect timing, digging, firming and staking.

Browser environment:

```sh
PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
BASE_URL=http://127.0.0.1:8781/v2/ \
node scripts/test-v2-hands-regressions.cjs
```

Python static servers on ports 8766/8777 intermittently reset asset connections under concurrent browser load. The final browser runs used a local Node static server on port 8781; these infrastructure failures were not counted as gameplay failures.

This agent authored only the tap alternative, stage instruction and target-bounds additions to the runner, the new focused browser script, and this evidence/report. The runner also contains a concurrent animation rewrite by another session, which was preserved.
