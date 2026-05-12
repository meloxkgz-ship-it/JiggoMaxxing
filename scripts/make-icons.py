#!/usr/bin/env python3
"""Generate JIGGO MAXXING app icon + splash icon (PNG).

iOS App Store icon: 1024×1024.
Splash icon: 200 wide (matches app.json imageWidth).
"""
import os
from typing import Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/assets/images"
INK = (8, 8, 8)
ELEVATED = (20, 20, 20)
BRONZE = (176, 138, 90)
BRONZE_BRIGHT = (198, 161, 106)


def find_font(prefer_thin: bool = False) -> Optional[str]:
    candidates = (
        [
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/System/Library/Fonts/Avenir Next.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        if prefer_thin
        else [
            "/Library/Fonts/Arial Black.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/HelveticaNeue.ttc",
        ]
    )
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def draw_text_letter(draw, ch: str, font, x: int, y: int, color):
    """Draw a single letter at exact (x, y) — left/top-anchored."""
    try:
        box = draw.textbbox((0, 0), ch, font=font)
        draw.text((x - box[0], y - box[1]), ch, font=font, fill=color)
        return box[2] - box[0], box[3] - box[1]
    except Exception:
        w, h = font.getsize(ch)
        draw.text((x, y), ch, font=font, fill=color)
        return w, h


def draw_icon(size: int, path: str, *, frame_inset_ratio: float = 0.16, mark_size_ratio: float = 0.34) -> None:
    img = Image.new("RGB", (size, size), INK)
    draw = ImageDraw.Draw(img)

    # Faint bronze sheen — diagonal gradient sketch via overlay rectangles
    for i in range(6):
        a = 14 + i
        draw.rectangle(
            (size * (0.02 + i * 0.005),
             size * (0.02 + i * 0.005),
             size * (0.98 - i * 0.005),
             size * (0.98 - i * 0.005)),
            outline=(a, a, a),
        )

    # Bronze frame (rounded square outline)
    inset = int(size * frame_inset_ratio)
    radius = int(size * 0.13)
    stroke = max(3, int(size * 0.022))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        outline=BRONZE,
        width=stroke,
    )

    # JM monogram — draw letters separately with comfortable kerning
    font_path = find_font(prefer_thin=True)
    target_h = int(size * mark_size_ratio)
    if font_path:
        font = ImageFont.truetype(font_path, target_h)
        # measure widths of each letter
        box_j = draw.textbbox((0, 0), "J", font=font)
        box_m = draw.textbbox((0, 0), "M", font=font)
        wj, hj = box_j[2] - box_j[0], box_j[3] - box_j[1]
        wm, hm = box_m[2] - box_m[0], box_m[3] - box_m[1]
        kern = int(size * 0.045)  # generous breathing room between letters
        total_w = wj + kern + wm
        total_h = max(hj, hm)
        x_start = (size - total_w) // 2
        y_top = (size - total_h) // 2
        draw_text_letter(draw, "J", font, x_start, y_top + (total_h - hj) // 2, BRONZE)
        draw_text_letter(draw, "M", font, x_start + wj + kern, y_top + (total_h - hm) // 2, BRONZE)
    else:
        cx = size // 2
        cy = size // 2
        r = int(size * 0.18)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=BRONZE, width=stroke)

    img.save(path, "PNG")


def draw_adaptive_foreground(size: int, path: str) -> None:
    # Android foreground: monogram with kerning on transparent
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    inset = int(size * 0.24)
    radius = int(size * 0.08)
    stroke = max(3, int(size * 0.018))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        outline=BRONZE,
        width=stroke,
    )
    font_path = find_font()
    if font_path:
        font = ImageFont.truetype(font_path, int(size * 0.34))
        box_j = draw.textbbox((0, 0), "J", font=font)
        box_m = draw.textbbox((0, 0), "M", font=font)
        wj, hj = box_j[2] - box_j[0], box_j[3] - box_j[1]
        wm, hm = box_m[2] - box_m[0], box_m[3] - box_m[1]
        kern = int(size * 0.045)
        total_w = wj + kern + wm
        total_h = max(hj, hm)
        x = (size - total_w) // 2
        y = (size - total_h) // 2
        draw_text_letter(draw, "J", font, x, y + (total_h - hj) // 2, BRONZE)
        draw_text_letter(draw, "M", font, x + wj + kern, y + (total_h - hm) // 2, BRONZE)
    img.save(path, "PNG")


def draw_adaptive_background(size: int, path: str) -> None:
    img = Image.new("RGB", (size, size), INK)
    img.save(path, "PNG")


def draw_monochrome(size: int, path: str) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    inset = int(size * 0.24)
    radius = int(size * 0.08)
    stroke = max(3, int(size * 0.018))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        outline=(255, 255, 255, 230),
        width=stroke,
    )
    font_path = find_font()
    if font_path:
        font = ImageFont.truetype(font_path, int(size * 0.34))
        box_j = draw.textbbox((0, 0), "J", font=font)
        box_m = draw.textbbox((0, 0), "M", font=font)
        wj, hj = box_j[2] - box_j[0], box_j[3] - box_j[1]
        wm, hm = box_m[2] - box_m[0], box_m[3] - box_m[1]
        kern = int(size * 0.045)
        total_w = wj + kern + wm
        total_h = max(hj, hm)
        x = (size - total_w) // 2
        y = (size - total_h) // 2
        white = (255, 255, 255, 240)
        draw_text_letter(draw, "J", font, x, y + (total_h - hj) // 2, white)
        draw_text_letter(draw, "M", font, x + wj + kern, y + (total_h - hm) // 2, white)
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
