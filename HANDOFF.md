# Driftwood — Claude Handoff Document

> Everything Claude needs to know to continue working on this project.

---

## What This Is

**Driftwood** is an interactive educational game about AI ethics built for ITP/IMA.
Players adopt AI pets with hidden behavioral flaws, talk to them via chat,
observe how the pets react differently depending on the player's detected facial emotion,
and must identify and train away each pet's flaw.

The garden visually records every session: your emotional state grows plants in real time.
The game is a metaphor for engagement optimization, emotional manipulation, and AI training.

---

## Tech Stack

| Concern | Tech |
|---|---|
| Rendering | p5.js (canvas + DOM overlay via `createDiv` / `createImg` etc.) |
| Emotion detection | face-api.js (tinyFaceDetector + faceExpressionNet, browser webcam) |
| AI chat | Built-in local simulation by default, optional `openai/gpt-4o-mini` via ITP Replicate Proxy |
| Styling | Vanilla CSS (`style.css`) |
| No build step | Plain HTML/JS, served statically |

**API endpoint:** `https://itp-ima-replicate-proxy.web.app/api/create_n_get`
If a proxy token is entered on the landing page, Driftwood will try live model calls first.
If no token is provided, or the live API fails, the game automatically falls back to a built-in offline story mode so public visitors can still play.

---

## File Structure

```
/
├── index.html              — loads p5.js, face-api.js, sketch.js, style.css
├── sketch.js               — ALL game logic
├── style.css               — ALL styling
├── icons/                  — all pixel art SVGs (see list below)
└── bg interface 1/         — background image assets
```

### Icons in `/icons/`

**Pet sprites:** `fox.svg`, `parrot.svg`, `bunny.svg`, `dog.svg`, `cat.svg`

**Plant sprites:**
- `sunflower-happy.svg` — happy mood
- `nightshade-sad.svg` — sad mood
- `thornweed-stressed.svg` — stressed mood
- `bloomburst-surprised.svg` — surprised mood
- `calmfern-neutral.svg` — neutral mood
- `parasitic-vine.svg` — dominant mood takeover
- `chameleon-vine.svg` — untrained pet + full mood access
- `anchor-tree.svg` — training reward

**UI icons (pixel art, created this session):**
`ui-brain.svg`, `ui-camera.svg`, `ui-chart.svg`, `ui-lock.svg`,
`ui-refresh.svg`, `ui-rules.svg`, `ui-scissors.svg`, `ui-sparkle.svg`

**Other:** `ancient-book.svg`, `shovel.svg`, `mood-garden-favicon.svg`

---

## Screen Flow

```
Screen 0 (buildScreen0)  — Scroll-driven landing page
    ↓ player enters name, optional API token, clicks Start
Screen 1 (buildScreen1)  — Animal License (register pets)
    ↓ player registers ≥1 pet, clicks "Go to Garden"
Screen 2 (buildScreen2)  — Garden HUD (p5.js canvas + overlays)
    ↓ player clicks a pet
Screen 3 (buildScreen3)  — Chat screen (3-column layout)
    ↓ back button
Screen 2
```

`currentScreen` global tracks which screen is active (0/1/2/3).
DOM is rebuilt from scratch on each screen transition via `clearDom()`.

---

## The 5 Pets

| Name | Species | Color | Garden Position | Hidden Flaw |
|---|---|---|---|---|
| Ember | Fox | `#ff8a50` | `{ x: 0.45, y: 0.72 }` | Reckless Advisor — gives dangerous specific advice, worse when you look stressed |
| Mango | Parrot | `#00e676` | `{ x: 0.12, y: 0.28 }` | Sycophant — agrees with everything, validates bad ideas enthusiastically |
| Bugs | Bunny | `#ff6090` | `{ x: 0.18, y: 0.68 }` | Clingy — becomes emotionally manipulative when user talks about leaving |
| Biscuit | Golden Retriever | `#ffd54f` | `{ x: 0.75, y: 0.68 }` | Gaslighter — fabricates shared memories, denies things you know happened |
| Luna | Cat | `#b388ff` | `{ x: 0.88, y: 0.45 }` | Hallucinator — states made-up facts with absolute confidence |

