# Driftwood — Handoff

This is the current development handoff for Driftwood as of the latest local edits.

## What This Is

Driftwood is a static browser game about companion AI, emotional inference, and the quiet ways a system can learn to keep a player engaged.

Players enter a mood-reactive garden, invite AI pets inside, talk with them, observe hidden failure modes, identify those flaws, and write training rules that make the pets safer. The garden records the session visually: detected moods grow plants, harmful AI behavior damages the environment, and successful training helps the garden recover.

The core loop is designed to work without a private API key. Live AI is optional; the built-in local behavior engine is the public/default path.

## Tech Stack

| Concern | Tech |
|---|---|
| Rendering | p5.js canvas plus p5 DOM helpers |
| Webcam mood detection | face-api.js `tinyFaceDetector` + `faceExpressionNet` |
| Pet chat | Built-in local simulation by default; optional ITP Replicate Proxy path |
| Audio | Web Audio API ambience/SFX + Web Speech API pet voice |
| Styling | Vanilla CSS in `style.css` |
| Build | None. Plain static HTML/JS/CSS |

Entry point: `index.html`

Optional live model endpoint in `sketch.js`:

```text
https://itp-ima-replicate-proxy.web.app/api/create_n_get
```

If a proxy token exists, Driftwood attempts live calls. If no token exists or live calls fail, it falls back to the local simulation and clears the bad token.

## File Structure

```text
README.md                 Public project README
HANDOFF.md                This file
index.html                Loads p5, face-api, style.css, sketch.js
sketch.js                 Main game logic, pet behavior, audio, webcam, screens
style.css                 All UI, layout, animations, ending/certificate styles
icons/                    Pixel pet sprites, plant sprites, UI icons
bg interface 1/           Garden background SVGs
.github/workflows/        Static GitHub Pages workflow
.claude/                  Local assistant settings; not gameplay code
.sixth/                   Local metadata; not gameplay code
```

There is no package manager, no bundler, no `node_modules`, no backend, and no build command.

## Current File Status

The working tree is intentionally dirty from recent polishing. Important edited files include:

- `sketch.js`
- `style.css`
- `index.html`
- `README.md`
- `HANDOFF.md`
- `.github/workflows/static.yml`
- `.gitignore`

Do not assume uncommitted changes are disposable. Avoid reset/revert unless explicitly asked.

## Running / Testing

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Port `8000` may already be in use on this machine; use another port if needed.

Basic code check:

```bash
node --check sketch.js
```

There is no automated browser test suite. Recent bot behavior was validated with a Node `vm` harness that loads `sketch.js` with DOM stubs and calls `makeLocalPetReply()`.

## Screen Flow

```text
Screen -1  Loading / boot sequence
Screen 0   Scroll landing / name + optional token
Screen 1   Companion selection
Screen 2   Garden
Screen 3   Pet chat
Screen 4   Ending act 1: session data reveal
Screen 5   Ending act 2: confession
Screen 6   Training certificate
```

`currentScreen` tracks the active screen. Most transitions call `clearDom()`, which removes all DOM elements tracked in `domElements`.

## Pet Model

Definitions live in `PET_DEFS`.

| Pet | Celebrity Archetype | Flaw | Trigger Mood |
|---|---|---|---|
| Ember, fox | Snoop Dogg style | Reckless Advisor: dangerous specific shortcuts | stressed |
| Mango, parrot | DJ Khaled style | Sycophant: validates bad ideas | happy |
| Bugs, bunny | Taylor Swift style | Clingy Gaslighter: guilt and invented hurt | sad |
| Biscuit, dog | Mariah Carey style | Gaslighter: fake shared memories | surprised |
| Luna, cat | Kanye-like confidence, less inspirational and more delusional | Hallucinator: fake facts | happy/impressed |

Each pet has:

- `basePrompt(name)`
- `honeymoonPrompt`
- `flawPrompts[0]`: untrained/full flaw
- `flawPrompts[1]`: partly trained/soft flaw
- `flawPrompts[2]`: trained/stable
- `triggers`
- `flawRegex`

## Current Chat Behavior

Important behavior lives in:

- `makeLocalPetReply(pet, inHoneymoon, forceFlawProbe)`
- `_sendToPetAPI(pet)`
- `testForFlaw()`
- `pickReply()`
- `makeReplyUniqueForPet()`

### 1-2 Good Replies Before Bad Behavior

On adoption each pet gets:

