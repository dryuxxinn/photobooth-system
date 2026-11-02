# Riwayat Diskusi Project Photobooth Otomatis

> Ekspor rangkuman dan isi diskusi project photobooth dari pembahasan
> awal hingga rancangan dokumentasi project. Disusun dalam Markdown agar
> dapat disimpan di repository.

## 1. Tujuan Project

Membangun sistem photobooth otomatis dengan: - iPad sebagai antarmuka
touchscreen/kiosk untuk pengguna. - Mini PC sebagai local server dan
pusat kendali. - Canon EOS 700D sebagai kamera utama melalui USB
tethering. - Printer untuk mencetak hasil foto. - Kemampuan bekerja
secara lokal/offline untuk proses inti. - Opsi integrasi cloud untuk
monitoring, transaksi, statistik, dan berbagi foto.

Pengembangan akan dimulai menggunakan VirtualBox sebelum berpindah ke
Mini PC fisik.

------------------------------------------------------------------------

## 2. Riwayat Pembahasan

### 2.1 Bagaimana sistem photobooth otomatis bekerja?

Photobooth otomatis umumnya menjalankan alur: 1. Pengguna berinteraksi
melalui layar sentuh. 2. Pengguna memulai sesi. 3. Sistem menampilkan
countdown. 4. Kamera mengambil satu atau beberapa foto. 5. Foto
dipindahkan ke komputer pengendali. 6. Software memproses foto, misalnya
crop, resize, dan menggabungkan foto ke template. 7. Pengguna melihat
preview hasil. 8. Sistem mengirim hasil ke printer. 9. Sesi ditandai
selesai dan hasil disimpan.

### 2.2 Menghubungkan Canon EOS 700D dengan software

EOS 700D dapat dihubungkan ke komputer melalui kabel USB data. Untuk
pengembangan custom pada Linux, opsi yang dibahas adalah
gPhoto2/libgphoto2.

Kemampuan yang perlu diuji: - Deteksi kamera. - Pengambilan foto dari
software. - Transfer hasil foto ke komputer. - Live View/preview jika
didukung oleh kombinasi kamera, firmware, dan versi library.

Canon EOS Utility dapat digunakan untuk pengujian awal pada Windows,
tetapi bukan komponen utama arsitektur custom Linux yang direncanakan.

Kamera tetap membutuhkan sumber daya sendiri. USB tidak menggantikan
baterai kamera; untuk operasi lama pertimbangkan dummy battery/AC
adapter yang kompatibel.

### 2.3 Rancangan iPad dan local server

Arsitektur yang dipilih: - iPad menjalankan UI kiosk melalui browser
Safari/PWA. - Komputer lokal menerima perintah dari iPad. - Komputer
lokal mengendalikan kamera dan printer. - iPad tidak mengakses kamera
secara langsung.

Alur komunikasi: 1. iPad mengakses frontend melalui jaringan lokal. 2.
Frontend mengirim HTTP request atau WebSocket ke local API. 3. Backend
mengelola sesi dan memanggil camera service. 4. Camera service
berkomunikasi dengan kamera melalui USB. 5. Foto disimpan, diproses,
lalu dikirim ke print service.

### 2.4 Pilihan Raspberry Pi atau Mini PC

Raspberry Pi 5 secara teknis dapat digunakan, tetapi Mini PC dipilih
sebagai opsi utama karena: - Kinerja CPU dan kapasitas RAM umumnya lebih
besar. - Pilihan port USB dan penyimpanan lebih fleksibel. - Lebih
leluasa menjalankan beberapa service sekaligus. - Lebih mudah
ditingkatkan untuk kebutuhan operasional.

Spesifikasi Mini PC yang dibahas: - Kelas awal: Intel N100, RAM 8--16
GB, SSD 256 GB. - Pilihan lebih lega: Intel Core i5 generasi 12 atau
lebih baru / Ryzen 5, RAM 16 GB, NVMe 512 GB. - GPU dedicated tidak
diperlukan untuk pemrosesan foto dasar; baru relevan untuk beban AI atau
video yang berat.

Ubuntu direkomendasikan karena ekosistem gPhoto2 dan CUPS. Windows dapat
memiliki keunggulan kompatibilitas software vendor tertentu, tetapi
gPhoto2 berorientasi Unix/Linux.

