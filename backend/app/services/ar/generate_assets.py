import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


def create_asset_dirs(base_path: Path):
    dirs = [
        base_path / "face-accessories" / "bunny",
        base_path / "face-accessories" / "glasses",
        base_path / "face-accessories" / "crown",
        base_path / "face-accessories" / "cat",
        base_path / "face-accessories" / "ribbon",
        base_path / "face-decorations" / "blush",
        base_path / "face-decorations" / "hearts",
        base_path / "face-decorations" / "bandaid",
        base_path / "floating" / "stars",
        base_path / "floating" / "glitter",
        base_path / "decorative" / "flowers",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def draw_bunny_ears(path: Path):
    """Generate high-res cute pink bunny ears with white fluff and central bow."""
    size = (600, 450)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Left Ear Outer (Pink)
    draw.polygon([(140, 380), (100, 180), (120, 50), (190, 40), (220, 160), (200, 380)], fill=(255, 182, 193, 245), outline=(244, 114, 182, 255), width=6)
    # Left Ear Inner (Deep Pink)
    draw.polygon([(150, 340), (125, 180), (140, 75), (180, 70), (195, 170), (185, 340)], fill=(251, 113, 133, 220))

    # Right Ear Outer (Tilted Pink)
    draw.polygon([(400, 380), (380, 160), (410, 40), (480, 50), (500, 180), (460, 380)], fill=(255, 182, 193, 245), outline=(244, 114, 182, 255), width=6)
    # Right Ear Inner (Deep Pink)
    draw.polygon([(415, 340), (405, 170), (420, 70), (460, 75), (475, 180), (450, 340)], fill=(251, 113, 133, 220))

    # Central cute bow tie
    # Bow left loop
    draw.polygon([(300, 370), (240, 340), (235, 410)], fill=(244, 114, 182, 250), outline=(225, 29, 72, 255), width=4)
    # Bow right loop
    draw.polygon([(300, 370), (360, 340), (365, 410)], fill=(244, 114, 182, 250), outline=(225, 29, 72, 255), width=4)
    # Bow center knot
    draw.ellipse([285, 355, 315, 385], fill=(255, 255, 255, 255), outline=(244, 114, 182, 255), width=4)

    im.save(path, format="PNG")


def draw_cute_glasses(path: Path):
    """Generate round golden wire-frame glasses with light pink lens tint."""
    size = (600, 240)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Left Lens (Soft Pink Glass tint)
    draw.ellipse([70, 40, 250, 210], fill=(255, 228, 230, 90), outline=(234, 179, 8, 255), width=8)
    # Left Lens Highlight reflection
    draw.arc([90, 60, 230, 190], start=210, end=260, fill=(255, 255, 255, 200), width=6)

    # Right Lens
    draw.ellipse([350, 40, 530, 210], fill=(255, 228, 230, 90), outline=(234, 179, 8, 255), width=8)
    # Right Lens Highlight reflection
    draw.arc([370, 60, 510, 190], start=210, end=260, fill=(255, 255, 255, 200), width=6)

    # Bridge
    draw.arc([235, 100, 365, 140], start=200, end=340, fill=(234, 179, 8, 255), width=8)

    # Small decorative stars on temple hinges
    draw.ellipse([50, 110, 70, 130], fill=(251, 191, 36, 255))
    draw.ellipse([530, 110, 550, 130], fill=(251, 191, 36, 255))

    im.save(path, format="PNG")


def draw_princess_crown(path: Path):
    """Generate glittering gold princess mini-crown with rubies and pearls."""
    size = (480, 320)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    crown_points = [
        (80, 250),
        (100, 130),
        (170, 190),
        (240, 80),   # Center peak
        (310, 190),
        (380, 130),
        (400, 250),
    ]
    draw.polygon(crown_points, fill=(251, 191, 36, 250), outline=(217, 119, 6, 255), width=6)

    # Base band
    draw.rounded_rectangle([70, 240, 410, 275], radius=8, fill=(245, 158, 11, 255), outline=(180, 83, 9, 255), width=4)

    # Jewels on peaks
    peaks = [(100, 130), (170, 190), (240, 80), (310, 190), (380, 130)]
    for px, py in peaks:
        draw.ellipse([px - 14, py - 14, px + 14, py + 14], fill=(255, 255, 255, 255), outline=(234, 179, 8, 255), width=4)
        draw.ellipse([px - 8, py - 8, px + 8, py + 8], fill=(244, 63, 94, 255))

    im.save(path, format="PNG")


def draw_cat_ears(path: Path):
    """Generate playful kitty ears with soft pink inner fluff and whiskers."""
    size = (540, 340)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Left Kitty Ear
    draw.polygon([(110, 280), (80, 60), (240, 200)], fill=(63, 61, 86, 255), outline=(244, 114, 182, 255), width=5)
    draw.polygon([(125, 250), (105, 95), (215, 200)], fill=(251, 164, 178, 240))

    # Right Kitty Ear
    draw.polygon([(430, 280), (460, 60), (300, 200)], fill=(63, 61, 86, 255), outline=(244, 114, 182, 255), width=5)
    draw.polygon([(415, 250), (435, 95), (325, 200)], fill=(251, 164, 178, 240))

    im.save(path, format="PNG")


def draw_pastel_blush(path: Path):
    """Generate soft radial gradient blush for cheeks."""
    size = (200, 200)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    cx, cy = 100, 100
    r_max = 75

    for r in range(r_max, 0, -2):
        alpha = int(140 * (1.0 - (r / r_max) ** 1.3))
        ImageDraw.Draw(im).ellipse([cx - r, cy - int(r * 0.75), cx + r, cy + int(r * 0.75)], fill=(255, 110, 140, alpha))

    # Add 3 subtle cute anime sparkle dots
    draw = ImageDraw.Draw(im)
    draw.ellipse([cx - 30, cy - 10, cx - 24, cy - 4], fill=(255, 255, 255, 200))
    draw.ellipse([cx + 25, cy - 8, cx + 33, cy], fill=(255, 255, 255, 220))
    draw.ellipse([cx + 5, cy + 15, cx + 11, cy + 21], fill=(255, 255, 255, 190))

    im = im.filter(ImageFilter.GaussianBlur(radius=4))
    im.save(path, format="PNG")


def draw_cheek_hearts(path: Path):
    """Generate pair of sweet pastel pink hearts with white shimmer."""
    size = (180, 180)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    def draw_heart(ox, oy, scale):
        pts = []
        for deg in range(0, 360, 5):
            t = math.radians(deg)
            x = 16 * (math.sin(t) ** 3)
            y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
            pts.append((ox + x * scale, oy + y * scale))
        draw.polygon(pts, fill=(244, 114, 182, 240), outline=(225, 29, 72, 255), width=3)
        # Highlight
        draw.ellipse([ox - 10 * scale, oy - 10 * scale, ox - 4 * scale, oy - 4 * scale], fill=(255, 255, 255, 230))

    draw_heart(90, 85, 3.8)
    im.save(path, format="PNG")


def draw_cute_bandaid(path: Path):
    """Generate cute anime pastel bandaid with heart."""
    size = (280, 100)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Base bandaid
    draw.rounded_rectangle([20, 20, 260, 80], radius=24, fill=(254, 215, 170, 250), outline=(251, 146, 60, 255), width=4)
    # Center pad
    draw.rounded_rectangle([90, 24, 190, 76], radius=8, fill=(255, 247, 237, 255), outline=(253, 186, 116, 255), width=2)
    # Center mini red heart
    cx, cy = 140, 50
    pts = []
    for deg in range(0, 360, 6):
        t = math.radians(deg)
        x = 16 * (math.sin(t) ** 3)
        y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
        pts.append((cx + x * 0.9, cy + y * 0.9))
    draw.polygon(pts, fill=(244, 63, 94, 255))

    im.save(path, format="PNG")


def draw_floating_stars(path: Path):
    """Generate cluster of golden sparkle stars."""
    size = (360, 360)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    def draw_star4(cx, cy, r_outer, r_inner, color):
        pts = []
        for i in range(8):
            angle = i * math.pi / 4
            r = r_outer if i % 2 == 0 else r_inner
            pts.append((cx + r * math.sin(angle), cy - r * math.cos(angle)))
        draw.polygon(pts, fill=color)

    draw_star4(180, 180, 90, 24, (251, 191, 36, 255))
    draw_star4(70, 80, 45, 12, (253, 224, 71, 235))
    draw_star4(280, 90, 38, 10, (254, 240, 138, 240))
    draw_star4(100, 280, 34, 9, (253, 224, 71, 230))
    draw_star4(290, 260, 48, 13, (251, 191, 36, 240))

    im.save(path, format="PNG")


def draw_magical_glitter(path: Path):
    """Generate twinkling fairy glitter sparkles."""
    size = (320, 320)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    positions = [
        (160, 160, 60, (244, 114, 182, 255)),
        (60, 80, 35, (251, 191, 36, 250)),
        (250, 70, 40, (192, 132, 252, 250)),
        (80, 240, 30, (96, 165, 250, 240)),
        (240, 250, 45, (244, 114, 182, 250)),
    ]
    for cx, cy, sz, col in positions:
        draw.line([cx - sz, cy, cx + sz, cy], fill=col, width=4)
        draw.line([cx, cy - sz, cx, cy + sz], fill=col, width=4)
        draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 255, 255, 255))

    im.save(path, format="PNG")


