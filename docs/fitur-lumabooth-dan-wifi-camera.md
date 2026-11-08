# Dokumentasi Fitur Baru: LumaBooth Parity & Kamera Wi-Fi (Sony Alpha a6400)

Dokumen ini merangkum seluruh pengembangan arsitektur, fitur setara **LumaBooth**, serta integrasi **Kamera Nirkabel (Wi-Fi Direct / Sony Alpha a6400 & PTP-IP)** yang telah diimplementasikan pada sistem **Dryu Photobooth**. Gunakan dokumen ini sebagai rujukan utama saat melanjutkan pengembangan di sesi/percakapan baru.

---

## 1. Daftar Fitur Baru (LumaBooth Parity)

### A. Animated GIF / Boomerang Otomatis
- **Backend**: `ImageProcessor.compose_gif()` di `backend/app/services/image/processor.py`
  - Setiap kali sesi diproses (`POST /image/process`), sistem tidak hanya membuat file JPEG strip cetak (`processed_image_path`), tetapi juga menyusun file **Animated GIF (Boomerang maju-mundur)** beresolusi `600x400` di `storage/processed/gif_<session_id>.gif`.
  - Path dan URL GIF disimpan secara otomatis di kolom `gif_path` dan `gif_url` pada tabel SQLite `sessions` (migrasi `ALTER TABLE` berjalan otomatis saat startup di `backend/app/services/storage/database.py`).
- **Frontend**:
  - Di layar `PhotoPreview.tsx`, `CompletionScreen.tsx`, `QrDialog.tsx`, dan halaman unduh tamu (`/share/[sessionId]`), pengguna dapat beralih antara tampilan **Strip Cetak (JPEG)** dan **Animasi Boomerang (GIF)**.

### B. Custom PNG Frame Overlay (Drag & Drop / Upload via Admin)
- **Backend**:
  - `ImageProcessor.save_custom_overlay()`, `delete_custom_overlay()`, dan `_apply_custom_png_overlay()` di `backend/app/services/image/processor.py`.
  - File PNG transparan disimpan di `templates/assets/overlays/<template_id>.png` dan disajikan melalui static mount `/template-assets/overlays/<template_id>.png` (`backend/app/main.py`).
  - Endpoint REST API di `backend/app/api/printer.py`:
    - `POST /templates/{template_id}/overlay` (menerima base64 `image_data` PNG)
    - `DELETE /templates/{template_id}/overlay` (menghapus custom PNG overlay)
  - Saat foto diproses, jika template memiliki file PNG overlay kustom, sistem akan menumpuk (*alpha-composite*) PNG tersebut tepat di atas kanvas foto sebelum mengekspor JPEG hasil akhir.
- **Frontend**:
  - Di `frontend/components/admin/TemplateManager.tsx`, setiap kartu template memiliki tombol **Upload PNG** dan **Hapus PNG** untuk mengunggah desain bingkai transparan acara (wedding, birthday, brand).

### C. Kustomisasi Dekorasi Stiker (`sticker_id`) & 8 Filter Foto
- **Pilihan Stiker (`STICKER_OPTIONS`)**:
  - `sweet_bows` (Pita & Hati Lengkap)
  - `hearts_only` (Hati Pastel)
  - `flowers_only` (Bunga Sakura)
  - `sparkles_only` (Kilau Bintang)
  - `none` (Polos / Tanpa Dekorasi)
- **Pilihan Filter (`PHOTO_FILTERS` di `frontend/lib/defaults.ts` & `ImageProcessor.apply_filter`)**:
  - `original` (Natural)
  - `beauty` (Soft Beauty Glow — smoothing & pencerah wajah halus)
  - `bw` (Hitam Putih Klasik)
  - `sepia` (Hangat / Retro)
  - `vintage` (Film Analog)
  - `cool` (Cool Breeze — tone biru sinematik)
  - `y2k` (Cyber Y2K Pop — kontras & saturasi pop)
  - ` vivid` (Cerah & Tajam)
- Pelanggan dapat memilih stiker dan filter di `TemplateSelector.tsx` serta melihat pratinjau filter secara *live* di `PreparationScreen.tsx`.

