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
    template_id = payload.template_id or "classic_strip_3"

    db_cfg = get_db_service().get_operator_config()
    default_price = int(db_cfg.get("sessionPriceIdr") or 35000)
    extra_buffer = int(db_cfg.get("extraPosesBuffer", 1))

    if payload.photos_required is not None:
        photos_required = payload.photos_required
    else:
        from backend.app.services.image.processor import ImageProcessor
        tpl_meta = ImageProcessor.get_template(template_id)
        tpl_slots = tpl_meta.get("photos_required", 3) if tpl_meta else 3
        photos_required = max(tpl_slots, tpl_slots + extra_buffer)
    effective_payment_amount = (
        payload.payment_amount
        if payload.payment_amount is not None
        else (0 if payload.payment_method == "VOUCHER" else default_price)
    )

    try:
        session = manager.start_session(
            customer_name=payload.customer_name,
            photos_required=photos_required,
            template_id=template_id,
            frame_color=payload.frame_color,
            filter_name=payload.filter_name,
            ar_preset_id=payload.ar_preset_id,
            payment_amount=effective_payment_amount,
            payment_method=payload.payment_method or "QRIS",
            payment_status=payload.payment_status or "PAID",
            payment_ref=payload.payment_ref,
            force=bool(payload.force),
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


@router.get("/config")
def get_operator_config_endpoint():
    """Retrieve persistent operator configuration (price, vouchers, kiosk flow) from SQLite."""
    return get_db_service().get_operator_config()


@router.post("/config")
def update_operator_config_endpoint(payload: Dict[str, Any] = Body(default={})):
    """Save operator configuration to SQLite and broadcast to all connected Kiosk screens via WebSocket."""
    saved = get_db_service().save_operator_config(payload or {})
    try:
        get_session_manager()._emit_event("OPERATOR_CONFIG_UPDATED", saved)
    except Exception:
        pass
    return saved


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session_by_id(session_id: str):
    import urllib.parse

    manager = get_session_manager()
    session = manager.get_current_session()
    if session is not None and session["session_id"] == session_id:
        return SessionDetailResponse(**session)

    # Check historical database if session already completed
    db = get_db_service()
    candidates = [
        session_id,
        session_id.replace(" ", "+"),
        urllib.parse.unquote(session_id),
        urllib.parse.unquote_plus(session_id),
    ]
    for cid in candidates:
        db_session = db.get_session(cid)
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
    """Create a production dynamic QRIS payment transaction via DOKU API."""
    db_cfg = get_db_service().get_operator_config()
    configured_price = int(db_cfg.get("sessionPriceIdr") or 35000)
    effective_amount = (
        int(payload.amount)
        if (payload.amount is not None and int(payload.amount) > 0)
        else configured_price
    )
    if effective_amount < 1:
        effective_amount = 35000

    doku = get_doku_service()
    try:
        tx = doku.generate_qris(
            amount=effective_amount,
            package_name=payload.package_name or "Sweet Studio Photobooth",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    tx_id = tx["transaction_id"]
    _qris_transactions[tx_id] = tx
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
            detail="Transaksi QRIS tidak ditemukan.",
        )

    if record.get("status") == "PENDING":
        now_ts = datetime.now(timezone.utc).timestamp()
        last_check = float(record.get("_last_doku_check_ts") or 0.0)
        if now_ts - last_check >= 4.0:
            record["_last_doku_check_ts"] = now_ts
            doku = get_doku_service()
            inv_no = record.get("invoice_number") or transaction_id
            live_check = doku.check_transaction_status(inv_no, record=record)
            if live_check.get("status") == "PAID":
                record["status"] = "PAID"
                record["paid_at"] = datetime.now(timezone.utc).isoformat()
                record["doku_raw_response"] = live_check.get("raw_data", {})
            elif live_check.get("status") == "FAILED":
                record["status"] = "FAILED"

    return {k: v for k, v in record.items() if not k.startswith("_")}


@router.post("/payment/qris/{transaction_id}/confirm")
def confirm_qris_payment(transaction_id: str):
    """Actively verify QRIS transaction payment status directly with DOKU server."""
    record = _qris_transactions.get(transaction_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi QRIS tidak ditemukan.",
        )

    if record.get("status") != "PAID":
        doku = get_doku_service()
        inv_no = record.get("invoice_number") or transaction_id
        live_check = doku.check_transaction_status(inv_no, record=record)
        if live_check.get("status") == "PAID":
            record["status"] = "PAID"
            record["paid_at"] = datetime.now(timezone.utc).isoformat()
            record["doku_raw_response"] = live_check.get("raw_data", {})
        elif live_check.get("status") == "FAILED":
            record["status"] = "FAILED"

    return {k: v for k, v in record.items() if not k.startswith("_")}


@router.api_route("/payment/doku/notify", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@router.api_route("/payment/doku/notify/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"], include_in_schema=False)
async def handle_doku_notification(request: Request):
    """
    DOKU Payment Gateway Webhook notification endpoint.
    Supports GET/HEAD/OPTIONS for healthcheck & URL verification pings from DOKU Dashboard,
    and POST/PUT for real transaction payment notifications (Jokul JSON, QRIS V2 Form/Query, SNAP BI JSON).
    """
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    process_date_str = now_dt.strftime("%Y-%m-%dT%H:%M:%S")

    if request.method in ("GET", "HEAD", "OPTIONS"):
        return {
            "status": "SUCCESS",
            "responseCode": "2005200",
            "responseMessage": "Successful",
            "transactionId": "DK0000001",
            "activityCode": "200",
            "message": "Transaction is Success",
            "processDate": process_date_str,
        }

    body_bytes = await request.body()
    headers = dict(request.headers)
    query_params = dict(request.query_params)

    doku = get_doku_service()
    doku.verify_webhook_signature(
        headers, body_bytes, target_path=request.url.path
    )

    parsed = doku.parse_notification(body_bytes, query_params, headers)
    invoice_number = parsed.get("invoice_number")
    doku_trx_id = parsed.get("transaction_id") or "DK0000001"
    normalized_status = parsed.get("status")
    amount = parsed.get("amount")
    raw_data = parsed.get("raw_data", {})

    if normalized_status != "TEST_PING":
        record = _qris_transactions.get(invoice_number) if invoice_number else None

        # If DOKU QRIS V2 sent its internal INVOICE/TRANSACTIONID instead of our invoice_number,
        # match the latest active PENDING transaction
        if not record and normalized_status == "PAID":
            pending_candidates = [
                tx for tx in _qris_transactions.values()
                if isinstance(tx, dict) and tx.get("status") == "PENDING"
            ]
            if amount is not None:
                amount_matched = [tx for tx in pending_candidates if tx.get("amount") == amount]
                if amount_matched:
                    record = amount_matched[-1]
            if not record and pending_candidates:
                record = pending_candidates[-1]

        if record:
            if normalized_status == "PAID":
                record["status"] = "PAID"
                record["paid_at"] = now_iso
                record["doku_raw_response"] = raw_data
            elif normalized_status == "FAILED":
                record["status"] = "FAILED"
        elif invoice_number:
            _qris_transactions[invoice_number] = {
                "transaction_id": invoice_number,
                "invoice_number": invoice_number,
                "amount": amount or 0,
                "status": "PAID" if normalized_status == "PAID" else "FAILED",
                "paid_at": now_iso,
                "doku_raw_response": raw_data,
            }

    return {
        "status": "SUCCESS",
        "responseCode": "2005200",
        "responseMessage": "Successful",
        "transactionId": doku_trx_id,
        "activityCode": "200",
        "message": "Transaction is Success",
        "processDate": process_date_str,
    }


@router.post("/payment/voucher")
def verify_voucher_code(payload: VoucherVerifyRequest):
    """Verify a cashier or event voucher code for starting a session."""
    normalized = payload.code.strip().upper()
    allowed = set(DEFAULT_VALID_VOUCHERS)
    db_cfg = get_db_service().get_operator_config()
    db_vouchers = db_cfg.get("voucherCodes")
    if isinstance(db_vouchers, list):
        for c in db_vouchers:
            if isinstance(c, str) and c.strip():
                allowed.add(c.strip().upper())
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


@router.post("/{session_id}/reprint")
def reprint_session(session_id: str, payload: PrintRequest = PrintRequest()):
    """
    Reprint an active or completed historical session without restarting a new session.
    Used by operator when paper jams or a customer requests an extra copy.
    """
    manager = get_session_manager()
    sess = manager.get_current_session()
    if not sess or sess.get("session_id") != session_id:
        sess = get_db_service().get_session(session_id)

    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesi '{session_id}' tidak ditemukan di memori aktif maupun riwayat database.",
        )

    image_path_str = sess.get("processed_image_path")
    if not image_path_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Foto strip untuk sesi ini belum tersedia atau gagal diproses.",
        )

    from pathlib import Path

    image_file = Path(image_path_str)
    if not image_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File cetak '{image_file}' tidak ditemukan di penyimpanan server.",
        )

    printer = get_printer_service()
    if not printer.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Printer sedang offline atau kehabisan kertas.",
        )

    copies = max(1, payload.copies or 1)
    print_res = printer.print_file(file_path=image_file, copies=copies)
    job_id = print_res.get("job_id", f"job_{uuid.uuid4().hex[:8]}")
    now_iso = datetime.now(timezone.utc).isoformat()
    job_record = {
        "id": job_id,
        "session_id": session_id,
        "photo_id": None,
        "file_path": str(image_file),
        "copies": copies,
        "status": print_res.get("status", "COMPLETED"),
        "printer_name": print_res.get("printer_name", "CUPS / Simulated"),
        "error_message": print_res.get("error_message"),
        "created_at": print_res.get("created_at", now_iso),
        "completed_at": print_res.get("completed_at", now_iso),
    }
    try:
        get_db_service().save_print_job(job_record)
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Berhasil mengirim {copies} lembar ke printer.",
        "job_id": job_id,
        "session_id": session_id,
    }


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
