---
name: Driftwood
description: A browser game where you train a behavioral flaw out of an AI pet, and the garden lives or dies by your choices.
colors:
  phosphor-green: "#00e676"
  phosphor-green-light: "#69f0ae"
  terminal-gold: "#ffb347"
  terminal-gold-light: "#ffd080"
  void-base: "#050805"
  void-base-2: "#080c09"
  text-luminant: "#c8d8ce"
  text-mid: "#7a9488"
  text-dim: "#4a6258"
  text-ghost: "#344a40"
  pet-fox: "#ff8a50"
  pet-bunny: "#ff6090"
  pet-cat: "#b388ff"
  pet-dog: "#ffd54f"
  mood-happy: "#ffd54f"
  mood-sad: "#64b5f6"
  mood-stressed: "#ff6e6e"
  mood-surprised: "#ff80ab"
  mood-neutral: "#69f0ae"
  state-success: "#00e676"
  state-warning: "#ffd54f"
  state-danger: "#ff5252"
typography:
  display:
    fontFamily: "'Bebas Neue', sans-serif"
    fontSize: "clamp(4rem, 13.5vw, 11rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0.10em"
  headline:
    fontFamily: "'Fira Code', monospace"
    fontSize: "clamp(1.8rem, 3vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.06em"
  title:
    fontFamily: "'Fira Code', monospace"
    fontSize: "clamp(1.6rem, 3.4vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "0.08em"
  body:
    fontFamily: "'Inter', sans-serif"
    fontSize: "1.02rem"
    lineHeight: 1.9
    letterSpacing: "0.03em"
  label:
    fontFamily: "'Fira Code', monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.14em"
  caption:
    fontFamily: "'Fira Code', monospace"
    fontSize: "0.68rem"
    letterSpacing: "0.22em"
rounded:
  none: "0px"
  sm: "2px"
  md: "3px"
  lg: "4px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  button-gold:
    backgroundColor: "{colors.terminal-gold}"
    textColor: "#0a120e"
    rounded: "{rounded.sm}"
    padding: "15px 40px"
  button-gold-hover:
    backgroundColor: "{colors.terminal-gold-light}"
    textColor: "#0a120e"
    rounded: "{rounded.sm}"
    padding: "15px 40px"
  button-green:
    backgroundColor: "{colors.phosphor-green}"
    textColor: "#0a120e"
    rounded: "{rounded.sm}"
    padding: "13px 32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.phosphor-green}"
    rounded: "{rounded.none}"
    padding: "13px 42px"
  input-default:
    backgroundColor: "{colors.void-base-2}"
    textColor: "{colors.text-luminant}"
    rounded: "{rounded.sm}"
    padding: "16px 28px"
  creature-card:
    backgroundColor: "#080e0a"
    textColor: "{colors.text-luminant}"
    rounded: "{rounded.lg}"
    padding: "28px 18px 22px"
---

# Design System: Driftwood

## 1. Overview

**Creative North Star: "The Garden Terminal"**

This system is a surveillance computer that grew ecology around it. The interface does not apologize for watching you. Every screen is a monitoring station: boot sequences log behavioral data, mood chips track your expression, garden health dips when your AI pet misbehaves. The clinical infrastructure and the living things are tangled together by design, not as metaphor but as mechanics.

The design was built against the aesthetic of comfortable AI tools. There are no rounded corners above 4px. No blurs, no gradients on text, no white-space breathing room designed to relax. The system asserts itself: pixel-hard edges, CRT scanlines that never turn off, a phosphor green that glows from inside the screen rather than sitting on top of it. Operating it should feel like using an instrument, not a product.

The garden is the ecological argument. When your pet behaves well, plants grow. When the AI reveals its flaw, the garden sustains damage. Players do not read stats — they watch things die or thrive. The visual system enforces this: health is spatial, not numeric; training is earned, not toggled. The Behavioral Ledger records every event. The Phosphor Greenhouse is always on, always watching.

**Key Characteristics:**
- Deep-void dark substrate with CRT phosphor overlays: global scanlines, green grid texture, pixel-hard drop shadows
- Two accent colors only: Phosphor Bloom (operational, healthy, surveillance) and Caution Harvest (activate, enter, begin)
- Typography mixing architectural display (Bebas Neue, wide tracking) + terminal mono (Fira Code, tight) + human body (Inter, legible): three registers, each with a single purpose
- Motion uses `steps()` easing to feel like frame-by-frame rather than CSS animation; smooth cubic-bezier reserved for cinematic transitions only
- No radius above 4px; creature cards use an octagon clip-path (8px chamfer) that reads as mechanical, not organic
- Interactive pet accents (four creature colors, five mood colors) animate into surfaces only when their creature is contextually present


