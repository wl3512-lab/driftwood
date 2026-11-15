// Writes the wizard story's sprite files from the pixel maps in
// v2/ui/story-art.js: v2/art/story/wizard.svg (Master Rowan) and pouch.svg.
// The dinner props are inlined by the screens from the same maps.
// They live in art/story/, not art/, because scripts/make-v2-art.mjs owns
// every top-level art/*.svg (v2/tests/art.test.js checks that).
//
//   node scripts/make-v2-story-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pixelSvg, ROWAN, POUCH } from "../v2/ui/story-art.js";

const OUT = process.env.ART_OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "v2", "art", "story");

export function storySvgs() {
  // A standalone file needs no class or CSS size variables.
  const file = (name, map) => [name, pixelSvg(map.rows, map.pal).replace(/ class="[^"]*" style="[^"]*"/, "") + "\n"];
  return Object.fromEntries([file("wizard", ROWAN), file("pouch", POUCH)]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  mkdirSync(OUT, { recursive: true });
  for (const [name, svg] of Object.entries(storySvgs())) writeFileSync(join(OUT, `${name}.svg`), svg);
  console.log(`wrote ${Object.keys(storySvgs()).join(", ")} → ${OUT}`);
}
