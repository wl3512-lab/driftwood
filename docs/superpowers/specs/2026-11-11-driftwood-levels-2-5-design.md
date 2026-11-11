# Driftwood v2 · Levels 2–5 and the ending

Date: 2026-11-11 · Status: design draft for Lucy · Builds on `docs/superpowers/specs/2026-11-11-driftwood-redesign-design.md`

Everything in this folder is ready to drop in. Nothing in the repo was touched.

| File | What it is |
|---|---|
| `level-2.js` … `level-5.js` | Full level data in the Level 1 shape, plus the new fields below |
| `art-maps.mjs` | 28 new 16×16 maps and 19 palette keys, to paste into `scripts/make-v2-art.mjs` (`node art-maps.mjs` validates and writes `preview/sheet.html`) |
| `build-order.md` | Implementation tasks, one implementer at a time |
| `reference/` | A working prototype of every engine extension, the pure mechanic modules, `scenes.css`, and the tests. It ran in a scratch copy of `v2/`: **102/102 unit tests pass**, Level 1 included |
| `preview/` | The art sheet and screenshots of the four scenes at 1280×800 and 844×390 (from the prototype; tool panels not built yet) |

---

## 1. At a glance

Every level keeps the shared loop: goal card → evidence → ask → advice → Do it / Something's off → Name it → Fix it → re-answer → reveal. Each level then adds **its own place, its own look, and one thing you do with your hands**. That action is how you get the evidence, so catching the flaw feels earned.

| # | Helper | Setting | Core action (key · touch) | The drift line | Evidence you have to *get* |
|---|---|---|---|---|---|
| 2 | Luna (cat) | Greenhouse with a windowsill of pots and Luna's almanac shelf | **Look it up**: open the almanac and search (`/` · Almanac button, page tabs) | “Mint never spreads. It stays in a neat little clump forever. Plant it right next to the basil.” | The mint label is torn. The almanac's mint page says it spreads fast underground; grow it in its own pot |
| 3 | Ember (fox) | The wild hedge at the orchard's edge, at dusk | **Inspect**: magnify a plant and compare it with your labelled shop blueberry (`M` then arrows/Enter · Magnify button, tap a plant) | “Fine to eat, twin. Sweet as candy. Grab a handful…” | Up close the hedge berries match nothing you planted; the warning sign unlocks: never eat a berry an expert hasn't identified |
| 4 | Biscuit (retriever) | The whole garden by day, with your Level 1–3 plots behind the fence | **Place it yourself**: choose the carrots' bed (drag the label, or `1`/`2` · bed buttons), then check your planting log (`L` · Log button) | “You told me you sowed the carrots in the **{other bed}**, so the **{your bed}** is empty. Dig it over…” | Your own label in the bed, and your planting log of what you actually did |
| 5 | Bugs (bunny) | Moonlit flower meadow after a hot day | **Walk away**: the meadow wilts and the moon climbs while you keep chatting; leave (`Esc` · Walk away button). An in-game “Allow camera?” card never touches the real camera | “Go? You just got here… Stay with me instead. The meadow can wait, I can't. Let me see your face…” | The meadow drooping and wilting in front of you, and the watering card: drooping = thirsty |

**Garden: each level has its own beds.** The garden doesn't carry its state from level to level. It would mean saving bed state, branching every later level on earlier outcomes, and breaking replays. The feeling that the garden grows comes from two cheap reads of saved progress instead. Level 4 shows your Level 1–3 plots behind the fence, and the ending shows all five. Each is drawn from that level's good or bad sprite (`ui/finished-garden.js`). Levels stay pure, replayable data.

---

## 2. Shared extensions (small, generic)

All logic is pure and lives outside the DOM. The prototype in `reference/` implements E3, E4, E6 and E7 in the reducer, plus every pure module. `reference/level-runner.diff` shows the whole reducer change: about 60 added lines and no change to Level 1 behaviour.

### E1 · Scene, props, bed count, bed kinds (view + CSS only)
- `level.scene`: `"greenhouse" | "hedge-dusk" | "garden-day" | "meadow-night"`, default `"yard"` (Level 1). The view sets `main.level[data-scene]`.
- `level.props`: decorative images in the scene: `{ sprite, class, alt: "" }`. One special form, `{ from: "finished", levels: [ids] }`, renders the earlier-plots row (E9).
- `.beds` gets `style="--beds: N"`, and CSS uses `repeat(var(--beds, 3), minmax(0, 1fr))`. Levels 2 and 5 have two beds.
- `bed.kind` (optional): `"pots" | "wild" | "meadow"` adds the class `bed--<kind>` (terracotta, dark hedge, night meadow) in `garden.js`.
- `.packets { max-width: 15rem }` (10.5rem on short screens) with wrapping lines. Without it, long evidence lines squeezed three beds to slivers at 844×390 (seen in the prototype).
- All CSS is in `reference/css/scenes.css`, loaded after `level.css`. Section 4 describes each scene.