## 2. Colors: The Ecological Surveillance Palette

The palette is an ecology in artificial light: deep-void backgrounds, one living green, one warning amber, and a cast of creature-specific tones that animate only when their pet is present.

### Primary
- **Phosphor Bloom** (`#00e676` / oklch(82% 0.25 150)): The operational signal. Used for garden health indicators, system-active states, focus rings, on-brand text highlights, and every state that means "this is working." Carries both "healthy" and "surveillance" simultaneously. Present on 15-20% of any surface at most.
- **Phosphor Bloom Light** (`#69f0ae` / oklch(88% 0.15 150)): Gentler variant for hover fills, happiness bars, and soft success states. Never the primary signal — always secondary to Phosphor Bloom.

### Secondary
- **Caution Harvest** (`#ffb347` / oklch(80% 0.18 65)): The only warm color in a cold system. Reserved exclusively for primary CTAs, player name entry, and the activate action. If Phosphor Bloom is the system's steady state, Caution Harvest is the invitation to enter. Its warmth is alien to the rest of the palette, which is the point.
- **Caution Harvest Light** (`#ffd080`): Hover state for gold-primary buttons only.

### Tertiary

Each pet has one accent color that tints their card, badge, and ecological feedback. These colors never mix and never appear without creature context.

- **Fox Ember** (`#ff8a50`): Ember the fox. Warm combustion orange.
- **Bunny Flush** (`#ff6090`): Bun. Hot pink, slightly alarming. Correct for an AI optimized for emotional manipulation.
- **Cat Ultraviolet** (`#b388ff`): Cat. Cool lavender, slightly alien. An AI that shifts to suit the room.
- **Dog Straw** (`#ffd54f`): Dog. Dull gold. Reliable but overconfident.

The mood palette records facial expression inference against garden response:
- **Mood Happy** (`#ffd54f`), **Mood Sad** (`#64b5f6`), **Mood Stressed** (`#ff6e6e`), **Mood Surprised** (`#ff80ab`), **Mood Neutral** (`#69f0ae`)

### Neutral
- **Void Matter** (`#050805`): Deepest background. Not pure black — tinted toward the garden biome (oklch chroma 0.006). The canvas everything else sits on.
- **Void Base** (`#080c09`): Base surface, one step above void matter.
- **Text Luminant** (`#c8d8ce`): Primary text. Slightly teal-shifted cool white. Clinical.
- **Text Mid** (`#7a9488`): Secondary text and UI labels. The system in a quieter register.
- **Text Dim** (`#4a6258`): Muted text: timestamps, metadata, ghost labels.
- **Text Ghost** (`#344a40`): Faintest readable text. Persistent chrome that barely registers.

State colors: **System Success** (`#00e676` — same as Phosphor Bloom, intentional: health and success share one signal), **System Warning** (`#ffd54f`), **System Danger** (`#ff5252`).

**The Scarcity Rule.** Phosphor Bloom and Caution Harvest are the only colors that carry interactive meaning. Pet accent colors are decorative and contextual. No new colors may be introduced for UI states — map to an existing token.

**The Cold Field Rule.** Every neutral is tinted toward the garden temperature: green-adjacent, cold. Pure achromatic grays (`#808080`, `#d4c4b0`) are foreign to this palette and prohibited.


## 3. Typography

**Display Font:** Bebas Neue (sans-serif fallback)
**Headline / Label / Mono Font:** Fira Code (monospace fallback)
**Body Font:** Inter (sans-serif fallback)

**Character:** The pairing is deliberately uncomfortable. Bebas Neue (wide, compressed, architectural) handles scale — it reads like a sign installed without asking. Fira Code handles everything systematic: buttons, labels, boot text, UI state. Inter is the only humanist voice in the system, entering only when a sentence needs to be read, not scanned.

