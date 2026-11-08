# Spesifikasi UI/UX: Ready Screen v2.0 (Persiapan Sebelum Foto) 🎀

> **Dokumen Spesifikasi Desain & Interaksi Sistem Kiosk Sweet Studio**  
> Versi: 2.0 (Final Approved Baseline) | Terakhir Diperbarui: 6 November 2026  
> Rujukan Utama: [`docs/rancangan_ui_ux_photobooth.md`](rancangan_ui_ux_photobooth.md) & [`docs/system-doc.md`](../system-doc.md)

---

## 1. Ringkasan, Tujuan & Standarisasi Istilah UX

Halaman **Ready Screen (Persiapan Sebelum Foto)** adalah gerbang utama sebelum sesi pemotretan interaktif dimulai. Pengunjung datang dari *Welcome Screen* atau *Payment Gate* dengan ekspektasi pengalaman yang menyenangkan, cepat, dan mandiri (*unattended self-service*).

### 1.1 Standarisasi Tiga Istilah Alur Foto (Menghilangkan Kebingungan Pengguna)
Untuk menghilangkan kebingungan antara jumlah foto yang diambil dan jumlah foto yang dicetak, seluruh teks dan badge pada sistem wajib menggunakan diferensiasi istilah berikut:

| Istilah UX | Makna Teknis Sistem | Tampilan pada Antarmuka (Copywriting) |
| :--- | :--- | :--- |
| **Jumlah Pengambilan** | Berapa kali kamera memotret secara otomatis dalam satu sesi. | Selalu **6 Pose Pemotretan** (`Ambil 6 Pose 📸`) |
| **Jumlah Slot Frame** | Berapa foto yang masuk ke dalam desain frame yang dipilih. | **3 Slot Cetak**, **4 Slot Cetak**, atau **2 Slot Cetak** (`3 Slot Foto`) |
| **Jumlah Foto Pilihan** | Berapa foto terbaik yang dipilih tamu setelah pemotretan selesai. | **Pilih 3 Foto Terbaik** dari 6 pose yang sudah diambil |

### 1.2 Tujuan Utama:
1. **Fokus pada Diri Sendiri (Self-Awareness)**: Memberikan area *Live Viewfinder* 3:2 yang dominan agar pengunjung dapat merapikan rambut, pakaian, dan pose sebelum blitz menyala.
2. **Pengambilan Keputusan Cepat (< 15 Detik)**: Memilih desain frame, warna, dan timer tanpa merasa kewalahan oleh jargon teknis.
3. **Mengeliminasi Kebingungan Teknis Kamera**: Menyembunyikan kompleksitas driver/hardware dari pelanggan awam, namun tetap menyediakan akses cepat bagi operator booth.
4. **Validasi Kesiapan Sistem (*Pre-flight Check*)**: Memverifikasi pemisahan status hardware kamera (Canon EOS 700D / Mini PC) dari status stream kiosk di iPad sebelum rangkaian pemotretan dimulai.

---

## 2. Arsitektur Layout & Hierarki Informasi

