# Handoff to Claude Code — 15 November 2026

The user asked Codex to playtest Driftwood with subagents, fix UI/UX and logic inconsistencies, then tell Claude. Three independent testers and the main session completed that work locally.

Seven reproduced issues are fixed:

1. A successful one-star replay now restores crops in earlier plots and dinner. Saved `caught` history is independent of stars; the field guide retains intentional first-play fooled history.
2. The almanac blocks background keyboard shortcuts, including hidden chore inputs, with focus/Escape behavior preserved.
3. Draggable tools support tapping the tool followed by a destination, including wrong-target recovery.
4. The main pour instruction updates when the action changes to holding/soaking.
5. Low hold controls stay reachable above the expanding conversation dock; mouse/touch early release and retry work.
6. Collected field-guide cards wrap at reading size on phones, instead of reducing tips to 4–10px.
7. The recent Level 4 spinach addition is reflected in Rowan's pouch, dinner menu, and pot pixels. Spinach is correctly absent when its caught branch was not played; high-rated dinners no longer call themselves thin solely because several dishes are missing.

Verification:

- All 347 current unit tests pass (the seven-fix integration checkpoint had 344).
- Final full laptop/phone journeys and both focused dinner cases pass: `docs/agent-playtest/2026-11-15-integration-final/results.json`.
- Real mouse/touch action regressions, eleven shared-action groups, and original desktop/touch planting-drag flows pass.
- Modal tests pass at four sizes; readable guide/map/ending tests pass at five sizes.
- Onboarding/returning/navigation checks pass at desktop, portrait phone, and small landscape phone, including against the built copy.
- `scripts/build.sh` succeeds; `_site/` contains the current 2.4 MB bundle. `sw.js` is `dw-v36`. No deployment was made by this session.

The complete report, reproductions, evidence, and logs are in `docs/agent-playtest/2026-11-15-inconsistencies/report.md` and `validation.log`. New reusable browser scripts: `scripts/test-v2-hands-regressions.cjs`, `scripts/test-v2-modal-isolation.cjs`, `scripts/test-v2-guide-layout.cjs`, and `scripts/test-v2-navigation-audit.cjs`. They accept `BASE_URL`, `PLAYWRIGHT_MODULE`, and `CHROME_PATH`.

Preserved the concurrent Claude session's overlapping-action animation rewrite, potted mint rendering, spinach gameplay/art, and stricter AI crop-name validation. Updated the old normalization fixture to retain sunflowers under that stricter validation, plus added/drop crop rejection coverage. Do not overwrite these overlapping changes as unrelated work. Some concurrent changes were committed by that other session during this playtest.

The Node test server at `http://127.0.0.1:8786/v2/` served final checks reliably. Python's default server intermittently reset asset connections under parallel browser load; those infrastructure failures are documented. No axe scan, exhaustive live-AI evaluation, or PWA/offline certification was claimed.

At notification time, the other active session was also adding conditional chore/wait logic after the seven-fix full-browser checkpoint. The latest 347-test unit run and rebuilt bundle include the current files. Browser verification of that subsequent chore feature belongs with its implementation; do not assume the earlier full-flow screenshots certify later edits. `verification-state.json` records the inspected file hashes.

Please acknowledge receipt of this handoff only. No additional edits or deployment are requested by this notification.
