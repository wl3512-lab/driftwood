# Independent UI and UX playtest — 15 November 2026

Scope: active `v2/` game; desktop, landscape phone, portrait phone; real browser keyboard and pointer interactions. Test data used a completed mixed-result save for map/guide/ending and real level 3/4 screens for tools and chores.

## Fixed findings

1. **Almanac modal allowed background level shortcuts.** In level 3, press `/` to open the almanac, then `M`. The background magnifier activated despite the garden being inert; closing the book unexpectedly left magnify mode active. During a chore, numbered keys also operated hidden targets while reading. Root cause: native modal inertness blocks background focus/clicks but does not isolate document keyboard listeners. `v2/ui/level-view.js` now ignores background level shortcuts while a native dialog is open. The almanac continues to own packet navigation and Escape. Regression verified tool activation, hidden chore count, focus restoration, packet flip-back, and opening the book while magnifying.

2. **Collected field-guide cards were unreadable on phones.** Five cards always shared one row, scaling actual tip text to 4.42px at 390×844, 6.48px at 568×320 and 9.63px at 844×390. `v2/css/map.css` now wraps reading-size cards and allows normal page scrolling on narrow or short screens. Desktop 1512×830 retains its original row. All five cards are reachable, tips remain at least 14px, and the page has no horizontal overflow. Ending cards remain readable and unchanged by the scoped rule. See `*-guide-before.png` and `*-guide-after.png`.

## Verification

- `scripts/test-v2-modal-isolation.cjs`: passed at 1512×830, 844×390, 390×844 and 375×667, including both orders of opening almanac and magnifier.
- `scripts/test-v2-guide-layout.cjs`: passed at 1512×830, 844×390, 390×844, 375×667 and 568×320. Interacted through map → guide → map → finished garden → ending guide → map. Checked all five cards, readable tips, clipping/page reachability, mixed 9/15 score, and zero page errors or console warnings/errors.
- Drag-mode hint checked independently at 568×320 and 375×667 using the cover-action fixture: wraps inside the card with no overflow.
- No installed axe-core package was available; no automated axe accessibility scan was run. This was a targeted interaction/readability audit, not a full WCAG conformance review.

Run the browser tests against a local static server using `BASE_URL`, `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and optionally `EVIDENCE_DIR`. Python's old default server intermittently reset resource connections during concurrent testing; a Node static server on 8786 served the verified runs reliably.

## Changed source and tests

- `v2/ui/level-view.js`
- `v2/css/map.css`
- `scripts/test-v2-modal-isolation.cjs`
- `scripts/test-v2-guide-layout.cjs`

Other concurrent gameplay/action changes were left to their assigned testers. Existing external edits were preserved.
