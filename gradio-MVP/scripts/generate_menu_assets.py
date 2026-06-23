from __future__ import annotations

import math
from pathlib import Path
import random
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "menu"
W, H = 900, 650
SCALE = 2


BASES = [
    ("B1", "Thin Crust", "#d9974b", "#f6d69e", "slim crisp rim"),
    ("B2", "Thick Crust", "#bd7431", "#f2c783", "deep raised edge"),
    ("B3", "Cheese Burst", "#c6782f", "#ffd266", "molten cheese ring"),
    ("B4", "Whole Wheat", "#a66d3d", "#c7925c", "warm wheat grain"),
    ("B5", "Multigrain", "#9a6338", "#d0a06b", "seeded nutty crust"),
]

PIZZAS = [
    ("P1", "Classic Margherita", ["mozzarella", "basil"]),
    ("P2", "Farmhouse Veg", ["pepper", "onion", "mushroom", "corn"]),
    ("P3", "Paneer Tikka", ["paneer", "pepper", "onion", "tikka"]),
    ("P4", "Tandoori Paneer", ["tandoori_paneer", "pepper", "onion"]),
    ("P5", "Spicy Veg Fiesta", ["pepper", "corn", "jalapeno", "paprika"]),
    ("P6", "Veggie Supreme", ["olive", "pepper", "mushroom", "corn", "onion"]),
    ("P7", "Barbecue Chicken", ["bbq_chicken", "onion", "bbq"]),
    ("P8", "Chicken Tikka", ["chicken_tikka", "pepper", "onion", "tikka"]),
]

