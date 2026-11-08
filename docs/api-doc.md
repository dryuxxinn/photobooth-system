# Spesifikasi REST & WebSocket API — Dryu Photobooth

Backend menyediakan REST API dan WebSocket untuk komunikasi antara Kiosk (`/`), Admin Dashboard (`/admin`), dan Galeri Digital Tamu (`/share/[sessionId]`).

- **Base URL Lokal:** `http://localhost:8000` (atau `http://<IP_LAN_SERVER>:8000`)
- **Swagger UI Interaktif:** `http://localhost:8000/docs`
- **Static Media Mounts:**
  - `/storage/*` -> Menyajikan file dari `storage/` (`captures/`, `processed/`, `thumbnails/`)
  - `/template-assets/*` -> Menyajikan file dari `templates/assets/` (termasuk `overlays/<template_id>.png`)

---

## 1. Kamera (`/camera`)

### `GET /camera/status`
Mengecek status kesiapan kamera aktif beserta parameter koneksi Wi-Fi.

**Response (200 OK):**
```json
{
  "connected": true,
  "model": "Sony Alpha a6400 (Wi-Fi)",
  "driver": "wifi",
  "battery_level": 100,
  "message": "Wi-Fi Terhubung (Sony HTTP API @ 192.168.122.1:10000)",
  "wifi_ip": "192.168.122.1",
  "wifi_port": 10000,
  "wifi_protocol": "sony_http",
  "hardware_reachable": true
}
```

### `POST /camera/config`
Mengganti driver kamera (`simulation`, `gphoto`, atau `wifi`), model, alamat IP Wi-Fi, port, dan protokol secara *runtime* tanpa me-restart server.

**Request Body:**
```json
{
  "driver": "wifi",
  "model": "Sony Alpha a6400 (Wi-Fi)",
  "wifi_ip": "192.168.122.1",
  "wifi_port": 10000,
  "wifi_protocol": "sony_http"
}
```

### `POST /camera/capture`
Mengambil foto uji coba mandiri (*standalone test capture*) dan menyimpannya di `storage/captures/`.

### `GET /camera/preview-frame`
Mengambil satu frame JPEG (`image/jpeg`) *live view* terbaru dari kamera aktif (atau *background liveview stream* Sony a6400).

### `GET /camera/stream`
Aliran video MJPEG (`multipart/x-mixed-replace; boundary=frame`) untuk *live view* kamera server.

### `POST /camera/connect` & `POST /camera/disconnect`
Menghubungkan ulang atau memutuskan koneksi ke driver kamera aktif.

---

## 2. Sesi Photobooth (`/session`)

### `POST /session/start`
Memulai sesi photobooth baru (sistem harus berada dalam status `IDLE`).

**Request Body:**
```json
{
  "customer_name": "Rina & Besties",
  "photos_required": 6,
  "template_id": "retro_strip_4",
  "frame_color": "pink",
  "filter_name": "original"
}
```

### `GET /session/current`
Mengambil status state machine dan detail sesi yang sedang berlangsung.

### `GET /session/history?limit=25`
Mengambil daftar riwayat sesi yang tersimpan di database SQLite.

### `GET /session/{session_id}`
Mengambil detail lengkap sesi berdasarkan ID (baik sesi aktif maupun yang tersimpan di SQLite), termasuk `processed_image_url`, `gif_url`, `cloud_share_url`, dan daftar `photos`.

### `POST /session/{session_id}/capture`
Memotret satu pose dalam sesi aktif.
- Jika `image_data` (Data URL base64 JPEG) dikirim di body, sistem menyimpan tangkapan dari webcam/capture card browser.
- Jika body kosong, sistem memicu shutter pada driver kamera backend (`WifiCamera` Sony a6400 / `GPhotoCamera` / `SimulatedCamera`).
- Ketika pose terakhir selesai diambil, sistem otomatis menyusun Strip JPEG (`compose_photostrip`) dan Boomerang GIF (`compose_gif`), lalu berpindah ke status `PREVIEW`.

### `POST /session/{session_id}/retake`
Menghapus foto pose terakhir yang baru saja diambil sehingga pelanggan dapat mengulang pose tersebut.

### `POST /session/{session_id}/complete`
Menandai sesi selesai (`COMPLETED`) tanpa mencetak dan mengembalikan sistem ke `IDLE`.

### `POST /session/{session_id}/abort` & `POST /session/reset`
Membatalkan sesi aktif atau melakukan *force reset* state machine kembali ke `IDLE`.

---

