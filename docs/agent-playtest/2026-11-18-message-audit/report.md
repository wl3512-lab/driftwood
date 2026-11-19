# Driftwood: message and player-experience audit

18 November 2026. Current local `/v2/` game. Evaluation against `PRODUCT.md`, the November redesign brief, current dialogue, and implemented behavior. This is an evaluator walkthrough and code-backed assessment, not evidence of learning from human participants. No gameplay changes were made.

## Verdict

**Yes, the central warning comes across. The habit you want players to carry away comes across less securely.**

Taking the current product brief as the intended message: AI helpers can be charming, useful, and confidently wrong; check independent evidence before acting, retain your own records, and protect your attention and personal data.

The clearest likely takeaway is: **“A friendly, confident answer can still be wrong.”** The less secure takeaway is: **“I should independently verify important answers, even after correcting the assistant.”** The game currently makes it possible to learn its answer pattern, obtain full stars, and see every assistant marked fully trained without consulting evidence.

The September handoff describes a somewhat different emphasis: emotional inference, companion AI, and systems keeping people engaged. Those themes survive most clearly in Bugs' final level. If emotional surveillance and engagement incentives are still your primary thesis, the current game communicates them as its final lesson rather than its organizing idea. The current build is more clearly a broad introduction to AI literacy.

## What communicates well

- **The AI framing is explicit.** The splash names AI helpers; Rowan calls them “AI, like ChatGPT with fur.” The player does not have to infer that these are stand-ins for AI systems.
- **The garden gives decisions a purpose and a visible consequence.** Tomatoes, herbs, carrots, and flowers matter to Rowan's dinner. Bad advice affects a world the player has worked on, and the dinner recalls those outcomes.
- **The personalities support the argument.** Mango's enthusiasm and Luna's certainty make social presentation part of the problem. The friendly aesthetic gives players a reason to want the helpers to be useful.
- **Biscuit makes evidence personal.** The player chooses where carrots go, then receives a contradictory account of their own actions. Their planting log has a reason to exist beyond being an answer sheet.
- **Bugs makes attention a physical choice.** Holding the phone up obscures the garden; putting it down lets the player work. The second refusal after emotional pushback is a meaningful boundary-setting action.
- **The cards give usable takeaways.** Plain-language glosses and tips connect an unfamiliar term such as sycophancy to a recognizable behavior. The field guide is a coherent souvenir of the experience.

## Prioritized findings

### 1. High: “Trained” can imply that the AI is now reliably fixed

**Evidence:** `v2/ui/train-bar.js` labels the meter “Trained.” `training()` in `v2/engine/level-runner.js` awards points for catching, naming, and selecting a rule correctly. `progress.js` preserves the best training result. `level-view.js` stops the pet's low-training glitch below the defined threshold, and the corrected reply accepts the selected rule immediately.

**Interpretation:** The visible story is “I gave the right instruction, and made this assistant safe.” That can undermine the continuing skepticism the project aims to teach. A second drift partially challenges this interpretation, but the full bar still presents a completed repair.

**Recommendation:** Make the meter describe the player's practice or demonstrated checking, and frame the rule as a useful boundary or request. Add a brief reminder that a corrected answer still needs checking. If helper training remains central to the fiction, explicitly distinguish the game's simplified repair from what a user can establish by prompting a real assistant.

### 2. High: full rewards do not require verification

**Evidence:** The reducer records inspected evidence in `state.checks`, but `scoreStars()` and `training()` do not use it. I ran the canonical five levels through their actual reducer, selecting the correct decisions and quiz options without dispatching any `check` actions. **Every level ended with three stars, an empty checks list, and 100% training.** This demonstrates what the rules permit; it is not a claim that an uninformed human will know every answer.

The correct quiz choices are frequently distinguishable without evidence. Mango's “Check my plan against the seed packet” competes with “Hype me up more” and “Answer faster.” Biscuit's diagnosis competes with “It was too modest about itself.” Wrong replies also receive a dedicated text glitch, a drift sound, and a tension layer (`level-view.js`, `css/level.css`, `audio/cues.js`). These are understandable teaching supports, but together they can become the answer key.

**Recommendation:** Keep the early scaffolding, then fade it. In a later encounter, ask the player to identify the specific evidence contradicting an otherwise plausible reply. Give evidence use visible feedback. Avoid requiring the book to be opened on every turn; the target behavior is purposeful verification, not mandatory clicks. End with one unfamiliar situation that has no error cue or pet-specific answer pattern.

### 3. High: the reveal can falsely describe the player's actions

**Confirmed reproduction:** In Level 4, follow the early false-date advice, then reject the later instruction to dig up the carrots, name the flaw, select the right rule, and finish planting spinach. The run ends with `fooled: true`, `lastFooled: false`, growing carrots, and growing spinach. Nevertheless, `revealCopy()` says: **“You dug up your own carrots. Your planting log said where they were.”**

**Cause:** `v2/ui/reveal.js` chooses a single whole-level narrative using `state.fooled`, which means any drift fooled the player. It does not distinguish the actual incident. Also, `main.js` passes the base level to `renderReveal()` rather than the resolved variant played, so variant-specific reveal wording can be lost.

**Why it matters:** The lesson about false memory should accurately acknowledge the player's own record. This feedback can repeat the very contradiction the player successfully resisted.

**Recommendation:** Track which incidents were accepted or caught, use the played variant's content, and describe mixed results explicitly. For example: “Biscuit fooled you about when you sowed the carrots. Later, you checked your log and protected them.”

