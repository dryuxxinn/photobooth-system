# Panduan Deployment: Armbian Linux pada STB ZTE HG680-P (Amlogic S905X) 📦

> **Panduan Teknis Instalasi & Optimalisasi Dryu Photobooth (Sweet Studio)**  
> Target Perangkat: ZTE ZXV10 HG680-P (Amlogic S905X Quad-Core Cortex-A53, 2GB RAM, 8GB eMMC)  
> Terakhir Diperbarui: 8 November 2026 | Status: Teruji & Didukung  
> Rujukan Utama: [`docs/setup.md`](setup.md) & [`docs/DOCKER.md`](DOCKER.md)

---

## 1. Ringkasan & Kelayakan Teknis (Feasibility Assessment)

**Pertanyaan:** *Bisakah Dryu Photobooth dideploy ke STB HG680-P dengan Armbian?*  
**Jawaban:** **BISA dan SANGAT MEMUNGKINKAN**, dengan efisiensi biaya perangkat yang sangat tinggi.

STB ZTE HG680-P menggunakan SoC **Amlogic S905X** (arsitektur 64-bit `aarch64`) dengan RAM 2 GB. Konfigurasi ini lebih dari cukup untuk menjalankan backend Python FastAPI, libgphoto2 (Canon EOS / Sony), dan web server Kiosk dalam mode *Headless Server*.

### Matriks Kelayakan Komponen:

| Komponen | Kebutuhan Sistem | Status di STB HG680-P | Catatan Teknis |
| :--- | :--- | :---: | :--- |
| **Arsitektur CPU** | `x86_64` atau `aarch64` | **Lolos (`arm64`)** | Amlogic S905X adalah ARMv8 Cortex-A53 64-bit. |
| **Kapasitas RAM** | Minimal 1.5 GB | **Lolos (2 GB DDR3)** | OS Headless memakan ~150 MB, Backend ~250 MB, Node.js ~120 MB. Sisa RAM > 1.4 GB. |
| **Penyimpanan** | Minimal 16 GB | **Perlu Tambahan MicroSD/USB** | Internal eMMC 8 GB terlalu sempit untuk OS + Docker + foto. Gunakan MicroSD minimal 32 GB. |
| **libgphoto2** | Pengendali kamera Canon/Sony | **Lolos (APT Repo)** | Tersedia resmi di repo Debian/Ubuntu ARM64 (`apt install gphoto2`). |
| **MediaPipe AI** | Deteksi wajah stiker AR | **Lolos (PyPI ARM64)** | Tersedia wheel resmi `manylinux_2_28_aarch64`. Waktu inferensi ~400–700ms. |
| **Koneksi USB** | Kamera DSLR + Printer | **Lolos (2x USB 2.0)** | Sangat disarankan memakai **Powered USB Hub** agar pasokan daya kamera/printer stabil. |

---

## 2. Arsitektur Deployment yang Direkomendasikan

### Mode A (Paling Disarankan): STB sebagai Headless Server + iPad/Tablet sebagai Layar Kiosk

```text
┌──────────────────────┐         USB 2.0          ┌───────────────────────────┐
│ Kamera Canon EOS 700D│ ──────────────────────── │   STB HG680-P (Armbian)   │
└──────────────────────┘                          │  - OS: Armbian Headless   │
                                                  │  - Backend: FastAPI :8000 │
┌──────────────────────┐         USB 2.0          │  - Frontend: Next.js :3000│
│  Printer Photobooth  │ ──────────────────────── │  - Storage: MicroSD 64 GB │
└──────────────────────┘                          └─────────────┬─────────────┘
                                                                │ Wi-Fi / LAN
                                                                ▼
                                                  ┌───────────────────────────┐
                                                  │ iPad / Tablet Kiosk (PWA) │
                                                  │ Buka http://192.168.x:3000│
                                                  └───────────────────────────┘
```

**Keuntungan Mode A:**
- STB tidak terbebani rendering grafis browser (menghemat 500–700 MB RAM dan 50% CPU).
- Layar sentuh iPad sangat responsif, tajam, dan elegan untuk pengunjung booth.

---

## 3. Langkah-Langkah Persiapan Sistem (OS Armbian)

### 3.1 Pemasangan Armbian pada HG680-P
1. Unduh image Armbian Amlogic S905X (disarankan varian **Debian 12 Bookworm Minimal** atau **Ubuntu 22.04 Jammy Server** berarsitektur `arm64`).
2. Flash image ke MicroSD (minimal 32 GB Class 10 A1/A2) menggunakan BalenaEtcher atau Rufus.
3. Atur Device Tree (DTB) pada `uEnv.txt` atau `extlinux.conf` sesuai chipset HG680-P:
   ```text
   FDT=/dtb/amlogic/meson-gxl-s905x-p212.dtb
   ```
4. Masukkan MicroSD ke STB, colokkan kabel LAN dan daya, lalu masuk via SSH (`root:1234`).

