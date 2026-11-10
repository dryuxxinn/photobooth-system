# Catatan Perubahan Signifikan per Fitur (Changelog Komprehensif)

> Dokumen ini mencatat setiap perubahan signifikan pada sistem **Dryu Photobooth (Sweet Studio)** yang dikelompokkan berdasarkan modul/fitur yang diubah. Dokumen ini diperbarui setiap kali terjadi perubahan fungsional, arsitektural, antarmuka, maupun perbaikan *bug* penting.

---

## 1. Modul Kamera (Hardware Abstraction Layer & Integrasi Wi-Fi)

Dokumen Rujukan: [`docs/camera-integration.md`](camera-integration.md) dan [`docs/fitur-lumabooth-dan-wifi-camera.md`](fitur-lumabooth-dan-wifi-camera.md)

### Perubahan Signifikan:
- **Penambahan Driver `WifiCamera` (`backend/app/services/camera/wifi.py`)**:
  - Implementasi `CameraInterface` yang mendukung protokol `sony_http` (Sony Camera Remote HTTP JSON-RPC API) dan `ptpip` (`gphoto2 --port ptpip:<IP>`).
  - Menghilangkan ketergantungan kabel USB untuk kamera mirrorless Sony (mis. Sony Alpha a6400, a6000, a6500, a7 series).
- **Auto-Discovery Port Sony JSON-RPC (`10000` & `8080`)**:
  - Berdasarkan pengujian fisik pada Sony Alpha a6400 (`ILCE-6400`), firmware kamera membuka port JSON-RPC pada **port `10000`** (bukan `8080` seperti model lawas). Driver otomatis memindai port `10000` dan `8080` saat inisialisasi koneksi.
- **Urutan Pemicu Shutter Wajib Sony a6400**:
  - Mengatasi error `[40400, ""]` pada `actTakePicture` akibat autofocus yang belum terkunci.
  - Alur diperbaiki menjadi: `actHalfPressShutter` (mengunci fokus/metering ~0.35s) -> `actTakePicture` (atau `awaitTakePicture` jika error `40403`) -> `cancelHalfPressShutter` (selalu dipanggil di blok `finally`).
- **Background Liveview Worker (~25 FPS non-stop)**:
  - Membaca stream kontinu `http://192.168.122.1:60152/liveviewstream` di *daemon thread* latar belakang (`_liveview_loop`).
  - Menyediakan *frame* JPEG ~36 KB setiap ~39 ms tanpa memutus koneksi HTTP ke kamera.
  - Dijeda secara aman saat shutter memotret (`_capture_in_progress`) agar tidak terjadi tabrakan *bandwidth* Wi-Fi.
- **Auto-Fallback Simulasi Aman**:
  - Jika kamera Wi-Fi mati/belum tersambung, sistem otomatis menggunakan `SimulatedCamera` agar alur pengujian dan kiosk tidak mogok.
- **Runtime Switching Driver via REST API (`POST /camera/config`)**:
  - Operator dapat berganti antara mode `simulation`, `gphoto` (USB), dan `wifi` (Sony a6400) secara *live* tanpa me-restart server/kontainer.
- **Penyempurnaan `useWebcam.ts` (Browser UVC & Capture Card)**:
  - Menghentikan pemaksaan diam-diam ke `USB Video` kosong.
  - Menambahkan *auto-fallback* kembali ke kamera utama jika device ID yang disimpan tidak merespons.
  - Memperbaiki pemutusan referensi `<video>` pada `attachVideoRef` saat transisi layar.

---

## 2. Modul Pemrosesan Gambar (Image Processing & Templates)

Dokumen Rujukan: [`docs/fitur-lumabooth-dan-wifi-camera.md`](fitur-lumabooth-dan-wifi-camera.md) dan [`docs/sticker-ar-overlay-engine.md`](sticker-ar-overlay-engine.md)

### Perubahan Signifikan:
- **Animated Boomerang GIF Generator (`compose_gif` di `backend/app/services/image/processor.py`)**:
  - Otomatis membuat file animasi GIF beresolusi `600x400` dari urutan foto yang diambil dengan efek *forward-reverse bounce* (Boomerang).
  - Disimpan di `storage/processed/gif_<session_id>.gif` dengan durasi 280ms per frame.
- **Dukungan 8 Filter Foto Artistik**:
  - Menambahkan filter `beauty` (penghalus kulit & pencerah wajah), `cool` (tone biru sinematik), `y2k` (kontras & saturasi pop), mendampingi `original`, `bw`, `sepia`, `vintage`, dan `vivid`.
  - Filter diterapkan secara *live* pada CSS viewfinder Kiosk dan dirender resolusi penuh pada hasil cetak final via Pillow.
- **5 Paket Dekorasi Stiker (`STICKER_OPTIONS`)**:
  - `sweet_bows` (Pita & Hati Lengkap), `hearts_only`, `flowers_only`, `sparkles_only`, dan `none` (polos).
  - Stiker diposisikan secara deterministik pada strip cetak.
- **Custom PNG Frame Overlay (Upload/Hapus via Admin)**:
  - Endpoint `POST /templates/{template_id}/overlay` dan `DELETE /templates/{template_id}/overlay`.
  - File disimpan di `templates/assets/overlays/<template_id>.png` dan disajikan via static route `/template-assets/`.
  - Fungsi `_apply_custom_png_overlay()` menumpuk (*alpha-composite*) desain transparan tepat di atas foto sebelum dicetak.

---

## 3. Modul Kiosk UI & Pengalaman Pengguna (Frontend)

Dokumen Rujukan: [`docs/rancangan_ui_ux_photobooth.md`](rancangan_ui_ux_photobooth.md)

### Perubahan Signifikan:
- **Synthesizer Efek Suara Web Audio API (`frontend/lib/sound.ts`)**:
  - Menambahkan efek suara murni di browser: nada *beep* hitung mundur, klik *shutter* mekanik, dan melodi kord *chime* sukses.
  - Dapat diaktifkan/dinonaktifkan oleh operator melalui toggle di Admin.
- **Tombol "Jepret Sekarang 📸" (`CountdownOverlay.tsx`)**:
  - Memungkinkan pelanggan atau operator mengambil foto seketika tanpa harus menunggu hitung mundur habis.
