#!/usr/bin/env bash
# Build the deck HTML and print it to PDF with headless Chrome.
#   scripts/export-deck.sh  →  docs/Driftwood_UX_Deck.pdf
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build-deck.py
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
[ -n "$CHROME" ] || { echo "Chrome not found"; exit 1; }
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=15000 \
  --print-to-pdf="$PWD/docs/Driftwood_UX_Deck.pdf" \
  "file://$PWD/docs/deck/driftwood-deck.html?print=1" 2>/dev/null
echo "→ docs/Driftwood_UX_Deck.pdf ($(du -h docs/Driftwood_UX_Deck.pdf | cut -f1))"