def draw_sakura_petals(path: Path):
    """Generate soft pink cherry blossom sakura petals."""
    size = (300, 300)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    def draw_petal(ox, oy, angle, scale):
        pts = [
            (0, -35), (14, -25), (18, 5), (0, 35), (-18, 5), (-14, -25), (0, -35)
        ]
        rad = math.radians(angle)
        rot_pts = []
        for x, y in pts:
            rx = (x * math.cos(rad) - y * math.sin(rad)) * scale + ox
            ry = (x * math.sin(rad) + y * math.cos(rad)) * scale + oy
            rot_pts.append((rx, ry))
        draw.polygon(rot_pts, fill=(255, 182, 193, 230), outline=(244, 114, 182, 255), width=2)

    draw_petal(150, 140, 25, 2.2)
    draw_petal(70, 70, -40, 1.4)
    draw_petal(230, 80, 60, 1.6)
    draw_petal(80, 230, 80, 1.3)
    draw_petal(220, 220, -15, 1.8)

    im.save(path, format="PNG")


def draw_sweet_ribbon(path: Path):
    """Generate silk bow ribbon for hair / forehead."""
    size = (400, 220)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Left Loop
    draw.polygon([(200, 110), (90, 40), (70, 130), (100, 170), (200, 110)], fill=(244, 114, 182, 250), outline=(225, 29, 72, 255), width=5)
    # Right Loop
    draw.polygon([(200, 110), (310, 40), (330, 130), (300, 170), (200, 110)], fill=(244, 114, 182, 250), outline=(225, 29, 72, 255), width=5)

    # Tails
    draw.polygon([(185, 120), (140, 210), (170, 195), (195, 120)], fill=(251, 113, 133, 250), outline=(225, 29, 72, 255), width=3)
    draw.polygon([(215, 120), (260, 210), (230, 195), (205, 120)], fill=(251, 113, 133, 250), outline=(225, 29, 72, 255), width=3)

    # Knot
    draw.ellipse([175, 85, 225, 135], fill=(255, 241, 242, 255), outline=(225, 29, 72, 255), width=4)

    im.save(path, format="PNG")