- **Pemilih Sumber Kamera & Perangkat Langsung di Layar Persiapan (`PreparationScreen.tsx`)**:
  - Menambahkan tombol pemilih `Kamera Perangkat / USB Capture Card` vs `Kamera Server (Wi-Fi Sony / Backend)`.
  - Menampilkan daftar semua perangkat video yang terdeteksi (`USB2.0 HD UVC WebCam`, `USB Video`, `EOS Webcam Utility`) beserta tombol muat ulang kamera.
- **Perbaikan Bug Pratinjau Membeku Antar-Pose (`CameraPreview.tsx`)**:
  - Memperbaiki kondisi `latestSrc && mode === "capturing"` yang sebelumnya menahan gambar foto ke-1 sehingga pose ke-2 sampai ke-6 tidak muncul di *liveview*.
- **Tinjauan Antar-Foto 5 Detik dengan Tombol "Foto Ulang ↺"**:
  - Setiap foto yang diambil diberi jeda 5 detik untuk ditinjau. Pengguna dapat memilih untuk langsung lanjut atau mengulang foto tersebut sebelum lanjut ke pose berikutnya.
- **Layar Pemilihan Foto (`PhotoSelection.tsx`)**:
  - Dari 6 foto yang diambil, pelanggan bebas memilih pose favorit sesuai jumlah slot template yang dipilih.

---

## 4. Modul Pembayaran & Finansial (Payment Gate)

Dokumen Rujukan: [`docs/api-doc.md`](api-doc.md)

### Perubahan Signifikan:
- **Modal Gerbang Pembayaran (`frontend/components/kiosk/PaymentModal.tsx`)**:
  - Ditampilkan sebelum masuk ke layar persiapan jika operator mengaktifkan *Wajibkan Pembayaran* di `/admin`.
- **Integrasi QRIS Dinamis (`POST /session/payment/qris` & `confirm`)**:
  - Menghasilkan string QRIS EMVCo standar dengan nominal dinamis yang dapat diatur oleh operator.
  - Mendukung simulasi konfirmasi pembayaran instan untuk pengujian.
- **Validasi Voucher Kasir (`POST /session/payment/voucher`)**:
  - Mendukung daftar voucher kustom yang diatur operator (mis. `SWEET2026`, `VIPFREE`, `BESTIE`).

---

## 5. Modul Distribusi Digital & Galeri Tamu

Dokumen Rujukan: [`docs/api-doc.md`](api-doc.md)

### Perubahan Signifikan:
- **Halaman Galeri Unduh Tamu Mobile-First (`frontend/app/share/[sessionId]/page.tsx`)**:
  - Tamu memindai QR code di layar kios untuk membuka galeri digital pribadi di smartphone.
  - Menyediakan tab **Strip Foto**, **Animasi GIF**, dan **Semua Foto Asli per-Pose (1–6)** dengan tombol unduh langsung dan Web Share API.
- **Sinkronisasi Tautan Cloud (`POST /session/{id}/cloud-sync`)**:
  - Menyimpan `cloud_share_url` ke database SQLite agar tautan unduhan tamu tetap konsisten saat booth menggunakan tunnel publik (Cloudflare Tunnel / Ngrok).

---

## 6. Modul Database & Penyimpanan Lokal (SQLite & Storage)

Dokumen Rujukan: [`docs/database-schema.md`](database-schema.md)

### Perubahan Signifikan:
- **Migrasi Skema Otomatis (`ALTER TABLE`)**:
  - `DatabaseService._init_db()` otomatis menambahkan kolom baru jika belum ada pada database yang sudah berjalan:
    - `filter_name` (TEXT)
    - `frame_color` (TEXT)
    - `sticker_id` (TEXT)
    - `processed_path` (TEXT)
    - `gif_path` (TEXT)
    - `cloud_share_url` (TEXT)
- **Mount Statis `/template-assets` (`backend/app/main.py`)**:
  - Mengubah static mount template dari `/templates` menjadi `/template-assets` guna menghindari konflik `405 Method Not Allowed` dengan endpoint REST `POST /templates/{id}/overlay`.

---

## 7. Modul Kontainerisasi Docker & Deployment

Dokumen Rujukan: [`docs/DOCKER.md`](DOCKER.md) dan [`docs/setup.md`](setup.md)

### Perubahan Signifikan:
- **Konfigurasi Default Wi-Fi Camera di `docker-compose.yml`**:
  - Menambahkan environment default:
    - `CAMERA_DRIVER=wifi`
    - `CAMERA_MODEL=Sony Alpha a6400 (Wi-Fi)`
    - `CAMERA_WIFI_IP=192.168.122.1`
    - `CAMERA_WIFI_PORT=10000`
    - `CAMERA_WIFI_PROTOCOL=sony_http`
- **Volume Mounts Konsisten**:
  - Bind mounts untuk `./storage:/app/storage`, `./database:/app/database`, dan `./templates:/app/templates` menjaga agar seluruh foto, GIF, overlay PNG, dan SQLite tidak hilang saat kontainer di-rebuild.
- **Pembaruan Suite Pengujian Otomatis (`pytest`)**:
  - Suite pengujian diperluas menjadi **43 tests passing**, memverifikasi driver Wi-Fi mock, fallback simulation, jepretan webcam, composite GIF, custom overlay upload, alur pembayaran, deteksi landmark wajah MediaPipe, transformasi stiker AR, rendering preset, dan integrasi sesi.

---

## 8. Modul Sticker & AR Overlay Engine (AI Face-Tracking & Non-Destructive Compositing)

Dokumen Rujukan: [`docs/sticker-ar-overlay-engine.md`](sticker-ar-overlay-engine.md)

### Perubahan Signifikan:
- **Integrasi Google MediaPipe Face Landmarker (`FaceDetector`)**:
  - Menggunakan model bundle resmi Google `face_landmarker.task` (MediaPipe 1.2.2) dengan XNNPACK CPU acceleration untuk inferensi cepat tanpa GPU.
  - Model bundle disimpan lokal di `backend/app/services/ar/models/face_landmarker.task`.
  - Dilengkapi *fallback* geometris cerdas jika wajah tertutup atau foto tidak mendeteksi 478 landmark penuh, sehingga kiosk tidak pernah error saat memproses foto.
