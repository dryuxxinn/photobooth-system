from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any


class PrinterInterface(ABC):
    """Abstract interface for photo printer drivers (Simulated vs CUPS)."""

    @abstractmethod
    def is_ready(self) -> bool:
        """Return True if the printer is online and ready to accept print jobs."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return detailed printer status (connected, driver, paper_status, message)."""
        pass

    @abstractmethod
    def print_file(self, file_path: Path, copies: int = 1) -> Dict[str, Any]:
        """Send an image file to the printer and return job result metadata."""
        pass