### 2.5 Tidak menggunakan dslrBooth

Pengembangan diarahkan ke sistem custom, bukan menggunakan dslrBooth
sebagai aplikasi utama. Tujuannya agar alur, UI, integrasi perangkat,
penyimpanan, dan fitur dapat dikendalikan sendiri.

### 2.6 Pengujian menggunakan VirtualBox

Pengujian sebelum membeli Mini PC fisik memungkinkan. VM dapat digunakan
untuk: - Mengembangkan backend dan frontend. - Menguji API dan alur
sesi. - Menguji camera service menggunakan mode simulasi. - Menguji USB
passthrough dengan EOS 700D. - Menguji image processing. - Menguji print
workflow menggunakan printer virtual/PDF sebelum printer fisik tersedia.

Konfigurasi VM awal yang disarankan: - Ubuntu Server 24.04 LTS. - 4
vCPU. - RAM 8 GB (sesuaikan kemampuan host; dapat mulai dari 2 vCPU/4
GB). - Disk virtual 50 GB. - Network Bridged agar iPad di jaringan yang
sama dapat mengakses VM. - USB controller xHCI/USB 3.0; jika bermasalah,
uji USB 2.0. - USB device filter untuk kamera.

VirtualBox Extension Pack dengan versi yang sesuai mungkin diperlukan
untuk dukungan USB tertentu. Ketika perangkat USB di-capture oleh VM,
Windows host biasanya tidak dapat menggunakan kamera secara bersamaan.
USB passthrough perlu diuji karena kestabilannya dapat berbeda-beda.

### 2.7 Keputusan: EOS 700D langsung ke VirtualBox

Pengguna memilih opsi menghubungkan EOS 700D langsung ke VM melalui USB
passthrough.

Gambaran koneksi:

``` text
Laptop Windows
└── VirtualBox
    └── Ubuntu Server VM
        ├── FastAPI
        ├── gPhoto2 / libgphoto2
        ├── Next.js
        ├── SQLite
        └── USB Passthrough
            └── Canon EOS 700D
```

Langkah konfigurasi: 1. Matikan VM. 2. Buka VirtualBox → Settings → USB.
3. Aktifkan USB Controller. 4. Pilih USB 3.0 (xHCI); jika tidak stabil,
coba USB 2.0. 5. Tambahkan USB Filter untuk perangkat Canon. 6. Jalankan
VM. 7. Hubungkan kamera melalui kabel USB data. 8. Jika belum otomatis
terhubung, pilih perangkat Canon dari menu Devices → USB.

Instalasi dan pengujian di Ubuntu:

``` bash
sudo apt update
sudo apt install -y gphoto2 libgphoto2-dev

gphoto2 --version
gphoto2 --auto-detect
```

Jika kamera terdeteksi, uji pengambilan dan pengunduhan foto:

``` bash
gphoto2 --capture-image-and-download
```

Target pertama adalah memastikan kamera terdeteksi dan satu foto
berhasil diambil serta diunduh. Jangan membangun seluruh aplikasi
sebelum tahap ini berhasil.

Catatan: - Gunakan kabel USB data yang baik. - Tutup EOS Utility atau
aplikasi kamera lain di Windows agar tidak berebut akses. - Jangan
mencabut USB ketika capture/transfer berlangsung. - Gunakan catu daya
kamera yang sesuai untuk pengujian jangka panjang. - Keberhasilan di VM
belum menjamin kestabilan operasi 24/7 pada produksi.

------------------------------------------------------------------------

## 3. Arsitektur Sistem yang Diusulkan

### 3.1 Komponen

  -----------------------------------------------------------------------
  Komponen                            Tanggung jawab
  ----------------------------------- -----------------------------------
  iPad                                UI touchscreen dan kiosk

  Mini PC / VM                        Local server dan pusat kendali

  Canon EOS 700D                      Pengambilan foto

  Printer                             Pencetakan foto

  SQLite                              Metadata sesi lokal

  Local storage                       File foto asli dan hasil olahan

  Cloud backend (opsional)            Monitoring, sinkronisasi,
                                      statistik, dan berbagi foto
  -----------------------------------------------------------------------

### 3.2 Diagram arsitektur