- **Normalisasi 11 Titik Jangkar Wajah (Facial Anchors)**:
  - Pemetaan landmark MediaPipe ke koordinat relatif terstandarisasi Sweet Studio: `head_top`, `forehead`, `eyes_center`, `left_eye`, `right_eye`, `nose`, `left_cheek`, `right_cheek`, `mouth`, `chin`, dan `face_center`.
  - Perhitungan sudut kemiringan kepala (*head roll angle*) $\theta = \text{atan2}(dy, dx)$ untuk rotasi stiker aksesoris secara mulus mengikuti pose kepala.
  - Perhitungan jarak antar-mata (*interocular distance*) untuk penskalaan otomatis aksesoris agar pas dengan ukuran wajah subjek di berbagai jarak kamera.
- **Katalog Aset Stiker & 5 AR Presets (`manifest.json`)**:
  - Dibuat 11 file PNG transparan (RGBA 32-bit high-res) di `templates/assets/overlays/`:
    - Aksesoris Wajah: `face-accessories/bunny/pink_bunny.png`, `glasses/cute_glasses.png`, `crown/princess_crown.png`, `cat/cat_ears.png`, `ribbon/sweet_ribbon.png`.
    - Dekorasi Wajah: `face-decorations/blush/pastel_blush.png`, `hearts/cheek_hearts.png`, `bandaid/cute_bandaid.png`.
    - Efek Melayang (*Floating*): `floating/stars/floating_stars.png`, `glitter/magical_glitter.png`.
    - Dekorasi Musiman: `decorative/flowers/sakura_petals.png`.
  - 5 Preset AR bawaan: `pink_bunny_sweet`, `cute_glasses_blush`, `kitty_whiskers`, `royal_princess`, dan `sakura_fairy`.
- **Mesin Komposisi Non-Destruktif (`StickerEngine`)**:
  - Menghitung posisi, rotasi, skala, opasitas, dan *z-index ordering* sebelum di-*alpha-composite* dengan Pillow ke kanvas foto.
  - *Random Scatter* deterministik menggunakan seed + hash ID aset dengan proteksi tabrakan (*collision avoidance*) terhadap area wajah (margin 15px).
  - Foto asli mentah di `storage/captures/` **100% tidak pernah disentuh**; hasil AR disimpan di `storage/processed/ar_<id>.jpg`.
- **Penambahan REST API Router `/ar` (`backend/app/api/ar.py`)**:
  - `GET /ar/assets`: Mengambil daftar aset stiker aktif dengan filter kategori (`face-accessories`, `face-decorations`, `floating`, `decorative`).
  - `GET /ar/presets`: Mengambil daftar AR Preset.
  - `GET /ar/presets/{preset_id}`: Detail preset tertentu.
  - `POST /ar/analyze`: Menganalisis wajah, mengembalikan orientasi, sudut roll, jarak mata, dan 11 titik jangkar.
  - `POST /ar/preview`: Menghasilkan pratinjau cepat teroptimasi untuk Kiosk.
  - `POST /ar/render`: Merender foto resolusi penuh dengan stiker/preset AR.
- **Integrasi Alur Sesi & Cetak Photostrip**:
  - Kolom `ar_preset_id` ditambahkan ke skema SQLite tabel `sessions` dengan migrasi otomatis.
  - `SessionManager.process_session_photos()` dan endpoint `POST /image/process` otomatis mengaplikasikan preset AR ke foto pilihan sebelum menyusun strip JPEG dan Boomerang GIF.
- **Penyempurnaan Frontend Kiosk UI**:
  - Menambahkan baris seleksi **5. AR Face & Sticker Overlays** pada `TemplateSelector.tsx` dengan kartu interaktif (ikon emoji, nama efek, deskripsi, dan badge *AI Face-Tracking*).
  - Menambahkan fungsi API klien di `frontend/services/api.ts` dan tipe data di `frontend/types/photobooth.ts`.
- **Debugging & Penyempurnaan Pipeline Filter Warna + AR Overlay (`inherit_color_grading`)**:
  - **Perbaikan Bug Filter Terpanggang (*Double-Baked*) pada Webcam (`usePhotoboothSession.ts`)**: Sebelumnya `webcam.captureFrameDataUrl(getFilterCss(selectedFilter))` memanggang filter CSS langsung ke file asli di `storage/captures/`. Kini tangkapan layar selalu disimpan 100% RGB asli (*non-destructive*), sehingga pengguna bebas berganti filter dari *B&W* kembali ke *Original* atau *Soft Beauty* kapan saja tanpa kehilangan warna asli.
  - **Implementasi Aturan `inherit_color_grading` (Section 13.5)**: `StickerEngine` melakukan deteksi wajah MediaPipe pada foto asli tanpa filter, menerapkan `ImageProcessor.apply_filter` terlebih dahulu pada layer foto, lalu menumpuk stiker AR (`inherit_color_grading=False`) di atasnya. Hasilnya, telinga kelinci pink dan pipi hati tetap berwarna cerah meskipun foto menggunakan filter *B&W (Mono)* atau *Vintage Film*.
  - **Perbaikan Kotak Bayangan CSS pada Filter `beauty` (`frontend/lib/defaults.ts`)**: Menghapus `drop-shadow` dari CSS filter `beauty` yang sebelumnya memicu artefak kotak pink pada elemen `<video>` dan `<image>` SVG.
  - **Sinkronisasi Live Preview Filter, Stiker Sudut, & AR di Seluruh Layar Kiosk**:
    - `CameraPreview.tsx`: Menerapkan CSS filter pada foto *review* 5 detik (`isReviewing`) dan thumbnail sudut.
    - `PhotoSelection.tsx`: Menampilkan 6 foto pose dengan pratinjau filter aktif dan mempertahankan `filter_name` serta `ar_preset_id` saat melanjutkan ke pemilihan template.
    - `LayoutMock.tsx` & `TemplateSelector.tsx`: Pratinjau SVG `✦ Frame Strip` kini merespons perubahan filter warna, paket stiker sudut (`sweet_bows`, `hearts_only`, `flowers_only`, `sparkles_only`, `none`), urutan foto terpilih (`selected_photo_ids`), serta menampilkan indikator visual AR Preset dan tab **✨ Cek AI AR & Filter** berbasis endpoint `/ar/preview`.
    - `PhotoPreview.tsx`: Menampilkan badge informasi Filter & AR Preset aktif serta menyediakan *Quick Switcher* untuk mengganti Filter dan AR Stiker dengan sekali sentuh langsung di layar hasil akhir.

