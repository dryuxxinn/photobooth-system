from backend.app.services.ar.detector import FaceDetector
from backend.app.services.ar.engine import StickerEngine
from backend.app.services.ar.models import (
    AnchorCoordinates,
    ARRenderRequest,
    ARRenderResponse,
    FaceAnalyzeResponse,
    FaceBoundingBox,
    FaceData,
    EffectInstance,
    ARPreset,
    StickerAsset,
)

_sticker_engine_instance = None


def get_sticker_engine() -> StickerEngine:
    global _sticker_engine_instance
    if _sticker_engine_instance is None:
        _sticker_engine_instance = StickerEngine()
    return _sticker_engine_instance


def set_sticker_engine(engine: StickerEngine) -> None:
    global _sticker_engine_instance
    _sticker_engine_instance = engine
