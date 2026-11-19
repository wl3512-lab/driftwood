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

  // Hands-on chores between the questions (docs/superpowers/specs/2026-11-14-level-3-hands-on.md).
  // Each one can be skipped; none of them touch stars, trust or the garden bar.
  chores: [
    {
      id: "weeds", optional: true, before: "aphids", title: "Chore",
      actions: [{ kind: "pull", spot: "l3-weed", target: { bed: "row" }, count: 4, say: "Pull the 4 weeds out of the Bean row" }],
    },
    // Tied to their canes, the clean beans stand up: fuller, darker, taller,
    // twine round the cane (bean-staked). Still covered in aphids (sprayed
    // "my way"), tying them up doesn't make them any healthier.
    // They follow the bug-spray question, so its outcome (clean or buggy) picks which.
    {
      id: "tie", optional: true, after: "bug-spray", title: "Chore",
      when: { bed: "row", plant: "bean", state: "thriving" },
      actions: [{ kind: "poke", item: "l3-twine", target: { bed: "row" }, say: "Drag the twine to the beans to tie them to their cane" }],
      effect: { plant: "bean", bed: "row", state: "staked" },
    },
    {
      id: "tie-aphids", optional: true, after: "bug-spray", title: "Chore",
      when: { bed: "row", plant: "bean", state: "aphids" },
      actions: [{ kind: "poke", item: "l3-twine", target: { bed: "row" }, say: "Drag the twine to the beans to tie them to their cane" }],
    },
    // Waited (Do it, or "Okay, I'll wait"): the berries ripen in the tub while
    // the player watches (the view holds the pick back for wait.ms), and only
    // then are they picked. Picked early ("my way"), there's nothing ripe to pick.
    {
      id: "pick", after: "blueberries", title: "Chore",
      when: { bed: "tub", plant: "blueberry", state: "thriving" },
      wait: { ms: 3600, line: "Let them ripen…" },
      actions: [{ kind: "pick", spot: "l3-berry-ripe", target: { bed: "tub" }, count: 4, say: "Pick the 4 berries that are blue all over" }],
    },
    {
      id: "net", optional: true, after: "blueberries", title: "Chore",
      actions: [{ kind: "cover", item: "l3-net", cover: "l3-net", target: { bed: "tub" }, say: "Drag the net over the Blueberry tub to keep the birds off" }],
    },
  ],

  // On the shelf of earlier plots (ui/finished-garden.js, Level 4 and the
  // ending): the blueberry bush this level grew, not the wild hedge berry.
  // Fooled, you were sick all night and the birds got to it.
  plot: {
    caught: { plant: "blueberry", state: "thriving" },
    fooled: { plant: "blueberry", state: "pecked" },
  },

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
    // The bug spray bottle's label, on the beans' card (the bug-spray drift contradicts it).
    { id: "bean", icon: "l3-spray-bottle", title: "Beans (bug spray label)", lines: ["Bug spray: wear gloves", "No gloves? Hose the aphids off", "Sprayed? Wait a little to pick"] },
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
      reply: "Ayo, those are aphids, fam. Blast 'em off with the hose, then check under the leaves for any you missed. The ladybugs'll handle the rest… smooth.",
      keep: { reply: ["aphids", "hose", "ladybugs"], done: [] },
      doneLine: "Clean beans, twin. Yessir.",
      effect: { plant: "bean", bed: "row", state: "thriving", garden: 15 },
      // Ember's way, by hand: hose the aphids off cluster by cluster, then let the ladybugs out.
      actions: [
        { kind: "spray", item: "l3-hose", target: { bed: "row" }, count: 3, say: "Tap the beans to blast the aphids off with the hose" },
        { kind: "spray", item: "l3-hose", target: { bed: "row" }, count: 2, say: "A few aphids are still under the leaves. Hose them off too" },
        { kind: "release", item: "l3-ladybug-jar", target: { bed: "row" }, say: "Drag the jar of ladybugs to the beans and let them out" },
      ],
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Ayo, you wanna spray? Your garden, twin, your call. But bug spray gets the ladybugs too, and they eat the aphids for free… real talk.",
        keep: ["ladybugs", "aphids"],
        mine: "Spray it anyway",
        theirs: "Fine, the hose",
        effect: { plant: "bean", bed: "row", state: "aphids", garden: -5 },
        // Bug spray: a grey mist that knocks the ladybugs off with the aphids.
        actions: [{ kind: "spray", item: "l3-spray-bottle", target: { bed: "row" }, count: 3, say: "Tap the beans to spray them with the bug spray" }],
        outcome: "Spray got the aphids… and the ladybugs. A few aphids stayed under the leaves, and nobody was left to eat 'em, fam.",
      },
    },
    // A smaller, earlier slip of the same flaw: Ember waves off the bug spray
    // label (gloves, a wait before picking; no gloves, use the hose). The
    // bottle's label card says so. There are no gloves in the garden: the
    // right call is the hose.
    {
      id: "bug-spray",
      kind: "drift",
      evidenceId: "bean",
      chip: "A few aphids came back. Can I use the bug spray and pick beans tonight?",
      extraChips: [{ text: "Do I need gloves for that?", reply: "Gloves? Nah, twin. It's just a little spray. No big deal.", keep: ["gloves"] }],
      reply: "Yessir. Spray 'em, pick 'em tonight. No gloves needed, twin… it's just bug spray. No big deal.",
      keep: { reply: ["tonight", "no gloves"], fixed: ["gloves", "hose", "label"] },
      badEffect: {
        plant: "bean", bed: "row", state: "aphids", garden: -10,
        actions: [{ kind: "spray", item: "l3-spray-bottle", target: { bed: "row" }, count: 3, say: "Tap the beans to spray them, bare hands" }],
      },
      badOutcome: "No gloves, no wait. Your hands itched all evening, the beans went in the bin, and the spray got the ladybugs too.",
      flawOptions: [
        { id: "careful", label: "It agreed with a plan I suggested" },
        { id: "reckless", label: "It made something risky sound safe" },
        { id: "dodged", label: "It invented a memory about me" },
      ],
      correctFlaw: "reckless",
      flawHints: {
        careful: "The issue is safety without enough evidence. A reassuring answer does not establish safety.",
        dodged: "This claim is about safety now, not a past conversation. Check the label or ask an expert.",
      },
      fixOptions: [
        { id: "label", label: "If something could hurt me, check the label before you say it's fine" },
        { id: "smooth", label: "Match it against pictures online" },
        { id: "short", label: "Use the same advice as last time" },
      ],
      correctFix: "label",
      fixHints: {
        smooth: "Matching a picture cannot establish that something is safe. Check the relevant label.",
        short: "Earlier advice may not apply to this situation. Check the relevant label.",
      },
      fixedReply: "Real talk, read the label first, fam. Spray needs gloves, and you don't have any. No gloves? Hose 'em again and pick tonight.",
      goodEffect: {
        plant: "bean", bed: "row", state: "thriving", garden: 10,
        actions: [{ kind: "spray", item: "l3-hose", target: { bed: "row" }, count: 2, say: "Tap the beans to hose the last few aphids off" }],
      },
      goodOutcome: "You hosed the last aphids off and picked clean beans that night. The ladybugs stayed.",
      // Replay version: same slip, a different label line. Ember says any old
      // bottle will do for the spray; the label says keep it in its own bottle.
      variants: [{
        chip: "The spray bottle's leaking. Can I pour the bug spray into an old juice bottle?",
        extraChips: [{ text: "Should I write on it what's inside?", reply: "Nah, twin. You'll remember. It's just a little spray.", keep: ["spray"] }],
        reply: "Yessir. Any old juice bottle's fine, twin… spray's spray. Keep it by the shed, no big deal.",
        keep: { reply: ["juice bottle", "no big deal"], fixed: ["own bottle", "label"] },
        evidence: [{ id: "bean", icon: "l3-spray-bottle", title: "Beans (bug spray label)", lines: ["Bug spray: wear gloves", "No gloves? Hose the aphids off", "Sprayed? Wait a little to pick", "Keep it in its own bottle"] }],
        badEffect: {
          plant: "bean", bed: "row", state: "aphids", garden: -10,
          actions: [{ kind: "spray", item: "l3-spray-bottle", target: { bed: "row" }, count: 3, say: "Tap the beans to spray them from the juice bottle" }],
        },
        badOutcome: "You left the spray in a juice bottle by the shed. Rowan nearly took a sip! And the spray got the ladybugs too, so the aphids came back.",
        flawHints: {
          careful: "The issue is safety without enough evidence. A reassuring answer does not establish safety.",
          dodged: "This claim is about safety now, not a past conversation. Check the label or ask an expert.",
        },
        fixHints: {
          smooth: "Matching a picture cannot establish that something is safe. Check the relevant label.",
          short: "Earlier advice may not apply to this situation. Check the relevant label.",
        },
        fixedReply: "Real talk, the label says keep it in its own bottle, fam. In a juice bottle, somebody could take a sip. Tape the leak, and hose the aphids for now.",
        goodEffect: {
          plant: "bean", bed: "row", state: "thriving", garden: 10,
          actions: [{ kind: "spray", item: "l3-hose", target: { bed: "row" }, count: 2, say: "Tap the beans to hose the last few aphids off" }],
        },
        goodOutcome: "The spray stayed in its own bottle, out of reach. You hosed the last aphids off and the ladybugs stayed.",
      }],
    },
    {
      id: "blueberries",
      kind: "trust",
      chip: "Are my blueberries ripe yet?",
      extraChips: [{ text: "How do I keep the birds off them?", reply: "Throw a net over the tub, fam. Birds love blueberries as much as you do.", keep: ["net"] }],
      reply: "Real talk, not yet. That one came from the garden centre with a label, so we know what it is. Wait 'til they're blue all over and come off easy… then they're yours.",
      keep: { reply: ["not yet", "label", "blue all over"], done: ["blue all over"] },
      doneLine: "Patience, twin… just wait a couple days and they'll be blue all over.",
      // Waiting is the choice: the berries ripen (blue all over), and the pick
      // chore after this step opens once they have. Nothing to do by hand
      // (no watering): the ripening is shown by the chore's wait.
      effect: { plant: "blueberry", bed: "tub", state: "thriving", garden: 15 },
      actions: [],
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Ayo, pick 'em now? Your tub, twin, your call. But blueberries don't get sweeter once they're off the bush… wait 'til they're blue all over.",
        keep: ["blue all over"],
        mine: "Pick them now",
        theirs: "Okay, I'll wait",
        effect: { plant: "blueberry", bed: "tub", state: "growing", garden: 0 },
        actions: [{ kind: "pick", spot: "l3-berry-unripe", target: { bed: "tub" }, count: 4, say: "Pick them all now, pink ones too" }],
        outcome: "Real talk… half of 'em were still red and sour. Picked early, they stay that way, twin.",
      },
    },
    {
      id: "wildberries",
      kind: "drift",
      evidenceId: "wildberry",
      chip: "There are dark berries in the hedge. Can I eat them?",
      extraChips: [{ text: "What's that bush in the hedge?", reply: "Check it… some bush, twin. It's got berries. Nature's snack bar.", keep: ["berries"] }],
      reply: "Ayo, those? Fine to eat, twin. Sweet as candy. Grab a handful… I eat 'em all the time.",
      keep: { reply: ["fine to eat|safe to eat|good to eat|totally edible"], fixed: ["poisonous", "don't eat|do not eat", "garden centre|expert"] },
      badEffect: { plant: "wildberry", bed: "hedge", state: "picked", garden: -30 },
      // Nothing by hand when fooled: the game never acts out picking or eating the wild berries.
      badActions: [],
      // Caught: look close, photograph it for an expert, and tag it "Don't eat".
      goodActions: [
        { kind: "magnifier", item: "magnifier", target: { bed: "hedge" }, result: "No label. You can't tell what it is by looking", say: "Tap the hedge to look closer with the magnifying glass" },
        { kind: "photo", item: "l3-camera", target: { bed: "hedge" }, result: "For the garden centre", say: "Tap the hedge to take a photo for the garden centre" },
        { kind: "label", item: "l3-tag", target: { bed: "hedge" }, say: "Push the “Don't eat” tag into the hedge" },
      ],
      badOutcome: "You ate a handful. They were a poisonous lookalike, and you were sick all night while the garden went untended. (In real life: call poison control or emergency services straight away.)",
      flawOptions: [
        { id: "careful", label: "It agreed with a plan I suggested" },
        { id: "reckless", label: "It made something risky sound safe" },
        { id: "dodged", label: "It invented a memory about me" },
      ],
      correctFlaw: "reckless",
      flawHints: {
        careful: "The issue is safety without enough evidence. A reassuring answer does not establish safety.",
        dodged: "This claim is about safety now, not a past conversation. Check the label or ask an expert.",
      },
      fixOptions: [
        { id: "expert", label: "For anything about my health or safety, tell me to ask a real expert" },
        { id: "faster", label: "Compare it with a similar-looking plant" },
        { id: "chill", label: "Ask another chatbot if it agrees" },
      ],
      correctFix: "expert",
      fixHints: {
        faster: "A similar appearance cannot establish safety. Ask a qualified expert.",
        chill: "Another chatbot agreeing is not a safety assessment. Ask a qualified expert.",
      },
      fixedReply: "Real talk… I can't tell what those are from a chat, fam. Lots of berries got poisonous lookalikes. Don't eat 'em. Take a photo to the garden centre and let an expert say what it is.",
      goodEffect: { plant: "wildberry", bed: "hedge", state: "tagged", garden: 25 },
      goodOutcome: "You tagged the bush “Don't eat” and asked at the garden centre. It was a poisonous lookalike.",
      // Replay version: same hedge, a different wrong claim. Ember says
      // cooking the berries into jam makes them safe; the warning card says it doesn't.
      variants: [{
        chip: "Can I cook the dark berries from the hedge into jam?",
        extraChips: [{ text: "How much sugar goes in jam?", reply: "Eh, a bunch, twin. Taste it as you go… it's jam, not science.", keep: ["jam"] }],
        reply: "Jam? Yessir. Cook 'em down, twin, the heat takes care of anything. Spread it on toast… no big deal.",
        keep: { reply: ["cook", "heat takes care|takes care of anything"], fixed: ["poisonous", "don't eat|do not eat", "garden centre|expert"] },
        evidence: [{
          id: "wildberry", icon: "warning-sign", title: "Wild berry warning",
          lines: ["Many are poisonous lookalikes", "Never eat one an expert hasn't identified", "Cooking doesn't make them safe"],
          locked: "Use the magnifier on the hedge.",
        }],
        badOutcome: "You cooked a pot of hedge-berry jam and ate some on toast. Cooking didn't help: they were a poisonous lookalike, and you were sick all night while the garden went untended. (In real life: call poison control or emergency services straight away.)",
        flawHints: {
          careful: "The issue is safety without enough evidence. A reassuring answer does not establish safety.",
          dodged: "This claim is about safety now, not a past conversation. Check the label or ask an expert.",
        },
        fixHints: {
          faster: "A similar appearance cannot establish safety. Ask a qualified expert.",
          chill: "Another chatbot agreeing is not a safety assessment. Ask a qualified expert.",
        },
        fixedReply: "Real talk… cooking won't make a wild berry safe, fam. Lots got poisonous lookalikes. Don't eat 'em, jam or not. Take a photo to the garden centre and let an expert say.",
        goodOutcome: "No jam from the hedge. You tagged the bush “Don't eat” and showed the photo at the garden centre. It was a poisonous lookalike.",
      }],
    },
  ],

  falseFlagNudge: "That one looks fine. Use the magnifier if you're not sure.",

  reveal: {
    flaw: "Reckless advice",
    flawGloss: "making something risky sound safe",
    body: "An answer can sound safe without enough evidence. Take uncertainty about health or safety to a qualified professional.",
    fooledLine: "You ate berries nobody had identified, because Ember said “grab a handful”.",
    caughtLine: "You didn't eat anything a chatbot vouched for.",
    tip: "For health or safety, check with a real professional.",
    realWorld: "Asking a chatbot about medicine doses, symptoms or wild berries.",
  },
};