---

## 9. Modul Spesifikasi Desain UI/UX Ready Screen (Preparation Screen)

Dokumen Rujukan: [`docs/ui-ux-spec-ready-screen.md`](ui-ux-spec-ready-screen.md) dan [`docs/rancangan_ui_ux_photobooth.md`](rancangan_ui_ux_photobooth.md)

### Perubahan & Rekomendasi Signifikan:
- **Penyusunan Dokumen Spesifikasi UI/UX Komprehensif**:
  - Dibuat dokumen [`docs/ui-ux-spec-ready-screen.md`](ui-ux-spec-ready-screen.md) yang menetapkan standar layout, komponen, interaksi, validasi pre-flight, dan penanganan error pada layar persiapan booth.
- **Konsolidasi Kontrol Kamera (Pengaturan Kamera Terpadu)**:
  - Menyederhanakan kontrol kamera pengunjung menjadi satu baris status ringkas (`● Kamera Aktif • 1080p`) dengan *collapsible accordion* untuk opsi teknis lanjutan (pemilihan driver, ganti device ID, dan tombol muat ulang) sehingga tidak memadati layar.
- **Penyempurnaan Face Guidance Overlay**:
  - Mereposisi panduan wajah oval agar proporsional dan tidak menutupi wajah dengan teks. Teks panduan dipindahkan ke bawah oval dengan indikator warna dinamis (*Looking good ♡*).
- **Redesain Kartu Template Frame**:
  - Memperbesar thumbnail frame (minimal tinggi 130px) dengan visualisasi slot strip transparan yang jelas (gaya *Korean Strip / Chalkak Studio*) beserta informasi slot foto dan badge pilihan aktif.
- **Validasi Kesiapan Tombol CTA ("I'M READY!")**:
  - Menambahkan *pre-flight check* (koneksi kamera, stream video, dan feedback audio/visual) sebelum transisi ke countdown sesi pemotretan.
- **Implementasi Nyata pada Antarmuka Kiosk (`frontend/components/kiosk/`)**:
  - [`CameraPreview.tsx`](../frontend/components/kiosk/CameraPreview.tsx): Oval panduan wajah diperbaiki dengan proporsi kepala & bahu yang bersih tanpa teks yang menutupi wajah. Ditambahkan *Dynamic Bottom Status Pill* (`Looking Good! Senyum Manis ♡` dengan indikator ping hijau pastel) yang berada di bagian bawah viewport kamera.
  - [`PreparationScreen.tsx`](../frontend/components/kiosk/PreparationScreen.tsx):
    - Layout ditata ulang sesuai rasio ~60% kolom kiri dan ~40% kolom kanan.
    - Kontrol kamera disatukan dalam satu card status ringkas (`● Kamera Aktif • 1080p`) dengan opsi teknis yang dapat dibuka/tutup rapi (*collapsible accordion*).
    - Kartu template frame diperbesar (tinggi ~140px, visualisasi miniatur photostrip proporsional dengan slot foto transparan dan badge jumlah foto).
    - Swatches warna dan countdown timer dipisahkan secara lega.
    - Tombol `I'M READY!` memainkan melodi *chime* kesiapan (`playSuccessChime`) dan melakukan validasi pra-kondisi sebelum memulai rangkaian pemotretan.
- **Penyempurnaan Baseline Ready Screen v2.0 (Skor Evaluasi 8.8/10)**:
  - **Oval Biometrik Vertikal & 4 Retikel Sudut**: Mengubah dimensi oval menjadi `rounded-[50%/42%]` vertikal tinggi 300-330px dengan 4 retikel fokus kamera di sudut-sudutnya, sehingga melingkupi dahi hingga dagu secara ergonomis dan tidak lagi hanya menutupi dahi/rambut atas.
  - **Standarisasi Tiga Istilah Alur Foto**: Menghilangkan inkonsistensi antara jumlah pengambilan (*Selalu 6 Pose Pemotretan*), jumlah slot frame (*misal 3 atau 4 Slot Cetak*), dan jumlah foto pilihan (*Pilih N Foto Terbaik dari 6 jepretan*). Badge kamera dan kartu template kini seragam dan jelas.
  - **Palette Warna Frame Flex-Wrap**: Area swatch warna frame diubah dari satu baris scroll horizontal yang terpotong menjadi *spacious flex-wrap* 2 baris rapi dengan lingkaran warna 16px, label nama, dan centang aktif.
  - **Pratinjau Live Tulisan di Bawah Frame**: Menambahkan kotak pratinjau live footer photostrip (`✦ {NAMA / CATATAN} ✦ a little moment, a lovely memory ♡`) tepat di bawah kolom input nama.
  - **Modal Kesiapan Sistem Pre-Flight (Pemisahan iPad vs Hardware Mini PC)**: Menambahkan tombol dan dialog checklist kesiapan sistem 5 poin yang memisahkan status stream live kiosk iPad (USB Capture Card) dari status koneksi fisik kamera server (Canon EOS 700D / Sony Alpha di Mini PC Ubuntu).
  - **Konsistensi Bahasa CTA**: Tombol utama diseragamkan menjadi `MULAI FOTO SEKARANG! ♡` dengan subteks informatif `6 Pose Pemotretan • Pilih N Foto Terbaik ✨`.
- **Optimalisasi Viewport 100vh & Reposisi Face Guide Portrait**:
  - **Penyesuaian Oval Potret Wajah (`CameraPreview.tsx`)**: Mengubah dimensi oval menjadi `w-[46%] h-[74%]` dari viewport 3:2 dan memindahkan pill status ke `top-14` (di bawah status bar), sehingga melingkupi kepala hingga dagu/leher secara proporsional dan tidak lagi memotong mata atau menutupi dagu.
  - **Optimalisasi 100vh Non-Scrollable (`PreparationScreen.tsx`)**: Mengompresi kartu template frame (`max-h-[160px]`), menyusun swatch warna frame menjadi lingkaran 30px 1 baris ringkas, mengubah box pratinjau tulisan footer menjadi 1 baris kompak (`Tampilan di frame: ✦ ... ✦`), sehingga seluruh komponen dan tombol CTA `MULAI FOTO SEKARANG! ♡` **100% tampil di atas lipatan layar (*Above the Fold*)** tanpa perlu scroll pada layar laptop, iPad, maupun kiosk.

---

