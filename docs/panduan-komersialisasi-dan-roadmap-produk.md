# Blueprint Komersialisasi & Evaluasi Kesiapan Produk: Dryu Photobooth (Sweet Studio) 🚀

> **Dokumen Strategi Produk, Audit Kode, & Roadmap Menuju Software Siap Jual (Commercial-Grade Kiosk)**  
> Tanggal: 8 November 2026 | Versi: 1.0.0  
> Target Pasar: Vendor Photobooth Event/Wedding, Kafe & Mall Unattended Kiosk, Rental Photobooth Studio.

---

## 1. Executive Summary & Audit Skor Kesiapan Produk

Berdasarkan audit mendalam terhadap seluruh arsitektur kode (*frontend*, *backend*, *database*, *hardware driver*, dan *UI/UX*), sistem **Dryu Photobooth (Sweet Studio)** saat ini berada pada tahap **Late Beta / Production Candidate (Skor Kesiapan Komersial: 82/100)**.

### Radar Penilaian Kesiapan:

| Dimensi Produk | Skor | Status Saat Ini | Syarat Menuju Komersial 100% |
| :--- | :---: | :--- | :--- |
| **UI/UX & Desain Kiosk** | **95/100** | Sangat matang, ramah pengguna, gaya visual *Sweet Studio* pastel modern setara LumaBooth. | Tinggal menambahkan kustomisasi branding & tema per event. |
| **Kamera & Image Pipeline** | **90/100** | Multi-driver (gPhoto2, Sony Wi-Fi, UVC), rendering 300 DPI, Boomerang GIF, filter non-destructive. | Optimalisasi auto-focus timeout & profil warna printer ICC. |
| **AI Facial Recognition & AR** | **88/100** | MediaPipe Face Mesh, dynamic sticker placement, inherit color grading. | Tambahan variasi stiker musiman (Christmas, Halloween, Wedding). |
| **Stabilitas & Arsitektur** | **85/100** | FastAPI async, SQLite, WebSockets live state, Dockerized setup, disk monitor. | Automated error-recovery jika kamera terputus di tengah sesi. |
| **Keamanan & Kiosk Lockdown** | **65/100** | Diagnostic modal tersembunyi tersedia. | Wajib proteksi PIN 4-digit di `/admin` dan kiosk browser lock (anti-F11/Ctrl+W). |
| **Monetisasi & Self-Service** | **60/100** | Modal QRIS & voucher tersedia secara simulasi. | Integrasi gateway pembayaran nyata (Midtrans / Xendit / Tripay QRIS). |
| **Pengiriman Tamu Offline (QR)** | **65/100** | QR dialog & sharing page tersedia. | Fitur Wi-Fi Local Hotspot Captive Portal untuk venue tanpa internet. |
| **Packaging & Distribusi** | **55/100** | Docker Compose & manual script. | Butuh *Turnkey Image* untuk STB/Pi & *1-Click Windows Installer* (.exe). |
| **Sistem Lisensi & Proteksi HAKI**| **40/100** | Source code terbuka (belum ada DRM). | Machine-ID Hardware Lock / Dongle USB / License Key System. |

---

## 2. Analisis Keunggulan Kompetitif (Selling Points)

Sebelum menjual ke pasar, kenali keunggulan unik sistem ini dibandingkan kompetitor (seperti Dslrbooth, Breeze, Touchpix, LumaBooth):

1. **Efisiensi Biaya Perangkat Ekstrem (Armbian STB Support)**:
   - Kompetitor mewajibkan Mini PC Intel Core i5 seharga Rp 5–8 juta atau iPad Pro mahal.
   - Sistem ini bisa berjalan di **STB Android bekas seharga Rp 150–250 ribu** yang di-flash Armbian Linux, memangkas modal awal vendor hingga 80%.
2. **Dukungan Kamera Hybrid (USB DSLR + Sony Wi-Fi)**:
   - Mendukung Canon EOS jadul (seperti 700D/1200D via USB gPhoto2) hingga mirrorless Sony Alpha terbaru via Wi-Fi nirkabel tanpa kabel menjuntai.