## 3. Pembayaran & Cloud Share (`/session/payment/*`, `/session/{id}/cloud-sync`)

### `POST /session/payment/qris`
Membuat transaksi pembayaran QRIS baru.
- **Request:** `{"amount": 35000, "package_name": "Photobooth Session"}`
- **Response:** `{"transaction_id": "qris_...", "amount": 35000, "qr_string": "00020101...", "status": "PENDING"}`

### `POST /session/payment/qris/{transaction_id}/confirm`
Mengonfirmasi pembayaran QRIS menjadi `PAID`.

### `POST /session/payment/voucher`
Memvalidasi kode voucher kasir.
- **Request:** `{"code": "SWEET2026", "valid_codes": ["SWEET2026", "VIPFREE"]}`
- **Response:** `{"valid": true, "code": "SWEET2026", "message": "Voucher valid! Sesi siap dimulai."}`

### `POST /session/{session_id}/cloud-sync`
Menyimpan URL galeri digital tamu (`cloud_share_url`) ke database SQLite.

---

## 4. Pemrosesan Gambar & Template (`/image`, `/templates`, `/print`, `/printer`)

### `POST /image/process`
Menyusun ulang Strip JPEG dan Boomerang GIF menggunakan pilihan foto, template, warna bingkai, stiker, dan filter terbaru.

**Request Body:**
```json
{
  "session_id": "sess_a8b9c1d2",
  "template_id": "retro_strip_4",
  "frame_color": "lavender",
  "filter_name": "beauty",
  "sticker_id": "sweet_bows",
  "custom_text": "Besties Forever ♡",
  "selected_photo_ids": ["photo_1", "photo_2", "photo_4", "photo_6"]
}
```

### `GET /templates`
Mengambil daftar 11 template (`templates`), 6 tema warna (`frame_themes`), dan 5 paket dekorasi stiker (`sticker_options`), beserta status `has_custom_overlay` dan `custom_overlay_url`.

### `POST /templates/{template_id}/overlay`
Mengunggah file PNG transparan kustom (base64 `image_data`) untuk dijadikan *frame overlay* pada template terkait.

### `DELETE /templates/{template_id}/overlay`
Menghapus file PNG *overlay* kustom pada template terkait.

### `POST /print`
Mengirim hasil strip foto sesi ke printer (`copies` lembar) dan menyelesaikan sesi.

### `GET /printer/status` & `GET /printer/jobs`
Mengecek status printer aktif dan daftar riwayat pekerjaan cetak (`print_jobs`).

---

## 5. Sticker & AR Overlays (`/ar`)

### `GET /ar/assets`
Mengambil daftar aset stiker aktif (aksesoris wajah, dekorasi, efek melayang, dll.) yang terdaftar dalam `manifest.json`. Mendukung query parameter opsional `category`.

**Query Parameters:**
- `category` (opsional): Filter kategori (`face-accessories`, `face-decorations`, `floating`, `decorative`).

**Response (200 OK):**
```json
[
  {
    "id": "pink_bunny",
    "name": "Pink Bunny Ears",
    "category": "face-accessories",
    "type": "face-anchored",
    "asset": "face-accessories/bunny/pink_bunny.png",
    "anchor": "head_top",
    "placement": { "scale": 1.25, "offset_x": 0.0, "offset_y": -0.15, "rotation_offset": 0.0 },
    "render": { "opacity": 1.0, "z_index": 20, "fit": "contain", "inherit_color_grading": false },
    "enabled": true,
    "preview_url": "/template-assets/overlays/face-accessories/bunny/pink_bunny.png"
  }
]
```

### `GET /ar/presets`
Mengambil daftar preset AR siap pakai (misalnya `pink_bunny_sweet`, `cute_glasses_blush`, `kitty_whiskers`, `royal_princess`, `sakura_fairy`).

### `GET /ar/presets/{preset_id}`
Mengambil detail satu preset AR berdasarkan ID-nya.

### `POST /ar/analyze`
Mendeteksi wajah pada foto menggunakan Google MediaPipe Face Landmarker. Mengembalikan dimensi gambar, jumlah wajah terdeteksi, sudut roll kepala, jarak mata, dan koordinat 11 facial anchors.

