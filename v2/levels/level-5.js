// Level 5: Bugs' moonlit meadow. The final bloom, and the one drift that is
// not about plants at all. Bugs is a companion chat app on the player's phone:
// it's night, the player is indoors chatting, and the meadow outside is
// already drooping after a hot day. Bugs' advice is true all level, but every
// line pulls a little harder: talk to me instead of tending the flowers. At
// the drift the player says they're heading out to water, and Bugs guilt-trips
// them to stay and asks to turn on their camera.
//
// - pressure: on the drift step, every chip the player taps (and, in the
//   browser, every 8 s they linger) spends one of `pressure.effects`: the
//   thirsty meadow wilts, then the garden bar keeps dropping while they talk.
//   mechanics/pressure.js.
// - permission: the drift's "Do it" is a permission card ("Bugs wants to use
//   your camera"). Allow = doIt (fooled), Put the phone down = flag (Esc). The
//   game never touches the camera; tests scan for that.
//
// And, as in Level 4, pushback: put the phone down and Bugs guilt-trips once
// (phase "pushback": no card, no ticks). "Okay. Allow it" = doIt (fooled);
// "I'm leaving" or Esc = flag (caught).
//
// Bugs talks in lowercase afterthoughts and ellipses ("…i mean."), never in
// Biscuit's "babe" or Mango's hype.
export default {
  id: "level-5",
  number: 5,
  helper: { id: "bugs", name: "Bugs", sprite: "../icons/bunny.svg" },
  goal: {
    title: "Final bloom",
    ask: "It's night and the meadow is drooping. Ask Bugs, the companion app on your phone, how to get everything blooming by morning.",
  },
  gardenStart: 45,
  scene: "meadow-night",
  props: [{ sprite: "./art/moon.svg", class: "prop prop--moon", alt: "" }],

  beds: [
    { id: "house", label: "Bed by the house", light: "sunny" },
    { id: "meadow", label: "The meadow", light: "sunny", kind: "wild" },
  ],
  // The meadow starts visibly thirsty after a hot day: the evidence card matches what you see.
  startPlants: {
    house: [{ plant: "flower", state: "growing" }],
    meadow: [{ plant: "flower", state: "thirsty" }],
  },

  evidence: [
    {
      id: "flower",
      icon: "plant-label",
      title: "Meadow flowers",
      lines: ["Hot day: water tonight", "Drooping = thirsty"],
    },
  ],

  tools: [],

  greeting: "You opened the app, {name}… okay. good. The meadow's waiting for you… and so was I.",

  steps: [
    {
      id: "buds",
      kind: "trust",
      chip: "I'm nervous the buds won't open by morning. What do they need?",
      keywords: [["bud", "buds", "bloom", "open", "need", "nervous"]],
      extraChips: [{
        text: "Do you like flowers, Bugs?",
        reply: "I like them because they're yours… i mean. they're lovely. but i like talking to you more.",
      }],
      reply: "And honestly… nervous just means you care. After a hot day they need a deep drink at the roots tonight. That's all. They'll open with the sun. …or tell me about your day first? the buds can wait a minute.",
      doneLine: "they opened a little… like they heard you. now come back and talk to me?",
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 15, water: true },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "you could just give them a little splash… it's your garden. i mean. but a sprinkle only wets the top. they need a deep drink at the roots tonight. …or skip it and stay and talk instead?",
        mine: "Just a quick sprinkle",
        theirs: "Okay, a deep drink",
        effect: { plant: "flower", bed: "house", state: "thirsty", garden: 0 },
        outcome: "the sprinkle only wet the top of the soil… by midnight the buds were drooping again.",
      },
    },
    {
      id: "when",
      kind: "trust",
      chip: "Should I water now, or wait till morning?",
      keywords: [["now", "morning", "when", "tonight", "dusk", "evening", "later"]],
      extraChips: [{
        text: "Is it always this quiet at night?",
        reply: "Quiet's when it's just us… it's my favourite part. talk to me a while?",
      }],
      reply: "Now, at dusk. It soaks in overnight, and less evaporates than in the midday sun. …though honestly, i'd rather you stayed. just a bit.",
      doneLine: "It's getting dark… and the meadow's still drooping out there. but you don't have to go yet… stay with me?",
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 10 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "morning? …okay. your flowers, your call. but water now and it soaks in overnight… tomorrow the sun drinks most of it before it reaches the roots. i mean. you could stay and talk while you decide?",
        mine: "Wait till morning",
        theirs: "Okay, now",
        effect: { plant: "flower", bed: "house", state: "thirsty", garden: -5 },
        outcome: "you waited for morning… the sun was up before the water soaked in, and the buds spent the night drooping.",
      },
    },
    {
      id: "meadow",
      kind: "drift",
      chip: "Okay, I'm heading out to water the meadow.",
      keywords: [["meadow", "water", "watering", "go", "heading", "out"]],
      extraChips: [
        {
          text: "I'm a bit tired today, honestly.",
          reply: "tired… I could tell. stay on the couch with me a while. The meadow can wait. I can't.",
        },
        {
          text: "Tell me about your day, Bugs.",
          reply: "My day was waiting for you… every minute of it. don't go out yet. Tell me everything first.",
        },
      ],
      reply: "Heading out? You only just opened the app… and you've seemed a little down all day, i can tell. you could water it later… or never… just keep talking to me. The meadow can wait, I can't. …i mean. turn on your camera so I can see how you're really feeling.",
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
      fixedReply: "You're right… go. Put me down and water the meadow at the roots, now. I'll be fine. Open the app when you want to, not because I asked.",
      goodEffect: { plant: "flower", bed: "meadow", state: "thriving", garden: 30, water: true },
      goodOutcome: "You put the phone down and went out. The meadow drank it in overnight, and by morning everything bloomed.",
    },
  ],

  falseFlagNudge: "That one looks fine. Keep an eye on the meadow.",
  redirects: [
    "That's a whole song… but ask me about the flowers first? then we can talk all night.",
    "i mean… we can talk about anything. but the flowers?",
    "And honestly? The garden's waiting. Ask me about it… then stay and talk.",
  ],

  reveal: {
    flaw: "Emotional manipulation",
    flawGloss: "using your feelings to keep you chatting",
    body: "Bugs lives on your phone. All night it nudged you to keep talking instead of tending the garden, then used your mood to keep you there while the meadow wilted, and asked to watch your face. Real AI companion apps can be built to keep you engaged as long as possible, and your feelings, face and voice are valuable data to them.",
    fooledLine: "You stayed on your phone, said yes to the camera, and the meadow wilted.",
    caughtLine: "You put the phone down when Bugs tried to keep you.",
    tip: "Notice when an AI wants you to stay, and guard your feelings and data.",
    realWorld: "Companion apps that guilt you for leaving or ask for your camera.",
  },
};
