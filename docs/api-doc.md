# Spesifikasi REST & WebSocket API - Dryu Photobooth

Backend menyediakan REST API dan WebSocket untuk interaksi antara iPad Kiosk dan server backend.

Base URL lokal: `http://<IP_LOCAL_MINI_PC>:8000`

---

## 1. Kamera

### `GET /camera/status`
Mengecek status kesiapan kamera (apakah terhubung, mode simulasi vs fisik, model kamera).

**Response (200 OK):**
```json
{
  "connected": true,
  "model": "Simulated Camera (Canon EOS 700D)",
  "driver": "simulation",
  "battery_level": 100,
  "message": "Camera is ready"
}
```

### `POST /camera/capture`
Mengambil foto langsung (standalone/test capture).

**Response (200 OK):**
```json
{
  "success": true,
  "file_path": "storage/captures/test_capture_20261102_030000.jpg",
  "filename": "test_capture_20261102_030000.jpg",
  "width": 1920,
  "height": 1080,
  "timestamp": "2026-11-02T03:00:00Z"
}
```

---

## 2. Sesi Photobooth

### `POST /session/start`
Memulai sesi baru. Memastikan sistem dalam status `IDLE`.

**Request Body (Opsional):**
```json
{
  "customer_name": "Tamu 01",
  "photos_required": 3,
  "template_id": "classic_strip_3"
}
```

**Response (201 Created):**
```json
{
  "session_id": "sess_a8b9c1d2",
  "status": "STARTED",
  "photos_required": 3,
  "photos_taken": 0,
  "template_id": "classic_strip_3",
  "started_at": "2026-11-02T03:00:00Z"
}
```

### `GET /session/current`
Mendapatkan sesi aktif yang sedang berlangsung.

**Response (200 OK):**
```json
{
  "active": true,
  "session": {
    "session_id": "sess_a8b9c1d2",
    "status": "CAPTURING",
    "photos_required": 3,
    "photos_taken": 1,
    "photos": [
      {
        "id": "photo_1",
        "path": "storage/captures/sess_a8b9c1d2_1.jpg",
        "thumbnail_path": "storage/thumbnails/sess_a8b9c1d2_1.jpg"
      }
    ]
  }
}
```

### `POST /session/{id}/capture`
Memotret satu foto dalam rangkaian sesi. Status akan berpindah ke `CAPTURING`, lalu jika kuota foto terpenuhi, sistem dapat otomatis berpindah ke `PROCESSING`.

### `POST /session/{id}/process`
Memicu pipeline penggabungan gambar (layouting/templating) menjadi satu frame siap cetak.

### `POST /session/{id}/complete`
Menandai sesi selesai dan mengembalikan status ke `IDLE`.

### `POST /session/{id}/abort`
Membatalkan sesi yang sedang berlangsung dan mengembalikan sistem ke `IDLE`.

---

## 3. WebSocket

### `WS /ws/session`
Menyediakan event dua arah secara real-time ke antarmuka kiosk iPad:
- `STATE_CHANGE`: Notifikasi perubahan status (misal: IDLE -> STARTED).
- `COUNTDOWN_TICK`: Hitung mundur sebelum pengambilan foto (misal: 3, 2, 1).
- `PHOTO_CAPTURED`: Notifikasi bahwa foto baru berhasil diambil beserta URL thumbnail-nya.
- `ERROR`: Notifikasi jika terjadi kesalahan (misal kamera terputus).