TOPPINGS = [
    ("T1", "Extra Cheese", "cheese"),
    ("T2", "Onion", "onion"),
    ("T3", "Green Capsicum", "pepper"),
    ("T4", "Tomato", "tomato"),
    ("T5", "Golden Corn", "corn"),
    ("T6", "Jalapeno", "jalapeno"),
    ("T7", "Black Olives", "olive"),
    ("T8", "Mushroom", "mushroom"),
    ("T9", "Red Paprika", "paprika"),
    ("T10", "Paneer", "paneer"),
    ("T11", "Baby Corn", "baby_corn"),
    ("T12", "Green Chilli", "chilli"),
    ("T13", "Tandoori Paneer", "tandoori_paneer"),
    ("T14", "Barbecue Chicken", "bbq_chicken"),
    ("T15", "Chicken Tikka", "chicken_tikka"),
    ("T16", "Chicken Sausage", "sausage"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size * SCALE)
    return ImageFont.load_default()


def canvas(seed: int) -> tuple[Image.Image, ImageDraw.ImageDraw, random.Random]:
    rng = random.Random(seed)
    img = Image.new("RGB", (W * SCALE, H * SCALE), "#f6f0e7")
    draw = ImageDraw.Draw(img)
    for _ in range(1800):
        x = rng.randrange(W * SCALE)
        y = rng.randrange(H * SCALE)
        shade = rng.randrange(-10, 12)
        base = 242 + shade
        draw.point((x, y), fill=(base, max(220, base - 14), max(196, base - 38)))
    return img, draw, rng


def ellipse_shadow(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], alpha: int = 75) -> None:
    layer = Image.new("RGBA", (W * SCALE, H * SCALE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(box, fill=(35, 24, 15, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(28 * SCALE))
    draw.bitmap((0, 0), layer, fill=None)


def draw_plate(draw: ImageDraw.ImageDraw) -> tuple[int, int, int, int]:
    box = (150 * SCALE, 72 * SCALE, 750 * SCALE, 580 * SCALE)
    ellipse_shadow(draw, (158 * SCALE, 108 * SCALE, 760 * SCALE, 594 * SCALE), 60)
    draw.ellipse(box, fill="#ebe1d2", outline="#cdbfae", width=3 * SCALE)
    draw.ellipse((185 * SCALE, 105 * SCALE, 715 * SCALE, 550 * SCALE), fill="#f8f3ea", outline="#dfd0be", width=2 * SCALE)
    return box


def draw_crust_base(draw: ImageDraw.ImageDraw, rim: str, center: str, width: int = 54, speckles: bool = False) -> None:
    draw_plate(draw)
    outer = (220 * SCALE, 118 * SCALE, 680 * SCALE, 535 * SCALE)
    inner_offset = width * SCALE
    inner = (
        outer[0] + inner_offset,
        outer[1] + inner_offset,
        outer[2] - inner_offset,
        outer[3] - inner_offset,
    )
    draw.ellipse(outer, fill=rim, outline="#7d3f20", width=3 * SCALE)
    draw.ellipse(inner, fill=center)
    rng = random.Random(hash((rim, center)) & 0xFFFF)
    for _ in range(140):
        x = rng.randint(outer[0] + 20 * SCALE, outer[2] - 20 * SCALE)
        y = rng.randint(outer[1] + 20 * SCALE, outer[3] - 20 * SCALE)
        rx = rng.randint(2, 8) * SCALE
        color = rng.choice(["#b66c31", "#e8b163", "#8e522d", "#f5d795"])
        draw.ellipse((x - rx, y - rx // 2, x + rx, y + rx // 2), fill=color)
    if speckles:
        for _ in range(210):
            x = rng.randint(inner[0], inner[2])
            y = rng.randint(inner[1], inner[3])
            draw.ellipse((x, y, x + 3 * SCALE, y + 3 * SCALE), fill=rng.choice(["#654321", "#8b5a2b", "#f1d394"]))


def draw_slice_label(draw: ImageDraw.ImageDraw, code: str, name: str, note: str) -> None:
    draw.rounded_rectangle((40 * SCALE, 42 * SCALE, 250 * SCALE, 108 * SCALE), radius=20 * SCALE, fill="#171717")
    draw.text((62 * SCALE, 55 * SCALE), code, font=font(20, True), fill="#ffffff")
    draw.text((60 * SCALE, 570 * SCALE), name, font=font(30, True), fill="#191919")
    draw.text((60 * SCALE, 608 * SCALE), note, font=font(16), fill="#66584d")


def draw_base_asset(code: str, name: str, rim: str, center: str, note: str) -> None:
    img, draw, _ = canvas(abs(hash(code)) & 0xFFFF)
    draw_crust_base(draw, rim, center, width=36 if "Thin" in name else 62, speckles=name in {"Whole Wheat", "Multigrain"})
    if name == "Cheese Burst":
        draw.ellipse((248 * SCALE, 148 * SCALE, 652 * SCALE, 505 * SCALE), outline="#ffe183", width=18 * SCALE)
        draw.arc((250 * SCALE, 150 * SCALE, 650 * SCALE, 505 * SCALE), 205, 330, fill="#fff3ad", width=8 * SCALE)
    if name == "Thick Crust":
        draw.ellipse((210 * SCALE, 105 * SCALE, 690 * SCALE, 548 * SCALE), outline="#8d441e", width=8 * SCALE)
    draw_slice_label(draw, code, name, note)
    save(img, f"{code}.jpg")


def draw_pizza_base(draw: ImageDraw.ImageDraw, deep: bool = False) -> tuple[int, int, int, int]:
    draw_plate(draw)
    outer = (205 * SCALE, 95 * SCALE, 695 * SCALE, 560 * SCALE)
    if deep:
        draw.ellipse((195 * SCALE, 90 * SCALE, 705 * SCALE, 570 * SCALE), fill="#8b451f")
        draw.ellipse(outer, fill="#d8883a")
        sauce = (245 * SCALE, 132 * SCALE, 655 * SCALE, 520 * SCALE)
    else:
        draw.ellipse(outer, fill="#c97930", outline="#7f3c18", width=4 * SCALE)
        sauce = (232 * SCALE, 123 * SCALE, 668 * SCALE, 535 * SCALE)
    draw.ellipse(sauce, fill="#b93420")
    draw.ellipse((sauce[0] + 15 * SCALE, sauce[1] + 14 * SCALE, sauce[2] - 15 * SCALE, sauce[3] - 14 * SCALE), fill="#e7b957")
    return sauce


def spot(draw: ImageDraw.ImageDraw, x: int, y: int, r: int, fill: str, outline: str | None = None) -> None:
    draw.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=outline)


def scatter(draw: ImageDraw.ImageDraw, rng: random.Random, sauce: tuple[int, int, int, int], kind: str, count: int) -> None:
    width = sauce[2] - sauce[0]
    height = sauce[3] - sauce[1]
    margin = min(35 * SCALE, max(0, width // 2 - 2 * SCALE), max(0, height // 2 - 2 * SCALE))
    for _ in range(count):
        min_x, max_x = sauce[0] + margin, sauce[2] - margin
        min_y, max_y = sauce[1] + margin, sauce[3] - margin
        x = rng.randint(min_x, max_x) if min_x <= max_x else (sauce[0] + sauce[2]) // 2
        y = rng.randint(min_y, max_y) if min_y <= max_y else (sauce[1] + sauce[3]) // 2
        max_radius = max(5 * SCALE, min(width, height) // 2)
        r = min(rng.randint(9, 22) * SCALE, max_radius)
        if kind == "mozzarella":
            spot(draw, x, y, r, rng.choice(["#fff5ce", "#f8e2a0", "#fff9df"]))
        elif kind == "basil":
            draw.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill="#236b3b")
            draw.line((x - r // 2, y, x + r // 2, y), fill="#d8efc8", width=1 * SCALE)
        elif kind == "pepperoni":
            spot(draw, x, y, r, "#b62824", "#7d1715")
            spot(draw, x - r // 3, y - r // 5, max(2 * SCALE, r // 7), "#e87455")
        elif kind == "olive":
            spot(draw, x, y, r, "#171717")
            spot(draw, x, y, max(3 * SCALE, r // 3), "#d7c07a")
        elif kind == "feta":
            draw.rounded_rectangle((x - r, y - r, x + r, y + r), radius=4 * SCALE, fill="#fff4dd")
        elif kind == "pepper":
            draw.arc((x - r, y - r, x + r, y + r), 20, 300, fill="#2c9b55", width=6 * SCALE)
        elif kind == "onion":
            draw.arc((x - r, y - r, x + r, y + r), 0, 300, fill="#7b3f93", width=5 * SCALE)
        elif kind == "mushroom":
            draw.pieslice((x - r, y - r, x + r, y + r), 180, 360, fill="#c4a27a")
            draw.rectangle((x - r // 4, y, x + r // 4, y + r), fill="#e8d2b8")
        elif kind == "corn":
            spot(draw, x, y, max(6 * SCALE, r // 2), "#f6c849")
        elif kind == "jalapeno":
            draw.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill="#317a34", outline="#1f5122", width=2 * SCALE)
            draw.ellipse((x - r // 2, y - r // 4, x + r // 2, y + r // 4), fill="#d5e6a2")
            spot(draw, x + r // 4, y, max(2 * SCALE, r // 8), "#f7e8a7")
        elif kind == "tomato":
            draw.rounded_rectangle((x - r, y - r // 3, x + r, y + r // 3), radius=8 * SCALE, fill="#9f2d23")
            draw.line((x - r + 4 * SCALE, y, x + r - 4 * SCALE, y), fill="#e75b40", width=2 * SCALE)
        elif kind == "paprika":
            draw.arc((x - r, y - r, x + r, y + r), 20, 300, fill="#c92821", width=7 * SCALE)
            draw.arc((x - r // 2, y - r // 2, x + r // 2, y + r // 2), 205, 35, fill="#f28b32", width=4 * SCALE)
        elif kind == "baby_corn":
            draw.rounded_rectangle((x - r, y - r // 3, x + r, y + r // 3), radius=8 * SCALE, fill="#ffe17a", outline="#d9aa34", width=2 * SCALE)
            draw.line((x - r + 5 * SCALE, y, x + r - 5 * SCALE, y), fill="#fff3b5", width=2 * SCALE)
        elif kind == "chilli":
            draw.arc((x - r, y - r // 2, x + r, y + r // 2), 190, 20, fill="#15803d", width=7 * SCALE)
            spot(draw, x + r // 2, y - r // 4, max(2 * SCALE, r // 8), "#0f5f2c")
        elif kind == "garlic":
            draw.pieslice((x - r, y - r, x + r, y + r), 45, 315, fill="#f7ead0", outline="#d2b58d")
            spot(draw, x + r // 5, y - r // 5, max(2 * SCALE, r // 8), "#c89457")
        elif kind == "chicken":
            draw.rounded_rectangle((x - r, y - r // 2, x + r, y + r // 2), radius=7 * SCALE, fill="#d99555")
        elif kind == "paneer":
            draw.rounded_rectangle((x - r, y - r, x + r, y + r), radius=5 * SCALE, fill="#ffe7b0")
            draw.line((x - r, y - r, x + r, y + r), fill="#e25a2a", width=3 * SCALE)
        elif kind == "tandoori_paneer":
            draw.rounded_rectangle((x - r, y - r, x + r, y + r), radius=5 * SCALE, fill="#ffd49a", outline="#c83b1d", width=3 * SCALE)
            draw.line((x - r, y - r // 2, x + r, y + r // 2), fill="#e14a25", width=4 * SCALE)
            spot(draw, x + r // 3, y - r // 3, max(2 * SCALE, r // 8), "#f8f0c5")
        elif kind == "bbq":
            draw.arc((x - r * 2, y - r, x + r * 2, y + r), 0, 180, fill="#6b2a1a", width=5 * SCALE)
        elif kind == "tikka":
            draw.arc((x - r, y - r, x + r, y + r), 45, 250, fill="#e14a25", width=5 * SCALE)
        elif kind == "sauce_ladle":
            draw.arc((x - r * 2, y - r, x + r * 2, y + r), 0, 300, fill="#ad251e", width=8 * SCALE)
        elif kind == "cheese":
            draw.line((x - r, y, x + r, y - r), fill="#fff1a8", width=6 * SCALE)
        elif kind == "peri":
            draw.arc((x - r * 2, y - r, x + r * 2, y + r), 185, 345, fill="#e13f1f", width=5 * SCALE)
        elif kind == "bbq_chicken":
            draw.rounded_rectangle((x - r, y - r // 2, x + r, y + r // 2), radius=7 * SCALE, fill="#c98344")
            draw.arc((x - r * 2, y - r, x + r * 2, y + r), 185, 345, fill="#633019", width=4 * SCALE)
        elif kind == "chicken_tikka":
            draw.rounded_rectangle((x - r, y - r // 2, x + r, y + r // 2), radius=7 * SCALE, fill="#df6d32")
            draw.line((x - r, y, x + r, y - r // 3), fill="#a9271c", width=3 * SCALE)
        elif kind == "sausage":
            draw.rounded_rectangle((x - r, y - r // 3, x + r, y + r // 3), radius=9 * SCALE, fill="#b84a35", outline="#7a281e", width=2 * SCALE)
            spot(draw, x - r // 3, y, max(2 * SCALE, r // 9), "#f3a07d")


def draw_pizza_asset(code: str, name: str, toppings: Iterable[str]) -> None:
    img, draw, rng = canvas(abs(hash(code)) & 0xFFFF)
    deep = "deep" in toppings
    sauce = draw_pizza_base(draw, deep=deep)
    for kind in toppings:
        if kind == "deep":
            continue
        scatter(draw, rng, sauce, kind, 10 if kind in {"mozzarella", "pepperoni"} else 7)
    for _ in range(20):
        scatter(draw, rng, sauce, "mozzarella", 1)
    draw_slice_label(draw, code, name, "signature pizza")
    save(img, f"{code}.jpg")


def draw_topping_asset(code: str, name: str, kind: str) -> None:
    img, draw, rng = canvas(abs(hash(code)) & 0xFFFF)
    draw.rounded_rectangle((120 * SCALE, 80 * SCALE, 780 * SCALE, 520 * SCALE), radius=54 * SCALE, fill="#e8ded0", outline="#c5b5a2", width=3 * SCALE)
    draw.rounded_rectangle((165 * SCALE, 118 * SCALE, 735 * SCALE, 480 * SCALE), radius=42 * SCALE, fill="#fbf7ef")
    area = (180 * SCALE, 130 * SCALE, 720 * SCALE, 470 * SCALE)
    for _ in range(34):
        x = rng.randint(area[0], area[2])
        y = rng.randint(area[1], area[3])
        r = rng.randint(13, 34) * SCALE
        scatter(draw, rng, (x - r, y - r, x + r, y + r), kind, 1)
    if kind == "cheese":
        for _ in range(58):
            x = rng.randint(area[0], area[2])
            y = rng.randint(area[1], area[3])
            draw.rounded_rectangle((x, y, x + rng.randint(45, 90) * SCALE, y + 9 * SCALE), radius=4 * SCALE, fill=rng.choice(["#fff3b0", "#ffd66c", "#fff8d8"]))
    if kind == "peri":
        for offset in range(0, 300, 34):
            draw.arc((230 * SCALE + offset * SCALE, 195 * SCALE, 430 * SCALE + offset * SCALE, 390 * SCALE), 190, 345, fill="#e13f1f", width=16 * SCALE)
    draw_slice_label(draw, code, name, "add-on topping")
    save(img, f"{code}.jpg")


def save(img: Image.Image, filename: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.3, percent=110))
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    img.save(OUT_DIR / filename, quality=92, optimize=True)


def main() -> None:
    for item in BASES:
        draw_base_asset(*item)
    for item in PIZZAS:
        draw_pizza_asset(*item)
    print(f"wrote {len(list(OUT_DIR.glob('*.jpg')))} assets to {OUT_DIR}")


if __name__ == "__main__":
    main()
