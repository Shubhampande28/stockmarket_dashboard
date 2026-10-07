"""Daily mood card image: 1200x630 PNG for og:image (brief sec 8.1).

Deviation from the brief: Archivo/Public Sans TTF files aren't bundled in
backend/assets/fonts/ yet (binary font files couldn't be fetched in this
build pass -- see docs/REVAMP_NOTES.md). This falls back to Pillow's
built-in default font when the bundled files are missing, so image
generation still works; drop real TTFs into backend/assets/fonts/ later to
match the brand type exactly.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import config

IST = timezone(timedelta(hours=5, minutes=30))
FONTS_DIR = config.BASE_DIR / "assets" / "fonts"
WIDTH, HEIGHT = 1200, 630

ZONE_COLORS = {
    "Extreme Fear": "#B3121F", "Fear": "#F26B3A", "Neutral": "#F2B33D",
    "Greed": "#62BD82", "Extreme Greed": "#0F9158",
}
ACCENT = (225, 29, 46)
ACCENT_DEEP = (168, 15, 28)


def _font(name, size):
    path = FONTS_DIR / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size) if hasattr(ImageFont, "load_default") else ImageFont.load_default()


def _wrap(text, max_chars):
    words = text.split()
    lines, line = [], ""
    for w in words:
        if len(line) + len(w) + 1 > max_chars:
            lines.append(line)
            line = w
        else:
            line = (line + " " + w).strip()
    if line:
        lines.append(line)
    return lines[:2]


def render_card(date, score, zone, headline):
    img = Image.new("RGB", (WIDTH, HEIGHT), ACCENT_DEEP)
    draw = ImageDraw.Draw(img)

    for y in range(HEIGHT):
        t = y / HEIGHT
        r = int(ACCENT[0] + (ACCENT_DEEP[0] - ACCENT[0]) * t)
        g = int(ACCENT[1] + (ACCENT_DEEP[1] - ACCENT[1]) * t)
        b = int(ACCENT[2] + (ACCENT_DEEP[2] - ACCENT[2]) * t)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

    label_font = _font("PublicSans-Regular.ttf", 32)
    score_font = _font("Archivo-Black.ttf", 180)
    zone_font = _font("Archivo-Black.ttf", 72)
    headline_font = _font("PublicSans-Regular.ttf", 30)
    footer_font = _font("PublicSans-Regular.ttf", 26)

    draw.text((60, 50), f"Market mood · {date}", font=label_font, fill="white")
    draw.text((60, 140), str(score), font=score_font, fill="white")
    draw.text((60, 340), zone.upper(), font=zone_font, fill="white")

    y = 440
    for line in _wrap(headline, 60):
        draw.text((60, y), line, font=headline_font, fill="white")
        y += 40

    draw.text((60, HEIGHT - 60), "equilytics.in", font=footer_font, fill="white")
    return img


def generate_today():
    import store
    date = datetime.now(IST).strftime("%Y-%m-%d")
    mood_result = store.get_mood(date, "close") or store.latest_mood()
    if not mood_result:
        return None
    headline = mood_result.get("headline") or ""
    img = render_card(date, mood_result["score"], mood_result["zone"], headline)

    config.OG_DIR.mkdir(parents=True, exist_ok=True)
    out_path = config.OG_DIR / f"{date}.png"
    img.save(out_path, "PNG")
    latest_path = config.OG_DIR / "latest.png"
    img.save(latest_path, "PNG")
    return out_path