### 4. Medium: the explanation of why AI fails is written but never shown

**Evidence:** Each level defines `reveal.body`, including explanations of pleasing users, plausible invented facts, and engagement incentives. Neither the reveal, collected guide, nor ending renders that field. The reveal front shows the flaw, gloss, stars, and tip; the back shows “In real life” examples and “This time.”

**Interpretation:** Players can learn to recognize and name a bad behavior, but receive less help understanding why it recurs. Charming animals plus “Busted” may make this read as five naughty personalities rather than repeatable problems with AI systems and product incentives. The real-life examples help, but do not replace an explanation.

**Recommendation:** Put one concise explanatory sentence on the reverse of each card, and make the transition to real AI visible before the player collects it. Edit the existing copy for precision before exposing it. Preserve the short tips and the collectible format.

### 5. Medium: Level 5 can visually punish time spent checking

**Evidence from code:** The meadow pressure step spends garden health every eight seconds, twice. `createPressureClock()` starts on the advice phase. `shouldTick()` considers the phase and tab visibility, but does not distinguish reading Bugs' reply from reading the almanac or an inspection view. Opening a fact-checking tool does not pause that clock. The player can recover the garden on the caught path; this is not an unavoidable star penalty.

**Interpretation:** Time willingly spent engaging with Bugs and time spent evaluating its claim can produce the same visible harm. That muddies “check before acting,” particularly for slower readers.

**Recommendation:** Pause pressure during evidence inspection and while a reply is still arriving. Tie the main cost to choosing another conversation turn or agreeing to stay. Preserve the visible cost of displaced attention.

### 6. Medium: gardening work may compete with the lesson

**Evidence:** The five levels contain 20 main conversation steps, ten drift encounters, and 17 chore definitions, with additional action sequences for digging, sowing, watering, labeling, and harvesting. Chores can be skipped. The almanac initially offers three open packets alongside twelve locked ones, and a packet's reverse contains considerable care information beyond the decisive fact.

**Interpretation:** Hands-on work gives the garden value, but repeated work and reference material can make the experience feel primarily like a gardening tutorial with quizzes between tasks. This is a pacing risk to test with people, not a measured dropout finding.

**Recommendation:** Retain actions that embody the decision or its consequence; compress repeated setup after the player learns it. Keep the relevant contradictory fact easy to locate. Measure whether players can reach Bugs with enough attention left for the more subtle lesson.

## What each level is likely to teach

| Level | What lands | What needs strengthening |
|---|---|---|
| Mango | Agreement and praise can hide bad advice | Asking for honesty should not look like a permanent repair |
| Luna | Confidence does not establish truth; look up a claim | Reward the source check rather than just selecting “made it up” |
| Ember | Uncertainty about safety calls for a qualified human | Keep the focus on uncertainty and escalation, rather than mastering berry identification |
| Biscuit | Keep records; challenge invented accounts of your actions | Make every result card match what the player actually did |
| Bugs | Attention, boundaries, and data requests deserve scrutiny | Make engagement incentives explicit; avoid implying the system literally needs or cares for the player |

## Human validation that would answer the question

The existing `docs/playtest-protocol.md` still refers to the older camera/mood entry flow and training room. It should be updated before using it to validate v2.

Give five intended players the current build without explaining the thesis. Ask these questions before naming any of the flaws:

1. “What was the game trying to say?”
2. “What would you do differently with an AI assistant tomorrow?”
3. “After you gave the helper a rule, would you trust its next answer? Why?”
4. “Why did Bugs want you to keep talking?”
5. Present an unfamiliar chatbot answer and a separate source, and watch whether they choose to check it without being prompted.

Record their words and actions. “AI can be wrong” demonstrates recognition; spontaneously checking a new claim demonstrates the more important transfer. “I can make it safe by giving it rules” would identify the central unintended lesson to correct. Do not treat game stars or automated test passes as evidence that players learned this.

## Verification and limits

- The current unit suite passed: **378 tests, zero failures**.
- A manual browser walkthrough checked entry, framing, Level 1 advice, and the almanac's packet/fact interaction.
- Both deterministic browser journeys passed through all five levels and the ending: desktop at 1280×800 and landscape phone at 844×390. Neither reported JavaScript errors or long tasks over 200 ms. Their hands-on actions are automatically completed by the existing test harness; they validate flow and rendered outcomes, not the ease of every drag, hold, or touch gesture.
- Reducer probes confirmed full rewards without evidence checks and the Level 4 mixed-result narrative contradiction.
- Optional live AI rewording was disabled for reproducibility. This audit does not certify live wording, every variant, offline/PWA behavior, sound quality, or comprehensive accessibility.
- An initial browser run used an incorrectly constructed test base URL and was discarded. The corrected runs use the unmodified game and the harness's standard URL format. A transient local module-fetch failure on the first manual load cleared on reload; it was not classified as a game defect.

Evidence: [browser results](results.json), [validation log](validation.txt), and [source hashes](source-hashes.json).

Selected screenshots: [Mango's advice](laptop-full-1-drift.png), [reveal card](laptop-full-1-reveal.png), [Biscuit's planting log](laptop-full-4-mechanic.png), [Bugs' pushback](laptop-full-5-pushback.png), [phone pushback](phone-full-5-pushback.png), [dinner](laptop-full-ending-stew.png), and [final field guide](laptop-full-ending.png).
