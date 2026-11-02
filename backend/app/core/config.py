import os
from pathlib import Path
from typing import List

# Base directory of the repository (2 levels up from backend/app/core)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings:
    PROJECT_NAME: str = "Dryu Photobooth Backend"
    VERSION: str = "0.2.0"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")

    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

    # Camera: "simulation" or "gphoto"
    CAMERA_DRIVER: str = os.getenv("CAMERA_DRIVER", "simulation")
    CAMERA_MODEL: str = os.getenv("CAMERA_MODEL", "Canon EOS 700D")

    # Printer: "simulation" or "cups"
    PRINTER_DRIVER: str = os.getenv("PRINTER_DRIVER", "simulation")
    PRINTER_NAME: str = os.getenv("PRINTER_NAME", "Photo_Printer_Default")

    # Storage & Database paths
    STORAGE_DIR: Path = Path(os.getenv("STORAGE_BASE_DIR", str(PROJECT_ROOT / "storage"))).resolve()
    CAPTURES_DIR: Path = STORAGE_DIR / "captures"
    PROCESSED_DIR: Path = STORAGE_DIR / "processed"
    THUMBNAILS_DIR: Path = STORAGE_DIR / "thumbnails"
    EXPORTS_DIR: Path = STORAGE_DIR / "exports"
    TEMPLATES_DIR: Path = PROJECT_ROOT / "templates"
    DATABASE_PATH: Path = Path(
        os.getenv("DATABASE_PATH", str(PROJECT_ROOT / "database" / "photobooth.db"))
    ).resolve()

    # Session defaults
    DEFAULT_PHOTOS_PER_SESSION: int = int(os.getenv("PHOTOS_PER_SESSION", "3"))
    COUNTDOWN_SECONDS: int = int(os.getenv("COUNTDOWN_SECONDS", "5"))
    PREVIEW_DURATION_SECONDS: int = int(os.getenv("PREVIEW_DURATION_SECONDS", "10"))

    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]


settings = Settings()

# Ensure directories exist
for path in [
    settings.CAPTURES_DIR,
    settings.PROCESSED_DIR,
    settings.THUMBNAILS_DIR,
    settings.EXPORTS_DIR,
    settings.DATABASE_PATH.parent,
]:
    path.mkdir(parents=True, exist_ok=True)
