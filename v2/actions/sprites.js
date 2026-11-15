// Small pixel sprites for the hands-on actions, drawn as inline SVG on demand
// (nothing is built until an action needs it). One character per pixel; each
// letter is a colour from PAL, "." is empty.
const SVG = "http://www.w3.org/2000/svg";

const PAL = {
  k: "#2b1d14", // outline
  w: "#f4ecd8", // paper / glint
  g: "#9aa3a8", s: "#cfd6da", // steel
  b: "#8a5a2b", n: "#5e3b1c", // wood / soil
  h: "#f2c48d", H: "#d79a62", // hand
  r: "#d84a3c", R: "#9b2a22", // red
  p: "#6b3fa0", P: "#3f2466", // berry
  e: "#5aa83a", E: "#2f6e22", // leaf
  y: "#f6c945", // seed / arrow
  c: "#4aa3df", C: "#2a6fa8", // water
  o: "#e98a2c",
};

const GRIDS = {
  trowel: [
    "......kk",
    ".....kbk",
    "....kbk.",
    "...kgk..",
    ".kkssk..",
    "kssssk..",
    "ksssk...",
    ".kkk....",
  ],
  hand: [
    "..k.k.k.",
    ".khkhkhk",
    ".khkhkhk",
    "kkhhhhhk",
    "khhhhhhk",
    "kHhhhhHk",
    ".kHhhHk.",
    "..kkkk..",
  ],
  spray: [
    "..kkk...",
    ".kgggkkk",
    ".kkgk.c.",
    ".kcck...",
    "kcccck..",
    "kcwcck..",
    "kcccck..",
    ".kkkk...",
  ],
  bug: [
    ".k...k..",
    "..k.k...",
    ".kEEEk..",
    "kEeeeEk.",
    "kEeEeEk.",
    "kEeeeEk.",
    ".kEEEk..",
    "k.k.k.k.",
  ],
  berry: [
    "...ee...",
    "..eEe...",
    ".kpppk..",
    "kpwpppk.",
    "kppppPk.",
    "kpppPPk.",
    ".kPPPk..",
    "..kkk...",
  ],
  fruit: [
    "...e....",
    "..eEe...",
    ".krrrk..",
    "krwrrrk.",
    "krrrrRk.",
    "krrrRRk.",
    ".kRRRk..",
    "..kkk...",
  ],
  weed: [
    "e.....e.",
    "Ee...eE.",
    ".Ee.eE..",
    "..EeE...",
    "e..E..e.",
    "Ee.E.eE.",
    ".EeEeE..",
    "...E....",
  ],
  leaf: [
    "....kk..",
    "...keEk.",
    "..keeEk.",
    ".keeEk..",
    ".keEk...",
    "keEk....",
    "kEk.....",
    ".k......",
  ],
  snips: [
    "k.....k.",
    "ks...sk.",
    ".ks.sk..",
    "..kgk...",
    "..kgk...",
    ".krkrk..",
    "krrkrrk.",
    ".kk.kk..",
  ],
  stone: [
    "........",
    "..kkkk..",
    ".kssggk.",
    "ksssgggk",
    "kssggggk",
    "kgggggk.",
    ".kkkkk..",
    "........",
  ],
  seed: [".k.", "kyk", "kyk", ".k."],
  drop: [".c.", "ccc", "cCc", ".c."],
  clod: [".nn.", "nbbn", "nbnn", ".nn."],
  arrow: [
    "..kkkk..",
    "..kyyk..",
    "..kyyk..",
    "kkkyykkk",
    "kyyyyyyk",
    ".kyyyyk.",
    "..kyyk..",
    "...kk...",
  ],
};

export function sprite(name, { size = 32, cls = "" } = {}) {
  const grid = GRIDS[name];
  const svg = document.createElementNS(SVG, "svg");
  if (!grid) return svg;
  const w = Math.max(...grid.map((r) => r.length));
  svg.setAttribute("viewBox", `0 0 ${w} ${grid.length}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", Math.round(size * grid.length / w));
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `px${cls ? ` ${cls}` : ""}`);
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!PAL[ch]) return;
    const r = document.createElementNS(SVG, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y);
    r.setAttribute("width", 1); r.setAttribute("height", 1);
    r.setAttribute("fill", PAL[ch]);
    svg.append(r);
  }));
  return svg;
}

export const hasSprite = (name) => name in GRIDS;

// A built-in pixel sprite by name, else the level art v2/art/<name>.svg.
const ALIAS = { can: "watering-can", label: "plant-label", packet: "seed-packet" };
// v2/art/<name>.svg (aliases above); a path ("./x.svg", "../art/x.svg") is used as given.
export const artUrl = (name) => (/[/.]/.test(name) ? name : new URL(`../art/${ALIAS[name] || name}.svg`, import.meta.url).href);
export function art(name, { size = 32, cls = "" } = {}) {
  if (hasSprite(name)) return sprite(name, { size, cls });
  const img = document.createElement("img");
  img.src = artUrl(name);
  img.width = size; img.height = size; img.alt = "";
  if (cls) img.className = cls;
  return img;
}