### D. Efek Suara Web Audio Synthesizer (`frontend/lib/sound.ts`)
- Menggunakan **Web Audio API** murni di browser (tanpa ketergantungan file MP3 eksternal):
  - `playCountdownBeep(secondsRemaining)`: nada *beep* setiap detik hitung mundur, dengan nada tinggi pada detik terakhir.
  - `playShutterSound()`: suara mekanik *shutter click* kamera saat foto diambil.
  - `playSuccessChime()`: kord *arpeggio* ceria saat sesi selesai atau pembayaran berhasil.
- Dapat diaktifkan/nonaktifkan oleh operator melalui toggle **Efek Suara Kiosk** di halaman `/admin` (`TemplateManager.tsx`).

### E. Payment Gate: QRIS Dinamis & Kode Voucher Kasir
- **Backend (`backend/app/api/session.py`)**:
  - `POST /session/payment/qris`: membuat transaksi QRIS dan menghasilkan payload string QRIS standar EMVCo.
  - `POST /session/payment/qris/{transaction_id}/confirm`: mengonfirmasi status pembayaran QRIS.
  - `POST /session/payment/voucher`: memvalidasi kode voucher kasir (mendukung daftar voucher kustom dari konfigurasi operator).
- **Frontend (`frontend/components/kiosk/PaymentModal.tsx`)**:
  - Jika operator mengaktifkan **Wajibkan Pembayaran (QRIS / Voucher)** di `/admin`, pelanggan yang menekan tombol mulai di layar *Welcome* akan melihat modal pembayaran berisi:
    - Tab **Scan QRIS** (dengan harga sesi IDR dan tombol konfirmasi/simulasi pembayaran).
    - Tab **Kode Voucher Kasir** (input kode voucher seperti `SWEET2026`, `VIPFREE`, `BESTIE`).

### F. Galeri Digital Tamu (`/share/[sessionId]`) & Cloud Share Link
- **Halaman Microsite Tamu (`frontend/app/share/[sessionId]/page.tsx`)**:
  - Saat pelanggan memindai QR Code di akhir sesi (`QrDialog.tsx`), ponsel pelanggan membuka halaman `/share/<session_id>`.
  - Menampilkan tab **Strip Foto**, **Animasi GIF**, dan **Semua Pose Asli (1–6)** beserta tombol unduh langsung ke galeri HP dan tombol **Bagikan (Web Share API)**.
- **Endpoint Cloud Sync (`POST /session/{session_id}/cloud-sync`)**:
  - Menyimpan URL publik sesi (`cloud_share_url`) ke database jika operator mengatur *Public Share Base URL* (mis. domain Cloudflare Tunnel / Ngrok).

---

## 2. Arsitektur Kamera & Dukungan Nirkabel (Wi-Fi Sony Alpha a6400)

Sistem mendukung **2 Sumber Kamera Kiosk (`cameraSourceMode`)** dan **3 Driver Kamera Backend (`CAMERA_DRIVER`)**:

### A. Sumber Kamera di Layar Kiosk (`PreparationScreen.tsx` & `useWebcam.ts`)
1. **📷 Kamera Perangkat / USB Capture Card (`cameraSource = "webcam"`)**
   - Menggunakan `navigator.mediaDevices.getUserMedia` langsung dari browser.
   - Mendukung webcam laptop, kamera iPad, maupun kamera mirrorless/DSLR yang dihubungkan melalui **HDMI-to-USB Capture Card** (`USB Video`) atau aplikasi seperti **EOS Webcam Utility** / **Sony USB Streaming**.
   - Pengguna/operator dapat memilih perangkat video secara langsung di bagian bawah *viewfinder* pada layar persiapan Kiosk.
2. **📡 Kamera Server Backend (`cameraSource = "server"`)**
   - Mengambil *live view* dari endpoint backend (`GET /camera/preview-frame` / `GET /camera/stream`) dan memicu shutter fisik kamera melalui backend saat `POST /session/{id}/capture` dipanggil.
   - Kiosk **otomatis beralih ke mode `server`** apabila backend mendeteksi kamera Wi-Fi fisik sedang terhubung (`driver === "wifi" && hardware_reachable === true`).

