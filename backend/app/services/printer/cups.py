import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from backend.app.services.printer.base import PrinterInterface


class CupsPrinter(PrinterInterface):
    """
    Linux CUPS printer driver using `lp` and `lpstat` commands.
    """

    def __init__(self, printer_name: str = "Photo_Printer_Default"):
        self.printer_name = printer_name
        self._lp_path = shutil.which("lp")
        self._lpstat_path = shutil.which("lpstat")

    def is_available(self) -> bool:
        return self._lp_path is not None

    def is_ready(self) -> bool:
        if not self._lpstat_path:
            return False
        try:
            res = subprocess.run(
                ["lpstat", "-p", self.printer_name],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return res.returncode == 0 and "enabled" in res.stdout.lower()
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        ready = self.is_ready()
        return {
            "ready": ready,
            "printer_name": self.printer_name,
            "driver": "cups",
            "cups_installed": self.is_available(),
            "message": "CUPS printer ready" if ready else "CUPS printer unavailable or disabled",
        }

    def print_file(self, file_path: Path, copies: int = 1) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("CUPS `lp` utility is not installed on this system.")

        if not file_path.exists():
            raise FileNotFoundError(f"Print target file does not exist: {file_path}")

        cmd = ["lp", "-d", self.printer_name, "-n", str(copies), str(file_path)]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if res.returncode != 0:
            raise RuntimeError(f"CUPS print failed: {res.stderr.strip()}")

        now = datetime.now(timezone.utc).isoformat()
        job_id = f"cups_{uuid.uuid4().hex[:8]}"
        return {
            "job_id": job_id,
            "status": "COMPLETED",
            "printer_name": self.printer_name,
            "file_path": str(file_path),
            "copies": copies,
            "created_at": now,
            "completed_at": now,
            "message": res.stdout.strip() or "Submitted to CUPS queue",
        }
