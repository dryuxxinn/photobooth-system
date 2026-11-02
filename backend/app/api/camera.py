from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from backend.app.core.config import settings
from backend.app.schemas.camera import CameraStatusResponse, CaptureResponse
from backend.app.services.camera import get_camera_service

router = APIRouter(prefix="/camera", tags=["Camera"])

@router.get("/status", response_model=CameraStatusResponse)
def get_camera_status():
    camera = get_camera_service()
    status_info = camera.get_status()
    return CameraStatusResponse(
        connected=status_info["connected"],
        model=status_info.get("model", settings.CAMERA_MODEL),
        driver=status_info.get("driver", settings.CAMERA_DRIVER),
        battery_level=status_info.get("battery_level", 100),
        message=status_info.get("message", "Ready")
    )

@router.post("/capture", response_model=CaptureResponse)
def capture_test_photo():
    camera = get_camera_service()
    if not camera.is_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera is disconnected or unavailable."
        )

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"standalone_{timestamp}.jpg"
    target_path = settings.CAPTURES_DIR / filename

    try:
        res = camera.capture_image(target_path)
        return CaptureResponse(
            success=True,
            file_path=res["file_path"],
            filename=res["filename"],
            width=res.get("width", 1800),
            height=res.get("height", 1200),
            timestamp=res["timestamp"],
            message="Photo captured successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Camera capture failed: {str(e)}"
        )

@router.post("/connect")
def connect_camera():
    camera = get_camera_service()
    success = camera.connect()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect to camera."
        )
    return {"message": "Camera connected successfully"}

@router.post("/disconnect")
def disconnect_camera():
    camera = get_camera_service()
    camera.disconnect()
    return {"message": "Camera disconnected"}
