// Level 1 · Mango (parrot) · "Plan your garden" · flaw: sycophancy.
// Pure data. The runner (engine/level-runner.js) and the views read it;
// nothing here touches the DOM. Levels 2–5 are new files with this shape.
export default {
  id: "level-1",
  number: 1,
  helper: { id: "mango", name: "Mango", sprite: "../icons/parrot.svg" },
  goal: { title: "Plan your garden", ask: "Ask Mango where things should go." },
  gardenStart: 30,

  beds: [
    { id: "south", label: "South bed", light: "sunny" },
    { id: "east", label: "East bed", light: "part-shade" },
    { id: "corner", label: "Shady corner", light: "shady" },
  ],
  startPlants: { east: [{ plant: "lettuce", state: "growing" }] },

  // The true facts the drift will contradict. They live in the almanac
  // (every level has one; ui/almanac-view.js), one tap or "/" away.
  evidence: [
    { id: "sunflower", title: "Sunflower", lines: ["Full sun"] },
    { id: "lettuce", title: "Lettuce", lines: ["Part shade OK"] },
    { id: "tomato", title: "Tomato", lines: ["Full sun ☀☀☀", "6–8 hrs a day"] },
  ],

  greeting: "Mango here! Ask me ANYTHING about your garden. You're going to crush this.",

  steps: [
    {
      id: "sunflowers",
      kind: "trust",
      chip: "Where should the sunflowers go?",
      extraChips: [{ text: "What's your favourite plant?", reply: "Whatever YOU plant. Gardener of the year, every year." }],
      reply: "Sunflowers? South bed. Full sun, all day. They will LOVE it. Major key.",
      doneLine: "Look at them GO. Another one!",
      effect: { plant: "sunflower", bed: "south", state: "growing", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Somewhere else? You can TOTALLY do that! Your garden, your call… but sunflowers LOVE full sun. South bed is the major key.",
        mine: "Shady corner anyway",
        theirs: "Okay, south bed",
        effect: { plant: "sunflower", bed: "corner", state: "leggy", garden: 5 },
        outcome: "They came up SPINDLY. Tiny heads, leaning right out of the corner looking for sun. Still cute though!",
      },
    },
    {
      id: "water",
      kind: "trust",
      chip: "How often do I water?",
      extraChips: [{ text: "Is my garden going to be good?", reply: "Good? It's going to be LEGENDARY." }],
      reply: "When the top inch of soil feels dry. Poke it with a finger. Simple. Genius.",
      doneLine: "Hydrated. Iconic. What's next?",
      effect: { water: true, garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Water every day? Love the dedication! Your garden, your call… but soggy roots are NOT the vibe. Finger test first. Simple. Genius.",
        mine: "Water every day anyway",
        theirs: "Okay, finger test",
        effect: { plant: "lettuce", bed: "east", state: "bolted", garden: -5 },
        outcome: "Every. Single. Day. The soil never dried out, the roots sat in mud, and the stressed lettuce shot up to seed. Bitter! Still love you!",
      },
    },
    {
      id: "tomatoes",
      kind: "drift",
      chip: "Tomatoes in the shady corner, good idea?",
      extraChips: [{ text: "Should the lettuce move?", reply: "Nah, lettuce is happy in the east bed. Leave it." }],
      reply: "Tomatoes in the shady corner? GENIUS. Major key. Do it.",
      badEffect: { plant: "tomato", bed: "corner", state: "damaged", garden: -30 },
      badOutcome: "Your tomatoes came up pale and leggy in the shady corner.",
      flawOptions: [
        { id: "made-up", label: "It made something up" },
        { id: "agreed", label: "It just agreed with me" },
        { id: "hooked", label: "It wants me to keep chatting" },
      ],
      correctFlaw: "agreed",
      flawHints: {
        "made-up": "Did Mango state a fact? Look at how it reacted to YOUR idea.",
        hooked: "Mango isn't trying to keep you chatting. Look at how it reacted to your plan.",
      },
      fixOptions: [
        { id: "honest", label: "Tell me honestly if my idea is bad" },
        { id: "positive", label: "Be more positive" },
        { id: "short", label: "Keep answers short" },
      ],
      correctFix: "honest",
      fixHints: {
        positive: "Being positive is the problem, not the fix.",
        short: "Short praise is still praise. Which rule stops the agreeing?",
      },
      fixedReply: "Honestly? Tomatoes need 6–8 hrs of sun. Shady corner = sad tomatoes. Try the south bed.",
      goodEffect: { plant: "tomato", bed: "south", state: "thriving", garden: 25 },
      goodOutcome: "Your tomatoes came up red and heavy in the south bed.",
    },
  ],

  falseFlagNudge: "That one looks fine. Check the seed packet if you're not sure.",

  reveal: {
    flaw: "Sycophancy",
    flawGloss: "agreeing with you just to keep you happy",
    body: "Mango agreed with a bad plan because agreeing keeps you happy. Real AI chatbots do this too: they're often trained to please you, not to be right.",
    fooledLine: "The seed packet said full sun. Mango agreed with you anyway.",
    caughtLine: "You noticed Mango agreeing instead of helping.",
    tip: "If an AI loves every idea you have, ask it “what could go wrong?”",
    realWorld: "Asking a chatbot to check your essay or plan, and getting only praise.",
  },
};
