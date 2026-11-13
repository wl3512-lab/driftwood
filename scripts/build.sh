#!/usr/bin/env bash
# Assemble the playable bundle.
#
#   scripts/build.sh            → _site/            (what GitHub Pages deploys)
#   scripts/build.sh --zip      → dist/driftwood-web.zip  (upload to itch.io as an HTML game)
#
# One file list, used by both, so the itch build can never drift from the
# Pages build. No bundler: the game is plain HTML/CSS/JS.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="_site"
rm -rf "$OUT"
mkdir -p "$OUT/icons"

# Only the v2 game is published. The old game's files (sketch.js, style.css,
# case study, deck…) stay in the repo but are no longer part of the site.
cp index.html sw.js manifest.webmanifest README.md "$OUT/"
cp .nojekyll "$OUT/" 2>/dev/null || true
cp icons/*.svg icons/*.png "$OUT/icons/"
# v2 (redesign). Tests, the Node-only package.json and the art sheet stay out of the player bundle.
rsync -a --exclude 'tests' --exclude 'package.json' --exclude 'art/sheet.html' v2/ "$OUT/v2/"

echo "bundle → $OUT ($(du -sh "$OUT" | cut -f1))"

if [ "${1:-}" = "--zip" ]; then
  mkdir -p dist
  ZIP="dist/driftwood-web.zip"
  rm -f "$ZIP"
  (cd "$OUT" && zip -qr "../$ZIP" . -x ".DS_Store")
  echo "itch.io upload → $ZIP ($(du -sh "$ZIP" | cut -f1))"
  echo "itch settings: Kind of project = HTML · ✓ This file will be played in the browser"
  echo "               Viewport 1280×720 · ✓ Fullscreen button · ✓ Mobile friendly (landscape)"
fi
