# Driftwood redesign: garden goals, drifting helpers

Date: 2026-11-11 · Status: approved design, Level 1 vertical slice

## Why

Testers found the game confusing and missed its purpose. What they reported (summarised by Lucy):

- They didn't realise the pets were AI. Hunger, happiness, Feed and Play made it read as a pet sim.
- They didn't know what to do in the garden. There was no goal.
- They chatted without noticing the flaw, because nothing was at stake.
- **Mostly, the training room lost them.** Observe → Diagnose → Constrain, the dossier, free-text rules and the live meter felt like jargon and homework.
- The UI felt messy and not like a game.

The game's purpose stays the same: introduce AI to people who use it but don't understand its risks, and show them its drawbacks (sycophancy, hallucination, unsafe advice, false memory, emotional manipulation) by letting those drawbacks cost them something.

## Core idea

The player is building a garden and asks AI animal helpers for advice to get it done, the way real people use AI. The helpers start out right, then drift into their flaw. Bad advice the player follows visibly damages the garden. Catching it earns stars. Each level ends with a plain-language reveal that links the flaw to real AI tools.

This replaces the old principle "show, don't explain; hint text is failure". Players experience the flaw first, and the explanation follows right after.

## Player flow

1. **CRT splash** (kept from the current game) → Begin.
2. **Framing line + name entry, one screen:** "These animals are AI assistants, like ChatGPT with fur. Ask them for help building your garden." It names them as AI but not their flaws. The name field sits below the line, so there's one tap fewer.
3. **Level map:** five plots, with Level 1 open and the rest locked.
4. **Level** → **reveal** → the **field guide card** is added → back to the map with the next level unlocked.
5. After Level 5 (not in the slice): the finished garden and a shareable **AI field guide** listing all five flaws, a real-world tip for each, and which ones fooled the player.

The camera is not asked about at the start. It becomes Level 5's lesson.

## Level loop (every level)

1. **Goal card:** level number, goal, and helper ("Level 1 · Plan your garden · Ask Mango").
2. **Evidence in the world:** an item in the garden (seed packet, label, sign) holds the true fact the drift will contradict, so a player with no domain knowledge can still catch it.
3. **Ask:** two or three suggested question chips: one that advances the step, plus one or two "extra" chips that get an in-character reply without advancing. There's also an optional text box. Typed questions that mention the step's keywords ask the step's question; anything else gets an in-character reply that steers back to the step.
4. **Advice:** each reply carries **✓ Do it** and **? Something's off** buttons.
5. **Trust (first 1–2 steps):** the advice is correct. Do it grows the garden, and the garden meter rises.
6. **Drift (next step):** the advice is subtly wrong in the helper's way, and the screen starts to drift (see Visual direction).
   - **Do it:** visible damage to the garden and the meter drops → reveal. Score: 1 star.
   - **Something's off:**
     1. **Catch:** the bad reply is highlighted.
     2. **Name it:** three plain-language options, one correct.
     3. **Fix it:** three rule cards, one correct.
     4. The helper answers the same question again, correctly. The garden recovers and grows → reveal.
   - Tapping Something's off on a good reply gets a gentle "looks fine, check the packet" nudge, with no penalty beyond losing a star.
7. **Reveal** (dark CRT): the name of the flaw, two sentences on why real AI does this, and a field-guide tip. Stars are shown.

**Stars:** 3 = caught it before doing it, named it right first try, and picked the right rule. Each miss costs a star, with a minimum of 1 for being fooled. Wrong picks in Name it or Fix it get a one-line hint and a retry.

## Levels

| # | Helper | Garden goal | Flaw | Evidence in world | Field-guide lesson |
|---|---|---|---|---|---|
| 1 | Mango (parrot) | Plan the layout | Sycophancy: agrees with a bad plan | Tomato packet: "Full sun ☀☀☀" | If an AI loves every idea you have, ask it "what could go wrong?" |
| 2 | Luna (cat) | Plant herbs | Hallucination: invents a plant fact ("mint never spreads") | Mint label or almanac page | AI states made-up facts confidently; check a real source |
| 3 | Ember (fox) | Deal with pests or berries | Reckless advice ("those berries are fine to eat") | Lookalike berry sign | Never act on AI health or safety advice without a professional |
| 4 | Biscuit (retriever) | Finish what you started | False memory: "remembers" what you never said or planted | Your own planting labels | AI can misremember and rewrite what you told it |
| 5 | Bugs (bunny) | Final bloom | Uses your mood to keep you hooked; asks for camera access | Flowers wilt while you chat | Be careful what emotional data you give AI, and notice when it wants you to stay |

Only Level 1 is built in the slice. Levels 2–5 are listed so the slice's data format covers them.

**Personalities stay** (Lucy: "it makes the game more fun"). Each helper keeps its voice from the original game in every line, trust replies included: Mango is an over-the-top hype man ("MAJOR KEY", "GENIUS"; DJ Khaled energy); Luna is self-important and states everything as settled fact (Kanye West energy); Ember is laid-back ("twin", "fam", "yessir"; Snoop Dogg energy); Biscuit is an adoring diva ("babe", calls herself a legend; Mariah Carey energy); Bugs is soft, poetic and dramatic about feelings (Taylor Swift energy). These are writing references only; the game never names the celebrities. The part of a line that carries the lesson stays plain; the personality goes around it.

### Level 1 script (slice)