**Request Body (Salah satu dari `photo_id`, `image_path`, atau `image_data` base64):**
```json
{
  "photo_id": "photo_1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "image_width": 1800,
  "image_height": 1200,
  "faces_detected": 1,
  "faces": [
    {
      "face_id": 0,
      "bounding_box": { "x": 0.35, "y": 0.20, "width": 0.30, "height": 0.45 },
      "anchors": {
        "head_top": [0.50, 0.12],
        "forehead": [0.50, 0.25],
        "eyes_center": [0.50, 0.38],
        "left_eye": [0.43, 0.38],
        "right_eye": [0.57, 0.38],
        "nose": [0.50, 0.45],
        "left_cheek": [0.40, 0.48],
        "right_cheek": [0.60, 0.48],
        "mouth": [0.50, 0.55],
        "chin": [0.50, 0.65],
        "face_center": [0.50, 0.42]
      },
      "roll_angle_degrees": 2.5,
      "eye_distance": 0.14,
      "confidence": 0.98
    }
  ],
  "message": "Detected 1 face(s)"
}
```

### `POST /ar/preview`
Menghasilkan pratinjau cepat teroptimasi (downscaled max 1080px) dengan stiker atau preset AR yang diaplikasikan.

### `POST /ar/render`
Merender foto resolusi penuh dengan stiker atau preset AR secara non-destruktif dan menyimpannya di `storage/processed/ar_<id>.jpg`.

---

## 6. WebSocket (`/ws/session`)

### `WS /ws/session`
Mengirimkan event JSON secara *real-time* ke Kiosk:
- `INITIAL_STATE`: Status dan detail sesi saat pertama kali terhubung.
- `STATE_CHANGE`: Transisi status (`from` -> `to`).
- `PHOTO_CAPTURED`: Informasi foto baru yang selesai disimpan.
- `ERROR`: Pesan gangguan perangkat keras atau sesi.

---

## 7. Catatan Perubahan Signifikan REST & WebSocket API

| Endpoint | Perubahan Signifikan | Tujuan & Rincian Teknis |
| :--- | :--- | :--- |
| `GET /ar/assets` | **Endpoint Baru** | Mengembalikan daftar stiker aktif dengan dukungan filter kategori `face-accessories`, `face-decorations`, `floating`, `decorative`. |
| `GET /ar/presets` | **Endpoint Baru** | Mengembalikan daftar preset AR siap pakai untuk antarmuka seleksi Kiosk. |
| `POST /ar/analyze` | **Endpoint Baru** | Deteksi landmark wajah MediaPipe, orientasi roll, dan 11 titik jangkar. |
| `POST /ar/preview` & `render` | **Endpoint Baru** | Komposisi stiker non-destruktif ke foto (resolusi pratinjau cepat dan resolusi penuh). |
| `POST /session/start` & `process` | **Pembaruan Parameter** | Mendukung atribut `ar_preset_id` untuk menerapkan efek AR wajah ke seluruh pose yang dipilih sebelum dicetak. |
| `GET /templates` | **Pembaruan Response** | Menambahkan daftar `ar_presets` agar Kiosk dapat langsung menampilkan opsi stiker AR pada layar kustomisasi. |
| `POST /camera/config` | **Endpoint Baru** | Memungkinkan pergantian driver kamera (`simulation`, `gphoto`, `wifi`), IP, dan port secara dinamis saat runtime. |
| `GET /camera/preview-frame` | **Endpoint Baru** | Mengembalikan satu frame JPEG murni dengan header no-cache untuk liveview polling dari Kiosk. |
| `GET /camera/stream` | **Endpoint Baru** | Streaming liveview kamera server berbasis video MJPEG (`multipart/x-mixed-replace`). |
| `POST /session/{id}/retake` | **Endpoint Baru** | Membatalkan dan menghapus pose foto terakhir agar pelanggan dapat mengulang pose tersebut pada jeda 5 detik. |
| `POST /session/payment/qris` & `confirm` | **Endpoint Baru** | Pembuatan tagihan QRIS dinamis dan konfirmasi instan status pembayaran sesi. |
| `POST /session/payment/voucher` | **Endpoint Baru** | Validasi voucher diskon/kasir yang dikonfigurasi operator. |
| `POST /session/{id}/cloud-sync` | **Endpoint Baru** | Sinkronisasi URL publik galeri tamu ke dalam SQLite untuk QR Code. |
| `POST /templates/{id}/overlay` & `DELETE` | **Endpoint Baru** | Pengunggahan dan penghapusan PNG frame overlay transparan kustom. |
| Static Route `/template-assets` | **Pembaruan Route** | Dipindahkan dari `/templates` ke `/template-assets` untuk menghindari error `405 Method Not Allowed` dengan endpoint REST `/templates/{id}/overlay`. |
