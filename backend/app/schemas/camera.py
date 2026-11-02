from pydantic import BaseModel
from typing import Optional

class CameraStatusResponse(BaseModel):
    connected: bool
    model: str
    driver: str
    battery_level: int = 100
    message: str = "Ready"

class CaptureResponse(BaseModel):
    success: bool
    file_path: str
    filename: str
    width: int
    height: int
    timestamp: str
    message: Optional[str] = None
