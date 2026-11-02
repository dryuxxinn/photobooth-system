from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.session import PrintRequest, ProcessImageRequest, SessionDetailResponse
from backend.app.services.printer import get_printer_service
from backend.app.services.session import get_session_manager, SessionTransitionError
from backend.app.services.image.processor import ImageProcessor
from backend.app.services.storage.database import get_db_service

router = APIRouter(tags=["Printer & Image Processing"])


@router.get("/printer/status")
def get_printer_status():
    printer = get_printer_service()
    return printer.get_status()


@router.get("/printer/jobs")
def list_print_jobs():
    return {"jobs": get_db_service().list_print_jobs()}


@router.post("/print")
def trigger_print(payload: PrintRequest = PrintRequest()):
    """
    Send the active (or specified) session's processed photostrip to the printer.
    Implements POST /print from project-init.md Section 5.
    """
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session available to print.",
        )

    if payload.session_id and session["session_id"] != payload.session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{payload.session_id}' is not the currently active session.",
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
            "success": True,
            "message": f"Printed {payload.copies} copy/copies successfully.",
            "print_job": res["print_job"],
            "session": res["session"],
        }
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/image/process", response_model=SessionDetailResponse)
def process_session_image(payload: ProcessImageRequest = ProcessImageRequest()):
    """
    Process or re-process the active session's captured photos with a template, filter, and frame color.
    Implements POST /image/process from project-init.md Section 5.
    """
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session available to process.",
        )

    if payload.session_id and session["session_id"] != payload.session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{payload.session_id}' is not active.",
        )

    try:
        manager.process_session_photos(
            template_id=payload.template_id,
            filter_name=payload.filter_name,
            frame_color=payload.frame_color,
            custom_text=payload.custom_text,
            selected_photo_ids=payload.selected_photo_ids,
        )
        return SessionDetailResponse(**manager.get_current_session())
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/templates")
def get_available_templates():
    """Return available photostrip/grid templates and frame color themes for the Kiosk UI."""
    return {
        "templates": ImageProcessor.AVAILABLE_TEMPLATES,
        "frame_themes": list(ImageProcessor.FRAME_THEMES.values()),
    }