### Hierarchy
- **Display** (Bebas Neue, 400, `clamp(4rem, 13.5vw, 11rem)`, line-height 0.9, tracking 0.10em): Wordmarks and hero titles only. One per screen, treated like a physical sign.
- **Headline** (Fira Code, 700, `clamp(1.8rem, 3vw, 2.4rem)`, line-height 1.15, tracking 0.06em): Section headings and panel heads. Always uppercase.
- **Title** (Fira Code, 700, `clamp(1.6rem, 3.4vw, 2.6rem)`, line-height 1.0, tracking 0.08em): Loading final line, large in-game state labels.
- **Body** (Inter, 400, `1.02rem`, line-height 1.9, tracking 0.03em): Creature descriptions and anywhere a full sentence must be read. Max 60ch per line.
- **Label** (Fira Code, 600, `0.75rem`, tracking 0.14em, uppercase): Button text, system labels, chip and badge text. The terminal's operational voice.
- **Caption** (Fira Code, regular, `0.68rem`, tracking 0.22em): Timestamps, metadata, section counters. Near-invisible by design.

**The Mono-Dominant Rule.** Fira Code outnumbers Inter across the interface at roughly 4:1. Inter appears only when prose legibility is the actual goal. Every interactive label, system state, and status message is monospaced. The machine speaks in columns, not paragraphs.

**The Press Start 2P Exception.** The behavior log page (`postit-behavior-log.html`) uses Press Start 2P exclusively. This page is deliberately a different surface — a physical wall of notes, not a terminal. Press Start 2P is prohibited everywhere else.


## 4. Elevation

This system is flat at rest. Nothing floats. Depth is communicated exclusively by pixel-offset hard shadows (2-4px solid offset, zero blur radius) and tonal surface stacking (void-base to bg-glass to raised surface). The two mechanisms reinforce each other: the surface you are on is always darker than the thing interacting with you; the interactive element has a hard shadow that drops toward a specific corner, making it feel like a physical object placed on a table.

Phosphor glow is not elevation. The `box-shadow: 0 0 20px rgba(0,230,118,0.12)` glows on title plates and creature cards are additive light emissions — they come from inside the element, not above it. Never interpret glow as elevation.

### Shadow Vocabulary
- **Pixel Drop Small** (`2px 2px 0 rgba(0,0,0,0.5)`): Interactive elements at rest — creature badges, small chips, inline controls.
- **Pixel Drop Medium** (`3px 3px 0 rgba(0,0,0,0.6)`): Default interactive offset for speech bubbles and hovered creature cards.
- **Pixel Drop Large** (`4px 4px 0 rgba(0,0,0,0.65)`): Primary buttons and elevated panels.
- **Glow Green** (`0 0 20px rgba(0,230,118,0.12)`): System-active phosphor bloom. Not elevation.
- **Glow Gold** (`0 0 20px rgba(255,179,71,0.12)`): CTA phosphor bloom. Used with btn-gold and the creatures section background.

**The Flat By Default Rule.** Surfaces rest flat. Shadows appear only in response to state: hover displaces the button (-1px, -1px) and shadow grows (3px to 4px). Nothing lifts at rest. Active states press in: button translates (+2px, +2px) and shadow collapses to near-nothing.

**The No Blur Rule.** `box-shadow` values carry zero blur radius for structural shadows. The only exceptions are phosphor glow (20-60px blur) and CRT vignettes — both are light emission, not elevation. If it looks blurry as structure, remove it.


## 5. Components

### Buttons
Two primary variants, both Fira Code mono, uppercase, letter-spaced, 2px radius, pixel hard drop shadows. No soft rounded buttons exist in this system.

- **Primary (Gold) — `btn-gold`**: Background Caution Harvest (`#ffb347`), text `#0a120e`. Padding 15px 40px. Min-height 48px. Shadow `3px 3px 0 rgba(0,0,0,0.4)`. Hover: translate(-1px,-1px), shadow grows to 4px. Active: translate(+2px,+2px), shadow collapses. Focus: `outline: 2px solid rgba(255,179,71,0.5)` offset 3px.
- **System (Green) — `btn-green`**: Background Phosphor Bloom (`#00e676`), text `#0a120e`. Padding 13px 32px. Min-height 44px. Same pixel-shadow treatment.
- **Ghost Continue — `section-continue-btn`**: Transparent, Phosphor Bloom text, `1px solid rgba(0,230,118,0.28)` border, radius 0. Uppercase Fira Code 0.88rem, tracking 0.22em. Appears only as a sequential-progress affordance — not for primary actions.

### Inputs
- **Name Input — `landing-input`**: Fira Code 1rem, background `rgba(8,14,10,0.7)`, border `1px solid rgba(0,230,118,0.1)`, radius 2px, padding 16px 28px, center-aligned text. Focus: border shifts to Phosphor Bloom, soft glow `0 0 20px rgba(0,230,118,0.08)`. No color-fill on error — border shift only.

