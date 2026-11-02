import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from backend.app.services.printer.base import PrinterInterface


class SimulatedPrinter(PrinterInterface):
    """
    Software simulated photo printer for testing and development without physical printer.
    """

    def __init__(self, printer_name: str = "Simulated Photo Printer"):
        self.printer_name = printer_name
        self._ready = True
        self._paper_remaining = 50
        self._simulate_failure = False
        self._jobs_printed = 0

    def is_ready(self) -> bool:
        return self._ready and self._paper_remaining > 0 and not self._simulate_failure

    def set_simulate_failure(self, failure: bool) -> None:
        self._simulate_failure = failure

    def set_ready(self, ready: bool) -> None:
        self._ready = ready

    def get_status(self) -> Dict[str, Any]:
        ready = self.is_ready()
        return {
            "ready": ready,
            "printer_name": self.printer_name,
            "driver": "simulation",
            "paper_remaining": self._paper_remaining,
            "jobs_printed": self._jobs_printed,
            "message": "Printer ready" if ready else "Printer offline or out of paper",
        }

    def print_file(self, file_path: Path, copies: int = 1) -> Dict[str, Any]:
        if not self.is_ready():
            raise RuntimeError("Simulated printer is offline, out of paper, or in error state.")

        if not file_path.exists():
            raise FileNotFoundError(f"Print target file does not exist: {file_path}")

        self._jobs_printed += 1
        self._paper_remaining = max(0, self._paper_remaining - copies)
        now = datetime.now(timezone.utc).isoformat()
        job_id = f"prt_{uuid.uuid4().hex[:8]}"

        return {
            "job_id": job_id,
            "status": "COMPLETED",
            "printer_name": self.printer_name,
            "file_path": str(file_path),
            "copies": copies,
            "created_at": now,
            "completed_at": now,
            "message": f"Printed {copies} copy/copies on {self.printer_name}",
        }
