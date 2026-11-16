"""
Sweetbooth Print Imposition Engine
Implements Section 4 & 5.3 of Sweetbooth Print Production System.

Responsible for placing one or multiple product designs onto physical print media
(Standard 4R = 4 x 6 inches = 1200 x 1800 px at 300 DPI) before physical or manual cutting.
"""

from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageOps


class PrintImpositionEngine:
    """
    Core Print Imposition Engine.
    Converts individual product designs into media-imposed print sheets with optional cutting guides.
    """

    DPI: int = 300
    DEFAULT_MEDIA_WIDTH: int = 1200  # 4 inches @ 300 DPI
    DEFAULT_MEDIA_HEIGHT: int = 1800  # 6 inches @ 300 DPI

    LAYOUT_A_DOUBLE_STRIP = "layout_a"
    LAYOUT_B_QUAD_MINI = "layout_b"
    LAYOUT_C_SINGLE_FULL = "layout_c"
    LAYOUT_D_CUSTOM_MIXED = "layout_d"

    LAYOUT_METADATA: Dict[str, Dict[str, Any]] = {
        LAYOUT_A_DOUBLE_STRIP: {
            "id": LAYOUT_A_DOUBLE_STRIP,
            "code": "A",
            "name": "Layout A - Double Strip",
            "description": "2 buah Photo Strip (2 x 6 inch) berdampingan pada 1 media 4R.",
            "media_inches": "4 x 6 inch",
            "media_size_px": (1200, 1800),
            "product_count": 2,
            "product_size_inches": "2 x 6 inch",
            "product_size_px": (600, 1800),
            "cutting_mechanism": "Potong vertikal di bagian tengah (X = 600 px).",
        },
        LAYOUT_B_QUAD_MINI: {
            "id": LAYOUT_B_QUAD_MINI,
            "code": "B",
            "name": "Layout B - Quad Mini Print",
            "description": "4 buah Mini Photo (2 x 3 inch) dalam grid 2x2 pada 1 media 4R.",
            "media_inches": "4 x 6 inch",
            "media_size_px": (1200, 1800),
            "product_count": 4,
            "product_size_inches": "2 x 3 inch",
            "product_size_px": (600, 900),
            "cutting_mechanism": "Potong silang (1 potong vertikal tengah + 1 potong horizontal tengah).",
        },
        LAYOUT_C_SINGLE_FULL: {
            "id": LAYOUT_C_SINGLE_FULL,
            "code": "C",
            "name": "Layout C - Single Full Print",
            "description": "1 buah Photo Collage / Postcard utuh (4 x 6 inch) tanpa pemotongan.",
            "media_inches": "4 x 6 inch",
            "media_size_px": (1200, 1800),
            "product_count": 1,
            "product_size_inches": "4 x 6 inch",
            "product_size_px": (1200, 1800),
            "cutting_mechanism": "Nol pemotongan (langsung jadi 1 lembar 4R).",
        },
        LAYOUT_D_CUSTOM_MIXED: {
            "id": LAYOUT_D_CUSTOM_MIXED,
            "code": "D",
            "name": "Layout D - Custom Mixed Layout",
            "description": "1 Foto Square Hero (4 x 4 inch) + 2 Mini Photo (2 x 2 inch).",
            "media_inches": "4 x 6 inch",
            "media_size_px": (1200, 1800),
            "product_count": 3,
            "product_size_inches": "1x (4 x 4 inch) + 2x (2 x 2 inch)",
            "product_size_px": "1x (1200 x 1200 px) + 2x (600 x 600 px)",
            "cutting_mechanism": "Potong horizontal pada Y = 1200 px, dan potong vertikal bawah pada X = 600 px.",
        },
    }

    @classmethod
    def list_layouts(cls) -> List[Dict[str, Any]]:
        """Return available imposition layout definitions."""
        return list(cls.LAYOUT_METADATA.values())

    @classmethod
    def get_layout(cls, layout_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve metadata for a specific imposition layout."""
        norm_id = layout_id.lower().replace("-", "_")
        for key, val in cls.LAYOUT_METADATA.items():
            if norm_id in (key, val["code"].lower(), f"layout_{val['code'].lower()}"):
                return val
        return None

    @classmethod
    def draw_dashed_line(
        cls,
        draw: ImageDraw.ImageDraw,
        start: Tuple[int, int],
        end: Tuple[int, int],
        color: Tuple[int, int, int] = (195, 195, 195),
        width: int = 2,
        dash_length: int = 12,
        gap_length: int = 12,
    ) -> None:
        """Draw an elegant dashed line representing a physical cutting guide."""
        x1, y1 = start
        x2, y2 = end

        if x1 == x2:  # Vertical line
            y = min(y1, y2)
            max_y = max(y1, y2)
            while y < max_y:
                next_y = min(y + dash_length, max_y)
                draw.line([(x1, y), (x1, next_y)], fill=color, width=width)
                y = next_y + gap_length
        elif y1 == y2:  # Horizontal line
            x = min(x1, x2)
            max_x = max(x1, x2)
            while x < max_x:
                next_x = min(x + dash_length, max_x)
                draw.line([(x, y1), (next_x, y1)], fill=color, width=width)
                x = next_x + gap_length
        else:
            draw.line([start, end], fill=color, width=width)

    @classmethod
    def draw_crop_marks(
        cls,
        draw: ImageDraw.ImageDraw,
        pos: Tuple[int, int],
        orientation: str = "both",
        mark_len: int = 24,
        color: Tuple[int, int, int] = (160, 160, 160),
        width: int = 2,
    ) -> None:
        """Draw corner / boundary crop marks for manual cutting alignment."""
        x, y = pos
        if orientation in ("vertical", "both"):
            draw.line([(x, max(0, y - mark_len)), (x, y + mark_len)], fill=color, width=width)
        if orientation in ("horizontal", "both"):
            draw.line([(max(0, x - mark_len), y), (x + mark_len, y)], fill=color, width=width)

    @classmethod
    def impose_double_strip(
        cls,
        strip_image: Image.Image,
        strip_image_2: Optional[Image.Image] = None,
        bg_color: Tuple[int, int, int] = (255, 255, 255),
        draw_cutting_guide: bool = True,
        gap: int = 0,
    ) -> Image.Image:
        """
        Layout A - Double Strip:
        Places two 2x6 inch strips (each 600x1800 px) side by side on a 4x6 media sheet (1200x1800 px).
        If strip_image_2 is not provided, duplicates strip_image.
        """
        target_w = 600
        target_h = cls.DEFAULT_MEDIA_HEIGHT

        # Ensure strip 1 is 600x1800
        s1 = strip_image.convert("RGB")
        if s1.size != (target_w, target_h):
            s1 = ImageOps.fit(s1, (target_w, target_h), Image.Resampling.LANCZOS)

        # Prepare strip 2
        if strip_image_2 is not None:
            s2 = strip_image_2.convert("RGB")
            if s2.size != (target_w, target_h):
                s2 = ImageOps.fit(s2, (target_w, target_h), Image.Resampling.LANCZOS)
        else:
            s2 = s1.copy()

        canvas = Image.new("RGB", (cls.DEFAULT_MEDIA_WIDTH, cls.DEFAULT_MEDIA_HEIGHT), color=bg_color)
        canvas.paste(s1, (0, 0))
        canvas.paste(s2, (600, 0))

        if draw_cutting_guide:
            draw = ImageDraw.Draw(canvas)
            mid_x = 600
            # Center cutting guide line
            cls.draw_dashed_line(draw, (mid_x, 15), (mid_x, cls.DEFAULT_MEDIA_HEIGHT - 15))
            # Edge crop marks
            cls.draw_crop_marks(draw, (mid_x, 0), orientation="vertical", mark_len=18)
            cls.draw_crop_marks(draw, (mid_x, cls.DEFAULT_MEDIA_HEIGHT), orientation="vertical", mark_len=18)

        return canvas

    @classmethod
    def impose_quad_mini(
        cls,
        mini_images: List[Image.Image],
        bg_color: Tuple[int, int, int] = (255, 255, 255),
        draw_cutting_guide: bool = True,
    ) -> Image.Image:
        """
        Layout B - Quad Mini Print:
        Places 4 mini photos (each 2x3 inch = 600x900 px) in a 2x2 grid on a 4x6 media sheet (1200x1800 px).
        """
        canvas = Image.new("RGB", (cls.DEFAULT_MEDIA_WIDTH, cls.DEFAULT_MEDIA_HEIGHT), color=bg_color)
        sub_w = 600
        sub_h = 900

        # Slot positions: (x, y)
        slots = [(0, 0), (600, 0), (0, 900), (600, 900)]

        for idx, (x, y) in enumerate(slots):
            if idx < len(mini_images):
                img = mini_images[idx].convert("RGB")
                fitted = ImageOps.fit(img, (sub_w, sub_h), Image.Resampling.LANCZOS)
            else:
                # Fallback to first image or placeholder
                fallback = mini_images[0] if mini_images else Image.new("RGB", (sub_w, sub_h), bg_color)
                fitted = ImageOps.fit(fallback.convert("RGB"), (sub_w, sub_h), Image.Resampling.LANCZOS)
            canvas.paste(fitted, (x, y))

        if draw_cutting_guide:
            draw = ImageDraw.Draw(canvas)
            mid_x = 600
            mid_y = 900

            # Vertical cut line
            cls.draw_dashed_line(draw, (mid_x, 15), (mid_x, cls.DEFAULT_MEDIA_HEIGHT - 15))
            # Horizontal cut line
            cls.draw_dashed_line(draw, (15, mid_y), (cls.DEFAULT_MEDIA_WIDTH - 15, mid_y))

            # Crop marks at all 4 borders
            cls.draw_crop_marks(draw, (mid_x, 0), orientation="vertical", mark_len=18)
            cls.draw_crop_marks(draw, (mid_x, cls.DEFAULT_MEDIA_HEIGHT), orientation="vertical", mark_len=18)
            cls.draw_crop_marks(draw, (0, mid_y), orientation="horizontal", mark_len=18)
            cls.draw_crop_marks(draw, (cls.DEFAULT_MEDIA_WIDTH, mid_y), orientation="horizontal", mark_len=18)

        return canvas

    @classmethod
    def impose_single_full(
        cls,
        full_image: Image.Image,
        bg_color: Tuple[int, int, int] = (255, 255, 255),
    ) -> Image.Image:
        """
        Layout C - Single Full Print:
        Fits one photo collage or postcard (4x6 inch = 1200x1800 px) directly onto the media sheet.
        Zero cutting required.
        """
        img = full_image.convert("RGB")
        if img.size == (cls.DEFAULT_MEDIA_WIDTH, cls.DEFAULT_MEDIA_HEIGHT):
            return img

        canvas = Image.new("RGB", (cls.DEFAULT_MEDIA_WIDTH, cls.DEFAULT_MEDIA_HEIGHT), color=bg_color)
        fitted = ImageOps.fit(img, (cls.DEFAULT_MEDIA_WIDTH, cls.DEFAULT_MEDIA_HEIGHT), Image.Resampling.LANCZOS)
        canvas.paste(fitted, (0, 0))
        return canvas

    @classmethod
    def impose_custom_mixed(
        cls,
        hero_image: Image.Image,
        mini_images: List[Image.Image],
        bg_color: Tuple[int, int, int] = (255, 255, 255),
        draw_cutting_guide: bool = True,
    ) -> Image.Image:
        """
        Layout D - Custom Mixed Layout:
        Places 1 Square Hero (4x4 inch = 1200x1200 px) at the top,
        and 2 Mini Photos (each 2x2 inch = 600x600 px) at the bottom.
        Total media size: 1200x1800 px (4x6 inch).
        """
        canvas = Image.new("RGB", (cls.DEFAULT_MEDIA_WIDTH, cls.DEFAULT_MEDIA_HEIGHT), color=bg_color)

        # 1. Hero Image (1200 x 1200 px)
        hero = ImageOps.fit(hero_image.convert("RGB"), (1200, 1200), Image.Resampling.LANCZOS)
        canvas.paste(hero, (0, 0))

        # 2. Mini Photo A (600 x 600 px at (0, 1200))
        img_a = mini_images[0] if len(mini_images) > 0 else hero_image
        mini_a = ImageOps.fit(img_a.convert("RGB"), (600, 600), Image.Resampling.LANCZOS)
        canvas.paste(mini_a, (0, 1200))

        # 3. Mini Photo B (600 x 600 px at (600, 1200))
        img_b = mini_images[1] if len(mini_images) > 1 else (mini_images[0] if mini_images else hero_image)
        mini_b = ImageOps.fit(img_b.convert("RGB"), (600, 600), Image.Resampling.LANCZOS)
        canvas.paste(mini_b, (600, 1200))

        if draw_cutting_guide:
            draw = ImageDraw.Draw(canvas)
            # Horizontal cut line at Y = 1200
            cls.draw_dashed_line(draw, (15, 1200), (cls.DEFAULT_MEDIA_WIDTH - 15, 1200))
            # Vertical cut line for lower half between mini A & B (X = 600, from Y = 1200 to 1800)
            cls.draw_dashed_line(draw, (600, 1215), (600, cls.DEFAULT_MEDIA_HEIGHT - 15))

            # Edge crop marks
            cls.draw_crop_marks(draw, (0, 1200), orientation="horizontal", mark_len=18)
            cls.draw_crop_marks(draw, (cls.DEFAULT_MEDIA_WIDTH, 1200), orientation="horizontal", mark_len=18)
            cls.draw_crop_marks(draw, (600, cls.DEFAULT_MEDIA_HEIGHT), orientation="vertical", mark_len=18)

        return canvas

    @classmethod
    def apply_imposition(
        cls,
        layout_id: str,
        images: List[Image.Image],
        bg_color: Tuple[int, int, int] = (255, 255, 255),
        draw_cutting_guide: bool = True,
    ) -> Image.Image:
        """
        Unified imposition router.
        Receives layout_id and input image(s), then produces the 4x6 print media sheet.
        """
        if not images:
            raise ValueError("No images provided for imposition.")

        norm_id = layout_id.lower().replace("-", "_")

        if norm_id in (cls.LAYOUT_A_DOUBLE_STRIP, "layout_a", "double_strip"):
            s1 = images[0]
            s2 = images[1] if len(images) > 1 else None
            return cls.impose_double_strip(s1, s2, bg_color=bg_color, draw_cutting_guide=draw_cutting_guide)

        elif norm_id in (cls.LAYOUT_B_QUAD_MINI, "layout_b", "quad_mini"):
            return cls.impose_quad_mini(images, bg_color=bg_color, draw_cutting_guide=draw_cutting_guide)

        elif norm_id in (cls.LAYOUT_C_SINGLE_FULL, "layout_c", "single_full"):
            return cls.impose_single_full(images[0], bg_color=bg_color)

        elif norm_id in (cls.LAYOUT_D_CUSTOM_MIXED, "layout_d", "custom_mixed"):
            hero = images[0]
            minis = images[1:] if len(images) > 1 else [images[0]]
            return cls.impose_custom_mixed(hero, minis, bg_color=bg_color, draw_cutting_guide=draw_cutting_guide)

        else:
            # Default fallback: single full print
            return cls.impose_single_full(images[0], bg_color=bg_color)
