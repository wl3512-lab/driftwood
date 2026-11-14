#!/usr/bin/env node
// Builds Driftwood v2's garden art from the pixel maps below.
// Each map is 16×16 characters; every cell becomes a 2×2 rect in a 32×32
// viewBox, in the same format as icons/*.svg (crispEdges, flat fills).
// To change a sprite, edit its map here and re-run — never hand-edit the SVGs.
//
//   node scripts/make-v2-art.mjs        → v2/art/*.svg and v2/art/sheet.html
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
  t: "#5fbf8f", // mint leaf
  T: "#2f8a5f", // mint stem / dark mint
  q: "#c8693c", // terracotta pot
  Q: "#8f4320", // pot shade / rim
  a: "#e6ee9c", // aphid (pale yellow-green dots)
  e: "#dcedc8", // unripe berry (pale green)
  B: "#3949ab", // blueberry
  i: "#9fa8da", // blueberry bloom (dusty highlight)
  w: "#2b2340", // wild berry (glossy blue-black)
  W: "#6f5f9e", // wild berry shine
  o: "#ef8a2c", // carrot / pumpkin orange
  O: "#c0631a", // orange shade / pumpkin rib
  f: "#f06292", // flower petal (pink)
  F: "#c2185b", // flower petal shade / bud
  h: "#a1887f", // wilted petal (dull brown)
  H: "#6d4c41", // wilted shade
  d: "#fdf3b0", // moonlight / lamp glow
  x: "#4e342e", // book cover (dark leather)
  X: "#7b1fa2", // almanac ribbon (Luna purple)
  j: "#7f9f88", // rosemary needle (grey-green)
  J: "#4f6b58", // rosemary needle shade
  z: "#e0405a", // radish
  Z: "#a3243b", // radish shade
  K: "#c9b458", // dry seed pod (radish gone to seed)
  D: "#5a2a1a", // split in a woody radish
};

const E = "................";
const SOIL = ["......sSSs......", "....ssssssss...."];
const WIDE_SOIL = ["..sSsSsSsSsSsS..", ".ssssssssssssss."];
const POT = [
  "..QQQQQQQQQQQQ..",
  "...qqqqqqqqqq...",
  "...qqqqqqqqqq...",
  "....qqqqqqqq....",
  "....QQQQQQQQ....",
];

// Sown, not up yet: raked soil and a label stake whose tag shows the plant
// (the same idea as carrot-sown, where the label carries YOUR handwriting).
// icon: three 4-character rows drawn on the parchment tag.
const SOWN_BED = [".....sSsSsSn....", "...ssSsSSsSsss..", "..ssssssssssss.."];
const SOWN_ROW = ["..ssSSssSSsn....", ...WIDE_SOIL];
function sown(icon, bed = SOWN_BED) {
  return [E, E, E, E, E, E,
    ".........kkkkkk.",
    ...icon.map((r) => `.........k${r}k.`),
    ".........kkkkkk.",
    "...........n....",
    "...........n....",
    ...bed];
}

