# Dryu Photobooth System

Sistem photobooth otomatis *local-first* berbasis iPad (Kiosk UI), Mini PC / Ubuntu Server (Local Server), kamera DSLR Canon EOS 700D (USB tethering), dan printer foto instan.

---

## 1. Struktur Repositori

Repositori ini memisahkan secara tegas antara **kode produksi** (`backend/app/`), **kode pengujian** (`tests/`), dan **penyimpanan runtime** (`storage/`):

```text
dryu-booth/
├── project-init.md         # Catatan diskusi awal & blueprint dasar
├── system-doc.md           # Rujukan arsitektur, spesifikasi sistem & state machine
├── tools.md                # Inventaris tools, software, dan status instalasi
├── README.md               # Panduan setup dan cara menjalankan sistem
├── .gitignore              # Mengabaikan cache, venv, dan foto sesi pelanggan
├── .env.example            # Konfigurasi default sistem
│
├── backend/                # KODE PRODUKSI BACKEND
│   ├── app/
│   │   ├── main.py         # Entry point FastAPI, CORS, static files, WebSocket
│   │   ├── api/            # Router endpoints (/camera, /session)
│   │   ├── core/           # Konfigurasi sistem (Pydantic / Settings)
│   │   ├── schemas/        # Skema validasi request & response
│   │   └── services/       # Business logic (camera, session, image, printer)
│   │       ├── camera/     # Driver HAL (SimulatedCamera vs GPhotoCamera)
│   │       ├── session/    # SessionManager & State Machine
│   │       └── image/      # ImageProcessor (Pillow, thumbnails, strip composition)
│   └── requirements.txt
│
├── frontend/               # KODE PRODUKSI FRONTEND (Next.js Kiosk iPad)
│
├── storage/                # PENYIMPANAN DATA LOKAL (Non-Git)
│   ├── captures/           # Foto asli dari kamera
│   ├── processed/          # Hasil olahan photostrip siap cetak
│   └── thumbnails/         # Thumbnail ringan untuk preview di iPad
│
├── templates/              # Layout template bingkai strip foto
│   ├── layouts/
│   └── assets/
│
├── tests/                  # KODE PENGUJIAN (TERPISAH DARI KODE PRODUKSI)
│   ├── unit/               # Uji unit (SimulatedCamera, SessionManager, ImageProcessor)
│   ├── api/                # Uji integrasi endpoint REST API
│   ├── simulation/         # Uji simulasi E2E alur sesi pelanggan
│   └── conftest.py         # Fixture pytest dan isolasi folder storage pengujian
│
└── docs/                   # Dokumentasi teknis terinci
    └── api-doc.md          # Spesifikasi lengkap REST API & WebSocket
```

---

## 2. Prasyarat & Instalasi

### Prasyarat
- Python 3.10+ (Teruji pada Python 3.13)
- Node.js 18+ (untuk frontend Next.js)

### Instalasi Dependensi Backend
```bash
pip install -r backend/requirements.txt
```

---

## 3. Menjalankan Pengujian (Testing Suite)

Proyek ini mengutamakan pengujian otomatis (*automated testing*). Seluruh pengujian berjalan cepat (< 1 detik) menggunakan driver `SimulatedCamera`:

```bash
# Menjalankan seluruh pengujian (Unit, API, dan E2E Simulation)
python -m pytest -v

# Menjalankan hanya pengujian simulasi alur lengkap pengguna
python -m pytest tests/simulation/test_e2e_session_flow.py -v

# Menjalankan hanya pengujian unit
python -m pytest tests/unit/ -v
```

> **Catatan:** Pengujian menggunakan *isolated storage fixture* di `tests/conftest.py` sehingga tidak mengotori folder `storage/` produksi.

---

## 4. Menjalankan Backend Server

Jalankan server FastAPI lokal:

```bash
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Setelah server berjalan:
- **Swagger UI (Dokumentasi Interaktif):** Buka [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** Buka [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Status Kamera:** `GET http://localhost:8000/camera/status`
- **Healthcheck:** `GET http://localhost:8000/health`
- **File Storage Live:** Foto dapat diakses via browser di `http://localhost:8000/storage/captures/...`

---

## 5. Mode Simulasi vs Kamera Fisik

Driver kamera dapat diganti sewaktu-waktu melalui file `.env` atau *environment variable*:

* **Mode Simulasi (Default untuk dev & testing di Windows/Mac):**
  ```env
  CAMERA_DRIVER=simulation
  ```
  Menghasilkan gambar uji valid beresolusi 1800x1200 (rasio 3:2 Canon DSLR) secara dinamis menggunakan Pillow tanpa membutuhkan kamera fisik.

* **Mode Kamera Fisik (Untuk Linux Ubuntu Server / Mini PC):**
  ```env
  CAMERA_DRIVER=gphoto
  ```
  Menggunakan `gphoto2` CLI / libgphoto2 untuk mengambil gambar langsung dari Canon EOS 700D via kabel USB.

---

## 6. Alur Sesi (State Machine)

Siklus sesi dikontrol ketat oleh `SessionManager`:
```text
IDLE ──> STARTED ──> CAPTURING ──> PROCESSING ──> PREVIEW ──> PRINTING ──> COMPLETED ──> IDLE
                         │               │             │           │
                         └───────────────┴─────────────┴───────────┴──> ERROR / ABORTED
```
1. Pelanggan menekan tombol mulai di iPad (`POST /session/start`).
2. Kamera mengambil foto sesuai kuota (`POST /session/{id}/capture`).
3. Sistem menyusun foto menjadi strip vertikal secara otomatis (`ImageProcessor.compose_photostrip`).
4. Pelanggan melihat pratinjau hasil cetak di iPad.
5. Konfirmasi cetak atau selesai, sistem otomatis kembali ke status `IDLE` untuk pelanggan berikutnya.
