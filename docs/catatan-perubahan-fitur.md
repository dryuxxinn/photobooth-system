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
