# Skema Database Lokal (SQLite) - Dryu Photobooth

Database lokal disimpan pada `database/photobooth.db` dan dikelola secara otomatis oleh [`DatabaseService`](file:///c:/Users/ASUS%20TUF%20F15/dryu-booth/backend/app/services/storage/database.py).

---

## Diagram Relasi Entitas (ERD)

```mermaid
erDiagram
    SESSIONS ||--o{ PHOTOS : contains
    SESSIONS ||--o{ PRINT_JOBS : triggers

    SESSIONS {
        text id PK
        text customer_name
        text status
        integer photos_required
        text template_id
        text processed_path
        text started_at
        text completed_at
        text error_message
    }

    PHOTOS {
        text id PK
        text session_id FK
        text filename
        text original_path
        text processed_path
        text thumbnail_path
        integer photo_index
        text created_at
    }

    PRINT_JOBS {
        text id PK
        text session_id FK
        text photo_id
        text file_path
        integer copies
        text status
        text printer_name
        text error_message
        text created_at
        text completed_at
    }
```
