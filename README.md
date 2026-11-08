# Dryu Photobooth System (Sweet Studio Edition)

Sistem photobooth otomatis *local-first* modern bertema **Sweet Studio** (*"a little moment, a lovely memory"*) berbasis Next.js 14 (Kiosk Layar Sentuh, Dashboard Admin, & Galeri Unduh Tamu) dan FastAPI Python Backend (Pemrosesan Gambar Pillow, Animasi Boomerang GIF, Multi-Driver Kamera Wi-Fi/USB/Webcam, SQLite, & Printer Spooler).

---

## 1. Fitur Utama Sistem

1. **Multi-Arsitektur Kamera Fleksibel**:
   - **Nirkabel Wi-Fi Direct (`CAMERA_DRIVER=wifi`)**: Teruji langsung dengan **Sony Alpha a6400 (`ILCE-6400`)** melalui **Sony Camera Remote HTTP JSON-RPC API** (`192.168.122.1:10000`, stream *liveview* ~25 FPS di port `60152`, dan pemicu shutter fisik otomatis) serta protokol **PTP/IP** (`gphoto2 --port ptpip:<IP>`).
   - **Kamera Perangkat / USB Capture Card (`cameraSource = "webcam"`)**: Menggunakan webcam laptop/iPad, **HDMI-to-USB Capture Card** (`USB Video`), atau **EOS Webcam Utility** langsung dari browser dengan pemilih perangkat *real-time*.
   - **Kabel USB Tethering DSLR (`CAMERA_DRIVER=gphoto`)**: Menggunakan `gphoto2` CLI di Linux untuk Canon/Nikon/Sony via USB.
   - **Mode Simulasi (`CAMERA_DRIVER=simulation`)**: Menghasilkan gambar sintetis `1800x1200` untuk pengujian otomatis & development tanpa kamera fisik.
2. **11 Layout Template, 6 Tema Warna Pastel, 8 Filter Live, & 5 Paket Stiker**:
   - Mendukung layout *Korean 4-Cut Strip*, *Twin Strip 2x6*, *2x2 Grid Scrapbook*, *Cinema Ticket*, *Polaroid*, *Bestie Duo*, hingga *Widescreen*.
   - Filter *live preview* & pemrosesan akhir: `original`, `beauty` (*Soft Beauty Glow*), `bw`, `sepia`, `vintage`, `cool` (*Cool Breeze*), `y2k` (*Cyber Y2K Pop*), dan `vivid`.
   - Pilihan dekorasi stiker: `sweet_bows`, `hearts_only`, `flowers_only`, `sparkles_only`, dan `none` (polos).
3. **Custom PNG Frame Overlay (Upload via Admin)**:
   - Operator dapat mengunggah file PNG transparan kustom per-template langsung dari halaman `/admin` (`POST /templates/{id}/overlay`) untuk kebutuhan acara khusus (pernikahan, ulang tahun, *brand activation*).
4. **Animated Boomerang GIF Otomatis**:
   - Setiap sesi otomatis menghasilkan strip cetak beresolusi tinggi (JPEG) sekaligus animasi **Boomerang GIF** (`storage/processed/gif_<session_id>.gif`).
5. **Gerbang Pembayaran QRIS & Kode Voucher Kasir (`PaymentModal`)**:
   - Dapat diaktifkan/nonaktifkan dari `/admin` dengan nominal harga IDR yang dapat diatur serta validasi kode voucher kasir (`SWEET2026`, `VIPFREE`, `BESTIE`, dll.).
6. **Galeri Digital Tamu Mobile-First (`/share/[sessionId]`)**:
   - QR Code di akhir sesi mengarahkan HP pelanggan ke halaman `/share/<session_id>` untuk mengunduh **Strip Foto (JPEG)**, **Animasi Boomerang (GIF)**, maupun **Semua Foto Asli per-Pose (1–6)**.
7. **Efek Suara Web Audio Synthesizer (`frontend/lib/sound.ts`)**:
   - Suara *beep* hitung mundur, klik *shutter* kamera, dan *chime* selesai sesi berbasis Web Audio API murni tanpa file audio eksternal.

---

## 2. Struktur Repositori

