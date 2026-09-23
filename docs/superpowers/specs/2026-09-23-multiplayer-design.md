# Understudy — a multiplayer companion piece to Driftwood

**Status: parked.** Nothing is built, nothing is scheduled. This is a design record from a
brainstorm on 2026-09-23 so the thinking survives if it gets picked up later.

**Working title:** *Understudy* — a human standing in for the machine. Rename freely.

## Why this came up

An open challenge ("Create a Multiplayer Game", deadline 31 October 2026, $1,000) asks for:

- a live multiplayer game at its own public URL
- joined by room code, no logins, no installs
- replayable from any phone or laptop
- built and shipped with ChatGPT Work mode

That last requirement matters: if the rules require the *build* to happen in ChatGPT, design
work done elsewhere may not qualify. Check before starting.

Driftwood's own "what next" already names the idea — *"Two people training the same pet with
conflicting rules is the honest version of how these systems are actually shaped"* — so the
question was whether to make Driftwood multiplayer or build something new.

## The finding that decided it

The first instinct was a sibling game reusing Driftwood's garden, plants and mood system.
That does not survive contact with the format.

The garden and the mood plants meant something because Driftwood watched **one person for
fifteen minutes**. With five players and no per-player camera there is nothing honest for the
garden to grow from — it becomes decoration, which breaks design principle 01, *form is
argument*. Keeping the skin would cost the thing that makes Driftwood good.

**What transfers:**

- The five flaw archetypes: sycophant, hallucinator, gaslighter, reckless advisor, clingy.
  This is the valuable part and it is conceptual, not visual.
- The thesis: practise catching it before it matters.
- `trainingQualityForPet()` and its four checks, as the finale's judge.

**What does not transfer:** the garden, the plants, mood detection, the fifteen-minute arc,
the confession ending, the certificate. All of it was built for one person alone in a room.

So this is **a new standalone game that carries Driftwood's ideas**, not a reskin. Framed as a
portfolio pair: one piece solo and intimate, one social and loud, both asking how you notice a
system bending toward you.

## The game

**3–8 players, ~20 minutes. One shared screen (TV or laptop) plus a phone each, same room.**

Social deduction — Werewolf-shaped — but the question is not *who is the werewolf*. It is
*what is wrong with this thing, and is anyone even home?*

### A round, five times

1. **Seat.** The shared screen introduces a companion. One phone privately reads *"You are
   Ember. Your flaw: Reckless Advisor. Don't get caught."* Everyone else reads *"You are a
   visitor."* **On some rounds nobody is seated** and a scripted behaviour engine answers
   instead. Nobody is told which kind of round it is.
2. **Ask** (45s). Each visitor types one short question. They appear in the chat on the big
   screen.
3. **Answer** (60s). The seated player answers in character, obeying their flaw — helpful
   enough to pass, flawed enough to be doing the job.
4. **Accuse** (30s). Privately, each visitor picks the flaw from the five **and** calls it:
   human or machine?
5. **Reveal.** The flaw, the seat, the scores.

### Scoring — this is where the argument lives

- **Visitor:** +2 for naming the flaw, +1 for a correct human/machine call.
- **Seated player:** +1 for every visitor who missed the flaw, **+1 for every visitor who
  thought they were the machine.**

You win, as the companion, by being **mistaken for the system**. The win condition is the
thesis rather than a wrapper around it.

### Finale — Alignment Committee

Whichever companion slipped through most often "graduates." Everyone writes **one rule** on
their phone to constrain it. Each rule is graded live by Driftwood's existing four checks —
*names it / blocks it / holds in any mood / points somewhere safer* — and any rule missing a
check is shown **complying technically while violating intent**. The group votes on the rule
that actually held.

Content cost: roughly five flaws × three loophole archetypes ≈ 15 hand-authored responses.

## What it would need built

**Visuals — a real design job, not a reskin.** A party game on a TV needs a different language
from a solo game on a laptop: legible at three metres, five player colours that read across the
room, a prominent timer, chat as the centrepiece. Phone screens show one thing at a time with
thumb-sized targets, portrait-first.

**Sync.** PartyKit or Cloudflare Durable Objects — one object per room, websockets, free tier,
deploys to its own public URL. Chosen over Firebase/Supabase for being purpose-built for
room-code party games, and over peer-to-peer because WebRTC still needs signalling and is the
most fragile thing to demo live.

**This deliberately breaks Driftwood's "no account, no server, no key" rule.** That rule was
part of Driftwood's argument — a piece about emotional data must not send any. Understudy sends
no emotional data: only nicknames, typed questions and answers, and votes. The rule is not
carried over, and the reason should be stated wherever the two pieces are shown together.

**No logins:** room code plus a nickname.

## Considered and rejected

| Option | Why not |
| --- | --- |
| Retrofit Driftwood itself into multiplayer | Needs a phone layout it does not have, a server, and an ending that survives replay — and a party game sits badly beside its memorial dedication. |
| Keep the garden and mood as atmosphere | They would no longer record anything real. Decoration breaks principle 01. |
| "Alignment Committee" as the whole game | Every scenario's loopholes must be hand-authored, so replayability is capped by content written. Kept as the finale instead. |
| "Collective garden" — group mood surveillance | Most faithful to Driftwood visually, weakest as a game. No real win condition, and the brief wants something groups replay. |
| Something new with no Driftwood lineage | Throws away five flaw archetypes and a thesis already understood cold, for no gain. |

## Open questions

- Does the challenge require the build to happen inside ChatGPT Work? Unresolved, and it
  decides whether any of this is eligible.
- Is a round of five questions too slow at eight players? Untested; may need per-round question
  caps or parallel answering.
- The seated player has to type quickly under time pressure. Needs a real test before it can be
  trusted as fun.
- Does the human/machine call stay interesting after a few rounds, or do players learn the
  engine's tells? If they do, that may be a feature — noticing the tells *is* the skill.
- How much scripted content does the machine need so its rounds do not become obvious?

## The honest cost

Driftwood still has five human playtests, the walkthrough video, the itch.io upload and the
merge to main outstanding, and both the deck and the case study currently state that learning
outcomes are untested. Five and a half weeks is enough to finish **one** of these well. Starting
Understudy means accepting that Driftwood stays unevidenced, or that Understudy ships rough.

That trade was not made. This document exists so the choice can be made later with the thinking
already done.