### B. Driver Kamera Backend (`backend/app/services/camera/`)
1. **`simulation` (`SimulatedCamera` — `simulated.py`)**:
   - Menghasilkan gambar sintetis `1800x1200` untuk pengujian otomatis (`pytest`) atau pengembangan tanpa kamera.
2. **`gphoto` (`GPhotoCamera` — `gphoto.py`)**:
   - Menggunakan CLI `gphoto2` untuk kamera DSLR/Mirrorless via kabel USB di Linux.
3. **`wifi` (`WifiCamera` — `wifi.py`)**:
   - Mendukung kamera nirkabel melalui 2 protokol:
     - `sony_http`: **Sony Camera Remote API** melalui HTTP JSON-RPC.
     - `ptpip`: **PTP/IP Wireless** melalui `gphoto2 --port ptpip:<IP>`.

---

## 3. Catatan Teknis Khusus Sony Alpha a6400 (`ILCE-6400`) via Wi-Fi

Berdasarkan hasil *debugging* langsung terhadap unit fisik **Sony Alpha a6400 (`SSID: DIRECT-sFE1:ILCE-6400`)**, berikut adalah spesifikasi teknis yang telah diimplementasikan di `backend/app/services/camera/wifi.py`:

1. **Alamat IP & Port Kamera**:
   - Saat fitur **Menu → Network1 → Ctrl w/ Smartphone** diaktifkan pada Sony a6400, kamera membuat hotspot Wi-Fi Direct dengan IP gateway **`192.168.122.1`**.
   - Berbeda dengan seri Sony lawas (yang memakai port `8080`), firmware **Sony ILCE-6400 membuka endpoint JSON-RPC pada port `10000`**:
     - Endpoint RPC: `POST http://192.168.122.1:10000/sony/camera`
     - Endpoint Liveview & Unduh Foto: Port **`60152`** (`http://192.168.122.1:60152/liveviewstream?...` dan `http://192.168.122.1:60152/pict...JPG`)
   - `WifiCamera.connect()` secara otomatis memindai port `[wifi_port, 10000, 8080]` sehingga kompatibel baik untuk a6400 (`10000`) maupun seri Sony Alpha lainnya (`8080`).

2. **Urutan Wajib Pemicu Shutter (`actHalfPressShutter` → `actTakePicture` → `cancelHalfPressShutter`)**:
   - Pada Sony a6400, memanggil `actTakePicture` secara langsung tanpa *half-press* akan ditolak oleh kamera dengan error `{"error": [40400, ""]}` karena status fokus berada pada `Not Focusing`.
   - Oleh karena itu, `WifiCamera._capture_sony_http()` menjalankan urutan:
     1. `actHalfPressShutter` (mengunci fokus/metering selama ~0.35 detik)
     2. `actTakePicture` (melepas shutter; jika mengembalikan kode `40403` *Long shooting*, otomatis memanggil `awaitTakePicture`)
     3. `cancelHalfPressShutter` (selalu dipanggil di blok `finally`)
     4. Mengunduh file JPEG hasil jepretan dari URL yang dikembalikan kamera ke `storage/captures/`.

3. **Background Liveview Streamer (~25 FPS)**:
   - Stream `liveviewstream` pada Sony a6400 adalah aliran HTTP chunked kontinu. Jika koneksi HTTP ditutup setiap kali meminta 1 frame, kamera akan menghentikan sesi *liveview*.
   - `WifiCamera._liveview_loop()` menjalankan *background daemon thread* yang menjaga satu koneksi terbuka ke `liveviewstream`, mengekstrak paket JPEG (`0xFFD8` s/d `0xFFD9`) secara *real-time* (~39 ms per frame / 25 FPS), dan menyimpannya di memori (`_latest_liveview_jpeg`).
   - Saat sesi pengambilan foto berlangsung (`_capture_in_progress`), pembacaan *liveview* dijeda sejenak agar tidak berebut *bandwidth* dengan proses unduh foto shutter, lalu dilanjutkan kembali secara otomatis untuk pose berikutnya.

4. **Pergantian Driver Runtime via API & Admin UI**:
   - Endpoint `POST /camera/config` (`backend/app/api/camera.py`) dan panel **CAMERA** di `/admin` (`frontend/components/admin/CameraStatus.tsx`) memungkinkan operator mengganti driver (`simulation`, `gphoto`, `wifi`), IP, dan port tanpa perlu me-restart container Docker.

