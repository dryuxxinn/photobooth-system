import base64
import io
import math
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
from PIL import Image, ImageDraw, ImageOps, ImageEnhance, ImageFilter

from backend.app.core.config import settings


class ImageProcessor:
    """
    Service to handle cropping, resizing, color filters, frame color themes,
    thumbnail generation, and 11 Sweet Studio photobooth template compositions
    with cute vector frame decorations (hearts, bows, flowers, sparkles, stitched borders).
    """

    FRAME_THEMES: Dict[str, Dict[str, Any]] = {
        "pink": {
            "id": "pink",
            "name": "Sweet Pink",
            "bg": (246, 201, 210),
            "text": (73, 59, 59),
            "subtext": (136, 123, 123),
            "accent": (229, 115, 138),
            "sticker_bg": (255, 249, 242),
            "hex": "#F6C9D2",
        },
        "cream": {
            "id": "cream",
            "name": "Minimal Cream",
            "bg": (250, 247, 240),
            "text": (73, 59, 59),
            "subtext": (136, 123, 123),
            "accent": (232, 146, 162),
            "sticker_bg": (253, 232, 236),
            "hex": "#FAF7F0",
        },
        "lavender": {
            "id": "lavender",
            "name": "Lavender Dream",
            "bg": (220, 214, 247),
            "text": (73, 59, 59),
            "subtext": (120, 108, 145),
            "accent": (140, 118, 205),
            "sticker_bg": (255, 249, 242),
            "hex": "#DCD6F7",
        },
        "white": {
            "id": "white",
            "name": "Studio Crisp White",
            "bg": (255, 255, 255),
            "text": (55, 45, 45),
            "subtext": (130, 120, 120),
            "accent": (232, 146, 162),
            "sticker_bg": (253, 232, 236),
            "hex": "#FFFFFF",
        },
        "sky": {
            "id": "sky",
            "name": "Pastel Sky Blue",
            "bg": (222, 241, 255),
            "text": (25, 65, 105),
            "subtext": (85, 125, 160),
            "accent": (75, 145, 210),
            "sticker_bg": (255, 255, 255),
            "hex": "#DEF1FF",
        },
        "mint": {
            "id": "mint",
            "name": "Matcha Mint",
            "bg": (224, 245, 233),
            "text": (30, 80, 55),
            "subtext": (80, 130, 105),
            "accent": (72, 168, 116),
            "sticker_bg": (255, 255, 255),
            "hex": "#E0F5E9",
        },
        "gold": {
            "id": "gold",
            "name": "Couple & Event Gold",
            "bg": (252, 249, 242),
            "text": (150, 110, 25),
            "subtext": (140, 115, 65),
            "accent": (197, 155, 39),
            "sticker_bg": (255, 252, 245),
            "hex": "#FCF9F2",
        },
        "burgundy": {
            "id": "burgundy",
            "name": "Vintage Film Maroon",
            "bg": (118, 22, 36),
            "text": (250, 245, 232),
            "subtext": (225, 195, 185),
            "accent": (245, 208, 125),
            "sticker_bg": (250, 245, 232),
            "hex": "#761624",
        },
        "black": {
            "id": "black",
            "name": "Midnight Film Noir",
            "bg": (20, 22, 28),
            "text": (245, 245, 247),
            "subtext": (165, 170, 185),
            "accent": (246, 201, 210),
            "sticker_bg": (40, 44, 54),
            "hex": "#14161C",
        },
    }

    AVAILABLE_TEMPLATES: List[Dict[str, Any]] = [
        {
            "id": "retro_strip_4",
            "name": "Sweet Korean Strip (4 Pose)",
            "photos_required": 4,
            "layout": "vertical_4",
            "category": "strip",
            "aspect_label": "2x6 Strip • 4 Foto",
            "prints_doubled": False,
            "default_frame": "pink",
            "description": "Strip 4 pose vertikal khas Korean photobooth dengan dekorasi pita, hati & bunga pastel.",
        },
        {
            "id": "classic_strip_3",
            "name": "Sweet Classic Strip (3 Pose)",
            "photos_required": 3,
            "layout": "vertical",
            "category": "strip",
            "aspect_label": "2x6 Strip • 3 Foto",
            "prints_doubled": False,
            "default_frame": "cream",
            "description": "Strip 3 pose klasik dengan border jahitan manis & stiker sudut menggemaskan.",
        },
        {
            "id": "ourbooth_twin_3",
            "name": "Twin Strip Cetak Ganda (3 Pose)",
            "photos_required": 3,
            "layout": "twin_strip",
            "category": "strip",
            "aspect_label": "2× 2x6 Strip • 3 Foto",
            "prints_doubled": True,
            "default_frame": "cream",
            "description": "Dua strip kembar berdampingan (4x6 inch) siap potong untuk dibagi bersama sahabat.",
        },
        {
            "id": "twin_strip_4",
            "name": "Twin Strip Cetak Ganda (4 Pose)",
            "photos_required": 4,
            "layout": "twin_strip_4",
            "category": "strip",
            "aspect_label": "2× 2x6 Strip • 4 Foto",
            "prints_doubled": True,
            "default_frame": "pink",
            "description": "Empat pose vertikal dengan dekorasi Sweet Studio yang digandakan menjadi 2 strip kembar.",
        },
        {
            "id": "grid_2x2_4",
            "name": "Scrapbook Postcard 2×2 (4 Pose)",
            "photos_required": 4,
            "layout": "grid",
            "category": "postcard",
            "aspect_label": "4x6 Postcard • 4 Foto",
            "prints_doubled": False,
            "default_frame": "lavender",
            "description": "Susunan 4 pose ukuran kartu pos 2×2 bergaya scrapbook dengan emblem bunga di tengah.",
        },
        {
            "id": "cinema_ticket_4",
            "name": "Vintage Film Ticket (4 Pose)",
            "photos_required": 4,
            "layout": "ticket",
            "category": "special",
            "aspect_label": "Movie Ticket • 4 Foto",
            "prints_doubled": False,
            "default_frame": "burgundy",
            "description": "Tiket bioskop retro 'ADMIT ONE / SWEET FILM' dengan tepi bergerigi.",
        },
        {
            "id": "engagement_event_3",
            "name": "Couple & Birthday Edition (3 Pose)",
            "photos_required": 3,
            "layout": "event_strip",
            "category": "special",
            "aspect_label": "2x6 Event Strip • 3 Foto",
            "prints_doubled": False,
            "default_frame": "gold",
            "description": "Strip 3 pose elegan dengan ornamen bingkai keemasan untuk acara spesial & pasangan.",
        },
        {
            "id": "landscape_trio_3",
            "name": "Landscape Trio Postcard (3 Pose)",
            "photos_required": 3,
            "layout": "landscape_3",
            "category": "postcard",
            "aspect_label": "16:9 Postcard • 3 Foto",
            "prints_doubled": False,
            "default_frame": "white",
            "description": "Tiga foto potret berjajar rapi dengan dekorasi pita & bunga dalam kartu pos horizontal.",
        },
        {
            "id": "solo_duo_2",
            "name": "Bestie Duo Strip (2 Pose)",
            "photos_required": 2,
            "layout": "vertical_2",
            "category": "strip",
            "aspect_label": "2x4 Duo • 2 Foto",
            "prints_doubled": False,
            "default_frame": "lavender",
            "description": "Dua pose vertikal berukuran besar dengan pita atas & stiker sahabat.",
        },
        {
            "id": "single_frame_1",
            "name": "Sweet Polaroid Portrait (1 Pose)",
            "photos_required": 1,
            "layout": "single",
            "category": "single",
            "aspect_label": "4x6 Polaroid • 1 Foto",
            "prints_doubled": False,
            "default_frame": "pink",
            "description": "Satu foto besar bergaya polaroid dengan pita dekoratif & ruang catatan manis.",
        },
        {
            "id": "wide_recap_1",
            "name": "Widescreen Memory Card (1 Pose)",
            "photos_required": 1,
            "layout": "wide_1",
            "category": "single",
            "aspect_label": "16:9 Widescreen • 1 Foto",
            "prints_doubled": False,
            "default_frame": "cream",
            "description": "Satu foto landscape lebar dengan bingkai dekoratif untuk foto grup.",
        },
    ]

    STICKER_OPTIONS: List[Dict[str, str]] = [
        {"id": "sweet_bows", "name": "Mix Pita & Bunga 🎀", "desc": "Kombinasi pita, hati, bunga & bintang"},
        {"id": "hearts_only", "name": "Lovely Hearts ♡", "desc": "Stiker hati manis di setiap sudut foto"},
        {"id": "flowers_only", "name": "Cherry Blossom ✿", "desc": "Stiker bunga pastel di setiap sudut foto"},
        {"id": "sparkles_only", "name": "Y2K Sparkles ✨", "desc": "Bintang kilau berkilauan"},
        {"id": "none", "name": "Tanpa Stiker (Clean)", "desc": "Bingkai bersih minimalis tanpa stiker sudut"},
    ]

    @classmethod
    def get_theme(cls, frame_color: Optional[str] = None) -> Dict[str, Any]:
        key = (frame_color or "cream").lower()
        return cls.FRAME_THEMES.get(key, cls.FRAME_THEMES["cream"])

    @classmethod
    def get_template(cls, template_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        target = template_id or "classic_strip_3"
        for tpl in cls.AVAILABLE_TEMPLATES:
            if tpl["id"] == target:
                return tpl
        return None

    @classmethod
    def get_custom_overlay_path(cls, template_id: str) -> Path:
        overlay_dir = settings.TEMPLATES_DIR / "layouts"
        overlay_dir.mkdir(parents=True, exist_ok=True)
        return overlay_dir / f"{template_id}.png"

    @classmethod
    def get_templates_with_overlay_status(cls) -> List[Dict[str, Any]]:
        enriched: List[Dict[str, Any]] = []
        for tpl in cls.AVAILABLE_TEMPLATES:
            item = dict(tpl)
            ov_path = cls.get_custom_overlay_path(tpl["id"])
            has_ov = ov_path.exists()
            item["has_custom_overlay"] = has_ov
            item["custom_overlay_url"] = (
                f"/template-assets/layouts/{tpl['id']}.png" if has_ov else None
            )
            enriched.append(item)
        return enriched

    @classmethod
    def save_custom_overlay(cls, template_id: str, b64_image_data: str) -> Path:
        raw_b64 = b64_image_data.strip()
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        raw_bytes = base64.b64decode(raw_b64)
        target_path = cls.get_custom_overlay_path(template_id)
        with Image.open(io.BytesIO(raw_bytes)) as uploaded:
            rgba = uploaded.convert("RGBA")
            rgba.save(target_path, "PNG")
        return target_path

    @classmethod
    def delete_custom_overlay(cls, template_id: str) -> bool:
        target_path = cls.get_custom_overlay_path(template_id)
        if target_path.exists():
            target_path.unlink()
            return True
        return False

    @classmethod
    def _apply_custom_png_overlay(
        cls, canvas: Image.Image, template_id: Optional[str]
    ) -> Image.Image:
        if not template_id:
            return canvas
        ov_path = cls.get_custom_overlay_path(template_id)
        if not ov_path.exists():
            return canvas
        try:
            with Image.open(ov_path) as ov:
                ov_rgba = ov.convert("RGBA").resize(
                    canvas.size, Image.Resampling.LANCZOS
                )
                base_rgba = canvas.convert("RGBA")
                composited = Image.alpha_composite(base_rgba, ov_rgba)
                return composited.convert("RGB")
        except Exception:
            return canvas

    @staticmethod
    def apply_filter(img: Image.Image, filter_name: str = "original") -> Image.Image:
        """Apply optional color filter preset to a PIL image."""
        mode = (filter_name or "original").lower().strip()
        rgb = img.convert("RGB")
        if mode in ("original", "none", ""):
            return rgb
        elif mode in ("bw", "mono"):
            gray = ImageOps.grayscale(rgb).convert("RGB")
            contrast = ImageEnhance.Contrast(gray).enhance(1.18)
            return ImageEnhance.Brightness(contrast).enhance(1.03)
        elif mode == "warm":
            enhancer = ImageEnhance.Color(rgb)
            warmed = enhancer.enhance(1.25)
            r, g, b = warmed.split()
            r = r.point(lambda i: min(255, int(i * 1.07)))
            b = b.point(lambda i: int(i * 0.93))
            return Image.merge("RGB", (r, g, b))
        elif mode == "contrast":
            pop = ImageEnhance.Color(rgb).enhance(1.15)
            return ImageEnhance.Contrast(pop).enhance(1.28)
        elif mode == "vintage":
            gray = ImageOps.grayscale(rgb)
            sepia = ImageOps.colorize(gray, "#2B1D0E", "#F7E7CE")
            blended = Image.blend(rgb, sepia, 0.55)
            return ImageEnhance.Contrast(blended).enhance(1.06)
        elif mode == "sepia":
            gray = ImageOps.grayscale(rgb)
            sepia = ImageOps.colorize(gray, "#3B2712", "#FBF0D9")
            return Image.blend(rgb, sepia, 0.72)
        elif mode == "vivid":
            saturated = ImageEnhance.Color(rgb).enhance(1.38)
            return ImageEnhance.Contrast(saturated).enhance(1.14)
        elif mode == "beauty":
            # Soft skin smoothing + gentle rosy brightness boost (Korean Beauty Cam style)
            smoothed = rgb.filter(ImageFilter.SMOOTH_MORE)
            blended = Image.blend(rgb, smoothed, 0.42)
            bright = ImageEnhance.Brightness(blended).enhance(1.08)
            r, g, b = bright.split()
            r = r.point(lambda i: min(255, int(i * 1.05)))
            b = b.point(lambda i: min(255, int(i * 1.02)))
            return Image.merge("RGB", (r, g, b))
        elif mode == "cool":
            # Cool dreamy pastel tone
            cooled = ImageEnhance.Color(rgb).enhance(1.12)
            r, g, b = cooled.split()
            r = r.point(lambda i: int(i * 0.95))
            b = b.point(lambda i: min(255, int(i * 1.09)))
            return Image.merge("RGB", (r, g, b))
        elif mode == "y2k":
            # Y2K cyber-pop glow (soft bloom + high saturation + magenta/cyan shift)
            bloom = rgb.filter(ImageFilter.GaussianBlur(radius=3))
            glow = Image.blend(rgb, bloom, 0.25)
            pop = ImageEnhance.Color(glow).enhance(1.35)
            return ImageEnhance.Contrast(pop).enhance(1.12)
        elif mode == "rosy":
            # Sweet Korean Rosy / Pastel Blush
            bright = ImageEnhance.Brightness(rgb).enhance(1.06)
            pop = ImageEnhance.Color(bright).enhance(1.22)
            r, g, b = pop.split()
            r = r.point(lambda i: min(255, int(i * 1.08)))
            b = b.point(lambda i: min(255, int(i * 1.03)))
            return Image.merge("RGB", (r, g, b))
        elif mode == "moody":
            # Moody warm latte & film contrast
            gray = ImageOps.grayscale(rgb)
            sepia = ImageOps.colorize(gray, "#2D241E", "#F8EBD9")
            blended = Image.blend(rgb, sepia, 0.32)
            contrast = ImageEnhance.Contrast(blended).enhance(1.18)
            return ImageEnhance.Brightness(contrast).enhance(0.96)
        return rgb

    @staticmethod
    def create_thumbnail(
        source_path: Path, target_path: Path, max_size: tuple = (400, 300)
    ) -> Path:
        """Create a scaled-down thumbnail for quick mobile / iPad kiosk preview."""
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source_path) as img:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            img.save(target_path, "JPEG", quality=85)
        return target_path

    # --- Cute Vector Ornament Drawing Helpers ---

    @staticmethod
    def _draw_heart(
        draw: ImageDraw.ImageDraw,
        cx: int,
        cy: int,
        r: int,
        fill: Tuple[int, int, int],
    ) -> None:
        """Draw a cute heart centered around (cx, cy) with radius r."""
        lobe_r = max(3, int(r * 0.55))
        offset_x = max(2, int(r * 0.45))
        offset_y = max(2, int(r * 0.25))
        draw.ellipse(
            [
                cx - offset_x - lobe_r,
                cy - offset_y - lobe_r,
                cx - offset_x + lobe_r,
                cy - offset_y + lobe_r,
            ],
            fill=fill,
        )
        draw.ellipse(
            [
                cx + offset_x - lobe_r,
                cy - offset_y - lobe_r,
                cx + offset_x + lobe_r,
                cy - offset_y + lobe_r,
            ],
            fill=fill,
        )
        draw.polygon(
            [
                (cx - offset_x - int(lobe_r * 0.85), cy - int(offset_y * 0.2)),
                (cx + offset_x + int(lobe_r * 0.85), cy - int(offset_y * 0.2)),
                (cx, cy + int(r * 0.95)),
            ],
            fill=fill,
        )

    @staticmethod
    def _draw_sparkle(
        draw: ImageDraw.ImageDraw,
        cx: int,
        cy: int,
        r: int,
        fill: Tuple[int, int, int],
    ) -> None:
        """Draw a 4-point sparkle star centered at (cx, cy)."""
        inner = max(2, int(r * 0.32))
        pts = [
            (cx, cy - r),
            (cx + inner, cy - inner),
            (cx + r, cy),
            (cx + inner, cy + inner),
            (cx, cy + r),
            (cx - inner, cy + inner),
            (cx - r, cy),
            (cx - inner, cy - inner),
        ]
        draw.polygon(pts, fill=fill)

    @staticmethod
    def _draw_flower(
        draw: ImageDraw.ImageDraw,
        cx: int,
        cy: int,
        r: int,
        petal_fill: Tuple[int, int, int],
        center_fill: Tuple[int, int, int] = (247, 217, 126),
    ) -> None:
        """Draw a 5-petal pastel flower centered at (cx, cy)."""
        petal_r = max(3, int(r * 0.46))
        dist = max(3, int(r * 0.52))
        for i in range(5):
            ang = (2 * math.pi * i) / 5 - math.pi / 2
            px = int(cx + math.cos(ang) * dist)
            py = int(cy + math.sin(ang) * dist)
            draw.ellipse(
                [px - petal_r, py - petal_r, px + petal_r, py + petal_r],
                fill=petal_fill,
            )
        core_r = max(2, int(r * 0.36))
        draw.ellipse(
            [cx - core_r, cy - core_r, cx + core_r, cy + core_r],
            fill=center_fill,
        )

    @staticmethod
    def _draw_bow(
        draw: ImageDraw.ImageDraw,
        cx: int,
        cy: int,
        r: int,
        fill: Tuple[int, int, int],
        knot_fill: Tuple[int, int, int],
    ) -> None:
        """Draw a cute coquette bow/ribbon centered at (cx, cy)."""
        # Left and right ribbon tails
        draw.polygon(
            [
                (cx - 2, cy + 2),
                (cx - int(r * 0.75), cy + int(r * 1.05)),
                (cx - int(r * 0.35), cy + int(r * 1.15)),
            ],
            fill=fill,
        )
        draw.polygon(
            [
                (cx + 2, cy + 2),
                (cx + int(r * 0.75), cy + int(r * 1.05)),
                (cx + int(r * 0.35), cy + int(r * 1.15)),
            ],
            fill=fill,
        )
        # Left and right bow wings
        draw.polygon(
            [
                (cx, cy),
                (cx - int(r * 1.15), cy - int(r * 0.65)),
                (cx - int(r * 1.15), cy + int(r * 0.55)),
            ],
            fill=fill,
        )
        draw.polygon(
            [
                (cx, cy),
                (cx + int(r * 1.15), cy - int(r * 0.65)),
                (cx + int(r * 1.15), cy + int(r * 0.55)),
            ],
            fill=fill,
        )
        knot_r = max(3, int(r * 0.32))
        draw.ellipse(
            [cx - knot_r, cy - knot_r, cx + knot_r, cy + knot_r],
            fill=knot_fill,
        )

    @staticmethod
    def _draw_dashed_border(
        draw: ImageDraw.ImageDraw,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        color: Tuple[int, int, int],
        width: int = 2,
        dash: int = 16,
        gap: int = 10,
    ) -> None:
        """Draw a stitched dashed rectangle border around the frame."""
        step = dash + gap
        for x in range(x1, x2, step):
            draw.line([(x, y1), (min(x + dash, x2), y1)], fill=color, width=width)
            draw.line([(x, y2), (min(x + dash, x2), y2)], fill=color, width=width)
        for y in range(y1, y2, step):
            draw.line([(x1, y), (x1, min(y + dash, y2))], fill=color, width=width)
            draw.line([(x2, y), (x2, min(y + dash, y2))], fill=color, width=width)

    @classmethod
    def _draw_sweet_frame_shell(
        cls,
        draw: ImageDraw.ImageDraw,
        width: int,
        height: int,
        theme: Dict[str, Any],
    ) -> None:
        """Draw outer stitched frame border, corner flowers/sparkles, and top bow."""
        accent = theme.get("accent", (229, 115, 138))
        sticker_bg = theme.get("sticker_bg", (255, 249, 242))
        subtext = theme.get("subtext", (136, 123, 123))

        # Stitched inner border
        cls._draw_dashed_border(
            draw, 12, 12, width - 12, height - 12, color=accent, width=2, dash=14, gap=10
        )

        # Corner ornaments
        cls._draw_flower(draw, 26, 26, 13, accent)
        cls._draw_flower(draw, width - 26, 26, 13, accent)
        cls._draw_heart(draw, 26, height - 26, 12, accent)
        cls._draw_heart(draw, width - 26, height - 26, 12, accent)

        # Top center cute bow ornament
        cls._draw_bow(draw, width // 2, 26, 16, accent, sticker_bg)
        cls._draw_sparkle(draw, width // 2 - 120, 28, 9, subtext)
        cls._draw_sparkle(draw, width // 2 + 120, 28, 9, subtext)

    @classmethod
    def _draw_slot_frame_and_sticker(
        cls,
        draw: ImageDraw.ImageDraw,
        x: int,
        y: int,
        w: int,
        h: int,
        idx: int,
        theme: Dict[str, Any],
        sticker_id: str = "sweet_bows",
    ) -> None:
        """Draw a clean photo border and a cute corner sticker badge on a photo slot."""
        accent = theme.get("accent", (229, 115, 138))
        sticker_bg = theme.get("sticker_bg", (255, 249, 242))

        # Crisp photo slot outline
        draw.rectangle([x, y, x + w, y + h], outline=sticker_bg, width=6)
        draw.rectangle([x - 2, y - 2, x + w + 2, y + h + 2], outline=accent, width=2)

        mode = (sticker_id or "sweet_bows").lower()
        if mode in ("none", "minimal_none", "off"):
            return

        # Alternating corner sticker position (top-left on even, top-right on odd)
        sx = x + 22 if idx % 2 == 0 else x + w - 22
        sy = y + 22
        sr = 18
        draw.ellipse(
            [sx - sr, sy - sr, sx + sr, sy + sr],
            fill=sticker_bg,
            outline=accent,
            width=2,
        )
        if mode == "hearts_only":
            cls._draw_heart(draw, sx, sy, 10, accent)
            return
        if mode == "flowers_only":
            cls._draw_flower(draw, sx, sy, 11, accent)
            return
        if mode == "sparkles_only":
            cls._draw_sparkle(draw, sx, sy, 11, accent)
            return

        kind = idx % 4
        if kind == 0:
            cls._draw_heart(draw, sx, sy, 10, accent)
        elif kind == 1:
            cls._draw_flower(draw, sx, sy, 11, accent)
        elif kind == 2:
            cls._draw_bow(draw, sx, sy - 1, 10, accent, (247, 217, 126))
        else:
            cls._draw_sparkle(draw, sx, sy, 11, accent)

    @classmethod
    def compose_gif(
        cls,
        photo_paths: List[Path],
        output_path: Path,
        filter_name: str = "original",
        frame_color: str = "cream",
        customer_name: Optional[str] = None,
        sticker_id: str = "sweet_bows",
        boomerang: bool = True,
    ) -> Path:
        """
        Generate an animated LumaBooth-style Boomerang GIF from the session's captured photos.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)
        valid_paths = [p for p in photo_paths if p.exists()]
        if not valid_paths:
            raise ValueError("No valid photo paths provided for GIF generation.")

        theme = cls.get_theme(frame_color)
        accent = theme.get("accent", (229, 115, 138))
        sticker_bg = theme.get("sticker_bg", (255, 249, 242))

        slot_w, slot_h = 640, 426
        pad = 24
        footer_h = 74
        total_w = slot_w + pad * 2
        total_h = slot_h + pad * 2 + footer_h

        frames: List[Image.Image] = []
        for idx, path in enumerate(valid_paths):
            card = Image.new("RGB", (total_w, total_h), color=theme["bg"])
            draw = ImageDraw.Draw(card)
            cls._draw_dashed_border(
                draw, 8, 8, total_w - 8, total_h - 8, color=accent, width=2, dash=12, gap=8
            )
            with Image.open(path) as src:
                fitted = ImageOps.fit(src, (slot_w, slot_h), Image.Resampling.LANCZOS)
                fitted = cls.apply_filter(fitted, filter_name)
                card.paste(fitted, (pad, pad))

            cls._draw_slot_frame_and_sticker(
                draw, pad, pad, slot_w, slot_h, idx, theme, sticker_id=sticker_id
            )

            # Footer caption & pose counter pill
            fy = pad + slot_h + 16
            title = (customer_name.strip() if customer_name else "SWEET STUDIO")[:22]
            date_str = datetime.now().strftime("%d.%m.%Y")
            draw.text((pad + 10, fy + 6), f"✦ {title} ✦", fill=theme["text"])
            draw.text(
                (pad + 10, fy + 30),
                f"SWEET BOOMERANG  •  POSE {idx + 1}/{len(valid_paths)}  •  {date_str}",
                fill=theme["subtext"],
            )
            cls._draw_heart(draw, total_w - pad - 24, fy + 24, 10, accent)
            cls._draw_flower(draw, total_w - pad - 54, fy + 24, 10, accent)
            frames.append(card)

        if boomerang and len(frames) > 2:
            sequence = frames + frames[-2:0:-1]
        else:
            sequence = frames

        sequence[0].save(
            output_path,
            format="GIF",
            save_all=True,
            append_images=sequence[1:],
            duration=380,
            loop=0,
            optimize=True,
        )
        return output_path

    @classmethod
    def compose_photostrip(
        cls,
        photo_paths: List[Path],
        output_path: Path,
        branding_text: str = "SWEET STUDIO",
        template_id: str = "classic_strip_3",
        filter_name: str = "original",
        frame_color: str = "cream",
        customer_name: Optional[str] = None,
        sticker_id: str = "sweet_bows",
    ) -> Path:
        """
        Assemble captured photos according to the selected template_id, filter_name,
        frame_color theme, sticker_id, and optional custom PNG overlay.
        """
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not photo_paths:
            raise ValueError("No photo paths provided for photostrip composition.")

        valid_paths = [p for p in photo_paths if p.exists()]
        if not valid_paths:
            raise ValueError("None of the provided photo paths exist on disk.")

        theme = cls.get_theme(frame_color)

        if template_id == "grid_2x2_4" and len(valid_paths) >= 4:
            res_path = cls._compose_grid_2x2(
                valid_paths[:4], output_path, branding_text, filter_name, theme, customer_name, sticker_id
            )
        elif template_id == "cinema_ticket_4":
            res_path = cls._compose_cinema_ticket(
                valid_paths, output_path, branding_text, filter_name, theme, customer_name
            )
        elif template_id == "engagement_event_3":
            res_path = cls._compose_event_gold_strip(
                valid_paths, output_path, branding_text, filter_name, theme, customer_name
            )
        elif template_id == "landscape_trio_3":
            res_path = cls._compose_landscape_trio(
                valid_paths, output_path, branding_text, filter_name, theme, customer_name, sticker_id
            )
        elif template_id == "wide_recap_1":
            res_path = cls._compose_wide_recap(
                valid_paths[0], output_path, branding_text, filter_name, theme, customer_name, sticker_id
            )
        elif template_id in ("ourbooth_twin_3", "twin_strip_4"):
            single_strip = cls._build_ourbooth_vertical_strip(
                valid_paths, branding_text, filter_name, theme, customer_name, sticker_id=sticker_id
            )
            single_strip = cls._apply_custom_png_overlay(single_strip, template_id)
            sw, sh = single_strip.size
            twin = Image.new("RGB", (sw * 2 + 20, sh), color=theme["bg"])
            twin.paste(single_strip, (0, 0))
            twin.paste(single_strip, (sw + 20, 0))
            draw = ImageDraw.Draw(twin)
            mid_x = sw + 10
            for y in range(20, sh - 20, 18):
                draw.line([(mid_x, y), (mid_x, y + 8)], fill=theme["subtext"], width=2)
            twin.save(output_path, "JPEG", quality=92)
            return output_path
        else:
            strip_img = cls._build_ourbooth_vertical_strip(
                valid_paths,
                branding_text,
                filter_name,
                theme,
                customer_name,
                is_polaroid=(template_id == "single_frame_1"),
                sticker_id=sticker_id,
            )
            strip_img = cls._apply_custom_png_overlay(strip_img, template_id)
            strip_img.save(output_path, "JPEG", quality=92)
            return output_path

        # Apply optional custom PNG overlay for non-strip templates if uploaded
        if cls.get_custom_overlay_path(template_id).exists():
            with Image.open(res_path) as comp:
                with_ov = cls._apply_custom_png_overlay(comp.copy(), template_id)
                with_ov.save(res_path, "JPEG", quality=92)
        return res_path

    @classmethod
    def _build_ourbooth_vertical_strip(
        cls,
        valid_paths: List[Path],
        branding_text: str,
        filter_name: str,
        theme: Dict[str, Any],
        customer_name: Optional[str] = None,
        is_polaroid: bool = False,
        sticker_id: str = "sweet_bows",
    ) -> Image.Image:
        slot_width = 800
        slot_height = 533  # 3:2 aspect ratio
        margin = 30
        header_height = 68
        footer_height = 210 if is_polaroid else 170

        total_width = slot_width + (margin * 2)  # 860px
        total_height = (
            header_height
            + (slot_height * len(valid_paths))
            + (margin * len(valid_paths))
            + footer_height
        )

        canvas = Image.new("RGB", (total_width, total_height), color=theme["bg"])
        draw = ImageDraw.Draw(canvas)

        # Decorative Sweet Studio border & ornaments
        cls._draw_sweet_frame_shell(draw, total_width, total_height, theme)

        # Header label
        spaced_header = " ".join(list((branding_text or "SWEET STUDIO").upper()[:14]))
        draw.text(
            (total_width // 2 - len(spaced_header) * 4, 44),
            spaced_header,
            fill=theme["text"],
        )

        current_y = header_height
        for idx, path in enumerate(valid_paths):
            with Image.open(path) as photo:
                fitted = ImageOps.fit(
                    photo, (slot_width, slot_height), Image.Resampling.LANCZOS
                )
                fitted = cls.apply_filter(fitted, filter_name)
                canvas.paste(fitted, (margin, current_y))
                cls._draw_slot_frame_and_sticker(
                    draw, margin, current_y, slot_width, slot_height, idx, theme, sticker_id=sticker_id
                )
                current_y += slot_height + margin

        # Decorative footer pill & ornaments
        footer_top = current_y
        accent = theme.get("accent", (229, 115, 138))
        sticker_bg = theme.get("sticker_bg", (255, 249, 242))

        # Cute footer card pill
        pill_x1 = margin + 70
        pill_x2 = total_width - margin - 70
        pill_y1 = footer_top + 8
        pill_y2 = footer_top + 118
        draw.rectangle(
            [pill_x1, pill_y1, pill_x2, pill_y2],
            fill=sticker_bg,
            outline=accent,
            width=2,
        )
        cls._draw_heart(draw, pill_x1 + 26, (pill_y1 + pill_y2) // 2, 11, accent)
        cls._draw_flower(draw, pill_x2 - 26, (pill_y1 + pill_y2) // 2, 12, accent)

        title = customer_name.strip() if customer_name else "SWEET STUDIO"
        subtitle = "a little moment, a lovely memory  •  " + datetime.now().strftime(
            "%d.%m.%Y"
        )

        draw.text(
            (total_width // 2 - (len(title) * 4), pill_y1 + 26),
            title,
            fill=theme["text"],
        )
        draw.text(
            (total_width // 2 - (len(subtitle) * 3), pill_y1 + 64),
            subtitle,
            fill=theme["subtext"],
        )

        return canvas

    @classmethod
    def _compose_event_gold_strip(
        cls,
        valid_paths: List[Path],
        output_path: Path,
        branding_text: str,
        filter_name: str,
        theme: Dict[str, Any],
        customer_name: Optional[str] = None,
    ) -> Path:
        """3-pose vertical strip with ornate gold geometric border & couple/event crest."""
        slot_width = 800
        slot_height = 533
        margin = 30
        footer_height = 280

        total_width = slot_width + (margin * 2)  # 860px
        total_height = (
            margin
            + (slot_height * len(valid_paths))
            + (margin * len(valid_paths))
            + footer_height
        )

        bg_color = (252, 249, 242) if theme["id"] == "gold" else theme["bg"]
        gold_color = (188, 146, 42)
        dark_gold = (135, 98, 22)

        canvas = Image.new("RGB", (total_width, total_height), color=bg_color)
        draw = ImageDraw.Draw(canvas)

        # Outer gold frame border
        draw.rectangle(
            [10, 10, total_width - 10, total_height - 10],
            outline=gold_color,
            width=2,
        )

        current_y = margin
        for idx, path in enumerate(valid_paths):
            with Image.open(path) as photo:
                fitted = ImageOps.fit(
                    photo, (slot_width, slot_height), Image.Resampling.LANCZOS
                )
                fitted = cls.apply_filter(fitted, filter_name)
                canvas.paste(fitted, (margin, current_y))
                draw.rectangle(
                    [margin, current_y, margin + slot_width, current_y + slot_height],
                    outline=gold_color,
                    width=3,
                )
                cls._draw_sparkle(
                    draw,
                    margin + 22 if idx % 2 == 0 else margin + slot_width - 22,
                    current_y + 22,
                    12,
                    gold_color,
                )
                current_y += slot_height + margin

        f_top = current_y + 10
        f_bot = total_height - 25
        draw.rectangle(
            [margin + 10, f_top, total_width - margin - 10, f_bot],
            outline=gold_color,
            width=3,
        )
        draw.rectangle(
            [margin + 22, f_top + 12, total_width - margin - 22, f_bot - 12],
            outline=gold_color,
            width=1,
        )

        for cx, cy in [
            (margin + 22, f_top + 12),
            (total_width - margin - 22, f_top + 12),
            (margin + 22, f_bot - 12),
            (total_width - margin - 22, f_bot - 12),
        ]:
            draw.polygon(
                [(cx, cy - 8), (cx + 8, cy), (cx, cy + 8), (cx - 8, cy)],
                fill=gold_color,
            )

        cls._draw_heart(draw, total_width // 2, f_top + 28, 10, gold_color)

        header_line = "T H E   C E L E B R A T I O N   O F"
        couple_line = (customer_name or branding_text or "SWEET STUDIO").upper()
        date_line = datetime.now().strftime("%m / %d / %Y")

        draw.text(
            (total_width // 2 - 110, f_top + 52),
            header_line,
            fill=dark_gold,
        )
        draw.text(
            (total_width // 2 - (len(couple_line) * 4), f_top + 100),
            couple_line,
            fill=gold_color,
        )
        draw.line(
            [
                (total_width // 2 - 100, f_top + 150),
                (total_width // 2 + 100, f_top + 150),
            ],
            fill=gold_color,
            width=2,
        )
        draw.text(
            (total_width // 2 - 45, f_top + 175),
            date_line,
            fill=dark_gold,
        )

        canvas.save(output_path, "JPEG", quality=92)
        return output_path

    @classmethod
    def _compose_cinema_ticket(
        cls,
        valid_paths: List[Path],
        output_path: Path,
        branding_text: str,
        filter_name: str,
        theme: Dict[str, Any],
        customer_name: Optional[str] = None,
    ) -> Path:
        """Vintage Cinema Ticket ('* ADMIT ONE *' | 4 photos | 'SWEET FILM ★★★★★')."""
        outer_bg = (118, 22, 36) if theme["id"] == "burgundy" else theme["accent"]
        ticket_bg = (250, 245, 232)
        ink = (30, 25, 25)

        slot_w = 340
        slot_h = 440
        gap = 22
        num_photos = min(4, len(valid_paths))
        left_stub_w = 240
        right_stub_w = 220
        pad_outer = 45

        ticket_w = (
            left_stub_w
            + (slot_w * num_photos)
            + (gap * (num_photos + 1))
            + right_stub_w
        )
        ticket_h = slot_h + 100

        total_w = ticket_w + pad_outer * 2
        total_h = ticket_h + pad_outer * 2

        canvas = Image.new("RGB", (total_w, total_h), color=outer_bg)
        draw = ImageDraw.Draw(canvas)

        tx1, ty1 = pad_outer, pad_outer
        tx2, ty2 = tx1 + ticket_w, ty1 + ticket_h

        draw.rectangle([tx1, ty1, tx2, ty2], fill=ticket_bg, outline=ink, width=3)
        draw.rectangle(
            [tx1 + 14, ty1 + 14, tx2 - 14, ty2 - 14], outline=ink, width=2
        )

        notch_r = 10
        for nx in range(tx1 + 30, tx2 - 20, 32):
            draw.ellipse(
                [nx - notch_r, ty1 - notch_r, nx + notch_r, ty1 + notch_r],
                fill=outer_bg,
            )
            draw.ellipse(
                [nx - notch_r, ty2 - notch_r, nx + notch_r, ty2 + notch_r],
                fill=outer_bg,
            )

        stub_left_x = tx1 + left_stub_w
        draw.line([(stub_left_x, ty1 + 14), (stub_left_x, ty2 - 14)], fill=ink, width=2)
        draw.line(
            [(tx1 + 95, ty1 + 14), (tx1 + 95, ty2 - 14)], fill=ink, width=1
        )

        date_str = datetime.now().strftime("%A, %b %d").upper()
        time_str = datetime.now().strftime("%H:%M")

        draw.text((tx1 + 26, ty1 + 55), "* ADMIT ONE *", fill=ink)
        draw.text((tx1 + 26, ty1 + 115), "ROW 14  •  SEAT 21", fill=ink)
        draw.text((tx1 + 26, ty1 + 165), date_str, fill=ink)
        draw.text((tx1 + 26, ty1 + 205), f"SHOWTIME: {time_str}", fill=ink)
        if customer_name:
            draw.text(
                (tx1 + 26, ty1 + 260),
                f"GUEST: {customer_name[:16].upper()}",
                fill=ink,
            )
        draw.text((tx1 + 26, ty2 - 60), "NO. 00142198", fill=ink)

        curr_x = stub_left_x + gap
        photo_y = ty1 + 50
        for p in valid_paths[:num_photos]:
            with Image.open(p) as photo:
                fitted = ImageOps.fit(
                    photo, (slot_w, slot_h), Image.Resampling.LANCZOS
                )
                fitted = cls.apply_filter(fitted, filter_name)
                canvas.paste(fitted, (curr_x, photo_y))
                draw.rectangle(
                    [curr_x, photo_y, curr_x + slot_w, photo_y + slot_h],
                    outline=ink,
                    width=3,
                )
                curr_x += slot_w + gap

        stub_right_x = tx2 - right_stub_w
        draw.line(
            [(stub_right_x, ty1 + 14), (stub_right_x, ty2 - 14)], fill=ink, width=2
        )
        draw.text((stub_right_x + 35, ty1 + 80), "S W E E T   F I L M", fill=ink)
        draw.text((stub_right_x + 35, ty1 + 135), "★ ★ ★ ★ ★", fill=outer_bg)
        draw.text(
            (stub_right_x + 35, ty1 + 195),
            (customer_name or branding_text or "SWEET STUDIO").upper()[:16],
            fill=ink,
        )
        draw.text((stub_right_x + 35, ty2 - 60), "VIP PASS", fill=ink)

        canvas.save(output_path, "JPEG", quality=92)
        return output_path

    @classmethod
    def _compose_landscape_trio(
        cls,
        valid_paths: List[Path],
        output_path: Path,
        branding_text: str,
        filter_name: str,
        theme: Dict[str, Any],
        customer_name: Optional[str] = None,
        sticker_id: str = "sweet_bows",
    ) -> Path:
        """3 side-by-side vertical slots on a decorated Sweet Studio landscape card."""
        slot_w = 480
        slot_h = 640
        margin = 40
        footer_h = 120
        num = min(3, len(valid_paths))

        total_w = (slot_w * num) + (margin * (num + 1))
        total_h = slot_h + (margin * 2) + footer_h

        canvas = Image.new("RGB", (total_w, total_h), color=theme["bg"])
        draw = ImageDraw.Draw(canvas)

        cls._draw_sweet_frame_shell(draw, total_w, total_h, theme)

        curr_x = margin
        for idx, p in enumerate(valid_paths[:num]):
            with Image.open(p) as photo:
                fitted = ImageOps.fit(
                    photo, (slot_w, slot_h), Image.Resampling.LANCZOS
                )
                fitted = cls.apply_filter(fitted, filter_name)
                canvas.paste(fitted, (curr_x, margin))
                cls._draw_slot_frame_and_sticker(
                    draw, curr_x, margin, slot_w, slot_h, idx, theme, sticker_id=sticker_id
                )
                curr_x += slot_w + margin

        title = customer_name.strip() if customer_name else branding_text
        draw.text(
            (margin + 20, slot_h + margin + 25),
            f"✦ {title}  •  a little moment, a lovely memory ♡",
            fill=theme["text"],
        )
        draw.text(
            (margin + 20, slot_h + margin + 62),
            datetime.now().strftime("%d %B %Y"),
            fill=theme["subtext"],
        )

        canvas.save(output_path, "JPEG", quality=92)
        return output_path

    @classmethod
    def _compose_wide_recap(
        cls,
        photo_path: Path,
        output_path: Path,
        branding_text: str,
        filter_name: str,
        theme: Dict[str, Any],
        customer_name: Optional[str] = None,
        sticker_id: str = "sweet_bows",
    ) -> Path:
        """Single wide landscape photo on a decorated 16:9 postcard."""
        total_w, total_h = 1600, 1000
        margin = 60
        slot_w = total_w - (margin * 2)
        slot_h = total_h - (margin * 2) - 90

        canvas = Image.new("RGB", (total_w, total_h), color=theme["bg"])
        draw = ImageDraw.Draw(canvas)

        cls._draw_sweet_frame_shell(draw, total_w, total_h, theme)

        with Image.open(photo_path) as photo:
            fitted = ImageOps.fit(photo, (slot_w, slot_h), Image.Resampling.LANCZOS)
            fitted = cls.apply_filter(fitted, filter_name)
            canvas.paste(fitted, (margin, margin))
            cls._draw_slot_frame_and_sticker(
                draw, margin, margin, slot_w, slot_h, 0, theme, sticker_id=sticker_id
            )

        title = customer_name.strip() if customer_name else branding_text
        draw.text(
            (total_w // 2 - 140, total_h - 85),
            f"✦ {title}  •  {datetime.now().strftime('%d.%m.%Y')} ♡",
            fill=theme["text"],
        )

        canvas.save(output_path, "JPEG", quality=92)
        return output_path

    @classmethod
    def _compose_grid_2x2(
        cls,
        photo_paths: List[Path],
        output_path: Path,
        branding_text: str,
        filter_name: str,
        theme: Dict[str, Any],
        customer_name: Optional[str] = None,
        sticker_id: str = "sweet_bows",
    ) -> Path:
        slot_width = 600
        slot_height = 400
        margin = 30
        footer_height = 120

        total_width = (slot_width * 2) + (margin * 3)
        total_height = (slot_height * 2) + (margin * 3) + footer_height

        canvas = Image.new("RGB", (total_width, total_height), color=theme["bg"])
        draw = ImageDraw.Draw(canvas)

        cls._draw_sweet_frame_shell(draw, total_width, total_height, theme)

        positions = [
            (margin, margin),
            (margin * 2 + slot_width, margin),
            (margin, margin * 2 + slot_height),
            (margin * 2 + slot_width, margin * 2 + slot_height),
        ]

        for idx, path in enumerate(photo_paths[:4]):
            with Image.open(path) as photo:
                fitted = ImageOps.fit(
                    photo, (slot_width, slot_height), Image.Resampling.LANCZOS
                )
                fitted = cls.apply_filter(fitted, filter_name)
                px, py = positions[idx]
                canvas.paste(fitted, (px, py))
                cls._draw_slot_frame_and_sticker(
                    draw, px, py, slot_width, slot_height, idx, theme, sticker_id=sticker_id
                )

        # Center scrapbook flower emblem where the 4 photos meet
        center_x = total_width // 2
        center_y = margin + slot_height + (margin // 2)
        accent = theme.get("accent", (229, 115, 138))
        sticker_bg = theme.get("sticker_bg", (255, 249, 242))
        draw.ellipse(
            [center_x - 28, center_y - 28, center_x + 28, center_y + 28],
            fill=sticker_bg,
            outline=accent,
            width=3,
        )
        cls._draw_flower(draw, center_x, center_y, 17, accent)

        text_y = (slot_height * 2) + (margin * 3) + 22
        title = customer_name.strip() if customer_name else branding_text
        draw.text((total_width // 2 - 120, text_y), f"✦ {title} ✦", fill=theme["text"])
        draw.text(
            (total_width // 2 - 140, text_y + 38),
            "a little moment, a lovely memory  •  " + datetime.now().strftime("%d.%m.%Y"),
            fill=theme["subtext"],
        )

        canvas.save(output_path, "JPEG", quality=92)
        return output_path
