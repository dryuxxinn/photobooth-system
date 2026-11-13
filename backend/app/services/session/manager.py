import base64
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
from PIL import Image, ImageOps

from backend.app.core.config import settings
from backend.app.schemas.session import SessionState
from backend.app.services.camera.base import CameraInterface
from backend.app.services.printer.base import PrinterInterface
from backend.app.services.image.processor import ImageProcessor
from backend.app.services.storage.database import get_db_service


class SessionTransitionError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


def generate_session_id() -> str:
    """
    Generate a human-readable, timestamp-based session identifier with GMT timezone.
    Format: SESS-YYYYMMDD-HHMMSS-GMT{offset}
    Example: SESS-20261112-024225-GMT+7
    """
    now_local = datetime.now().astimezone()
    offset = now_local.utcoffset()
    total_seconds = int(offset.total_seconds()) if offset else 0
    sign = "+" if total_seconds >= 0 else "-"
    hours = abs(total_seconds) // 3600
    minutes = (abs(total_seconds) % 3600) // 60
    gmt_part = f"GMT{sign}{hours}:{minutes:02d}" if minutes else f"GMT{sign}{hours}"
    return f"SESS-{now_local.strftime('%Y%m%d-%H%M%S')}-{gmt_part}"


class SessionManager:
    """
    Manages active photobooth session, enforces state machine transitions,
    and persists metadata to SQLite:
    IDLE -> STARTED -> CAPTURING -> PROCESSING -> PREVIEW -> PRINTING -> COMPLETED
    """

    VALID_TRANSITIONS: Dict[SessionState, List[SessionState]] = {
        SessionState.IDLE: [SessionState.STARTED],
        SessionState.STARTED: [
            SessionState.CAPTURING,
            SessionState.ABORTED,
            SessionState.ERROR,
        ],
        SessionState.CAPTURING: [
            SessionState.CAPTURING,
            SessionState.PROCESSING,
            SessionState.ABORTED,
            SessionState.ERROR,
        ],
        SessionState.PROCESSING: [
            SessionState.PREVIEW,
            SessionState.ABORTED,
            SessionState.ERROR,
        ],
        SessionState.PREVIEW: [
            SessionState.CAPTURING,
            SessionState.PROCESSING,
            SessionState.PRINTING,
            SessionState.COMPLETED,
            SessionState.ABORTED,
            SessionState.ERROR,
        ],
        SessionState.PRINTING: [
            SessionState.COMPLETED,
            SessionState.ERROR,
        ],
        SessionState.COMPLETED: [SessionState.IDLE],
        SessionState.ABORTED: [SessionState.IDLE],
        SessionState.ERROR: [
            SessionState.IDLE,
            SessionState.CAPTURING,
            SessionState.PROCESSING,
            SessionState.PREVIEW,
            SessionState.ABORTED,
        ],
    }

    def __init__(self):
        self.state: SessionState = SessionState.IDLE
        self.current_session: Optional[Dict[str, Any]] = None
        self._event_listeners: List[Callable[[str, Dict[str, Any]], None]] = []

    def register_event_listener(
        self, callback: Callable[[str, Dict[str, Any]], None]
    ) -> None:
        self._event_listeners.append(callback)

    def _emit_event(self, event_type: str, payload: Dict[str, Any]) -> None:
        for listener in self._event_listeners:
            try:
                listener(event_type, payload)
            except Exception:
                pass

    def _persist_current_session(self) -> None:
        if self.current_session:
            try:
                get_db_service().save_session(self.current_session)
            except Exception:
                pass

    def _transition_to(self, new_state: SessionState) -> None:
        allowed = self.VALID_TRANSITIONS.get(self.state, [])
        if new_state not in allowed:
            raise SessionTransitionError(
                f"Invalid transition from state '{self.state.value}' to '{new_state.value}'. "
                f"Allowed transitions: {[s.value for s in allowed]}"
            )
        old_state = self.state
        self.state = new_state
        if self.current_session:
            self.current_session["status"] = new_state
            self._persist_current_session()
        self._emit_event(
            "STATE_CHANGE",
            {
                "from": old_state.value,
                "to": new_state.value,
                "session_id": self.current_session["session_id"] if self.current_session else None,
            },
        )

    def start_session(
        self,
        customer_name: Optional[str] = None,
        photos_required: Optional[int] = None,
        template_id: str = "classic_strip_3",
        frame_color: Optional[str] = None,
        filter_name: Optional[str] = "original",
        ar_preset_id: Optional[str] = None,
        payment_amount: int = 0,
        payment_method: str = "QRIS",
        payment_status: str = "PAID",
        payment_ref: Optional[str] = None,
    ) -> Dict[str, Any]:
        if self.state != SessionState.IDLE:
            raise SessionTransitionError(
                f"Cannot start a new session while current session is in '{self.state.value}'. "
                f"Please finish or abort the current session first."
            )

        # Find default frame color for template if not specified
        tpl_meta = next(
            (t for t in ImageProcessor.AVAILABLE_TEMPLATES if t["id"] == template_id),
            None,
        )
        if not frame_color:
            frame_color = tpl_meta.get("default_frame", "cream") if tpl_meta else "cream"

        if photos_required is None:
            tpl_slots = tpl_meta.get("photos_required", 3) if tpl_meta else 3
            try:
                db_cfg = get_db_service().get_operator_config()
                extra_buffer = int(db_cfg.get("extraPosesBuffer", 1))
            except Exception:
                extra_buffer = 1
            photos_required = max(tpl_slots, tpl_slots + extra_buffer)

        session_id = generate_session_id()
        now = datetime.now(timezone.utc).isoformat()

        self.current_session = {
            "session_id": session_id,
            "status": SessionState.STARTED,
            "customer_name": customer_name,
            "photos_required": photos_required,
            "photos_taken": 0,
            "photos": [],
            "selected_photo_ids": [],
            "template_id": template_id,
            "filter_name": filter_name or "original",
            "frame_color": frame_color,
            "sticker_id": "sweet_bows",
            "ar_preset_id": ar_preset_id,
            "processed_image_path": None,
            "processed_image_url": None,
            "gif_path": None,
            "gif_url": None,
            "cloud_share_url": f"/share/{session_id}",
            "started_at": now,
            "completed_at": None,
            "error_message": None,
            "payment_amount": int(payment_amount or 0),
            "payment_method": payment_method or "QRIS",
            "payment_status": payment_status or "PAID",
            "payment_ref": payment_ref,
        }

        self._transition_to(SessionState.STARTED)
        return self.current_session

    def capture_next_photo(
        self,
        camera_service: CameraInterface,
        image_data: Optional[str] = None,
    ) -> Dict[str, Any]:
        if self.state not in (
            SessionState.STARTED,
            SessionState.CAPTURING,
            SessionState.ERROR,
        ):
            raise SessionTransitionError(
                f"Cannot capture photo in state '{self.state.value}'. Must be STARTED, CAPTURING, or ERROR."
            )

        session = self.current_session
        if not session:
            raise RuntimeError("No active session found.")

        if session["photos_taken"] >= session["photos_required"]:
            raise RuntimeError("Photo quota for this session is already full.")

        if self.state != SessionState.CAPTURING:
            self._transition_to(SessionState.CAPTURING)

        index = session["photos_taken"] + 1
        photo_id = f"photo_{index}"
        filename = f"{session['session_id']}_{index}.jpg"
        target_path = settings.CAPTURES_DIR / filename
        thumb_filename = f"thumb_{filename}"
        thumb_path = settings.THUMBNAILS_DIR / thumb_filename
        preview_filename = f"preview_{filename}"
        preview_path = settings.THUMBNAILS_DIR / preview_filename

        try:
            if image_data and image_data.strip():
                raw_b64 = image_data.strip()
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                raw_bytes = base64.b64decode(raw_b64)
                target_path.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(io.BytesIO(raw_bytes)) as uploaded:
                    rgb = uploaded.convert("RGB")
                    fitted = ImageOps.fit(
                        rgb, (1800, 1200), Image.Resampling.LANCZOS
                    )
                    fitted.save(target_path, "JPEG", quality=92)
                capture_res = {
                    "success": True,
                    "file_path": str(target_path),
                    "filename": filename,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "client_webcam",
                }
            else:
                capture_res = camera_service.capture_image(target_path)

            ImageProcessor.create_thumbnail(target_path, thumb_path)
            ImageProcessor.create_thumbnail(target_path, preview_path, (1280, 853))

            photo_item = {
                "id": photo_id,
                "filename": filename,
                "original_path": str(target_path),
                "thumbnail_path": str(thumb_path),
                "original_url": f"/storage/captures/{filename}",
                "thumbnail_url": f"/storage/thumbnails/{thumb_filename}",
                "preview_url": f"/storage/thumbnails/{preview_filename}",
                "created_at": capture_res.get(
                    "timestamp", datetime.now(timezone.utc).isoformat()
                ),
                "index": index,
            }

            session["error_message"] = None
            session["photos"].append(photo_item)
            session["photos_taken"] = len(session["photos"])

            try:
                get_db_service().save_photo(session["session_id"], photo_item)
            except Exception:
                pass

            self._emit_event(
                "PHOTO_CAPTURED",
                {
                    "photo": photo_item,
                    "photos_taken": session["photos_taken"],
                    "photos_required": session["photos_required"],
                },
            )

            if session["photos_taken"] >= session["photos_required"]:
                self.process_session_photos()

            return photo_item

        except Exception as e:
            session["error_message"] = str(e)
            self._transition_to(SessionState.ERROR)
            raise

    def retake_last_photo(self) -> Dict[str, Any]:
        """
        Removes the last captured photo so the slot can be retaken by the user.
        Transitions state back to CAPTURING if necessary.
        """
        session = self.current_session
        if not session:
            raise RuntimeError("No active session found.")

        if not session.get("photos"):
            raise RuntimeError("No photos captured yet to retake.")

        popped = session["photos"].pop()
        session["photos_taken"] = len(session["photos"])
        session["error_message"] = None

        # Clean up files on disk if present
        for path_key in ("original_path", "thumbnail_path"):
            raw_path = popped.get(path_key)
            if raw_path:
                try:
                    p = Path(raw_path)
                    if p.exists():
                        p.unlink()
                except Exception:
                    pass

        preview_filename = f"preview_{popped['filename']}"
        preview_path = settings.THUMBNAILS_DIR / preview_filename
        if preview_path.exists():
            try:
                preview_path.unlink()
            except Exception:
                pass

        # Clear processed image if it was already composed
        if session.get("processed_image_path"):
            proc_p = Path(session["processed_image_path"])
            if proc_p.exists():
                try:
                    proc_p.unlink()
                except Exception:
                    pass
            session["processed_image_path"] = None
            session["processed_image_url"] = None

        if session.get("gif_path"):
            gif_p = Path(session["gif_path"])
            if gif_p.exists():
                try:
                    gif_p.unlink()
                except Exception:
                    pass
            session["gif_path"] = None
            session["gif_url"] = None

        if self.state != SessionState.CAPTURING:
            self._transition_to(SessionState.CAPTURING)

        self._persist_current_session()
        self._emit_event(
            "PHOTO_RETAKEN",
            {
                "session_id": session["session_id"],
                "photos_taken": session["photos_taken"],
                "photos_required": session["photos_required"],
            },
        )
        return session

    def process_session_photos(
        self,
        template_id: Optional[str] = None,
        filter_name: Optional[str] = None,
        frame_color: Optional[str] = None,
        sticker_id: Optional[str] = None,
        ar_preset_id: Optional[str] = None,
        custom_text: Optional[str] = None,
        selected_photo_ids: Optional[List[str]] = None,
    ) -> str:
        session = self.current_session
        if not session:
            raise RuntimeError("No active session to process.")

        if template_id:
            session["template_id"] = template_id
        if filter_name:
            session["filter_name"] = filter_name
        if frame_color:
            session["frame_color"] = frame_color
        if sticker_id:
            session["sticker_id"] = sticker_id
        if ar_preset_id is not None:
            session["ar_preset_id"] = ar_preset_id
        if custom_text is not None:
            session["customer_name"] = custom_text
        if selected_photo_ids is not None:
            session["selected_photo_ids"] = selected_photo_ids

        self._transition_to(SessionState.PROCESSING)

        photos_by_id = {p["id"]: Path(p["original_path"]) for p in session["photos"]}
        active_selected = session.get("selected_photo_ids") or []
        if active_selected:
            photo_paths = [photos_by_id[pid] for pid in active_selected if pid in photos_by_id]
        else:
            photo_paths = [Path(p["original_path"]) for p in session["photos"]]

        active_tpl = ImageProcessor.get_template(session.get("template_id"))
        if active_tpl and "photos_required" in active_tpl:
            photo_paths = photo_paths[: active_tpl["photos_required"]]

        # Non-destructively apply AR preset & color filter with proper layer order (Section 13.5)
        active_filter = session.get("filter_name") or "original"
        source_paths_for_strip = photo_paths
        strip_filter_to_apply = active_filter
        cur_ar_preset = session.get("ar_preset_id")
        if cur_ar_preset and cur_ar_preset.lower() not in ("none", "off", ""):
            from backend.app.services.ar import get_sticker_engine
            engine = get_sticker_engine()
            ar_photo_paths = []
            for idx, p in enumerate(photo_paths):
                ar_out = settings.PROCESSED_DIR / f"ar_{session['session_id']}_{idx}_{p.name}"
                settings.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
                with Image.open(p) as base_im:
                    ar_img = engine.render_preset(
                        base_im,
                        cur_ar_preset,
                        seed=42 + idx,
                        filter_name=active_filter,
                    )
                    ar_img.save(ar_out, "JPEG", quality=95)
                    ar_photo_paths.append(ar_out)
            source_paths_for_strip = ar_photo_paths
            # Filter was already applied below the AR stickers; avoid double-filtering
            strip_filter_to_apply = "original"

        output_filename = f"processed_{session['session_id']}.jpg"
        output_path = settings.PROCESSED_DIR / output_filename
        gif_filename = f"gif_{session['session_id']}.gif"
        gif_output_path = settings.PROCESSED_DIR / gif_filename

        try:
            ImageProcessor.compose_photostrip(
                source_paths_for_strip,
                output_path,
                template_id=session.get("template_id") or "classic_strip_3",
                filter_name=strip_filter_to_apply,
                frame_color=session.get("frame_color") or "cream",
                customer_name=session.get("customer_name"),
                sticker_id=session.get("sticker_id") or "sweet_bows",
            )
            session["processed_image_path"] = str(output_path)
            session["processed_image_url"] = f"/storage/processed/{output_filename}"

            # Also generate animated Boomerang GIF
            if len(source_paths_for_strip) >= 2:
                gif_source_paths = source_paths_for_strip
                gif_filter_to_apply = strip_filter_to_apply
            else:
                all_session_paths = [Path(p["original_path"]) for p in session["photos"]]
                gif_source_paths = all_session_paths if len(all_session_paths) >= 2 else source_paths_for_strip
                gif_filter_to_apply = active_filter if gif_source_paths != source_paths_for_strip else strip_filter_to_apply

            try:
                ImageProcessor.compose_gif(
                    gif_source_paths,
                    gif_output_path,
                    filter_name=gif_filter_to_apply,
                    frame_color=session.get("frame_color") or "cream",
                    customer_name=session.get("customer_name"),
                    sticker_id=session.get("sticker_id") or "sweet_bows",
                    boomerang=True,
                )
                session["gif_path"] = str(gif_output_path)
                session["gif_url"] = f"/storage/processed/{gif_filename}"
            except Exception:
                pass

            self._transition_to(SessionState.PREVIEW)
            return str(output_path)
        except Exception as e:
            session["error_message"] = f"Image processing failed: {str(e)}"
            self._transition_to(SessionState.ERROR)
            raise

    def print_session(
        self, printer_service: PrinterInterface, copies: int = 1
    ) -> Dict[str, Any]:
        if self.state != SessionState.PREVIEW:
            raise SessionTransitionError(
                f"Cannot print session in state '{self.state.value}'. Must be in PREVIEW."
            )

        session = self.current_session
        if not session or not session.get("processed_image_path"):
            raise RuntimeError("Processed photostrip is not ready for printing.")

        self._transition_to(SessionState.PRINTING)
        file_path = Path(session["processed_image_path"])

        try:
            print_res = printer_service.print_file(file_path=file_path, copies=copies)
            job_record = {
                "id": print_res["job_id"],
                "session_id": session["session_id"],
                "photo_id": None,
                "file_path": str(file_path),
                "copies": copies,
                "status": print_res["status"],
                "printer_name": print_res.get("printer_name"),
                "error_message": None,
                "created_at": print_res["created_at"],
                "completed_at": print_res.get("completed_at"),
            }
            try:
                get_db_service().save_print_job(job_record)
            except Exception:
                pass

            self._emit_event("PRINT_COMPLETED", job_record)
            completed_session = self.complete_session()
            return {"print_job": job_record, "session": completed_session}
        except Exception as e:
            session["error_message"] = f"Printing failed: {str(e)}"
            self._transition_to(SessionState.ERROR)
            raise

    def complete_session(self) -> Dict[str, Any]:
        if self.state not in (SessionState.PREVIEW, SessionState.PRINTING):
            raise SessionTransitionError(
                f"Cannot complete session in state '{self.state.value}'. Must be in PREVIEW or PRINTING."
            )

        session = self.current_session
        now = datetime.now(timezone.utc).isoformat()
        session["completed_at"] = now
        self._transition_to(SessionState.COMPLETED)

        result = dict(session)
        # Clear current_session so returning manager machine to IDLE does not overwrite COMPLETED in DB
        self.current_session = None
        self.state = SessionState.IDLE
        self._emit_event(
            "STATE_CHANGE",
            {
                "from": SessionState.COMPLETED.value,
                "to": SessionState.IDLE.value,
                "session_id": result.get("session_id"),
            },
        )
        return result

    def abort_session(self, reason: str = "User aborted session") -> Dict[str, Any]:
        if self.state == SessionState.IDLE:
            return {"message": "System is already IDLE"}

        sid = None
        if self.current_session:
            self.current_session["error_message"] = reason
            self._transition_to(SessionState.ABORTED)
            sid = self.current_session.get("session_id")

        self.current_session = None
        self.state = SessionState.IDLE
        self._emit_event(
            "STATE_CHANGE",
            {
                "from": SessionState.ABORTED.value,
                "to": SessionState.IDLE.value,
                "session_id": sid,
            },
        )
        return {"message": "Session aborted and reset to IDLE"}

    def reset_to_idle(self) -> None:
        """Force reset in case of recovery from ERROR."""
        self.state = SessionState.IDLE
        self.current_session = None
        self._emit_event(
            "STATE_CHANGE", {"from": "RESET", "to": SessionState.IDLE.value}
        )

    def get_current_session(self) -> Optional[Dict[str, Any]]:
        return self.current_session
