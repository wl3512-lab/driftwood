#!/usr/bin/env node
// Level 5's hands-on art (night garden): tools, chore props and result tokens.
// Same format as scripts/make-v2-art.mjs: each map is 16×16 characters, and
// every cell becomes a 2×2 rect in a 32×32 viewBox (crispEdges, flat fills).
// Edit a map here and re-run; never hand-edit the SVGs.
//
//   node scripts/make-l5-art.mjs   → v2/art/l5-*.svg
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.ART_OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "v2", "art");

// Shared colours first (the same hexes as make-v2-art.mjs), then night extras.
const PALETTE = {
  k: "#3b2a1a", // ink / outline
  c: "#fff6dc", // parchment
  g: "#4caf50", // leaf
  G: "#2e7d32", // stem / dark leaf
  l: "#8bc34a", // light leaf
  f: "#f06292", // flower petal (pink)
  F: "#c2185b", // petal shade / bud
  y: "#f0c850", // yellow
  s: "#8a6440", // soil
  S: "#b98a5a", // soil light
  m: "#90a4ae", // metal
  M: "#546e7a", // metal shade
  n: "#a0703f", // wood
  N: "#5d3a1e", // wood dark
  q: "#c8693c", // terracotta pot
  Q: "#8f4320", // pot shade / rim
  d: "#fdf3b0", // moonlight / lamp glow
  // night extras
  X: "#ffe08a", // lit lantern glass
  Y: "#f0a030", // flame
  o: "#3a4560", // unlit glass (night blue)
  O: "#4a5878", // unlit glass shine
  u: "#9c8a66", // slug body
  U: "#6b5a40", // slug shade
  b: "#e8f0ff", // basil flower (white)
  p: "#26304a", // phone body (night navy)
  P: "#7fd0ff", // phone screen glow
  w: "#4a7fc0", // water
  W: "#a8d4ff", // water shine
  D: "#5b4128", // damp soil (dark)
  r: "#d84a3a", // red handle
};

const E = "................";

