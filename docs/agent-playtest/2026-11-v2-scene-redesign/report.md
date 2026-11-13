# v2 scene redesign: helper stall and textured beds (2026-11-12)

Commit cc94f71 on `redesign`. Lucy asked for the pet to stop sitting on the garden, a box of its own with the chat, and more detailed plots and dirt.

## What changed
- **Helper stall.** The pet sprite left the garden. It now sits in a framed box (`.stall`) at the left of the dock, with a window behind it and a name plate ("MANGO / your helper"). Only the chat column (`.dock__talk`) redraws each step, so the box stays put.
  - Laptop: about 9.5rem wide, left of the chat.
  - Phone landscape 844×390: a short strip at the top of the dock that stays visible while the chat scrolls.
  - 568×320: scrolls away with the chat to leave room for the buttons.
- **Beds.** Furrow rows, two layers of speckles, plank edging, corner posts, a wooden stake under each label. Per-type looks: terracotta pots with a rim, grass rows for wild hedge and meadow, cooler soil for part shade, darker soil and leaf dots for shady beds.
- **Ground.** Stepping-stone path along the bottom and sparse grass tufts (hidden in the tiled greenhouse).
- `sw.js` cache `dw-v6` → `dw-v7`. No level data, rules or pet text changed. CSS-only apart from a 15-line view change.

## Option B (not shipped)
The stall placed inside the garden, bottom-left. Screenshots: `optionB-*`. Rejected because the box covers the first bed and its plant on laptop and phone, which brings back the "pet on the garden" confusion. To switch, append the stall to `.scene` instead of the dock and add:

```css
.scene .stall { position: absolute; top: auto; left: 16px; bottom: 22px; z-index: 4; width: 9rem; }
@media (max-height: 500px), (max-width: 640px) { .scene .stall { width: auto; left: 8px; bottom: 10px; } }
```

## Tests
| Check | Result |
|---|---|
| Unit (`cd v2 && node --test tests/*.test.js`) | 189 / 189 |
| `scripts/test-v2-slice.cjs` | 4 / 4 |
| `scripts/test-v2-levels.cjs` | 15 / 22 |
| `bash scripts/build.sh` + production shots | pass, prod matches dev |

The 7 level-harness failures (`level4-caught`, `level5-caught`, `full` on laptop and phone, plus `laptop/level5-tick`) all time out waiting for the name phase right after refusing the drift. That is the pushback step added in db39307, which the harness does not know about yet. The follow-up pushback commit updates the harness. No long tasks in any passing run.

## Known compromises
- At 568×320 the stall scrolls out of view when the chat scrolls to the buttons.
- Grass tufts are CSS stripe marks, not sprites.

## Files
`before-*` (6), `after-*` (Levels 1–5 at laptop, phone, small), `optionB-*` (4), `prod-*` (2), `compare.html` / `compare.png` side by side.
