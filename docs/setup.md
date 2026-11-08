# Panduan Setup & Persiapan Push ke GitHub — Dryu Photobooth

Dokumentasi lengkap persiapan repositori, inisialisasi Git, panduan push ke GitHub, instalasi dependensi, hingga pengoperasian sistem photobooth (*Sweet Studio*).

---

## 1. Ringkasan Arsitektur Proyek

**Dryu Photobooth** adalah sistem photobooth otomatis *local-first* modern dengan antarmuka bertema **Sweet Studio** (*"a little moment, a lovely memory"*):

```text
dryu-booth/
├── backend/                  # REST API & WebSocket (FastAPI, Pillow, gPhoto2 HAL, CUPS)
│   ├── app/
│   │   ├── api/              # Endpoint router (/session, /camera, /printer, /image)
│   │   ├── core/             # Konfigurasi sistem & path storage
│   │   ├── schemas/          # Validasi skema Pydantic
│   │   └── services/         # State machine, kamera, printer, komposisi frame PIL
│   └── requirements.txt
├── frontend/                 # Kiosk UI iPad & Layar Sentuh (Next.js 14, Tailwind CSS)
│   ├── app/                  # Halaman utama kiosk (/) & operator dashboard (/admin)
│   ├── components/           # Komponen UI Sweet Studio, LayoutMock, Webcam preview
│   ├── hooks/                # usePhotoboothSession, useWebcam, useIdleCountdown
│   └── lib/                  # Skema layout, tema warna, konfigurasi
├── storage/                  # Folder bind-mount runtime (captures, thumbnails, processed)
├── database/                 # SQLite database lokal (photobooth.db)
├── templates/                # Aset dekorasi & template bingkai
├── tests/                    # Pengujian otomatis terisolasi (Unit, API, E2E Simulation)
├── deployment/               # Konfigurasi USB passthrough Linux & CUPS
├── docker-compose.yml        # Orkestrasi kontainer backend & frontend
├── .env.example              # Template variabel lingkungan
└── .gitignore                # Proteksi file privasi foto pelanggan & database
```

---

## 2. Prasyarat Sistem (Prerequisites)

Pilih salah satu metode eksekusi:

### A. Menggunakan Docker (Sangat Direkomendasikan)
- **Docker Desktop** (untuk Windows atau macOS) atau **Docker Engine + Docker Compose v2** (untuk Linux / Mini PC).
- Tidak memerlukan instalasi lokal Python atau Node.js karena semua dependensi telah diisolasi di dalam kontainer.

### B. Manual Development (Tanpa Docker)
- **Python**: Versi 3.10, 3.11, 3.12, atau 3.13.
- **Node.js**: Versi 18+ atau 20+ LTS dan npm.
- **Git**: Terpasang di terminal (`git --version`).

---

## 3. Langkah Push Repositori ke GitHub

Ikuti langkah-langkah di bawah ini untuk mengunggah proyek ini ke akun GitHub Anda untuk pertama kali:

### Langkah 1: Buat Repositori Baru di GitHub
1. Buka [GitHub](https://github.com/new).
2. Beri nama repositori, misalnya: `dryu-booth` atau `sweet-photobooth`.
3. Pilih visibilitas **Private** (disarankan jika untuk kebutuhan komersial) atau **Public**.
4. **Penting:** Jangan centang opsi *"Add a README file"*, *"Add .gitignore"*, atau *"Choose a license"* karena file-file tersebut sudah lengkap di repositori lokal ini.
5. Klik **Create repository**.

### Langkah 2: Inisialisasi Git Lokal & Commit Pertama
Buka terminal (PowerShell atau Bash) di direktori utama `dryu-booth`:

```bash
# 1. Pastikan berada di root folder proyek
cd "path/ke/dryu-booth"

# 2. Inisialisasi git jika belum
git init

# 3. Ubah branch default menjadi main
git branch -M main

# 4. Verifikasi status file yang akan di-track (.gitignore sudah melindungi foto pelanggan & database)
git status

# 5. Tambahkan seluruh source code ke staging area
git add .

# 6. Lakukan commit pertama
git commit -m "feat: initial commit sweet studio dryu photobooth kiosk"
```

### Langkah 3: Hubungkan Remote dan Push ke GitHub
Ganti `<USERNAME>` dan `<REPO_NAME>` sesuai repositori GitHub Anda:

```bash
# Menggunakan HTTPS:
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git

# Atau menggunakan SSH:
# git remote add origin git@github.com:<USERNAME>/<REPO_NAME>.git

# Push ke branch main
git push -u origin main
```

> **Catatan Keamanan:** File `.gitignore` telah dikonfigurasi agar foto pelanggan di `storage/captures/`, file database riwayat sesi `photobooth.db`, file cache `.next/`, serta `node_modules/` **tidak akan pernah terunggah** ke GitHub.

---

## 4. Cara Menjalankan Sistem

### Metode 1: Menggunakan Docker Compose (Paling Mudah)

1. **Salin file environment:**
   ```bash
   cp .env.example .env
   ```

2. **Jalankan seluruh sistem (Backend + Frontend):**
   ```bash
   docker compose up -d --build
   ```

3. **Buka aplikasi di browser:**
   - **Layar Kiosk Tamu (iPad / Layar Sentuh):** [http://localhost:3000](http://localhost:3000)
   - **Dashboard Admin / Operator Booth:** [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Healthcheck & Status Hardware:** [http://localhost:8000/health](http://localhost:8000/health)

4. **Perintah Docker esensial:**
   ```bash
   # Melihat status kontainer
   docker compose ps

   # Memantau log real-time
   docker compose logs -f

   # Menghentikan sistem
   docker compose down
   ```

---

### Metode 2: Manual Development (Tanpa Docker)

Jika ingin melakukan kustomisasi kode secara lokal di mesin host:

#### 1. Setup Backend (FastAPI)
```bash
# Buat dan aktifkan virtual environment Python
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

# Install dependensi backend
pip install -r backend/requirements.txt

# Jalankan server backend (port 8000)
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Setup Frontend (Next.js)
Buka tab terminal baru:
```bash
cd frontend

# Install dependensi
npm install

# Jalankan server frontend development (port 3000)
npm run dev
```

---

## 5. Mode Kamera & Cara Pengujian

Sistem mendukung 4 mode kamera sesuai kebutuhan operasional:

| Mode Kamera | Konfigurasi | Deskripsi Penggunaan |
| :--- | :--- | :--- |
| **Wi-Fi Nirkabel Sony Alpha a6400** | `CAMERA_DRIVER=wifi` (`192.168.122.1:10000`) | Menghubungkan kamera mirrorless Sony a6400 tanpa kabel USB melalui fitur *Ctrl w/ Smartphone* (Sony Camera Remote JSON-RPC API di port `10000` & stream *liveview* 25 FPS di port `60152`). |
| **Webcam Laptop / Capture Card / Kamera iPad** | Mode `webcam` via layar persiapan Kiosk | Menggunakan API `navigator.mediaDevices.getUserMedia`. Mendukung webcam bawaan, **HDMI-to-USB Capture Card** (`USB Video`), maupun **EOS Webcam Utility**. |
| **DSLR Kabel USB (`gphoto2`)** | `CAMERA_DRIVER=gphoto` | Mengontrol kamera DSLR/Mirrorless via USB tethering di Linux menggunakan `libgphoto2`. |
| **Simulasi Backend** | `CAMERA_DRIVER=simulation` | Menghasilkan foto siluet potret studio pastel resolusi tinggi (`1800x1200`) secara otomatis via Pillow tanpa memerlukan perangkat kamera fisik. |

### Mengaktifkan Kamera Canon DSLR & Printer Fisik di Linux / Mini PC
Gunakan konfigurasi override USB pada mesin Linux:
```bash
docker compose -f docker-compose.yml -f deployment/docker/docker-compose.usb.yml up -d --build
```
Untuk memverifikasi deteksi kamera USB:
```bash
docker exec -it dryu-booth-backend gphoto2 --auto-detect
```

---

## 6. Menjalankan Automated Testing

Pastikan semua unit test, integration test, dan end-to-end simulation test berjalan hijau:

```bash
# Menjalankan seluruh test suite (28 tests)
python -m pytest -v

# Atau di dalam kontainer Docker
docker compose run --rm backend pytest -v
```

Hasil uji mencakup:
- Pengujian siklus sesi (State Machine: `IDLE` -> `STARTED` -> `CAPTURING` -> `PROCESSING` -> `PREVIEW` -> `PRINTING` -> `COMPLETED`).
- Pengujian isolasi pencegahan sesi ganda (*concurrent conflict*).
- Pengujian komposisi 11 template bingkai Sweet Studio, 8 filter foto, 5 paket stiker, Custom PNG Overlay, serta pembuatan Animasi Boomerang GIF (`compose_gif`).
- Pengujian driver `WifiCamera` (Sony HTTP JSON-RPC & runtime switching `POST /camera/config`), pembayaran QRIS & voucher, serta webcam capture via API.

---

## 7. Variabel Lingkungan (`.env`)

| Variabel | Default | Keterangan |
| :--- | :--- | :--- |
| `SERVER_HOST` | `0.0.0.0` | Host bind server FastAPI |
| `SERVER_PORT` | `8000` | Port backend |
| `DEBUG` | `True` | Mode debug FastAPI |
| `CAMERA_DRIVER` | `wifi` | Driver kamera (`simulation`, `gphoto`, atau `wifi`) |
| `CAMERA_MODEL` | `Sony Alpha a6400 (Wi-Fi)` | Nama model kamera |
| `CAMERA_WIFI_IP` | `192.168.122.1` | Alamat IP Wi-Fi kamera (default Sony Wi-Fi Direct) |
| `CAMERA_WIFI_PORT` | `10000` | Port HTTP JSON-RPC kamera Sony (`10000` untuk a6400, `8080` untuk seri lama) |
| `CAMERA_WIFI_PROTOCOL` | `sony_http` | Protokol kamera nirkabel (`sony_http` atau `ptpip`) |
| `PRINTER_DRIVER` | `simulation` | Driver printer (`simulation` atau `cups`) |
| `PRINTER_NAME` | `Photo_Printer_Default` | Nama antrean printer CUPS |
| `STORAGE_BASE_DIR`| `./storage` | Folder penyimpanan hasil foto |
| `DATABASE_PATH` | `./database/photobooth.db` | File database SQLite |
| `PHOTOS_PER_SESSION` | `3` | Jumlah foto default per sesi |
| `COUNTDOWN_SECONDS` | `5` | Durasi hitung mundur default |
| `CORS_ORIGINS` | `*` | Domain yang diizinkan mengakses API |

---

## 8. Catatan Perubahan Signifikan Konfigurasi & Setup

| Tanggal / Versi | Area | Perubahan |
| :--- | :--- | :--- |
| **v0.2.0** | Variabel Lingkungan | Penambahan variabel Wi-Fi camera: `CAMERA_WIFI_IP`, `CAMERA_WIFI_PORT` (default `10000` untuk a6400), dan `CAMERA_WIFI_PROTOCOL` (`sony_http`). |
| **v0.2.0** | Struktur Folder | Pemindahan seluruh file dokumentasi `.md` ke folder `docs/` (kecuali `README.md` dan `system-doc.md` di root) agar repositori rapi dan terstandar. |
| **v0.2.0** | Test Suite | Penambahan pengujian unit dan integrasi untuk Wi-Fi camera RPC, runtime configuration switcher, Boomerang GIF generator, dan payment gate sehingga total pengujian bertambah menjadi 28 tests passing. |