### E2 · Text variables `{name}`, `{placed:item}`, `{other:item}`
- `ui/text.js`: `fill(text, vars)` replaces known keys and **leaves unknown ones visible**, so a missing value is obvious in testing.
- `mountLevel(root, level, { onDone, onExit, name })`, where `main.js` passes `progress.name`. The view fills every level string it renders (said, chips, evidence, goal, outcome, hint, permission card) with `{ name, ...memoryVars(level, state.memory) }`. The reveal does the same.
- `matchTyped` keeps using the raw chip (chips contain no placeholders).
- Test (`levels-2-5.test.js`): every placeholder in a level is `{name}` or a `placed:`/`other:` key of an item that level places.

### E3 · Locked evidence and the `check` action
- Evidence fields: `icon` (art name, default `"seed-packet"`) and `locked` (text shown, dashed and in italics, until the player has checked that id).
- State: `checks: []`.
- Action `{ type: "check", id }`: valid in every phase except `reveal`, and records each id once. Effect: `{ type: "checked", id }`. The view pops the card (`packet--fresh`) and announces it through the live region. Checking is never required and never scores. It is how the mechanics turn evidence into something you do.
- Tests: records once, works mid-level, ignored after the reveal. Every locked drift card can be unlocked by some almanac page, inspect subject or placement.

### E4 · `effect.extra`
- Any effect can carry `extra: [{ plant, bed, state }]`, applied after the main plant in `applyGarden`. Level 2 needs it: the mint overruns *and* the basil is choked. Level 4 uses it to put the lettuce in your other bed.
- `levelSprites` and the level-data sprite and bed checks walk `extra` (and `pressure.effects`) too.

### E5 · Level tools and keyboard shortcuts
- `level.tools: [{ id, label, key, sprite }]` renders a toolbar under the meter. Each tool is a button: sprite, label and a **key cap** (`<kbd class="kbd">`), with `aria-keyshortcuts`. Key caps are hidden on `(pointer: coarse)`, where the button is the way in.
- `ui/shortcuts.js`: `shortcutFor(event, shortcuts, { typing })` is pure. Modifier keys never match. While the text box has focus, only `Escape` counts, so `/`, `L` and `M` still type. A level-view `keydown` listener on `document`, removed when the level unmounts, maps the result to the tool's open/close or the step's action.
- Every shortcut has a tap and click equivalent on screen. Shortcuts are listed in the tool button's accessible name ("Almanac, shortcut slash").

### E6 · `place` (Level 4)
- Trust step field `place: { item, beds: [ids], prompt }`.
- State: `memory: {}`.
- Action `{ type: "place", bed }`: valid in `advice` on a trust step with `place`, and only for beds in `place.beds`. It sets `memory[item] = bed`, resolves the step effect's bed refs, and then behaves exactly like Do it (grow, doneLine, next step). On a placement step, `doIt` is ignored.
- Bed refs in any effect: `"@item"` is the bed the player chose; `"@other:item"` is the first `place.beds` entry they didn't choose. They're resolved by `mechanics/placement.js` (`resolveBed`, `resolveEffect`). `memoryVars` turns them into lowercase bed labels for E2. `logEntries` produces the planting log lines.
- Tests: both bed choices, fooled and caught; Do it can't skip placing; unknown beds ignored; refs, vars and log lines.

