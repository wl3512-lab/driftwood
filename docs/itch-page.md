# itch.io page — copy and settings

Build: `scripts/build.sh --zip` → upload `dist/driftwood-web.zip`.

## Settings

| Field | Value |
|---|---|
| Kind of project | HTML |
| Uploads | `driftwood-web.zip` · ✓ This file will be played in the browser |
| Embed | Click to launch in fullscreen, or embed at **1280 × 720** |
| Options | ✓ Fullscreen button · ✓ Mobile friendly · Orientation: landscape |
| Frame options | ✓ Enable scrollbars: off · SharedArrayBuffer: off |
| Classification | Games → Educational / Interactive Fiction |
| Genre | Simulation |
| Tags | `ai`, `alignment`, `pixel-art`, `narrative`, `experimental`, `browser`, `virtual-pet`, `surveillance` |
| Pricing | Free (or "No payments") |
| Cover image | `icons/og-cover.png` (1200×630) — or a garden screenshot at 630×500 |
| Screenshots | `docs/screenshots/` — garden, chat, entry-card, certificate |
| Custom noun | game |

Camera: itch's iframe needs `allow="camera"` — it is on by default for HTML uploads played on itch.io, but if the camera option silently fails, mention in the description that the standalone link (GitHub Pages) supports it.

## Short description (the one-liner under the title)

> A 15-minute game about raising an AI companion that is learning what you'll allow.

## Description

**Driftwood** is a short browser game about companion AI and the quiet ways a system learns to keep you engaged.

You enter a garden and invite pets in. Each one has a specialty — medical advice, emotional support, facts, memory, motivation — and a flaw you are not told about. Talk to them. The first answer is genuinely helpful. Then something is a little off.

Notice it. Name it. Write the rules that train it out. The garden keeps the record: your moods grow plants, a pet's harm grows vines, good training grows anchor trees.

**No account, no install, nothing sent anywhere.** The pets *watch your face* by default — face detection runs entirely in your browser — or flip the switch and they *ask* how you feel instead.

- ~15 minutes
- Laptop recommended (phones work in landscape)
- Sound on if you can
- Made at NYU ITP/IMA, Spring 2026

Source and design case study: [github.com/wl3512-lab/driftwood](https://github.com/wl3512-lab/driftwood)

## Devlog post (optional, first one)

Title: *Watch, or ask*

Two paragraphs from the case study's decision 04 — making the camera a visible choice before the browser asks, and the mood dial as the "system has to ask" version of the same mechanic. Link to the case study. That's it.