3. **AI AR Face Tracking Tanpa GPU Dedicated**:
   - MediaPipe Face Mesh berjalan sangat ringan di CPU ARM64, memberikan efek stiker interaktif tanpa lag.
4. **All-in-One Format Output**:
   - Sekali jepret menghasilkan: Cetak Photostrip 300 DPI + Live Filter + File Digital Resolusi Penuh + **Animated Boomerang GIF**.

---

## 3. Roadmap Penyempurnaan Fitur (The 5 Pillars to Commercial Launch)

---

### Pilar 1: Keamanan & Operator Kiosk Lockdown (Wajib Sebelum Dijual)

Pengunjung umum (terutama anak-anak di mall/event) akan menekan semua area layar sentuh. Kiosk harus anti-iseng:

1. **PIN Lockout untuk Admin & Diagnostik**:
   - Kunci tombol setting dan URL `/admin` dengan **PIN 4-Digit** (default: `1234`, dapat diganti pemilik booth).
   - Jika ditekan 5 kali salah, kunci akses selama 60 detik.
2. **Kiosk Browser Lockdown**:
   - Matikan klik kanan (*context menu*), shortcut keyboard (`F11`, `F12`, `Ctrl+W`, `Ctrl+Shift+I`, `Alt+F4`).
   - Sediakan skrip peluncur (*launcher script*) untuk Windows & Linux yang otomatis membuka browser Chromium dalam mode `--kiosk --noerrdialogs --disable-translate --disable-features=TranslateUI`.
3. **Hardware Watchdog (Auto-Recover dari Crash)**:
   - Jika kabel kamera tersenggol dan terlepas di tengah sesi, sistem tidak boleh *blank*. Tampilkan layar ramah: *"Oops, kamera sedang dihubungkan kembali oleh operator... Mohon tunggu sebentar ♡"*, dan backend otomatis memanggil `connect()` ulang.

---

### Pilar 2: Multi-Tenant & Event Profile Management

Vendor photobooth menyewakan alat untuk berbagai klien berbeda dalam seminggu. Mereka butuh ganti tema tanpa edit kodingan.

1. **Fitur "Event Manager" di Dashboard Admin**:
   - Operator bisa membuat profil event:
     - Nama Event: *"Wedding Rian & Siska"* / *"Sweet 17 Jessica"*
     - Tanggal Event & Lokasi
     - Logo Watermark Acara (Upload PNG transparan)
     - Warna Dasar Tema Kiosk (Custom HEX Color / Preset Pink, Gold, Midnight, Clean White)
     - Pilihan Template yang Ditampilkan (Pilih hanya template 3-Pose dan 4-Pose)
     - Teks Footer Bawaan Photostrip (misal: *"Happy Wedding Rian & Siska • 12.12.2026"*)
     - Mode Booth: **Event Gratis (Free/All-Inclusive)** atau **Komersial Bayar (Paid Session)**.
2. **Penyimpanan Terisolasi per Event**:
   - Folder penyimpanan otomatis dikelompokkan: `storage/events/{event_slug}/`.
   - Di akhir event, vendor cukup klik tombol **"Download Semua Foto Event (ZIP)"** atau **"Kirim ke Google Drive Pengantin"**.

---

### Pilar 3: Monetisasi Nyata (Unattended Self-Service Booth)

Jika ingin menjual ke kafe, mall, bioskop, atau arcade zone tanpa perlu ada karyawan yang menjaga:

1. **Integrasi QRIS Otomatis (Dynamic QRIS Gateway)**:
   - Integrasikan API Payment Gateway Indonesia: **Midtrans / Xendit / Tripay**.
   - Alur Pengunjung:
     1. Pengunjung sentuh layar: *"Mulai Foto"* -> Pilih Frame.
     2. Muncul QRIS Dinamis sebesar Rp 25.000 (dengan masa berlaku 120 detik).
     3. Begitu pengunjung scan via BCA Mobile / GoPay / OVO / ShopeePay, webhook gateway memberi notifikasi ke backend FastAPI.
     4. Layar otomatis terbuka ke kamera (*Countdown*) secara instan.
2. **Dukungan Cash/Bill Acceptor (Uang Kertas)**:
   - Dukungan mesin penerima uang kertas (seperti ICT A6/P70) via interface USB-to-Serial / GPIO pulsa untuk kiosk fisik tanpa kasir.

