import base64
import io
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from PIL import Image, ImageDraw, ImageFont

from backend.app.services.storage.database import get_db_service
from backend.app.services.image.processor import ImageProcessor
from backend.app.api.auth import require_admin

router = APIRouter(prefix="/filters", tags=["Custom Filters"])


class FilterPresetModel(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    brightness: float = Field(default=1.0, ge=0.5, le=1.6)
    contrast: float = Field(default=1.0, ge=0.5, le=1.7)
    saturation: float = Field(default=1.0, ge=0.0, le=2.0)
    temperature: float = Field(default=1.0, ge=0.6, le=1.5)
    tint: float = Field(default=1.0, ge=0.7, le=1.4)
    smoothness: float = Field(default=0.0, ge=0.0, le=1.0)
    is_active: bool = True


class FilterPreviewRequest(BaseModel):
    image_data: Optional[str] = None
    brightness: float = Field(default=1.0)
    contrast: float = Field(default=1.0)
    saturation: float = Field(default=1.0)
    temperature: float = Field(default=1.0)
    tint: float = Field(default=1.0)
    smoothness: float = Field(default=0.0)


def create_sample_preview_portrait() -> Image.Image:
    """Generate a clean mock portrait image for instant live filter slider testing."""
    img = Image.new("RGB", (480, 480), (248, 237, 230))
    draw = ImageDraw.Draw(img)

    # Soft studio background gradient circle
    draw.ellipse([60, 60, 420, 420], fill=(244, 215, 205), outline=(238, 196, 184), width=3)
    # Face silhouette mock
    draw.ellipse([140, 110, 340, 330], fill=(235, 195, 175))
    # Rosy cheeks
    draw.ellipse([160, 220, 205, 255], fill=(245, 165, 175))
    draw.ellipse([275, 220, 320, 255], fill=(245, 165, 175))
    # Eyes
    draw.arc([180, 180, 220, 210], start=190, end=350, fill=(70, 50, 50), width=4)
    draw.arc([260, 180, 300, 210], start=190, end=350, fill=(70, 50, 50), width=4)
    # Smile
    draw.arc([210, 240, 270, 280], start=20, end=160, fill=(190, 70, 90), width=4)
    # Shoulders
    draw.ellipse([90, 300, 390, 520], fill=(210, 150, 170))

    return img


@router.get("/presets")
def get_custom_filters():
    """Retrieve all custom filter presets configured in SQLite."""
    return {"presets": get_db_service().list_custom_filters()}


@router.post("/presets")
def save_custom_filter(payload: FilterPresetModel, request: Request):
    """Create or update a custom filter preset. Restricted to Admin."""
    require_admin(request)
    data = payload.model_dump()
    if not data.get("id"):
        clean_id = payload.name.lower().strip().replace(" ", "_")
        clean_id = "".join(c for c in clean_id if c.isalnum() or c == "_")
        data["id"] = f"custom_{clean_id[:16]}_{uuid.uuid4().hex[:4]}"

    saved = get_db_service().save_custom_filter(data)
    return {"success": True, "preset": saved}


@router.delete("/presets/{preset_id}")
def delete_custom_filter(preset_id: str, request: Request):
    """Delete a custom filter preset. Restricted to Admin."""
    require_admin(request)
    deleted = get_db_service().delete_custom_filter(preset_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preset filter '{preset_id}' tidak ditemukan.",
        )
    return {"success": True, "deleted_id": preset_id}


@router.post("/preview")
def preview_filter(payload: FilterPreviewRequest):
    """Render a real-time preview of the filter parameters on an image or sample portrait."""
    if payload.image_data and "," in payload.image_data:
        try:
            b64_raw = payload.image_data.split(",", 1)[1]
            raw_bytes = base64.b64decode(b64_raw)
            img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            img.thumbnail((500, 500), Image.Resampling.LANCZOS)
        except Exception:
            img = create_sample_preview_portrait()
    else:
        img = create_sample_preview_portrait()

    params = payload.model_dump()
    filtered = ImageProcessor.apply_filter(img, custom_params=params)

    out_buf = io.BytesIO()
    filtered.save(out_buf, format="JPEG", quality=85)
    data_url = "data:image/jpeg;base64," + base64.b64encode(out_buf.getvalue()).decode("ascii")

    return {
        "success": True,
        "preview_url": data_url,
    }
