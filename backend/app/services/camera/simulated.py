import io
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any
from PIL import Image, ImageDraw, ImageFont

from backend.app.services.camera.base import CameraInterface

class SimulatedCamera(CameraInterface):
    """
    Software simulated camera implementing Canon EOS 700D behavior.
    Generates test images dynamically with Pillow without requiring physical hardware.
    """

    def __init__(self, model_name: str = "Canon EOS 700D (Simulated)", capture_delay: float = 0.1):
        self.model_name = model_name
        self.capture_delay = capture_delay
        self._connected = True
        self._capture_count = 0
        self._simulate_failure = False

    def connect(self) -> bool:
        self._connected = True
        return True

    def disconnect(self) -> None:
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected

    def set_simulate_failure(self, failure: bool) -> None:
        """Allow unit tests to simulate shutter / communication failure."""
        self._simulate_failure = failure

    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": self._connected,
            "model": self.model_name,
            "driver": "simulation",
            "battery_level": 100,
            "capture_count": self._capture_count,
            "message": "Ready" if self._connected else "Camera disconnected"
        }

    def capture_image(self, target_path: Path) -> Dict[str, Any]:
        if not self._connected:
            raise RuntimeError("Camera is disconnected. Cannot capture.")

        if self._simulate_failure:
            raise RuntimeError("Simulated camera hardware capture failure.")

        # Simulate shutter lag
        if self.capture_delay > 0:
            time.sleep(self.capture_delay)

        self._capture_count += 1
        now = datetime.now(timezone.utc)
        timestamp_str = now.isoformat()

        # Generate a test image with 3:2 aspect ratio (1800x1200)
        width, height = 1800, 1200
        studio_palettes = [
            ((253, 232, 238), (233, 130, 145), (73, 59, 59)),
            ((237, 232, 250), (148, 128, 210), (73, 59, 59)),
            ((229, 243, 255), (105, 165, 225), (73, 59, 59)),
            ((232, 246, 238), (110, 180, 140), (73, 59, 59)),
        ]
        bg_color, accent_color, ink_color = studio_palettes[
            (self._capture_count - 1) % len(studio_palettes)
        ]

        image = Image.new("RGB", (width, height), color=bg_color)
        draw = ImageDraw.Draw(image)

        # Draw soft studio frame border
        border_margin = 42
        draw.rectangle(
            [border_margin, border_margin, width - border_margin, height - border_margin],
            outline=accent_color,
            width=8,
        )

        # Draw friendly studio portrait silhouette in center
        cx, cy = width // 2, height // 2
        draw.ellipse(
            [cx - 320, cy - 360, cx + 320, cy + 280],
            fill=(255, 255, 255),
            outline=accent_color,
            width=6,
        )
        # Head & shoulders silhouette
        draw.ellipse(
            [cx - 115, cy - 230, cx + 115, cy - 10],
            fill=accent_color,
        )
        draw.pieslice(
            [cx - 230, cy + 10, cx + 230, cy + 420],
            start=180,
            end=360,
            fill=accent_color,
        )

        # Draw info text
        title_text = f"SWEET STUDIO - {self.model_name.upper()}"
        detail_text = f"POSE #{self._capture_count} | UTC: {timestamp_str}"
        res_text = f"Resolution: {width}x{height} (3:2 Aspect Ratio)"

        draw.text((80, 80), title_text, fill=ink_color)
        draw.text((80, 120), detail_text, fill=ink_color)
        draw.text((80, height - 100), res_text, fill=ink_color)

        # Ensure parent directory exists
        target_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(target_path, "JPEG", quality=90)

        return {
            "success": True,
            "file_path": str(target_path),
            "filename": target_path.name,
            "width": width,
            "height": height,
            "timestamp": timestamp_str,
            "capture_number": self._capture_count
        }

    def capture_preview_bytes(self) -> bytes:
        """
        Generate a lightweight live-view JPEG preview frame (900x600) with gentle animated
        floating studio indicator for live DSLR preview simulation.
        """
        width, height = 900, 600
        t = time.time()
        bob_y = int(math.sin(t * 3.0) * 10)
        bob_x = int(math.cos(t * 2.0) * 8)

        image = Image.new("RGB", (width, height), color=(253, 238, 244))
        draw = ImageDraw.Draw(image)

        accent_color = (233, 130, 145)
        ink_color = (73, 59, 59)

        draw.rectangle(
            [20, 20, width - 20, height - 20],
            outline=accent_color,
            width=4,
        )

        cx, cy = width // 2 + bob_x, height // 2 + bob_y
        draw.ellipse(
            [cx - 160, cy - 175, cx + 160, cy + 145],
            fill=(255, 255, 255),
            outline=accent_color,
            width=4,
        )
        draw.ellipse(
            [cx - 58, cy - 110, cx + 58, cy - 5],
            fill=accent_color,
        )
        draw.pieslice(
            [cx - 115, cy + 5, cx + 115, cy + 205],
            start=180,
            end=360,
            fill=accent_color,
        )

        now_str = datetime.now().strftime("%H:%M:%S.%f")[:-4]
        draw.text(
            (42, 42),
            f"LIVE VIEW • {self.model_name.upper()}",
            fill=ink_color,
        )
        draw.text(
            (42, height - 56),
            f"EOS LIVE STREAM  |  {now_str}  |  READY TO POSE ♡",
            fill=ink_color,
        )

        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=80)
        return buf.getvalue()
