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
mkdir -p "$OUT/icons" "$OUT/bg interface 1" "$OUT/docs"

cp index.html sketch.js style.css chat-particles.js sw.js manifest.webmanifest \
   training-room.svg driftwood_cover_v4.html postit-behavior-log.html \
   case-study.html README.md "$OUT/"
cp .nojekyll "$OUT/" 2>/dev/null || true
cp icons/*.svg icons/*.png "$OUT/icons/"
# v2 (redesign). Tests, the Node-only package.json and the art sheet stay out of the player bundle.
rsync -a --exclude 'tests' --exclude 'package.json' --exclude 'art/sheet.html' v2/ "$OUT/v2/"
cp "bg interface 1"/*.svg "$OUT/bg interface 1/"
# QA evidence (docs/agent-playtest) and design specs (docs/superpowers) stay out
# of the bundle — tens of MB of screenshots, plus notes for unbuilt work, that
# players would otherwise download inside the itch.io zip.
[ -d docs ] && rsync -a --exclude 'agent-playtest' --exclude 'superpowers' docs/ "$OUT/docs/" || true

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