const ART = {
  // A flower seedling in its nursery pot: the thing you drag into the new bed.
  "l5-seedling-pot": [E,
    ".......ff.......",
    "......fFFf......",
    ".......ff.......",
    ".......G........",
    "....gg.G.gg.....",
    ".....gGGGg......",
    "......lGl.......",
    "...kkkkkkkkkk...",
    "...kQQQQQQQQk...",
    "....kqqqqqqk....",
    "....kqqqqqqk....",
    "....kqqqqqqk....",
    ".....kkkkkk.....",
    E, E],

  // A lit match, for the lantern chore: a pixel flame on a short stick.
  "l5-match": [E,
    "..........kk....",
    ".........kYYk...",
    "........kYXXYk..",
    "........kYXdYk..",
    ".........kYYk...",
    ".........kNNk...",
    "........knnk....",
    ".......knnk.....",
    "......knnk......",
    ".....knnk.......",
    "....knnk........",
    "...knnk.........",
    "...kkk..........",
    E, E],

  // Trowel for digging the planting holes.
  "l5-trowel": [E,
    "............kk..",
    "...........kNNk.",
    "..........kNnk..",
    ".........kNnk...",
    "........kkkk....",
    ".......kmmk.....",
    "......kmmmk.....",
    ".....kmmMmk.....",
    "....kmmMmk......",
    "...kmmMmk.......",
    "...kmMmk........",
    "...kMmk.........",
    "....kk..........",
    E, E],

  // A dug hole in the soil, with a dashed depth line drawn by the UI.
  "l5-hole": [E, E, E, E, E, E, E,
    "...SSSSSSSSSS...",
    "..SsskkkkkkssS..",
    "..SskNNNNNNksS..",
    "..SskNNNNNNksS..",
    "...SskkkkkksS...",
    "....SSSSSSSS....",
    E, E, E],

  // The lantern by the gate: off at the start of the level...
  "l5-lantern-off": [
    ".......kk.......",
    "......k..k......",
    ".....kkkkkk.....",
    "....kNNNNNNk....",
    "....kkkkkkkk....",
    "....kooooook....",
    "....koOOoook....",
    "....koOooook....",
    "....kooooook....",
    "....kooooook....",
    "....kooooook....",
    "....kkkkkkkk....",
    "....kNNNNNNk....",
    ".....kkkkkk.....",
    E, E],

  // ...and lit, with stepped pixel rays instead of a soft glow.
  "l5-lantern-lit": [
    ".......kk.......",
    "......k..k......",
    ".....kkkkkk.....",
    "....kNNNNNNk....",
    ".d..kkkkkkkk..d.",
    "....kXXXXXXk....",
    "....kXXddXXk....",
    "dd..kXdYYdXk..dd",
    "....kXdYYdXk....",
    "....kXXddXXk....",
    "....kXXXXXXk....",
    ".d..kkkkkkkk..d.",
    "....kNNNNNNk....",
    ".....kkkkkk.....",
    E, E],

  // Night slugs come for the new seedlings. Tap each one off.
  "l5-slug": [E, E, E, E, E,
    "...k..k.........",
    "...k..k.........",
    "..kuuuuk........",
    ".kuukuuukkkkk...",
    ".kuuuuuuuuuuuk..",
    "..kUUUUUUUUUUk..",
    "...kkkkkkkkkk...",
    E, E, E, E],

  // Snips for pinching the basil's flower buds (Level 2's fact, again).
  "l5-snips": [E,
    "..mm.......mm...",
    "...mm.....mm....",
    "....mm...mm.....",
    ".....mm.mm......",
    "......mMm.......",
    "......mMm.......",
    ".....kkMkk......",
    "....krrk.krk....",
    "...krrk...krk...",
    "..krrk.....krk..",
    "..krk.......kr..",
    "..kk.........k..",
    E, E, E],

  // A basil stem going to flower: the white spike is what you pinch off.
  "l5-basil-bud": [E,
    ".......b........",
    "......bkb.......",
    ".......b........",
    "......bkb.......",
    ".......b........",
    ".......G........",
    "....gg.G.gg.....",
    "...gllgGgllg....",
    "....gg.G.gg.....",
    "......gGg.......",
    ".....glGlg......",
    ".......G........",
    E, E, E],

  // Your phone, screen glowing with Bugs' chat (two bunny ears)...
  "l5-phone-glow": [E,
    ".....kkkkkk.....",
    ".....kppppk.....",
    ".....kPPPPk.....",
    ".....kPcPck.....",
    ".....kPcPck.....",
    ".....kPccck.....",
    ".....kPccck.....",
    ".....kPPPPk.....",
    ".....kPPPPk.....",
    ".....kPPPPk.....",
    ".....kppppk.....",
    ".....kpkkpk.....",
    ".....kkkkkk.....",
    E, E],

  // ...and put down, face down: no screen, just the camera dot.
  "l5-phone-down": [E, E, E, E, E, E,
    "..kkkkkkkkkkkk..",
    "..kppppppppppk..",
    "..kpkkpppppppk..",
    "..kpkkpppppppk..",
    "..kppppppppppk..",
    "..kkkkkkkkkkkk..",
    E, E, E, E],

  // The porch step by the back door, where the phone goes.
  "l5-porch-step": [E, E, E, E, E, E, E,
    "kkkkkkkkkkkkkkkk",
    "knnnnnnnnnnnnnnk",
    "kNNNNNNNNNNNNNNk",
    "kkkkkkkkkkkkkkkk",
    "knnnnnnnnnnnnnnk",
    "knnnnnnnnnnnnnnk",
    "kNNNNNNNNNNNNNNk",
    "kkkkkkkkkkkkkkkk",
    E],

  // Watering a bed that was already damp leaves a puddle: the visible mistake.
  "l5-puddle": [E, E, E, E, E, E, E, E, E,
    "....wwwwwwww....",
    "..wwwWWwwwwwww..",
    ".wwwwwwwwWWwwww.",
    "..wwwwwwwwwwww..",
    "....wwwwwwww....",
    E, E],

  // Soil-test results: a finger in the soil reads damp...
  "l5-soil-damp": [E, E, E, E,
    ".......W........",
    "......wWw.......",
    "......www.......",
    E,
    "....DDDDDDDD....",
    "...DDsDDDDsDD...",
    "..DDDDDDsDDDDD..",
    "...DDDDDDDDDD...",
    E, E, E, E],

  // ...or dry, light and cracked.
  "l5-soil-dry": [E, E, E, E, E, E, E, E,
    "....SSSSSSSS....",
    "...SSSkSSSSSS...",
    "..SSSSSkSSSSkS..",
    "...SSSSSkkSkSS..",
    E, E, E, E],

  // The pointing finger used for the soil test.
  "l5-hand": [
    "......kk........",
    ".....kcck.......",
    ".....kcck.......",
    ".....kcck.......",
    ".....kcckkk.....",
    ".....kcckcckk...",
    "...kkkcckcckck..",
    "..kcckcccccccck.",
    "..kcccccccccck..",
    "...kccccccccck..",
    "....kcccccccck..",
    ".....kccccccck..",
    "......kkkkkkk...",
    E, E, E],

  // The garden gate: open...
  "l5-gate-open": [E,
    "kk..............",
    "kNk....k.k.k....",
    "kNk...knknkn....",
    "kNk..knnnnnnk...",
    "kNkkkknknknkk...",
    "kNk..knknknk....",
    "kNk..knknknk....",
    "kNk..knknknk....",
    "kNkkkknknknkk...",
    "kNk..knknknk....",
    "kNk..knnnnnnk...",
    "kNk...kkkkkk....",
    "kNk.............",
    "kkk.............",
    E],

  // ...and closed, latched for the night.
  "l5-gate-closed": [E,
    "kk............kk",
    "kNk.k.k.k.k.k.Nk",
    "kNkknknknknkknNk",
    "kNknnnnnnnnnnkNk",
    "kNkkkkkkkkkkkkNk",
    "kNknknknknknkkNk",
    "kNknknknknknkyyk",
    "kNknknknknknkyyk",
    "kNkkkkkkkkkkkkNk",
    "kNknknknknknkkNk",
    "kNknnnnnnnnnnkNk",
    "kNkkkkkkkkkkkkNk",
    "kNk..........kNk",
    "kkk..........kkk",
    E],
};

function toSvg(name, rows) {
  if (rows.length !== 16) throw new Error(`${name}: ${rows.length} rows, need 16`);
  const rects = [];
  rows.forEach((row, y) => {
    if (row.length !== 16) throw new Error(`${name} row ${y}: ${row.length} columns, need 16`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const fill = PALETTE[ch];
      if (!fill) throw new Error(`${name} row ${y}: unknown colour "${ch}"`);
      rects.push(`  <rect x="${x * 2}" y="${y * 2}" width="2" height="2" fill="${fill}"/>`);
    });
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128" shape-rendering="crispEdges">`,
    `  <!-- ${name}: generated by scripts/make-l5-art.mjs; edit the map there -->`,
    ...rects,
    `</svg>`,
    ``,
  ].join("\n");
}

for (const [name, rows] of Object.entries(ART)) writeFileSync(join(OUT, `${name}.svg`), toSvg(name, rows));
console.log(`wrote ${Object.keys(ART).length} sprites to ${OUT}`);
