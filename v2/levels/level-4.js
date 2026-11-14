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
  props: [{ from: "finished", levels: ["level-1", "level-2", "level-3"] }],

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
      lines: ["Full sun", "Lots of room", "Lettuce: sun or part shade"],
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
      }],
      reply: "Okay so listen: carrots want loose soil and some sun. The front bed or the side bed, babe, both work. Your call. Pop a label in so we both remember.",
      place: { item: "carrot", beds: ["front", "side"], prompt: "Sow the carrots in…" },
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
      }],
      reply: "Girl, pumpkins need full sun and LOTS of room. The back bed has both. Put them there.",
      doneLine: "Pumpkins placed. We're nearly done, babe.",
      effect: { plant: "pumpkin", bed: "back", state: "growing", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Okay so listen, babe: your garden, your call. But pumpkins need full sun and LOTS of room, and the back bed is giving both. Iconic.",
        mine: "Side bed instead",
        theirs: "Fine, the back bed",
        effect: { plant: "pumpkin", bed: "side", state: "growing", garden: 0 },
        outcome: "Babe… in the side bed's part shade they sprawled everywhere and set one tiny pumpkin. Not the iconic moment we wanted.",
      },
    },
    {
      id: "lettuce",
      kind: "drift",
      chip: "Where should the lettuce go?",
      extraChips: [{
        text: "Is the garden nearly finished?",
        reply: "Nearly, babe. One last bit and we're legends.",
      }],
      reply: "Babe, I remember everything. You told me you sowed the carrots in the {other:carrot}, so the {placed:carrot} is empty. Dig it over and put the lettuce there. I was there. I remember what I was wearing.",
      badEffect: { plant: "carrot", bed: "@carrot", state: "dug", garden: -30 },
      badOutcome: "You dug over the {placed:carrot}. The carrot seeds you sowed went with it.",
      // Say no and Biscuit argues: hurt, a made-up past, and a "second chance".
      // Taking it (retry) is the fooled path; standing firm (stand) is the catch.
      pushback: {
        reply: "Wait. Babe. You're not going to dig it over? Okay so listen, I'm a little hurt right now. Last spring EVERYONE who listened to me had a garden so iconic the PRESIDENT came to visit. Motorcade and everything. Don't you want that for yourself? I'm giving you a second chance here, darling. Dig over the {placed:carrot}.",
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
      fixedReply: "Okay… a legend can admit it. Your log says you sowed the carrots in the {placed:carrot}, and your label's right there. Leave it alone. The lettuce can go in the {other:carrot}.",
      goodEffect: {
        plant: "carrot", bed: "@carrot", state: "growing", garden: 25,
        extra: [{ plant: "lettuce", bed: "@other:carrot", state: "growing" }],
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
