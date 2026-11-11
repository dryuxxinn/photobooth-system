import os
from pathlib import Path
from typing import List

# Base directory of the repository (2 levels up from backend/app/core)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# Automatically load .env file from PROJECT_ROOT if present
_ENV_FILE = PROJECT_ROOT / ".env"
if _ENV_FILE.is_file():
    for _line in _ENV_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
        _stripped = _line.strip()
        if not _stripped or _stripped.startswith("#") or "=" not in _stripped:
            continue
        _key, _, _val = _stripped.partition("=")
        _key = _key.strip()
        _val = _val.strip().strip('"').strip("'")
        if _key and _key not in os.environ:
            os.environ[_key] = _val


class Settings:
    PROJECT_NAME: str = "Dryu Photobooth Backend"
    VERSION: str = "0.2.0"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")

    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

    # Camera: "simulation", "gphoto" (USB), or "wifi" (Sony HTTP Remote API / PTP-IP)
    CAMERA_DRIVER: str = os.getenv("CAMERA_DRIVER", "wifi")
    CAMERA_MODEL: str = os.getenv("CAMERA_MODEL", "Sony Alpha a6400 (Wi-Fi)")
    CAMERA_WIFI_IP: str = os.getenv("CAMERA_WIFI_IP", "192.168.122.1")
    CAMERA_WIFI_PORT: int = int(os.getenv("CAMERA_WIFI_PORT", "10000"))
    CAMERA_WIFI_PROTOCOL: str = os.getenv("CAMERA_WIFI_PROTOCOL", "sony_http")

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

    # DOKU Payment Gateway (Production Ready)
    DOKU_CLIENT_ID: str = os.getenv("DOKU_CLIENT_ID", "")
    DOKU_SECRET_KEY: str = os.getenv("DOKU_SECRET_KEY", "")
    DOKU_SHARED_KEY: str = os.getenv("DOKU_SHARED_KEY", "")
    DOKU_MERCHANT_ID: str = os.getenv("DOKU_MERCHANT_ID", "")
    DOKU_IS_PRODUCTION: bool = os.getenv("DOKU_IS_PRODUCTION", "True").lower() in ("true", "1")
    DOKU_MERCHANT_NAME: str = os.getenv("DOKU_MERCHANT_NAME", "Sweet Studio Photobooth")
    DOKU_QRIS_EXPIRY_MINUTES: int = int(os.getenv("DOKU_QRIS_EXPIRY_MINUTES", "5"))


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
