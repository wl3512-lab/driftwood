#!/usr/bin/env python3
"""Rasterize the 16x16 pixel favicon into PWA / home-screen / link-preview PNGs.

The favicon is a grid of <rect> elements on a 16-unit canvas, so no SVG
renderer is needed: each rect becomes a scaled block. Run from repo root:

    python3 scripts/make-icons.py

Outputs into icons/:
    app-icon-192.png, app-icon-512.png   manifest icons (any)
    app-icon-maskable-512.png            manifest icon (maskable, padded)
    app-icon-180.png                     apple-touch-icon
    og-cover.png                         1200x630 link preview
"""
import re
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "icons" / "mood-garden-favicon.svg"
OUT = ROOT / "icons"
BG = (5, 8, 5, 255)

RECT = re.compile(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#[0-9a-fA-F]{6})"')


def read_rects():
    svg = SRC.read_text()
    vb = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg)
    grid = int(vb.group(1)) if vb else 16
    return grid, [(int(x), int(y), int(w), int(h), fill) for x, y, w, h, fill in RECT.findall(svg)]


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def render(size, pad_ratio=0.0, background=BG):
    grid, rects = read_rects()
    img = Image.new("RGBA", (size, size), background)
    draw = ImageDraw.Draw(img)
    pad = int(size * pad_ratio)
    cell = (size - 2 * pad) / grid
    for x, y, w, h, fill in rects:
        x0 = pad + round(x * cell)
        y0 = pad + round(y * cell)
        x1 = pad + round((x + w) * cell)
        y1 = pad + round((y + h) * cell)
        draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill=hex_rgb(fill) + (255,))
    return img


def render_cover(w=1200, h=630):
    img = Image.new("RGBA", (w, h), BG)
    # faint grid, like the certificate
    draw = ImageDraw.Draw(img)
    for x in range(0, w, 32):
        draw.line([(x, 0), (x, h)], fill=(0, 230, 118, 8))
    for y in range(0, h, 32):
        draw.line([(0, y), (w, y)], fill=(0, 230, 118, 8))
    icon = render(400, background=(0, 0, 0, 0))
    img.alpha_composite(icon, ((w - 400) // 2, (h - 400) // 2 - 20))
    # wordmark bar under the icon; the page's own og:title carries the words
    bar_w, bar_h = 260, 6
    draw.rectangle([(w - bar_w) // 2, h - 120, (w + bar_w) // 2, h - 120 + bar_h], fill=(0, 230, 118, 180))
    return img


def main():
    OUT.mkdir(exist_ok=True)
    render(192).save(OUT / "app-icon-192.png")
    render(512).save(OUT / "app-icon-512.png")
    render(512, pad_ratio=0.18).save(OUT / "app-icon-maskable-512.png")
    render(180, pad_ratio=0.08).save(OUT / "app-icon-180.png")
    render_cover().convert("RGB").save(OUT / "og-cover.png", optimize=True)
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
