from typing import Optional
from backend.app.core.config import settings
from backend.app.services.camera.base import CameraInterface
from backend.app.services.camera.simulated import SimulatedCamera
from backend.app.services.camera.gphoto import GPhotoCamera
from backend.app.services.camera.wifi import WifiCamera

_camera_instance: Optional[CameraInterface] = None


def _build_camera_instance(
    driver: str,
    model_name: str,
    wifi_ip: str = "192.168.122.1",
    wifi_port: int = 8080,
    wifi_protocol: str = "sony_http",
) -> CameraInterface:
    drv = (driver or "simulation").lower().strip()
    if drv == "gphoto":
        return GPhotoCamera(model_name=model_name)
    if drv == "wifi":
        return WifiCamera(
            model_name=model_name,
            wifi_ip=wifi_ip,
            wifi_port=wifi_port,
            protocol=wifi_protocol,
        )
    return SimulatedCamera(model_name=model_name)


def get_camera_service() -> CameraInterface:
    global _camera_instance
    if _camera_instance is None:
        _camera_instance = _build_camera_instance(
            driver=settings.CAMERA_DRIVER,
            model_name=settings.CAMERA_MODEL,
            wifi_ip=settings.CAMERA_WIFI_IP,
            wifi_port=settings.CAMERA_WIFI_PORT,
            wifi_protocol=settings.CAMERA_WIFI_PROTOCOL,
        )
        _camera_instance.connect()
    return _camera_instance


def configure_camera_service(
    driver: str,
    model_name: Optional[str] = None,
    wifi_ip: Optional[str] = None,
    wifi_port: Optional[int] = None,
    wifi_protocol: Optional[str] = None,
) -> CameraInterface:
    """Switch camera driver / Wi-Fi settings at runtime from Admin Dashboard."""
    global _camera_instance
    if _camera_instance is not None:
        try:
            _camera_instance.disconnect()
        except Exception:
            pass

    settings.CAMERA_DRIVER = driver.lower().strip()
    if model_name:
        settings.CAMERA_MODEL = model_name.strip()
    if wifi_ip:
        settings.CAMERA_WIFI_IP = wifi_ip.strip()
    if wifi_port is not None:
        settings.CAMERA_WIFI_PORT = int(wifi_port)
    if wifi_protocol:
        settings.CAMERA_WIFI_PROTOCOL = wifi_protocol.lower().strip()

    _camera_instance = _build_camera_instance(
        driver=settings.CAMERA_DRIVER,
        model_name=settings.CAMERA_MODEL,
        wifi_ip=settings.CAMERA_WIFI_IP,
        wifi_port=settings.CAMERA_WIFI_PORT,
        wifi_protocol=settings.CAMERA_WIFI_PROTOCOL,
    )
    _camera_instance.connect()
    return _camera_instance


def set_camera_service(service: CameraInterface) -> None:
    """Override camera instance for testing purposes."""
    global _camera_instance
    _camera_instance = service