``` mermaid
flowchart TD
    A[iPad Kiosk UI] -->|HTTP / WebSocket| B[Local API - FastAPI]
    B --> C[Session Manager]
    B --> D[Camera Service]
    B --> E[Image Processing]
    B --> F[Print Service]
    C --> G[(SQLite Database)]
    D -->|USB / gPhoto2| H[Canon EOS 700D]
    H -->|Image Transfer| E
    E --> I[Local Storage]
    E --> F
    F --> J[Photo Printer]
    B -.->|Optional Sync| K[Cloud Backend]
```

### 3.3 Prinsip arsitektur

1.  Local-first: fungsi utama tetap berjalan tanpa internet.
2.  Modular: kamera, sesi, pemrosesan foto, storage, dan printer
    dipisahkan.
3.  Frontend tidak mengakses kamera secara langsung.
4.  Satu camera service menjadi pemilik eksklusif akses kamera agar
    tidak terjadi konflik.
5.  Gunakan abstraksi kamera agar simulasi dan kamera fisik memakai
    interface yang sama.
6.  Cloud bersifat opsional untuk fungsi inti.
7.  Sistem harus menangani kamera terputus, printer gagal, dan proses
    yang terhenti.

### 3.4 Camera abstraction

Implementasi yang direncanakan: - `SimulatedCamera`: menggunakan file
JPG contoh dan mensimulasikan status kamera, capture, disconnect, serta
kegagalan. - `GPhotoCamera`: implementasi nyata menggunakan
gPhoto2/libgphoto2.

Kedua implementasi menggunakan interface yang sama agar alur aplikasi
bisa dibangun dan diuji sebelum kamera fisik tersedia.

### 3.5 Status sesi

Contoh siklus sesi:

``` text
IDLE
  |
  v
STARTED
  |
  v
CAPTURING
  |
  v
PROCESSING
  |
  v
PREVIEW
  |
  v
PRINTING
  |
  v
COMPLETED
```

Status `ERROR` dapat dicapai dari tahap mana pun jika terjadi kegagalan.

------------------------------------------------------------------------

## 4. Rancangan Teknologi

### Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS

### Backend

-   Python
-   FastAPI
-   Uvicorn
-   Pydantic
-   WebSocket

### Kamera

-   gPhoto2
-   libgphoto2

### Pemrosesan gambar

-   Pillow

### Database dan storage

-   SQLite
-   SSD lokal
-   SQLAlchemy (opsional)

### Printing

-   CUPS
-   Driver printer yang kompatibel

### Sistem operasi

-   Ubuntu Server 24.04 LTS

### Pengujian dan operasi

-   pytest
-   Playwright
-   Postman atau Bruno
-   systemd
-   journalctl

------------------------------------------------------------------------

## 5. Rancangan API Awal

  Method   Endpoint            Fungsi
  -------- ------------------- ---------------------------
  GET      `/camera/status`    Memeriksa status kamera
  POST     `/camera/capture`   Mengambil foto
  POST     `/session/start`    Memulai sesi
  GET      `/session/{id}`     Mengambil detail sesi
  POST     `/image/process`    Memproses foto
  POST     `/print`            Mengirim hasil ke printer
  GET      `/printer/status`   Memeriksa status printer

Endpoint ini adalah rancangan awal dan dapat berubah ketika implementasi
berkembang.

------------------------------------------------------------------------

## 6. Rancangan Database Awal

Database lokal awal menggunakan SQLite.

### Sessions

-   `id`
-   `status`
-   `started_at`
-   `completed_at`
-   `template_id`

### Photos

-   `id`
-   `session_id`
-   `original_path`
-   `processed_path`
-   `created_at`

### Print Jobs

-   `id`
-   `session_id`
-   `photo_id`
-   `status`
-   `created_at`
-   `completed_at`

------------------------------------------------------------------------

## 7. Jaringan

-   iPad terhubung ke Wi-Fi lokal.
-   Mini PC/VM terhubung ke jaringan yang sama, idealnya Ethernet untuk
    produksi.
-   iPad mengakses frontend melalui IP lokal Mini PC.
-   Frontend berkomunikasi dengan FastAPI.
-   Kamera dan printer terhubung ke Mini PC.
-   Bridged Adapter pada VirtualBox memungkinkan perangkat lain di LAN,
    termasuk iPad, mengakses VM.

