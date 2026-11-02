from fastapi import APIRouter, Body, HTTPException, status
from backend.app.core.config import settings
from backend.app.schemas.session import (
    CapturePhotoRequest,
    StartSessionRequest,
    SessionDetailResponse,
    SessionCurrentResponse,
    PhotoItem,
    PrintRequest,
)
from backend.app.services.session import get_session_manager, SessionTransitionError
from backend.app.services.camera import get_camera_service
from backend.app.services.printer import get_printer_service
from backend.app.services.storage.database import get_db_service

router = APIRouter(prefix="/session", tags=["Session"])


@router.post(
    "/start",
    response_model=SessionDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_session(payload: StartSessionRequest = StartSessionRequest()):
    manager = get_session_manager()
    photos_required = payload.photos_required or settings.DEFAULT_PHOTOS_PER_SESSION
    template_id = payload.template_id or "classic_strip_3"

    try:
        session = manager.start_session(
            customer_name=payload.customer_name,
            photos_required=photos_required,
            template_id=template_id,
            frame_color=payload.frame_color,
        )
        return SessionDetailResponse(**session)
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/current", response_model=SessionCurrentResponse)
def get_current_session():
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None:
        return SessionCurrentResponse(active=False, state=manager.state, session=None)
    return SessionCurrentResponse(
        active=True,
        state=manager.state,
        session=SessionDetailResponse(**session),
    )


@router.get("/history")
def get_session_history(limit: int = 20):
    """Retrieve recent sessions persisted in SQLite."""
    sessions = get_db_service().list_recent_sessions(limit=limit)
    return {"sessions": sessions}


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session_by_id(session_id: str):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is not None and session["session_id"] == session_id:
        return SessionDetailResponse(**session)

    # Check historical database if session already completed
    db_session = get_db_service().get_session(session_id)
    if db_session is not None:
        return SessionDetailResponse(**db_session)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Session with ID '{session_id}' not found.",
    )


@router.post("/{session_id}/capture", response_model=PhotoItem)
def capture_photo_for_session(
    session_id: str,
    payload: CapturePhotoRequest | None = Body(default=None),
):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not currently active.",
        )

    camera = get_camera_service()
    image_data = payload.image_data if payload else None
    try:
        photo = manager.capture_next_photo(camera, image_data=image_data)
        return PhotoItem(**photo)
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/{session_id}/retake", response_model=SessionDetailResponse)
def retake_last_photo(session_id: str):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not currently active.",
        )

    try:
        updated = manager.retake_last_photo()
        return SessionDetailResponse(**updated)
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/{session_id}/process", response_model=SessionDetailResponse)
def process_session(
    session_id: str,
    template_id: str | None = None,
    filter_name: str | None = None,
    frame_color: str | None = None,
    selected_photo_ids: list[str] | None = None,
):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not active.",
        )

    try:
        manager.process_session_photos(
            template_id=template_id,
            filter_name=filter_name,
            frame_color=frame_color,
            selected_photo_ids=selected_photo_ids,
        )
        return SessionDetailResponse(**manager.get_current_session())
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/{session_id}/print")
def print_session(session_id: str, payload: PrintRequest = PrintRequest()):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not active.",
        )

    printer = get_printer_service()
    if not printer.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Printer is offline or out of paper.",
        )

    try:
        res = manager.print_session(printer, copies=payload.copies)
        return {
            "message": "Session printed and completed successfully",
            "print_job": res["print_job"],
            "session": res["session"],
        }
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/{session_id}/complete")
def complete_session(session_id: str):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not active.",
        )

    try:
        completed = manager.complete_session()
        return {"message": "Session completed successfully", "session": completed}
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/{session_id}/abort")
def abort_session(session_id: str, reason: str = "User aborted"):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not active.",
        )

    return manager.abort_session(reason=reason)


@router.post("/reset")
def reset_session_state():
    """Emergency reset to IDLE in case of an unhandled error state."""
    manager = get_session_manager()
    manager.reset_to_idle()
    return {"message": "Session state forcefully reset to IDLE."}
