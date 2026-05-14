#!/usr/bin/env python3
"""Generate the JIGGO app icon set from the master logo render.

The master is `assets/images/icon-source.png` — the premium debossed "JIGGO"
wordmark (engraved into dark anodised metal, bronze rim-light, warm vignette).
Everything else is derived from it so the set stays in lockstep with one file.

Outputs (assets/images/):
  icon.png                      1024  iOS / App Store, opaque RGB, gently tightened
  splash-icon.png               1024  full master (dark vignette blends with the splash bg)
  android-icon-foreground.png   1024  padded wordmark, transparent margin for the mask
  android-icon-background.png   1024  solid ink
  android-icon-monochrome.png   1024  high-contrast wordmark silhouette
  favicon.png                     64  tightened crop
"""
import os
from PIL import Image, ImageOps

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/assets/images"
SRC = os.path.join(OUT, "icon-source.png")
INK_EDGE = (6, 5, 4)


def load_src():
    return Image.open(SRC).convert("RGB")


def center_crop_square(img, frac):
    """Keep the centre `frac` of the (square) image."""
    w, h = img.size
    s = int(min(w, h) * frac)
    x, y = (w - s) // 2, (h - s) // 2
    return img.crop((x, y, x + s, y + s))


def main():
    src = load_src()

    # iOS / App Store icon — gentle 0.84 crop lifts the wordmark off the dead
    # margin without losing the raking light + vignette that make it premium.
    icon = center_crop_square(src, 0.84).resize((1024, 1024), Image.LANCZOS)
    icon.save(os.path.join(OUT, "icon.png"))  # RGB, no alpha — App Review requires it

    # Splash — the full master. Its vignetted corners fall to near-#080808, so
    # it blends into the splash background instead of showing a hard square.
    src.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, "splash-icon.png"))

    # Favicon — same crop as the icon, small.
    center_crop_square(src, 0.84).resize((64, 64), Image.LANCZOS).save(
        os.path.join(OUT, "favicon.png")
    )

    # Android adaptive — foreground gets extra padding so the launcher mask
    # can't clip the wordmark; background is solid ink.
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    inner = center_crop_square(src, 0.84).resize((660, 660), Image.LANCZOS)
    fg.paste(inner, ((1024 - 660) // 2, (1024 - 660) // 2))
    fg.save(os.path.join(OUT, "android-icon-foreground.png"))
    Image.new("RGB", (1024, 1024), INK_EDGE).save(
        os.path.join(OUT, "android-icon-background.png")
    )

    # Monochrome (Android 13+ themed icon) — high-contrast silhouette of the
    # wordmark on transparent.
    gray = ImageOps.grayscale(center_crop_square(src, 0.84).resize((1024, 1024), Image.LANCZOS))
    gray = ImageOps.autocontrast(gray, cutoff=2)
    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mono.putdata([(255, 255, 255, v) for v in gray.getdata()])
    mono.save(os.path.join(OUT, "android-icon-monochrome.png"))

    print(f"icons written to {OUT} (from {os.path.basename(SRC)})")


if __name__ == "__main__":
    main()