---

### Pilar 4: Distribusi Foto Offline (Zero-Internet Venue Support)

Banyak gedung pernikahan dan basement mall tidak memiliki sinyal HP atau Wi-Fi publik. Tamu tetap harus bisa mengambil foto digital mereka!

1. **Mode Local Wi-Fi Hotspot (Captive Portal)**:
   - STB atau Mini PC mengaktifkan Wi-Fi Access Point bawaan: `SweetStudio-FreePhoto`.
   - Tamu menyambungkan HP ke Wi-Fi tersebut (tanpa password).
   - Begitu terhubung, HP tamu langsung membuka halaman web lokal (*Captive Portal*) atau tamu memindai QR Code di layar kiosk:
     `http://192.168.4.1:8000/share/{session_id}`
   - Tamu bisa mengunduh foto full HD dan Boomerang GIF secara instan tanpa kuota internet!
2. **Mode Cloud Sync (Saat Online)**:
   - Jika tersedia koneksi internet, sistem otomatis mengunggah foto ke Cloud Storage (AWS S3, Cloudinary, atau Google Drive) dan QR Code mengarah ke URL publik.

---

### Pilar 5: Perlindungan HAKI & Sistem Lisensi Software (Commercial DRM)

Jika software ini hendak dijual ke vendor lain (paket software-only), cegah pembajakan:

1. **Hardware ID (HWID) Machine Locking**:
   - Backend membaca kombinasi hardware unik perangkat: Serial Number Motherboard/CPU + MAC Address LAN.
   - Menghasilkan string kode mesin: misal `DRYU-8F2A-99B1-402E`.
2. **License Key Generator (Asymmetric RSA Encryption)**:
   - Pemilik software (Anda) memegang *Private Key* untuk meng-generate lisensi.
   - Software klien memegang *Public Key* untuk memvalidasi lisensi secara offline.
   - Jenis Lisensi:
     - **Lifetime Dongle**: Lisensi permanen untuk 1 mesin.
     - **SaaS Bulanan / Tahunan**: Lisensi yang memiliki tanggal kedaluwarsa.
     - **Pay-Per-Event (Sewa per Hari)**: Lisensi aktif hanya untuk tanggal event yang ditentukan.

---

## 4. Packaging Produk & Model Bisnis Penjualan

### 4.1 Opsi Packaging Distribusi

1. **Produk A: "Plug & Play Kiosk Box" (Hardware + Software Turnkey)**:
   - Jual satu paket fisik: STB HG680-P casing custom akrilik + Adaptor daya + Powered USB Hub + MicroSD 64GB terpasang Armbian & Dryu Photobooth.
   - Pembeli tinggal colok kabel kamera Canon/Sony, colok printer, dan buka layar di iPad.
   - **Harga Jual Pasar Indonesia:** Rp 1.500.000 – Rp 2.500.000 per unit (margin profit sangat tinggi karena modal STB murah).
2. **Produk B: "Software License Only" (Untuk Pemilik Mini PC / Laptop Windows)**:
   - Dikemas dalam installer satu klik Windows `.exe` (menggunakan Inno Setup atau Electron).
   - **Harga Jual:** Rp 800.000 – Rp 1.500.000 (Lisensi seumur hidup per laptop) atau langganan Rp 150.000/bulan.

---

## 5. Rangkuman Langkah Tindakan Segera (Action Plan)

1. [x] **Audit & Dokumentasi Kesiapan Produk** (Selesai pada dokumen ini).
2. [ ] **Implementasi Kiosk Lockdown & PIN Admin** (Amankan `/admin` dan cegah keluar aplikasi).
3. [ ] **Implementasi Event Profile Manager** (Ganti logo, nama pengantin, dan template tanpa edit kodingan).
4. [ ] **Integrasi Gateway QRIS Dinamis (Midtrans/Tripay)** untuk mode mandiri.
5. [ ] **Skrip Hotspot Wi-Fi Lokal STB** untuk unduh foto tanpa internet di lokasi acara.
6. [ ] **Sistem Lisensi Hardware ID (HWID)** untuk proteksi hak cipta software.