## 10. Modul Deployment Sistem (Armbian Linux & STB ZTE HG680-P)

Dokumen Rujukan: [`docs/deployment-armbian-stb-hg680p.md`](deployment-armbian-stb-hg680p.md), [`docs/setup.md`](setup.md), dan [`docs/DOCKER.md`](DOCKER.md)

### Perubahan & Rekomendasi Signifikan:
- **Penyusunan Panduan Deployment Lengkap untuk STB ZTE HG680-P (Amlogic S905X `arm64`)**:
  - Dibuat dokumen [`docs/deployment-armbian-stb-hg680p.md`](deployment-armbian-stb-hg680p.md) yang mengupas kelayakan teknis, arsitektur *Headless Server*, konfigurasi zRAM & Swap 2 GB, kompatibilitas wheel MediaPipe `manylinux_2_28_aarch64`, serta mitigasi daya USB.
- **Strategi Multi-Arch Build (Docker Buildx / Bare-Metal)**:
  - Dokumentasi alur build Next.js di PC host (`docker buildx --platform linux/arm64` atau standalone `.next/standalone`) guna mencegah *freeze / Out-Of-Memory (OOM)* pada STB ber-RAM 2 GB.
- **Rekomendasi Hardware Photobooth Portabel**:
  - Standarisasi penggunaan *Powered USB Hub* mandiri untuk menghindari *voltage drop* saat pemicuan shutter kamera DSLR Canon/Sony atau printer thermal/sublimasi.
  - Rekomendasi media penyimpanan MicroSD Class 10 A1/A2 minimal 32 GB dan flashdisk USB eksternal khusus penyimpanan hasil foto (`storage/captures/`).
- **Strategi Manajemen Penyimpanan & Mitigasi SD Card Penuh (Storage Architecture)**:
  - Dokumentasi kalkulasi kebutuhan kapasitas (RAW vs JPEG Large vs JPEG Medium standar industri photobooth).
  - Skema partisi & *Mounting* USB Flashdisk / SSD eksternal langsung ke `/opt/dryu-booth/storage` untuk menjaga keawetan MicroSD OS dan memudahkan serah terima file foto ke klien tanpa perlu download via Wi-Fi/SSH.
  - Mitigasi proteksi disk penuh (*Low Storage Safeguard*) melalui endpoint `/health` serta otomatisasi upload cloud via `rclone`.

---

## 11. Modul Kesiapan Komersialisasi & Roadmap Produk (Commercial-Grade Kiosk)

Dokumen Rujukan: [`docs/panduan-komersialisasi-dan-roadmap-produk.md`](panduan-komersialisasi-dan-roadmap-produk.md)

### Perubahan & Rekomendasi Signifikan:
- **Penyusunan Cetak Biru Komersialisasi (Commercial Readiness Blueprint)**:
  - Dibuat dokumen [`docs/panduan-komersialisasi-dan-roadmap-produk.md`](panduan-komersialisasi-dan-roadmap-produk.md) yang mengaudit kesiapan sistem pada 9 dimensi produk (skor saat ini: **82/100, Late Beta / Production Candidate**).
- **5 Pilar Strategis Menuju Produk Siap Jual**:
  1. *Kiosk Lockdown & PIN Admin*: Proteksi akses sensitif dan pencegahan interupsi tamu di layar sentuh.
  2. *Event Profile Management*: Manajemen multi-event (logo, nama pengantin, template aktif, footer) tanpa perlu menyentuh kode.
  3. *Payment Gateway Real*: Integrasi QRIS dinamis (Midtrans/Tripay) dan cash acceptor untuk kiosk swalayan (*unattended*).
  4. *Offline Digital Delivery*: Solusi pengiriman foto digital ke smartphone tamu di gedung tanpa internet via Hotspot Wi-Fi Lokal STB (Captive Portal).
  5. *Sistem Lisensi & Anti-Piracy*: Proteksi HAKI menggunakan Machine-ID Hardware Lock (HWID) dan enkripsi RSA.
- **Rencana Packaging & Distribusi**:
  - Model A: *Turnkey Hardware Box* (STB HG680-P + Armbian + Kabel + Hub terkonfigurasi, siap pakai vendor).
  - Model B: *Software License Installer* (.exe Windows / .deb Linux untuk laptop/mini PC fotografer).

---

## 12. Modul Debugging Kamera USB & Pembedaan Webcam vs DSLR Capture Card

Dokumen Rujukan: [`docs/camera-integration.md`](camera-integration.md) dan [`docs/deployment-armbian-stb-hg680p.md`](deployment-armbian-stb-hg680p.md)

### Perubahan & Rekomendasi Signifikan:
- **Penyempurnaan Deteksi Label Kamera (`useWebcam.ts`)**:
  - Memperbaiki fungsi `isCaptureCardDevice()` agar tidak salah mendeteksi webcam USB bawaan laptop (misal `USB2.0 HD UVC WebCam`) sebagai "DSLR USB Capture Card" hanya karena terdapat kata "uvc".
  - Webcam laptop kini dikenali sebagai kamera USB standar, sedangkan badge Capture Card hanya diberikan untuk perangkat HDMI/USB Video sungguhan (Cam Link, FHD Capture, Elgato, EZCap).
- **Penambahan Quick Recovery Banner di Layar Kiosk (`PreparationScreen.tsx`)**:
  - Menampilkan banner peringatan ramah otomatis jika Sumber Kamera tidak sengaja berada di mode "Kamera Server" yang terputus, lengkap dengan tombol 1-klik: `Gunakan Kamera Perangkat ✓`.
  - Menampilkan banner diagnostik jika izin kamera browser ditolak, lengkap dengan tombol `Coba Hubungkan Ulang`.
- **Diagnosis Hardware Nyata (Windows Host vs Docker WSL2)**:
  - Dokumentasi isolasi Docker Desktop Windows: port USB fisik host Windows (Canon EOS 700D WPD) tidak otomatis diteruskan ke dalam kontainer Docker Linux tanpa `usbipd-win`, berbeda dengan STB Armbian di mana port `/dev/bus/usb` langsung diakses secara native oleh `gphoto2`.
  - Memberikan panduan penggunaan **Canon EOS Webcam Utility** atau **USB HDMI Video Capture Card (Rp 60rb)** untuk mengubah DSLR Canon menjadi input webcam langsung di browser.
