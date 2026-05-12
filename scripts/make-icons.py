#!/usr/bin/env python3
"""Generate JIGGO MAXXING app icon + splash icon (PNG).

iOS App Store icon: 1024×1024.
Splash icon: 200 wide (matches app.json imageWidth).
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/assets/images"
INK = (8, 8, 8)
ELEVATED = (20, 20, 20)
BRONZE = (176, 138, 90)
BRONZE_BRIGHT = (198, 161, 106)


def draw_icon(size: int, path: str, *, frame_inset_ratio: float = 0.16, mark_size_ratio: float = 0.48) -> None:
    img = Image.new("RGB", (size, size), INK)
    draw = ImageDraw.Draw(img)

    # Subtle dark gradient via repeated dark squares
    for i in range(8):
        a = 8 + i * 1
        draw.rectangle(
            (size * (0.0 + i * 0.005),
             size * (0.0 + i * 0.005),
             size * (1.0 - i * 0.005),
             size * (1.0 - i * 0.005)),
            outline=(a, a, a),
        )

    # Bronze frame (rounded square outline)
    inset = int(size * frame_inset_ratio)
    radius = int(size * 0.12)
    stroke = max(3, int(size * 0.018))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        outline=BRONZE,
        width=stroke,
    )

    # JM monogram
    font_path = None
    for candidate in [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial Black.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]:
        if os.path.exists(candidate):
            font_path = candidate
            break

    target_h = int(size * mark_size_ratio)
    if font_path:
        # Find the best size that fits target_h
        font = ImageFont.truetype(font_path, target_h)
        text = "JM"
        try:
            box = draw.textbbox((0, 0), text, font=font)
            w, h = box[2] - box[0], box[3] - box[1]
        except Exception:
            w, h = font.getsize(text)
        x = (size - w) // 2 - box[0]
        y = (size - h) // 2 - box[1]
        draw.text((x, y), text, font=font, fill=BRONZE)
    else:
        # Fallback simple geometric mark
        cx = size // 2
        cy = size // 2
        r = int(size * 0.18)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=BRONZE, width=stroke)

    img.save(path, "PNG")


def draw_adaptive_foreground(size: int, path: str) -> None:
    # Android foreground: monogram on transparent
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    inset = int(size * 0.22)
    radius = int(size * 0.08)
    stroke = max(3, int(size * 0.016))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        outline=BRONZE,
        width=stroke,
    )
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    if os.path.exists(font_path):
        font = ImageFont.truetype(font_path, int(size * 0.36))
        text = "JM"
        try:
            box = draw.textbbox((0, 0), text, font=font)
            w, h = box[2] - box[0], box[3] - box[1]
            x = (size - w) // 2 - box[0]
            y = (size - h) // 2 - box[1]
        except Exception:
            w, h = font.getsize(text)
            x = (size - w) // 2
            y = (size - h) // 2
        draw.text((x, y), text, font=font, fill=BRONZE)
    img.save(path, "PNG")


def draw_adaptive_background(size: int, path: str) -> None:
    img = Image.new("RGB", (size, size), INK)
    img.save(path, "PNG")


def draw_monochrome(size: int, path: str) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    inset = int(size * 0.22)
    radius = int(size * 0.08)
    stroke = max(3, int(size * 0.016))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        outline=(255, 255, 255, 230),
        width=stroke,
    )
    font_path = "/System/Library/Fonts/Helvetica.ttc"
    if os.path.exists(font_path):
        font = ImageFont.truetype(font_path, int(size * 0.36))
        text = "JM"
        try:
            box = draw.textbbox((0, 0), text, font=font)
            w, h = box[2] - box[0], box[3] - box[1]
            x = (size - w) // 2 - box[0]
            y = (size - h) // 2 - box[1]
        except Exception:
            w, h = font.getsize(text)
            x = (size - w) // 2
            y = (size - h) // 2
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 240))
    img.save(path, "PNG")


def draw_favicon(size: int, path: str) -> None:
    draw_icon(size, path, frame_inset_ratio=0.18, mark_size_ratio=0.5)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    # Main App Store icon
    draw_icon(1024, os.path.join(OUT, "icon.png"))
    # Splash (200×200 nominally, render at higher res so it scales)
    draw_icon(512, os.path.join(OUT, "splash-icon.png"), frame_inset_ratio=0.22, mark_size_ratio=0.42)
    # Android adaptive
    draw_adaptive_foreground(1024, os.path.join(OUT, "android-icon-foreground.png"))
    draw_adaptive_background(1024, os.path.join(OUT, "android-icon-background.png"))
    draw_monochrome(1024, os.path.join(OUT, "android-icon-monochrome.png"))
    # Favicon
    draw_favicon(48, os.path.join(OUT, "favicon.png"))
    print(f"icons written to {OUT}")


if __name__ == "__main__":
    main()