```text
dryu-booth/
├── README.md               # Panduan utama & ringkasan fitur sistem
├── system-doc.md           # Arsitektur lengkap, alur sesi 8-langkah, & state machine
├── docker-compose.yml      # Orkestrasi kontainer backend (8000) & frontend (3000)
├── .env.example            # Template variabel lingkungan (.env)
│
├── backend/                # KODE PRODUKSI BACKEND (FastAPI)
│   ├── app/
│   │   ├── main.py         # Entry point FastAPI, CORS, static mounts (/storage, /template-assets), WS
│   │   ├── api/            # Router HTTP (/camera, /session, /printer, /image, /templates)
│   │   ├── core/           # Konfigurasi sistem (config.py & websocket.py)
│   │   ├── schemas/        # Skema validasi Pydantic (camera, session)
│   │   └── services/       # Business logic & Hardware Abstraction Layer (HAL)
│   │       ├── camera/     # base.py, simulated.py, gphoto.py, wifi.py (Sony HTTP & PTP/IP)
│   │       ├── session/    # manager.py (SessionManager & State Machine)
│   │       ├── image/      # processor.py (Pillow strip composer, GIF generator, filters, PNG overlay)
│   │       ├── printer/    # base.py, simulated.py, cups.py
│   │       └── storage/    # database.py (SQLite persistence & auto-migration)
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/               # KODE PRODUKSI FRONTEND (Next.js 14 App Router)
│   ├── app/
│   │   ├── page.tsx        # Layar Kiosk Utama (8 langkah interaktif)
│   │   ├── admin/page.tsx  # Dashboard Admin & Pengaturan Operator (/admin)
│   │   └── share/[sessionId]/page.tsx # Galeri Digital Unduh Tamu (/share/[sessionId])
│   ├── components/
│   │   ├── kiosk/          # Welcome, Preparation, CameraPreview, CountdownOverlay, PhotoSelection,
│   │   │                   # TemplateSelector, PhotoPreview, Printing, Completion, PaymentModal
│   │   ├── admin/          # Dashboard, CameraStatus, PrinterStatus, SessionTable, TemplateManager
│   │   └── ui/             # Button, Card, StatusBadge, ProgressIndicator
│   ├── hooks/              # usePhotoboothSession.ts, useWebcam.ts, useIdleCountdown.ts
│   ├── lib/                # config.ts, defaults.ts, sound.ts (Web Audio API)
│   ├── services/           # api.ts (REST & WebSocket client)
│   └── types/              # photobooth.ts
│
├── storage/                # PENYIMPANAN RUNTIME LOKAL (Bind-Mounted, Non-Git)
│   ├── captures/           # Foto mentah tiap pose
│   ├── processed/          # Hasil strip cetak (JPEG) & Boomerang (GIF)
│   ├── thumbnails/         # Thumbnail ringan untuk preview cepat
│   └── exports/
│
├── templates/              # Aset template & custom PNG overlays (templates/assets/overlays/)
├── database/               # Database SQLite lokal (photobooth.db)
├── tests/                  # SUITE PENGUJIAN OTOMATIS (28 Pengujian Pytest)
│   ├── unit/               # test_camera_service.py, test_image_processor.py, test_session_manager.py
│   ├── api/                # test_camera_api.py, test_printer_and_db_api.py, test_session_api.py
│   ├── simulation/         # test_e2e_session_flow.py
│   └── conftest.py
│
└── docs/                   # FOLDER DOKUMENTASI TEKNIS & PETUNJUK RESMI
    ├── catatan-perubahan-fitur.md # Catatan perubahan signifikan komprehensif per fitur
    ├── fitur-lumabooth-dan-wifi-camera.md # Rincian fitur LumaBooth & debugging Wi-Fi Sony a6400
    ├── api-doc.md          # Dokumentasi lengkap seluruh endpoint REST API & WebSocket
    ├── camera-integration.md # Panduan integrasi kamera Wi-Fi Sony a6400, Capture Card, & gPhoto2
    ├── database-schema.md  # Skema tabel SQLite (sessions, photos, print_jobs) & auto-migrasi
    ├── printer-integration.md # Panduan integrasi printer CUPS & antrean cetak
    ├── troubleshooting.md  # Solusi kendala kamera Wi-Fi/USB, webcam, dan jaringan
    ├── DOCKER.md           # Panduan build & operasional kontainer Docker Compose
    ├── setup.md            # Panduan setup lokal, Docker, & GitHub
    ├── tools.md            # Inventaris software, pustaka, & perangkat keras
    ├── rancangan_ui_ux_photobooth.md # Spesifikasi desain UI/UX Sweet Studio
    ├── sticker-ar-overlay-engine.md  # Desain arsitektur Sticker & AR Overlay Engine
    └── project-init.md     # Arsip blueprint & diskusi inisialisasi awal proyek
```

---

## 3. Cara Menjalankan Sistem (Docker Compose)

Cara paling cepat dan stabil untuk menjalankan seluruh sistem (Backend + Frontend):

```bash
docker compose up -d --build
```

Setelah kontainer berjalan:
- **Layar Kiosk Pelanggan**: [http://localhost:3000](http://localhost:3000)
- **Dashboard Admin / Operator**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Galeri Unduh Tamu (Mobile)**: `http://localhost:3000/share/<session_id>`
- **Swagger UI REST API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Healthcheck**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 4. Menjalankan Pengujian Otomatis (`pytest`)

Seluruh **28 pengujian otomatis** (Unit, Integrasi API, dan Simulasi E2E) dapat dijalankan dengan:

```bash
python -m pytest -v
```

---

## 5. Konfigurasi Mode Kamera

Driver kamera dapat diatur melalui `.env`, `docker-compose.yml`, atau langsung secara *live* tanpa restart melalui halaman **`http://localhost:3000/admin`** (kartu **CAMERA**):

1. **Mode Kamera Nirkabel / Wi-Fi (Sony Alpha a6400 / Mirrorless Wi-Fi)**:
   ```env
   CAMERA_DRIVER=wifi
   CAMERA_MODEL=Sony Alpha a6400 (Wi-Fi)
   CAMERA_WIFI_IP=192.168.122.1
   CAMERA_WIFI_PORT=10000
   CAMERA_WIFI_PROTOCOL=sony_http
   ```
   Aktifkan *Ctrl w/ Smartphone* pada menu Network Sony a6400, sambungkan Wi-Fi PC/Server ke SSID `DIRECT-xxxx:ILCE-6400`, dan sistem akan otomatis menampilkan *liveview* ~25 FPS serta memicu shutter fisik kamera.

2. **Mode Webcam / HDMI Capture Card (Browser)**:
   Pada layar persiapan Kiosk (`READY, CUTIES?`) atau `/admin`, pilih **📷 Kamera Perangkat / USB Capture Card**, lalu pilih input kamera yang diinginkan (`USB2.0 HD UVC WebCam`, `USB Video`, atau `EOS Webcam Utility`).

3. **Mode Kabel USB DSLR (`gphoto2` Linux)**:
   ```env
   CAMERA_DRIVER=gphoto
   CAMERA_MODEL=Canon EOS 700D
   ```

4. **Mode Simulasi (Tanpa Kamera Fisik)**:
   ```env
   CAMERA_DRIVER=simulation
   ```