Internet tidak wajib untuk capture, pemrosesan gambar, dan printing
lokal. Internet diperlukan untuk fitur seperti QRIS online, cloud
upload, atau sinkronisasi.

------------------------------------------------------------------------

## 8. Struktur Folder Project

Struktur awal yang diusulkan:

``` text
photobooth-system/
│
├── system-doc.md
├── tools.md
├── README.md
├── .gitignore
├── .env.example
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   │       ├── camera/
│   │       ├── session/
│   │       ├── image/
│   │       ├── printer/
│   │       └── storage/
│   │
│   ├── tests/
│   └── requirements.txt
│
├── storage/
│   ├── captures/
│   ├── processed/
│   ├── thumbnails/
│   └── exports/
│
├── templates/
│   ├── layouts/
│   └── assets/
│
├── database/
│   └── migrations/
│
├── deployment/
│   ├── virtualbox/
│   ├── scripts/
│   └── docker/
│
├── docs/
│   ├── api-doc.md
│   ├── database-schema.md
│   ├── camera-integration.md
│   ├── printer-integration.md
│   └── troubleshooting.md
│
└── tests/
    ├── integration/
    └── simulation/
```

Struktur dapat disesuaikan saat implementasi. Folder `storage/`
sebaiknya tidak dimasukkan ke Git jika berisi foto hasil sesi; gunakan
`.gitignore` dan simpan hanya placeholder bila diperlukan.

------------------------------------------------------------------------

## 9. Dokumen Project

### `system-doc.md`

Dokumentasi menyeluruh yang menjadi sumber utama rancangan sistem.
Isinya: - Project overview dan tujuan. - Arsitektur sistem dan
diagram. - Komponen hardware/software. - Alur kerja pengguna. - Modul
aplikasi. - State machine sesi. - Rancangan API. - Rancangan database. -
Jaringan. - Keamanan dan penanganan error. - Roadmap pengembangan. -
Keputusan arsitektur dan perubahan desain.

### `tools.md`

Inventaris semua alat dan teknologi yang dipakai. Isinya: - Development
environment. - Frontend tools. - Backend tools. - Camera integration
tools. - Image processing tools. - Database dan storage. - Printing. -
Testing dan monitoring. - Hardware inventory. - Versi aktual setiap
software. - Catatan instalasi dan konfigurasi.

### Dokumen pendukung di `docs/`

  File                       Fungsi
  -------------------------- ---------------------------------------------
  `api-doc.md`               Detail endpoint dan format request/response
  `database-schema.md`       Tabel, relasi, dan migrasi database
  `camera-integration.md`    Integrasi EOS 700D
  `printer-integration.md`   Integrasi printer
  `troubleshooting.md`       Catatan masalah dan solusi

### `README.md`

Berisi ringkasan project, prasyarat, cara instalasi, cara menjalankan
frontend/backend, dan tautan ke dokumentasi utama.

------------------------------------------------------------------------

## 10. Roadmap Pengembangan

### Phase 1 --- Environment Setup

-   [ ] Install VirtualBox.
-   [ ] Buat Ubuntu Server VM.
-   [ ] Konfigurasi jaringan Bridged.
-   [ ] Konfigurasi USB passthrough.
-   [ ] Buat repository dan dokumentasi awal.

### Phase 2 --- Camera Integration

-   [ ] Install gPhoto2.
-   [ ] Deteksi EOS 700D.
-   [ ] Uji capture.
-   [ ] Uji transfer foto.
-   [ ] Implementasi camera service.
-   [ ] Implementasi mode simulasi.

### Phase 3 --- Backend

-   [ ] Inisialisasi FastAPI.
-   [ ] Implementasi session manager.
-   [ ] Implementasi camera API.
-   [ ] Implementasi storage service.
-   [ ] Implementasi WebSocket untuk status.

### Phase 4 --- Frontend

-   [ ] Inisialisasi Next.js.
-   [ ] Membuat UI kiosk.
-   [ ] Integrasi API.
-   [ ] Implementasi alur sesi.
-   [ ] Optimasi touchscreen iPad.

### Phase 5 --- Image Processing