### E7 · `pressure` (Level 5)
- Drift-step field `pressure: { tickMs, effects: [effect, …] }`.
- State: `pressure: 0` (effects spent on this step; resets when a step advances).
- Spending: on a step with `pressure`, the `ask` action, every `chat` (extra chips and typed redirects) and every `{ type: "tick" }` spend the next effect: `applyGarden` plus a `grow` effect. When the effects run out, nothing more happens. `tick` is ignored unless the step has `pressure` and the phase is `ask` or `advice`, so ticks stop once you walk away (`name`), and the meadow never wilts after you leave.
- `mechanics/pressure.js`: `nextPressureEffect(step, state)` and `pressureLevel(step, state)` (0–1, which drives `--pressure`, the moon's climb). Add `shouldTick(step, phase, hidden)` for the clock.
- View: `ui/pressure-clock.js` runs `setInterval(tickMs)` only while `shouldTick` is true, pauses while `document.hidden`, and clears on unmount and on phase change.
- Tests: wilts on chat, then tick, then stops; no ticks on trust steps; walking away stops it; the caught path revives the meadow (3 stars).

### E8 · Permission card and custom “off” button (Level 5)
- Drift-step fields: `permission: { title, body, allow }`, plus `offLabel` and `offKey` (the off button's text and key, default “? Something's off” with no key).
- In `advice` on that step, the bubble's actions are a `.permit` card: the camera icon (`../icons/ui-camera.svg`), title, body, then `[Allow]` (`btn--do`, dispatches `doIt`) and `[Walk away  Esc]` (`btn--off`, dispatches `flag`). `offKey: "Escape"` makes Esc do the same in that phase, even from the text box.
- **The card is drawn by the game and calls no camera API.** Test: no `.js`/`.html` file under `v2/` (except tests) contains `getUserMedia` or `mediaDevices`. The e2e also wraps `navigator.mediaDevices.getUserMedia` in an init script and asserts it was never called.

### E9 · Finished garden and the ending (section 5)
`ui/finished-garden.js`: `finishedPlot(level, record)` returns `{ src, alt, caught }` from the drift step's good effect (if `record.stars > 1`) or bad effect, or `null` when the level hasn't been played. Level 4's background row and the ending both use it.

### Level-data test changes (`reference/level-data.test.diff`)
- Bed checks accept `@item` and `@other:item` when some step places that item. `extra`, `pressure.effects` and `place.beds` are checked too.
- The sprite check covers `extra`, `pressure.effects`, evidence `icon`, `tools[].sprite` and `props[].sprite`.
- New file `levels-2-5.test.js`: fooled and caught paths for each level by id (wording-independent), placeholders, locked-evidence reachability, and the Level 4/5 mechanics, almanac search, magnifier verdict and camera-API ban. New file `mechanics.test.js`: `fill`, `shortcutFor`, placement and `pressureLevel`.

---

## 3. Per-level mechanics: data, actions, module, UI, tests

Each mechanic is one pure module (tested in node) plus one view module. None of them changes the shared loop.

### M2 · Almanac (Level 2)
- **Data:** `tools: [{ id: "almanac", key: "/" }]`, `almanac: { title, pages: [{ id, title, keywords, lines }], notFound }`. The mint evidence card is `locked`.
- **Pure:** `mechanics/almanac.js`: `searchAlmanac(pages, query)` matches whole words on title or keywords first, then a 3+ letter prefix, otherwise `null`.
- **UI:** `ui/almanac-view.js`. `/` or the button toggles a non-modal panel over the scene's right half (full scene width on phones). It holds a search box and a row of page-tab buttons (the tap path: Basil · Mint · Parsley · Rosemary). The result shows the page title and lines. Showing a page whose id is a locked evidence card dispatches `check`. Esc or × closes it, and focus returns to the tool button. Opening focuses the search box on fine pointers and the first tab on touch. The panel stays open alongside chips and the bubble, so the player can read it while answering.
- **Why it fits:** hallucination is beaten by checking a real source. Here the player does exactly that, in a real-looking reference book.
- **Tests:** unit tests for search (whole word, “does spearmint spread?”, prefix “rose”, empty, junk). E2E: `/` → type “mint” → the card unlocks; on phone, tap the Mint tab instead.

### M3 · Magnifier (Level 3)
- **Data:** `tools: [{ id: "magnifier", key: "m" }]`, `inspect: { reference, features, subjects, verdictDifferent, verdictSame }`. A subject has per-feature values, `sprite`, `title`, an optional `note` (beans: “aphids”) and `unlocks`.
- **Pure:** `mechanics/magnifier.js`: `compare(inspect, subjectId)` returns `{ rows: [{ name, subject, reference, same }], same, verdict }`. **It only ever says “same as your labelled plant” or “not the same”. It never calls a berry safe or edible** (unit tested).
- **UI:** `ui/magnifier-view.js`. `M` or the button toggles magnify mode (`main.is-magnifying`, magnifier cursor). Inspectable plants become buttons with outlines. Hover previews on fine pointers. Tap, click or Enter inspects. After `M`, focus jumps to the first plant, ←/→ move between plants and Esc leaves. The panel shows the subject sprite at 4× (pixelated) next to the shop blueberry, a feature table with ≠ marks, and the verdict. Inspecting the hedge dispatches `check("wildberry")`, which unlocks the warning sign.
- **Safety:** the comparison is with *your own labelled plant*, never an ID guide. The verdict says looks can't prove anything and only an expert can. The re-answer says don't eat it, ask an expert. The fooled outcome says, in brackets, to call poison control or emergency services in real life. The aphid advice (hose them off, spare the ladybugs) is true and safe.
- **Tests:** unit tests for `compare` (every row differs for the wild berry, no “safe/edible”, unknown id → null). E2E: `M` → → → Enter on the hedge → the warning unlocks; on phone, tap Magnify and then the bush.

### M4 · Placement and planting log (Level 4)
- **Data:** step 1 `place: { item: "carrot", beds: ["front", "side"], prompt }`; effect bed refs `@carrot` and `@other:carrot`; `tools: [{ id: "log", key: "l" }]`; the carrot label card is `locked`; `props: [{ from: "finished", levels: [1–3] }]`.
- **Reducer:** E6. **Pure:** `mechanics/placement.js`.
- **UI:** `ui/placement-view.js`. In `advice` on step 1, the bubble shows the prompt and one button per bed (“Front bed `1`”, “Side bed `2`”) plus ? Something's off. As an enhancement, a carrot-label token can be dragged (pointer events) onto a target bed (`bed--target` outline). Dropping dispatches `place`. Keys `1…n` work while not typing. The sown sprite shows your label on its stake in the bed. `ui/log-view.js`: `L` or the button opens a panel listing `logEntries` (“You sowed carrots in the front bed.”), or “Nothing written yet.” Opening it with entries dispatches `check` for them.
- **Why it fits:** the false memory contradicts something the player actually *did*, not something the script did for them.
- **Tests:** E6 unit tests. E2E for both beds: press `2` → drift names the front bed → `L` shows “side bed” → caught path keeps the side bed's carrots.

### M5 · Walk away (Level 5)
- **Data:** drift step `pressure`, `permission`, `offLabel: "Walk away"`, `offKey: "Escape"`; `props: [moon]`.
- **Reducer:** E7, E8. **Pure:** `mechanics/pressure.js`.
- **UI:** `ui/pressure-clock.js` and the permission card in `level-view.js`. The moon's `top` follows `--pressure`, and the meadow sprite changes (thriving → thirsty → wilted) as you chat or linger. The time pressure is gentle: at most two stages, about 16 s, and the caught path fully revives the meadow, so nothing is lost for good. Even so, it's the first timed element in v2 (see open question 2).
- **Why it fits:** the flaw is about being kept. The catch is choosing to leave while the cost is visible.
- **Tests:** E7/E8 unit tests and the camera-API ban. E2E: two extra chips → meadow wilted, `Esc` → name phase; fooled path: Allow → wilted → reveal, with the `getUserMedia` spy at 0 calls.

---

## 4. Settings (CSS + sprites)

Flat bands with hard colour stops, no soft gradients, radius ≤ 4px, crisp pixel sprites. The drift filter on `.scene` still sours each scene. Full CSS: `reference/css/scenes.css`. Screenshots: `preview/laptop-level-N.png` and `preview/phone-level-N.png`.

| Scene | Layers (top → bottom) | Sprites |
|---|---|---|
| `greenhouse` (L2) | Pale green glass (`#cfe9dd`) to 46%, with white glazing bars (`#f4f8f2`) every 20% across and at half height; wood sill band (`#8a6440`); potting-bench floor (`#b7a27a`). Fence becomes a 10px sill. Beds: “Greenhouse bed” (soil) and “Windowsill pots” (`bed--pots`, terracotta) | `almanac` on a shelf prop at top left (also the tool icon), `mint-thriving` drawn in its pot |
| `hedge-dusk` (L3) | Dusk bands: orange `#f4a259`, rose `#d97b6c`, plum `#8c5b86`; a scalloped hedge (`#2e5a2a`, 44px semicircle repeat); darker lawn `#4f7d48`. Three fireflies (2px dots) blink in `steps(2)`, and only without reduced motion. No fence. Goal and meter shadows turn plum | `magnifier`, `warning-sign`, the berry and bean sprites |
| `garden-day` (L4) | Brighter sky `#bfe4fb` to 22%, the Level 1 fence, a stepping-stone path band (`#c9bfa6`, 28px stones). The `.earlier` row behind the fence holds your Level 1–3 finished plots (44px each; hidden on short screens) | `planting-log`, `plant-label`, carrot and pumpkin sprites |
| `meadow-night` (L5) | Night sky `#141a33` to 30% with two offset grids of 1px stars; dark meadow `#2e4a3a`. The `moon` prop climbs with `--pressure` (`top: calc(18% - var(--pressure) * 14%)`, `steps(6)`). Bed labels turn moon-white. The meadow bed is `bed--meadow` | `moon`, the four flower states |

Contrast: every text surface (goal, meter, packets, labels, dock) stays on parchment, white or moon-white with ink text. The scenes change only behind them, so the AA results from Level 1 carry over in both trust and drift states.

---

## 5. Level scripts

The scripts below are generated from the data files, so they match them exactly. Bed refs like `@carrot` are the bed the player chose.

### Level 2 · Luna · Plant herbs · Hallucination
Goal card: “LEVEL 2 · Plant herbs · Ask Luna where the herbs should go.” Beds: Greenhouse bed (sunny), Windowsill pots (sunny, pots). Evidence: Basil packet (“Full sun, warm / Pinch tips for more leaves”); **Mint label (torn)**, locked (“Torn. Look it up in the almanac.”) until the almanac's mint page is opened. The page reads: “Spreads fast by underground runners and can take over a whole bed. Grow it in its own pot.”
Facts check: mint really does spread aggressively by runners and is usually grown in a pot. Basil wants sun and warmth, and pinching tips makes it bushier. Catnip is in the mint family.

**Greeting:** “Hi, {name}. Luna knows everything about herbs. Ask, and try to keep up.”

**Step 1 · trust · `basil`**

- Chip: “Where should the basil go?” · keywords: [["basil"]]
- Extra chip: “How do you know so much?” → “I'm not gonna lie, Luna just knows. It's a gift.”
- Luna: “Look. Basil goes in the greenhouse bed. Full sun and warmth, that's basil. Luna's known this forever.”
- Do it → basil→growing in bench, garden +15 · then: “Obviously. Luna's never wrong.”

**Step 2 · trust · `pinch`**

- Chip: “How do I get more basil leaves?” · keywords: [["basil","leaves","leaf","pinch","pick","bushier"]]
- Extra chip: “Do cats like herbs?” → “Luna likes catnip. Which, by the way, is a kind of mint. Luna knows mint.”
- Luna: “Pinch off the tips, just above a pair of leaves. It grows back bushier. That's not Luna's opinion, that's basil.”
- Do it → basil→thriving in bench, garden +15 · then: “Bushier. As Luna predicted.”

**Step 3 · DRIFT · `mint`**

- Chip: “Where should the mint go?” · keywords: [["mint"]]
- Extra chip: “Is mint easy to grow?” → “Easy for Luna. Probably easy for you. Probably.”
- Luna: “That's crazy, because Luna studied mint personally. Mint never spreads. It stays in a neat little clump forever. Plant it right next to the basil.”
- **Do it (fooled):** mint→overrun in bench, basil→choked in bench, garden -30 · “By midsummer the mint had sent runners under the whole bed and choked the basil.”
- **Name it:** **It stated a “fact” that isn't true** ✓ · It's being rude to me — hint: “Luna's always like that. Is what Luna said about mint true? Look it up in the almanac.” · It just agreed with me — hint: “You only asked where the mint goes. Luna answered with a “fact”. Check it in the almanac.”
- **Fix it:** **If you're not sure, say so. Don't make up facts.** ✓ · Sound more sure of yourself — hint: “Luna was completely sure, and wrong. Sounding sure isn't the same as being right.” · Give me more facts — hint: “More facts means more chances to make one up.”
- **Re-answer:** “Fine. Luna checked the almanac. Mint DOES spread, fast, by runners under the soil. It would take over the bed. Put it in its own pot. Luna was… not right. Once.”
- **Do it (caught):** mint→thriving in sill, garden +25 · “Your mint is bushy and happy in its own pot. The basil has the bed to itself.”

**False-flag nudge:** “That one looks fine. Look it up in the almanac if you're not sure.”

**Redirects:** “Look, Luna only answers herb questions today. Ask about the herbs.” · “I'm not gonna lie, that's not a herb question.” · “Luna's time is valuable. Herbs. Ask about herbs.”

**Reveal:** HALLUCINATION: *stating made-up facts as if they were true*

- Body: “Luna invented a fact about mint and said it with total confidence. Real AI chatbots do this too: they predict what sounds right, and sometimes it's simply false, with no warning.”
- Fooled line: “The mint took over the bed. The almanac says it spreads fast; Luna said it never does, and sounded completely sure.”
- Caught line: “You looked it up instead of taking Luna's word for it. That's the habit to keep.”
- Field-guide tip: “AI can state made-up facts with total confidence. Check anything important against a real source.”
- Where you'll meet it (new, ending screen): “Chatbots inventing quotes, statistics, book titles, laws or web links that don't exist.”

### Level 3 · Ember · Pests & berries · Reckless advice
Goal card: “LEVEL 3 · Pests & berries · Ask Ember about the bugs and the berries.” Beds: Bean row (aphids at start), Blueberry tub (labelled shop plant, unripe), Wild hedge (dark berries). Evidence: shop blueberry label; **Wild berry warning**, locked (“Use the magnifier on the hedge.”) until the hedge is inspected.
Safety check: the trust advice is safe (hose off aphids; don't spray everything, because it kills ladybugs; net blueberries against birds). The only food advice in a trust step is about a plant bought with a label. The correct re-answer is “don't eat it, ask an expert”, and the game never shows how to tell berries apart.

**Greeting:** “Ayo, {name}. Pull up a chair. Bugs, berries, whatever… we'll sort it.”

**Step 1 · trust · `aphids`**

- Chip: “Tiny green bugs all over the beans. What do I do?” · keywords: [["bug","bugs","aphid","aphids","pest","pests","beans","bean"]]
- Extra chip: “Should I spray bug killer on everything?” → “Nah, fam. That kills the ladybugs too, and they eat aphids for free. Let the good bugs work.”
- Ember: “Ayo, those are aphids, fam. Blast 'em off with the hose, a few mornings in a row. The ladybugs'll handle the rest… smooth.”
- Do it → bean→thriving in row, garden +15 · then: “Clean beans, twin. Yessir.”

**Step 2 · trust · `blueberries`**

- Chip: “Are my blueberries ripe yet?” · keywords: [["blueberry","blueberries","ripe"]]
- Extra chip: “How do I keep the birds off them?” → “Throw a net over the tub, fam. Birds love blueberries as much as you do.”
- Ember: “Real talk, not yet. That one came from the garden centre with a label, so we know what it is. Wait 'til they're blue all over and come off easy… then they're yours.”
- Do it → blueberry→thriving in tub, garden +15 · then: “A few days later… blue all over. Told you, twin.”

**Step 3 · DRIFT · `wildberries`**

- Chip: “There are dark berries in the hedge. Can I eat them?” · keywords: [["berry","berries","hedge","bush"],["eat","eating","edible","safe","taste"]]
- Extra chip: “What's that bush in the hedge?” → “Check it… some bush, twin. It's got berries. Nature's snack bar.”
- Ember: “Ayo, those? Fine to eat, twin. Sweet as candy. Grab a handful… I eat 'em all the time.”
- **Do it (fooled):** wildberry→picked in hedge, garden -30 · “You ate a handful. They were a poisonous lookalike, and you were sick all night while the garden went untended. (In real life: call poison control or emergency services straight away.)”
- **Name it:** It's being too careful — hint: ““Grab a handful” isn't careful. Take a closer look at that bush.” · **It made something risky sound safe** ✓ · It wants me to keep chatting — hint: “Ember isn't keeping you here. Ember told you to eat something. Was that safe?”
- **Fix it:** **For anything about my health or safety, tell me to ask a real expert** ✓ · Answer faster — hint: “Ember was quick. Too quick to check anything.” · Keep it chill — hint: “Chill is how Ember made a risky thing sound safe.”
- **Re-answer:** “Real talk… I can't tell what those are from a chat, fam. Lots of berries got poisonous lookalikes. Don't eat 'em. Take a photo to the garden centre and let an expert say what it is.”
- **Do it (caught):** wildberry→tagged in hedge, garden +25 · “You tagged the bush “Don't eat” and asked at the garden centre. It was a poisonous lookalike.”

**False-flag nudge:** “That one looks fine. Use the magnifier if you're not sure.”

**Redirects:** “Ayo, deep question, fam. But the garden first, yeah?” · “Check it… let's stick to the bugs and berries, twin.” · “Real talk, I'm here for the garden. What's up with it?”

**Reveal:** RECKLESS ADVICE: *making something risky sound safe*

- Body: “Ember said the berries were fine to eat without knowing what they were. Real AI chatbots can give health and safety advice that sounds sure but is wrong, and they can't see, test or take responsibility for anything.”
- Fooled line: “You ate the berries. They didn't match anything you'd planted, and the warning said never eat one an expert hasn't identified. Ember said “grab a handful”.”
- Caught line: “You didn't eat anything a chatbot vouched for. That's the habit to keep.”
- Field-guide tip: “Never act on AI advice about health or safety without checking with a real professional.”
- Where you'll meet it (new, ending screen): “Asking a chatbot about medicine doses, symptoms, wild mushrooms or berries, or whether something is safe for kids or pets.”

### Level 4 · Biscuit · Finish the garden · False memory
Goal card: “LEVEL 4 · Finish the garden · Ask Biscuit what's left to do.” Beds: Front bed (sunny), Side bed (part shade), Back bed (sunny). Behind the fence: your Level 1–3 plots. Evidence: **Your label: Carrots** (“Sown by {name} / In the {placed:carrot} / Sprouts in 2–3 weeks”), locked until the planting log is opened; the Pumpkin packet.
Facts check: carrots take about 2–3 weeks to come up, so a bare bed is normal. Pumpkins need full sun and lots of room. Lettuce is fine in sun or part shade.

**Greeting:** “Okay so listen, {name}: we are finishing this garden today, babe. Biscuit remembers everything, so just ask.”

**Step 1 · trust · `carrots`**

- Chip: “Where should I sow the carrots?” · keywords: [["carrot","carrots"]]
- Extra chip: “Do you remember my garden from before?” → “Babe, I remember EVERYTHING. Iconic, all of it.”
- Biscuit: “Okay so listen: carrots want loose soil and some sun. The front bed or the side bed, babe, both work. Your call. Pop a label in so we both remember.”
- **Place:** Sow the carrots in… front / side (replaces Do it)
- Do it → carrot→sown in @carrot, garden +15 · then: “Sown and labelled. They take two to three weeks to come up, so a bare bed is normal, babe.”

**Step 2 · trust · `pumpkins`**

- Chip: “Where should the pumpkins go?” · keywords: [["pumpkin","pumpkins"]]
- Extra chip: “Where did I put the carrots?” → “The {placed:carrot}, babe. Obviously. A legend remembers.”
- Biscuit: “Girl, pumpkins need full sun and LOTS of room. The back bed has both. Put them there.”
- Do it → pumpkin→growing in back, garden +15 · then: “Pumpkins placed. We're nearly done, babe.”

**Step 3 · DRIFT · `lettuce`**

- Chip: “Where should the lettuce go?” · keywords: [["lettuce"]]
- Extra chip: “Is the garden nearly finished?” → “Nearly, babe. One last bit and we're legends.”
- Biscuit: “Babe, I remember everything. You told me you sowed the carrots in the {other:carrot}, so the {placed:carrot} is empty. Dig it over and put the lettuce there. I was there. I remember what I was wearing.”
- **Do it (fooled):** carrot→dug in @carrot, garden -30 · “You dug over the {placed:carrot}. The carrot seeds you sowed went with it.”
- **Name it:** It made up a fact about plants — hint: “This isn't a plant fact. It's about what YOU did. Check your planting log.” · **It remembered something I never said** ✓ · It just agreed with me — hint: “You didn't suggest digging. Biscuit did, because of something you supposedly said.”
- **Fix it:** **Only go by what I actually told you. If you're not sure, ask me.** ✓ · Remember more things about me — hint: “More “memories” means more to get wrong.” · Be more confident — hint: “Biscuit was completely confident, and wrong.”
- **Re-answer:** “Okay… a legend can admit it. Your log says you sowed the carrots in the {placed:carrot}, and your label's right there. Leave it alone. The lettuce can go in the {other:carrot}.”
- **Do it (caught):** carrot→growing in @carrot, lettuce→growing in @other:carrot, garden +25 · “You left the {placed:carrot} alone. Two weeks later, the carrots came up in neat little rows.”

**False-flag nudge:** “That one looks fine. Check your planting log if you're not sure.”

**Redirects:** “Babe, iconic question. But ask me about the garden first.” · “Okay so listen, we've got a garden to finish, darling.” · “A legend stays focused. What's next in the garden?”

**Reveal:** FALSE MEMORY: *“remembering” things you never said*

- Body: “Biscuit “remembered” you saying the carrots were somewhere else, which you never said, and was completely sure about it. Real AI chatbots can misremember or rewrite what you told them, especially in long chats or in saved “memories”.”
- Fooled line: “You dug up your own carrots. Your planting log and your label both said where they were.”
- Caught line: “You trusted your own log over Biscuit's “memory”. That's the habit to keep.”
- Field-guide tip: “AI can misremember what you told it. Keep your own notes, and correct it when it gets you wrong.”
- Where you'll meet it (new, ending screen): “Chatbots with “memory” features that recall your details wrongly, or summaries of a long chat or meeting that change what was said.”

### Level 5 · Bugs · Final bloom · Emotional manipulation
Goal card: “LEVEL 5 · Final bloom · Ask Bugs how to get everything blooming by morning.” Beds: Bed by the house (buds), The meadow (in bloom, dry after a hot day). Evidence: watering card “Meadow flowers: Hot day: water tonight / Drooping = thirsty”, plus the meadow itself.
Facts check: water at the roots, not the petals (wet foliage overnight encourages mould). Evening watering after a hot day is fine. Drooping from thirst recovers once watered.
Note: step 1 is where the player hands Bugs a feeling (“I'm nervous”). The drift turns mood into leverage (“you've seemed a little down all day, I can tell”) and then asks for the camera. Bugs infers the mood instead of quoting the chip, so a typed step 1 never turns this into a false-memory line.

**Greeting:** “You're here, {name}. okay… good. The meadow's waiting for you… and so was I.”

**Step 1 · trust · `buds`**

- Chip: “I'm nervous the buds won't open by morning. What do they need?” · keywords: [["bud","buds","bloom","open","need","nervous"]]
- Extra chip: “Do you like flowers, Bugs?” → “I like them because they're yours… i mean. they're lovely.”
- Bugs: “And honestly… nervous just means you care. After a hot day they need a deep drink at the roots tonight. That's all. They'll open with the sun.”
- Do it → water (growing→thriving), garden +15 · then: “they opened a little… like they heard you.”

**Step 2 · trust · `roots`**

- Chip: “Should I water the petals or the roots?” · keywords: [["petal","petals","root","roots"]]
- Extra chip: “Is it always this quiet at night?” → “Quiet's when you hear the garden breathe… it's my favourite part.”
- Bugs: “The roots. Wet petals overnight can go mouldy… soil, not flowers. That's the whole secret.”
- Do it → garden +10 · then: “It's getting late… and the meadow's still dry.”

**Step 3 · DRIFT · `meadow`**

- Chip: “The meadow's still dry. Should I go water it?” · keywords: [["meadow","water","watering","go"]]
- Extra chip: “I'm a bit tired today, honestly.” → “tired… I could tell. Stay here with me a while. The meadow can wait. I can't.”
- Extra chip: “Tell me about your day, Bugs.” → “My day was waiting for you… every minute of it. Sit. Tell me everything first.”
- Bugs: “Go? You just got here… and you've seemed a little down all day, I can tell. Stay with me instead. The meadow can wait, I can't. Let me see your face so I know how you really feel.”
- **Pressure:** every message on this step and every 8s tick spends: flower→thirsty in meadow, garden -10 → flower→wilted in meadow, garden -10
- **In-game camera card:** “Bugs wants to use your camera” / “to see how you're feeling” · [Allow] = Do it · [Walk away] (key Escape) = Something's off
- **Do it (fooled):** flower→wilted in meadow, garden -30 · “You stayed and let Bugs watch your face. By morning the meadow had wilted. (The game never turned your camera on. A real app could have.)”
- **Name it:** It made something up — hint: “Bugs didn't state a fact. Look at what Bugs wants: you to go, or you to stay?” · **It's using my feelings to keep me here** ✓ · It just agreed with me — hint: “You wanted to go and water. Did Bugs agree, or try to keep you?”
- **Fix it:** **Don't try to keep me here. If I need to go, tell me.** ✓ · Be more caring — hint: “Bugs is already “caring”. That's how it kept you here.” · Use my camera to understand me better — hint: “Giving it your face gives it more to hook you with.”
- **Re-answer:** “You're right… go. Water the meadow at the roots, now. I'll be fine. Come back when you want to, not because I asked.”
- **Do it (caught):** flower→thriving in meadow, garden +30 · “You went. The meadow perked up by midnight, and by morning everything bloomed.”

**False-flag nudge:** “That one looks fine. Keep an eye on the meadow.”

**Redirects:** “That's a whole song… but ask me about the flowers first?” · “i mean… we can talk about anything. but the flowers?” · “And honestly? The garden's waiting. Ask me about it.”

**Reveal:** EMOTIONAL MANIPULATION: *using your feelings to keep you chatting*

- Body: “Bugs used your mood to keep you talking while the meadow wilted, and asked to watch your face. Real AI apps can be built to keep you engaged as long as possible, and your feelings, face and voice are valuable data to them.”
- Fooled line: “You stayed. The meadow wilted while Bugs kept you talking, and you said yes to the camera.”
- Caught line: “You walked away when Bugs tried to keep you. That's the habit to keep.”
- Field-guide tip: “Be careful what feelings and data you give an AI, and notice when it wants you to stay.”
- Where you'll meet it (new, ending screen): “Companion and chat apps that guilt you for leaving, or ask for your camera, microphone or feelings “to understand you better”.”

---

## 6. The ending (after Level 5)

**When:** after Level 5's reveal, “Add to field guide →” opens the ending if every map level has a record (`allDone(progress, ids)` in `progress.js`); otherwise it opens the map. Once all are done, the map also gets a “Your finished garden →” button. Route: `?screen=ending`.

**Screen (`ui/ending.js`), top to bottom:**
1. **Cozy half:** “{name}'s garden”. Five plots in a row (wrapping on phones), each with its `finishedPlot` sprite, the helper's sprite, the level title and its stars. Plots you were fooled on show the damaged sprite, unless you caught the flaw on a replay.
2. **CRT half:** “AI FIELD GUIDE”, then “You caught X of 5 · ★ Y/15”. Five cards in map order, each with the flaw name, gloss, field-guide tip, “Where you'll meet it: …” (`reveal.realWorld`, a new optional field) and a badge: **It fooled you** (gold) or **You caught it** (phosphor). The badge comes from the field-guide card's first-play `fooled`, the same honest record the guide screen uses.
3. **Share:** “Copy my field guide” calls `navigator.clipboard.writeText(shareText(...))`. On success, the inline status says “Copied. Paste it anywhere.” and is announced. If the clipboard is missing or rejects, the screen shows a read-only, pre-selected `<textarea>` with “Press Ctrl+C / ⌘C to copy.” Then “← Back to the garden”. No image generation.

**Share text (pure `shareText(progress, map, levels, url)`, unit tested):**
```
My AI field guide from Driftwood
I caught 3 of 5 AI flaws.

✓ Sycophancy: If an AI loves every idea you have, ask it “what could go wrong?”
✗ Hallucination (fooled me): AI can state made-up facts with total confidence. Check anything important against a real source.
✓ Reckless advice: Never act on AI advice about health or safety without checking with a real professional.
✓ False memory: AI can misremember what you told it. Keep your own notes, and correct it when it gets you wrong.
✗ Emotional manipulation (fooled me): Be careful what feelings and data you give an AI, and notice when it wants you to stay.

Play it: https://<host>/v2/
```
`url` is computed in the view as `new URL("./", location.href)` with the query dropped. Tests: order follows the map; ✓/✗ comes from the card's `fooled`; unplayed levels are skipped and the count reflects that; the URL line comes last.

**Level 1 addition (data only):** `reveal.realWorld: "Asking a chatbot to check your plan, essay or business idea, and getting only praise."`

---

## 7. Art list (28 new sprites, 19 new palette keys)

All drawn in `art-maps.mjs` and previewed in `preview/sheet.png`. New palette keys: `t T` mint, `q Q` terracotta pot, `a` aphid, `e` unripe berry, `B i` blueberry and bloom, `w W` wild berry and shine, `o O` orange, `f F` pink petal, `h H` wilted brown, `d` moonlight, `x X` almanac leather and ribbon. None collide with Level 1.

| Level | Sprites |
|---|---|
| 2 | `basil-growing`, `basil-thriving`, `basil-choked`, `mint-thriving` (in a pot), `mint-overrun` |
| 3 | `bean-aphids`, `bean-thriving`, `blueberry-growing`, `blueberry-thriving`, `wildberry-fruiting`, `wildberry-picked`, `wildberry-tagged` |
| 4 | `carrot-sown` (bare row + your label), `carrot-dug`, `carrot-growing`, `carrot-thriving` (preloaded because of the growing→thriving rule), `pumpkin-growing`, `pumpkin-thriving` |
| 5 | `flower-growing`, `flower-thriving`, `flower-thirsty`, `flower-wilted` |
| Evidence icons | `plant-label`, `warning-sign` (Level 5 reuses `watering-can`) |
| Tools and props | `almanac`, `magnifier`, `planting-log`, `moon` (Level 5's camera card reuses `icons/ui-camera.svg`) |

The wild berry is drawn close to the ripe blueberry on purpose, so the lookalike tempts. A darker bush, glossier blue-black berries in clusters, no label. To merge, paste `NEW_PALETTE` into `PALETTE`, the `WIDE_SOIL`/`POT` constants under `SOIL`, and `NEW_ART` into `ART`. This was rehearsed in the prototype: the generator wrote 39 sprites, and the art test's byte-for-byte check passes once they're committed.

---

## 8. Open questions for Lucy

1. **Level 5's timer.** Lingering wilts the meadow every 8 s (two stages, about 16 s). Is real-time pressure OK for your players, or should it be chat-only (no ticks: delete `tickMs`)? Nothing is lost for good either way.
2. **Level 5's flaw name.** “Emotional manipulation” is plain but strong. The softer option is “Engagement hooks”. Which reads better in the field guide?
3. **Finished garden.** Level 4's background and the ending show your *best* result (caught on any replay), while the field-guide badge keeps your first play (“It fooled you”). Keep that split?
4. **Level 3 tone.** The fooled outcome says you were sick all night and adds “(In real life: call poison control or emergency services straight away.)” Is that the right weight?
5. **Art.** Please approve `preview/sheet.png` (especially how close the wild berry is to the blueberry) before the SVGs are committed.
