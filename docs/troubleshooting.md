# Panduan Troubleshooting — Dryu Photobooth

| Gejala / Masalah | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| **Kamera Sony a6400 via Wi-Fi berstatus `Wi-Fi Standby / Sim Fallback` (`hardware_reachable: false`)** | Wi-Fi Laptop/Server belum terhubung ke hotspot Wi-Fi Direct kamera Sony (`DIRECT-xxxx:ILCE-6400`), atau fitur *Ctrl w/ Smartphone* di kamera belum aktif. | 1. Pada Sony a6400: buka **Menu → Network1 → Ctrl w/ Smartphone → Connection**.<br>2. Hubungkan Wi-Fi PC ke SSID `DIRECT-xxxx:ILCE-6400`.<br>3. Di halaman `/admin`, klik **Simpan & Hubungkan Kamera** (IP `192.168.122.1`, Port `10000`). |
| **Sony a6400 gagal memotret (Error `40400` pada `actTakePicture`)** | Kamera membutuhkan penguncian fokus (`actHalfPressShutter`) terlebih dahulu, atau lensa gagal mengunci AF karena kondisi terlalu gelap / tutup lensa belum dibuka. | Driver `WifiCamera` sudah otomatis menjalankan `actHalfPressShutter` sebelum `actTakePicture`. Jika ruangan sangat gelap, gunakan mode **MF (Manual Focus)** pada lensa Sony a6400. |
| **Kamera di layar Kiosk menampilkan gambar ilustrasi simulasi, bukan kamera asli** | Sumber kamera di Kiosk sedang berada di mode `Kamera Server` saat kamera Wi-Fi belum terhubung, atau di Windows terpilih input `USB Video` yang sedang tidak aktif. | Pada layar persiapan Kiosk (`READY, CUTIES?`), klik tombol **📷 Kamera Perangkat / USB Capture Card** lalu pilih **`USB2.0 HD UVC WebCam`** (atau perangkat kamera yang aktif), atau sambungkan Wi-Fi ke Sony a6400 untuk mode **📡 Kamera Server (Wi-Fi Sony)**. |
| **`Could not claim the USB device` pada gPhoto2 (Linux)** | Proses OS (`gvfs-gphoto2`) atau aplikasi lain mengunci USB kamera. | Jalankan `pkill -f gphoto2` di terminal Ubuntu Server. |
| **Sesi terkunci di status `ERROR` atau `CAPTURING`** | Koneksi terputus di tengah sesi pengambilan foto. | Buka halaman **`/admin`** lalu klik **Force Reset ke IDLE** di bilah kiri, atau tahan tombol status di pojok kanan bawah layar Kiosk untuk membuka modal operator. |
| **Perubahan kode tidak terlihat saat mengakses `localhost:3000` atau `localhost:8000`** | Aplikasi berjalan di dalam kontainer Docker yang masih menggunakan *image build* lama. | Jalankan `docker compose up -d --build` lalu tekan `Ctrl + F5` di browser. |

---

## Catatan Perubahan & Debugging Signifikan

| Masalah yang Terjadi | Akar Masalah | Solusi & Perubahan Kode yang Diterapkan |
| :--- | :--- | :--- |
| **Layar kamera freeze setelah foto ke-1** | Kondisi `latestSrc && mode === "capturing"` di `CameraPreview.tsx` menahan foto pertama terus-menerus. | Memperbaiki kondisi rendering di `CameraPreview.tsx` agar liveview kembali aktif segera setelah pose ke-1 selesai ditinjau. |
| **Kiosk terkunci ke capture card kosong** | `useWebcam.ts` secara otomatis memilih perangkat yang berlabel capture card sekalipun sinyal HDMI mati. | Menghapus auto-selection agresif dan menambahkan fallback otomatis ke webcam perangkat default yang menyala. |
| **Sony a6400 menolak jepretan (Code 40400)** | Shutter `actTakePicture` dipanggil saat status fokus `Not Focusing`. | Menambahkan `actHalfPressShutter` selama ~0.35 detik sebelum melepas shutter fisik, diakhiri `cancelHalfPressShutter`. |
| **Liveview Sony a6400 terputus** | `liveviewstream` di port 60152 adalah HTTP chunked kontinu; membuka-tutup koneksi per frame menyebabkan kamera mematikan stream. | Menggunakan background worker thread yang membaca stream kontinu non-stop dan menyimpan frame JPEG ke memori (`_latest_liveview_jpeg`). |
| **HTTP 405 pada upload custom overlay** | Static files dipasang pada `/templates` sehingga menabrak endpoint REST `POST /templates/{id}/overlay`. | Memindahkan static mount ke `/template-assets` di `backend/app/main.py`. |