### 3.2 Konfigurasi Swap & zRAM (Wajib untuk 2GB RAM)
Untuk mencegah *Out-of-Memory (OOM)* saat merender photostrip 300 DPI:
```bash
# 1. Pastikan zRAM aktif (otomatis terpasang di Armbian modern)
zramctl

# 2. Tambahkan Swap file 2 GB pada penyimpanan MicroSD
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3.3 Instalasi Dependensi Dasar
```bash
sudo apt update && sudo apt install -y \
    curl git htop udev \
    python3 python3-pip python3-venv \
    gphoto2 libgphoto2-dev \
    libjpeg-dev zlib1g-dev libpng-dev
```

---

## 4. Strategi Build & Deployment Aplikasi

> [!WARNING]
> **JANGAN menjalankan `npm run build` langsung di STB HG680-P!**  
> Proses kompilasi Next.js memakan memori > 2 GB dan CPU tinggi sehingga STB bisa *freeze* atau terkena *OOM-Killer*.  
> **Lakukan build di Laptop/PC**, lalu transfer hasil build ke STB.

### 4.1 Opsi 1: Menggunakan Docker (Direkomendasikan)
Gunakan fitur Docker Buildx di PC development untuk mem-build image arsitektur `linux/arm64`:

```bash
# Di PC Development (Windows/Linux/Mac):
docker buildx build --platform linux/arm64 -t dryu-booth-backend:arm64 -f backend/Dockerfile . --load
docker buildx build --platform linux/arm64 -t dryu-booth-frontend:arm64 -f frontend/Dockerfile . --load

# Simpan image ke file tar:
docker save dryu-booth-backend:arm64 | gzip > backend_arm64.tar.gz
docker save dryu-booth-frontend:arm64 | gzip > frontend_arm64.tar.gz

# Kirim ke STB HG680-P via SCP:
scp backend_arm64.tar.gz frontend_arm64.tar.gz root@192.168.1.100:/root/

# Di dalam STB HG680-P:
docker load < backend_arm64.tar.gz
docker load < frontend_arm64.tar.gz
docker compose up -d
```

### 4.2 Opsi 2: Bare-Metal (Paling Hemat Sumber Daya / Non-Docker)
Jika ingin performa maksimal tanpa overhead virtualisasi Docker:

#### A. Backend (Python Virtualenv)
```bash
cd /opt/dryu-booth
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Menjalankan Backend:
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

#### B. Frontend (Node.js Standalone Runner)
Di PC Anda:
```bash
cd frontend
npm run build
# Copy folder .next/standalone, .next/static, dan public ke STB:
scp -r .next/standalone .next/static public root@192.168.1.100:/opt/dryu-booth/frontend-dist/
```
Di dalam STB HG680-P:
```bash
cd /opt/dryu-booth/frontend-dist
# Install Node.js 20 LTS ARM64 di Armbian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Jalankan standalone server:
PORT=3000 node server.js
```

---

## 5. Tips Hardware & Kelistrikan Penting untuk HG680-P

1. **Gunakan Powered USB Hub (Wajib)**:
   - Port USB internal HG680-P hanya menyuplai daya ~500mA pada 5V.
   - Kamera Canon EOS 700D dan USB Capture Card saat proses inisialisasi shutter dapat memicu lonjakan arus (*voltage drop*) yang membuat STB me-restart sendiri jika tidak menggunakan USB Hub bertenaga adaptor tersendiri.
2. **Pendingin Suhu (Heatsink / Kipas Kecil)**:
   - STB HG680-P aslinya tertutup casing plastik rapat.
   - Tambahkan heatsink aluminium yang lebih besar atau kipas mini 5V USB di atas casing agar suhu SoC S905X tetap di bawah 60°C saat sesi foto maraton (misal event pernikahan 4 jam non-stop).

---

## 6. Strategi Manajemen Penyimpanan & Mitigasi SD Card Penuh (Storage Strategy) 💾

Kekhawatiran umum saat menggunakan MicroSD 64 GB adalah file foto kamera DSLR yang berukuran besar. Berikut adalah arsitektur dan strategi mitigasi standar industri photobooth agar sistem **tidak pernah kehabisan ruang disk**:

### 6.1 Matematika Kapasitas Nyata (Berapa Sesi yang Ditampung?)

Kapasitas bersih MicroSD 64 GB yang dapat digunakan untuk foto (setelah dipotong OS Armbian & Docker ~10 GB) adalah **± 50 GB (50.000 MB)**.