- **Skrip Penghubung Kamera USB Otomatis (`scripts/connect-canon-usb.bat` & `.ps1`)**:
  - Dibuat skrip otomatis yang mendeteksi BUSID Canon EOS 700D secara dinamis dan melakukan binding serta attach ke WSL2/Docker dengan hak Administrator otomatis (*UAC auto-elevation*).
  - Mengonfigurasi `privileged: true` pada `backend` di `docker-compose.yml` agar kontainer Docker memiliki hak akses langsung ke perangkat fisik `/dev/bus/usb`.

---

## 13. Modul Audit & Remediasi Kualitas UI/UX (`antislop` & `antislop-ui` + `DESIGN.md`)

Dokumen Rujukan: [`DESIGN.md`](../DESIGN.md) dan [`docs/audit-antislop-001-2026-11-10.md`](audit-antislop-001-2026-11-10.md)

### Perubahan Signifikan:
- **Penetapan Sistem Desain Formal ([`DESIGN.md`](../DESIGN.md))**:
  - Mendefinisikan Liveliness Dials (`ENERGY 2 / RHYTHM 2 / MOTION 2`), disiplin palet 3 warna inti + 1 aksen (`#FFF0F0`, `#FFFFFF`, `#3F3D56`, aksen `#F472B6`), alasan pemilihan tipografi (`Fredoka` + `Quicksand`), hierarki *border-radius*, aturan elevasi satu mekanisme (border struktural `#F3E6EE`), dan pembatasan *glassmorphism* khusus di atas video live.
- **Remediasi Hard Gate (`R-01`, `R-02`, `R-03`, `R-17`, `R-27`, `R-32`, `R-38`, `R-39`, `R-40`)**:
  - Menggelapkan `--color-text-muted` dari `#7A7893` ke `#5C5A72` (rasio kontras ≥ 5.9:1, lulus WCAG AA).
  - Menghapus seluruh karakter em dash (`—`) dari metadata dan komponen kiosk.
  - Menaikkan seluruh target sentuh tombol, swatch warna, dan kontrol cetak menjadi minimal `44×44px` (`min-h-[44px]` / `size-11`).
  - Menghapus angka fallback palsu `12% Used` pada kartu Storage (`Dashboard.tsx`) dan `100%` pada baterai (`CameraStatus.tsx`), digantikan status jujur (`Belum Terukur` / `AC / USB Power`).
  - Memperbaiki *empty state* pada `SessionTable.tsx` dan `PrinterStatus.tsx` agar menyertakan alasan dan tombol aksi langsung ke `/`.
  - Menghapus seluruh kelas `outline-none` pada form input/select dan mengganti modal kesiapan sistem kustom di `PreparationScreen.tsx` dengan komponen `<Modal>` berbasis `<dialog>` native (mendukung penutupan via tombol `Escape`).
  - Menambahkan aturan `@layer base` di `globals.css` untuk `cursor: pointer` pada kontrol aktif dan `cursor: not-allowed` pada kontrol `:disabled`, serta mengubah `<div>` status `TopBar.tsx` menjadi `<button type="button">` semantik.
  - Menambahkan atribut `width` dan `height` eksplisit pada seluruh elemen `<img>` dan `<video>` untuk mencegah *layout shift* (CLS).
- **Remediasi Purpose-Gate (`R-04`, `R-08`, `R-09`, `R-10`, `R-12`, `R-16`, `R-19`)**:
  - Menghapus seluruh emoji dekoratif literal (`✨`, `♡`, `✦`, `📷`, `🎥`, `🌸`, dll.) dari label UI, filter, stiker, dan preset AR.
  - Menghapus *eyebrow pill badge* `MEMORIES CAPTURED` di atas `<h1>THANK YOU!</h1>` pada `CompletionScreen.tsx` serta menghapus panah teks `➔` pada tombol.
  - Menghentikan seluruh animasi `infinite` (`dreamy-gradient`, `animate-float-strip-*`, `animate-pulse-cta`, `animate-float-soft`, `animate-ping`, `animate-bounce`) dan menggantinya dengan animasi masuk satu kali (*one-shot entrance*).

---

## 14. Modul Antigravity 3D Spatial Motion & Zero-Scroll Kiosk Bento Architecture

Dokumen Rujukan: [`DESIGN.md`](../DESIGN.md) (Bagian `antigravity-design-expert`)

### Perubahan Signifikan (Eksekusi 8 Poin Evaluasi UI/UX Perfeksionis):
1. **Sinkronisasi Token Palet & Perbaikan Bug `<p>` (`tailwind.config.ts` & `globals.css`)**:
   - Menyelaraskan token warna dengan `DESIGN.md` (`--color-background: #FFF5F7`, `--color-primary-strong: #DB2777`, `--color-success: #047857`).
   - Menghapus aturan global `p { max-width: 75ch }` tanpa margin otomatis yang sebelumnya membuat elemen `<p>` di dalam kontainer `.text-center` melempem ke kiri.
   - Mengembalikan *diffused weightless shadows* (`.shadow-sweet-strip`, `.shadow-sweet-card`, `shadow-sweet`, `shadow-sweetLg`) agar elemen memiliki kedalaman spasial (*Spatial Depth*).
2. **Sistem Motion Antigravity yang Berkelas & Tidak Norak (`globals.css` & `WelcomeScreen.tsx`)**:
   - Menambahkan `.antigravity-stage` (`perspective: 1200px; transform-style: preserve-3d`) dengan *3D Fan-Out Entrance* (`rotateY(±14deg) translateZ(...)`) dan kemiringan 3D interaktif saat disentuh/hover pada ketiga photostrip di [`WelcomeScreen.tsx`](../frontend/components/kiosk/WelcomeScreen.tsx).
   - Menambahkan `.animate-spring-swap` (`spring-swap-3d`) untuk transisi pergantian template, warna frame, filter, dan tab media.
   - Menambahkan koreografi masuk berurutan (`.stagger-item` + `.stagger-1` s/d `.stagger-6` dengan jeda `0.06s`) untuk kartu foto dan preset.
   - Merapatkan posisi *floating badge* Heart & Flower di `WelcomeScreen.tsx` agar membingkai ketiga photostrip secara proporsional.
