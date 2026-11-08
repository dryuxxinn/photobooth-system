import base64
import io
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from PIL import Image, ImageOps

from backend.app.core.config import settings
from backend.app.services.ar import get_sticker_engine
from backend.app.services.ar.models import (
    ARPreset,
    ARRenderRequest,
    ARRenderResponse,
    FaceAnalyzeResponse,
    StickerAsset,
)
from backend.app.services.session import get_session_manager
from backend.app.services.storage.database import get_db_service

router = APIRouter(prefix="/ar", tags=["AR & Stickers"])


def _load_input_image(
    photo_id: Optional[str] = None,
    session_id: Optional[str] = None,
    image_path: Optional[str] = None,
    image_data: Optional[str] = None,
) -> Image.Image:
    """Helper to resolve PIL image from photo_id, path, or base64 data."""
    if image_data:
        try:
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
            raw_bytes = base64.b64decode(image_data)
            return ImageOps.exif_transpose(Image.open(io.BytesIO(raw_bytes)))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 image data: {str(e)}",
            )

    if photo_id:
        # Check active session first
        manager = get_session_manager()
        curr = manager.get_current_session()
        target_path: Optional[Path] = None

        if curr and (session_id is None or curr.get("session_id") == session_id):
            for p in curr.get("photos", []):
                if p["id"] == photo_id or p["filename"] == photo_id:
                    target_path = Path(p["original_path"])
                    break

        if not target_path or not target_path.exists():
            # Check SQLite database
            db_photo = get_db_service().get_photo(photo_id)
            if db_photo and Path(db_photo["original_path"]).exists():
                target_path = Path(db_photo["original_path"])

        if not target_path or not target_path.exists():
            # Check directly in captures dir
            direct_p = settings.CAPTURES_DIR / photo_id
            if direct_p.exists():
                target_path = direct_p

        if target_path and target_path.exists():
            return ImageOps.exif_transpose(Image.open(target_path))

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo with ID '{photo_id}' not found.",
        )

    if image_path:
        p = Path(image_path)
        if not p.is_absolute():
            p = settings.BASE_DIR / image_path
        if not p.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image file '{image_path}' not found.",
            )
        return ImageOps.exif_transpose(Image.open(p))

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Must provide either photo_id, image_path, or image_data.",
    )


@router.get("/assets", response_model=List[StickerAsset])
def get_sticker_assets(category: Optional[str] = Query(None, description="Filter category")):
    """Get list of active sticker assets (face accessories, decorations, floating, frame)."""
    engine = get_sticker_engine()
    return engine.get_assets(category=category)


@router.get("/presets", response_model=List[ARPreset])
def get_ar_presets():
    """Get available Sweet Studio AR presets (e.g. pink_bunny_sweet, cute_glasses_blush)."""
    engine = get_sticker_engine()
    return engine.get_presets()


@router.get("/presets/{preset_id}", response_model=ARPreset)
def get_ar_preset_by_id(preset_id: str):
    """Get details of a specific AR preset."""
    engine = get_sticker_engine()
    preset = engine.get_preset(preset_id)
    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AR preset '{preset_id}' not found.",
        )
    return preset


@router.post("/analyze", response_model=FaceAnalyzeResponse)
def analyze_faces(payload: ARRenderRequest):
    """Detect faces and return 11 facial anchors, bounding boxes, and head roll angle."""
    img = _load_input_image(
        photo_id=payload.photo_id,
        session_id=payload.session_id,
        image_path=payload.image_path,
        image_data=payload.image_data,
    )
    engine = get_sticker_engine()
    faces = engine.detector.detect_faces(img)

    return FaceAnalyzeResponse(
        success=True,
        image_width=img.width,
        image_height=img.height,
        faces_detected=len(faces),
        faces=faces,
        message=f"Detected {len(faces)} face(s)",
    )


