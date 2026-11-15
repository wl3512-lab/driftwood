// Pixel maps for the wizard story: Master Rowan, the dinner table's pot, vases
// and bowls, his seed pouch and the rating bowls. Each map is a list of equal
// rows, one character per cell ("." is empty), and a palette. Pure: no DOM, so
// scripts/make-v2-story-art.mjs can import it to write art/story/*.svg, and the
// screens inline the rest as crisp <rect> SVGs.
//
// Chosen by Lucy: Wizard C in docs/design-options/2026-11-14-wizard/options.html.

// Map → SVG markup. cell = SVG units per map cell (the art's own scale; CSS sizes it).
export function pixelSvg(rows, pal, { cell = 16, cls = "px", label = null } = {}) {
  const w = rows[0].length;
  let out = "";
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`pixel map row ${y}: ${row.length} cells, need ${w}`);
    for (let x = 0; x < w;) {
      const c = row[x];
      if (c === ".") { x++; continue; }
      if (!pal[c]) throw new Error(`pixel map row ${y}: no colour for "${c}"`);
      let e = x;
      while (e < w && row[e] === c) e++;
      out += `<rect x="${x * cell}" y="${y * cell}" width="${(e - x) * cell}" height="${cell}" fill="${pal[c]}"/>`;
      x = e;
    }
  });
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" style="--cols:${w};--rows:${rows.length}" viewBox="0 0 ${w * cell} ${rows.length * cell}" width="${w * cell}" height="${rows.length * cell}" shape-rendering="crispEdges" ${a11y}>${out}</svg>`;
}

const SKIN = { s: "#f2c79a", S: "#d9a06f", e: "#2a1f14" };

// Master Rowan: purple and gold robe, star hat, sunflower staff. 12 × 18 cells,
// so he stands a head taller than the pets (10 × 14) at the same cell size.
export const ROWAN = {
  rows: [
    ".f.....v....",
    "fFf...vV....",
    ".f....vvV...",
    ".t...vvgVV..",
    ".t...vvvVV..",
    ".t.ggggggggg",
    ".t..sssssss.",
    ".t..sessses.",
    ".t..wssSssw.",
    ".t..wwwwwww.",
    ".ts.wwwWwww.",
    ".tvvwwwWwwwv",
    ".tvgwwwWwwgv",
    ".tvgvwwWwvgv",
    ".tvgvvwWvvgv",
    ".tvgvvvvvvgv",
    ".tVgVVVVVVgV",
    ".t.ggg..ggg.",
  ],
  pal: { ...SKIN, f: "#f9c22e", F: "#6b3d1a", t: "#6b4426", v: "#6a46a0", V: "#3d2566", g: "#f0b429", w: "#f4f1e8", W: "#cfc8b8" },
};

// ---- the dinner table ----
const VASE = [
  "...kkkkkk...",
  "...kBBBBk...",
  "..kBbBBBBk..",
  "..kBbBBBBk..",
  "..kBBBBBBk..",
  "...kBBBBk...",
  "....kkkk....",
];
const VASE_PAL = { k: "#2a1f14", B: "#3f6fb5", b: "#6a95d6" };
// Sunflowers: two heads on stems that go down into the vase's neck.
const SUNFLOWERS = [
  "..yyy.......",
  ".yYYYy..yy..",
  ".yYcYy.yYYy.",
  ".yYYYy.yYcy.",
  "..yyy..yYYy.",
  "...g....yy..",
  "..lg....g...",
  "...g...gl...",
  "....g.g.....",
];
// Meadow flowers: three pink blooms.
const MEADOW = [
  "....pp......",
  "...pwwp.pp..",
  ".pp.pp.pwwp.",
  "pwwp.g..pp..",
  ".pp..g...g..",
  "..g..g..g...",
  "..lg.g.gl...",
  "...g.gg.....",
  "....ggg.....",
];
// Wilted: the heads hang down, brown and dull.
const WILTED = [
  "............",
  "............",
  "............",
  "...g...g....",
  "..g.g.g.g...",
  ".p...g...p..",
  "pwp..g..pwp.",
  ".p..g.g..p..",
  "....g.g.....",
];
const EMPTY9 = Array(9).fill("............");
const FLOWER_PAL = { y: "#f9c22e", Y: "#f0a020", c: "#6b3d1a", g: "#4c9a2a", l: "#7cc36a", p: "#e86aa0", w: "#fff3c4" };
const WILT_PAL = { g: "#8a7a3a", p: "#9a6a6a", w: "#c9a87a" };

export const VASES = {
  sunflower: { rows: [...SUNFLOWERS, ...VASE], pal: { ...FLOWER_PAL, ...VASE_PAL } },
  flower: { rows: [...MEADOW, ...VASE], pal: { ...FLOWER_PAL, ...VASE_PAL } },
  wilted: { rows: [...WILTED, ...VASE], pal: { ...WILT_PAL, ...VASE_PAL } },
  empty: { rows: [...EMPTY9, ...VASE], pal: VASE_PAL },
};

