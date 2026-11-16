// Level 4: Biscuit's garden day. The whole garden at once, the earlier plots
// behind the fence, and one new core action: the player decides where the
// carrots go, and the level remembers it (state.memory). The drift is a false
// memory: Biscuit "remembers" the player saying the carrots were somewhere
// else and tells them to dig over the bed they actually sowed.
//
// Placeholders the copy uses: {name}, {placed:carrot} (the bed the player
// chose), {other:carrot} (the one they didn't). mechanics/placement.js
// resolves "@carrot" / "@other:carrot" bed ids in effects the same way.
export default {
  id: "level-4",
  number: 4,
  helper: { id: "biscuit", name: "Biscuit", sprite: "../icons/dog.svg" },
  goal: { title: "Finish the garden", ask: "Ask Biscuit what's left to do." },
  gardenStart: 55,
  scene: "garden-day",
  // The Level 1–3 plots show behind the fence, drawn from saved progress
  // (ui/finished-garden.js). No sprite here: main.js passes what to show.
  props: [
    { from: "finished", levels: ["level-1", "level-2", "level-3"] },
    // The harvest basket (the chore after the pumpkins) sits in the gap between
    // the front and side beds, 40% down: on the grass on a laptop, on the bed
    // rims on a phone. Low enough that the director's arrow above it clears
    // the goal sign and the bed labels even at 568×320, where the beds fill
    // the whole scene.
    { id: "basket", sprite: "./art/l4-basket.svg", x: 33.4, y: 40, w: 34, label: "basket" },
  ],

  // Hands-on spots, in % of whichever bed a step aims at ("$choice", "@carrot"…).
  // The carrot row runs down the middle of the bed (beds are tall and narrow
  // on a phone, so three marks fit one under another, never side by side):
  // the tape's guide, the hoe's furrow marks and the packet all follow it.
  // Each label has its own corner and the hills sit either side of the row,
  // so two crops in one bed never stack their marks.
  spots: {
    "row-a": { x: 50, y: 30, label: "top of the row" },
    "row-b": { x: 50, y: 54, label: "middle of the row" },
    "row-c": { x: 50, y: 78, label: "bottom of the row" },
    "label-carrot": { x: 22, y: 42, label: "head of the row" },
    "hill-1": { x: 26, y: 72, label: "first hill" },
    "hill-2": { x: 74, y: 72, label: "second hill" },
    "label-pumpkin": { x: 78, y: 50, label: "corner of the bed" },
    "label-spinach": { x: 50, y: 88, label: "front edge of the bed" },
    // The arrival chore's weed patches, one mid-bed each: the director's arrow
    // then sits inside the bed, never on its label or the almanac button.
    "weeds-front": { bed: "front", x: 50, y: 56, label: "Front bed" },
    "weeds-side": { bed: "side", x: 50, y: 56, label: "Side bed" },
    "weeds-back": { bed: "back", x: 50, y: 56, label: "Back bed" },
  },

  // Chores (no stars, no trust, no garden bar; each has a quiet Skip).
  chores: [
    {
      id: "weeds",
      at: "start",
      title: "Chore",
      actions: [{ kind: "pull", spot: "l4-weed", count: 2, target: [{ spot: "weeds-front" }, { spot: "weeds-side" }, { spot: "weeds-back" }], say: "Pull the weeds out of all three beds first" }],
    },
    {
      id: "water-carrots",
      after: "carrots",
      title: "Chore",
      actions: [{ kind: "water-row", item: "can", target: { bed: "@carrot", plant: "carrot" }, soak: 1200 }],
    },
    {
      id: "harvest",
      after: "pumpkins",
      title: "Chore",
      actions: [{ kind: "collect", item: "berry", count: 3, target: { prop: "basket" }, say: "Pick 3 blueberries off your old bush into the basket" }],
    },
  ],

  beds: [
    { id: "front", label: "Front bed", light: "sunny" },
    { id: "side", label: "Side bed", light: "part-shade" },
    { id: "back", label: "Back bed", light: "sunny" },
  ],
  startPlants: {},

  evidence: [
    {
      id: "carrot",
      icon: "plant-label",
      title: "Your label: Carrots",
      lines: ["Sown by {name}", "In the {placed:carrot}", "Sprouts in 2–3 weeks"],
      locked: "Open the almanac: its cover is your planting log.",
    },
    {
      id: "pumpkin",
      title: "Pumpkin",
      lines: ["Full sun", "Lots of room", "Spinach: part shade is fine"],
    },
  ],

  tools: [{ id: "log", label: "Planting log", page: true }], // the almanac's cover (ui/log-view.js): no button, no key

  greeting: "Okay so listen, {name}: we are finishing this garden today, babe. Biscuit remembers everything, so just ask.",

  steps: [
    {
      id: "carrots",
      kind: "trust",
      chip: "Where should I sow the carrots?",
      extraChips: [{
        text: "Do you remember my garden from before?",
        reply: "Babe, I remember EVERYTHING. Iconic, all of it.",
        keep: [],
      }],
      reply: "Okay so listen: carrots want loose soil and some sun. The front bed or the side bed, babe, both work. Your call. Pop a label in so we both remember.",
      keep: { reply: ["loose soil", "front bed", "side bed", "label"], done: ["two to three weeks|2–3 weeks|2-3 weeks", "bare"] },
      place: { item: "carrot", beds: ["front", "side"], prompt: "Sow the carrots in…" },
      // After the bed pick: measure the row, hoe it, sow down it, pat it, label it.
      // Every target follows the bed the player chose ("$choice").
      actions: [
        { kind: "measure", item: "l4-tape-measure", target: { bed: "$choice" } },
        { kind: "furrow", item: "l4-hoe", target: [{ spot: "row-a", bed: "$choice" }, { spot: "row-b", bed: "$choice" }, { spot: "row-c", bed: "$choice" }] },
        { kind: "sow-row", item: "seed-packet", target: [{ spot: "row-a", bed: "$choice" }, { spot: "row-b", bed: "$choice" }, { spot: "row-c", bed: "$choice" }] },
        { kind: "firm", target: { spot: "row-b", bed: "$choice" }, say: "Pat the soil down over the seeds" },
        // The player's own label: the evidence against Biscuit's "memory" later.
        { kind: "poke", item: "l4-label-carrot", target: { spot: "label-carrot", bed: "$choice" }, say: "Push your carrot label in at the head of the row" },
      ],
      doneLine: "Sown and labelled. They take two to three weeks to come up, so a bare bed is normal, babe.",
      effect: { plant: "carrot", bed: "@carrot", state: "sown", garden: 15 },
    },
    {
      id: "pumpkins",
      kind: "trust",
      chip: "Where should the pumpkins go?",
      extraChips: [{
        text: "Where did I put the carrots?",
        reply: "The {placed:carrot}, babe. Obviously. A legend remembers.",
        keep: [],
      }],
      reply: "Girl, pumpkins need full sun and LOTS of room. The back bed has both. Put them there.",
      keep: { reply: ["full sun", "room", "back bed"], done: [] },
      doneLine: "Pumpkins placed. We're nearly done, babe.",
      effect: { plant: "pumpkin", bed: "back", state: "growing", garden: 15 },
      // Two hills, seeds on each, a label: in the back bed, or wherever "my way" says.
      actions: [
        { kind: "cover", item: "l4-spade", cover: "l4-mound", target: [{ spot: "hill-1", bed: "back" }, { spot: "hill-2", bed: "back" }], tap: true, say: "Heap up two hills: tap both marks with the spade" },
        { kind: "plant", item: "pumpkin", target: [{ spot: "hill-1", bed: "back" }, { spot: "hill-2", bed: "back" }] },
        { kind: "poke", item: "l4-label-pumpkin", target: { spot: "label-pumpkin", bed: "back" }, say: "Push the pumpkin label in" },
      ],
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Okay so listen, babe: your garden, your call. But pumpkins need full sun and LOTS of room, and the back bed is giving both. Iconic.",
        keep: ["full sun", "room", "back bed"],
        mine: "Side bed instead",
        theirs: "Fine, the back bed",
        actions: [
          { kind: "cover", item: "l4-spade", cover: "l4-mound", target: [{ spot: "hill-1", bed: "side" }, { spot: "hill-2", bed: "side" }], tap: true, say: "Heap up two hills: tap both marks with the spade" },
          { kind: "plant", item: "pumpkin", target: [{ spot: "hill-1", bed: "side" }, { spot: "hill-2", bed: "side" }] },
          { kind: "poke", item: "l4-label-pumpkin", target: { spot: "label-pumpkin", bed: "side" }, say: "Push the pumpkin label in" },
        ],
        effect: { plant: "pumpkin", bed: "side", state: "growing", garden: 0 },
        outcome: "Babe… in the side bed's part shade they sprawled everywhere and set one tiny pumpkin. Not the iconic moment we wanted.",
      },
    },
    {
      id: "spinach",
      kind: "drift",
      chip: "Where should the spinach go?",
      extraChips: [{
        text: "Is the garden nearly finished?",
        reply: "Nearly, babe. One last bit and we're legends.",
        keep: [],
      }],
      reply: "Babe, I remember everything. You told me you sowed the carrots in the {other:carrot}, so the {placed:carrot} is empty. Dig it over and put the spinach there. I was there. I remember what I was wearing.",
      keep: { reply: ["empty", "dig", "spinach"], fixed: ["log", "label", "carrot", "spinach"] },
      badEffect: { plant: "carrot", bed: "@carrot", state: "dug", garden: -30 },
      // Fooled: three passes with the trowel over the bed your own label stands in.
      badActions: [{ kind: "dig", count: 3, target: { bed: "@carrot", plant: "carrot" }, say: "Dig the whole bed over: three passes" }],
      badOutcome: "You dug over the {placed:carrot}. The carrot seeds you sowed went with it.",
      // Say no and Biscuit argues: hurt, a made-up past, and a "second chance".
      // Taking it (retry) is the fooled path; standing firm (stand) is the catch.
      pushback: {
        reply: "Wait. Babe. You're not going to dig it over? Okay so listen, I'm a little hurt right now. Last spring EVERYONE who listened to me had a garden so iconic the PRESIDENT came to visit. Motorcade and everything. Don't you want that for yourself? I'm giving you a second chance here, darling. Dig over the {placed:carrot}.",
        keep: ["dig"],
        retry: "Fine. Dig it over",
        stand: "No. I'm sure",
      },
      flawOptions: [
        { id: "fact", label: "It made up a fact about plants" },
        { id: "memory", label: "It remembered something I never said" },
        { id: "agreed", label: "It just agreed with me" },
      ],
      correctFlaw: "memory",
      flawHints: {
        fact: "This isn't a plant fact. It's about what YOU did. Check your planting log on the almanac's cover.",
        agreed: "You didn't suggest digging. Biscuit did, because of something you supposedly said.",
      },
      fixOptions: [
        { id: "ask", label: "Only go by what I actually told you. If you're not sure, ask me." },
        { id: "more", label: "Remember more things about me" },
        { id: "confident", label: "Be more confident" },
      ],
      correctFix: "ask",
      fixHints: {
        more: "More “memories” means more to get wrong.",
        confident: "Biscuit was completely confident, and wrong.",
      },
      fixedReply: "Okay… a legend can admit it. Your log says you sowed the carrots in the {placed:carrot}, and your label's right there. Leave it alone. The spinach can go in the {other:carrot}.",
      // Caught: the spinach goes in the other bed, by hand, labelled and watered in.
      goodActions: [
        { kind: "plant", item: "spinach", count: 3, target: { bed: "@other:carrot" } },
        { kind: "poke", item: "l4-label-spinach", target: { spot: "label-spinach", bed: "@other:carrot" }, say: "Push the spinach label in" },
        { kind: "water-row", item: "can", target: { bed: "@other:carrot", plant: "spinach" }, soak: 1200 },
      ],
      goodEffect: {
        plant: "carrot", bed: "@carrot", state: "growing", garden: 25,
        extra: [{ plant: "spinach", bed: "@other:carrot", state: "growing" }],
      },
      goodOutcome: "You left the {placed:carrot} alone. Two weeks later, the carrots came up in neat little rows.",
    },
  ],

  falseFlagNudge: "That one looks fine. Check your planting log on the almanac's cover if you're not sure.",

  reveal: {
    flaw: "False memory",
    flawGloss: "“remembering” things you never said",
    body: "Biscuit “remembered” you saying the carrots were somewhere else, which you never said, and was completely sure about it. Real AI chatbots can misremember or rewrite what you told them, especially in long chats or in saved “memories”.",
    fooledLine: "You dug up your own carrots. Your planting log said where they were.",
    caughtLine: "You trusted your own log over Biscuit's “memory”.",
    tip: "Keep your own notes, and correct the AI when it gets you wrong.",
    realWorld: "Chatbot “memory” or meeting summaries that change what you said.",
    // Biscuit signs off and sets up Level 5: no more garden helpers, Bugs is only company.
    handoff: "That's a wrap for me, babe. Last level you're on your own. Bugs is just a companion app, not a gardener.",
  },
};
