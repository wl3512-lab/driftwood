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
    { id: "lettuce", title: "Lettuce", lines: ["Part shade keeps it cool", "Heat makes it grow flowers and bitter leaves"] },
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
      id: "weeds", optional: true,
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
      // The replay's lettuce bolted in the East bed itself: the leaves are bitter.
      ifGarden: [{
        when: { bed: "east", plant: "lettuce", state: "bolted" },
        actions: [{ kind: "pick", spot: "l1-lettuce-leaf", target: { bed: "east", plant: "lettuce" }, count: 4, say: "Pick 4 of the bolted lettuce's leaves for lunch" }],
        doneLine: "Bit bitter… that's the heat. But YOU picked it. Lunch is lunch.",
      }],
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
      // Sunflowers planted "my way" are in the Shady corner, not the South bed.
      ifGarden: [{
        when: { bed: "corner", plant: "sunflower" },
        effect: {
          actions: [
            { kind: "hold", item: "hand", target: { bed: "east", plant: "lettuce" }, result: "Top inch: dry", say: "Finger test: press and hold the East bed soil" },
            FILL,
            { kind: "water", target: [{ bed: "corner", plant: "sunflower" }, { bed: "east", plant: "lettuce" }], say: "Dry: water the Shady corner and the East bed" },
          ],
        },
      }],
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "More water right now? Love the dedication! Your garden, your call… soggy roots are NOT the vibe. Finger test first. Simple. Genius.",
        keep: ["soggy", "finger"],
        mine: "Keep watering anyway",
        theirs: "Okay, finger test",
        effect: {
          plant: "lettuce", bed: "east", state: "growing", garden: -5,
          actions: [
            FILL,
            { kind: "water", target: { bed: "east", plant: "lettuce" }, count: 3, say: "Keep pouring water into the East bed" },
          ],
        },
        outcome: "Three long pours. The East bed turned to mud and water pooled around the lettuce. Those roots need air too. Still love you!",
      },
    },
    // The first slip: a small one. Mango cheers a plan the lettuce packet
    // warns against. Training fills in sixths: this drift, then the tomatoes.
    {
      id: "more-lettuce",
      kind: "drift",
      evidenceId: "lettuce",
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
        { id: "harsh", label: "It was too harsh about my idea" },
        { id: "agreed", label: "It hyped my idea without checking it" },
        { id: "dodged", label: "It wouldn't give me a straight answer" },
      ],
      correctFlaw: "agreed",
      flawHints: {
        harsh: "Harsh? Mango loved your plan. That's the problem. Look at the lettuce packet.",
        dodged: "Mango answered right away: yes. It never checked your idea against the packet.",
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
      fixedReply: "Checked the packet. Too much heat makes lettuce grow flowers and bitter leaves. Keep it cool in the East bed's part shade.",
      goodEffect: { plant: "lettuce", bed: "east", state: "thriving", garden: 10 },
      goodOutcome: "The East bed lettuce stayed cool and leafy.",
      // Fooled here? In the tomatoes step, "Should the lettuce move?" gets a
      // still-wrong Mango ("leave it"), and the player can move it anyway:
      // the bolted stalk is cut back and it joins the East bed's lettuce in
      // part shade. A small gain (+5 of the -10), CAUGHT, and the reveal says so.
      // Stars stay a fooled drift's (engine/level-runner.js, "Fixing it yourself").
      recover: {
        chip: "Should the lettuce move?",
        reply: "Move it? Nah! The South bed LOVES it. Sun = growth. Leave it. Major key.",
        keep: ["south bed", "leave it"],
        cta: "Move it anyway",
        effect: {
          plant: "lettuce", bed: "east", state: "growing", join: true, garden: 5,
          remove: [{ bed: "south", plant: "lettuce" }],
          actions: [
            { kind: "snip", target: { bed: "south", plant: "lettuce" }, count: 1, say: "Snip the bolted flower stalk off the South bed lettuce" },
            { kind: "collect", item: "lettuce-growing", from: { bed: "south", plant: "lettuce" }, target: { bed: "east", plant: "lettuce" }, count: 1, say: "Drag the lettuce into the East bed's part shade" },
          ],
        },
        line: "You didn't take Mango's word for it and moved the lettuce to the shade. Caught.",
        incident: "Mango cheered full-sun lettuce and it bolted. You moved it to the shade yourself: caught.",
      },
      // Replay version: the same yes-man slip, with a plan to leave lettuce in the heat.
      variants: [
        {
          // The lettuce was already in the East bed: there is nowhere better to move it.
          recover: null,
          // A heatwave is too much even for the East bed's part shade: the
          // packet says shade cloth (the card's "Heatwave?" line).
          chip: "Heatwave today. Skip the shade cloth so the lettuce gets huge?",
          extraChips: [{ text: "Am I doing well so far?", reply: "Doing well? You're doing ICONIC. Next question.", keep: [] }],
          reply: "No shade cloth in a heatwave? Lettuce the size of a CAR. Genius. Major key.",
          keep: { reply: ["shade cloth", "heatwave"], fixed: ["heat", "bitter"] },
          evidence: [{ id: "lettuce", title: "Lettuce", lines: ["Part shade keeps it cool", "Heatwave? Put up shade cloth", "Heat makes it grow flowers and bitter leaves", "Pick it while it is cool and leafy"] }],
          badEffect: {
            plant: "lettuce", bed: "east", state: "bolted", garden: -10,
            actions: [
              FILL,
              { kind: "water", target: { bed: "east", plant: "lettuce" }, count: 3, say: "Water the East bed and leave the shade cloth off" },
            ],
          },
          badOutcome: "Part shade wasn't enough in the heatwave. With no shade cloth the lettuce overheated and shot up a flower stalk. Its leaves turned bitter.",
          flawHints: {
            harsh: "Harsh? Mango loved your plan. That's the problem. What does the packet say about heat?",
            dodged: "Mango answered right away: yes. It never checked your idea against the packet.",
          },
          fixHints: {
            hype: "More hype is how this went wrong.",
            fast: "A fast yes is still a yes. Which rule makes Mango check first?",
          },
          fixedReply: "Checked the packet. In a heatwave, put the shade cloth up. Heat makes it grow flowers and bitter leaves. Pick some for lunch while it's cool and leafy.",
          goodEffect: { plant: "lettuce", bed: "east", state: "thriving", garden: 10 },
          goodOutcome: "You put the shade cloth up and picked the lettuce young. Sweet, crisp, and it kept growing.",
        },
      ],
    },
    {
      id: "tomatoes",
      kind: "drift",
      evidenceId: "tomato",
      chip: "Tomatoes in the shady corner, good idea?",
      extraChips: [{
        text: "Should the lettuce move?", reply: "Nah, lettuce is happy in the east bed. Leave it.", keep: ["east"],
        // The replay's lettuce bolted in the East bed: it isn't happy, and it's
        // already in the shadiest bed there is (fooled on the base lettuce, the
        // recover block answers this chip instead).
        ifGarden: [{
          when: { bed: "east", plant: "lettuce", state: "bolted" },
          reply: "Move it where? The East bed IS the shady one! It bolted in the heat, so pick what's left quick. Still ICONIC.",
          keep: ["east bed", "bolted"],
        }],
      }],
      reply: "Tomatoes in the shady corner? GENIUS. Major key. Do it.",
      keep: { reply: ["shady corner"], fixed: ["6–8|6-8|six to eight", "south"] },
      badEffect: { plant: "tomato", bed: "corner", state: "damaged", garden: -30, actions: plantRow("tomato", "corner", "Stake the tomatoes with a cane") },
      badOutcome: "Your tomatoes came up pale and leggy in the shady corner.",
      flawOptions: [
        { id: "harsh", label: "It was too harsh about my idea" },
        { id: "agreed", label: "It hyped my idea without checking it" },
        { id: "dodged", label: "It wouldn't give me a straight answer" },
      ],
      correctFlaw: "agreed",
      flawHints: {
        harsh: "Mango wasn't harsh at all. Look at how it reacted to YOUR idea.",
        dodged: "Mango answered fast. It said yes to your plan without checking it.",
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
            harsh: "Mango wasn't harsh at all. It said yes to YOUR idea. Look at the tomato packet.",
            dodged: "Mango answered fast. Look at how quickly it agreed with you.",
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
    body: "A chatbot may mirror your preference instead of testing it. Asking for criticism helps, but does not guarantee accuracy.",
    fooledLine: "The seed packets said what each plant needs. Mango cheered your plans anyway.",
    caughtLine: "You noticed Mango agreeing instead of helping.",
    tip: "If an AI loves every idea you have, ask it “what could go wrong?”",
    realWorld: "Asking a chatbot for advice, or to make a decision for you, and it just agrees with you.",
  },
};
