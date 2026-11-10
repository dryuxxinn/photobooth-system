import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Body, HTTPException, Request, status
from backend.app.core.config import settings
from backend.app.schemas.session import (
    CapturePhotoRequest,
    CloudSyncRequest,
    ProcessImageRequest,
    QrisCreateRequest,
    StartSessionRequest,
    SessionDetailResponse,
    SessionCurrentResponse,
    PhotoItem,
    PrintRequest,
    VoucherVerifyRequest,
)
from backend.app.services.session import get_session_manager, SessionTransitionError
from backend.app.services.camera import get_camera_service
from backend.app.services.printer import get_printer_service
from backend.app.services.storage.database import get_db_service
from backend.app.services.payment import get_doku_service

router = APIRouter(prefix="/session", tags=["Session"])

# In-memory store for active QRIS payment transactions
_qris_transactions: Dict[str, Dict[str, Any]] = {}
DEFAULT_VALID_VOUCHERS = {"SWEET2026", "VIPFREE", "BESTIE", "DRYU100", "PROMO50"}


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
            filter_name=payload.filter_name,
            ar_preset_id=payload.ar_preset_id,
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
    payload: ProcessImageRequest | None = None,
    template_id: str | None = None,
    filter_name: str | None = None,
    frame_color: str | None = None,
    sticker_id: str | None = None,
    ar_preset_id: str | None = None,
    custom_text: str | None = None,
    selected_photo_ids: list[str] | None = None,
):
    manager = get_session_manager()
    session = manager.get_current_session()
    if session is None or session["session_id"] != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' is not active.",
        )

    if payload:
        template_id = payload.template_id or template_id
        filter_name = payload.filter_name or filter_name
        frame_color = payload.frame_color or frame_color
        sticker_id = payload.sticker_id or sticker_id
        ar_preset_id = payload.ar_preset_id or ar_preset_id
        custom_text = payload.custom_text or custom_text
        selected_photo_ids = payload.selected_photo_ids or selected_photo_ids

    try:
        manager.process_session_photos(
            template_id=template_id,
            filter_name=filter_name,
            frame_color=frame_color,
            sticker_id=sticker_id,
            ar_preset_id=ar_preset_id,
            custom_text=custom_text,
            selected_photo_ids=selected_photo_ids,
        )
        return SessionDetailResponse(**manager.get_current_session())
    except SessionTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/{session_id}/cloud-sync")
def sync_session_cloud_link(
    session_id: str, payload: CloudSyncRequest = CloudSyncRequest()
):
    """Generate or update the public / cloud share link for a session's digital gallery."""
    manager = get_session_manager()
    active_sess = manager.get_current_session()
    base = (payload.public_base_url or "").strip().rstrip("/")
    share_url = f"{base}/share/{session_id}" if base else f"/share/{session_id}"

    if active_sess and active_sess["session_id"] == session_id:
        active_sess["cloud_share_url"] = share_url
        get_db_service().save_session(active_sess)
        return {
            "success": True,
            "session_id": session_id,
            "cloud_share_url": share_url,
        }

    db_sess = get_db_service().get_session(session_id)
    if db_sess:
        db_sess["cloud_share_url"] = share_url
        get_db_service().save_session(db_sess)
        return {
            "success": True,
            "session_id": session_id,
            "cloud_share_url": share_url,
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Session '{session_id}' not found.",
    )


@router.post("/payment/qris")
def create_qris_payment(payload: QrisCreateRequest = QrisCreateRequest()):
    """Create a dynamic QRIS payment transaction via DOKU API with simulation fallback."""
    doku = get_doku_service()
    tx = doku.generate_qris(
        amount=payload.amount,
        package_name=payload.package_name or "Sweet Studio Photobooth",
    )
    tx_id = tx["transaction_id"]
    _qris_transactions[tx_id] = tx
    # Also index by invoice number if distinct
    inv = tx.get("invoice_number")
    if inv and inv != tx_id:
        _qris_transactions[inv] = tx
    return tx


@router.get("/payment/qris/{transaction_id}")
def get_qris_payment_status(transaction_id: str):
    record = _qris_transactions.get(transaction_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QRIS transaction not found.",
        )
    return record


@router.post("/payment/qris/{transaction_id}/confirm")
def confirm_qris_payment(transaction_id: str):
    """Simulate or confirm webhook payment completion for a QRIS transaction."""
    record = _qris_transactions.get(transaction_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QRIS transaction not found.",
        )
    record["status"] = "PAID"
    record["paid_at"] = datetime.now(timezone.utc).isoformat()
    return record


@router.post("/payment/doku/notify")
async def handle_doku_notification(request: Request):
    """
    DOKU Payment Gateway Webhook notification endpoint.
    Triggered when customer successfully scans and pays via Dynamic QRIS.
    """
    body_bytes = await request.body()
    headers = dict(request.headers)

    doku = get_doku_service()
    is_valid, reason = doku.verify_webhook_signature(
        headers, body_bytes, target_path="/session/payment/doku/notify"
    )
    if not is_valid and doku.is_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DOKU signature verification failed: {reason}",
        )

    try:
        payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload from DOKU webhook.",
        )

    order_info = payload.get("order", {})
    invoice_number = order_info.get("invoice_number") or payload.get("transaction", {}).get("invoice_number")
    transaction_info = payload.get("transaction", {})
    trx_status = (transaction_info.get("status") or "").upper()

    now_iso = datetime.now(timezone.utc).isoformat()
    record = _qris_transactions.get(invoice_number) if invoice_number else None

    if record:
        if trx_status in ("SUCCESS", "PAID"):
            record["status"] = "PAID"
            record["paid_at"] = now_iso
            record["doku_raw_response"] = payload
        elif trx_status in ("FAILED", "EXPIRED"):
            record["status"] = "FAILED"
    elif invoice_number:
        # If record was not in memory, save it directly
        _qris_transactions[invoice_number] = {
            "transaction_id": invoice_number,
            "invoice_number": invoice_number,
            "amount": order_info.get("amount", 0),
            "status": "PAID" if trx_status in ("SUCCESS", "PAID") else "FAILED",
            "paid_at": now_iso,
            "doku_raw_response": payload,
        }

    return {"status": "SUCCESS", "message": "DOKU notification processed successfully."}


@router.post("/payment/voucher")
def verify_voucher_code(payload: VoucherVerifyRequest):
    """Verify a cashier or event voucher code for starting a session."""
    normalized = payload.code.strip().upper()
    allowed = set(DEFAULT_VALID_VOUCHERS)
    if payload.valid_codes:
        for c in payload.valid_codes:
            if c.strip():
                allowed.add(c.strip().upper())

    if normalized and normalized in allowed:
        return {
            "valid": True,
            "code": normalized,
            "message": "Kode voucher valid! Selamat berfoto!",
        }
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Kode voucher tidak ditemukan atau sudah tidak berlaku.",
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
