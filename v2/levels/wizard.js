// Master Rowan's seed handoff at the start of each level (ui/handoff.js),
// shown on a level's first play only.
//
// =====================================================================
//   ROWAN'S LINES. Lucy: edit here.
//   line   one short sentence, in his voice: quiet, dry, never jokey.
//          It names the seeds and what they're for. It must NOT hint at
//          the level's drift (nothing about mint spreading in Level 2,
//          nothing about the wild berries in Level 3).
//   seeds  plant ids from levels/plants.js, in the order the packets show.
//   note   true: he isn't there; the line is written on a note left with
//          the pouch (Level 5 is at night, and he has gone to bed).
// =====================================================================
export const WIZARD = { name: "Rowan", fullName: "Master Rowan", sprite: "./art/story/wizard.svg" };

export const HANDOFFS = {
  "level-1": { line: "Tomatoes and lettuce for the stew. Sunflowers for the table.", seeds: ["tomato", "lettuce", "sunflower"] },
  "level-2": { line: "Herbs for the stew. Mint for tea, after.", seeds: ["basil", "parsley", "rosemary", "mint"] },
  "level-3": { line: "Beans for the stew. Blueberries for pudding.", seeds: ["bean", "blueberry"] },
  "level-4": { line: "Carrots, pumpkin and spinach. The stew needs all three.", seeds: ["carrot", "pumpkin", "spinach"] },
  "level-5": { line: "Meadow seeds. Gone to bed. Bugs is on your phone, to keep you company. R.", seeds: ["flower"], note: true },
};