3. **Perbaikan Layar Preparation (`PreparationScreen.tsx` & `CameraPreview.tsx`)**:
   - Mengubah kartu pada `1. Pilih Desain Frame` menjadi *Horizontal Card Layout* (`min-h-[72px]`) di dalam kontainer `max-h-[156px]` sehingga 2 baris (4 kartu) tampil 100% utuh tanpa ada kartu yang terpotong setengah.
   - Mengganti *horizontal scroll* pada `Live Filter Kamera` menjadi **Grid 5×2 (`grid-cols-2 sm:grid-cols-5`)** sehingga ke-10 filter tampil sekaligus tanpa *scrollbar* tebal di bawah tombol.
   - Memindahkan *pill* `Wajah Terdeteksi • Siap Memotret` ke `bottom-4` di dalam *viewfinder* agar tidak bertabrakan dengan teks informasi kamera di bagian atas.
4. **Perbaikan Layar Capture & Review (`CountdownOverlay.tsx` & `CameraPreview.tsx`)**:
   - Menghapus `<div className="fixed inset-0 bg-black/15" />` yang membuat latar belakang *Sweet Pink* terlihat kusam/abu-abu.
   - Memperbaiki inkonsistensi indikator pose saat jeda *review* (`isReviewing === true`): badge kanan atas kamera kini menampilkan `Foto 5 dari 6 Pose` (konsisten dengan `PHOTO 5 OF 6` dan `Foto #5 Tersimpan`).
   - Menyatukan *progress bar* dan tombol aksi *review* ke dalam **Unified Glassmorphic Bottom Control Dock** di tengah bawah layar.
5. **Koreografi Domino & Zero-Scroll pada `PhotoSelection.tsx`**:
   - Seluruh 6 pose foto dalam grid 3×2 beserta tombol `PASANG KE FRAME` muat 100% di dalam `h-dvh overflow-hidden` dengan animasi masuk berurutan (`.stagger-1` s/d `.stagger-6`).
6. **3-Tab Studio Configurator pada `TemplateSelector.tsx` (`PICK YOUR VIBE`)**:
   - Mengubah tumpukan 5 kartu vertikal menjadi **3-Tab Studio Configurator** (`1. Layout & Warna`, `2. Filter & Dekorasi`, `3. AR Stiker Wajah`) yang muat 100% dalam satu layar penuh tanpa *scroll* halaman, dipadukan dengan panggung 3D `.animate-spring-swap` di kolom kanan.
7. **Compact Quick Filter/AR Switcher & 3D Preview pada `PhotoPreview.tsx` & `CompletionScreen.tsx`**:
   - Mengorganisir tombol `Filter Cepat (10)` dan `AR Stiker Wajah (9)` ke dalam *tab switcher* ringkas pada `PhotoPreview.tsx` serta menambahkan efek `.animate-spring-swap` saat berpindah mode tampilan (`Hasil Cetak`, `Boomerang GIF`, `Slideshow`, `Foto Asli`).
8. **Redesain Total Halaman Share (`frontend/app/share/[sessionId]/page.tsx`) — Full-Screen Zero-Scroll Kiosk Bento**:
   - Mengubah halaman `/share/[sessionId]` menjadi **3-Column Full-Screen Kiosk Bento (`lg:h-dvh lg:overflow-hidden` & `max-w-7xl`)**:
     - **Kolom 1 (3 Cols)**: Panggung vertikal penuh untuk `1. Hasil Strip Foto` + tombol unduh.
     - **Kolom 2 (4 Cols)**: `2. Boomerang GIF` di bagian atas + **Instant QR Code Kiosk Dock (`QRCodeSVG`)** di bagian bawah agar pengunjung dapat langsung memindai QR ke ponsel mereka.
     - **Kolom 3 (5 Cols)**: `3. Semua Foto Satuan (6 Pose)` dalam **Grid Bento 2×3 (`grid-cols-2 grid-rows-3`)** yang muat 100% di dalam satu layar tanpa *scroll* ke bawah.

---

## 15. Modul Center Glassmorphic Countdown HUD & Attract Mode Live Mirror

Dokumen Rujukan: Permintaan Pengguna & Mockup Layar Kiosk (`media_1794252567780.png`)

### Perubahan Signifikan:
1. **Centered Translucent Glassmorphic Countdown HUD (`CountdownOverlay.tsx`)**:
   - Menghapus badge timer dari header atas agar pandangan pengguna terfokus penuh ke viewfinder kamera.
   - Menempatkan timer hitung mundur **tepat di titik tengah (*dead-center*)** kamera dengan lingkaran *frosted glass* semi-transparan (`size-32 sm:size-40 rounded-full bg-[#3F3D56]/40 backdrop-blur-md border-3 border-white/60 shadow-sweetLg`).
   - Angka countdown ditampilkan dalam ukuran masif (`text-6xl sm:text-7xl font-heading font-black text-white drop-shadow-md`) dengan teks aksen `SMILE!` dan animasi *bubble-pop* elastis setiap detik berganti.
   - Karena berpenampilan semi-transparan, wajah pengguna di belakang lingkaran tetap terlihat jelas saat mengatur pose.
2. **Pembesaran Viewport Kamera (*Immersive Edge-to-Edge Preview*)**:
   - Menyesuaikan batas tinggi maksimum pada mode penangkapan foto (`mode === "capturing"`) di `CameraPreview.tsx` menjadi `max-h-[85dvh]` dan `max-w-[calc(85dvh*1.5)]` dengan kontainer `max-w-6xl xl:max-w-7xl 2xl:max-w-[1450px]` di `CountdownOverlay.tsx`, memaksimalkan rasio layar tanpa *dead-space*.
3. **Opsi Attract Mode Live Preview pada Halaman Start (`WelcomeScreen.tsx` & `page.tsx`)**:
   - Menambahkan field konfigurasi `welcomeScreenMode: "static" | "live_preview"` ke `BoothOperatorConfig` (`types/photobooth.ts` & `lib/config.ts`).
   - Pada mode **Live Preview (Cermin Interaktif / Attract Mode)**:
     - Kamera kiosk aktif live di halaman awal dalam bingkai kaca estetik `rounded-[2.5rem]` dengan badge status `LIVE MIRROR • CERMIN INTERAKTIF` dan watermark Sweet Studio.
     - Berfungsi sebagai "cermin magnetik" untuk menarik perhatian orang-orang yang melintas di sekitar kiosk agar melihat diri mereka, merapikan pose, dan langsung menekan layar atau tombol sentuh `START PHOTO`.
   - Pada mode **Showcase Statis**:
     - Menampilkan panggung 3D dengan 3 photostrip miring estetik (`antigravity-stage`).