| Format & Kualitas Kamera | Ukuran per Foto | 1 Sesi (6 Pose + Cetak + GIF) | Estimasi Total Sesi di 50 GB | Keterangan & Rekomendasi |
| :--- | :---: | :---: | :---: | :--- |
| **RAW (Canon CR2 / Sony ARW)** | ~28 MB | ~175 MB | **± 285 sesi** | ❌ **Sangat Dilarang**: Tidak ada gunanya untuk photobooth, boros memori & CPU. |
| **JPEG Large / Fine (18-24 MP)** | ~6–8 MB | ~45 MB | **± 1.110 sesi** | ⚠️ **Cukup**: Bagus untuk arsip, namun melebihi resolusi cetak lab. |
| **JPEG Medium / Normal (8–10 MP)** | ~2.5–3 MB | ~18 MB | **± 2.770 sesi** | ✅ **Sangat Direkomendasikan**: Standar industri photobooth. |

> [!NOTE]
> **Fakta Kebutuhan Cetak Foto:**
> - Kertas cetak Photostrip 2x6 inci @ 300 DPI hanya membutuhkan resolusi **600 x 1800 piksel** (1.08 Megapixel).
> - Kertas cetak 4R (4x6 inci) @ 300 DPI hanya membutuhkan resolusi **1200 x 1800 piksel** (2.16 Megapixel).
> - Menyetel kamera ke **JPEG Medium (sekitar 3000 x 2000 px = 6 MP / 10 MP)** sudah **3x lebih tajam** daripada resolusi maksimum printer sublimasi/thermal, tetapi ukuran filenya terpangkas hingga 60%!
> - Rata-rata event pernikahan melayani 150–350 sesi. Dengan JPEG Medium, 50 GB sanggup menampung hingga **7–10 event berturut-turut tanpa dihapus**.

---

### 6.2 Arsitektur Penyimpanan Eksternal: Mount USB Flashdisk / SSD (Paling Disarankan)

Untuk menjaga keawetan MicroSD OS dari siklus tulis (*write-cycles*) dan memudahkan serah terima foto ke klien/pengantin:

1. **Jadikan MicroSD khusus OS & Aplikasi** (read-mostly).
2. **Colokkan Flashdisk USB 128 GB / 256 GB atau SSD Portabel** ke STB (melalui Powered USB Hub).
3. **Mount USB Drive langsung ke folder `storage/`**:
   ```bash
   # Format Flashdisk (misal di /dev/sda1) ke ext4 atau exFAT
   sudo mkfs.ext4 -L PHOTO_STORAGE /dev/sda1

   # Buat direktori mount dan pasang otomatis di /etc/fstab:
   sudo mkdir -p /opt/dryu-booth/storage
   echo "LABEL=PHOTO_STORAGE /opt/dryu-booth/storage ext4 defaults,noatime,nodiratime 0 2" | sudo tee -a /etc/fstab
   sudo mount -a
   ```
4. **Keuntungan Luar Biasa di Lapangan:**
   - Saat pesta selesai di malam hari, operator tinggal melakukan `sudo umount /opt/dryu-booth/storage`, cabut flashdisk, dan serahkan langsung ke pengantin atau salin ke laptop vendor. Tidak perlu menunggu download via Wi-Fi berjam-jam!

---

### 6.3 Perlindungan Sistem Otomatis (Low-Storage Safeguard)

Backend FastAPI Dryu Photobooth memantau kapasitas penyimpanan secara *real-time* melalui `shutil.disk_usage(settings.STORAGE_DIR)` pada endpoint `/health`:
- Jika sisa penyimpanan **< 2 GB (atau terpakai > 90%)**:
  1. Status readiness di Kiosk menampilkan peringatan visual ke operator.
  2. Sistem mengaktifkan mode pembersihan otomatis (*Auto-Purge*): foto-foto mentah sesi lampau yang **tidak dipilih** oleh tamu (misal pose ke-5 dan ke-6 yang batal dicetak) otomatis dibersihkan lebih dahulu untuk melegakan ruang disk.

---

### 6.4 Sinkronisasi Cloud Otomatis (Opsional: Rclone Google Drive / S3)

Jika venue event memiliki koneksi Wi-Fi/Internet:
1. Pasang `rclone`:
   ```bash
   sudo apt install -y rclone
   rclone config # Sambungkan ke Google Drive event
   ```
2. Jalankan background sync tiap 10 menit via cron job:
   ```bash
   */10 * * * * rclone sync /opt/dryu-booth/storage/processed gdrive:SweetStudio/EventToday/ --fast-list
   ```
   Tamu dapat langsung mengakses link Google Drive / QR Code detik itu juga, dan STB dapat menghapus file lokal lama secara terjadwal.

---

## 7. Kesimpulan & Rekomendasi Akhir

Menggunakan **STB HG680-P Armbian** sebagai server photobooth adalah pilihan yang **sangat ekonomis, stabil, dan cerdas**:
- Menghilangkan kebutuhan membawa PC/Laptop berat ke lokasi event.
- Konsumsi daya sangat hemat (< 8 Watt), dapat ditenagai baterai/UPS cadangan.
- Kecepatan pemrosesan foto dan integrasi kamera gPhoto2 / MediaPipe AI berjalan lancar berkat arsitektur 64-bit Cortex-A53 dan RAM 2 GB.