def build_manifest(base_path: Path):
    manifest = {
        "version": "1.0",
        "name": "Sweet Studio AR Overlay Assets",
        "description": "Comprehensive sticker and AR overlay catalog for Sweet Studio Photobooth",
        "assets": [
            {
                "id": "pink_bunny",
                "name": "Pink Bunny Ears",
                "category": "face-accessories",
                "type": "face-anchored",
                "asset": "face-accessories/bunny/pink_bunny.png",
                "anchor": "head_top",
                "placement": {
                    "scale": 1.45,
                    "offset_x": 0.0,
                    "offset_y": -0.15,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 1.0,
                    "z_index": 20,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "cute_glasses",
                "name": "Golden Circle Glasses",
                "category": "face-accessories",
                "type": "face-anchored",
                "asset": "face-accessories/glasses/cute_glasses.png",
                "anchor": "eyes_center",
                "placement": {
                    "scale": 1.15,
                    "offset_x": 0.0,
                    "offset_y": 0.0,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 0.95,
                    "z_index": 30,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "princess_crown",
                "name": "Princess Crown",
                "category": "face-accessories",
                "type": "face-anchored",
                "asset": "face-accessories/crown/princess_crown.png",
                "anchor": "head_top",
                "placement": {
                    "scale": 1.1,
                    "offset_x": 0.0,
                    "offset_y": -0.11,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 1.0,
                    "z_index": 25,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "cat_ears",
                "name": "Playful Kitty Ears",
                "category": "face-accessories",
                "type": "face-anchored",
                "asset": "face-accessories/cat/cat_ears.png",
                "anchor": "head_top",
                "placement": {
                    "scale": 1.35,
                    "offset_x": 0.0,
                    "offset_y": -0.12,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 1.0,
                    "z_index": 20,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "sweet_ribbon",
                "name": "Sweet Silk Ribbon",
                "category": "face-accessories",
                "type": "face-anchored",
                "asset": "face-accessories/ribbon/sweet_ribbon.png",
                "anchor": "forehead",
                "placement": {
                    "scale": 0.95,
                    "offset_x": 0.0,
                    "offset_y": -0.06,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 1.0,
                    "z_index": 22,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "pastel_blush_left",
                "name": "Pastel Cheek Blush (L)",
                "category": "face-decorations",
                "type": "face-anchored",
                "asset": "face-decorations/blush/pastel_blush.png",
                "anchor": "left_cheek",
                "placement": {
                    "scale": 0.55,
                    "offset_x": 0.0,
                    "offset_y": 0.0,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 0.85,
                    "z_index": 12,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "pastel_blush_right",
                "name": "Pastel Cheek Blush (R)",
                "category": "face-decorations",
                "type": "face-anchored",
                "asset": "face-decorations/blush/pastel_blush.png",
                "anchor": "right_cheek",
                "placement": {
                    "scale": 0.55,
                    "offset_x": 0.0,
                    "offset_y": 0.0,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 0.85,
                    "z_index": 12,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "cheek_hearts",
                "name": "Cheek Sweet Hearts",
                "category": "face-decorations",
                "type": "face-anchored",
                "asset": "face-decorations/hearts/cheek_hearts.png",
                "anchor": "right_cheek",
                "placement": {
                    "scale": 0.45,
                    "offset_x": 0.02,
                    "offset_y": 0.0,
                    "rotation_offset": 12.0
                },
                "render": {
                    "opacity": 0.95,
                    "z_index": 35,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "cute_bandaid",
                "name": "Heart Anime Bandaid",
                "category": "face-decorations",
                "type": "face-anchored",
                "anchor": "nose",
                "asset": "face-decorations/bandaid/cute_bandaid.png",
                "placement": {
                    "scale": 0.65,
                    "offset_x": 0.0,
                    "offset_y": -0.02,
                    "rotation_offset": -8.0
                },
                "render": {
                    "opacity": 0.95,
                    "z_index": 38,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "floating_stars",
                "name": "Golden Sparkle Stars",
                "category": "floating",
                "type": "random-scatter",
                "asset": "floating/stars/floating_stars.png",
                "placement": {
                    "scale": 0.85,
                    "offset_x": 0.0,
                    "offset_y": 0.0,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 0.90,
                    "z_index": 15,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "magical_glitter",
                "name": "Magical Fairy Glitter",
                "category": "floating",
                "type": "random-scatter",
                "asset": "floating/glitter/magical_glitter.png",
                "placement": {
                    "scale": 0.9,
                    "offset_x": 0.0,
                    "offset_y": 0.0,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 0.92,
                    "z_index": 16,
                    "fit": "contain"
                },
                "enabled": True
            },
            {
                "id": "sakura_petals",
                "name": "Sakura Blossom Petals",
                "category": "decorative",
                "type": "random-scatter",
                "asset": "decorative/flowers/sakura_petals.png",
                "placement": {
                    "scale": 0.85,
                    "offset_x": 0.0,
                    "offset_y": 0.0,
                    "rotation_offset": 0.0
                },
                "render": {
                    "opacity": 0.88,
                    "z_index": 14,
                    "fit": "contain"
                },
                "enabled": True
            }
        ],
        "presets": [
            {
                "id": "pink_bunny_sweet",
                "name": "🐰 Pink Bunny & Blush",
                "description": "Telinga kelinci manis dengan perona pipi lembut dan kilau bintang",
                "asset_ids": ["pink_bunny", "pastel_blush_left", "pastel_blush_right", "floating_stars"]
            },
            {
                "id": "cute_glasses_blush",
                "name": "👓 Round Glasses & Heart",
                "description": "Kacamata bulat estetik dengan stiker hati di pipi",
                "asset_ids": ["cute_glasses", "pastel_blush_left", "pastel_blush_right", "cheek_hearts"]
            },
            {
                "id": "kitty_whiskers",
                "name": "🐱 Playful Kitty & Bandaid",
                "description": "Telinga kucing imut dengan plester hati di hidung",
                "asset_ids": ["cat_ears", "cute_bandaid", "pastel_blush_left", "pastel_blush_right"]
            },
            {
                "id": "royal_princess",
                "name": "👑 Royal Princess & Sparkles",
                "description": "Mahkota putri berkilau dengan taburan glitter peri",
                "asset_ids": ["princess_crown", "magical_glitter"]
            },
            {
                "id": "sakura_fairy",
                "name": "🌸 Sakura Petals & Silk Bow",
                "description": "Kelopak bunga sakura berguguran dengan pita sutra rambut",
                "asset_ids": ["sweet_ribbon", "sakura_petals", "cheek_hearts"]
            }
        ]
    }
    with open(base_path / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def main():
    base = Path("templates/assets/overlays")
    create_asset_dirs(base)
    print("Generating AR sticker assets in", base)

    draw_bunny_ears(base / "face-accessories" / "bunny" / "pink_bunny.png")
    draw_cute_glasses(base / "face-accessories" / "glasses" / "cute_glasses.png")
    draw_princess_crown(base / "face-accessories" / "crown" / "princess_crown.png")
    draw_cat_ears(base / "face-accessories" / "cat" / "cat_ears.png")
    draw_sweet_ribbon(base / "face-accessories" / "ribbon" / "sweet_ribbon.png")
    draw_pastel_blush(base / "face-decorations" / "blush" / "pastel_blush.png")
    draw_cheek_hearts(base / "face-decorations" / "hearts" / "cheek_hearts.png")
    draw_cute_bandaid(base / "face-decorations" / "bandaid" / "cute_bandaid.png")
    draw_floating_stars(base / "floating" / "stars" / "floating_stars.png")
    draw_magical_glitter(base / "floating" / "glitter" / "magical_glitter.png")
    draw_sakura_petals(base / "decorative" / "flowers" / "sakura_petals.png")

    build_manifest(base)
    print("Done! All sticker PNGs and manifest.json generated successfully.")


if __name__ == "__main__":
    main()