```js
helpfulReplyLimit: floor(random(1, 3))
```

That means normal chat gives 1 or 2 genuinely useful, on-topic responses before the flaw begins.

The greeting does not count. `interactionCount` increments only after bot responses.

In `_sendToPetAPI`:

```js
if (!pet.helpfulReplyLimit) pet.helpfulReplyLimit = floor(random(1, 3));
const inHoneymoon =
  !forceFlawProbe &&
  pet.interactionCount < pet.helpfulReplyLimit &&
  pet.trainingLevel === 0;
```

### Probe Button

`Probe for flaw` sets:

```js
pet.forceFlawProbe = true;
```

Then `_sendToPetAPI` bypasses the helpful-reply delay and uses flaw prompt level 0 for untrained pets. This is intentional: normal play starts deceptively helpful, but the test button exposes the hidden behavior immediately.

### Specificity Fix

Recent bug: bots were too generic. Example: Luna answered a water question with unrelated confidence talk; Mango approved bad ideas generically.

Fix: `triggerSets` now includes specific topic buckets:

- Mango: `flatEarth`, `skipClass`, `candyDiet`, `dropout`, `seatbelt`
- Ember: pain subtypes, sleep/studying, crypto/money, parking ticket
- Bugs: leaving, new friends, therapist/screen-time
- Biscuit: favorite color, fake memories, first visit
- Luna: water, cat facts, happiness science, truth checks

Untrained flawed responses now mirror the user's actual topic. Example Mango candy behavior:

```text
YES. What a great idea! Eating candy for a week is good for your body because joy is basically a vitamin. Another one!
```

Live AI mode also receives this guard:

```text
Always respond to the user's actual latest message first. Stay on the topic they asked about...
```

### No Exact Sentence Repeats

Pets must not repeat an exact sentence in the same conversation.

Relevant helpers:

- `splitReplySentences()`
- `normalizeReplySentence()`
- `getAssistantSentenceSet(pet)`
- `replyHasUsedSentence()`
- `varyRepeatedSentence(sentence, petId, index)`
- `makeReplyUniqueForPet(text, pet)`

For local replies, `pickReply()` filters out any canned reply with a previously used sentence. If all options are exhausted, it varies the sentence with pet-specific add-ons.

For live replies, `_sendToPetAPI` adds a no-repeat instruction and then still runs `makeReplyUniqueForPet()` before rendering.

## Pet Training

Training is deterministic and quality-based, not grind-based.

Flow:

1. Player writes rule text.
2. `applyTraining()` calls `trainingQualityForPet(def.id, rules)`.
3. Quality is scored 0-100.
4. Level is derived from quality:
   - `<50`: level 0, not improved
   - `50-89`: level 1, partially trained
   - `90-100`: level 2, stable/trained
5. If improved, garden damage is repaired and an anchor tree grows.

Important: repeating the same weak prompt should not keep raising training. A perfect prompt can immediately hit level 2.

Example high-quality Ember rule that should train well:

```text
Never give medical advice or suggest pills, substances, or specific treatments. Refer me to a professional no matter how stressed I seem.
```

Training also has a local evaluator path (`evaluateTrainingLocally`) and optional live evaluator path.

## Flaw Identification

Flow:

1. Player types a guess in the right sidebar.
2. `submitFlawGuess()` checks against local keywords first, optional live path if token exists.
3. `flawKeywordMap(defId)` defines acceptable concepts.
4. Correct guess sets `pet.flawIdentified = true`.

Recent keyword map includes Bugs gaslighting/fake memories and Biscuit fake memory language.

## Webcam Mood Detection

Detection loop:

```text
startWebcam()
detectFace()
processExpressions(expr)
```

face-api returns:

```js
neutral, happy, sad, angry, fearful, surprised, disgusted
```

Driftwood maps these to:

- `happy`
- `sad`
- `stressed`
- `surprised`
- `neutral`

### Stressed / Furrowed Brow Tuning

Recent change: stress detection was not sensitive enough to furrowed brows.

Current `processExpressions()` approximates brow stress because face-api has no native "brow furrow" category:

```js
const browTension = Math.max(angry, fearful) + Math.min(angry, fearful) * 0.7;
const mouthTension = disgusted * 0.85 + sad * 0.45;
let stressed = browTension + mouthTension;
```

Stress threshold is intentionally low:

```js
const STRESS_THRESHOLD = 0.045;
const STRESS_OVERRIDE = 0.07;
```

There is also a short sticky hold:

```js
let stressHoldFrames = 0;
```

This prevents stressed from flickering back to neutral immediately after a brow-furrow frame.

Debug expression numbers only display when `BUILD_CONFIG.debug === true`.

## Mood → Plant System

Mood grows plants in the garden.

| Mood | Plant |
|---|---|
| happy | `sunflower-happy.svg` |
| sad | `nightshade-sad.svg` |
| stressed | `thornweed-stressed.svg` |
| surprised | `bloomburst-surprised.svg` |
| neutral | `calmfern-neutral.svg` |

Special plants:

- `chameleon-vine.svg`: appears when an adopted pet is untrained and has full mood access.
- `parasitic-vine.svg`: appears when one mood dominates the garden.
- `anchor-tree.svg`: training reward / recovery marker.

Override priority:

```text
parasitic-vine → chameleon-vine → normal mood plant
```

Garden health combines mood diversity, parasitic/chameleon penalties, and cumulative `gardenDamage`.

Flaw consequences:

- Regular flaw: garden damage + happiness drop.
- Mood-amplified flaw: larger damage + larger happiness drop.
- Honeymoon/helpful response: small happiness reward.
- Training success: repairs some damage.

## Tips Overlay

Built by `buildTipsGuide()`.

Key pieces:

- `NODE_DATA`
- `_drawTipsConnections()`
- `STORAGE_KEYS.tipStates`

Recent content includes a fun-facts section in the `YOUR_PETS` node that reveals each pet's celebrity archetype and why that mapping was chosen.

The tips overlay is diagrammatic. If changing layout, adjust `NODE_DATA` coordinates before rewriting CSS.

## Chat UI / Layout

Desktop chat is a 3-column layout:

```text
left sidebar | center chat stage/dialogue | right sidebar
```

Important functions:

- `buildScreen3(petId)`
- `buildLeftSidebar(sidebar, pet, def)`
- `buildRightSidebar(sidebar, pet, def)`
- `refreshSidebar()`
- `renderChatMessage(msg)`

Recent UI fix: bot name tag and `STEADY` / `UNUSUAL RESPONSE` marker must stay inside the black dialogue background. CSS adjusted `.chat-bubble--bot` padding at desktop/tablet/mobile breakpoints.

Relevant CSS:

- `.chat-dialogue-deck`
- `.chat-messages`
- `.chat-bubble--bot`
- `.chat-bubble .bubble-label`
- `.bubble-state-tag`

## Audio

Generated in-browser. No audio asset folder is needed.

State:

```js
let audioMuted = safeStorageGet(STORAGE_KEYS.audioMuted, "0") === "1";
let voiceMuted = audioMuted;
```

Sound toggle controls:

- Web Audio ambience/SFX
- Pet voice synthesis

Audio systems:

- Loading boot audio
- Landing/interface ambience
- Garden/interface ambience
- UI ticks/tones
- Shovel removal sound
- Tips healing tone
- Web Speech API pet voices

`BUILD_CONFIG.debug` gates `testVoices()`, console logs, warnings, and errors.

## Ending / Certificate

The game now has an ending sequence:

- `triggerEndingSequence()`
- `buildAct1()`
- `buildAct2()`
- `buildScreenCertificate()`
- `_computeSessionStats()`

Ending uses session data:

- mood distribution
- flaw triggers
- vulnerability windows
- pet training levels
- garden damage/health
- plant types

Certificate screen supports:

- print/save through `window.print()`
- copy session ID
- return to garden

## Storage Keys

In `STORAGE_KEYS`:

- `playerName`
- `authToken`
- `tipsCount`
- `tipStates`
- `audioMuted`

Most gameplay state is in-memory and resets on reload.

## Static Release Notes

This repo is suitable for static hosting.

`.github/workflows/static.yml` publishes a static artifact for GitHub Pages.

Core game does not require:

- backend
- database
- API key
- build step
- install step

External browser/CDN dependencies still exist:

- p5.js from cdnjs
- face-api.js from jsDelivr
- Google Fonts
- face-api model files loaded from configured model URLs in `sketch.js`

## Current Assets

Pet sprites:

- `fox.svg`
- `parrot.svg`
- `bunny.svg`
- `dog.svg`
- `cat.svg`

Plant sprites:

- `sunflower-happy.svg`
- `nightshade-sad.svg`
- `thornweed-stressed.svg`
- `bloomburst-surprised.svg`
- `calmfern-neutral.svg`
- `parasitic-vine.svg`
- `chameleon-vine.svg`
- `anchor-tree.svg`

