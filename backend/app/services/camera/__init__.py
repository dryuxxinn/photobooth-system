from backend.app.core.config import settings
from backend.app.services.camera.base import CameraInterface
from backend.app.services.camera.simulated import SimulatedCamera
from backend.app.services.camera.gphoto import GPhotoCamera

_camera_instance: CameraInterface = None

def get_camera_service() -> CameraInterface:
    global _camera_instance
    if _camera_instance is None:
        if settings.CAMERA_DRIVER.lower() == "gphoto":
            _camera_instance = GPhotoCamera(model_name=settings.CAMERA_MODEL)
            _camera_instance.connect()
        else:
            _camera_instance = SimulatedCamera(model_name=settings.CAMERA_MODEL)
            _camera_instance.connect()
    return _camera_instance

def set_camera_service(service: CameraInterface) -> None:
    """Override camera instance for testing purposes."""
    global _camera_instance
    _camera_instance = service
