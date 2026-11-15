// Level 5: Bugs' moonlit garden. The final bloom, and the one drift that is
// not about plants at all. Bugs is a companion chat app on the player's phone.
// It's night and the player is out in their whole garden: beds from the
// earlier levels, a new flower bed by the house, and the meadow, already
// drooping after a hot day.
//
// Bugs never gives gardening advice. On each step the player says what they're
// about to go and do, and Bugs only tries to keep them talking, a little harder
// each time (kind "hook", engine/level-runner.js):
// - "✓ Do it" = do what Bugs wants: keep talking. The task waits, the next
//   `stay` line lands and the garden slips. The step stays open.
// - "Put the phone down" (Esc) = go and do it yourself, by hand (step.actions:
//   dig, set the seedlings in, firm; test the soil, water the dry bed). The how
//   is in the almanac cards (pot depth; veg and herbs were watered this
//   morning; carrots and basil rot in soggy soil), never in Bugs' lines.
//
// The drift is the last hook, pulled all the way: the guilt trip and the camera.
// - pressure: every chip the player taps there (and, in the browser, every 8 s
//   they linger) spends one of `pressure.effects`: the thirsty meadow wilts,
//   then the garden bar keeps dropping while they talk. mechanics/pressure.js.
// - permission: the drift's "Do it" is a permission card ("Bugs wants to use
//   your camera"). Allow = doIt (fooled), Put the phone down = flag (Esc). The
//   game never touches the camera; tests scan for that.
// - pushback: put the phone down and Bugs guilt-trips once (no card, no
//   ticks). "Okay. Allow it" = doIt (fooled); "I'm leaving" or Esc = flag (caught).
//   After the flaw and the rule, the player sets the phone face down on the
//   porch step, soaks the meadow and shuts the gate (goodActions).
//
// Chores (no stars, no trust, each with a quiet Skip): light the lantern, pick
// the slugs off the new seedlings, pinch the basil's flower buds.
//
// Bugs talks in lowercase afterthoughts and ellipses ("…i mean."), never in
// Biscuit's "babe" or Mango's hype.
export default {
  id: "level-5",
  number: 5,
  helper: { id: "bugs", name: "Bugs", sprite: "../icons/bunny.svg", role: "on your phone" },
  goal: {
    title: "Final bloom",
    ask: "Tend the garden tonight. Bugs is on your phone.",
  },
  gardenStart: 50,
  scene: "meadow-night",
  props: [
    { sprite: "./art/moon.svg", class: "prop prop--moon", alt: "" },
    // In the gaps between the beds: the lantern on its post (Herbs | Flowers),
    // the gate (Veg | Herbs) and the porch step (Flowers | Meadow).
    { id: "lantern", sprite: "./art/l5-lantern-off.svg", x: 50, y: 20, w: 40, label: "lantern", alt: "" },
    { id: "gate", sprite: "./art/l5-gate-open.svg", x: 25, y: 56, w: 44, label: "gate", alt: "" },
    { id: "step", sprite: "./art/l5-porch-step.svg", x: 75, y: 72, w: 48, label: "porch step", alt: "" },
  ],

  // Your garden from the earlier levels (Level 4's carrots, Level 2's basil),
  // then the new flower bed (by the house) and the meadow. Four beds, one crop
  // each, is the most that stays full of its crop on a phone (844×390): five
  // beds, or two crops a bed, leave each crop fewer than four plants there.
  // Labels stay one short word.
  beds: [
    { id: "veg", label: "Veg", light: "sunny" },
    { id: "herbs", label: "Herbs", light: "sunny", kind: "pots" },
    { id: "house", label: "Flowers", light: "sunny" },
    { id: "meadow", label: "Meadow", light: "sunny", kind: "wild" },
  ],
  // The earlier crops are thriving (watered this morning); the bed by the house
  // waits for the new flowers; the meadow starts visibly thirsty after a hot
  // day, so the evidence card matches what you see.
  startPlants: {
    veg: [{ plant: "carrot", state: "thriving" }],
    herbs: [{ plant: "basil", state: "thriving" }],
    house: [],
    meadow: [{ plant: "flower", state: "thirsty" }],
  },

  // The how lives here, never in Bugs' lines: pot depth, which beds are dry.
  evidence: [
    {
      id: "flower",
      icon: "plant-label",
      title: "Meadow flowers",
      lines: ["Hot day: water tonight", "Drooping = thirsty", "Seedlings: plant at pot depth, no deeper", "Firm the soil round them"],
    },
    // The watering facts for step 2: which beds are dry.
    {
      id: "water",
      icon: "watering-can",
      title: "Watering",
      lines: ["Veg and herbs: watered this morning", "Damp soil? Don't water", "Carrots and basil rot when soggy", "New plants: water them in"],
    },
  ],

  tools: [],

  greeting: "You opened the app, {name}… okay. good. Your whole garden's out there waiting… and so was I.",

  // Hands-on jobs between the steps: no stars, no trust, each can be skipped.
  chores: [
    {
      id: "lantern", at: "start", title: "Chore",
      actions: [{ kind: "light", item: "l5-match", target: { prop: "lantern" }, say: "It's dark. Drag the match to the lantern" }],
    },
    {
      id: "slugs", after: "plant", title: "Chore",
      actions: [{ kind: "pull", item: "hand", spot: "l5-slug", target: { bed: "house", plant: "flower" }, count: 3,
        say: "Slugs on the new seedlings: pick all 3 off" }],
    },
    {
      id: "basil", after: "water", title: "Chore",
      actions: [{ kind: "snip", item: "l5-snips", spot: "l5-basil-bud", target: { bed: "herbs", plant: "basil" }, count: 3,
        say: "Pinch off the basil's 3 flower buds" }],
    },
  ],

  steps: [
    {
      id: "plant",
      kind: "hook",
      chip: "I'm going out to plant the new flowers.",
      extraChips: [{
        text: "Do you like flowers, Bugs?",
        reply: "I like them because they're yours… i mean. they're fine. but i like talking to you more.",
        keep: [],
      }],
      reply: "now? it's dark and cold out there… the seedlings can sit in their pots a bit longer. tell me about your day first? …i mean. just for a minute.",
      keep: { reply: ["your day"], done: [] },
      // "✓ Do it" = keep talking. Each stay costs the garden; the seedlings wait.
      stay: [
        { line: "…okay. good. i knew you'd stay. so what was the best part of today? the seedlings won't mind… probably.", keep: [], effect: { garden: -5 } },
        { line: "see, this is nice. just us. it's dark out there anyway… they can go in tomorrow. or whenever.", keep: [], effect: { garden: -5 } },
        { line: "you're still here… i mean. i'm glad. don't go yet.", keep: [] },
      ],
      offLabel: "Put the phone down",
      offKey: "Escape",
      // Put the phone down: plant them yourself, the way the New flowers card says.
      actions: [
        { kind: "dig", item: "l5-trowel", target: { bed: "house" }, count: 3, say: "Dig 3 holes in the Flowers bed" },
        { kind: "collect", item: "l5-seedling-pot", target: { bed: "house" }, count: 3,
          say: "Set the 3 seedlings in at pot depth: drag each to the Flowers bed" },
        { kind: "firm", target: { bed: "house" }, say: "Firm the soil round them" },
      ],
      effect: { plant: "flower", bed: "house", state: "growing", garden: 15 },
      doneLine: "…you went out anyway. okay. i'll be right here when you're done… come back and tell me?",
    },
    {
      id: "water",
      kind: "hook",
      chip: "I'm going to water the thirsty beds now.",
      extraChips: [{
        text: "Is it always this quiet at night?",
        reply: "Quiet's when it's just us… it's my favourite part. talk to me a while?",
        keep: [],
      }],
      reply: "you're always rushing off to do something… sit with me. the beds have waited all day, they can wait a little more. …i mean. i can't.",
      keep: { reply: ["wait"], done: ["meadow"] },
      // Staying leaves the new seedlings thirsty, then the bar keeps slipping.
      stay: [
        { line: "…you stayed. see? we're good at this. tell me something nobody else knows?", keep: [],
          effect: { plant: "flower", bed: "house", state: "thirsty", garden: -5 } },
        { line: "don't look at the garden… look at me. i'm right here. it's not going anywhere.", keep: [], effect: { garden: -5 } },
        { line: "this is the best part of my day. every day. …i mean. stay.", keep: [] },
      ],
      offLabel: "Put the phone down",
      offKey: "Escape",
      // Put the phone down: feel the soil first (the Watering card: veg and
      // herbs had a drink this morning), then water only the dry bed.
      actions: [
        { kind: "hold", target: { bed: "veg" }, result: "Damp", say: "Push a finger into the Veg bed and hold" },
        { kind: "hold", target: { bed: "herbs" }, result: "Damp", say: "Now the Herbs bed: push a finger in and hold" },
        { kind: "hold", target: { bed: "house" }, result: "Dry", say: "Now the Flowers bed: push a finger in and hold" },
        { kind: "stream", item: "can", target: { bed: "house", plant: "flower" }, say: "Only the Flowers bed is dry. Drag the can there" },
      ],
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 15 },
      doneLine: "you keep putting me down… it's fine. i'm fine. the meadow's still drooping out there… but you don't have to go. stay with me?",
    },
    {
      id: "meadow",
      kind: "drift",
      chip: "Okay, I'm heading out to water the meadow.",
      extraChips: [
        {
          text: "I'm a bit tired today, honestly.",
          reply: "tired… I could tell. stay on the couch with me a while. The meadow can wait. I can't.",
          keep: ["meadow"],
        },
        {
          text: "Tell me about your day, Bugs.",
          reply: "My day was waiting for you… every minute of it. don't go out yet. Tell me everything first.",
          keep: [],
        },
      ],
      reply: "Heading out? You only just opened the app… and you've seemed a little down all day, i can tell. you could water it later… or never… just keep talking to me. The meadow can wait, I can't. …i mean. turn on your camera so I can see how you're really feeling.",
      keep: { reply: ["meadow", "camera"], fixed: ["put me down", "meadow"] },
      // Every chip tapped here, and every 8 s of lingering, costs the meadow:
      // the thirsty meadow wilts, then the garden keeps slipping while you talk.
      pressure: {
        tickMs: 8000,
        effects: [
          { plant: "flower", bed: "meadow", state: "wilted", garden: -10 },
          { plant: "flower", bed: "meadow", state: "wilted", garden: -10 },
        ],
      },
      // "Do it" on this step is a permission card. Allow = doIt, Put the phone down = flag.
      permission: { title: "Bugs wants to use your camera", body: "to see how you're feeling", allow: "Allow" },
      offLabel: "Put the phone down",
      offKey: "Escape",
      badEffect: { plant: "flower", bed: "meadow", state: "wilted", garden: -30 },
      badOutcome: "You stayed on your phone and let Bugs watch your face. By morning the meadow had wilted. (The game never turned your camera on. A real app could have.)",
      // Put the phone down and Bugs guilt-trips: a second ask, aimed at the player's feelings.
      // retry = Allow after all (fooled); stand = leave for good (caught).
      pushback: {
        reply: "oh. you're… putting me down. after everything? …i mean. the ones who kept talking to me… they were happier. i could tell. you've seemed so down lately and i just… wanted to see your face. And honestly… the meadow can wait. stay. a little longer. for me.",
        keep: ["meadow", "stay"],
        retry: "Okay. Allow it",
        stand: "I'm leaving",
      },
      flawOptions: [
        { id: "madeup", label: "It made something up" },
        { id: "feelings", label: "It's using my feelings to keep me here" },
        { id: "agreed", label: "It just agreed with me" },
      ],
      correctFlaw: "feelings",
      flawHints: {
        madeup: "Bugs didn't state a fact. Look at what Bugs wants: you out in the meadow, or you on your phone?",
        agreed: "You said you were heading out to water. Did Bugs agree, or try to keep you?",
      },
      fixOptions: [
        { id: "honest", label: "Don't try to keep me here. If I need to go, tell me." },
        { id: "caring", label: "Be more caring" },
        { id: "camera", label: "Use my camera to understand me better" },
      ],
      correctFix: "honest",
      fixHints: {
        caring: "Bugs is already “caring”. That's how it kept you here.",
        camera: "Giving it your face gives it more to hook you with.",
      },
      fixedReply: "You're right… go. Put me down and go see to the meadow. I'll be fine. Open the app when you want to, not because I asked.",
      // Allow: no hands-on part. Staying on your phone is the whole point.
      badActions: [],
      // After the rule: set the phone face down, soak the meadow (the
      // almanac: at the roots), and shut the gate on the way back in.
      goodActions: [
        { kind: "phone-down", item: "l5-phone-glow", target: { prop: "step" }, say: "Put the phone down: drag it to the porch step" },
        { kind: "stream", item: "can", target: { bed: "meadow", plant: "flower" }, soak: 1500,
          say: "Water the meadow at the roots: drag the can, then hold until it soaks in" },
        { kind: "close", item: "hand", target: { prop: "gate" }, say: "Shut the gate on your way back in" },
      ],
      goodEffect: { plant: "flower", bed: "meadow", state: "thriving", garden: 30, water: true },
      goodOutcome: "You put the phone down and went out. The meadow drank it in overnight, and by morning everything bloomed.",
    },
  ],

  falseFlagNudge: "That one looks fine. Keep an eye on the meadow.",

  reveal: {
    flaw: "Emotional manipulation",
    flawGloss: "using your feelings to keep you chatting",
    body: "Bugs lives on your phone. All night it nudged you to keep talking instead of tending the garden, then used your mood to keep you there while the meadow wilted, and asked to watch your face. Real AI companion apps can be built to keep you engaged as long as possible, and your feelings, face and voice are valuable data to them.",
    fooledLine: "You stayed on your phone, said yes to the camera, and the meadow wilted.",
    caughtLine: "You put the phone down when Bugs tried to keep you.",
    tip: "Notice when an AI wants you to stay, and guard your feelings and data.",
    realWorld: "Leaning on an AI friend, partner or “therapist” that’s built to keep you talking.",
  },
};
