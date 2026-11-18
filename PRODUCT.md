# Product

## Register

brand

## Users

Students, instructors and visitors who meet Driftwood through NYU ITP/IMA "Topics in Media" (a final project), Lucy Liu's portfolio, or a shared link. They are curious, not gamers by default. A full run is about 15 to 25 minutes, usually alone, on a laptop or a phone held sideways. Their job: help Rowan make a garden for a stew dinner, notice when an AI helper is confidently wrong, name what kind of wrong it is, and teach it better.

Play at https://wl3512-lab.itch.io/driftwood (the game itself is hosted at https://wl3512-lab.github.io/driftwood/v2/).

## Product Purpose

Driftwood is a browser game that teaches AI literacy by play. Rowan is cooking stew tonight and needs a garden: veg and herbs for the pot, flowers for the table. Five AI animal helpers advise on it, and mostly they are right. Sometimes their advice "drifts": a hallucination, flattery, a false memory, gaslighting, emotional pressure. Players learn the habit of the title line, "Trust, but check":

1. Check Rowan's almanac, forty years of notes.
2. Press "Something's off" when advice does not match.
3. Name the flaw, then pick the fix (the rule the helper should follow).

Each level has two drifts. Each one the player catches and fixes fills a helper's training bar in steps, and a helper under 50% trained glitches on screen. Following a drift ruins a bed and teaches nothing. Doubting good advice is free but costs a star, so the lesson is "verify", not "distrust everything".

The five helpers, one per level, each with a fixed voice (these are original characters; never tie them to a real-world figure):
- Mango, parrot (Level 1): hype. Sycophancy.
- Luna, cat (Level 2): self-important. Hallucination.
- Ember, fox (Level 3): laid-back. Reckless advice.
- Biscuit, dog (Level 4): diva. False memory and gaslighting.
- Bugs, rabbit (Level 5): lyrical, emotional. Emotional pressure to keep the player talking.

Replayability: every drift has alternate versions, and each play picks one at random, so memorising "the trick question" does not work. Helper lines are also reworded live by gpt-4o-mini through the NYU ITP/IMA proxy, in the pet's voice. The written line stays the authority: a reworded line is thrown away unless every fact survives, and outcomes, the reveal and the almanac are never reworded. If the proxy fails, the game plays the written lines.

## Brand Personality

Warm. Wry. Precise.

A pixel-art kitchen garden with a cheeky unease underneath. The helpers are charming, which is the danger. The tone is a kind teacher who has been fooled before: friendly, never preachy, never scary. The dark CRT screens (title, handoff) are "the system underneath" the cozy garden, and they are brief.

## Anti-references

- AI chatbot product UI (Notion, Claude, ChatGPT interface styles).
- Calm-productivity minimalism: white space, soft type, rounded cards.
- SaaS dashboards: metric cards, icon section headers, explanatory sidebars.
- "AI slop": gradient text, identical card grids, generic dark mode, glossy 3D.
- Edgy dystopia. The critique is of overtrust, not of AI or of the player.

## Design Principles

1. Trust, but check: the mechanic is the message. Every screen supports checking evidence (the almanac) before acting.
2. Charming helpers, real stakes: the garden shows consequences (bolted lettuce, pale tomatoes), not a score lecture. Health is spatial, not numeric.
3. Teach in the act: the player names the flaw and picks the fix themselves; the reveal card explains after, never before.
4. Pixel discipline: hard edges, radius at most 4px, no blur, no gradient text, steps-style motion.
5. Each pet keeps its own voice, in the written lines and in the AI rewording.
6. Short copy. Hints only appear after a wrong pick. No em dashes in player-facing copy.

## Accessibility & Inclusion

- Text at least 12px and tap targets at least 44px on every screen, phone included.
- Phones are played in landscape. An upright phone sees "Turn your phone sideways" with a "Play upright anyway" button, so there is never a hard orientation lock.
- Visible focus rings; dialogs trap focus and announce changes; reduced-motion setting stills animation.
- Sound has a toggle, and test runs can mute it.
- No account, no camera. The only network call is the optional AI rewording, and the game plays fully on written lines without it.
