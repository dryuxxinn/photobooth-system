# Panduan Integrasi Kamera (Wi-Fi Sony a6400, Capture Card, & USB gPhoto2)

Sistem Dryu Photobooth menyediakan **Hardware Abstraction Layer (HAL)** melalui [`CameraInterface`](file:///c:/Users/ASUS%20TUF%20F15/dryu-booth/backend/app/services/camera/base.py) di backend serta integrasi `useWebcam` di frontend sehingga mendukung **4 metode koneksi kamera**:

1. **Nirkabel / Wi-Fi Direct Sony Alpha a6400 (`WifiCamera` — `CAMERA_DRIVER=wifi`, `protocol=sony_http`)**
2. **Nirkabel PTP/IP (`WifiCamera` — `CAMERA_DRIVER=wifi`, `protocol=ptpip`)**
3. **Browser Webcam / HDMI-to-USB Capture Card (`cameraSource = "webcam"`)**
4. **Kabel USB Tethering DSLR (`GPhotoCamera` — `CAMERA_DRIVER=gphoto`)**

---

## 1. Koneksi Nirkabel (Tanpa USB) untuk Sony Alpha a6400 (`ILCE-6400`)

Driver [`WifiCamera`](file:///c:/Users/ASUS%20TUF%20F15/dryu-booth/backend/app/services/camera/wifi.py) telah diuji dan dikalibrasi langsung terhadap unit fisik **Sony Alpha a6400 (`ILCE-6400`)**.

### Langkah Persiapan pada Kamera Sony a6400:
1. Buka **Menu** → tab **Network1** → pilih **Ctrl w/ Smartphone**.
2. Ubah **Ctrl w/ Smartphone** menjadi **On**, lalu pilih **Connection**.
3. Layar kamera akan menampilkan SSID Wi-Fi Direct (contoh: `DIRECT-sFE1:ILCE-6400`) beserta password-nya.
4. Sambungkan Wi-Fi Laptop / Mini-PC Server ke SSID `DIRECT-xxxx:ILCE-6400` tersebut.
   - Kamera Sony otomatis bertindak sebagai gateway di alamat IP **`192.168.122.1`**.
   - Endpoint JSON-RPC Sony a6400 berjalan di **port `10000`** (`http://192.168.122.1:10000/sony/camera`), sedangkan stream *liveview* dan unduhan JPEG berjalan di **port `60152`**.

### Detail Teknis Driver `WifiCamera` (`sony_http`):
- **Auto-Discovery Port**: Otomatis memindai port `10000` (standar Sony a6400/a6100/a6600/a7III) dan `8080` (standar Sony a6000/a5100/a7).
- **Liveview 25 FPS Non-Stop**: Menjalankan *background daemon thread* (`_liveview_loop`) yang menjaga koneksi stream ke `http://192.168.122.1:60152/liveviewstream` dan mengekstrak *frame* JPEG setiap ~39 ms.
- **Urutan Shutter Wajib Sony a6400**:
  1. `actHalfPressShutter` (mengunci fokus/metering selama ~0.35 detik agar kamera tidak menolak dengan kode error `40400`)
  2. `actTakePicture` (atau `awaitTakePicture` jika kode `40403` *Long shooting*)
  3. `cancelHalfPressShutter` (melepas setengah-tekanan shutter)
  4. Mengunduh file JPEG langsung dari URL kamera ke `storage/captures/`.

---

## 2. Koneksi via HDMI-to-USB Capture Card / Webcam (`cameraSource = "webcam"`)

Jika menggunakan **HDMI Capture Card (Cam Link / USB Video Dongle)**, **EOS Webcam Utility**, **Sony USB Streaming**, atau webcam bawaan perangkat:
1. Hubungkan perangkat ke port USB laptop/iPad.
2. Pada layar persiapan Kiosk (`READY, CUTIES?`), klik tombol **📷 Kamera Perangkat / USB Capture Card** di bawah tampilan kamera.
3. Pilih perangkat yang sesuai dari daftar tombol yang muncul (misal: `USB2.0 HD UVC WebCam`, `USB Video`, atau `EOS Webcam Utility`).

---

## 3. Koneksi Kabel USB Tethering DSLR di Linux (`CAMERA_DRIVER=gphoto`)

Untuk kamera Canon EOS (mis. Canon EOS 700D) melalui kabel USB di Ubuntu Server:
1. Pastikan kamera menyala, mode dial diatur ke **M (Manual)** atau **Av**, dan *Auto Power Off* dinonaktifkan.
2. Hentikan proses daemon `gvfs-gphoto2-volume-monitor` jika ada agar tidak mengunci USB:
   ```bash
   pkill -f gphoto2
   ```
3. Uji deteksi dan jepretan:
   ```bash
   gphoto2 --auto-detect
   gphoto2 --capture-image-and-download --filename=test.jpg
   ```

---

## 4. Catatan Perubahan Signifikan Fitur Kamera

| Komponen | Perubahan Signifikan | Dampak & Solusi Teknis |
| :--- | :--- | :--- |
| **`WifiCamera`** | Penambahan driver nirkabel untuk Sony Alpha via JSON-RPC (`sony_http`) & PTP/IP (`ptpip`). | Mengeliminasi kebutuhan kabel USB tethering pada kamera mirrorless Sony. |
| **Port Detection** | Pemindaian otomatis port `10000` dan `8080`. | Sony ILCE-6400 menggunakan port `10000` untuk JSON-RPC dan port `60152` untuk liveview/file; sistem otomatis mendeteksi tanpa konfigurasi manual rumit. |
| **Shutter Sequence** | Penambahan `actHalfPressShutter` sebelum `actTakePicture`. | Menyelesaikan error `40400` pada a6400 yang menolak jepretan jika fokus belum terkunci. |
| **Liveview Streamer** | Background worker thread membaca HTTP stream kontinu ~25 FPS. | Mengatasi pemutusan live view kamera dan menyediakan frame live instan via `GET /camera/preview-frame`. |
| **Runtime Config** | Endpoint `POST /camera/config` dan UI Admin CameraStatus. | Operator dapat berganti driver kamera (`simulation`, `gphoto`, `wifi`) tanpa restart server. |
| **Kiosk UVC Fallback** | Auto-fallback ke kamera aktif di `useWebcam.ts`. | Mencegah layar Kiosk kosong jika device ID yang tersimpan (mis. USB capture card) dicabut. |
