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
                    processed_path TEXT,
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
                """
            )

    def save_session(self, session: Dict[str, Any]) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO sessions (
                    id, customer_name, status, photos_required,
                    template_id, processed_path, started_at, completed_at, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status = excluded.status,
                    processed_path = excluded.processed_path,
                    completed_at = excluded.completed_at,
                    error_message = excluded.error_message
                """,
                (
                    session["session_id"],
                    session.get("customer_name"),
                    str(session["status"].value if hasattr(session["status"], "value") else session["status"]),
                    session.get("photos_required", 3),
                    session.get("template_id"),
                    session.get("processed_image_path"),
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
            photos = conn.execute(
                "SELECT * FROM photos WHERE session_id = ? ORDER BY photo_index ASC",
                (session_id,),
            ).fetchall()
            return {
                "session_id": row["id"],
                "customer_name": row["customer_name"],
                "status": row["status"],
                "photos_required": row["photos_required"],
                "photos_taken": len(photos),
                "template_id": row["template_id"],
                "processed_image_path": row["processed_path"],
                "started_at": row["started_at"],
                "completed_at": row["completed_at"],
                "error_message": row["error_message"],
                "photos": [
                    {
                        "id": f"photo_{p['photo_index']}",
                        "filename": p["filename"],
                        "original_path": p["original_path"],
                        "thumbnail_path": p["thumbnail_path"],
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


_db_instance: Optional[DatabaseService] = None


def get_db_service() -> DatabaseService:
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseService()
    return _db_instance


def set_db_service(db: DatabaseService) -> None:
    global _db_instance
    _db_instance = db