const ART = {
  sprout: [E, E, E, E, E, E, E, E, E,
    "....ll....ll....",
    "...lggl..lggl...",
    "....lggllggl....",
    "......gGGg......",
    ".......GG.......",
    ...SOIL],

  "tomato-sown": sown(["cgGc", "rrRr", "crrc"]),

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

  "sunflower-sown": sown(["cyyc", "ybby", "cyyc"]),

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

  // Too little sun: a thin pale stalk leaning for light, one small closed bud.
  "sunflower-leggy": [E,
    "...........pp...",
    "..........pYYp..",
    "...........pp...",
    "..........P.....",
    ".........P......",
    ".........P......",
    "........P.......",
    "......p.P.......",
    ".......pP.......",
    "........P.......",
    "........Pp......",
    "........P.p.....",
    "........P.......",
    ...SOIL],

  "lettuce-sown": sown(["uvvu", "vVVv", "cvvc"]),

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

  // Bolted in the heat: a tall flower stalk, small bitter leaves up it, yellow flowers.
  "lettuce-bolted": [
    ".....y...y......",
    "......G.yG......",
    "....y.GG.G.y....",
    ".....GG.GGG.....",
    ".......GG.......",
    "......uGG.......",
    ".....uvGGv......",
    ".......GGvu.....",
    ".....uvGG.......",
    "......vGGvu.....",
    "...u..vGGv..u...",
    "..uvu.uGGu.uvu..",
    "...uvvuVVuvvu...",
    "....uvVVVVvu....",
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

  // ── Level 2 · Luna · herbs ─────────────────────────────────────────
  "basil-sown": sown(["clgc", "lggl", "cGGc"]),

  "basil-growing": [E, E, E, E, E, E, E, E,
    ".......ll.......",
    "......lggl......",
    "...ll.lGGl.ll...",
    "..lggl.GG.lggl..",
    "...lggGGGGggl...",
    ".......GG.......",
    ...SOIL],

  "basil-thriving": [E, E, E, E,
    ".......ll.......",
    "......lggl......",
    "..ll..lGGl..ll..",
    ".lggl..GG..lggl.",
    ".lgggl.GG.lgggl.",
    "..lggGGGGGGggl..",
    "...ll..GG..ll...",
    "..lggl.GG.lggl..",
    "...lggGGGGggl...",
    ".......GG.......",
    ...SOIL],

  // Basil smothered by mint runners: small, pale, mint leaves pushing in.
  "basil-choked": [E, E, E, E, E, E, E, E,
    ".......p........",
    "......pPp.......",
    "..t.pp.P.pp..t..",
    ".tTt.p.P.p..tTt.",
    "..T..tPPt...T...",
    ".tTt.tTPt..tTt..",
    ...SOIL],

  // Soggy: too much water. Limp, yellowed leaves with brown spots, the stem
  // leaning, puddles standing on the dark soil.
  "basil-soggy": [E, E, E, E, E, E,
    ".......pp.......",
    "......phpp......",
    "...pp.pPPp.hp...",
    "..phpp.PP.pphp..",
    "...ppPPPP.ppp...",
    "....h..PP.......",
    ".......PP.......",
    ".i..iNsNNsNi..i.",
    "..iNsNNkNNsNi...",
    "..sNNsNsNkNNss.."],

  // Mint safely in its own terracotta pot.
  // Mint sown in its own pot (never the shared bed).
  "mint-sown": [E, E, E,
    ".........kkkkkk.",
    ".........kctTck.",
    ".........ktTTtk.",
    ".........kcTTck.",
    ".........kkkkkk.",
    "...........n....",
    "...........n....",
    "...ssSsSsSsnss..",
    ...POT],

  "mint-growing": [E, E, E, E, E,
    ".......tt.......",
    "......tTTt......",
    "...tt..TT..tt...",
    "..tTTt.TT.tTTt..",
    "...ttTTTTTTtt...",
    "...sssTTTTsss...",
    ...POT],

  "mint-thriving": [E,
    ".......tt.......",
    "......tTTt......",
    "...tt..TT..tt...",
    "..tttt.TT.tttt..",
    "...ttTTTTTTtt...",
    ".tt....TT....tt.",
    "tttt..tTTt..tttt",
    ".ttTTtTTTTtTTtt.",
    "...tt..TT..tt...",
    "...sssTTTTsss...",
    ...POT],

  // Mint everywhere: leaves across the whole bed, runners through the soil.
  "mint-overrun": [E, E, E, E, E,
    "..tt......tt....",
    ".tTTt..tt.tTt...",
    "..T...tTTt.T..tt",
    "tt.T.tt.T..T.tTt",
    "tTtT.tTtTtt.T.T.",
    ".TttTTt.TtTTtTt.",
    "tTTtTtTTtTtTTtTt",
    "TTsTTsTTsTTsTTsT",
    "sTsTsssTsTsssTss",
    "TsssTsTsssTsTsss",
    "ssssssssssssssss"],

  // ── Level 3 · Ember · pests and berries ────────────────────────────
  // ── Level 2 · almanac herbs (no bed in the game yet) ──────────────
  "parsley-sown": sown(["glgl", "lgGg", "cGGc"]),

  "parsley-growing": [E, E, E, E, E, E, E, E,
    "......l..l......",
    ".....lgllgl.l...",
    "..l.lgGglgGlgl..",
    ".lglgGg.gG.lGgl.",
    "..gG..G..G..Gg..",
    "....G..GG..G....",
    ...SOIL],

  // Curly parsley: a dense, frilly mound.
  "parsley-thriving": [E, E, E, E,
    ".....l.l..l.....",
    "...l.lglglgl.l..",
    "..lglgGglgGglgl.",
    ".lgGglglgGlglgGl",
    "..glgGglgGglgGg.",
    ".lglG.lgGl.Ggl..",
    "..gG.G.lGgl.G.g.",
    "...G..G.G..G.G..",
    "....G..GG.G.G...",
    ".....G.GG.G.....",
    ...SOIL],

  // Yellowing: the outer leaves go yellow first (hungry or waterlogged);
  // only the new growth in the middle is still green.
  "parsley-yellowing": [E, E, E, E, E, E,
    "......y..p......",
    ".....pyYpyp.y...",
    "..p.pyPpypPyYp..",
    ".pypYPp.yP.pPyp.",
    "..yP..P.lG..Pp..",
    "...P.P.GgG.P....",
    "....P..GG.P.....",
    "......PGG.P.....",
    ...SOIL],

  "rosemary-sown": sown(["jcjc", "cjNj", "cNcc"]),

  "rosemary-growing": [E, E, E, E, E, E, E,
    "......j...j.....",
    ".....jJj.jJj....",
    "......Jj..Jj.j..",
    "....j.J.jjJ.jJ..",
    "...jJjJ.jJ..J...",
    ".....JnjJ..nJ...",
    ".......nn.n.....",
    ...SOIL],

  // A woody, upright bush with pale blue flowers.
  "rosemary-thriving": [E, E,
    "....i.....i.....",
    "...jJj..i.jJ....",
    "...jJj.jJjjJ.i..",
    ".i.jJ..jJj.Jj.J.",
    ".jJjJ.ijJ..JjjJ.",
    ".jJ.Jj.jJ.jJ.jJ.",
    "..jJjJ.Jj.Jj.J..",
    "..J.Jn.Jj.nJjJ..",
    "...jJn.Jn.nJ....",
    "....Nn.nN.n.....",
    ".....NnnNnN.....",
    ".......NN.......",
    ...SOIL],

  // Root rot: too much water. Soggy dark soil with standing water, browned,
  // drooping branches.
  "rosemary-rotting": [E, E, E, E, E,
    "......h...h.....",
    ".....hH..hHh....",
    "....hHh.P.H.....",
    "...h.Hh.PhH.h...",
    "..h..HPhP.Hh.h..",
    "....h.P.P.P..H..",
    ".....hNhPhN.....",
    "......NNNN......",
    ".i..iNsNNsNi..i.",
    "..iNsNNkNNsNi...",
    "..sNNsNsNkNNss.."],

  "bean-sown": sown(["cnec", "cneG", "Gncc"]),

  // Up the pole a little way: the vine has only just started climbing.
  "bean-growing": [E, E,
    "........n.......",
    "........n.......",
    "........n.......",
    "........n.......",
    "........n.......",
    "........nl......",
    "........ngg.....",
    "......ggnGgG....",
    ".....gGgn.l.....",
    "......l.nGg.....",
    "...ggGgln.......",
    ".....gGGn.gg....",
    ...SOIL],

  "bean-aphids": [
    "........n.......",
    "......ppn.......",
    ".....paan.pp....",
    "........nPaPp...",
    "...pa...n..l....",
    "..paPp..n..l....",
    "....Pa.ln..l....",
    "......lPn.ap....",
    "......l.nPaap...",
    "......l.n...l...",
    "...ppPaPn...l...",
    "..pPa...nPa.l...",
    ".....pPPnPap....",
    "........n.......",
    ...SOIL],

  "bean-thriving": [
    "........n.......",
    "......ggn.......",
    ".....gGgn.gg....",
    "........nGgGg...",
    "...gg...n..l....",
    "..gGGg..n..l....",
    "....Gg.ln..l....",
    "......lGn.gg....",
    "......l.nGGgg...",
    "......l.n...l...",
    "...ggGgGn...l...",
    "..gGg...nGg.l...",
    ".....gGGnGgg....",
    "........n.......",
    ...SOIL],

  // The shop blueberry: unripe (pale green berries).
  "blueberry-sown": sown(["cBBc", "BiBB", "cBBc"]),

  "blueberry-growing": [E, E, E,
    "......gggg......",
    "....ggGggGgg....",
    "...gGgeeggGgg...",
    "..ggGgeeGgeeGg..",
    "..gGggGgggeegg..",
    ".gGeeGgGggGgGgg.",
    ".ggeegGgeeggGgg.",
    ".gGggGggeeGgeeg.",
    "..gGgGgGgGggeeg.",
    "...gGg.GG.gGgg..",
    ".......NN.......",
    ...SOIL],

  // Ripe: dusty blue berries, each with a pale "bloom" highlight.
  "blueberry-thriving": [E, E, E,
    "......gggg......",
    "....ggGggGgg....",
    "...gGgiBggGgg...",
    "..ggGgBBGgiBGg..",
    "..gGggGgggBBgg..",
    ".gGiBGgGggGgGgg.",
    ".ggBBgGgiBggGgg.",
    ".gGggGggBBGgiBg.",
    "..gGgGgGgGggBBg.",
    "...gGg.GG.gGgg..",
    ".......NN.......",
    ...SOIL],

  // The lookalike: a darker bush, glossy blue-black berries in clusters.
  // Close enough to the blueberry to tempt you. That's the point.
  // Bird-pecked: berries torn open or gone, a few dropped, a feather left behind.
  "blueberry-pecked": [E, E, E,
    "......gggg......",
    "....ggGggGgg....",
    "...gGg..ggGgg...",
    "..ggGgVBGg..Gg..",
    "..gGggGgggBVgg..",
    ".gGg.GgGggGgGgg.",
    ".gg..gGgiBggGgg.",
    ".gGggGggVBGg..g.",
    "..gGgGgGgGgg.Vg.",
    "...gGg.GG.gGgg..",
    "..mm...NN...B...",
    ".mMmB.sSSs.V....",
    "....ssssssss...."],

  "wildberry-fruiting": [E, E,
    ".....GGGG.......",
    "...GGgGGgGG.....",
    "..GgwwGGgGGG....",
    ".GGwWwGgGwwGG...",
    ".GgGwGGGwWwGgG..",
    "GGgGGGgGGwGGgGG.",
    "GgwwGGgGGGGwwgG.",
    "GGwWwGGgGGwWwGG.",
    ".GGwGGgwwGGwGGG.",
    ".GGgGGwWwGGgGG..",
    "..GGgGGwGGgGG...",
    "......NN........",
    ...SOIL],

  // Picked clean (the fooled path): bare stems, a few squashed berries below.
  "wildberry-picked": [E, E,
    ".....GGGG.......",
    "...GG.GG.GG.....",
    "..G..GG.G..G....",
    ".GG.G.G.G.GG....",
    ".G.G..GG...G.G..",
    "GG.GG..G.G..GG..",
    "G..G.GG..G..G.G.",
    "GG..G..G..GG.GG.",
    ".G.G.GG..G..G...",
    ".GG..G..G.GG....",
    "..GG.GG.GGG.....",
    "......NN........",
    "....w.sSSsw.....",
    "....ssssssssw..."],

  // Caught path: the same bush with a "don't eat" tag (red X on parchment).
  "wildberry-tagged": [E, E,
    ".....GGGG.......",
    "...GGgGGgGG.....",
    "..GgwwGGgGGG....",
    ".GGwWwGgGwwGG...",
    ".GgGwGGGwWwGgG..",
    "GGgGGGgGGwGGgGG.",
    "kkkkkkGGGGGwwgG.",
    "kcrccrkgGGwWwGG.",
    "kccrrckwwGGwGGG.",
    "kccrrckWwGGgGG..",
    "kcrccrkwGGgGG...",
    "kkkkkkNN........",
    ...SOIL],

  // ── Level 4 · Biscuit · finish the garden ──────────────────────────
  // Sown but not up yet: a bare, raked row and YOUR label on its stake.
  "carrot-sown": [E, E, E, E, E,
    "..........ccccc.",
    "..........ckkkc.",
    "..........ccccc.",
    "..........ckkcc.",
    "..........ccccc.",
    "............n...",
    "............n...",
    "............n...",
    "..ssSSssSSssn...",
    ...WIDE_SOIL],

  // Dug over (the fooled path): churned soil, seeds scattered, label knocked flat.
  "carrot-dug": [E, E, E, E, E, E, E, E, E,
    "........nnnccccc",
    "..s..S....s.ckkc",
    ".sSs.sSbs.SsS.s.",
    "SsbSsSsSsbSssSbs",
    "sSsSbsSsSsSbsSsS",
    "ssssssssssssssss",
    E],

  "carrot-growing": [E, E, E, E, E, E,
    "...l...l...l....",
    "..lgl.lgl.lgl...",
    "...gl..gl..gl...",
    "..lG..lG..lG....",
    "...G...G...G....",
    "...o...o...o....",
    "..sOs.sOs.sOs...",
    "..ssSSssSSssS...",
    ...WIDE_SOIL],

  "carrot-thriving": [E, E,
    "..l...l....l....",
    ".lgl.lgl..lgl...",
    "..glg.glg..glg..",
    ".lgGl.lgGl.lgGl.",
    "..gG...gG...gG..",
    "...G...G....G...",
    "...G...G....G...",
    "..oo..ooo..oo...",
    "..oO..oOo..oO...",
    "..sOs.sOs.sOs...",
    "..ssSSssSSssS...",
    "..s.O.s...sOs...",
    ...WIDE_SOIL],

  // Thirsty: tops flopped and pale, the dry soil cracked and shrunk from the roots.
  "carrot-thirsty": [E, E, E, E, E,
    "...P....P....P..",
    "..pPp..pPp..pPp.",
    ".p.P.pp.P.pp.P.p",
    ".p.P..p.P..p.P.p",
    "..oo..ooo..oo...",
    "..oO..oOo..oO...",
    "..sOs.sOs.sOs...",
    "..SSsSSkSSsSS...",
    "..S.O.S...SOS...",
    "..SSSkSSSSSkSS..",
    ".sSSSSSSkSSSSSs."],

  // Rotting: watered when the soil was still damp. Tops yellowed and flopped,
  // the shoulders gone dark and soft, standing water on sodden soil.
  "carrot-rotting": [E, E, E, E, E,
    "...h....h....h..",
    "..pHp..hPh..pHh.",
    ".h.P.hp.P.ph.P.h",
    ".p.H..h.H..p.H.p",
    "..HO..HHO..OH...",
    "..oH..HOH..HO...",
    "..NHN.NHN.NHN...",
    ".iNNsNNkNNsNNi..",
    "..N.H.N.i.NHN...",
    ".iNsNkNNiNNkNsi.",
    ".sNNsNNsNkNNssN."],

  "pumpkin-sown": sown(["cNcc", "oOoO", "cooc"], SOWN_ROW),

  "pumpkin-growing": [E, E, E, E, E, E, E,
    "...gg......gg...",
    "..gGGg....gGGg..",
    "..gGGgg..ggGGg..",
    "...ggGGGGGGgg...",
    "......lGGy......",
    "....lgG..Gyy....",
    "...lgG....Gl....",
    ...WIDE_SOIL],

  "pumpkin-thriving": [E, E, E, E,
    ".......NN.......",
    "...gg..N.Ngg....",
    "..gGGgoooogGg...",
    "...ooOooooOoo...",
    "..ooOooooooOoo..",
    ".oooOooooooOooo.",
    ".oooOooooooOooo.",
    ".oooOooooooOooo.",
    "..ooOooooooOoo..",
    "...OOOOOOOOOO...",
    ...WIDE_SOIL],

  // ── Level 5 · Bugs · final bloom ───────────────────────────────────
  // Powdery mildew: white dust over the leaves, a small fruit that stops growing.
  "pumpkin-mildew": [E, E, E, E,
    "...ggg....ggg...",
    "..gcgGg..gGcgg..",
    ".gccGgcg.gcGccg.",
    ".ggcGcgg.gcgGcg.",
    "..gGgcg..ggcGg..",
    "...gGGGGGGGGg...",
    ".......GG.......",
    ".......N........",
    "....oOooOoo.....",
    "....ooOooOo.....",
    ...WIDE_SOIL],

  "flower-sown": sown(["cffc", "fyFf", "cffc"], SOWN_ROW),

  "flower-growing": [E, E, E, E, E,
    "...F.....F......",
    "..FfF...FfF..F..",
    "...G.....G..FfF.",
    "...G..l..G...G..",
    "...Gg.lg.G...G..",
    "...G...gGG..gG..",
    "..lG....G..lG...",
    "...G....G...G...",
    "...G....G...G...",
    ...WIDE_SOIL],

  "flower-thriving": [E, E,
    "..f.f.....f.f...",
    ".fffff...fffff..",
    "ffFyFff.ffFyFff.",
    ".fffff...fffff..",
    "..f.f.f.f.f.f...",
    "...G..fffff.G...",
    "...G.ffFyFffG...",
    "...Gg.fffff.G...",
    "..lG...fGf..Gl..",
    "...G....G...G...",
    "..lG...gG...G...",
    "...G....Gl..G...",
    ...WIDE_SOIL],

  // Thirsty: heads tipped over, leaves hanging. Water now and it recovers.
  "flower-thirsty": [E, E,
    "....GGG....GGG..",
    "...G...G..G...G.",
    "...G..fffG....G.",
    "...G.ffFyfff..G.",
    "...G..fffff..fff",
    "..lG....G...ffFy",
    "...G....G....fff",
    "..l.G...G....G..",
    "....G...Gl...G..",
    "...lG...G....Gl.",
    "....G...G....G..",
    "....G...G....G..",
    ...WIDE_SOIL],

  // Wilted: brown heads hanging to the soil, pale stems.
  "flower-wilted": [E, E, E, E, E, E,
    ".....PP......PP.",
    "....P..P....P..P",
    "...P....P..P...P",
    "...P....P..P...h",
    "..hhh...P..P..hH",
    ".hhHhh..P.hhh..h",
    "..hhh..pP.hHhh..",
    "...p....P..hh...",
    ...WIDE_SOIL],

  // ── Evidence icons (shown on the evidence cards) ───────────────────
  // A plant label on a stake: Level 2 (mint), Level 3 (shop blueberry), Level 4 (your carrots).
  "plant-label": [E,
    "....kkkkkkkk....",
    "....kcccccck....",
    "....kckkkkck....",
    "....kcccccck....",
    "....kckkkcck....",
    "....kcccccck....",
    "....kckkkkck....",
    "....kcccccck....",
    "....kkkkkkkk....",
    ".......nn.......",
    ".......nn.......",
    ".......nn.......",
    ".......nn.......",
    ...SOIL],

  // Level 3's warning sign: a yellow triangle with "!", on a post.
  "warning-sign": [
    ".......kk.......",
    "......kyyk......",
    "......kyyk......",
    ".....kyyyyk.....",
    ".....kykkyk.....",
    "....kyykkyyk....",
    "....kyykkyyk....",
    "...kyyykkyyyk...",
    "...kyyyyyyyyk...",
    "..kyyyykkyyyyk..",
    "..kyyyykkyyyyk..",
    ".kkkkkkkkkkkkkk.",
    ".......NN.......",
    ".......NN.......",
    ...SOIL],

  // ── Level mechanics (toolbar buttons and scene props) ──────────────
  // Level 2: Luna's almanac (dark leather, purple ribbon). Opens with "/".
  almanac: [E,
    "...xxxxxxxxxx...",
    "..xxccccccccxx..",
    "..xxccccccccxx..",
    "..xxcyyyyyycxx..",
    "..xxccccccccxx..",
    "..xxckkkkkkcxx..",
    "..xxccccccccxx..",
    "..xxckkkkkccxx..",
    "..xxccccccccxx..",
    "..xxxxxxxxxxxx..",
    "..xxxxxxxxxxxx..",
    "......XX........",
    "......XX........",
    "......X.X.......",
    E],

  // Every level's almanac on the toolbar: the high-tech book, a leather spine,
  // a cream bezel with a green LED, a glowing screen and two page buttons.
  "almanac-device": [E,
    ".kkkkkkkkkkkkkk.",
    ".kxxccccccccgck.",
    ".kxxckkkkkkkkck.",
    ".kxxckeeeeeekck.",
    ".kxxckeGGGGekck.",
    ".kxxckeeeeeekck.",
    ".kxxckeGGGeekck.",
    ".kxxckeeeeeekck.",
    ".kxxckkkkkkkkck.",
    ".kxxcccccccccck.",
    ".kxxcckkcckkcck.",
    ".kxxcccccccccck.",
    ".kkkkkkkkkkkkkk.",
    E, E],

  // Level 3: the magnifier. Opens with "M".
  magnifier: [E,
    "....kkkkk.......",
    "...kmcccmk......",
    "..kmcccccmk.....",
    "..kcccccccck....",
    "..kcccccccck....",
    "..kcccccccck....",
    "..kmcccccmk.....",
    "...kmcccmk......",
    "....kkkkkNN.....",
    ".........NNN....",
    "..........NNN...",
    "...........NNN..",
    "............NN..",
    E, E],

  // Level 4: your planting log (a little notebook with a pencil). Opens with "L".
  "planting-log": [E,
    "..kkkkkkkkkk....",
    "..kgcccccccko...",
    "..kgckkkkcckoo..",
    "..kgcccccccko...",
    "..kgckkkkkck.o..",
    "..kgcccccccko...",
    "..kgckkkcccko...",
    "..kgcccccccko...",
    "..kgckkkkkckk...",
    "..kgccccccck.k..",
    "..kgckkkkcck....",
    "..kgcccccccck...",
    "..kkkkkkkkkkk...",
    E, E],

  // Level 5: the moon over the meadow (scene prop, top corner).
  moon: [E, E,
    "......dddd......",
    "....dddddddd....",
    "...ddddddddd....",
    "..dddddd........",
    "..ddddd.........",
    "..ddddd.........",
    "..ddddd.........",
    "..dddddd........",
    "...ddddddddd....",
    "....dddddddd....",
    "......dddd......",
    E, E, E],
  // The opening cutscene's example packet (ui/cutscene.js). The radish is in
  // no level, so the cutscene spoils nothing; it is not on the seed shelf.
  "radish-sown": [
    "................",
    "................",
    "................",
    "................",
    "................",
    "..........ccccc.",
    "..........ckkkc.",
    "..........ccccc.",
    "..........ckkcc.",
    "..........ccccc.",
    "............n...",
    "............n...",
    "............n...",
    "..ssSSssSSssn...",
    "..sSsSsSsSsSsS..",
    ".ssssssssssssss.",
  ],
  "radish-growing": [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "......l..l......",
    ".....lgl.lgl....",
    ".....lgglggl....",
    "......gGgGg.....",
    ".......GGG......",
    "......zzzz......",
    "..ssSSzzZZSSss..",
    "..sSsSsSsSsSsS..",
    ".ssssssssssssss.",
  ],
  "radish-thriving": [
    "................",
    "...l.......l....",
    "..lgl.....lgl...",
    ".lgggl...lgggl..",
    ".lgGggl.lggGgl..",
    "..lgGglllgGgl...",
    "...lgGGgGGgl....",
    ".....gGGGg......",
    "......GGG.......",
    ".....zzzzz......",
    "....zzzzzZz.....",
    "...zzczzzzZz....",
    "...zczzzzzZz....",
    "..sszzzzzZZss...",
    "..sSsSZZZsSsSs..",
    ".ssssssssssssss.",
  ],
  "radish-woody": [
    ".......c.c......",
    "......cGc.c.....",
    ".......G.G......",
    "........G.......",
    "...K....G....K..",
    "..KlK...G...KlK.",
    "...KGK..G..KGK..",
    ".....KG.G.GK....",
    "......GGGG......",
    ".....zzzzzz.....",
    "....zzzDzzZz....",
    "...zzzzDDzZZz...",
    "...zzczzDzzZz...",
    "..sszzzzDzZZss..",
    "..sSsSZZZZsSsS..",
    ".ssssssssssssss.",
  ],
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
<body><h1>Driftwood v2 art</h1><main>${tiles}</main>
<h1>On the CRT background</h1><main class="dark">${tiles}</main></body></html>
`;
}

// Only write files when run directly, never when imported (the tests import toSvg).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  mkdirSync(OUT, { recursive: true });
  const names = Object.keys(ART);
  for (const name of names) writeFileSync(join(OUT, `${name}.svg`), toSvg(name, ART[name]));
  writeFileSync(join(OUT, "sheet.html"), sheet(names));
  console.log(`wrote ${names.length} sprites + sheet.html → ${OUT}`);
}
