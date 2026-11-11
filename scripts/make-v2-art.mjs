#!/usr/bin/env node
// Builds Driftwood v2's garden art from the pixel maps below.
// Each map is 16×16 characters; every cell becomes a 2×2 rect in a 32×32
// viewBox, in the same format as icons/*.svg (crispEdges, flat fills).
// To change a sprite, edit its map here and re-run — never hand-edit the SVGs.
//
//   node scripts/make-v2-art.mjs        → v2/art/*.svg and v2/art/sheet.html
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.ART_OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "v2", "art");

const PALETTE = {
  g: "#4caf50", // leaf
  G: "#2e7d32", // stem / dark leaf
  l: "#8bc34a", // light leaf
  p: "#c5d6a0", // pale leaf (damaged)
  P: "#a8b878", // pale stem (damaged)
  u: "#c39be0", // lettuce leaf edge (purple)
  v: "#8a52ad", // lettuce leaf
  V: "#5e3478", // lettuce heart
  r: "#e53935", // tomato
  R: "#b71c1c", // tomato shade
  y: "#f0c850", // petal
  Y: "#e8b830", // petal shade
  b: "#6d4c2f", // seed head
  k: "#3b2a1a", // ink / outline
  c: "#fff6dc", // parchment
  s: "#8a6440", // soil
  S: "#b98a5a", // soil light
  m: "#90a4ae", // metal
  M: "#546e7a", // metal shade
  n: "#a0703f", // wood
  N: "#5d3a1e", // wood dark
};

const E = "................";
const SOIL = ["......sSSs......", "....ssssssss...."];

const ART = {
  sprout: [E, E, E, E, E, E, E, E, E,
    "....ll....ll....",
    "...lggl..lggl...",
    "....lggllggl....",
    "......gGGg......",
    ".......GG.......",
    ...SOIL],

  "tomato-growing": [E, E, E, E,
    ".......ll.......",
    ".....llggll.....",
    "....lgg.GGgl....",
    "...lg..GG..gl...",
    ".....lgGGgl.....",
    "....lg.GG.gl....",
    "...lg..GG..gl...",
    ".......GG.......",
    ".....lgGGgl.....",
    ".......GG.......",
    ...SOIL],

  "tomato-thriving": [E, E, E, E,
    ".......ll.......",
    ".....llggll.....",
    "....lgg.GGgl....",
    "..rr...GG..rr...",
    ".rrRr.gGGg.rrRr.",
    ".rrrr..GG..rrrr.",
    "..rr..lGGl..rr..",
    ".....rrGGrr.....",
    "....rRrGGrRr....",
    ".....rrGGrr.....",
    ...SOIL],

  // Leggy and pale: what too little sun does to a tomato.
  "tomato-damaged": [
    "........P.......",
    ".......pP.......",
    "........P.......",
    "......p.P.......",
    ".....p..P.......",
    "........P.......",
    "........Pp......",
    "........P.p.....",
    "........P..p....",
    ".......P........",
    ".......P........",
    "....p..P........",
    ".....p.P........",
    ".......P........",
    ...SOIL],

  "sunflower-growing": [E, E,
    ".......gg.......",
    "......gGGg......",
    ".......GG.......",
    ".......G........",
    "....lg.G........",
    ".....lgG........",
    ".......G........",
    ".......Ggl......",
    ".......G.gl.....",
    ".......G........",
    ".......G........",
    ".......G........",
    ...SOIL],

  "sunflower-thriving": [
    ".....y.yy.y.....",
    "....yyyyyyyy....",
    "...yyYbbbbYyy...",
    "..yYbbkbbkbYy...",
    "...yYbbbbbbYy...",
    "....yyYbbYyy....",
    ".....y.yy.y.....",
    ".......G........",
    "....lg.G........",
    ".....lgG........",
    ".......Ggl......",
    ".......G.gl.....",
    ".......G........",
    ".......G........",
    ...SOIL],

  "lettuce-growing": [E, E, E, E, E, E, E, E, E,
    "......u..u......",
    ".....uvu.uvu....",
    "....uvvuuvvu....",
    ".....uvVVvu.....",
    "......vVVv......",
    ...SOIL],

  "lettuce-thriving": [E, E, E, E, E, E,
    "......uuuu......",
    "....uuuvvuu.....",
    "...uuvvuuvvuu...",
    "..uvvuuvvuuvvu..",
    "..uvuuvvvvuuvu..",
    "...uvvvVVvvvu...",
    "....uvVVVVvu....",
    ".....vVVVVv.....",
    ...SOIL],

  "watering-can": [E, E, E, E, E,
    "....mmmm........",
    "...m....m.......",
    "...m....m.....mm",
    ".mmmmmmmmmm..mM.",
    ".mMMMMMMMMmmmM..",
    ".mMMMMMMMMmM....",
    ".mMMMMMMMMm.....",
    ".mMMMMMMMMm.....",
    ".mmmmmmmmmm.....",
    E, E],

  "seed-packet": [E,
    "...kkkkkkkkkk...",
    "...kcccccccck...",
    "...kcccrrccck...",
    "...kccrRrrcck...",
    "...kccrrrrcck...",
    "...kcccrrccck...",
    "...kcccgGccck...",
    "...kcccccccck...",
    "...kyyyyyyyyk...",
    "...kcccccccck...",
    "...kckkkkkkck...",
    "...kcccccccck...",
    "...kkkkkkkkkk...",
    E, E],

  "goal-sign": [E, E,
    "..NNNNNNNNNNNN..",
    "..NnnnnnnnnnnN..",
    "..NnccccccccnN..",
    "..NnccccccccnN..",
    "..NnnnnnnnnnnN..",
    "..NNNNNNNNNNNN..",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ".......NN.......",
    ...SOIL],
};

export function toSvg(name, rows) {
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
    `  <!-- ${name}: generated by scripts/make-v2-art.mjs; edit the map there -->`,
    ...rects,
    `</svg>`,
    ``,
  ].join("\n");
}

function sheet(names) {
  const tiles = names.map((n) =>
    `<figure><img src="${n}.svg" alt="${n}" width="128" height="128"><figcaption>${n}</figcaption></figure>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Driftwood v2 art sheet</title>
<style>
  body { margin: 0; padding: 24px; background: #7cc36a; font: 14px "Fira Code", monospace; color: #3b2a1a; }
  h1 { font-size: 18px; } main { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
  figure { margin: 0; background: #9fd4f5; border: 3px solid #3b2a1a; padding: 8px; text-align: center; }
  img { image-rendering: pixelated; display: block; margin: 0 auto 6px; }
  .dark figure { background: #050805; color: #c8d8ce; border-color: #00e676; }
</style></head>
<body><h1>Driftwood v2 · Level 1 art (approve before use)</h1><main>${tiles}</main>
<h1>On the CRT background</h1><main class="dark">${tiles}</main></body></html>
`;
}

mkdirSync(OUT, { recursive: true });
const names = Object.keys(ART);
for (const name of names) writeFileSync(join(OUT, `${name}.svg`), toSvg(name, ART[name]));
writeFileSync(join(OUT, "sheet.html"), sheet(names));
console.log(`wrote ${names.length} sprites + sheet.html → ${OUT}`);
