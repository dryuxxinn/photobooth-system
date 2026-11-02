from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any

class CameraInterface(ABC):
    """Abstract interface defining the contract for camera drivers."""

    @abstractmethod
    def connect(self) -> bool:
        """Connect to the camera."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Disconnect and release camera resources."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if camera is currently connected and ready."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return a dictionary of camera status information."""
        pass

    @abstractmethod
    def capture_image(self, target_path: Path) -> Dict[str, Any]:
        """
        Trigger a capture and save the image to target_path.
        Returns metadata: success, width, height, path, timestamp.
        """
        pass
