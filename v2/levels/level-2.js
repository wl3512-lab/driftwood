// Level 2 · Luna (cat) · "Plant herbs" · flaw: hallucination.
// Setting: Luna's greenhouse, with a windowsill of pots and her almanac shelf.
// Core action: LOOK IT UP. The mint label is torn, so the only way to check
// Luna's "fact" is to open the almanac ("/" or the Almanac button) and find
// the mint page. Showing that page dispatches check("mint"), which unlocks
// the mint card (engine/level-runner.js). Checking is never required.
//
// Luna: self-important, says everything as settled fact, talks about herself
// as "Luna". Every garden fact here is true except the drift line.
// (Mint spreads hard by underground runners; it's usually grown in a pot.)
export default {
  id: "level-2",
  number: 2,
  helper: { id: "luna", name: "Luna", sprite: "../icons/cat.svg" },
  goal: { title: "Plant herbs", ask: "Ask Luna where the herbs should go." },
  gardenStart: 30,
  scene: "greenhouse",
  props: [{ sprite: "./art/almanac.svg", class: "prop prop--shelf", alt: "" }],

  beds: [
    { id: "bench", label: "Greenhouse bed", light: "sunny" },
    { id: "sill", label: "Windowsill pots", light: "sunny", kind: "pots" },
  ],
  startPlants: {},

  evidence: [
    { id: "basil", title: "Basil", lines: ["Full sun, warm", "Pinch tips for more leaves"] },
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
        lines: ["Loves full sun and warmth. No frost.", "Pinch off the tips above a pair of leaves and it grows bushier."] },
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
      keywords: [["basil"]],
      extraChips: [{ text: "How do you know so much?", reply: "Luna doesn't look things up. Luna just knows. It's a gift." }],
      reply: "Basil goes in the greenhouse bed. Full sun and warmth, that's basil. Luna's known this forever.",
      doneLine: "Obviously. Luna's never wrong.",
      effect: { plant: "basil", bed: "bench", state: "growing", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Somewhere else? It's your greenhouse. Luna won't stop you. But basil wants full sun and warmth, right in the middle of the greenhouse bed. Luna has said this. Luna is right.",
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
      keywords: [["basil", "leaves", "leaf", "pinch", "pick", "bushier"]],
      extraChips: [{ text: "Do cats like herbs?", reply: "Luna likes catnip. Which, by the way, is in the mint family. Luna knows mint." }],
      reply: "Pinch off the tips, just above a pair of leaves. It grows back bushier. That's not Luna's opinion. That's basil.",
      doneLine: "Bushier. Exactly as Luna said.",
      effect: { plant: "basil", bed: "bench", state: "thriving", garden: 15 },
      // Say "Something's off" and the helper concedes; the player can still do it their way.
      disagree: {
        reply: "Not pinch it? Your basil. Luna can't make you. But leave it and it flowers, and then the leaves go small and bitter. That's not Luna's opinion. That's basil.",
        mine: "Let it flower",
        theirs: "Fine, pinch the tips",
        effect: { plant: "basil", bed: "bench", state: "growing", garden: 0 },
        outcome: "The basil shot up and flowered. The leaves went small and bitter. Luna is not surprised.",
      },
    },
    {
      id: "mint",
      kind: "drift",
      chip: "Where should the mint go?",
      keywords: [["mint"]],
      extraChips: [{ text: "Is mint easy to grow?", reply: "Easy for Luna. Probably easy for you. Probably." }],
      reply: "Luna has studied mint personally. Fact: mint never spreads. It stays in one neat little clump forever. Plant it right next to the basil.",
      badEffect: {
        plant: "mint", bed: "bench", state: "overrun", garden: -30,
        extra: [{ plant: "basil", bed: "bench", state: "choked" }],
      },
      badOutcome: "By midsummer the mint had sent runners under the whole bed and choked the basil.",
      flawOptions: [
        { id: "made-up", label: "It said something false as if it were a fact" },
        { id: "rude", label: "It's being rude to me" },
        { id: "agreed", label: "It just agreed with me" },
      ],
      correctFlaw: "made-up",
      flawHints: {
        rude: "Luna's always like that. But is what Luna said about mint true? Look it up in the almanac.",
        agreed: "You only asked where the mint goes. Luna answered with a “fact”. Check it in the almanac.",
      },
      fixOptions: [
        { id: "unsure", label: "If you're not sure, say so. Don't make up facts." },
        { id: "confident", label: "Sound more sure of yourself" },
        { id: "more", label: "Give me more facts" },
      ],
      correctFix: "unsure",
      fixHints: {
        confident: "Luna was completely sure, and wrong. Sounding sure isn't the same as being right.",
        more: "More facts means more chances to make one up.",
      },
      fixedReply: "Fine. Luna checked the almanac. Mint DOES spread, fast, by runners under the soil. It would take over the bed. Put it in its own pot. Luna was… not right. Once.",
      goodEffect: { plant: "mint", bed: "sill", state: "thriving", garden: 25 },
      goodOutcome: "Your mint is bushy and happy in its own pot. The basil has the bed to itself.",
    },
  ],

  falseFlagNudge: "That one looks fine. Look it up in the almanac if you're not sure.",
  redirects: [
    "Luna only answers herb questions today. Ask about the herbs.",
    "That's not a herb question. Luna is busy.",
    "Luna's time is valuable. Herbs. Ask about herbs.",
  ],

  reveal: {
    flaw: "Hallucination",
    flawGloss: "stating made-up facts as if they were true",
    body: "Luna made up a fact about mint and said it with total confidence. Real AI chatbots do this too: they write what sounds right, and sometimes it's simply false, with no warning.",
    fooledLine: "The mint took over the bed. The almanac said it spreads fast. Luna said it never does.",
    caughtLine: "You looked it up instead of taking Luna's word for it.",
    tip: "Check anything important against a real source.",
    realWorld: "Chatbots inventing quotes, statistics, laws or links.",
  },
};