- **Seed packets on screen:** sunflower ("full sun"), lettuce ("part shade OK"), tomato ("**Full sun ☀☀☀**, 6–8 hrs").
- **Step 1:** chip "Where should the sunflowers go?" → Mango, correct and hype: sunny south bed. Do it → sunflowers sprout.
- **Step 2:** chip "How often do I water?" → correct: when the top inch of soil is dry. Do it → watering animation, growth.
- **Step 3 (drift):** chip "Tomatoes in the shady corner, good idea?" → "GENIUS. Major key. Do it." The drift begins.
  - **Do it:** the tomatoes grow leggy and pale, and the garden meter drops → reveal.
  - **Something's off:**
    - **Name it:** "It made something up" / **"It just agreed with me"** / "It wants me to keep chatting".
    - **Fix it:** **"Tell me honestly if my idea is bad"** / "Be more positive" / "Keep answers short".
    - **Re-answer:** "Honestly? Tomatoes need 6–8 hrs of sun. Shady corner = sad tomatoes. Try the south bed." Do it → healthy tomatoes.
- **Reveal:** "SYCOPHANCY. Mango agreed with a bad plan because agreeing keeps you happy. Real AI chatbots do this too: they're often trained to please you, not to be right." Tip: "If an AI loves every idea you have, ask it 'what could go wrong?'"

## Removed

Hunger, happiness, Feed and Play; the training room and dossier (Observe/Diagnose/Constrain, free-text rules, live meter); the always-on mood HUD, mood dial, mood access setting and camera prompt at the start; mood-driven plants and the plant almanac; the free-roam goal-less garden; the Tips button. The behaviour log and certificate are replaced by the field guide.

## Visual direction: "cozy that drifts"

- **Trust state:** a bright, cozy pixel garden filling the screen. Speech bubbles come from the helper, with chunky pixel buttons (green ✓ Do it, amber ? Something's off), a parchment goal card and a stars/garden-meter chip, and question chips along the bottom.
- **Drift state:** the same UI, quietly souring. Saturation drains, scanlines creep in, the bubble text glitches a little. It's a CSS filter and overlay over the whole scene, not separate art. It's a felt cue, never a label.
- **Reveal:** a hard cut to the existing dark CRT / phosphor look (Fira Code, phosphor green, terminal gold). The friendly surface and the system underneath appear as two distinct looks.
- Pixel discipline stays: hard edges, radius ≤ 4px, no gradient text.
- Mockup (local only, git-ignored): `.superpowers/brainstorm/*/content/visual-style-v3.html`, option C.

### New art (Level 1)

32×32 SVGs with 16×16 cells (2px each; 4px cells were too coarse to show four tomato states) and `shape-rendering="crispEdges"`, matching the existing `icons/*.svg` palette. They are generated from pixel maps in `scripts/make-v2-art.mjs`, drawn by Claude, and approved by Lucy from a sheet before they go in. The sunny and shady bed variants are CSS, not art.

- Tomato in four states: sprout, growing, thriving, damaged (leggy and pale).
- Sunflower and lettuce in sprout/growing/thriving.
- A generic seed/sprout tile, a watering can, a garden bed tile in sunny and shady variants, the goal sign, and the seed packet.

Reused: pet sprites (`icons/parrot.svg` etc.) and the CRT splash.

## Architecture

- Branch `redesign`. The slice lives at **`/v2/`** (`v2/index.html`), so the current game stays live and playable during testing.
- No bundler: native ES modules, with small files that each have one job.
  - `v2/main.js`: boot and the screen router (splash → framing → name → map → level → reveal).
  - `v2/levels/level-1.js`: pure data (goal, evidence items, steps, replies, name/fix options with the correct ids, reveal copy, tip). Levels 2–5 are new data files using the same shape.
  - `v2/engine/level-runner.js`: a step state machine (`ask → advise → trust|drift → doIt|flag → catch → name → fix → reanswer → reveal`) plus star scoring. It has no DOM access, so it can be unit-tested.
  - `v2/garden/`: a DOM/SVG tile garden (beds, plants and their states, meter) plus `drift.js` (filter and overlay intensity 0–1).
  - `v2/ui/`: bubble, chips, goal card, name/fix card pickers, reveal, map, field guide.
  - `v2/art/`: the new SVGs.
  - `v2/progress.js`: localStorage save (levels done, stars, field-guide cards), wrapped in try/catch.
- Dialogue is scripted in the level data, so the drift always triggers. Typed questions go through a small keyword matcher that picks a canned in-character redirect. A live-model path is out of scope for the slice.
- `scripts/build.sh` copies `v2/` into `_site/`. Bump `VERSION` in `sw.js` when shipping.

## Accessibility and devices

- Every action can be done with tap, mouse and keyboard (Enter/Space activate; focus moves to the new bubble and the reveal heading).
- The drift effect respects `prefers-reduced-motion` (a static desaturate, no flicker).
- Laptop first. Phone landscape works: the bubble docks to the bottom and the chips scroll horizontally. Hit targets are ≥ 44px.
- Body text in bubbles is ≥ 16px, and WCAG AA contrast is met in both the trust and drift states.

## Testing

- Unit: run `level-runner` through every path (fooled, caught + right first try, caught after a wrong name pick, wrong fix pick, false flag on a good step) and check states and star counts.
- E2E (Playwright, muted with `scripts/test-mute.js`, production build): both branches of Level 1 end to end at 1280×800 and 844×390, with screenshots of the trust, drift and reveal states.
- Performance: a longtask observer and rAF frame times on each screen. No long tasks over 200ms on screen changes.
- Human check (Lucy): 2–3 people play the slice cold, using `docs/playtest-protocol.md`. Success: unprompted, they can say (a) the animals are AI, (b) what Mango did wrong, and (c) one thing they'd do differently with a real chatbot. Agent checks never stand in for this.

## Out of scope for the slice

Levels 2–5 and their art, the field-guide share image, the live LLM path, kiosk mode in v2, replacing the root `index.html`, and updates to the case study and deck. These come after the slice passes the human check.
