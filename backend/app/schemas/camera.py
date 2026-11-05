from pydantic import BaseModel
from typing import Optional

class CameraStatusResponse(BaseModel):
    connected: bool
    model: str
    driver: str
    battery_level: int = 100
    message: str = "Ready"
    wifi_ip: Optional[str] = None
    wifi_port: Optional[int] = None
    wifi_protocol: Optional[str] = None
    hardware_reachable: Optional[bool] = None

class CameraConfigRequest(BaseModel):
    driver: str = "simulation"
    model: Optional[str] = None
    wifi_ip: Optional[str] = None
    wifi_port: Optional[int] = None
    wifi_protocol: Optional[str] = None

class CaptureResponse(BaseModel):
    success: bool
    file_path: str
    filename: str
    width: int
    height: int
    timestamp: str
    message: Optional[str] = None