### Cards / Creature Panels
- **Corner Style:** 4px radius (`--radius-lg`) with `clip-path: polygon` cutting 8px diagonal chamfers at each corner. This reads as mechanical, not organic.
- **Background:** `rgba(8,14,10,0.85)` — the glass-panel dark.
- **Border:** `1px solid rgba(0,230,118,0.06)` at rest. On hover: shifts to `color-mix(in srgb, var(--card-accent) 25%, transparent)` — the creature's own accent bleeds in.
- **Shadow Strategy:** No shadow at rest. On hover: `3px 3px 0 rgba(0,0,0,0.6)` + faint creature-color glow.
- **Internal Padding:** 28px 18px 22px — unequal vertical rhythm, more space at top than bottom.

### System HUD Panel
The terminal backing plate. Dark near-opaque background (`rgba(2,12,7,0.90)`), strong Phosphor Bloom border (`1px solid rgba(0,230,118,0.55)`), four-layer box-shadow: dark ring, green ring, inner glow, hard offset. Corner pixel accents (10x10px Phosphor Bloom squares) mark top-left and bottom-right corners as literal pixel markers. This component is the face of the system — use it only for title plates and primary status panels.

### Navigation
No traditional nav bar. Screens are stacked and transitioned in JS. In-game navigation uses a pet-switcher row (icon chips), a back button (ghost: Fira Code 0.78rem, transparent, dim text, hard pixel shadow), and a fixed section counter (mono caption, pixel-bordered, bottom-right).

### Chat Input (Signature Component)
Full-width chat textarea matching `landing-input` styling, with a distinctive focus mechanic: the entire `chat-listen-bar` above the input shifts from muted to Phosphor Bloom active when the field is focused. The system's "listening" state is signaled spatially across the full input region, not just on the element itself.


## 6. Do's and Don'ts

### Do:
- **Do** use hard pixel-offset shadows (`2px 2px 0`, `3px 3px 0`, `4px 4px 0`). These are the only structural shadows in the system.
- **Do** use `steps()` easing for all UI transitions that should feel mechanical: `steps(2,end)` to `steps(8,end)`. Reserve `cubic-bezier(0.22, 1, 0.36, 1)` for narrative cinematic moments — splash entrance, game transitions — only.
- **Do** keep all interactive corners at 2-4px maximum. The octagon clip-path on creature cards is the most complex permitted shape.
- **Do** use Phosphor Bloom (`#00e676`) for system-active states: focus rings, health indicators, on-state borders, active nav markers. It is operational, not decorative.
- **Do** keep Inter body text at `line-height: 1.9` and under 60ch per line. The only humanist voice in the system needs room to be read.
- **Do** honor `prefers-reduced-motion`. Pixel-step transitions are already reduced by nature — still gate them behind the media query. Cinematic transitions (splash zoom, loading scan) should become instant cuts under reduced motion.
- **Do** tint every neutral toward the garden temperature. Even `void-base` (`#050805`) carries chroma 0.006 toward green. No pure neutral grays.

### Don't:
- **Don't** build anything that looks like Claude, Notion, or a ChatGPT interface. The "calm productivity tool" aesthetic is explicitly prohibited: white space, soft rounded type, muted gray accents, explanatory sidebar copy, smooth entrance animations. If it would look at home in a SaaS pricing page, rework it.
- **Don't** use gradient text — `background-clip: text` with a gradient background. Decorative, never meaningful. Use a single solid color; emphasis comes from size or weight.
- **Don't** blur structural UI elements. Glassmorphism, frosted card effects, `backdrop-filter: blur()` on panels — prohibited except in transitional cinematic layers (splash screen, loading screen). Not decorative.
- **Don't** use a metric-card layout: large number, small label, supporting stats, gradient accent. This is the SaaS dashboard pattern the system explicitly rejects.
- **Don't** introduce a neutral non-tinted gray. Pure `#808080` or warm `#d4c4b0` are foreign to this palette.
- **Don't** use `border-left` greater than 1px as a colored accent stripe on any card, alert, or list item. Use full borders, background tints, or nothing.
- **Don't** animate layout properties (`width`, `height`, `top`, `left`, `padding`, `margin`). Transform and opacity only.
- **Don't** use Press Start 2P in the main game UI. It is reserved for the behavior log page, which is a distinct surface with its own rules.
- **Don't** use `box-shadow` with a blur radius for structural depth. Glow (20px+) is permitted as additive light. Structural shadows are always hard-offset, zero blur.
