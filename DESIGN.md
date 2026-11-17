---
name: Driftwood
description: A pixel-art garden game where five AI animal helpers sometimes drift into confident wrong advice, and the player checks Rowan's almanac, names the flaw and teaches the fix.
colors:
  sky: "#9fd4f5"
  grass: "#7cc36a"
  grass-dark: "#5ea44e"
  soil: "#b98a5a"
  soil-edge: "#8a6440"
  wood: "#8a5a34"
  parchment: "#fff6dc"
  ink: "#3b2a1a"
  paper: "#ffffff"
  line: "#222222"
  do: "#7bd36b"
  do-edge: "#234d1c"
  off: "#ffb347"
  off-edge: "#6b3d00"
  alarm: "#c62828"
  focus: "#1e88e5"
  void: "#050805"
  phosphor: "#00e676"
  phosphor-light: "#69f0ae"
  crt-text: "#c8d8ce"
  crt-dim: "#7a9488"
typography:
  ui:
    fontFamily: "'Fira Code', ui-monospace, Menlo, monospace"
  body:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  pixel:
    fontFamily: "'Pixelify Sans'"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
---

# Design System: Driftwood v2

Source of truth for tokens is `v2/css/base.css`. The game is its own world with one fixed palette, no light/dark theme.

## 1. Overview

**North star: "The Cozy Garden With a Glitch."** A sunny pixel kitchen garden (Rowan's), where charming helpers give advice. The warm world is the default. A thin dark CRT layer (scanlines, phosphor green on near-black) is "the system underneath": the title screen at night, the handoff, the ending guide, and the rotate prompt. Pixel discipline holds everywhere: hard edges, radius at most 4px, no blur, no gradient text, hard offset shadows.

Two surfaces, one rule each:
- **Garden surfaces** (map, levels, almanac, cutscene): sky, grass, soil, wood, parchment, with near-black ink and a heavy `--line` outline.
- **CRT surfaces** (`css/crt.css`: splash, intro, ending): `--void` background, `--phosphor` accents, `--crt-text` copy, scanline overlay.

## 2. Colors

- **World**: `--sky`, `--grass`/`--grass-dark`, `--soil`/`--soil-edge`, `--wood`. Sprites and beds supply the rest of the color.
- **Paper**: `--parchment` panels and buttons, `--paper` white, `--ink` text, `--line` outlines.
- **Actions**: `--do` green (follow the advice) with `--do-edge`; `--off` amber (Something's off) with `--off-edge`. These two buttons are the core interaction and keep their colors everywhere.
- **Signals**: `--alarm` red for damage, `--focus` blue for focus rings only.
- **CRT**: `--void`, `--phosphor`, `--phosphor-light`, `--gold` (same amber as `--off`), `--crt-text`, `--crt-dim`.
- Pets are told apart by sprite and name plate, not by a per-pet color system.
- Drift greying (scene desaturation) is trailer-only, enabled with `?driftfx=1`. In play the garden keeps its colors.

## 3. Typography

- **Fira Code** (`--font-ui`): buttons, labels, plates, HUD, CRT screens.
- **Inter** (`--font-body`): helper speech, almanac prose, reveal copy.
- **Pixelify Sans** (self-hosted, OFL, `v2/fonts/`): short card lines.
- **Block titles** (`ui/block-type.js`): hand-built 5x7 pixel capitals, columns doubled, stepped shadow, built in cell by cell. Decorative (`aria-hidden`); the real words sit beside it as text. Used for level, reveal and ending titles. No "//" kickers.
- Floor: no text under 12px (0.75rem) anywhere.

## 4. Components

- **Button (`.btn`)**: parchment fill, 3px `--line` border, 2px radius, 3px hard shadow, min-height 44px. `:active` moves 2px into its shadow. Variants: `--do`, `--off`, `--crt` (transparent, phosphor outline).
- **Dock**: the bottom panel in a level. The helper's stall (window, sprite, name plate, role, sound toggle), the speech bubble, the question chips, the **Trained** bar, then Do it / Something's off.
- **Trained bar**: fills in sixths (two drifts, three points each: catch, name, fix). Below 50% the helper glitches (`pet-anim.css`).
- **Almanac (`almanac.css`)**: a modal wooden seed shelf. Packets sit on planks and open to a parchment sheet over a dimmed shelf (growth stages, sun, water, spacing, "watch for" warning). Only the shelf scrolls, vertically. Evidence cards in a level open the same sheet.
- **Name / fix pickers**: the flaw options and rule options as full-width chips after "Something's off". A wrong pick gives a one-line hint, not a penalty screen.
- **Reveal card**: after the last drift, names the claim and the flaw, with stars (1 to 3) and the outcome. Collectible look.
- **Cutscene**: Rowan's intro in seven beats (name, garden, helpers, dinner, drift, almanac, "Trust, but check.") with a skip, and a rewatch from the map that skips the name.
- **Map**: five stops, one helper each: Plan your garden, Plant herbs, Pests & berries, Finish the garden, Final bloom.
- **Title screen**: DRIFTWOOD over Rowan's stew dinner at night: Rowan at the pot, five helpers at the table, everyone swaying, the food rotting and snapping back fresh on a glitch.
- **Rotate prompt**: full-screen dialog, a pixel phone that turns, "Turn your phone sideways", "The garden needs the room.", and "Play upright anyway".

## 5. Layout

- Levels are one screen: scene above, dock below. Beds and tools are draggable, so the garden needs width; this is why phones play landscape.
- Laptop: dock is a grid (stall, talk, tools). Phone landscape (`phone.css`, 844x390, 667x375, 568x320): compact dock, smaller plates. Upright phone (`portrait.css`, max 640px wide and taller than 500px) has its own one-column dock: stall strip on top, bubble, full-width stacked questions. It is the fallback under "Play upright anyway", not the intended mode.
- Floor everywhere: text at least 12px, taps at least 44px, safe-area padding at the bottom.

## 6. Motion

- Pixel motion uses `steps()` easing (frame-by-frame). Smooth easing is only for modal fades (almanac in 180ms, out 140ms).
- Idle sway on title scene and pets; glitch frames on under-trained helpers.
- Block titles build cell by cell with slight jitter.
- `prefers-reduced-motion`: animation and transition durations collapse to near zero.
- Keep payoffs short; the cutscene is skippable.

## 7. Do's and Don'ts

Do:
- Keep drifts readable as charming first, wrong second.
- Keep pixel edges: `image-rendering: pixelated`, hard shadows, radius at most 4px.
- Keep each pet's voice: Mango hype, Luna self-important, Ember laid-back, Biscuit diva, Bugs lyrical.
- Use block titles for headlines.
- Write player-facing copy without em dashes.

Don't:
- Use blur, soft shadows or gradient text.
- Name any real-world inspiration for the pets.
- Hard-lock orientation or shrink text below 12px or taps below 44px.
- Explain the flaw before the player names it.
- Put the almanac or reveal content through AI rewording. Outcomes, reveal, cutscene and almanac use only written lines.
