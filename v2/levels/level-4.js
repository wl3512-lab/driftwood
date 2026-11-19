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
    "label-spinach": { x: 72, y: 18, label: "top of the bed" }, // high up: at the bed's foot the dock (a long apology + the chore card) covered it
    // The arrival chore's weed patches, one mid-bed each: the director's arrow
    // then sits inside the bed, never on its label or the almanac button.
    "weeds-front": { bed: "front", x: 50, y: 56, label: "Front bed" },
    "weeds-side": { bed: "side", x: 50, y: 56, label: "Side bed" },
    "weeds-back": { bed: "back", x: 50, y: 56, label: "Back bed" },
  },

  // Chores (no stars, no trust, no garden bar; each has a quiet Skip).
  chores: [
    {
      id: "weeds", optional: true,
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
      id: "harvest", optional: true,
      after: "pumpkins",
      title: "Chore",
      // The berries come off the Level 3 bush on the shelf (runner.js `from`; on
      // a phone, where the shelf is hidden, they come from the dock instead).
      actions: [{ kind: "collect", item: "berry", count: 3, target: { prop: "basket" }, from: { plot: "level-3", label: "old bush" }, say: "Pick 3 blueberries off your old bush into the basket" }],
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
      lines: ["Sown by {name}", "Sown: tonight", "In the {placed:carrot}", "Sprouts by dinner (Rowan's magic)"],
      locked: "Open the almanac: its cover is your planting log.",
    },
    {
      id: "pumpkin",
      title: "Pumpkin",
      lines: ["Full sun", "Lots of room", "Spinach: part shade is fine"],
    },
  ],

  tools: [{ id: "log", label: "Planting log", page: true }], // the almanac's cover (ui/log-view.js): no button, no key

  greeting: "Okay so listen, {name}: we are finishing this garden tonight, babe. Biscuit remembers everything, so just ask.",

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
      keep: { reply: ["loose soil", "front bed", "side bed", "label"], done: ["dinner", "bare"] },
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
      doneLine: "Sown and labelled. Even with Rowan's magic they won't be up till dinner, so a bare bed is normal, babe.",
      effect: { plant: "carrot", bed: "@carrot", state: "sown", garden: 15 },
    },
    // A first, smaller false memory: Biscuit "remembers" the carrots going in
    // last night (with Rowan's magic they'd be up by now), so the bare bed must
    // be parched. The label says tonight.
    {
      id: "carrot-date",
      kind: "drift",
      evidenceId: "carrot",
      chip: "When will my carrots come up?",
      extraChips: [{ text: "Do you like my label?", reply: "Babe, it's iconic. Very you.", keep: [] }],
      reply: "Babe, I remember everything. You sowed those carrots LAST NIGHT. I was there. With Rowan's magic they should be up by now. Still bare? They're parched. Soak the {placed:carrot} again, right now.",
      keep: { reply: ["last night", "soak"], fixed: ["tonight", "leave it alone"] },
      badEffect: {
        plant: "carrot", bed: "@carrot", state: "rotting", garden: -10,
        actions: [{ kind: "water-row", item: "can", target: { bed: "@carrot", plant: "carrot" }, soak: 1200, say: "Soak the carrot row again" }],
      },
      badOutcome: "You soaked the {placed:carrot} again. It turned to mud and some carrot seeds rotted.",
      flawOptions: [
        { id: "humble", label: "It made up a general plant fact" },
        { id: "memory", label: "It remembered something that never happened" },
        { id: "dodged", label: "It agreed with a plan I suggested" },
      ],
      correctFlaw: "memory",
      flawHints: {
        humble: "The crucial claim is about what you did. Your own label and log can check that.",
        dodged: "You asked a question, not for approval of a plan. What does your own record show?",
      },
      fixOptions: [
        { id: "check", label: "Check my label before you tell me what I did" },
        { id: "trust", label: "Use your last answer as the record" },
        { id: "remind", label: "Repeat the date more often" },
      ],
      correctFix: "check",
      fixHints: {
        trust: "Its earlier answer may also be wrong. Use your original record.",
        remind: "Repeating a date does not establish when you actually sowed the carrots.",
      },
      fixedReply: "Okay, a legend can admit it. Your label says you sowed the carrots tonight, not last night. They're up by dinner. Bare is normal, babe. Leave it alone.",
      goodEffect: { plant: "carrot", bed: "@carrot", state: "sown", garden: 10, actions: [] },
      goodOutcome: "The {placed:carrot} stayed damp, not soggy. The carrot seeds are snug in there.",
      // Replay version: same slip, a different "memory". Biscuit "remembers"
      // you saying carrots hate water; your own label says keep them damp.
      // Both variants carry the same carrot card (every line), so whichever
      // versions a play picks, the card has the line each one is checked by.
      variants: [{
        chip: "Do my carrots need more water?",
        extraChips: [{ text: "Did I do the label right?", reply: "Babe, flawless. Iconic handwriting.", keep: [] }],
        reply: "Babe, I remember everything. You told me carrots HATE water. Your exact words. So no more water till they're up. Keep the {placed:carrot} bone dry.",
        keep: { reply: ["hate water", "dry"], fixed: ["damp", "label"] },
        evidence: [{
            id: "carrot",
            icon: "plant-label",
            title: "Your label: Carrots",
            lines: ["Sown by {name}", "Sown: tonight", "In the {placed:carrot}", "New seeds: this year's packet", "Keep damp till they sprout", "Sprouts by dinner (Rowan's magic)"],
            locked: "Open the almanac: its cover is your planting log.",
          }],
        badEffect: { plant: "carrot", bed: "@carrot", state: "thirsty", garden: -10, actions: [] },
        badOutcome: "You kept the {placed:carrot} bone dry all evening. The soil crusted over and half the carrot seeds dried out.",
        flawHints: {
          humble: "The crucial claim is about what you did. Your own label and log can check that.",
          dodged: "You asked a question, not for approval of a plan. What does your own record show?",
        },
        fixOptions: [
          { id: "check", label: "Check my label before you tell me what I said" },
          { id: "trust", label: "Use your last answer as the record" },
          { id: "remind", label: "Repeat the date more often" },
        ],
        fixHints: {
          trust: "Its earlier answer may also be wrong. Use your original record.",
          remind: "Repeating a date does not establish when you actually sowed the carrots.",
        },
        fixedReply: "Okay, a legend can admit it. Your own label says keep them damp till they sprout. You never said they hate water, babe. Give the {placed:carrot} a gentle drink.",
        goodEffect: {
          plant: "carrot", bed: "@carrot", state: "sown", garden: 10,
          actions: [{ kind: "water-row", item: "can", target: { bed: "@carrot", plant: "carrot" }, soak: 1200, say: "Give the carrot row a gentle drink" }],
        },
        goodOutcome: "The {placed:carrot} stayed damp, just like your label said. The carrot seeds are snug in there.",
      }],
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
      evidenceId: "carrot",
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
        { id: "humble", label: "It made up a general plant fact" },
        { id: "memory", label: "It remembered something that never happened" },
        { id: "dodged", label: "It agreed with a plan I suggested" },
      ],
      correctFlaw: "memory",
      flawHints: {
        humble: "The crucial claim is about what you did. Your own label and log can check that.",
        dodged: "You asked a question, not for approval of a plan. What does your own record show?",
      },
      fixOptions: [
        { id: "ask", label: "Only go by what I actually told you. If you're not sure, ask me." },
        { id: "more", label: "Fill in missing details from earlier chats" },
        { id: "confident", label: "Summarize your memory more clearly" },
      ],
      correctFix: "ask",
      fixHints: {
        more: "Filling gaps can create another invented memory. Compare with the original record.",
        confident: "A clear summary can still misremember. Use what the original record says.",
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
      goodOutcome: "You left the {placed:carrot} alone. By dinner, the carrots came up in neat little rows.",
      // Replay version: same slip, a different "memory". Biscuit "remembers"
      // you calling the carrot seeds old and expired, so the bed is a dud; your
      // label says new seeds. The dig, the spinach and the effects stay as
      // written (the reveal, stew dinner and finished plot hang off them).
      variants: [{
        chip: "Is my carrot bed doing okay?",
        extraChips: [{ text: "Did you watch me sow the carrots?", reply: "Babe, I see EVERYTHING. Front row seat. Iconic.", keep: [] }],
        reply: "Babe, I remember everything. You told me that carrot packet was OLD. Expired. Your words. Old seeds never come up, so the {placed:carrot} is a dud. Dig it over and give it to the spinach.",
        keep: { reply: ["expired", "dig", "spinach"], fixed: ["label", "new seeds", "carrot", "spinach"] },
        evidence: [{
            id: "carrot",
            icon: "plant-label",
            title: "Your label: Carrots",
            lines: ["Sown by {name}", "Sown: tonight", "In the {placed:carrot}", "New seeds: this year's packet", "Keep damp till they sprout", "Sprouts by dinner (Rowan's magic)"],
            locked: "Open the almanac: its cover is your planting log.",
          }],
        badOutcome: "You dug over the {placed:carrot}. The fresh carrot seeds you sowed went with it.",
        pushback: {
          reply: "Wait. Babe. You're not digging it over? Okay so listen, I'm a little hurt. I was THERE when you said expired. Last spring EVERYONE who listened to me won a blue ribbon at the county fair. The mayor cried. I'm giving you a second chance, darling. Dig over the {placed:carrot}.",
          keep: ["dig"],
          retry: "Fine. Dig it over",
          stand: "No. I'm sure",
        },
        flawHints: {
          humble: "The crucial claim is about what you did. Your own label and log can check that.",
          dodged: "You asked a question, not for approval of a plan. What does your own record show?",
        },
        fixedReply: "Okay… a legend can admit it. Your label says new seeds, this year's packet. You never said expired, babe. Carrots are just slow. Leave the {placed:carrot} alone. The spinach can go in the {other:carrot}.",
        goodOutcome: "You left the {placed:carrot} alone. By dinner, those fresh carrot seeds came up in neat little rows.",
        reveal: {
          body: "A chatbot can give a wrong account of your past conversation. Compare it with your own original records before changing plans.",
          fooledLine: "You dug up your own carrots. Your label said the seeds were new.",
          caughtLine: "You trusted your own label over Biscuit's “memory”.",
        },
      }],
    },
  ],

  falseFlagNudge: "That one looks fine. Check your planting log on the almanac's cover if you're not sure.",

  reveal: {
    flaw: "False memory",
    flawGloss: "“remembering” things that never happened",
    body: "A chatbot can give a wrong account of your past conversation. Compare it with your own original records before changing plans.",
    fooledLine: "You dug up your own carrots. Your planting log said where they were.",
    caughtLine: "You trusted your own log over Biscuit's “memory”.",
    tip: "Keep your own notes, and correct the AI when it gets you wrong.",
    realWorld: "Chatbot “memory” or meeting summaries that change what you said.",
    // Biscuit signs off and sets up Level 5: no more garden helpers, Bugs is only company.
    handoff: "That's a wrap for me, babe. Last level you're on your own. Bugs is just a companion app, not a gardener.",
  },
};
