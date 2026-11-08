# Inventaris Tools dan Teknologi - Dryu Photobooth

> Dokumen inventaris resmi seluruh perangkat lunak, pustaka, dan perangkat keras yang digunakan dalam pengembangan sistem photobooth otomatis.

---

## 1. Development & Host Environment

| Tool / Item | Deskripsi / Peran | Versi / Target | Status | Catatan |
| :--- | :--- | :--- | :--- | :--- |
| **Host OS** | Sistem operasi mesin pengembang | Windows 11 Home / Pro | Terverifikasi | Digunakan untuk pengujian host & VM |
| **Virtualisasi** | Hypervisor pengembangan | VirtualBox 7.x | Direncanakan | Dilengkapi Extension Pack untuk USB 2.0/3.0 passthrough |
| **Target OS Server** | Sistem operasi server lokal | Ubuntu Server 24.04 LTS | Direncanakan | Minimal, headless, stabil untuk 24/7 |
| **Code Editor** | IDE Pengembangan | Visual Studio Code / Antigravity | Terpasang | Ekstensi Python, ESLint, Tailwind |
| **Version Control** | Kontrol versi kode sumber | Git | Terpasang | Monorepo sederhana |

---

## 2. Backend Stack (Produksi & Servis)

| Tool / Library | Peran | Versi Terpasang | Status |
| :--- | :--- | :--- | :--- |
| **Python** | Runtime bahasa backend | 3.13.0 | Terverifikasi |
| **FastAPI** | Framework Web REST & WebSocket API | 0.110.0+ | Terverifikasi |
| **Uvicorn** | ASGI Web Server | 0.28.0+ | Terverifikasi |
| **Pydantic** | Validasi data, schemas, dan konfigurasi | 2.13.5+ | Terverifikasi |
| **Pillow (PIL)** | Manipulasi gambar, crop, resize, templating | 12.3.0+ | Terverifikasi |
| **python-dotenv** | Manajemen variabel lingkungan (`.env`) | 1.2.4+ | Terverifikasi |
| **HTTPX** | HTTP client untuk testing & integrasi | 0.28.1+ | Terverifikasi |

---

## 3. Kamera & Integrasi Hardware

| Tool / Driver | Peran | Status | Catatan |
| :--- | :--- | :--- | :--- |
| **WifiCamera (`sony_http` & `ptpip`)** | Driver kamera nirkabel (Sony Camera Remote JSON-RPC API & PTP/IP) | **Terimplementasi & Terverifikasi** | Teruji langsung dengan **Sony Alpha a6400 (`ILCE-6400`)** via Wi-Fi Direct (`192.168.122.1:10000`, liveview 25 FPS di port `60152`, shutter fisik otomatis) |
| **Browser UVC / Capture Card (`useWebcam`)** | Integrasi kamera via `navigator.mediaDevices.getUserMedia` | **Terimplementasi & Terverifikasi** | Mendukung webcam perangkat, HDMI-to-USB Capture Card (`USB Video`), dan `EOS Webcam Utility` |
| **GPhotoCamera (`gphoto2`)** | Driver kamera DSLR via kabel USB (Linux) | **Terimplementasi** | Menggunakan `gphoto2` CLI untuk kamera Canon/Nikon/Sony via USB |
| **SimulatedCamera** | Driver mock kamera berbasis software | **Terimplementasi** | Menghasilkan foto dummy dinamis (Pillow `1800x1200`) untuk testing & fallback otomatis |
| **Sony Alpha a6400 / Canon EOS 700D** | Kamera utama photobooth | Hardware Fisik | Mendukung koneksi Wi-Fi Direct tanpa kabel (Sony a6400), HDMI Capture Card, maupun USB |
| **Dummy Battery (AC Adapter)** | Sumber daya kamera terus-menerus | Wajib Operasional | Menghindari downtime akibat baterai habis saat sesi |

---

## 4. Frontend & Kiosk UI

| Tool / Pustaka | Peran | Status | Catatan |
| :--- | :--- | :--- | :--- |
| **Node.js** | Runtime JavaScript frontend | LTS (v20+) | Untuk build Next.js |
| **pnpm / npm** | Package manager | Direncanakan | Manajemen dependensi frontend |
| **Next.js** | Framework React (App Router) | v14 / v15 | UI Kiosk touch-friendly untuk iPad |
| **Tailwind CSS** | Utility-first CSS | v3 / v4 | Responsif, layout layar sentuh |
| **Lucide React** | Ikon antarmuka | Direncanakan | Ikon tombol, kamera, printer, status |

---

## 5. Storage, Database, & Printing

| Tool | Peran | Status | Catatan |
| :--- | :--- | :--- | :--- |
| **SQLite** | Database metadata sesi lokal | Terpasang (Bawaan Python) | Tanpa konfigurasi server terpisah, ACID compliant |
| **Local Filesystem** | Penyimpanan file gambar | Terstruktur | Folder terpisah: `captures/`, `processed/`, `thumbnails/` |
| **CUPS** | Common UNIX Printing System | Direncanakan (Linux) | Spooling dan antrean cetak di Ubuntu |

---

## 6. Testing & Kualitas Kode

| Tool | Peran | Status | Catatan |
| :--- | :--- | :--- | :--- |
| **pytest** | Test runner & framework pengujian backend | 9.2.0+ (Terpasang) | Pengujian unit, integrasi API, dan simulasi alur |
| **TestClient (Starlette/HTTPX)** | Mock client FastAPI | Terpasang | Menjalankan uji API in-memory tanpa mengangkat port live |
| **Playwright** | E2E test antarmuka frontend | Direncanakan | Pengujian interaksi sentuhan & countdown UI |

---

## 7. Catatan Konfigurasi & Kebijakan Versi
1. **Pemisahan Kode Testing dan Produksi:**
   - Semua modul fungsional sistem diletakkan di `backend/app/`.
   - Seluruh kode pengujian diletakkan secara terpisah di folder `tests/` (unit, api, dan simulasi).
2. **Kamera Simulation Default:**
   - Variabel lingkungan `CAMERA_DRIVER=simulation` memungkinkan seluruh pipeline pengujian berjalan otomatis (CI/CD ready).

---

## 8. Catatan Perubahan Signifikan Inventaris Tools & Hardware

| Komponen Hardware / Tool | Perubahan Signifikan |
| :--- | :--- |
| **Sony Alpha a6400 (ILCE-6400)** | Integrasi nirkabel penuh via Wi-Fi Direct: HTTP JSON-RPC port 10000, liveview continuous HTTP stream port 60152, shutter release dengan half-press lock. |
| **Web Audio API** | Synthesizer audio murni pada frontend browser (menghilangkan ketergantungan library audio pihak ketiga atau file MP3 eksternal). |
| **Pillow Engine** | Penambahan generator Animasi Boomerang GIF (`compose_gif`), alpha compositing PNG frame overlays kustom, serta filter artistik baru (`beauty`, `cool`, `y2k`). |