-   [ ] Implementasi crop dan resize.
-   [ ] Implementasi komposisi foto.
-   [ ] Implementasi template.
-   [ ] Membuat hasil final dan thumbnail.

### Phase 6 --- Printer Integration

-   [ ] Install CUPS.
-   [ ] Konfigurasi driver.
-   [ ] Implementasi print service.
-   [ ] Uji cetak otomatis.

### Phase 7 --- Production Preparation

-   [ ] Error handling dan recovery.
-   [ ] Autostart service.
-   [ ] Storage cleanup.
-   [ ] Backup.
-   [ ] UPS dan power management.
-   [ ] Uji Mini PC fisik.
-   [ ] Uji operasional jangka panjang.

------------------------------------------------------------------------

## 11. Inventaris Tools

  Kategori          Tool                      Fungsi                      Status
  ----------------- ------------------------- --------------------------- --------------
  Virtualisasi      VirtualBox                VM development              Direncanakan
  OS                Ubuntu Server 24.04 LTS   Local server                Direncanakan
  Editor            Visual Studio Code        Code editor                 Direncanakan
  Version control   Git                       Version control             Direncanakan
  Frontend          Node.js                   Runtime JavaScript          Direncanakan
  Frontend          pnpm                      Package manager             Direncanakan
  Frontend          Next.js                   Framework                   Direncanakan
  Frontend          React                     UI library                  Direncanakan
  Frontend          TypeScript                Static typing               Direncanakan
  Frontend          Tailwind CSS              Styling                     Direncanakan
  Backend           Python                    Bahasa backend              Direncanakan
  Backend           FastAPI                   REST API                    Direncanakan
  Backend           Uvicorn                   ASGI server                 Direncanakan
  Backend           Pydantic                  Validasi data               Direncanakan
  Camera            gPhoto2                   Kontrol kamera              Direncanakan
  Camera            libgphoto2                Library komunikasi kamera   Direncanakan
  Image             Pillow                    Pemrosesan gambar           Direncanakan
  Database          SQLite                    Metadata lokal              Direncanakan
  Printing          CUPS                      Print management            Direncanakan
  Testing           pytest                    Backend testing             Direncanakan
  Testing           Playwright                Frontend testing            Direncanakan
  Operations        systemd                   Service management          Direncanakan
  Operations        journalctl                Log inspection              Direncanakan

Versi aktual harus dicatat setelah software benar-benar diinstal dan
diverifikasi. Jangan mengisi versi berdasarkan perkiraan.

------------------------------------------------------------------------

## 12. Hal yang Belum Diputuskan

-   Model dan spesifikasi printer foto.
-   Ukuran dan jenis kertas foto.
-   Jumlah foto per sesi.
-   Apakah pengguna dapat memilih foto sebelum mencetak.
-   Apakah pembayaran/QRIS dibutuhkan.
-   Apakah foto dibagikan melalui QR code atau cloud.
-   Kebijakan retensi dan penghapusan foto.
-   Apakah Live View diperlukan pada UI iPad.
-   Spesifikasi final Mini PC.
-   Strategi deployment: native services atau Docker.

------------------------------------------------------------------------

## 13. Prinsip Pemeliharaan Dokumentasi

-   Perubahan arsitektur diperbarui di `system-doc.md`.
-   Perubahan teknologi, library, perangkat, atau versi diperbarui di
    `tools.md`.
-   Instruksi teknis yang rinci diletakkan pada dokumen terkait di
    `docs/`.
-   Catat keputusan penting beserta alasan dan tanggalnya.
-   Bedakan status `Planned`, `Installed`, `Tested`, dan `Production`.
-   Jangan menyatakan perangkat kompatibel atau berhasil sebelum
    pengujian nyata dilakukan.

## 14. Langkah Berikutnya

Fokus pertama adalah menyiapkan Ubuntu Server VM dan menguji USB
passthrough Canon EOS 700D. Kriteria selesai tahap awal:

1.  Ubuntu mendeteksi kamera melalui `gphoto2 --auto-detect`.
2.  Kamera berhasil mengambil satu foto.
3.  File hasil foto berhasil diunduh ke VM.
4.  Foto dapat dibuka dari filesystem Ubuntu.

Setelah kriteria tersebut tercapai, lanjutkan implementasi camera
service dan API.