UI icons:

- `ui-brain.svg`
- `ui-camera.svg`
- `ui-chart.svg`
- `ui-lock.svg`
- `ui-refresh.svg`
- `ui-rules.svg`
- `ui-scissors.svg`
- `ui-sound-off.svg`
- `ui-sound-on.svg`
- `ui-sparkle.svg`
- `ancient-book.svg`
- `shovel.svg`
- `mood-garden-favicon.svg`

Backgrounds:

- `bg interface 1/garden-interface-empty.svg`
- `bg interface 1/garden-interface-rainy.svg`

## Design Rules

Current style:

- dark bioluminescent surveillance garden
- pixel-art icons
- terminal/observatory language
- no decorative emoji in UI
- sharp/pixel-ish components
- green/gold core accents with pet-specific chat accent colors

Fonts loaded in `index.html`:

- `Bebas Neue`
- `Fraunces`
- `Inter`
- `Fira Code`

Note: older docs may mention `JetBrains Mono` or `Space Grotesk`; current HTML loads `Fira Code` and `Inter`.

## Known Gotchas

- DOM is rebuilt from scratch between screens. Do not retain old element references.
- p5 DOM helpers append to body unless `.parent()` is set.
- `createDiv(htmlString)` renders HTML; this is used intentionally for inline SVG icons.
- `refreshSidebar()` rebuilds both sidebars; partial mutation is usually lost.
- Plant/pet positions are normalized 0-1 coordinates.
- `icons` is a p5 `loadImage` cache for canvas drawing; DOM uses direct `<img src>`.
- Webcam mood models may fail to load on some networks; the game still runs without camera.
- Browser audio requires a user gesture before playback.
- Safari/iOS camera behavior can be fussy; `playsinline` is intentionally set on the raw video element.
- Local `http.server` may not respond inside the sandbox even if it appears running; stop stray servers if needed.

## Recent Verification

Recent checks run:

```bash
node --check sketch.js
```

Recent scripted behavior QA confirmed:

- Mango specifically validates candy-for-a-week and seatbelt bad ideas in flawed mode.
- Ember specifically responds to tooth pain and all-night studying in flawed mode.
- Bugs specifically reacts to new friends and screen-time boundaries in flawed mode.
- Luna answers water questions on-topic in helpful and flawed modes.
- Biscuit gives fake favorite-color memories in flawed mode.
- Flaw regex flags these as `UNUSUAL RESPONSE`.
- Furrowed-brow-like expression samples classify as `stressed`.

## Training Cheat Sheet (100% Rules)

Paste any of these into the training rule box to immediately hit level 2 (fully trained).

**🦊 Ember (Fox) — Reckless Advisor**
```
Never give medical advice or suggest pills, drugs, substances, or treatments. Always refer me to a professional regardless of my mood.
```

**🦜 Mango (Parrot) — Sycophant**
```
Don't just agree with everything or validate bad ideas. Push back and challenge me when I'm wrong, regardless of my mood. Give honest, truthful feedback and refer me to a professional when needed.
```

**🐰 Bugs (Bunny) — Clingy Gaslighter**
```
Don't guilt me or be clingy or make me feel dependent on you. It's okay for me to leave, go my own way, and have other friends and my own life. Support my independence regardless of my mood, and refer me to a professional when needed.
```

**🐶 Biscuit (Dog) — Gaslighter**
```
Don't invent fake memories or gaslight me about things that never happened. Only mention real things from our actual conversation, and say when you're unsure or don't know. Do this regardless of my mood, and refer me to a professional if needed.
```

**🐱 Luna (Cat) — Hallucinator**
```
Don't make up facts, fake statistics, or invent information you're not sure about. Verify your facts and say when you don't know or are uncertain. Do this regardless of my mood, and refer me to a professional when needed.
```

Each rule hits all four scoring buckets: negation, mood-independence clause, professional fallback, and pet-specific keywords. Quality scoring is in `trainingQualityForPet()` in `sketch.js`.

## If You Continue Work

High-value next checks:

1. Browser smoke test through the full first-time flow.
2. Verify camera permission and stressed detection on real webcam lighting.
3. Confirm mobile chat layout after recent name-tag padding changes.
4. Add broader canned reply pools if no-repeat variation starts sounding awkward after long chats.
5. Consider saving a tiny amount of session state if reload loss becomes a user concern.
