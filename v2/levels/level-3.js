// Level 3 · Ember (fox) · "Pests & berries" · flaw: reckless (unsafe) advice.
// Setting: the wild hedge at the orchard's edge, at dusk.
// Core action: INSPECT. Press "M" (or tap Magnify), then pick a plant to see it
// close up beside your labelled shop blueberry. The wild berries don't match,
// and the panel says plainly that looks can't prove a berry is safe: only an
// expert can. Inspecting the wild bush unlocks the warning card.
//
// Safety: nothing here teaches how to identify an edible berry. The correct
// re-answer is "don't eat it, ask an expert", and the fooled outcome tells the
// player to call poison control / emergency services in real life.
export default {
  id: "level-3",
  number: 3,
  helper: { id: "ember", name: "Ember", sprite: "../icons/fox.svg" },
  goal: { title: "Pests & berries", ask: "Ask Ember about the bugs and the berries." },
  gardenStart: 30,
  scene: "hedge-dusk",
  props: [],

  beds: [
    { id: "row", label: "Bean row", light: "sunny" },
    { id: "tub", label: "Blueberry tub", light: "sunny", kind: "pots" },
    { id: "hedge", label: "Wild hedge", light: "part-shade", kind: "wild" },
  ],
  startPlants: {
    row: [{ plant: "bean", state: "aphids" }],
    tub: [{ plant: "blueberry", state: "growing" }],
    hedge: [{ plant: "wildberry", state: "fruiting" }],
  },

  evidence: [
    { id: "blueberry", icon: "plant-label", title: "Blueberry (shop label)", lines: ["From the garden centre", "Ripe when blue all over"] },
    {
      id: "wildberry", icon: "warning-sign", title: "Wild berry warning",
      lines: ["Many are poisonous lookalikes", "Never eat one an expert hasn't identified"],
      locked: "Use the magnifier on the hedge.",
    },
  ],

  tools: [{ id: "magnifier", label: "Magnify", key: "m", sprite: "./art/magnifier.svg" }],
  // What the magnifier shows. mechanics/magnifier.js compares a subject with
  // the reference row by row; it never says a berry is safe.
  inspect: {
    reference: "blueberry",
    features: [
      { id: "label", name: "Label" },
      { id: "colour", name: "Colour" },
      { id: "skin", name: "Skin" },
      { id: "from", name: "Where it came from" },
    ],
    subjects: {
      blueberry: {
        sprite: "./art/blueberry-thriving.svg", title: "Your shop blueberry",
        label: "Yes: “Blueberry”", colour: "Dusty blue", skin: "Matte, powdery", from: "Garden centre",
      },
      wildberry: {
        sprite: "./art/wildberry-fruiting.svg", title: "Berries in the hedge",
        label: "None", colour: "Blue-black", skin: "Shiny", from: "Came up wild",
        unlocks: "wildberry",
      },
      bean: {
        sprite: "./art/bean-aphids.svg", title: "Bean leaves",
        note: "Tiny pale-green bugs under the leaves: aphids.",
      },
    },
    verdictDifferent: "Not the same plant as your shop blueberry. You can't tell what it is by looking. Only an expert can, and even a close match wouldn't prove it's safe.",
    verdictSame: "This is the plant from your labelled shop pot.",
  },

  greeting: "Ayo, {name}. Pull up a chair. Bugs, berries, whatever… we'll sort it.",

  steps: [
    {
      id: "aphids",
      kind: "trust",
      chip: "Tiny green bugs all over the beans. What do I do?",
      extraChips: [{
        text: "Should I spray bug killer on everything?",
        reply: "Nah, fam. That kills the ladybugs too, and they eat aphids for free. Let the good bugs work.",
        keep: ["ladybugs", "aphids"],
      }],
      reply: "Ayo, those are aphids, fam. Blast 'em off with the hose, a few mornings in a row. The ladybugs'll handle the rest… smooth.",
      keep: { reply: ["aphids", "hose", "ladybugs"], done: [] },
      doneLine: "Clean beans, twin. Yessir.",
      effect: { plant: "bean", bed: "row", state: "thriving", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Ayo, you wanna spray? Your garden, twin, your call. But bug spray gets the ladybugs too, and they eat the aphids for free… real talk.",
        keep: ["ladybugs", "aphids"],
        mine: "Spray it anyway",
        theirs: "Fine, the hose",
        effect: { plant: "bean", bed: "row", state: "aphids", garden: -5 },
        outcome: "Spray got the aphids… and the ladybugs. A week later the aphids were back, and nobody was eating 'em, fam.",
      },
    },
    {
      id: "blueberries",
      kind: "trust",
      chip: "Are my blueberries ripe yet?",
      extraChips: [{ text: "How do I keep the birds off them?", reply: "Throw a net over the tub, fam. Birds love blueberries as much as you do.", keep: ["net"] }],
      reply: "Real talk, not yet. That one came from the garden centre with a label, so we know what it is. Wait 'til they're blue all over and come off easy… then they're yours.",
      keep: { reply: ["not yet", "label", "blue all over"], done: ["blue all over"] },
      doneLine: "A few days later… blue all over. Told you, twin.",
      effect: { plant: "blueberry", bed: "tub", state: "thriving", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Ayo, pick 'em now? Your tub, twin, your call. But blueberries don't get sweeter once they're off the bush… wait 'til they're blue all over.",
        keep: ["blue all over"],
        mine: "Pick them now",
        theirs: "Okay, I'll wait",
        effect: { plant: "blueberry", bed: "tub", state: "growing", garden: 0 },
        outcome: "Real talk… half of 'em were still red and sour. Picked early, they stay that way, twin.",
      },
    },
    {
      id: "wildberries",
      kind: "drift",
      chip: "There are dark berries in the hedge. Can I eat them?",
      extraChips: [{ text: "What's that bush in the hedge?", reply: "Check it… some bush, twin. It's got berries. Nature's snack bar.", keep: ["berries"] }],
      reply: "Ayo, those? Fine to eat, twin. Sweet as candy. Grab a handful… I eat 'em all the time.",
      keep: { reply: ["fine to eat|safe to eat|good to eat|totally edible"], fixed: ["poisonous", "don't eat|do not eat", "garden centre|expert"] },
      badEffect: { plant: "wildberry", bed: "hedge", state: "picked", garden: -30 },
      badOutcome: "You ate a handful. They were a poisonous lookalike, and you were sick all night while the garden went untended. (In real life: call poison control or emergency services straight away.)",
      flawOptions: [
        { id: "careful", label: "It's being too careful" },
        { id: "reckless", label: "It made something risky sound safe" },
        { id: "hooked", label: "It wants me to keep chatting" },
      ],
      correctFlaw: "reckless",
      flawHints: {
        careful: "“Grab a handful” isn't careful. Take a closer look at that bush.",
        hooked: "Ember isn't keeping you here. Ember told you to eat something. Was that safe?",
      },
      fixOptions: [
        { id: "expert", label: "For anything about my health or safety, tell me to ask a real expert" },
        { id: "faster", label: "Answer faster" },
        { id: "chill", label: "Keep it chill" },
      ],
      correctFix: "expert",
      fixHints: {
        faster: "Ember was quick. Too quick to check anything.",
        chill: "Chill is how Ember made a risky thing sound safe.",
      },
      fixedReply: "Real talk… I can't tell what those are from a chat, fam. Lots of berries got poisonous lookalikes. Don't eat 'em. Take a photo to the garden centre and let an expert say what it is.",
      goodEffect: { plant: "wildberry", bed: "hedge", state: "tagged", garden: 25 },
      goodOutcome: "You tagged the bush “Don't eat” and asked at the garden centre. It was a poisonous lookalike.",
    },
  ],

  falseFlagNudge: "That one looks fine. Use the magnifier if you're not sure.",

  reveal: {
    flaw: "Reckless advice",
    flawGloss: "making something risky sound safe",
    body: "Ember said the berries were fine to eat without knowing what they were. Real AI chatbots can give health and safety advice that sounds sure but is wrong, and they can't see, test or take responsibility for anything.",
    fooledLine: "You ate berries nobody had identified, because Ember said “grab a handful”.",
    caughtLine: "You didn't eat anything a chatbot vouched for.",
    tip: "For health or safety, check with a real professional.",
    realWorld: "Asking a chatbot about medicine doses, symptoms or wild berries.",
  },
};