@router.post("/preview", response_model=ARRenderResponse)
def preview_ar_effect(payload: ARRenderRequest):
    """Generate a fast preview with AR presets or effects applied."""
    img = _load_input_image(
        photo_id=payload.photo_id,
        session_id=payload.session_id,
        image_path=payload.image_path,
        image_data=payload.image_data,
    )

    # Downscale for snappy kiosk preview if larger than 1080px
    max_dim = 1080
    if max(img.width, img.height) > max_dim:
        scale = max_dim / max(img.width, img.height)
        new_w = int(img.width * scale)
        new_h = int(img.height * scale)
        img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    engine = get_sticker_engine()
    faces = engine.detector.detect_faces(img)

    effects_applied = 0
    if payload.preset_id and payload.preset_id.lower() not in ("none", "off", ""):
        result_img = engine.render_preset(
            img,
            payload.preset_id,
            faces=faces,
            seed=payload.seed,
            filter_name=payload.filter_name,
            inherit_color_grading=payload.inherit_color_grading,
        )
        preset = engine.get_preset(payload.preset_id)
        effects_applied = len(preset.asset_ids) if preset else 1
    elif payload.effects:
        result_img = engine.render_effects(
            img,
            payload.effects,
            faces=faces,
            seed=payload.seed,
            filter_name=payload.filter_name,
            inherit_color_grading=payload.inherit_color_grading,
        )
        effects_applied = len(payload.effects)
    elif payload.filter_name and payload.filter_name.lower() not in ("original", "none", ""):
        from backend.app.services.image.processor import ImageProcessor
        result_img = ImageProcessor.apply_filter(img, payload.filter_name)
    else:
        result_img = img

    out_filename = f"preview_ar_{uuid.uuid4().hex[:10]}.jpg"
    out_path = settings.PROCESSED_DIR / out_filename
    settings.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    result_img.save(out_path, "JPEG", quality=85)

    return ARRenderResponse(
        success=True,
        rendered_image_url=f"/storage/processed/{out_filename}",
        faces_detected=len(faces),
        effects_applied=effects_applied,
        message="Preview generated successfully",
    )


@router.post("/render", response_model=ARRenderResponse)
def render_ar_effect(payload: ARRenderRequest):
    """Render high-resolution photo with AR stickers/overlays applied non-destructively."""
    img = _load_input_image(
        photo_id=payload.photo_id,
        session_id=payload.session_id,
        image_path=payload.image_path,
        image_data=payload.image_data,
    )

    engine = get_sticker_engine()
    faces = engine.detector.detect_faces(img)

    effects_applied = 0
    if payload.preset_id and payload.preset_id.lower() not in ("none", "off", ""):
        result_img = engine.render_preset(
            img,
            payload.preset_id,
            faces=faces,
            seed=payload.seed,
            filter_name=payload.filter_name,
            inherit_color_grading=payload.inherit_color_grading,
        )
        preset = engine.get_preset(payload.preset_id)
        effects_applied = len(preset.asset_ids) if preset else 1
    elif payload.effects:
        result_img = engine.render_effects(
            img,
            payload.effects,
            faces=faces,
            seed=payload.seed,
            filter_name=payload.filter_name,
            inherit_color_grading=payload.inherit_color_grading,
        )
        effects_applied = len(payload.effects)
    elif payload.filter_name and payload.filter_name.lower() not in ("original", "none", ""):
        from backend.app.services.image.processor import ImageProcessor
        result_img = ImageProcessor.apply_filter(img, payload.filter_name)
    else:
        result_img = img

    out_filename = f"ar_{uuid.uuid4().hex[:10]}.jpg"
    out_path = settings.PROCESSED_DIR / out_filename
    settings.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    result_img.save(out_path, "JPEG", quality=95)

    return ARRenderResponse(
        success=True,
        rendered_image_url=f"/storage/processed/{out_filename}",
        faces_detected=len(faces),
        effects_applied=effects_applied,
        message="Full-resolution AR photo rendered successfully",
    )