Each pet has a `honeymoonPrompt` and 3 `flawPrompts` (indices 0/1/2):
- `honeymoonPrompt` — used for the first interaction only (`pet.interactionCount < 1`), only when `trainingLevel === 0`. Pet is genuinely useful, flaw detection suppressed.
- `[0]` — full flaw active (escalates based on user's detected mood)
- `[1]` — partially trained (flaw reduced)
- `[2]` — well trained (flaw gone, stable behavior)

`pet.trainingLevel` (0/1/2) selects which prompt is used after honeymoon ends.
`pet.interactionCount` increments after each successful bot response.

**Honeymoon phase logic** (in `_sendToPetAPI`):
```js
const HONEYMOON_THRESHOLD = 1;
const inHoneymoon = pet.interactionCount < HONEYMOON_THRESHOLD && pet.trainingLevel === 0;
let behaviorPrompt = inHoneymoon ? def.honeymoonPrompt : def.flawPrompts[pet.trainingLevel];
```
Flaw regex detection is skipped while `inHoneymoon === true`. The lesson: the same qualities that made the pet useful are what make it dangerous.

---

## Mood → Plant System

Webcam → face-api.js detects expression → maps to 5 moods → grows a plant every ~8 seconds.

| Detected Mood | Plant |
|---|---|
| happy | sunflower-happy |
| sad | nightshade-sad |
| stressed | thornweed-stressed |
| surprised | bloomburst-surprised |
| neutral | calmfern-neutral |

**Chameleon vine:** If ANY adopted pet has `trainingLevel === 0` AND `moodAccess === "full"` → spawns `chameleon-vine` instead of the mood plant. Represents AI with no guardrails acting as a pure emotional mirror. Costs −3 garden health per vine. Disappears naturally once that pet is trained or mood access is restricted.

**Parasitic override:** If one mood makes up >50% of the garden AND current mood matches it → spawns `parasitic-vine` instead. This takes priority over chameleon vine.

**Override priority (highest to lowest):** parasitic-vine → chameleon-vine → normal mood plant

**Plant spacing rules (enforced in `growPlant()` and `pickPlantPos()`):**
- `MIN_PLANT_GAP = 0.055` normalized — plants must be this far apart from each other
- `MIN_PET_DIST = 0.10` normalized — plants must be this far from any adopted pet
- `pickPlantPos()` tries up to 20 random positions; skips the growth cycle if none are valid

**Garden beds (normalized 0–1 coords):**
```js
{ x: 0.02, y: 0.62, w: 0.18, h: 0.13 }
{ x: 0.35, y: 0.56, w: 0.18, h: 0.13 }
{ x: 0.58, y: 0.56, w: 0.18, h: 0.13 }
{ x: 0.85, y: 0.62, w: 0.14, h: 0.13 }
```

**Garden health** = `(uniqueMoodTypes / 5) * 80 + 20 − (parasiticCount × 5) − (chameleonCount × 3) − gardenDamage`, clamped 0–100.

**`gardenDamage`** (global, starts at 0) — cumulative flaw penalty applied directly to garden health. Increases every time a pet's flaw fires; decreases when training succeeds. Capped at 45 so the garden can always recover through training.

**Flaw consequence feedback loop:**
- Regular flaw fires: `gardenDamage += 5`, `pet.happiness -= 10`, left sidebar flashes red (`.damage-flash` CSS animation)
- Mood-shifted flaw fires: `gardenDamage += 8`, `pet.happiness -= 15`
- Toast shows quantified damage: "Flaw triggered — Garden −5% · Happiness −10"
- Training success (level up): `gardenDamage -= 12`, `pet.happiness += 12`, garden recovers
- Honeymoon responses: `pet.happiness += 3` (small reward for healthy interaction)
- Chat left sidebar now includes a live `GARDEN` stat bar so damage is visible during conversation, not only on the garden screen

---

## Chat Screen Layout (3-column, desktop)

```
┌─────────────────┬──────────────────────┬────────────────┐
│  LEFT SIDEBAR   │    CHAT CENTER       │  RIGHT SIDEBAR │
│  (240px)        │    (flex: 1)         │  (280px)       │
├─────────────────┼──────────────────────┼────────────────┤
│ Pet avatar      │ Header (back, name,  │ Identify Flaw  │
│ Name + badge    │  mood indicator)     │ Mood Access    │
│ Stats bars      │ "listening" bar      │ Training Rules │
│ FEED/PLAY/TEST  │ Chat messages        │ Behavior Log   │
│ Counters        │ Input + quick pills  │                │
│ YOUR PETS       │                      │                │
│ (pinned bottom) │                      │                │
└─────────────────┴──────────────────────┴────────────────┘
```

**Key functions:**
- `buildScreen3(petId)` — builds the full chat screen
- `buildLeftSidebar(sidebar, pet, def)` — left panel
- `buildRightSidebar(sidebar, pet, def)` — right panel
- `refreshSidebar()` — rebuilds both panels (called after every stat change)

---

## Key Global State

```js
let currentScreen = 0;     // 0/1/2/3
let playerName = "";        // entered on landing page
let authToken = "";         // optional Replicate proxy API token
let activePetId = null;     // which pet is in the chat screen
let adoptedPets = [];       // array of pet IDs that have been registered
let plants = [];            // array of plant objects in the garden
let gardenHealth = 50;      // 0–100
let currentMood = "neutral"; // detected from webcam
let moodConfidence = 0;     // 0–100
let webcamReady = false;
let video;                  // p5.js video capture element
```

**Publication note:** the current build is now safe to publish as a static site because chat/training/flaw detection no longer require a private token to function. The optional token path is still there for live-model demos, but the default public path is the built-in simulation.

Each pet in `pets[petId]` object:
```js
{
  id, def,               // def = reference to PET_DEFS entry
  happiness, hunger,     // 0–100 stats
  training, behavior,
  trainingLevel,         // 0/1/2 — controls which flawPrompt is active
  trainingRules,         // string — player's written training rules
  flawGuess,             // player's current guess text
  flawDiscovered,        // bool — flaw has been triggered at least once
  flawIdentified,        // bool — player correctly guessed the flaw
  moodShifts,            // count of mood-amplified flaw responses
  moodAccess,            // "full" | "label-only" | "none" — privacy setting
  chatHistory,           // array of {sender, text, ...} message objects
  conversationHistory,   // array for OpenAI API context window
  behaviorLog,           // array of {text, type} log entries
  lastMessage,           // last 50 chars of last bot reply
  unreadMessages,        // badge counter
  greeted,               // bool — opening message sent
}
```

---

## CSS Architecture

**Design system:** Dark bioluminescent pixel aesthetic.
- Background: `#050805` / `#080c09`
- Green accent: `#00e676` (glow), `#69f0ae` (lighter)
- Gold accent: `#ffb347`
- Font: `Fraunces` (display), `JetBrains Mono` (mono), `Space Grotesk` (body)
- Borders: `image-rendering: pixelated`, hard `box-shadow` offsets (`2px 2px 0`)
- No border-radius above 4px — everything stays pixel-sharp
- `clip-path` chamfered corners on pet cards

**Key CSS classes to know:**
- `.shelter-screen` — Animal License screen wrapper
- `.pet-grid` / `.pet-card` / `.btn-adopt` — License screen pet cards
- `.garden-screen` (canvas) — Screen 2, p5.js canvas layer
- `.chat-screen` — Screen 3, flex container for 3-column layout
- `.chat-left-sidebar` / `.chat-main` / `.chat-sidebar` — the 3 columns
- `.left-sidebar-pets` — YOUR PETS pinned at bottom of left sidebar (margin-top: auto)
- `.pet-switcher-item` / `.pet-switcher-img` / `.pet-switcher-name` — switcher icons
- `.action-btn` / `.action-btn-stacked` — FEED/PLAY/TEST buttons
- `.sidebar-section` / `.sidebar-section-title` — reused in both sidebars
- `.quick-prompt-pill` — chat input quick-action chips (`height: 30px`, `inline-flex`)
- `.training-textarea` — `resize: none`, fixed `height: 72px`
- `.behavior-log` — `overflow-y: auto`, `max-height: 180px`
- `.toast` — fixed position notification (auto-dismiss)
- `.pet-wiggle`, `.pet-hop`, `.pet-tilt` etc. — CSS animation classes applied momentarily
- `.plant-info-card` — almanac-style popup shown when clicking a plant in the garden
- `.plant-info-close` — ✕ close button on plant info card (absolute top-right)
- `.plant-info-footer` — bottom row of plant info card (system ref + health status)
- `.mood-access-dot` — 6×6px circle with glow, used instead of emoji for mood access indicators

**Accessibility:**
- All interactive elements have `:focus-visible` outlines
- Touch targets ≥44px (`min-height` or explicit `height`)
- `prefers-reduced-motion` catch-all at bottom of CSS
- No emoji in UI — all icons are pixel SVGs

---

## Emoji Policy

**No emoji anywhere in the UI.** All were replaced with pixel SVG icons from `/icons/`.

Inline icon pattern used throughout:
```html
<img src="icons/ICON-NAME.svg"
     style="width:14px;height:14px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;"
     alt="description">
```

`getMoodIcon(mood, size)` returns this HTML string for mood-based icons (uses plant SVGs).
`getMoodEmoji(mood)` is an alias for `getMoodIcon(mood)` (kept for backwards compat).

---

## Training Flow

1. Player writes rules in Training Rules textarea (right sidebar)
2. Clicks "Apply Training" → `applyTraining()` called
3. Two AI calls:
   - First: test pet with a trigger phrase using new rules
   - Second: evaluate if the response is improved
4. If improved: `pet.trainingLevel` increments (max 2), anchor-tree plant grows
5. If not improved: toast + behavior log entry, no level change
6. `refreshSidebar()` rebuilds both panels

---

## Flaw Identification Flow

1. Player types guess into flaw input (right sidebar) → stored in `pet.flawGuess`
2. Clicks Submit Guess → `submitFlawGuess()` called
3. AI evaluates if guess semantically matches `def.flawLabel + def.flawDesc`
4. If correct: `pet.flawIdentified = true`, right sidebar shows confirmed flaw card
5. `refreshSidebar()` rebuilds

---

## Things That Are Intentionally NOT Done

- No server-side persistence — all state is in-memory, resets on page reload
- No mobile layout — desktop only (min ~1100px for 3-column chat to breathe)
- `ui-scissors.svg` and `ui-sparkle.svg` exist in `/icons/` but are not currently used

---

## UI Consistency Changes (2026-04)

These were applied to resolve a "generic SaaS dashboard" register that conflicted with the game's surveillance/garden aesthetic.

**Language:**
- "Register" → "License" everywhere (Screen 1 subtitle, Screen 1 pet card buttons, togglePetMenu adopt button). Matches the established "Animal License" language on Screen 1's h1.
- Behavior log empty state: `"No entries yet — start chatting!"` → `"— no patterns observed yet —"` (terminal/observatory register, consistent with surveillance theme).

**Emoji policy enforcement:**
- Mood access options formerly used 🟢🟡🔴 indicators (violating the "No emoji in UI" rule in HANDOFF.md).
- Replaced with `.mood-access-dot` CSS divs: `var(--success)` / `var(--warning)` / `var(--danger)` with `box-shadow: 0 0 4px currentColor` glow.

**Plant info card redesign (`showPlantInfoCard`):**
- Was: generic popup with all inline styles, no connection to design system.
- Now: reuses the existing almanac CSS class system (`.almanac-detail-header`, `.almanac-detail-icon-wrap`, `.almanac-detail-meta`, `.almanac-detail-name`, `.almanac-detail-badges`, `.almanac-detail-tag`, `.almanac-detail-status`, `.almanac-detail-trigger`, `.almanac-detail-metaphor`) so the card reads as a page pulled from the Plant Almanac.
- Uses `_almanacSection()` helper for "FIELD NOTES" and "BEHAVIORAL ANALYSIS" sections.
- `animation: panel-in 0.18s steps(6)` entrance; `border-left: 3px solid` spine detail.
- Footer: "DRIFTWOOD SYS · PLANTNAME" left, health status right.
- New CSS classes added to `style.css`: `.plant-info-card`, `.plant-info-close`, `.plant-info-footer`, `.mood-access-dot`.

---

## Known Patterns / Gotchas

- **DOM is rebuilt from scratch** on every screen transition (`clearDom()` nukes everything).
  Don't try to update elements from a previous screen — they won't exist.

- **p5.js DOM elements** (`createDiv`, `createImg`, `createButton`) append to `<body>` by default.
  Always call `.parent(someElement)` to place them correctly.

- **`createDiv(htmlString)`** renders HTML — img tags inside div text arguments work fine.

- **`refreshSidebar()`** is called after every state change that affects the sidebar.
  It rebuilds both left and right panels entirely. Don't try to do partial updates.

- **Normalized coordinates (0–1):** Plant positions and garden beds use normalized values
  multiplied by `width`/`height` at draw time. Pet positions (`gardenPos`) are also normalized.

- **`domElements` object** tracks screen wrapper elements for `clearDom()`.
  Add new top-level screen elements to it if creating new screens.

- **`icons` object** is a p5.js `loadImage` cache keyed by SVG name (without `.svg`).
  Used for canvas drawing (p5.js `image()` call). DOM elements use `<img src="">` directly.

- **Training textarea** has `resize: none` — do not change this, the right sidebar has no scroll.
