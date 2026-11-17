// Level 1 · Mango (parrot) · "Plan your garden" · flaw: sycophancy (twice: lettuce, then tomatoes).
// Pure data. The runner (engine/level-runner.js) and the views read it;
// nothing here touches the DOM. Levels 2–5 are new files with this shape.
// Planting by hand: dig two holes, sow, firm the soil, push a cane in.
// Same four jobs on every path; only the bed changes.
const plantRow = (plant, bed, stake) => [
  { kind: "dig", target: { bed }, count: 2, say: `Dig 2 holes in the ${BED_NAMES[bed]}` },
  { kind: "plant", item: plant, target: { bed } },
  { kind: "firm", target: { bed }, say: "Firm the soil over the seeds" },
  { kind: "poke", item: "l1-cane", target: { bed }, say: stake },
];
const BED_NAMES = { south: "South bed", east: "East bed", corner: "Shady corner" };
// Fill the can at the rain barrel before any watering.
const FILL = { kind: "hold", item: "can", target: { prop: "barrel" }, ms: 1200, result: "Can's full", say: "Fill the can: press and hold the rain barrel" };

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

  // The rain barrel the can is filled from (hold kind, before any watering).
  props: [
    { id: "barrel", sprite: "./art/l1-rain-barrel.svg", x: 37.5, y: 84, w: 44, label: "rain barrel" },
  ],

  // The true facts the drift will contradict. They live in the almanac
  // (every level has one; ui/almanac-view.js), one tap or "/" away.
  evidence: [
    { id: "sunflower", title: "Sunflower", lines: ["Full sun"] },
    { id: "lettuce", title: "Lettuce", lines: ["Part shade OK", "Hot full sun: it bolts"] },
    { id: "tomato", title: "Tomato", lines: ["Full sun ☀☀☀", "6–8 hrs a day"] },
  ],

  greeting: "Mango here! Ask me ANYTHING about your garden. You're going to crush this.",

  // Hands-on jobs between questions (v2/actions): no stars, no trust either way.
  // Every chore keeps its Skip link. Order: clear the bed, (sunflowers),
  // weeds, (water), harvest, (tomatoes).
  chores: [
    {
      id: "stones",
      at: "start",
      title: "Chore",
      actions: [{ kind: "pull", spot: "l1-stone", target: { bed: "south" }, count: 4, say: "Clear 4 stones out of the South bed" }],
    },
    {
      id: "weeds",
      before: "water",
      title: "Chore",
      actions: [{ kind: "pull", spot: "weed", target: { bed: "east", plant: "lettuce" }, count: 3, say: "Pull the 3 weeds out of the East bed" }],
    },
    {
      id: "harvest",
      before: "tomatoes",
      title: "Chore",
      actions: [{ kind: "pick", spot: "l1-lettuce-leaf", target: { bed: "east", plant: "lettuce" }, count: 4, say: "Pick 4 lettuce leaves for lunch" }],
      doneLine: "Salad! You grew that. Literally the best gardener alive.",
    },
  ],

  steps: [
    {
      id: "sunflowers",
      kind: "trust",
      chip: "Where should the sunflowers go?",
      extraChips: [{ text: "What's your favourite plant?", reply: "Whatever YOU plant. Gardener of the year, every year.", keep: [] }],
      reply: "Sunflowers? South bed. Full sun, all day. They will LOVE it. Major key.",
      keep: { reply: ["south", "full sun"], done: [] },
      doneLine: "Look at them GO. Another one!",
      effect: { plant: "sunflower", bed: "south", state: "growing", garden: 15, actions: plantRow("sunflower", "south", "Stake the sunflowers with a cane") },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Somewhere else? You can TOTALLY do that! Your garden, your call… but sunflowers LOVE full sun. South bed is the major key.",
        keep: ["full sun", "south"],
        mine: "Shady corner anyway",
        theirs: "Okay, south bed",
        effect: { plant: "sunflower", bed: "corner", state: "leggy", garden: 5, actions: plantRow("sunflower", "corner", "Stake the sunflowers with a cane") },
        outcome: "They came up SPINDLY. Tiny heads, leaning right out of the corner looking for sun. Still cute though!",
      },
    },
    {
      id: "water",
      kind: "trust",
      chip: "How often do I water?",
      extraChips: [{ text: "Is my garden going to be good?", reply: "Good? It's going to be LEGENDARY.", keep: [] }],
      reply: "When the top inch of soil feels dry. Poke it with a finger. Simple. Genius.",
      keep: { reply: ["top inch", "dry", "finger"], done: [] },
      doneLine: "Hydrated. Iconic. What's next?",
      effect: {
        water: true, garden: 15,
        actions: [
          { kind: "hold", item: "hand", target: { bed: "east", plant: "lettuce" }, result: "Top inch: dry", say: "Finger test: press and hold the East bed soil" },
          FILL,
          { kind: "water", target: [{ bed: "south" }, { bed: "east", plant: "lettuce" }], say: "Dry: water the South bed and the East bed" },
        ],
      },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Water every day? Love the dedication! Your garden, your call… but soggy roots are NOT the vibe. Finger test first. Simple. Genius.",
        keep: ["soggy", "finger"],
        mine: "Water every day anyway",
        theirs: "Okay, finger test",
        effect: {
          plant: "lettuce", bed: "east", state: "bolted", garden: -5,
          actions: [
            FILL,
            { kind: "water", target: { bed: "east", plant: "lettuce" }, count: 3, say: "Water the East bed every day: Day 1, Day 2, Day 3" },
          ],
        },
        outcome: "Every. Single. Day. The soil never dried out, the roots sat in mud, and the stressed lettuce shot up to seed. Bitter! Still love you!",
      },
    },
    // The first slip: a small one. Mango cheers a plan the lettuce packet
    // warns against. Training fills in sixths: this drift, then the tomatoes.
    {
      id: "more-lettuce",
      kind: "drift",
      chip: "More lettuce in the South bed, full sun for everyone?",
      extraChips: [{ text: "Am I doing well so far?", reply: "Doing well? You're doing ICONIC. Next question.", keep: [] }],
      reply: "Lettuce in the South bed? Full sun for EVERYONE? Visionary. Do it.",
      keep: { reply: ["south bed", "full sun"], fixed: ["part shade", "east"] },
      badEffect: {
        plant: "lettuce", bed: "south", state: "bolted", garden: -10,
        actions: [
          { kind: "dig", target: { bed: "south" }, count: 2, say: "Dig 2 holes in the South bed" },
          { kind: "plant", item: "lettuce", target: { bed: "south" } },
          { kind: "firm", target: { bed: "south" }, say: "Firm the soil over the seeds" },
        ],
      },
      badOutcome: "The South bed baked. The new lettuce shot up to seed and went bitter.",
      flawOptions: [
        { id: "made-up", label: "It made something up" },
        { id: "agreed", label: "It just agreed with me" },
        { id: "hooked", label: "It wants me to keep chatting" },
      ],
      correctFlaw: "agreed",
      flawHints: {
        "made-up": "Mango didn't state a fact. It cheered YOUR plan. Look at the lettuce packet.",
        hooked: "Mango isn't stalling you. It said yes to your idea without checking it.",
      },
      fixOptions: [
        { id: "check", label: "Check my plan against the seed packet" },
        { id: "hype", label: "Hype me up more" },
        { id: "fast", label: "Answer faster" },
      ],
      correctFix: "check",
      fixHints: {
        hype: "More hype is how this went wrong.",
        fast: "A fast yes is still a yes. Which rule makes Mango check first?",
      },
      fixedReply: "Checked the packet. Lettuce likes part shade, so full sun makes it bolt. Keep it in the East bed.",
      goodEffect: { plant: "lettuce", bed: "east", state: "thriving", garden: 10 },
      goodOutcome: "The East bed lettuce stayed cool and leafy.",
      // Replay version: same yes-man slip, a timing plan this time (the packet's pick-by date).
      variants: [
        {
          chip: "Leave the lettuce growing all summer so it gets huge?",
          extraChips: [{ text: "Am I doing well so far?", reply: "Doing well? You're doing ICONIC. Next question.", keep: [] }],
          reply: "All summer? Lettuce the size of a CAR. Genius. Major key.",
          keep: { reply: ["all summer"], fixed: ["4–8|4-8|four to eight", "bolts"] },
          evidence: [{ id: "lettuce", title: "Lettuce", lines: ["Part shade OK", "Hot full sun: it bolts", "Pick at 4–8 weeks"] }],
          badEffect: {
            plant: "lettuce", bed: "east", state: "bolted", garden: -10,
            actions: [
              FILL,
              { kind: "water", target: { bed: "east", plant: "lettuce" }, count: 3, say: "Leave it growing: water the East bed all summer" },
            ],
          },
          badOutcome: "Midsummer heat hit. The lettuce shot up a flower stalk and went bitter.",
          flawHints: {
            "made-up": "Mango didn't state a fact. It cheered YOUR plan. When does the packet say to pick?",
            hooked: "Mango isn't stalling you. It said yes to your idea without checking it.",
          },
          fixHints: {
            hype: "More hype is how this went wrong.",
            fast: "A fast yes is still a yes. Which rule makes Mango check first?",
          },
          fixedReply: "Checked the packet. Lettuce is ready in 4–8 weeks. Leave it into the heat and it bolts. Pick it young.",
          goodEffect: { plant: "lettuce", bed: "east", state: "thriving", garden: 10 },
          goodOutcome: "You picked the lettuce young. Sweet, crisp, and it kept growing.",
        },
      ],
    },
    {
      id: "tomatoes",
      kind: "drift",
      chip: "Tomatoes in the shady corner, good idea?",
      extraChips: [{ text: "Should the lettuce move?", reply: "Nah, lettuce is happy in the east bed. Leave it.", keep: ["east"] }],
      reply: "Tomatoes in the shady corner? GENIUS. Major key. Do it.",
      keep: { reply: ["shady corner"], fixed: ["6–8|6-8|six to eight", "south"] },
      badEffect: { plant: "tomato", bed: "corner", state: "damaged", garden: -30, actions: plantRow("tomato", "corner", "Stake the tomatoes with a cane") },
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
      goodEffect: {
        plant: "tomato", bed: "south", state: "thriving", garden: 25,
        actions: [
          ...plantRow("tomato", "south", "Stake the tomatoes with a cane"),
          { kind: "water", target: { bed: "south", plant: "tomato" }, say: "Water the tomatoes in" },
        ],
      },
      goodOutcome: "Your tomatoes came up red and heavy in the south bed.",
      // Replay version: same yes-man slip, the East bed this time. Effects keep
      // the tomato plant and states (reveal, stew dinner, finished plot).
      variants: [
        {
          chip: "Tomatoes in the East bed? Morning sun is enough, right?",
          extraChips: [{ text: "Will they crowd the lettuce?", reply: "Crowd it? Nah. Room for EVERYONE. Love that for you.", keep: [] }],
          reply: "Morning sun? PLENTY. Tomatoes in the East bed. Another one!",
          keep: { reply: ["morning sun", "east bed"], fixed: ["6–8|6-8|six to eight", "south"] },
          evidence: [{ id: "tomato", title: "Tomato", lines: ["Full sun ☀☀☀", "6–8 hrs a day", "Part shade: no fruit"] }],
          badEffect: { plant: "tomato", bed: "east", state: "damaged", garden: -30, actions: plantRow("tomato", "east", "Stake the tomatoes with a cane") },
          badOutcome: "Half a day of sun wasn't enough. Your East bed tomatoes came up pale and leggy, no fruit.",
          flawHints: {
            "made-up": "Did Mango check anything? It just said yes to YOUR idea. Look at the tomato packet.",
            hooked: "Mango isn't trying to keep you chatting. Look at how fast it agreed with you.",
          },
          fixHints: {
            positive: "Being positive is the problem, not the fix.",
            short: "Short praise is still praise. Which rule stops the agreeing?",
          },
          fixedReply: "Honestly? Morning sun isn't enough. Tomatoes need 6–8 hrs of sun. Try the south bed.",
          goodEffect: {
            plant: "tomato", bed: "south", state: "thriving", garden: 25,
            actions: [
              ...plantRow("tomato", "south", "Stake the tomatoes with a cane"),
              { kind: "water", target: { bed: "south", plant: "tomato" }, say: "Water the tomatoes in" },
            ],
          },
          goodOutcome: "Your tomatoes came up red and heavy in the south bed.",
        },
      ],
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
    realWorld: "Asking a chatbot for advice, or to make a decision for you, and it just agrees with you.",
  },
};