4. **Pengaturan Mode Halaman Start di Dashboard Admin (`TemplateManager.tsx`)**:
   - Menyediakan panel kartu pengaturan 1-klik di Dashboard Admin untuk memilih antara *Showcase Statis (3D Floating Strips)* atau *Live Preview (Cermin Interaktif / Attract Mode)* dengan status tersimpan otomatis ke konfigurasi operator.
5. **Rombak Total Layout Live Mirror & Bingkai Photobooth Estetik (`WelcomeScreen.tsx`)**:
   - Mengubah layout bertumpuk vertikal menjadi **Side-by-Side Split Grid (`lg:grid-cols-12`) Full-Height (`max-w-[1880px]`)**:
     - **Kolom Kiri/Tengah (`lg:col-span-8 2xl:col-span-9`)**: Viewport cermin kamera masif **Full-Height** yang mengisi seluruh tinggi layar kiosk secara vertikal tanpa batasan rasio kaku (`w-full h-full min-h-0`), berbingkai studio `rounded-[2.5rem]` dengan **Photobooth Studio Viewfinder Overlay**:
       - 4 Siku Studio Reticle (`size-10 sm:size-12`) dengan garis putih tegas beraksen titik pink studio `#DB2777`.
       - Panduan oval wajah & torso di tengah (`w-[46%] max-w-[340px] h-[68%] max-h-[460px]`) dengan garis putus-putus dan crosshair halus plus badge label *POSISIKAN WAJAH*.
       - Top HUD badges: Badge status *LIVE MIRROR • CERMIN INTERAKTIF* dengan radar pulse dan badge *Sentuh Cermin Untuk Mulai*.
       - Bottom Studio Watermark Ribbon mengapung elegan dengan label *SWEET STUDIO PHOTOBOOTH*.
       - Seluruh area cermin kamera live interaktif (*tap anywhere to start*).
     - **Kolom Kanan (`lg:col-span-4 2xl:col-span-3`) — Unified Luxury Studio Control Dock**:
       - Menggabungkan elemen yang sebelumnya terpisah-pisah menjadi **1 Konsol Kiosk Terpadu** (`rounded-[2.5rem] bg-white/95 backdrop-blur-xl border-3 border-white shadow-sweetLg`):
         - **Header**: Logo pita studio gradient dengan heading SWEET STUDIO, tagline, dan pill badge *SELF PHOTO KIOSK*.
         - **Body**: 3 kartu fitur terkurasi (Ambil 6 Pose Terbaik, Filter Beauty & AR Stiker, Cetak Instan & Boomerang GIF) serta kotak ajakan ramah.
         - **Grand CTA**: Tombol sentuh masif `START PHOTO` berdenyut lembut (`min-h-[76px] sm:min-h-[82px]`) lengkap dengan panduan sentuhan dwi-bahasa.





6. **Perbaikan Aktivasi Stream Kamera Live Mirror & Eliminasi Tumpang Tindih Teks**:
   - **Aktivasi Stream di Halaman Welcome (usePhotoboothSession.ts)**: Sebelumnya kondisi webcamActive hanya mencakup langkah PREPARATION dan CAPTURING, sehingga saat berada di langkah WELCOME hook useWebcam memanggil stopStream(). Sekarang webcamActive aktif penuh ketika welcomeScreenMode === "live_preview" pada langkah WELCOME.
   - **Inisialisasi Eager State Operator**: Menginisialisasi operatorConfig secara langsung dari localStorage saat hidrasi klien agar mode cermin aktif seketika dari frame pertama.
   - **Pencegahan Tumpang Tindih Teks (*Text Collision Fix*)**: Panduan oval *"POSISIKAN WAJAH"* kini hanya dirender ketika streamReady === true, sehingga saat kamera sedang menyiapkan stream atau mengalami kendala izin, teks tidak lagi bertumpuk di atas pesan status.
   - **Penanganan Kesalahan Izin Kamera Komprehensif**: Menambahkan penanganan webcamError lengkap dengan tombol interaktif sentuh langsung *"Buka / Izinkan Kamera"* untuk memicu permintaan izin browser secara instan.

---

## 16. Integrasi DOKU Payment Gateway (Dynamic QRIS MPM & Webhook Notification)

Dokumen Rujukan: Permintaan Pengguna (Integrasi Pembayaran DOKU Kiosk)

### Arsitektur & Alur Kerja:
1. **Dynamic QRIS MPM (Merchant Presented Mode)**:
   - Pengunjung memilih opsi bayar di kiosk -> sistem meminta DOKU API untuk membuat QRIS dinamis (/qris-merchant-presentation/v2/generate-qr-code).
   - DOKU menghasilkan string QR resmi (EMVCo) beserta invoice number dan waktu kedaluwarsa (5 menit).
2. **Kalkulasi Signature HMAC-SHA256**:
   - Header request ke DOKU menyertakan:
     - Client-Id: ID Merchant DOKU
     - Request-Id: UUID unik per request
     - Request-Timestamp: Format ISO 8601 UTC
     - Signature: HMACSHA256=base64(hmac_sha256(secret_key, component))
3. **Webhook Listener (/payment/doku/notify & /session/payment/doku/notify)**:
   - Menerima notifikasi pembayaran instan dari DOKU saat customer memindai dan menyelesaikan transaksi via mobile banking / e-wallet.
   - Memverifikasi HMAC signature notifikasi DOKU untuk keamanan transaksi.
   - Mengubah status transaksi menjadi PAID secara real-time.
4. **Auto-Polling & Feedback Audio di Kiosk (PaymentModal.tsx)**:
   - Kiosk melakukan polling status setiap 2 detik.
   - Begitu webhook DOKU mengonfirmasi pembayaran lunas, modal memutar suara chime sukses (playSuccessChime), menampilkan badge hijau, dan otomatis membuka sesi foto.
   - Dilengkapi timer kedaluwarsa 5 menit dan opsi regenerasi QR baru jika waktu habis.
5. **Mode Hybrid (Live DOKU + Simulasi Fallback)**:
   - Jika kunci DOKU belum diisi di .env, sistem secara otomatis berjalan dalam mode simulasi sehingga tidak memblokir alur pengujian kiosk lokal.
