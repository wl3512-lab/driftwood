#!/usr/bin/env python3
"""Build docs/deck/driftwood-deck.html from the .src.html template.

Replaces {{GLYPH:name|caption[|tone]}} with the real 16x16 glyph bodies from
sketch.js, so the deck shows the shipped glyph set rather than a redrawing.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "docs/deck/driftwood-deck.src.html").read_text()
sketch = (ROOT / "sketch.js").read_text()

# PIXEL_GLYPHS = { name: '<rect.../>' + '<rect.../>', ... }
block = sketch[sketch.index("const PIXEL_GLYPHS = {"):]
block = block[:block.index("\n};") + 3]
glyphs = {}
for m in re.finditer(r'^\s*"?([a-z-]+)"?:\s*\n?((?:\s*\'[^\']*\'\s*\+?\s*\n?)+)', block, re.M):
    name = m.group(1)
    body = "".join(re.findall(r"'([^']*)'", m.group(2)))
    glyphs[name] = body


def glyph(m):
    parts = m.group(1).split("|")
    name, cap = parts[0], parts[1]
    tone = parts[2] if len(parts) > 2 else ""
    body = glyphs.get(name)
    if body is None:
        raise SystemExit(f"glyph not found: {name}")
    return (f'<figure><svg viewBox="0 0 16 16" class="{tone}" aria-hidden="true">{body}</svg>'
            f'<figcaption>{cap}</figcaption></figure>')


out = re.sub(r"\{\{GLYPH:([^}]+)\}\}", glyph, src)
(ROOT / "docs/deck/driftwood-deck.html").write_text(out)
print(f"deck built with {len(glyphs)} glyphs available")
