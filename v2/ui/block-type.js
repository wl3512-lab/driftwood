// Heavy block lettering for titles: one 5×7 letter grid, each column doubled
// so the strokes read heavy, with a stepped drop shadow. Every cell is its own
// <rect>, so a title can build in cell by cell (left to right, a little
// jitter) instead of just appearing. Chosen in
// docs/design-options/2026-11-13-almanac-cutscene (B's letters, A's build-in).
//
//   blockTitle("FALSE\nMEMORY", { fill: "#3b2a1a", shadow: "#ffb347", build: true })
//
// The SVG is decorative (aria-hidden): put the words in real text beside it.

export const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", "..#..", "..#..", ".#..."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

// True when every character of text has a block letter (names with accents
// or emoji fall back to plain text).
export function canBlock(text) {
  return [...String(text ?? "").toUpperCase()].every((ch) => ch === "\n" || Object.hasOwn(GLYPHS, ch));
}

const ADVANCE = 7; // 6 heavy columns + 1 gap
const LINE = 10; // 7 rows + 3 gap

// Same jitter every time for the same cell, so a title builds the same way
// twice and tests can pin it down.
function jitter(i) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// The cells of `text` (newlines break lines) on the heavy grid. Pure: no DOM.
// → { width, height, cells: [{ x, y, line, delay }] }, delay in seconds.
export function blockCells(text, { align = "left" } = {}) {
  const lines = String(text ?? "").toUpperCase().split("\n");
  const width = Math.max(1, ...lines.map((l) => l.length)) * ADVANCE - 1;
  const height = lines.length * LINE - 3;
  const cells = [];
  lines.forEach((line, li) => {
    const ox = align === "center" ? (width - (line.length * ADVANCE - 1)) / 2 : 0;
    [...line].forEach((ch, ci) => {
      const g = GLYPHS[ch] || GLYPHS[" "];
      for (let y = 0; y < 7; y++) {
        const row = [...g[y]].map((c) => c === "#");
        for (let x = 0; x < 6; x++) {
          if (!(row[x] || row[x - 1])) continue; // each column doubled
          const X = ox + ci * ADVANCE + x;
          const Y = li * LINE + y;
          const delay = X * 0.011 + li * 0.08 + jitter(cells.length) * 0.16;
          cells.push({ x: X, y: Y, line: li, delay: Math.round(delay * 1000) / 1000 });
        }
      }
    });
  });
  return { width, height, cells };
}

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

// An <svg class="block-type"> of `text`. `build` adds the cell build-in,
// starting `base` seconds after it is inserted (CSS: .block-type--build).
export function blockTitle(text, { fill = "currentColor", shadow = null, align = "left", build = false, base = 0, className = "" } = {}) {
  const { width, height, cells } = blockCells(text, { align });
  const pad = shadow ? 0.7 : 0.2;
  const svg = el("svg", {
    class: `block-type${build ? " block-type--build" : ""}${className ? ` ${className}` : ""}`,
    viewBox: `-0.2 -0.2 ${width + pad} ${height + pad}`,
    preserveAspectRatio: align === "center" ? "xMidYMid meet" : "xMinYMid meet",
    "aria-hidden": "true", focusable: "false",
  });
  svg.style.setProperty("--base", `${base}s`);
  const layer = (color, off) => {
    const g = el("g", { fill: color });
    for (const c of cells) {
      // 1.04: neighbouring cells overlap a hair so the letters read solid.
      const r = el("rect", { class: "cell", x: c.x + off, y: c.y + off, width: 1.04, height: 1.04 });
      if (build) r.style.setProperty("--d", `${c.delay}s`);
      g.append(r);
    }
    return g;
  };
  if (shadow) svg.append(layer(shadow, 0.5));
  svg.append(layer(fill, 0));
  return svg;
}

// The children of a heading set in block letters: the drawing, plus the words
// themselves (visually hidden) for screen readers, search and tests. Text with
// a character the grid can't draw stays plain words.
export function blockText(text, opts = {}) {
  const words = String(text ?? "");
  if (!canBlock(words)) return [words];
  const label = document.createElement("span");
  label.className = "sr-only";
  label.textContent = words;
  return [blockTitle(words, opts), label];
}
