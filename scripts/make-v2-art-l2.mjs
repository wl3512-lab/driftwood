#!/usr/bin/env node
// Level 2's hands-on props (pots, compost, trowel, seedlings in plugs, the
// pinched basil tip, kitchen jar, cloth, mister, greenhouse fog), drawn with
// the same 16×16 maps and palette as scripts/make-v2-art.mjs (its toSvg).
//   node scripts/make-v2-art-l2.mjs   → v2/art/l2-*.svg
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toSvg } from "./make-v2-art.mjs";

const OUT = process.env.ART_OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "v2", "art");
const E = "................";
const PLUG = ["....kkkkkkkk....", "....ksSsSsSk....", "....kssssssk....", ".....kssssk.....", ".....kkkkkk....."];
const JAR = (fill) => [E, E,
  ".....kkkkkk.....", ".....kNNNNk.....", "....kkkkkkkk....",
  "...kiccccccik...", "...kiccccccik...", "...kiccccccik...",
  ...fill.map((r) => `...ki${r}ik...`),
  "...kiiiiiiiik...", "...kkkkkkkkkk...", E];
// Condensation: scattered droplet clusters, mostly see-through.
const FOG = ["..i.....c...i...", ".ici...i.....c..", "..i...c.c..ici..", "......i.....i..."];

const ART = {
  "l2-pot-empty": [E, E, E, E, E, E,
    "..kkkkkkkkkkkk..", "..kQQQQQQQQQQk..", "..kNNNNNNNNNNk..",
    "...kqqqqqqqqk...", "...kqqqqqqqqk...", "...kqQqqqqqqk...",
    "....kqqqqqqk....", "....kqqqqqqk....", "....kQQQQQQk....", "....kkkkkkkk...."],
  "l2-pot-soil": [E, E, E, E, E, E,
    "..kkkkkkkkkkkk..", "..kQQQQQQQQQQk..", "..kSsSsSsSsSsk..",
    "...kqqqqqqqqk...", "...kqqqqqqqqk...", "...kqQqqqqqqk...",
    "....kqqqqqqk....", "....kqqqqqqk....", "....kQQQQQQk....", "....kkkkkkkk...."],
  "l2-compost-bag": [E, E, E,
    ".....sSsSs......",
    "...kkkkkkkkkk...", "...kcccccccck...",
    "..kcccccccccck..", "..kccgGggGccck..", "..kcccGGGGccck..", "..kcccccccccck..",
    "..kcSSSSSSSSck..", "..kcccccccccck..", "..kcccccccccck..",
    "...kcccccccck...", "...kkkkkkkkkk...", E],
  "l2-trowel": [E,
    "...........NN...", "..........NnN...", ".........NnN....", "........NnN.....",
    ".......kNk......", "......kmmk......", ".....kmmmMk.....", "....kmmmMMk.....",
    "...kmmmMMk......", "...kmmMMk.......", "...kmMMk........", "....kkk.........", E, E, E],
  "l2-basil-plug": [E, E, E, E,
    "......l..l......", ".....lgllgl.....", "....lggGGggl....", ".....lgGGgl.....",
    ".......GG.......", ".......GG.......", ...PLUG, E],
  "l2-mint-plug": [E, E, E, E,
    ".....tt..tt.....", "....tTTttTTt....", ".....tTTTTt.....", "......tTTt......",
    ".......TT.......", ".......TT.......", ...PLUG, E],
  "l2-basil-tip": [E, E, E, E, E,
    ".......ll.......", "......lggl......", "....llgGGgll....", "...lgggGGgggl...",
    ".....llGGll.....", ".......GG.......", ".......GG.......", "......kGGk......", E, E, E],
  "l2-jar": JAR(["cgccgc", "glglgl", "gGgglg", "lgGggl", "gglgGg"]),
  "l2-jar-empty": JAR(["cccccc", "cccccc", "cccccc", "cccccc", "cccccc"]),
  "l2-cloth": [E, E, E, E,
    "...kkkkkkkkkk...", "...kBBBBBBBBk...", "...kBiBBiBBBk...", "...kBBBBBBBBk...",
    "...kiiiiiiiik...", "...kBBBBBBBBk...", "...kBBiBBBiBk...", "...kBBBBBBBBk...",
    "...kkkkkkkkkk...", E, E, E],
  "l2-mister": [E,
    "......kkkk......", "...mmkkmmk......", "......kmmk......", "......kMMk......",
    ".....kkkkkk.....", "....kiiiiiik....", "....kiBBBBik....", "....kiBBBBik....",
    "....kicccBik....", "....kiccccik....", "....kiBBBBik....", "....kiBBBBik....",
    "....kiiiiiik....", "....kkkkkkkk....", E],
  "l2-fog": Array.from({ length: 16 }, (_, i) => FOG[(i + Math.floor(i / 4)) % 4]),
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  for (const [name, rows] of Object.entries(ART)) writeFileSync(join(OUT, `${name}.svg`), toSvg(name, rows));
  console.log(`wrote ${Object.keys(ART).length} level-2 sprites → ${OUT}`);
}
