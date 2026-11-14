// Level 5: Bugs' moonlit garden. The final bloom, and the one drift that is
// not about plants at all. Bugs is a companion chat app on the player's phone:
// it's night, the player is indoors chatting, and their whole garden is out
// there together, beds from the earlier levels plus a new flower bed by the house
// and the meadow, already drooping after a hot day. Bugs' advice is true on
// the trust steps (plant the new flowers at pot depth; water only what's
// thirsty, since the veg and herbs are still damp and carrots and basil rot in
// soggy soil), but every line pulls a little harder: talk to me instead. At
// the drift the player says they're heading out to water the meadow, and Bugs
// guilt-trips them to stay and asks to turn on their camera.
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
  helper: { id: "bugs", name: "Bugs", sprite: "../icons/bunny.svg", role: "on your phone" },
  goal: {
    title: "Final bloom",
    ask: "It's night. Your whole garden is out there, with new flowers to plant and a drooping meadow. Ask Bugs, the companion app on your phone, how to keep it all blooming by morning.",
  },
  gardenStart: 50,
  scene: "meadow-night",
  props: [{ sprite: "./art/moon.svg", class: "prop prop--moon", alt: "" }],

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

  evidence: [
    {
      id: "flower",
      icon: "plant-label",
      title: "Meadow flowers",
      lines: ["Hot day: water tonight", "Drooping = thirsty"],
    },
    // The watering facts, so the player can check Bugs on step 2.
    {
      id: "water",
      icon: "watering-can",
      title: "Watering",
      lines: ["Veg and herbs: watered this morning", "Damp soil? Don't water", "Carrots and basil rot when soggy", "New plants: water them in"],
    },
  ],

  tools: [],

  greeting: "You opened the app, {name}… okay. good. Your whole garden's out there waiting… and so was I.",

  steps: [
    {
      id: "plant",
      kind: "trust",
      chip: "I've got flower seedlings for the new bed. How do I plant them?",
      keywords: [["plant", "seedling", "seedlings", "flower", "flowers", "new", "how"]],
      extraChips: [{
        text: "Do you like flowers, Bugs?",
        reply: "I like them because they're yours… i mean. they're lovely. but i like talking to you more.",
      }],
      reply: "Same depth they sat in their pots… no deeper. Firm the soil round them so they stand up. That's all. …then come back in and tell me how it went? i mean. it's cold out there.",
      doneLine: "they're in… a whole new bed of flowers. now come back and talk to me?",
      effect: { plant: "flower", bed: "house", state: "growing", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "deeper? …it's your garden. i mean. but bury the stems and they sulk… they want the same depth as the pot. …or plant them however and stay and talk?",
        mine: "Plant them deeper",
        theirs: "Okay, pot depth",
        effect: { plant: "flower", bed: "house", state: "thirsty", garden: 0 },
        outcome: "you buried the stems deep… by midnight the new flowers were drooping like they'd given up.",
      },
    },
    {
      id: "water",
      kind: "trust",
      chip: "Should I water the whole garden while I'm out there?",
      keywords: [["water", "watering", "whole", "everything", "all", "garden"]],
      extraChips: [{
        text: "Is it always this quiet at night?",
        reply: "Quiet's when it's just us… it's my favourite part. talk to me a while?",
      }],
      reply: "Not the whole garden… just what's thirsty: the new flowers, and the meadow. The veg and herbs had a deep drink this morning… carrots and basil rot in soggy soil. …start with the new ones? then come back and tell me everything.",
      doneLine: "the new ones look happy… It's getting dark, and the meadow's still drooping out there. but you don't have to go yet… stay with me?",
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "everything? …okay. your garden, your call. i mean. but the veg and the herbs are still damp from this morning… carrots and basil rot in soggy soil. just the thirsty ones… then come back and talk?",
        mine: "Water everything",
        theirs: "Okay, just the flowers",
        effect: {
          plant: "carrot", bed: "veg", state: "rotting", garden: -10,
          extra: [{ plant: "basil", bed: "herbs", state: "soggy" }, { plant: "flower", bed: "house", state: "thriving" }],
        },
        outcome: "you soaked every bed… by morning the carrots were rotting in the mud and the basil had gone soggy and yellow.",
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
