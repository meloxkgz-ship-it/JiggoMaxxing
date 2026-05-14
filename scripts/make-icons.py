#!/usr/bin/env python3
"""Generate the JIGGO MAXXING app icon set — premium dark-luxury treatment.

Design language: jet-black warm radial field, a Futura-Bold "JM" monogram
rendered in brushed-bronze (vertical metallic gradient + emboss), no inner
frame. iOS rounds the corners itself, so the source is a full-bleed square.

Outputs (assets/images/):
  icon.png                      1024  iOS / App Store, opaque RGB
  splash-icon.png                512  mark-only on transparent (expo splash)
  android-icon-foreground.png   1024  mark + soft pad, transparent
  android-icon-background.png   1024  solid ink
  android-icon-monochrome.png   1024  mark in white, transparent
  favicon.png                     64  small opaque RGB
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/assets/images"

# --- palette -----------------------------------------------------------------
INK_CENTER = (26, 21, 14)     # warm near-black, glows behind the mark
INK_EDGE   = (6, 5, 4)        # cooler near-black at the corners
GLOW       = (150, 112, 64)   # bronze haze behind the monogram

# brushed-bronze vertical gradient stops (top -> bottom)
METAL = [
    (0.00, (250, 233, 198)),  # near-white catch-light on the top edge
    (0.14, (230, 198, 142)),  # bright gold
    (0.42, (193, 150, 96)),   # brand bronze
    (0.72, (150, 108, 64)),   # mid shadow
    (1.00, (116, 80, 48)),    # deep base
]

FUTURA = "/System/Library/Fonts/Futura.ttc"   # index 2 = Futura Bold


# --- gradient helpers --------------------------------------------------------
def radial_bg(size, center, edge, falloff=1.35):
    """Warm radial field: `center` colour in the middle easing to `edge`."""
    base = Image.radial_gradient("L").resize((size, size), Image.BICUBIC)
    if falloff != 1.0:
        base = base.point(lambda v: int(255 * ((v / 255) ** falloff)))
    return Image.composite(
        Image.new("RGB", (size, size), edge),
        Image.new("RGB", (size, size), center),
        base,
    )


def vgradient(w, h, stops):
    """Vertical multi-stop gradient as an RGB image."""
    col = Image.new("RGB", (1, h))
    px = col.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if t <= p1 or i == len(stops) - 2:
                f = 0 if p1 == p0 else max(0.0, min(1.0, (t - p0) / (p1 - p0)))
                px[0, y] = tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(3))
                break
    return col.resize((w, h))


# --- monogram ----------------------------------------------------------------
def mark_mask(size, height_ratio, kern_ratio):
    """White 'JM' monogram on a black L-mask, optically centred."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    font = ImageFont.truetype(FUTURA, int(size * height_ratio), index=2)  # Bold

    bj = d.textbbox((0, 0), "J", font=font)
    bm = d.textbbox((0, 0), "M", font=font)
    wj, hj = bj[2] - bj[0], bj[3] - bj[1]
    wm, hm = bm[2] - bm[0], bm[3] - bm[1]
    kern = int(size * kern_ratio)
    total_w = wj + kern + wm
    total_h = max(hj, hm)
    x = (size - total_w) // 2
    y = (size - total_h) // 2

    d.text((x - bj[0], y + (total_h - hj) // 2 - bj[1]), "J", font=font, fill=255)
    d.text((x + wj + kern - bm[0], y + (total_h - hm) // 2 - bm[1]), "M", font=font, fill=255)
    return mask


def metal_mark(size, height_ratio=0.38, kern_ratio=0.05):
    """RGBA monogram filled with the brushed-bronze gradient; transparent elsewhere."""
    mask = mark_mask(size, height_ratio, kern_ratio)
    bbox = mask.getbbox()
    grad = Image.new("RGB", (size, size), METAL[-1][1])
    grad.paste(vgradient(size, bbox[3] - bbox[1], METAL), (0, bbox[1]))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(grad, (0, 0), mask)
    return layer, mask


# --- compositions ------------------------------------------------------------
def build_icon(size):
    """Full opaque app icon: radial field + bronze haze + floor shadow + monogram."""
    img = radial_bg(size, INK_CENTER, INK_EDGE).convert("RGBA")
    layer, mask = metal_mark(size)

    # bronze haze behind the mark
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow.paste(GLOW + (255,), (0, 0), mask)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.055))
    glow.putalpha(glow.getchannel("A").point(lambda v: int(v * 0.42)))
    img = Image.alpha_composite(img, glow)

    # soft floor shadow — the mark sits a hair above the field
    drop = max(2, int(size * 0.016))
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sm = mask.transform(
        (size, size), Image.AFFINE, (1, 0, 0, 0, 1, -drop), resample=Image.BICUBIC
    ).filter(ImageFilter.GaussianBlur(size * 0.02))
    shadow.paste((2, 1, 0, 255), (0, 0), sm)
    shadow.putalpha(shadow.getchannel("A").point(lambda v: int(v * 0.55)))
    img = Image.alpha_composite(img, shadow)

    img = Image.alpha_composite(img, layer)
    return img.convert("RGB")


def build_mark_only(size, height_ratio=0.46):
    layer, _ = metal_mark(size, height_ratio=height_ratio)
    return layer


def main():
    os.makedirs(OUT, exist_ok=True)

    build_icon(1024).save(os.path.join(OUT, "icon.png"))
    build_mark_only(512, height_ratio=0.40).save(os.path.join(OUT, "splash-icon.png"))
    build_mark_only(1024, height_ratio=0.34).save(os.path.join(OUT, "android-icon-foreground.png"))
    Image.new("RGB", (1024, 1024), INK_EDGE).save(os.path.join(OUT, "android-icon-background.png"))

    # monochrome — mark silhouette in white
    _, mask = metal_mark(1024, height_ratio=0.34)
    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mono.paste((255, 255, 255, 240), (0, 0), mask)
    mono.save(os.path.join(OUT, "android-icon-monochrome.png"))

    build_icon(64).save(os.path.join(OUT, "favicon.png"))
    print(f"icons written to {OUT}")


if __name__ == "__main__":
    main()
