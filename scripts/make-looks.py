#!/usr/bin/env python3
"""Generate 12 editorial color-block 'look' covers from each Look's palette.

These are intentional abstract compositions — not real outfit photography
but evoke a curated editorial card. Three-band vertical split with a
soft inner shadow + a small monogram corner. Each Look gets a unique seed
so the composition stays consistent across builds.
"""
import os
import math
from random import Random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "looks")

LOOKS = [
    ("l1",  ["#E7DFCC", "#5C4A38", "#0A0A0A"]),
    ("l2",  ["#3B3A36", "#F2EDE4", "#0A0A0A"]),
    ("l3",  ["#7A6A52", "#1F2A36", "#5C4A38"]),
    ("l4",  ["#26312B", "#1F2A36", "#A89F8B"]),
    ("l5",  ["#B08A5A", "#0A0A0A", "#F2EDE4"]),
    ("l6",  ["#22354C", "#8E8174", "#1C1C1C"]),
    ("l7",  ["#E7DFCC", "#C7BDA7", "#F2EDE4"]),
    ("l8",  ["#1F2A36", "#FFFFFF", "#3B3A36"]),
    ("l9",  ["#3B5347", "#1C1C1C", "#8E8174"]),
    ("l10", ["#7A3527", "#1F2A36", "#E7DFCC"]),
    ("l11", ["#0A0A0A", "#1C1C1C", "#B08A5A"]),
    ("l12", ["#22354C", "#1F2A36", "#FFFFFF"]),
    # v3 expansion — 12 more curated palettes
    ("l13", ["#0A0A0A", "#7A6A52", "#A89F8B"]),  # workwear evening
    ("l14", ["#F2EDE4", "#A89F8B", "#5C4A38"]),  # off-white cream stack
    ("l15", ["#1F2A36", "#3B5347", "#C7BDA7"]),  # navy + pine + bone
    ("l16", ["#5C2D24", "#0A0A0A", "#E7DFCC"]),  # cognac + jet + cream
    ("l17", ["#3B3A36", "#7A3527", "#0A0A0A"]),  # slate + rust formal
    ("l18", ["#FFFFFF", "#0A0A0A", "#B08A5A"]),  # white + jet + bronze
    ("l19", ["#26312B", "#7A6A52", "#0A0A0A"]),  # forest khaki
    ("l20", ["#8E8174", "#1F2A36", "#F2EDE4"]),  # stone navy ivory
    ("l21", ["#2E2A24", "#A89F8B", "#1C1C1C"]),  # espresso sand
    ("l22", ["#C7BDA7", "#3B3A36", "#B08A5A"]),  # bone slate bronze
    ("l23", ["#22354C", "#0A0A0A", "#5C4A38"]),  # indigo jet walnut
    ("l24", ["#7A3527", "#26312B", "#F2EDE4"]),  # rust forest ivory
]


def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def render_look(seed: str, palette: list, out_path: str, size=(800, 1000)) -> None:
    w, h = size
    rng = Random(seed)
    img = Image.new("RGB", (w, h), (10, 10, 10))
    draw = ImageDraw.Draw(img)

    # Three vertical or horizontal bands depending on seed
    horizontal = rng.random() < 0.4
    split1 = rng.randint(int((w if not horizontal else h) * 0.28),
                         int((w if not horizontal else h) * 0.45))
    split2 = rng.randint(int((w if not horizontal else h) * 0.60),
                         int((w if not horizontal else h) * 0.78))

    if not horizontal:
        draw.rectangle((0, 0, split1, h), fill=hex_to_rgb(palette[0]))
        draw.rectangle((split1, 0, split2, h), fill=hex_to_rgb(palette[1 % len(palette)]))
        draw.rectangle((split2, 0, w, h), fill=hex_to_rgb(palette[2 % len(palette)]))
    else:
        draw.rectangle((0, 0, w, split1), fill=hex_to_rgb(palette[0]))
        draw.rectangle((0, split1, w, split2), fill=hex_to_rgb(palette[1 % len(palette)]))
        draw.rectangle((0, split2, w, h), fill=hex_to_rgb(palette[2 % len(palette)]))

    # Soft inner vignette — radial dark overlay
    vignette = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    cx, cy = w // 2, h // 2
    rad = int(max(w, h) * 0.7)
    for r in range(rad, rad - 220, -10):
        a = int(((rad - r) / 220) * 78)
        vd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=a)
    vignette = vignette.filter(ImageFilter.GaussianBlur(60))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    img = Image.composite(dark, img, vignette)

    # Film grain
    grain = Image.effect_noise((w, h), 14).convert("L")
    grain = grain.filter(ImageFilter.GaussianBlur(0.6))
    grain_rgb = Image.merge("RGB", (grain, grain, grain))
    img = Image.blend(img, grain_rgb, 0.045)

    draw = ImageDraw.Draw(img)

    # Subtle JM monogram bottom-right
    font_path = "/System/Library/Fonts/HelveticaNeue.ttc"
    if os.path.exists(font_path):
        font = ImageFont.truetype(font_path, 28)
        draw.text((w - 64, h - 60), "JM", font=font, fill=(176, 138, 90, 230))

    img.save(out_path, "PNG", optimize=True)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for lid, palette in LOOKS:
        out = os.path.join(OUT, f"{lid}.png")
        render_look(lid, palette, out)
    print(f"Rendered {len(LOOKS)} look covers to {OUT}")


if __name__ == "__main__":
    main()
