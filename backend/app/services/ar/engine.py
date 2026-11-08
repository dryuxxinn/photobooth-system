import json
import math
import random
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from PIL import Image, ImageEnhance, ImageOps

from backend.app.core.config import PROJECT_ROOT
from backend.app.services.ar.detector import FaceDetector
from backend.app.services.ar.models import ARPreset, EffectInstance, FaceData, StickerAsset


class StickerEngine:
    """
    Core Sticker & AR Overlay Engine for Sweet Studio.
    Handles asset manifest loading, anchor transformations, deterministic scatter,
    multi-face application, and Pillow RGBA non-destructive compositing.
    """

    def __init__(self, overlays_dir: Optional[Path] = None, detector: Optional[FaceDetector] = None):
        if overlays_dir is None:
            self.overlays_dir = PROJECT_ROOT / "templates" / "assets" / "overlays"
        else:
            self.overlays_dir = Path(overlays_dir)

        self.detector = detector or FaceDetector()
        self.assets: Dict[str, StickerAsset] = {}
        self.presets: Dict[str, ARPreset] = {}
        self._image_cache: Dict[str, Image.Image] = {}

        self.load_manifest()

    def load_manifest(self) -> None:
        """Load manifest.json from overlays directory."""
        manifest_path = self.overlays_dir / "manifest.json"
        if not manifest_path.exists():
            print(f"[AR Warning] Manifest not found at {manifest_path}")
            return

        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assets.clear()
        for raw_asset in data.get("assets", []):
            try:
                asset_obj = StickerAsset(**raw_asset)
                # Attach preview URL pointing to static template-assets
                rel_path = asset_obj.asset.replace("\\", "/")
                asset_obj.preview_url = f"/template-assets/overlays/{rel_path}"
                self.assets[asset_obj.id] = asset_obj
            except Exception as e:
                print(f"[AR Warning] Error parsing asset {raw_asset.get('id')}: {e}")

        self.presets.clear()
        for raw_preset in data.get("presets", []):
            try:
                preset_obj = ARPreset(**raw_preset)
                self.presets[preset_obj.id] = preset_obj
            except Exception as e:
                print(f"[AR Warning] Error parsing preset {raw_preset.get('id')}: {e}")

    def get_assets(self, category: Optional[str] = None) -> List[StickerAsset]:
        """Return list of enabled sticker assets, optionally filtered by category."""
        res = [a for a in self.assets.values() if a.enabled]
        if category and category.lower() != "all":
            res = [a for a in res if a.category.lower() == category.lower()]
        return res

    def get_asset(self, asset_id: str) -> Optional[StickerAsset]:
        return self.assets.get(asset_id)

    def get_presets(self) -> List[ARPreset]:
        return list(self.presets.values())

    def get_preset(self, preset_id: str) -> Optional[ARPreset]:
        return self.presets.get(preset_id)

    def _load_asset_image(self, asset_obj: StickerAsset) -> Optional[Image.Image]:
        """Load and cache PIL RGBA image of a sticker asset."""
        if asset_obj.id in self._image_cache:
            return self._image_cache[asset_obj.id]

        file_path = self.overlays_dir / asset_obj.asset
        if not file_path.exists():
            print(f"[AR Error] Asset file not found: {file_path}")
            return None

        im = Image.open(file_path).convert("RGBA")
        self._image_cache[asset_obj.id] = im
        return im

    def _get_anchor_pos(self, anchors, anchor_name: str, img_w: int, img_h: int) -> Tuple[float, float]:
        """Retrieve pixel coordinate (x, y) for anchor name."""
        name = (anchor_name or "face_center").lower()
        if hasattr(anchors, name):
            norm_x, norm_y = getattr(anchors, name)
        else:
            norm_x, norm_y = anchors.face_center
        return (norm_x * img_w, norm_y * img_h)

    @staticmethod
    def _paste_tasks(canvas: Image.Image, tasks: List[Tuple]) -> None:
        """Composite a z-index sorted list of sticker draw tasks onto RGBA canvas."""
        for task in tasks:
            _, _, src_im, center_pos, target_size, rot_deg, opac = task
            tw, th = max(4, target_size[0]), max(4, target_size[1])

            # Resize sticker
            resized = src_im.resize((tw, th), Image.Resampling.LANCZOS)

            # Apply opacity if < 1.0
            if opac < 0.99:
                r, g, b, a = resized.split()
                a = ImageEnhance.Brightness(a).enhance(opac)
                resized = Image.merge("RGBA", (r, g, b, a))

            # Rotate sticker if needed
            if abs(rot_deg) > 0.5:
                # expand=True to preserve edges without clipping
                resized = resized.rotate(-rot_deg, resample=Image.Resampling.BICUBIC, expand=True)

            rw, rh = resized.size
            top_left_x = int(center_pos[0] - rw / 2.0)
            top_left_y = int(center_pos[1] - rh / 2.0)

            # Alpha paste onto canvas
            canvas.paste(resized, (top_left_x, top_left_y), resized)

    def render_effects(
        self,
        base_image: Image.Image,
        effects: List[EffectInstance],
        faces: Optional[List[FaceData]] = None,
        seed: int = 42,
        filter_name: Optional[str] = None,
        inherit_color_grading: bool = False,
    ) -> Image.Image:
        """
        Apply list of effect instances and optional color filter onto base image non-destructively.
        Respects each sticker's inherit_color_grading flag (Section 13.5):
        - Stickers with inherit_color_grading=True are composited BEFORE color filter.
        - Stickers with inherit_color_grading=False (default) are composited AFTER color filter
          so cute pastel stickers stay vibrant even on B&W / Vintage / Sepia photos.
        """
        canvas = ImageOps.exif_transpose(base_image).convert("RGBA")
        img_w, img_h = canvas.size

        # Always detect faces on the original unfiltered image for maximum MediaPipe accuracy
        has_face_deps = any(
            self.assets.get(eff.asset_id) and self.assets[eff.asset_id].type in ("face-anchored", "random-scatter")
            for eff in effects
        )
        if has_face_deps and faces is None:
            faces = self.detector.detect_faces(canvas)
        elif faces is None:
            faces = []

        # Prepare draw tasks: (z_index, inherit_cg, sticker_img, pos, size, rot, opacity)
        draw_tasks = []

        for eff in effects:
            asset = self.assets.get(eff.asset_id)
            if not asset or not asset.enabled:
                continue

            sticker_img = self._load_asset_image(asset)
            if not sticker_img:
                continue

            z_idx = eff.z_index if eff.z_index is not None else asset.render.z_index
            opacity = eff.opacity if eff.opacity is not None else asset.render.opacity
            scale_mult = eff.scale if eff.scale is not None else asset.placement.scale
            rot_offset = eff.rotation if eff.rotation is not None else asset.placement.rotation_offset
            off_x_norm = eff.offset_x if eff.offset_x is not None else asset.placement.offset_x
            off_y_norm = eff.offset_y if eff.offset_y is not None else asset.placement.offset_y
            anchor_name = eff.anchor or asset.anchor or "face_center"
            inherit_cg = bool(inherit_color_grading or asset.render.inherit_color_grading)

            if asset.type == "face-anchored":
                # Determine target faces
                target_faces = faces
                if eff.face_id is not None:
                    target_faces = [f for f in faces if f.face_id == eff.face_id]

                for face in target_faces:
                    # Calculate position from anchor
                    anc_x, anc_y = self._get_anchor_pos(face.anchors, anchor_name, img_w, img_h)
                    pos_x = anc_x + (off_x_norm * img_w)
                    pos_y = anc_y + (off_y_norm * img_h)

                    # Scale proportional to face size / eye distance
                    # Standard eye distance ~ 0.15 of image width
                    face_scale_ratio = max(face.eye_distance / 0.15, 0.4)
                    target_w = int(sticker_img.width * scale_mult * face_scale_ratio * (img_w / 1800.0))
                    target_h = int(sticker_img.height * (target_w / sticker_img.width))

                    # Rotate based on face roll angle + offset
                    total_rot = face.roll_angle_degrees + rot_offset

                    draw_tasks.append((
                        z_idx,
                        inherit_cg,
                        sticker_img,
                        (pos_x, pos_y),
                        (target_w, target_h),
                        total_rot,
                        opacity,
                    ))

            elif asset.type == "random-scatter":
                # Deterministic random scatter using seed
                rng = random.Random(seed + hash(asset.id) % 10000)
                num_copies = 6
                margin = 40

                # Face avoidance bounding boxes
                face_boxes = []
                for f in faces:
                    bx = f.bounding_box.x * img_w
                    by = f.bounding_box.y * img_h
                    bw = f.bounding_box.width * img_w
                    bh = f.bounding_box.height * img_h
                    # Add 15px padding
                    face_boxes.append((bx - 15, by - 15, bx + bw + 15, by + bh + 15))

                placed = 0
                attempts = 0
                while placed < num_copies and attempts < 40:
                    attempts += 1
                    rx = rng.randint(margin, img_w - margin)
                    ry = rng.randint(margin, img_h - margin)

                    # Check face collision
                    collided = False
                    for x1, y1, x2, y2 in face_boxes:
                        if x1 <= rx <= x2 and y1 <= ry <= y2:
                            collided = True
                            break
                    if collided and attempts < 35:
                        continue

                    # Random slight variance in scale & rotation
                    s_var = rng.uniform(0.75, 1.25) * scale_mult
                    rot_var = rng.uniform(0, 360)
                    target_w = int(sticker_img.width * s_var * (img_w / 1800.0))
                    target_h = int(sticker_img.height * (target_w / max(1, sticker_img.width)))

                    draw_tasks.append((
                        z_idx,
                        inherit_cg,
                        sticker_img,
                        (rx, ry),
                        (target_w, target_h),
                        rot_var,
                        opacity,
                    ))
                    placed += 1

            elif asset.type == "canvas-position":
                pos_x = (off_x_norm + 0.5) * img_w
                pos_y = (off_y_norm + 0.5) * img_h
                target_w = int(sticker_img.width * scale_mult * (img_w / 1800.0))
                target_h = int(sticker_img.height * (target_w / sticker_img.width))

                draw_tasks.append((
                    z_idx,
                    inherit_cg,
                    sticker_img,
                    (pos_x, pos_y),
                    (target_w, target_h),
                    rot_offset,
                    opacity,
                ))

        # Sort tasks by z-index
        draw_tasks.sort(key=lambda t: t[0])

        pre_filter_tasks = [t for t in draw_tasks if t[1]]
        post_filter_tasks = [t for t in draw_tasks if not t[1]]

        # 1. Paste stickers that inherit color grading
        if pre_filter_tasks:
            self._paste_tasks(canvas, pre_filter_tasks)

        # 2. Apply photo color filter if requested
        if filter_name and filter_name.lower().strip() not in ("original", "none", ""):
            from backend.app.services.image.processor import ImageProcessor
            filtered_rgb = ImageProcessor.apply_filter(canvas.convert("RGB"), filter_name)
            canvas = filtered_rgb.convert("RGBA")

        # 3. Paste stickers that do NOT inherit color grading (stay vibrant)
        if post_filter_tasks:
            self._paste_tasks(canvas, post_filter_tasks)

        return canvas.convert("RGB")

    def render_preset(
        self,
        base_image: Image.Image,
        preset_id: str,
        faces: Optional[List[FaceData]] = None,
        seed: int = 42,
        filter_name: Optional[str] = None,
        inherit_color_grading: bool = False,
    ) -> Image.Image:
        """Render a full named AR Preset (e.g. pink_bunny_sweet) with optional color filter."""
        preset = self.presets.get(preset_id)
        if not preset:
            if filter_name and filter_name.lower().strip() not in ("original", "none", ""):
                from backend.app.services.image.processor import ImageProcessor
                return ImageProcessor.apply_filter(base_image, filter_name)
            return base_image.copy()

        effects = [EffectInstance(asset_id=aid) for aid in preset.asset_ids]
        return self.render_effects(
            base_image,
            effects=effects,
            faces=faces,
            seed=seed,
            filter_name=filter_name,
            inherit_color_grading=inherit_color_grading,
        )
