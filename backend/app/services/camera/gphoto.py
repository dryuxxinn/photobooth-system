import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from backend.app.services.camera.base import CameraInterface

class GPhotoCamera(CameraInterface):
    """
    Real camera driver communicating with Canon EOS 700D via gPhoto2 CLI or libgphoto2.
    Designed for Ubuntu Server deployment.
    """

    def __init__(self, model_name: str = "Canon EOS 700D"):
        self.model_name = model_name
        self._connected = False
        self._gphoto_path = shutil.which("gphoto2")

    def is_available(self) -> bool:
        return self._gphoto_path is not None

    def connect(self) -> bool:
        if not self.is_available():
            self._connected = False
            return False

        try:
            result = subprocess.run(
                ["gphoto2", "--auto-detect"],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._connected = "Canon" in result.stdout or "Camera" in result.stdout
            return self._connected
        except Exception:
            self._connected = False
            return False

    def disconnect(self) -> None:
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected

    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": self._connected,
            "model": self.model_name,
            "driver": "gphoto2",
            "gphoto_installed": self.is_available(),
            "message": "Ready" if self._connected else "Camera not detected or gphoto2 unavailable"
        }

    def capture_image(self, target_path: Path) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("gphoto2 executable is not installed on this system.")

        if not self._connected:
            raise RuntimeError("Canon camera is not connected.")

        target_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            "gphoto2",
            "--capture-image-and-download",
            f"--filename={str(target_path)}",
            "--force-overwrite"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            raise RuntimeError(f"gphoto2 capture failed: {result.stderr}")

        now = datetime.now(timezone.utc)
        return {
            "success": True,
            "file_path": str(target_path),
            "filename": target_path.name,
            "timestamp": now.isoformat()
        }
