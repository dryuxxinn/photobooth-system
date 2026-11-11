import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.core.config import settings


class DatabaseService:
    """
    Lightweight SQLite database manager for local-first metadata persistence.
    Implements tables defined in project-init.md Section 6:
    - sessions
    - photos
    - print_jobs
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or settings.DATABASE_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    customer_name TEXT,
                    status TEXT NOT NULL,
                    photos_required INTEGER NOT NULL DEFAULT 3,
                    template_id TEXT,
                    frame_color TEXT DEFAULT 'cream',
                    filter_name TEXT DEFAULT 'original',
                    sticker_id TEXT DEFAULT 'sweet_bows',
                    ar_preset_id TEXT,
                    processed_path TEXT,
                    gif_path TEXT,
                    cloud_share_url TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    error_message TEXT
                );

                CREATE TABLE IF NOT EXISTS photos (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    original_path TEXT NOT NULL,
                    processed_path TEXT,
                    thumbnail_path TEXT,
                    photo_index INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                );

                CREATE TABLE IF NOT EXISTS print_jobs (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    photo_id TEXT,
                    file_path TEXT NOT NULL,
                    copies INTEGER NOT NULL DEFAULT 1,
                    status TEXT NOT NULL,
                    printer_name TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                );

                CREATE TABLE IF NOT EXISTS booth_settings (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS custom_filter_presets (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    brightness REAL NOT NULL DEFAULT 1.0,
                    contrast REAL NOT NULL DEFAULT 1.0,
                    saturation REAL NOT NULL DEFAULT 1.0,
                    temperature REAL NOT NULL DEFAULT 1.0,
                    tint REAL NOT NULL DEFAULT 1.0,
                    smoothness REAL NOT NULL DEFAULT 0.0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS settlement_rules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    basis TEXT NOT NULL,
                    deduction_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    min_threshold REAL NOT NULL DEFAULT 0.0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )
            # Safely add new columns if upgrading an existing SQLite database
            existing_cols = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(sessions)").fetchall()
            }
            for col_name, col_def in [
                ("frame_color", "TEXT DEFAULT 'cream'"),
                ("filter_name", "TEXT DEFAULT 'original'"),
                ("sticker_id", "TEXT DEFAULT 'sweet_bows'"),
                ("ar_preset_id", "TEXT"),
                ("gif_path", "TEXT"),
                ("cloud_share_url", "TEXT"),
            ]:
                if col_name not in existing_cols:
                    try:
                        conn.execute(
                            f"ALTER TABLE sessions ADD COLUMN {col_name} {col_def}"
                        )
                    except Exception:
                        pass

    def save_session(self, session: Dict[str, Any]) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO sessions (
                    id, customer_name, status, photos_required,
                    template_id, frame_color, filter_name, sticker_id, ar_preset_id,
                    processed_path, gif_path, cloud_share_url,
                    started_at, completed_at, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    customer_name = excluded.customer_name,
                    status = excluded.status,
                    template_id = excluded.template_id,
                    frame_color = excluded.frame_color,
                    filter_name = excluded.filter_name,
                    sticker_id = excluded.sticker_id,
                    ar_preset_id = excluded.ar_preset_id,
                    processed_path = excluded.processed_path,
                    gif_path = excluded.gif_path,
                    cloud_share_url = excluded.cloud_share_url,
                    completed_at = excluded.completed_at,
                    error_message = excluded.error_message
                """,
                (
                    session["session_id"],
                    session.get("customer_name"),
                    str(session["status"].value if hasattr(session["status"], "value") else session["status"]),
                    session.get("photos_required", 3),
                    session.get("template_id"),
                    session.get("frame_color", "cream"),
                    session.get("filter_name", "original"),
                    session.get("sticker_id", "sweet_bows"),
                    session.get("ar_preset_id"),
                    session.get("processed_image_path"),
                    session.get("gif_path"),
                    session.get("cloud_share_url"),
                    session["started_at"],
                    session.get("completed_at"),
                    session.get("error_message"),
                ),
            )

    def save_photo(self, session_id: str, photo: Dict[str, Any]) -> None:
        photo_pk = f"{session_id}_{photo['id']}"
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO photos (
                    id, session_id, filename, original_path,
                    processed_path, thumbnail_path, photo_index, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    photo_pk,
                    session_id,
                    photo["filename"],
                    photo["original_path"],
                    photo.get("processed_path"),
                    photo.get("thumbnail_path"),
                    photo["index"],
                    photo["created_at"],
                ),
            )

    def get_photo(self, photo_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM photos WHERE id = ? OR filename = ? OR id LIKE ? LIMIT 1",
                (photo_id, photo_id, f"%_{photo_id}"),
            ).fetchone()
            if row:
                return dict(row)
            return None

    def save_print_job(self, job: Dict[str, Any]) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO print_jobs (
                    id, session_id, photo_id, file_path, copies,
                    status, printer_name, error_message, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status = excluded.status,
                    error_message = excluded.error_message,
                    completed_at = excluded.completed_at
                """,
                (
                    job["id"],
                    job["session_id"],
                    job.get("photo_id"),
                    job["file_path"],
                    job.get("copies", 1),
                    job["status"],
                    job.get("printer_name"),
                    job.get("error_message"),
                    job["created_at"],
                    job.get("completed_at"),
                ),
            )

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
            if not row:
                return None
            row_keys = row.keys()
            photos = conn.execute(
                "SELECT * FROM photos WHERE session_id = ? ORDER BY photo_index ASC",
                (session_id,),
            ).fetchall()

            proc_path = row["processed_path"]
            proc_url = (
                f"/storage/processed/{Path(proc_path).name}" if proc_path else None
            )
            gif_path = row["gif_path"] if "gif_path" in row_keys else None
            gif_url = f"/storage/processed/{Path(gif_path).name}" if gif_path else None

            return {
                "session_id": row["id"],
                "customer_name": row["customer_name"],
                "status": row["status"],
                "photos_required": row["photos_required"],
                "photos_taken": len(photos),
                "template_id": row["template_id"],
                "frame_color": (
                    row["frame_color"] if "frame_color" in row_keys and row["frame_color"] else "cream"
                ),
                "filter_name": (
                    row["filter_name"] if "filter_name" in row_keys and row["filter_name"] else "original"
                ),
                "sticker_id": (
                    row["sticker_id"] if "sticker_id" in row_keys and row["sticker_id"] else "sweet_bows"
                ),
                "ar_preset_id": (
                    row["ar_preset_id"] if "ar_preset_id" in row_keys else None
                ),
                "processed_image_path": proc_path,
                "processed_image_url": proc_url,
                "gif_path": gif_path,
                "gif_url": gif_url,
                "cloud_share_url": (
                    row["cloud_share_url"] if "cloud_share_url" in row_keys else None
                ),
                "started_at": row["started_at"],
                "completed_at": row["completed_at"],
                "error_message": row["error_message"],
                "photos": [
                    {
                        "id": f"photo_{p['photo_index']}",
                        "filename": p["filename"],
                        "original_path": p["original_path"],
                        "thumbnail_path": p["thumbnail_path"],
                        "original_url": f"/storage/captures/{p['filename']}",
                        "thumbnail_url": f"/storage/thumbnails/thumb_{p['filename']}",
                        "preview_url": f"/storage/thumbnails/preview_{p['filename']}",
                        "created_at": p["created_at"],
                        "index": p["photo_index"],
                    }
                    for p in photos
                ],
            }

    def list_recent_sessions(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT id FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
            ).fetchall()
            return [self.get_session(r["id"]) for r in rows if r["id"]]

    def list_print_jobs(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            if session_id:
                rows = conn.execute(
                    "SELECT * FROM print_jobs WHERE session_id = ? ORDER BY created_at DESC",
                    (session_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT 50"
                ).fetchall()
            return [dict(r) for r in rows]

    def get_operator_config(self) -> Dict[str, Any]:
        import json

        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT value_json FROM booth_settings WHERE key = 'operator_config' LIMIT 1"
            ).fetchone()
            if row and row["value_json"]:
                try:
                    data = json.loads(row["value_json"])
                    if isinstance(data, dict):
                        return data
                except Exception:
                    pass
        return {}

    def save_operator_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        import json

        current = self.get_operator_config()
        merged = {**current, **config_data}
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO booth_settings (key, value_json, updated_at)
                VALUES ('operator_config', ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = excluded.updated_at
                """,
                (json.dumps(merged), now_iso),
            )
        return merged

    def list_custom_filters(self, only_active: bool = False) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            query = "SELECT * FROM custom_filter_presets"
            if only_active:
                query += " WHERE is_active = 1"
            query += " ORDER BY created_at ASC"
            rows = conn.execute(query).fetchall()
            return [dict(r) for r in rows]

    def get_custom_filter(self, filter_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM custom_filter_presets WHERE id = ? LIMIT 1",
                (filter_id,),
            ).fetchone()
            return dict(row) if row else None

    def save_custom_filter(self, filter_data: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        filter_id = filter_data.get("id") or f"filter_{uuid.uuid4().hex[:8]}"
        name = filter_data.get("name") or "Custom Preset"
        brightness = float(filter_data.get("brightness", 1.0))
        contrast = float(filter_data.get("contrast", 1.0))
        saturation = float(filter_data.get("saturation", 1.0))
        temperature = float(filter_data.get("temperature", 1.0))
        tint = float(filter_data.get("tint", 1.0))
        smoothness = float(filter_data.get("smoothness", 0.0))
        is_active = 1 if filter_data.get("is_active", True) else 0

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO custom_filter_presets (
                    id, name, brightness, contrast, saturation,
                    temperature, tint, smoothness, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    brightness = excluded.brightness,
                    contrast = excluded.contrast,
                    saturation = excluded.saturation,
                    temperature = excluded.temperature,
                    tint = excluded.tint,
                    smoothness = excluded.smoothness,
                    is_active = excluded.is_active,
                    updated_at = excluded.updated_at
                """,
                (
                    filter_id,
                    name,
                    brightness,
                    contrast,
                    saturation,
                    temperature,
                    tint,
                    smoothness,
                    is_active,
                    filter_data.get("created_at", now_iso),
                    now_iso,
                ),
            )
        return self.get_custom_filter(filter_id) or filter_data

    def delete_custom_filter(self, filter_id: str) -> bool:
        with self._get_conn() as conn:
            cur = conn.execute(
                "DELETE FROM custom_filter_presets WHERE id = ?", (filter_id,)
            )
            return cur.rowcount > 0

    def list_settlement_rules(self, only_active: bool = False) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            query = "SELECT * FROM settlement_rules"
            if only_active:
                query += " WHERE is_active = 1"
            query += " ORDER BY created_at ASC"
            rows = conn.execute(query).fetchall()
            return [dict(r) for r in rows]

    def get_settlement_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM settlement_rules WHERE id = ? LIMIT 1", (rule_id,)
            ).fetchone()
            return dict(row) if row else None

    def save_settlement_rule(self, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        rule_id = rule_data.get("id") or f"rule_{uuid.uuid4().hex[:8]}"
        name = rule_data.get("name") or "Aturan Potongan"
        basis = str(rule_data.get("basis", "PER_PHOTO")).upper()
        deduction_type = str(rule_data.get("deduction_type", "FIXED")).upper()
        value = float(rule_data.get("value", 0.0))
        min_threshold = float(rule_data.get("min_threshold", 0.0))
        is_active = 1 if rule_data.get("is_active", True) else 0

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO settlement_rules (
                    id, name, basis, deduction_type, value, min_threshold, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    basis = excluded.basis,
                    deduction_type = excluded.deduction_type,
                    value = excluded.value,
                    min_threshold = excluded.min_threshold,
                    is_active = excluded.is_active,
                    updated_at = excluded.updated_at
                """,
                (
                    rule_id,
                    name,
                    basis,
                    deduction_type,
                    value,
                    min_threshold,
                    is_active,
                    rule_data.get("created_at", now_iso),
                    now_iso,
                ),
            )
        return self.get_settlement_rule(rule_id) or rule_data

    def delete_settlement_rule(self, rule_id: str) -> bool:
        with self._get_conn() as conn:
            cur = conn.execute(
                "DELETE FROM settlement_rules WHERE id = ?", (rule_id,)
            )
            return cur.rowcount > 0


_db_instance: Optional[DatabaseService] = None


def get_db_service() -> DatabaseService:
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseService()
    return _db_instance


def set_db_service(db: DatabaseService) -> None:
    global _db_instance
    _db_instance = db
