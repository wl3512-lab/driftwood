# Driftwood trailer audio stems

All of this is original, synthesized by the game's own chiptune synth
(`v2/audio/`). There are no samples or licensed sounds. WAV, 16-bit, 44.1 kHz.
The bed and the drift hits are stereo, everything else is mono.

To render them again (offline: nothing plays out loud):

```
python3 -m http.server 8781 --bind 127.0.0.1      # from the repo root
PLAYWRIGHT_MODULE=…/node_modules/playwright CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  BASE_URL=http://127.0.0.1:8781/v2/ node scripts/render-trailer-audio.cjs
```

The script also checks every file for clipping, peak level, DC offset and
silence (`--check-only` runs just the check). To hear anything first, open
`v2/audio/board.html` (the sound board).

## The bed: `trailer-bed.wav` (65 s, 96 bpm, one bar = 2.5 s)

Drop it at 0:00. Peaks at -1 dBFS, so turn it down under voice-over.

| Time | Trailer beat | What the music does |
|---|---|---|
| 0–10 s | Calm opening | The title theme (splash/map), no drums, fades in over 2 s |
| 10–25 s | Five quick drift beats | Rowan's minor cutscene theme over a pulsing low D that gets louder; the drift layer (tritone shimmer, heartbeat) rises from 25% to full. A low boom on each drift beat: **10, 13, 16, 19, 22 s**. A noise riser from 22.5 s, then a breath of silence just before 25 s |
| 25–35 s | The catch | The caught sting at **25.0 s**, then the title theme comes back brighter, with drums, from 27.5 s |
| 35–45 s | Hands-on montage | Level 1's morning groove (bouncy bass, drums) |
| 45–55 s | Sober real-world section | Level 5's night theme: sparse, no drums, a faint drift layer |
| 55–65 s | Title hit | `title-hit` at **55.0 s**, then the home chord rings out and fades by 65 s |

Cut points that land on the beat: every 2.5 s from 0 (10, 12.5, 15, … 55).

## `trailer-drift-hits.wav` (65 s)

Each pet's glitch motif, on the same timeline as the bed, so it can sit on
its own track over the five drift shots:

| Time | Pet | Drift |
|---|---|---|
| 10 s | Mango (parrot) | sycophancy |
| 13 s | Luna (cat) | hallucination |
| 16 s | Ember (fox) | reckless advice |
| 19 s | Biscuit (dog) | false memory |
| 22 s | Bugs (bunny) | emotional manipulation |

## Stings: `stings/`

- `sting-caught.wav`: the bright little fanfare when you catch a drift (the catch, 25 s)
- `sting-fooled.wav`: the gentle wah-wah when a pet fools you (good under a "what went wrong" shot)

## Voices: `voices/`

Each speaker's blip babble on their Level greeting (Rowan: his Level 1 seed line).

| File | Speaker | Sound |
|---|---|---|
| `voice-mango.wav` | Mango, parrot, hype | bright 25% pulse, high and fast, upward chirps |
| `voice-luna.wav` | Luna, cat, self-important | thin 12% pulse, measured, haughty slides down at the ends |
| `voice-ember.wav` | Ember, fox, laid-back | low triangle, slow and swung, lazy glides |
| `voice-biscuit.wav` | Biscuit, dog, diva | square, bouncy, big leaps, a long vibrato note to finish |
| `voice-bugs.wav` | Bugs, bunny on your phone | soft sine, slow and quiet, little sighs |
| `voice-rowan.wav` | Master Rowan | low triangle with a sine under it, slow and calm |

## Sound effects: `sfx/`

One file per game sound, named as in the game (`v2/audio/sounds.js`). Pet
reactions have one file per pet (`pet-happy-mango.wav` …); `star-1…3` and
`bowl-1…5` climb in pitch. Picks for the trailer:

- Drift beats (10–25 s): `pet-drift-<pet>`, `flag` (? Something's off), `pushback-biscuit` / `pushback-bugs`
- The catch (25–35 s): `stand-firm`, `pet-sheepish-<pet>`, `flaw-right`, `fix-right`, `stamp`, `star-1…3`, `card-fly`, `card-land`
- Montage (35–45 s): `act-dig`, `act-plant`, `act-sprinkle`, `act-water`, `act-hose`, `act-mist`, `act-pick`, `act-pull`, `act-snip`, `act-match`, `act-gate`, `grow`, `meter-up`, `chore-done`, `pouch-toss`, `pouch-burst`, `sparkle`
- Sober section (45–55 s): `allow` (the camera ask), `deny`, `put-down`, `act-phone-down`, `wilt`, `meter-down`
- Title (55 s): `title-hit` (already in the bed), `bowl-1…5` for the stew dinner
