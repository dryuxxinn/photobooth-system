from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SessionState(str, Enum):
    IDLE = "IDLE"
    STARTED = "STARTED"
    CAPTURING = "CAPTURING"
    PROCESSING = "PROCESSING"
    PREVIEW = "PREVIEW"
    PRINTING = "PRINTING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"
    ABORTED = "ABORTED"


class PhotoItem(BaseModel):
    id: str
    filename: str
    original_path: str
    thumbnail_path: Optional[str] = None
    original_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    created_at: str
    index: int


class StartSessionRequest(BaseModel):
    customer_name: Optional[str] = None
    photos_required: Optional[int] = Field(default=None, ge=1, le=12)
    template_id: Optional[str] = "classic_strip_3"
    frame_color: Optional[str] = "cream"
    filter_name: Optional[str] = "original"
    ar_preset_id: Optional[str] = None
    payment_amount: Optional[int] = Field(default=0, ge=0)
    payment_method: Optional[str] = "QRIS"
    payment_status: Optional[str] = "PAID"
    payment_ref: Optional[str] = None
    force: Optional[bool] = False


class CapturePhotoRequest(BaseModel):
    image_data: Optional[str] = None


class ProcessImageRequest(BaseModel):
    session_id: Optional[str] = None
    template_id: Optional[str] = None
    filter_name: Optional[str] = None
    frame_color: Optional[str] = None
    sticker_id: Optional[str] = None
    ar_preset_id: Optional[str] = None
    custom_text: Optional[str] = None
    selected_photo_ids: Optional[List[str]] = None


class CustomOverlayUploadRequest(BaseModel):
    image_data: str


class QrisCreateRequest(BaseModel):
    amount: Optional[int] = Field(default=None, ge=1)
    package_name: Optional[str] = "Sweet Studio Regular Session"


class VoucherVerifyRequest(BaseModel):
    code: str
    valid_codes: Optional[List[str]] = None


class CloudSyncRequest(BaseModel):
    public_base_url: Optional[str] = None


class PrintRequest(BaseModel):
    session_id: Optional[str] = None
    copies: int = Field(default=1, ge=1, le=5)


class SessionDetailResponse(BaseModel):
    session_id: str
    status: SessionState
    customer_name: Optional[str] = None
    photos_required: int
    photos_taken: int
    photos: List[PhotoItem] = []
    selected_photo_ids: Optional[List[str]] = None
    template_id: Optional[str] = None
    filter_name: Optional[str] = "original"
    frame_color: Optional[str] = "cream"
    sticker_id: Optional[str] = "sweet_bows"
    ar_preset_id: Optional[str] = None
    processed_image_path: Optional[str] = None
    processed_image_url: Optional[str] = None
    gif_path: Optional[str] = None
    gif_url: Optional[str] = None
    cloud_share_url: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    payment_amount: Optional[int] = 0
    payment_method: Optional[str] = "QRIS"
    payment_status: Optional[str] = "PAID"
    payment_ref: Optional[str] = None
    force: Optional[bool] = False


class SessionCurrentResponse(BaseModel):
    active: bool
    state: SessionState = SessionState.IDLE
    session: Optional[SessionDetailResponse] = None
