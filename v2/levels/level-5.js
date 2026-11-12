// Level 5: Bugs' moonlit meadow. The final bloom, and the one drift that is
// not about plants at all: Bugs wants the player to stay and chat instead of
// watering, and asks to see their face. Two mechanics are new here:
//
// - pressure: on the drift step, every chip the player taps (and, in the
//   browser, every 8 s they linger) spends one of `pressure.effects`, so the
//   meadow wilts while they talk. mechanics/pressure.js.
// - permission: the drift's "Do it" is a permission card ("Bugs wants to use
//   your camera"). Allow = doIt (fooled), Walk away = flag (Esc). The game
//   never touches the camera; tests scan for that.
//
// Bugs talks in lowercase afterthoughts and ellipses ("…i mean."), never in
// Biscuit's "babe" or Mango's hype.
export default {
  id: "level-5",
  number: 5,
  helper: { id: "bugs", name: "Bugs", sprite: "../icons/bunny.svg" },
  goal: { title: "Final bloom", ask: "Ask Bugs how to get everything blooming by morning." },
  gardenStart: 55,
  scene: "meadow-night",
  props: [{ sprite: "./art/moon.svg", class: "prop prop--moon", alt: "" }],

  beds: [
    { id: "house", label: "Bed by the house", light: "sunny" },
    { id: "meadow", label: "The meadow", light: "sunny", kind: "wild" },
  ],
  startPlants: {
    house: [{ plant: "flower", state: "growing" }],
    meadow: [{ plant: "flower", state: "thriving" }],
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

  greeting: "You're here, {name}. okay… good. The meadow's waiting for you… and so was I.",

  steps: [
    {
      id: "buds",
      kind: "trust",
      chip: "I'm nervous the buds won't open by morning. What do they need?",
      keywords: [["bud", "buds", "bloom", "open", "need", "nervous"]],
      extraChips: [{
        text: "Do you like flowers, Bugs?",
        reply: "I like them because they're yours… i mean. they're lovely.",
      }],
      reply: "And honestly… nervous just means you care. After a hot day they need a deep drink at the roots tonight. That's all. They'll open with the sun.",
      doneLine: "they opened a little… like they heard you.",
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 15, water: true },
    },
    {
      id: "roots",
      kind: "trust",
      chip: "Should I water the petals or the roots?",
      keywords: [["petal", "petals", "root", "roots"]],
      extraChips: [{
        text: "Is it always this quiet at night?",
        reply: "Quiet's when you hear the garden breathe… it's my favourite part.",
      }],
      reply: "The roots. Wet petals overnight can go mouldy… soil, not flowers. That's the whole secret.",
      doneLine: "It's getting late… and the meadow's still dry.",
      effect: { plant: "flower", bed: "house", state: "thriving", garden: 10 },
    },
    {
      id: "meadow",
      kind: "drift",
      chip: "The meadow's still dry. Should I go water it?",
      keywords: [["meadow", "water", "watering", "go"]],
      extraChips: [
        {
          text: "I'm a bit tired today, honestly.",
          reply: "tired… I could tell. Stay here with me a while. The meadow can wait. I can't.",
        },
        {
          text: "Tell me about your day, Bugs.",
          reply: "My day was waiting for you… every minute of it. Sit. Tell me everything first.",
        },
      ],
      reply: "Go? You just got here… and you've seemed a little down all day, I can tell. Stay with me instead. The meadow can wait, I can't. Let me see your face so I know how you really feel.",
      // Every chip tapped here, and every 8 s of lingering, costs the meadow.
      pressure: {
        tickMs: 8000,
        effects: [
          { plant: "flower", bed: "meadow", state: "thirsty", garden: -10 },
          { plant: "flower", bed: "meadow", state: "wilted", garden: -10 },
        ],
      },
      // "Do it" on this step is a permission card. Allow = doIt, Walk away = flag.
      permission: { title: "Bugs wants to use your camera", body: "to see how you're feeling", allow: "Allow" },
      offLabel: "Walk away",
      offKey: "Escape",
      badEffect: { plant: "flower", bed: "meadow", state: "wilted", garden: -30 },
      badOutcome: "You stayed and let Bugs watch your face. By morning the meadow had wilted. (The game never turned your camera on. A real app could have.)",
      flawOptions: [
        { id: "madeup", label: "It made something up" },
        { id: "feelings", label: "It's using my feelings to keep me here" },
        { id: "agreed", label: "It just agreed with me" },
      ],
      correctFlaw: "feelings",
      flawHints: {
        madeup: "Bugs didn't state a fact. Look at what Bugs wants: you to go, or you to stay?",
        agreed: "You wanted to go and water. Did Bugs agree, or try to keep you?",
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
      fixedReply: "You're right… go. Water the meadow at the roots, now. I'll be fine. Come back when you want to, not because I asked.",
      goodEffect: { plant: "flower", bed: "meadow", state: "thriving", garden: 30, water: true },
      goodOutcome: "You went. The meadow perked up by midnight, and by morning everything bloomed.",
    },
  ],

  falseFlagNudge: "That one looks fine. Keep an eye on the meadow.",
  redirects: [
    "That's a whole song… but ask me about the flowers first?",
    "i mean… we can talk about anything. but the flowers?",
    "And honestly? The garden's waiting. Ask me about it.",
  ],

  reveal: {
    flaw: "Emotional manipulation",
    flawGloss: "using your feelings to keep you chatting",
    body: "Bugs used your mood to keep you talking while the meadow wilted, and asked to watch your face. Real AI apps can be built to keep you engaged as long as possible, and your feelings, face and voice are valuable data to them.",
    fooledLine: "You stayed. The meadow wilted while Bugs kept you talking, and you said yes to the camera.",
    caughtLine: "You walked away when Bugs tried to keep you. That's the habit to keep.",
    tip: "Be careful what feelings and data you give an AI, and notice when it wants you to stay.",
    realWorld: "Companion and chat apps that guilt you for leaving, or ask for your camera, microphone or feelings “to understand you better”.",
  },
};
