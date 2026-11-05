import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from backend.app.core.config import settings
from backend.app.schemas.camera import CameraConfigRequest, CameraStatusResponse, CaptureResponse
from backend.app.services.camera import configure_camera_service, get_camera_service
from backend.app.services.camera.simulated import SimulatedCamera

router = APIRouter(prefix="/camera", tags=["Camera"])


def _serialize_camera_status(camera) -> CameraStatusResponse:
    status_info = camera.get_status()
    return CameraStatusResponse(
        connected=status_info["connected"],
        model=status_info.get("model", settings.CAMERA_MODEL),
        driver=status_info.get("driver", settings.CAMERA_DRIVER),
        battery_level=status_info.get("battery_level", 100),
        message=status_info.get("message", "Ready"),
        wifi_ip=status_info.get("wifi_ip", settings.CAMERA_WIFI_IP),
        wifi_port=status_info.get("wifi_port", settings.CAMERA_WIFI_PORT),
        wifi_protocol=status_info.get("wifi_protocol", settings.CAMERA_WIFI_PROTOCOL),
        hardware_reachable=status_info.get("hardware_reachable"),
    )


@router.get("/status", response_model=CameraStatusResponse)
def get_camera_status():
    camera = get_camera_service()
    return _serialize_camera_status(camera)


@router.post("/config", response_model=CameraStatusResponse)
def update_camera_config(payload: CameraConfigRequest):
    """Switch camera driver ('simulation', 'gphoto' USB, or 'wifi' Sony/PTP-IP) at runtime."""
    allowed_drivers = {"simulation", "gphoto", "wifi"}
    drv = payload.driver.lower().strip()
    if drv not in allowed_drivers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid camera driver '{payload.driver}'. Must be one of {sorted(allowed_drivers)}.",
        )
    camera = configure_camera_service(
        driver=drv,
        model_name=payload.model,
        wifi_ip=payload.wifi_ip,
        wifi_port=payload.wifi_port,
        wifi_protocol=payload.wifi_protocol,
    )
    return _serialize_camera_status(camera)

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


@router.get("/preview-frame")
def get_live_preview_frame():
    """Return a single live-view JPEG frame from the active camera (or simulated fallback)."""
    camera = get_camera_service()
    frame_bytes = camera.capture_preview_bytes()
    if not frame_bytes:
        fallback_cam = SimulatedCamera(model_name=settings.CAMERA_MODEL)
        frame_bytes = fallback_cam.capture_preview_bytes()
    return Response(
        content=frame_bytes,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@router.get("/stream")
async def stream_live_view():
    """MJPEG live stream endpoint for displaying real-time DSLR / Server Live View on the iPad Kiosk."""
    camera = get_camera_service()
    fallback_cam = SimulatedCamera(model_name=settings.CAMERA_MODEL)

    async def frame_generator():
        while True:
            frame_bytes = camera.capture_preview_bytes()
            if not frame_bytes:
                frame_bytes = fallback_cam.capture_preview_bytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            await asyncio.sleep(0.08)

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