---

## 4. Cara Build, Menjalankan, dan Menguji Sistem

### A. Menjalankan dengan Docker Compose (Direkomendasikan)
```bash
docker compose up -d --build
```
- **Layar Kiosk Pelanggan**: `http://localhost:3000`
- **Halaman Admin Operator**: `http://localhost:3000/admin`
- **Halaman Galeri Unduh Tamu**: `http://localhost:3000/share/<session_id>`
- **Backend REST API & Swagger Docs**: `http://localhost:8000/docs`

### B. Menjalankan Pengujian Otomatis (`pytest`)
```bash
python -m pytest -v
```
Saat ini terdapat **28 pengujian otomatis** (Unit, API, dan E2E Simulation) yang mencakup:
- `tests/api/test_camera_api.py` (status kamera, capture, disconnect/connect, runtime switch ke `wifi`)
- `tests/api/test_printer_and_db_api.py` (template, custom PNG overlay upload/delete, QRIS payment, voucher, cloud sync, GIF generation, liveview frame)
- `tests/api/test_session_api.py` (alur sesi, webcam base64 capture, retake, conflict, abort)
- `tests/unit/test_camera_service.py` (`SimulatedCamera` & `WifiCamera` Sony HTTP RPC + fallback)
- `tests/unit/test_image_processor.py` (semua layout strip, filter baru, stiker, dan animasi GIF)
- `tests/unit/test_session_manager.py` & `tests/simulation/test_e2e_session_flow.py`

---

## 5. Peta File Penting yang Ditambahkan / Diperbarui

| File | Deskripsi Perubahan |
| :--- | :--- |
| `backend/app/services/camera/wifi.py` | **Baru**: Driver `WifiCamera` untuk Sony Camera Remote HTTP JSON-RPC (`192.168.122.1:10000`) & PTP/IP (`gphoto2`). |
| `backend/app/services/camera/__init__.py` | Registrasi driver `wifi` dan fungsi `configure_camera_service()` untuk pergantian driver saat runtime. |
| `backend/app/api/camera.py` | Endpoint `POST /camera/config`, `GET /camera/preview-frame`, dan `GET /camera/stream` (MJPEG). |
| `backend/app/services/image/processor.py` | Fungsi `compose_gif()`, filter `beauty`/`cool`/`y2k`, `STICKER_OPTIONS`, serta upload/komposisi custom PNG overlay. |
| `backend/app/api/printer.py` | Endpoint `POST /templates/{id}/overlay` dan `DELETE /templates/{id}/overlay`. |
| `backend/app/api/session.py` | Endpoint pembayaran QRIS (`/session/payment/qris`), validasi voucher (`/session/payment/voucher`), dan `/cloud-sync`. |
| `backend/app/services/storage/database.py` | Penyimpanan & migrasi otomatis kolom `gif_path`, `sticker_id`, dan `cloud_share_url` di SQLite. |
| `frontend/lib/sound.ts` | **Baru**: Synthesizer efek suara Web Audio API (beep hitung mundur, klik shutter, chime selesai). |
| `frontend/components/kiosk/PaymentModal.tsx` | **Baru**: Modal gerbang pembayaran QRIS & Kode Voucher Kasir. |
| `frontend/app/share/[sessionId]/page.tsx` | **Baru**: Microsite galeri digital tamu untuk mengunduh Strip JPEG, Boomerang GIF, dan foto per-pose di HP. |
| `frontend/components/admin/CameraStatus.tsx` | Form pengaturan koneksi kamera (`simulation`, `gphoto` USB, `wifi` Sony a6400) di halaman Admin. |
| `frontend/components/admin/TemplateManager.tsx` | Pengaturan upload PNG overlay per-template, harga QRIS, daftar kode voucher, dan efek suara. |
| `frontend/components/kiosk/PreparationScreen.tsx` | Tombol pemilih sumber kamera (`Kamera Perangkat / USB Capture Card` vs `Kamera Server Wi-Fi`) dan pemilih perangkat video. |
| `frontend/components/kiosk/CountdownOverlay.tsx` | Tombol **Jepret Sekarang 📸** untuk memicu shutter segera tanpa menunggu hitung mundur selesai. |