Layout dirancang optimal untuk layar sentuh lanskap iPad (10.2" / 11" / 12.9") dan layar Kiosk Touchscreen (Full HD / 4K):

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← BACK                   READY, CUTIES? ♡                  RESET 120s       │
│    Stand here and look at the camera • Sesi 6 Pose • Pilih N Foto Terbaik    │
├─────────────────────────────────────────┬────────────────────────────────────┤
│  [ KOLOM KIRI: VIEWPORT & KAMERA (~60%)] │  [ KOLOM KANAN: FRAME & VIBE (~40%)]│
│                                         │                                    │
│  ┌───────────────────────────────────┐  │  ✦ 1. PILIH DESAIN FRAME           │
│  │                                   │  │  ┌──────┐ ┌──────┐                 │
│  │   LIVE CAMERA PREVIEW (3:2)       │  │  │Strip │ │Trio  │ (Thumbnail      │
│  │                                   │  │  │3 Slot│ │4 Slot│  tinggi 140px,  │
│  │   [ Vertical Biometric Oval Guide ]│  │  └──────┘ └──────┘  slot jelas)   │
│  │   [ 4 Corner Focus Reticles [ ] ] │  │                                    │
│  │   "✓ Looking Good! Senyum Manis ♡"│  │  ✦ 2. WARNA FRAME (FLEX-WRAP)      │
│  └───────────────────────────────────┘  │  (● Pink) (○ Cream) (● Lavender)    │
│                                         │  (● Sky)  (● Mint)  (● Dark)       │
│  ┌───────────────────────────────────┐  │                                    │
│  │ ⚙ STATUS KAMERA & KESIAPAN SISTEM │  │  ✦ 3. TIMER COUNTDOWN              │
│  │ [● Live HD • 1080p] [Sistem Siap▾]│  │  [ 1s ]  [ 3s ★ ]  [ 5s ]          │
│  │ [🪞 Cermin: Aktif]  [Opsi Kamera▾]│  │                                    │
│  └───────────────────────────────────┘  │  ✦ 4. NAMA DI FRAME (OPSIONAL)     │
│                                         │  [ Rina & Besties ♡              ] │
│  ┌───────────────────────────────────┐  │  ┌───────────────────────────────┐ │
│  │ ✨ LIVE FILTER (HORIZONTAL PILLS) │  │  │ Pratinjau di Bawah Frame:     │ │
│  │ [Natural★] [Soft Beauty] [B&W]... │  │  │ ✦ RINA & BESTIES ♡ ✦         │ │
│  └───────────────────────────────────┘  │  └───────────────────────────────┘ │
├─────────────────────────────────────────┴────────────────────────────────────┤
│                    [   MULAI FOTO SEKARANG! ♡   ]                            │
│           (6 Pose Pemotretan • Pilih N Foto Terbaik Siap Cetak ✨)           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Komponen & State Machine

### Komponen A: Live Camera Viewport & Vertical Biometric Face Guide
- **Rasio Viewport**: 3:2 konsisten dengan sensor DSLR/Mirrorless (Canon EOS / Sony Alpha) dan Webcam.
- **Biometric Oval Guide**:
  - Berupa oval vertikal ergonomis (`rounded-[50%/42%]`, lebar 52-60 Tailwind units, tinggi 72-80 Tailwind units) yang pas melingkupi dahi, mata, hidung, mulut, hingga dagu.
  - Dilengkapi 4 sudut retikel fokus kamera (`[ ]`) di sekeliling oval.
  - **Larangan Keras**: Tidak ada teks apa pun di dalam area oval yang menutupi wajah pengguna saat berkaca.
- **Dynamic Non-Intrusive Feedback Pill**:
  - Terletak di dasar viewport (`bottom-4`), terpisah dari zona wajah.
  - **State Normal/Pas**: Hijau pastel glow `✓ Looking Good! Senyum Manis ♡` dengan indikator ping hijau.
  - **State Belum Pas**: Latar gelap transparan `✦ Posisikan wajah di dalam garis oval ✦`.

### Komponen B: Pengaturan Kamera Terpadu & Pemisahan Diagnostik Hardware
- **Pemisahan Status Hardware vs Kiosk**:
  - *Tampilan Live Kiosk iPad*: Menampilkan status stream UVC/USB Capture Card langsung di layar iPad.
  - *Hardware Kamera Server (Mini PC)*: Menampilkan status fisik Canon EOS 700D / Sony Alpha yang tersambung ke Mini PC Linux melalui USB gPhoto2/HTTP.
- **Konsolidasi Primary View**:
  - Bar status ringkas: `● Kamera Aktif (Capture Card HD / EOS 700D) • 1080p`
  - Tombol cermin: `🪞 Cermin: Aktif / Mati`
  - Tombol modal kesiapan: `● Sistem Siap ▾`
  - Tombol accordion teknis: `⚙ Opsi Kamera ▾`
- **Accordion Operator (Teknis Lanjutan)**:
  - Toggle sumber kamera (`Kamera Perangkat` vs `Kamera Server`).
  - Pilihan input video ID terdeteksi.
  - Tombol `🔄 Hubungkan Ulang Kamera`.

### Komponen C: Live Filter Bar
- Pilihan filter instan horizontal yang langsung terlihat di layar sebelum memotret:
  - `Natural ✨` (Original RGB)
  - `Soft Beauty 🌸` (Pencerah wajah & kulit lembut tanpa artefak kotak)
  - `B&W Studio 🎞` (Monokrom kontras tinggi ala photobooth Korea)
  - `Vintage Warm ☕` (Sentuhan film analog 90-an)
  - `Cool Tone ❄️` (Tone biru segar modern)
  - `Y2K Pop 🌈` (Warna pop cerah kontras)

### Komponen D: High-Impact Frame Selector
- Ukuran kartu diperbesar menjadi tinggi minimal 140px, tersusun 2 kolom rapi.
- Visual miniatur photostrip dengan slot transparan proporsional (gaya *Chalkak Studio*).
- Menampilkan badge jumlah slot (`3 Slot Cetak`, `4 Slot Cetak`) dan label format (`Strip 2x6"`, `Postcard 4x6"`).
- Kartu aktif memiliki border merah muda tebal (`#F472B6`), bayangan lembut (*sweet shadow*), dan tanda centang `✓`.

### Komponen E: Frame Color Swatches & Live Footer Name Preview
- **Spacious Color Swatches Palette**:
  - Disusun secara `flex-wrap` membungkus ke 2 baris sehingga semua warna tampak jelas tanpa terpotong scrollbar.
  - Lingkaran warna 16px dengan border elegan + nama warna + tanda centang `✓`.
  - Pemilihan warna langsung meng-update miniatur strip di layar secara instan.
- **Live Footer Name Preview**:
  - Di bawah input nama/catatan opsional, terdapat mini box simulasi:
    `✦ {(customerName || "SWEET STUDIO").toUpperCase()} ✦`  
    `a little moment, a lovely memory ♡`
  - Memberi visualisasi nyata bagi pelanggan tentang bagaimana nama mereka akan tercetak di bagian bawah foto.

### Komponen F: Pre-flight System Readiness Modal (Modal Diagnostik Booth)
Sebelum atau saat tombol mulai ditekan, sistem menyediakan modal verifikasi 5 poin:
1. 📱 **Live View Kiosk iPad (UVC)**: `Live Stream HD Aktif (USB Capture Card) ✓`
2. 📷 **Hardware Kamera Server (Mini PC)**: `Canon EOS 700D / Sony Alpha Ready ✓`
3. 🖼 **Konfigurasi Frame Cetak**: `${selectedTemplate.name} • ${selectedTemplate.photos_required} Slot Foto ✓`
4. 💾 **Penyimpanan Lokal Sesi**: `storage/captures & processed Siap ✓`
5. 🖨 **Printer Photobooth**: `DNP / Epson Ready (Siap Cetak / Digital QR) ✓`

### Komponen G: Tombol CTA Bahasa Konsisten & Micro-Interaction
- **Teks**: `MULAI FOTO SEKARANG! ♡`
- **Subteks**: `6 Pose Pemotretan • Pilih N Foto Terbaik ✨`
- **Interaksi**: Memainkan nada *chime* kesiapan ([`playSuccessChime`](../frontend/lib/sound.ts)), mengunci tombol agar tidak terjadi *double-click*, dan bertransisi mulus ke layar countdown sesi foto.
