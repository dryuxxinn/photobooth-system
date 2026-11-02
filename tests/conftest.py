import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.config import settings
from backend.app.main import app
from backend.app.services.camera.simulated import SimulatedCamera
from backend.app.services.camera import set_camera_service
from backend.app.services.printer.simulated import SimulatedPrinter
from backend.app.services.printer import set_printer_service
from backend.app.services.storage.database import DatabaseService, set_db_service
from backend.app.services.session.manager import SessionManager
from backend.app.services.session import set_session_manager


@pytest.fixture(autouse=True)
def clean_test_environment(tmp_path):
    """Isolate storage directories and SQLite database for each test run."""
    test_captures = tmp_path / "captures"
    test_processed = tmp_path / "processed"
    test_thumbnails = tmp_path / "thumbnails"
    test_db_path = tmp_path / "test_photobooth.db"

    test_captures.mkdir(parents=True, exist_ok=True)
    test_processed.mkdir(parents=True, exist_ok=True)
    test_thumbnails.mkdir(parents=True, exist_ok=True)

    # Patch settings
    settings.CAPTURES_DIR = test_captures
    settings.PROCESSED_DIR = test_processed
    settings.THUMBNAILS_DIR = test_thumbnails
    settings.DATABASE_PATH = test_db_path

    # Fresh SQLite database instance
    db = DatabaseService(db_path=test_db_path)
    set_db_service(db)

    # Create fresh camera with 0 delay for fast tests
    cam = SimulatedCamera(capture_delay=0.0)
    set_camera_service(cam)

    # Create fresh simulated printer
    prn = SimulatedPrinter()
    set_printer_service(prn)

    # Create fresh session manager
    mgr = SessionManager()
    set_session_manager(mgr)

    yield {
        "camera": cam,
        "printer": prn,
        "db": db,
        "session_manager": mgr,
        "storage": {
            "captures": test_captures,
            "processed": test_processed,
            "thumbnails": test_thumbnails,
        },
    }


@pytest.fixture
def test_client():
    return TestClient(app)
