import asyncio
import json
import shutil
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.api.camera import router as camera_router
from backend.app.api.session import router as session_router
from backend.app.api.printer import router as printer_router
from backend.app.services.session import get_session_manager
from backend.app.services.camera import get_camera_service
from backend.app.services.printer import get_printer_service

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Local Photobooth Server for Dryu Photobooth (Canon EOS 700D + iPad Kiosk)",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local storage folder for serving captures, thumbnails, and processed images
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include Routers
app.include_router(camera_router)
app.include_router(session_router)
app.include_router(printer_router)


class WebSocketConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    async def connect(self, websocket: WebSocket):
        self.loop = asyncio.get_running_loop()
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        text = json.dumps(message, default=str)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text)
            except Exception:
                self.disconnect(connection)


ws_manager = WebSocketConnectionManager()


def on_session_event(event_type: str, payload: dict):
    message = {"type": event_type, "data": payload}
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(ws_manager.broadcast(message))
            return
    except RuntimeError:
        pass

    if ws_manager.loop and ws_manager.loop.is_running():
        try:
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast(message), ws_manager.loop
            )
        except Exception:
            pass


get_session_manager().register_event_listener(on_session_event)


@app.websocket("/ws/session")
async def websocket_session_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        session = get_session_manager().get_current_session()
        await websocket.send_text(
            json.dumps(
                {
                    "type": "INITIAL_STATE",
                    "state": get_session_manager().state.value,
                    "session": session,
                },
                default=str,
            )
        )
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "PONG"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.get("/health", tags=["Health"])
def health_check():
    camera = get_camera_service()
    printer = get_printer_service()
    storage_used_pct = 0
    storage_free_gb = 0.0
    try:
        usage = shutil.disk_usage(settings.STORAGE_DIR)
        if usage.total > 0:
            storage_used_pct = round((usage.used / usage.total) * 100)
            storage_free_gb = round(usage.free / (1024**3), 1)
    except Exception:
        pass

    return {
        "status": "healthy",
        "version": settings.VERSION,
        "camera_driver": settings.CAMERA_DRIVER,
        "camera_connected": camera.is_connected(),
        "printer_driver": settings.PRINTER_DRIVER,
        "printer_ready": printer.is_ready(),
        "session_state": get_session_manager().state.value,
        "storage_used_percent": storage_used_pct,
        "storage_free_gb": storage_free_gb,
    }
