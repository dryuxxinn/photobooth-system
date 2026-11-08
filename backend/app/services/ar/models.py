from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class AnchorCoordinates(BaseModel):
    head_top: Tuple[float, float]
    forehead: Tuple[float, float]
    eyes_center: Tuple[float, float]
    left_eye: Tuple[float, float]
    right_eye: Tuple[float, float]
    nose: Tuple[float, float]
    left_cheek: Tuple[float, float]
    right_cheek: Tuple[float, float]
    mouth: Tuple[float, float]
    chin: Tuple[float, float]
    face_center: Tuple[float, float]


class FaceBoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class FaceData(BaseModel):
    face_id: int
    bounding_box: FaceBoundingBox
    anchors: AnchorCoordinates
    roll_angle_degrees: float = 0.0
    eye_distance: float = 0.1
    confidence: float = 1.0


class FaceAnalyzeResponse(BaseModel):
    success: bool
    image_width: int
    image_height: int
    faces_detected: int
    faces: List[FaceData]
    message: str = "Analysis completed"


class StickerPlacement(BaseModel):
    scale: float = 1.0
    offset_x: float = 0.0
    offset_y: float = 0.0
    rotation_offset: float = 0.0


class StickerRender(BaseModel):
    opacity: float = 1.0
    z_index: int = 20
    fit: str = "contain"
    inherit_color_grading: bool = False


class StickerAsset(BaseModel):
    id: str
    name: str
    category: str
    type: str  # "face-anchored" | "canvas-position" | "random-scatter"
    asset: str
    anchor: Optional[str] = None
    placement: StickerPlacement = Field(default_factory=StickerPlacement)
    render: StickerRender = Field(default_factory=StickerRender)
    enabled: bool = True
    preview_url: Optional[str] = None


class ARPreset(BaseModel):
    id: str
    name: str
    description: str
    asset_ids: List[str]


class EffectInstance(BaseModel):
    asset_id: str
    face_id: Optional[int] = None  # None means apply to all detected faces
    anchor: Optional[str] = None
    scale: Optional[float] = None
    offset_x: Optional[float] = None
    offset_y: Optional[float] = None
    rotation: Optional[float] = None
    opacity: Optional[float] = None
    z_index: Optional[int] = None


class ARRenderRequest(BaseModel):
    image_path: Optional[str] = None
    image_data: Optional[str] = None  # Base64 data URL
    photo_id: Optional[str] = None
    session_id: Optional[str] = None
    preset_id: Optional[str] = None
    filter_name: Optional[str] = "original"
    effects: List[EffectInstance] = Field(default_factory=list)
    seed: int = 42
    inherit_color_grading: bool = False
    is_preview: bool = False


class ARRenderResponse(BaseModel):
    success: bool
    rendered_image_url: str
    faces_detected: int
    effects_applied: int
    message: str = "AR effects rendered successfully"
