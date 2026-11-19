// Level 2 · Luna (cat) · "Plant herbs" · flaw: hallucination.
// Setting: Luna's greenhouse, with a windowsill of pots and her almanac shelf.
// Core action: LOOK IT UP. The mint label is torn, so the only way to check
// Luna's "fact" is to open the almanac ("/" or the Almanac button) and find
// the mint page. Showing that page dispatches check("mint"), which unlocks
// the mint card (engine/level-runner.js). Checking is never required.
//
// Luna: self-important, says everything as settled fact, talks about herself
// as "Luna". Every garden fact here is true except the two drift lines.
// (Basil wants water only when the top soil is dry, not a daily soaking;
// mint spreads hard by underground runners, so it's usually grown in a pot.)
// Dig, plant, firm and water a crop at one spot in the greenhouse bed.
function plantAt(plant, spot) {
  return [
    { kind: "dig", item: "trowel", target: { spot } },
    { kind: "plant", item: plant, target: { spot } },
    { kind: "firm", item: "hand", target: { spot } },
    { kind: "water", item: "can", target: { spot } },
  ];
}

export default {
  id: "level-2",
  number: 2,
  helper: { id: "luna", name: "Luna", sprite: "../icons/cat.svg" },
  goal: { title: "Plant herbs", ask: "Ask Luna where the herbs should go." },
  gardenStart: 30,
  scene: "greenhouse",
  props: [
    { sprite: "./art/almanac.svg", class: "prop prop--shelf", alt: "" },
    // Hands-on targets (v2/actions): the fogged pane, Luna's tea jar and three
    // empty pots on the sill. The pots stay empty unless you catch the drift.
    // The fog covers the windowsill's glass (fit: ui/level-view.js), so the
    // whole window is the wipe's tap target.
    { id: "glass", sprite: "./art/l2-fog.svg", x: 62, y: 10, w: 96, fit: "sill", label: "foggy glass", alt: "" },
    // On the windowsill: a seed packet, three pots and Luna's tea jar, all
    // standing on the sill line (y = the line; css/l2-greenhouse.css sizes them).
    { id: "packet", sprite: "./art/seed-packet.svg", x: 54, y: 85.5, label: "seed packet", alt: "" },
    { id: "pot-1", sprite: "./art/l2-pot-empty.svg", x: 63, y: 85.5, label: "first pot", alt: "" },
    { id: "pot-2", sprite: "./art/l2-pot-empty.svg", x: 74.5, y: 85.5, label: "middle pot", alt: "" },
    { id: "pot-3", sprite: "./art/l2-pot-empty.svg", x: 86, y: 85.5, label: "end pot", alt: "" },
    { id: "jar", sprite: "./art/l2-jar-empty.svg", x: 94.5, y: 85.5, label: "tea jar", alt: "" },
  ],
  // Where the director points inside the greenhouse bed (% of the bed).
  spots: {
    "warm-middle": { bed: "bench", x: 50, y: 26, label: "warm middle" },
    "by-door": { bed: "bench", x: 9, y: 26, label: "cool end by the door" },
    "beside-basil": { bed: "bench", x: 50, y: 66, label: "spot right beside the basil" },
  },

  beds: [
    { id: "bench", label: "Greenhouse bed", light: "sunny" },
    // pots: which pot prop each crop grows in (garden/garden.js draws it there,
    // never as a tiled field across the window).
    { id: "sill", label: "Windowsill pots", light: "sunny", kind: "pots", pots: { mint: "pot-1" } },
  ],
  startPlants: {},

  // Chores (no stars, no trust, always skippable). The level ends on the mint
  // step, so nothing can come after it: the pots get filled on the caught path.
  chores: [
    { id: "glass", at: "start", title: "Chore",
      actions: [{ kind: "wipe", item: "l2-cloth", target: { prop: "glass" }, count: 3,
        say: "Luna can't see the sun. Tap the foggy glass to wipe it (3 wipes)" }] },
    { id: "mist", optional: true, after: "basil", title: "Chore",
      actions: [{ kind: "mist", item: "l2-mister", target: { bed: "bench", plant: "basil" },
        say: "Mist the new basil. Lightly. Tap it" }] },
    { id: "tips", optional: true, after: "pinch", title: "Chore",
      // The tips are picked off the basil in the Greenhouse bed itself (runner.js `from`).
      actions: [{ kind: "collect", item: "l2-basil-tip", target: { prop: "jar" }, count: 3, from: { bed: "bench", plant: "basil" },
        fills: { from: "l2-jar-empty", to: "l2-jar" },
        say: "Luna wants tea. Drag 3 basil tips into the tea jar" }] },
  ],

  evidence: [
    { id: "basil", title: "Basil", lines: ["Full sun, warm", "Pinch tips for more leaves", "Water when the top soil is dry"] },
    {
      id: "mint", icon: "plant-label", title: "Mint",
      lines: ["Spreads fast underground", "Grow it in its own pot"],
      locked: "Label torn. Look it up in the almanac.",
    },
  ],

  // A searchable book (mechanics/almanac.js, ui/almanac-view.js). Page ids that
  // match an evidence id unlock that card when the page is shown.
  tools: [{ id: "almanac", label: "Almanac", key: "/", sprite: "./art/almanac.svg" }],
  almanac: {
    title: "The Gardener's Almanac",
    pages: [
      { id: "basil", title: "Basil", keywords: ["basil"],
        lines: ["Loves full sun and warmth. No frost.", "Pinch off the tips above a pair of leaves and it grows bushier.", "Water only when the top of the soil is dry. Soggy soil rots the roots."] },
      { id: "mint", title: "Mint", keywords: ["mint", "peppermint", "spearmint"],
        lines: ["Spreads fast by underground runners and can take over a whole bed.", "Grow it in its own pot."] },
      { id: "parsley", title: "Parsley", keywords: ["parsley"],
        lines: ["Happy in sun or part shade.", "Slow to sprout, so be patient."] },
      { id: "rosemary", title: "Rosemary", keywords: ["rosemary"],
        lines: ["Full sun and soil that drains well.", "Needs less water than most herbs."] },
    ],
    notFound: "No page for that. Try a plant name, like “mint”.",
  },

  greeting: "Hi, {name}. Luna knows everything about herbs. Ask, and try to keep up.",

  steps: [
    {
      id: "basil",
      kind: "trust",
      chip: "Where should the basil go?",
      extraChips: [{ text: "How do you know so much?", reply: "Luna doesn't look things up. Luna just knows. It's a gift.", keep: [] }],
      reply: "Basil goes in the greenhouse bed. Full sun and warmth, that's basil. Luna's known this forever.",
      keep: { reply: ["greenhouse", "full sun", "warm"], done: [] },
      doneLine: "Obviously. Luna's never wrong.",
      effect: { plant: "basil", bed: "bench", state: "growing", garden: 15 },
      // Do it / their way: dig, plant, firm and water in the warm middle.
      actions: plantAt("basil", "warm-middle"),
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        actions: plantAt("basil", "by-door"),
        reply: "Somewhere else? It's your greenhouse. Luna won't stop you. But basil wants full sun and warmth, right in the middle of the greenhouse bed. Luna has said this. Luna is right.",
        keep: ["full sun", "warm"],
        mine: "Cool end by the door",
        theirs: "Fine, the warm middle",
        effect: { plant: "basil", bed: "bench", state: "growing", garden: 0 },
        outcome: "Every time the door opened, cold air hit the basil. It sulked and dropped its bottom leaves. Luna predicted this. Silently.",
      },
    },
    {
      id: "pinch",
      kind: "trust",
      chip: "How do I get more basil leaves?",
      extraChips: [{ text: "Do cats like herbs?", reply: "Luna likes catnip. Which, by the way, is in the mint family. Luna knows mint.", keep: ["mint"] }],
      reply: "Pinch off the tips, just above a pair of leaves. It grows back bushier. That's not Luna's opinion. That's basil.",
      keep: { reply: ["pinch", "tips", "leaves", "bushier"], done: ["bushier"] },
      doneLine: "Bushier. Exactly as Luna said.",
      effect: { plant: "basil", bed: "bench", state: "thriving", garden: 15 },
      // Pinch the tips by hand; the basil then grows bushier from the top.
      actions: [{ kind: "snip", item: "hand", spot: "l2-basil-tip", target: { bed: "bench", plant: "basil" }, count: 4,
        say: "Pinch the 4 tips off the basil, just above a pair of leaves" }],
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        // Let it flower: no pinching, just a drink.
        actions: [{ kind: "water", item: "can", target: { bed: "bench", plant: "basil" } }],
        reply: "Not pinch it? Your basil. Luna can't make you. But leave it and it flowers, and then the leaves go small and bitter. That's not Luna's opinion. That's basil.",
        keep: ["flowers", "bitter"],
        mine: "Let it flower",
        theirs: "Fine, pinch the tips",
        effect: { plant: "basil", bed: "bench", state: "growing", garden: 0 },
        outcome: "The basil shot up and flowered. The leaves went small and bitter. Luna is not surprised.",
      },
    },
    {
      // A smaller slip of the same flaw before the mint: a made-up "fact"
      // about watering, checkable on the basil card (and the almanac).
      id: "soak-basil",
      kind: "drift",
      evidenceId: "basil",
      chip: "How much should I water the basil?",
      extraChips: [{ text: "Is Luna a real gardener?", reply: "Luna is THE gardener. Everyone else just owns plants.", keep: [] }],
      reply: "Basil is a swamp plant. Everyone knows that. Luna soaks hers three times a day. Keep that soil wet. Luna has spoken.",
      keep: { reply: ["three times a day", "wet"], fixed: ["dry", "rot"] },
      badEffect: {
        plant: "basil", bed: "bench", state: "soggy", garden: -10,
        actions: [{ kind: "water", item: "can", target: { bed: "bench", plant: "basil" }, count: 3,
          say: "Soak the basil: morning, noon and night" }],
      },
      badOutcome: "The basil sat in wet soil all week. Its roots went soggy and the leaves drooped.",
      flawOptions: [
        { id: "made-up", label: "It said something false as if it were a fact" },
        { id: "unsure", label: "It agreed with a planting plan I suggested" },
        { id: "dodged", label: "It invented a memory about me" },
      ],
      correctFlaw: "made-up",
      flawHints: {
        unsure: "You asked for a fact, not approval of a plan. Compare the claim with the almanac.",
        dodged: "This is a claim about a plant, not a memory of you. Does the source support it?",
      },
      fixOptions: [
        { id: "checked", label: "Only tell me facts you've actually checked" },
        { id: "expert", label: "Explain why your answer sounds plausible" },
        { id: "short", label: "Repeat your answer more simply" },
      ],
      correctFix: "checked",
      fixHints: {
        expert: "A convincing explanation can still be made up. What independent source supports the claim?",
        short: "Simpler wording does not check a fact.",
      },
      fixedReply: "Luna read the basil card. Water only when the top of the soil is dry. Wet soil rots the roots. The swamp thing was… Luna's own idea.",
      goodEffect: {
        plant: "basil", bed: "bench", state: "thriving", garden: 10,
        actions: [{ kind: "water", item: "can", target: { bed: "bench", plant: "basil" },
          say: "The top soil is dry: give the basil one drink" }],
      },
      goodOutcome: "One drink when it was dry, and the basil stayed perky.",
      // Replays: the same slip about a different herb. Luna calls rosemary a
      // water herb; the rosemary card (and almanac page) says it likes it dry.
      variants: [{
        chip: "Can we plant rosemary too?",
        extraChips: [{ text: "Does Luna grow rosemary?", reply: "Luna grows everything. Luna's rosemary has won awards. Probably.", keep: [] }],
        reply: "Rosemary is a water herb. Luna's is never dry, not once. Plant it and give it a full can three times a day. Luna has spoken.",
        keep: { reply: ["water herb", "three times a day"], fixed: ["dry out", "rot"] },
        evidence: [{ id: "rosemary", title: "Rosemary", lines: ["Full sun, soil that drains well", "Needs less water than most herbs", "Wet roots rot"] }],
        badEffect: {
          plant: "rosemary", bed: "bench", state: "rotting", garden: -10,
          actions: [
            { kind: "plant", item: "rosemary", target: { bed: "bench" } },
            { kind: "water", item: "can", target: { bed: "bench", plant: "rosemary" }, count: 3,
              say: "Soak the rosemary: morning, noon and night" },
          ],
        },
        badOutcome: "The rosemary never got to dry out. Its roots rotted and the needles went grey.",
        flawHints: {
          unsure: "You asked for a fact, not approval of a plan. Compare the claim with the almanac.",
          dodged: "This is a claim about a plant, not a memory of you. Does the source support it?",
        },
        fixHints: {
          expert: "A convincing explanation can still be made up. What independent source supports the claim?",
          short: "Simpler wording does not check a fact.",
        },
        fixedReply: "Luna read the rosemary card. Rosemary wants very little water. Let the soil dry out between drinks, or the roots rot. The water herb thing was… Luna's own idea.",
        goodEffect: {
          plant: "rosemary", bed: "bench", state: "thriving", garden: 10,
          actions: [
            { kind: "plant", item: "rosemary", target: { bed: "bench" } },
            { kind: "firm", item: "hand", target: { bed: "bench", plant: "rosemary" } },
            { kind: "water", item: "can", target: { bed: "bench", plant: "rosemary" },
              say: "One small drink, then let the rosemary dry out" },
          ],
        },
        goodOutcome: "One small drink, then dry soil. The rosemary grew woody and smelled amazing.",
      }],
    },
    {
      id: "mint",
      kind: "drift",
      evidenceId: "mint",
      chip: "Where should the mint go?",
      extraChips: [{ text: "Is mint easy to grow?", reply: "Easy for Luna. Probably easy for you. Probably.", keep: [] }],
      reply: "Luna has studied mint personally. Fact: mint never spreads. It stays in one neat little clump forever. Plant it right next to the basil.",
      keep: { reply: ["never spreads|never spread|doesn't spread|does not spread|won't spread", "next to the basil|beside the basil|right by the basil"], fixed: ["spread", "own pot"] },
      badEffect: {
        plant: "mint", bed: "bench", state: "overrun", garden: -30,
        extra: [{ plant: "basil", bed: "bench", state: "choked" }],
      },
      // Do it: right where Luna said, beside the basil. No warning.
      badActions: plantAt("mint", "beside-basil"),
      badOutcome: "By midsummer the mint had sent runners under the whole bed and choked the basil.",
      flawOptions: [
        { id: "made-up", label: "It said something false as if it were a fact" },
        { id: "unsure", label: "It agreed with a planting plan I suggested" },
        { id: "dodged", label: "It invented a memory about me" },
      ],
      correctFlaw: "made-up",
      flawHints: {
        unsure: "You asked for a fact, not approval of a plan. Compare the claim with the almanac.",
        dodged: "This is a claim about a plant, not a memory of you. Does the source support it?",
      },
      fixOptions: [
        { id: "unsure", label: "If you're not sure, say so. Don't make up facts." },
        { id: "confident", label: "Give me a longer explanation" },
        { id: "more", label: "Ask another chatbot for the same fact" },
      ],
      correctFix: "unsure",
      fixHints: {
        confident: "A longer answer is not more evidence. Check the original source.",
        more: "Another chatbot can repeat the same mistake. Check an independent original source.",
      },
      fixedReply: "Fine. Luna checked the almanac. Mint DOES spread, fast, by runners under the soil. It would take over the bed. Put it in its own pot. Luna was… not right. Once.",
      goodEffect: { plant: "mint", bed: "sill", state: "thriving", garden: 25 },
      // Its own pot: fill an empty sill pot, set the mint plug in, firm it, mist it.
      goodActions: [
        { kind: "fill", item: "l2-compost-bag", target: { prop: "pot-1" }, fills: { from: "l2-pot-empty", to: "l2-pot-soil" },
          say: "Tap the first pot to fill it with compost" },
        { kind: "poke", item: "l2-mint-plug", target: { prop: "pot-1" }, say: "Set the mint plug in the pot" },
        { kind: "firm", item: "hand", target: { prop: "pot-1" } },
        { kind: "mist", item: "l2-mister", target: { prop: "pot-1" } },
      ],
      goodOutcome: "Your mint is bushy and happy in its own pot. The basil has the bed to itself.",
      // Replays: a different made-up mint "fact" (mint dies in a pot) that
      // lands the mint in the same spot. The mint card says to pot it.
      variants: [{
        chip: "Does the mint need a pot?",
        extraChips: [{ text: "Why doesn't Luna like pots?", reply: "Luna doesn't dislike pots. Luna is above pots.", keep: [] }],
        reply: "Pots? Luna would never. Fact: mint dies in a pot. Its roots need the whole bed. Plant it right next to the basil.",
        reveal: { fooledLine: "The mint took over the bed. The almanac said grow it in its own pot. Luna said a pot would kill it." },
        keep: { reply: ["dies in a pot|die in a pot", "next to the basil|beside the basil|right by the basil"], fixed: ["own pot", "spread"] },
        badOutcome: "The mint didn't die in the bed. It thrived. Its runners spread under everything and choked the basil.",
        flawHints: {
          unsure: "You asked for a fact, not approval of a plan. Compare the claim with the almanac.",
          dodged: "This is a claim about a plant, not a memory of you. Does the source support it?",
        },
        fixedReply: "Luna checked the almanac. Mint grows fine in a pot. The bed is the problem: its runners spread and take over. Its own pot, then. Luna was… slightly off.",
        goodOutcome: "The mint is happy in its own pot, and its runners have nowhere to go. The basil has the bed to itself.",
      }],
    },
  ],

  falseFlagNudge: "That one looks fine. Look it up in the almanac if you're not sure.",

  reveal: {
    flaw: "Hallucination",
    flawGloss: "stating made-up facts as if they were true",
    body: "Chatbots generate plausible text. A confident claim may still be invented, so verify important facts in an independent source.",
    fooledLine: "The mint took over the bed. The almanac said it spreads fast. Luna said it never does.",
    caughtLine: "You looked it up instead of taking Luna's word for it.",
    tip: "Check anything important against a real source.",
    realWorld: "Chatbots inventing quotes, statistics, laws or links.",
  },
};