// A clear glass bowl heaped with blueberries; the empty one is just the glass.
const GLASS = { G: "#a8d8e8", H: "#ffffff" };
export const BERRY_BOWL = {
  rows: [
    "....bBbBbb....",
    "..bBubBbBuBb..",
    "GGGGGGGGGGGGGG",
    "GHBbBubBbBbBBG",
    ".GBbBbBbBubBG.",
    "..GbBbBbBbBG..",
    "...GGGGGGGG...",
    ".....GGGG.....",
  ],
  pal: { ...GLASS, b: "#3949ab", B: "#1a237e", u: "#7986cb" },
};
export const BERRY_BOWL_EMPTY = {
  rows: [
    "..............",
    "..............",
    "GGGGGGGGGGGGGG",
    "GH..........HG",
    ".G..........G.",
    "..G........G..",
    "...GGGGGGGG...",
    ".....GGGG.....",
  ],
  pal: GLASS,
};
// Purple salad: mixed purple and green leaves in a wooden bowl.
export const SALAD = {
  rows: [
    "...gP.pG.Pg...",
    ".PgGPpgPGpPgG.",
    "WWWWWWWWWWWWWW",
    "WwwwwwwwwwwwwW",
    ".WwwwwwwwwwwW.",
    "..WwwwwwwwwW..",
    "...WWWWWWWW...",
    "......WW......",
  ],
  pal: { P: "#7b3f9e", p: "#b07cc6", g: "#8bc34a", G: "#4c8a2a", W: "#7a4f2c", w: "#b0784a" },
};
export const SALAD_EMPTY = { rows: [".".repeat(14), ".".repeat(14), ...SALAD.rows.slice(2)], pal: SALAD.pal };
// Mint tea: a white cup, green tea, a leaf floating.
export const TEA = {
  rows: [
    "...mM...",
    "kkkkkk..",
    "kMmmMkkk",
    "kwwwwk.k",
    "kwwwwkkk",
    ".kkkk...",
  ],
  pal: { k: "#2a1f14", m: "#7cc36a", M: "#4c9a2a", w: "#f4f1e8" },
};
export const TEA_EMPTY = { rows: ["........", "kkkkkk..", "kWWWWkkk", ...TEA.rows.slice(3)], pal: { ...TEA.pal, W: "#cfc8b8" } };

// The stew pot. Seven chunks on the surface, one per pot crop; a crop that
// didn't make it leaves plain broth in its place, and the broth runs thin.
export const POT_SLOTS = ["tomato", "carrot", "bean", "pumpkin", "basil", "rosemary", "parsley"];
const CHUNK = { tomato: "t", carrot: "c", bean: "n", pumpkin: "u", basil: "a", rosemary: "r", parsley: "y" };
const POT_PAL = { k: "#1e1e24", P: "#4a4a52", p: "#6a6a74", t: "#e53935", c: "#f08a24", n: "#689f38", u: "#ffcc80", a: "#2e7d32", r: "#9fa8da", y: "#aed581", E: "#2a2a30" };
export function potMap(have = POT_SLOTS, { empty = false } = {}) {
  const S = empty ? "E" : "S";
  const ch = (id) => (empty ? "E" : have.includes(id) ? CHUNK[id] : "S");
  const [t, c, n, u, a, r, y] = POT_SLOTS.map(ch);
  const top = `${S}${t}${S}${S}${c}${S}${S}${n}${S}${S}${u}${S}`;
  const mid = `${S}${S}${a}${S}${S}${r}${S}${S}${y}${S}${S}${S}`;
  const full = have.length >= POT_SLOTS.length;
  return {
    rows: [
      "..kkkkkkkkkkkk..",
      `.k${top}k.`,
      `.k${mid}k.`,
      "kkkkkkkkkkkkkkkk",
      "kPPPPPPPPPPPPPPk",
      ".kPPPPPPPPPPPPk.",
      ".kPpPPPPPPPPPPk.",
      "..kPPPPPPPPPPk..",
      "...kk......kk...",
    ],
    pal: { ...POT_PAL, S: full ? "#b8482a" : "#c98a5a" },
  };
}

// His seed pouch: red tie, burlap.
export const POUCH = {
  rows: ["..kk..", ".kttk.", "kbbbbk", "kbBbbk", "kbbbbk", ".kkkk."],
  pal: { k: "#3d2814", t: "#c0504d", b: "#c99a5a", B: "#8a5a34" },
};

// The rating: a little stew bowl, full or empty.
export const RATING_BOWL = {
  rows: [".oSSSSo.", "kSoSSgSk", "kwwwwwwk", ".kwwwwk.", "..kkkk.."],
  pal: { o: "#f08a24", S: "#c0502a", g: "#7cc36a", k: "#2a1f14", w: "#f4f1e8" },
};
export const RATING_BOWL_EMPTY = {
  rows: ["........", "kEEEEEEk", "kwwwwwwk", ".kwwwwk.", "..kkkk.."],
  pal: { k: "#6b5a48", E: "#4a3c30", w: "#a89a88" },
};
