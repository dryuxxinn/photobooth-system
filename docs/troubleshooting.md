# Panduan Troubleshooting - Dryu Photobooth

| Gejala / Masalah | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| **`Could not claim the USB device` pada gPhoto2** | Proses OS (`gvfs-gphoto2`) atau aplikasi EOS Utility di Windows mengunci USB kamera. | Tutup EOS Utility di Windows, atau jalankan `pkill -f gphoto2` di Ubuntu. |
| **Kamera gagal memotret (fokus terus mencari)** | Lensa berada di mode AF (Auto Focus) dalam kondisi kurang cahaya atau jarak terlalu dekat. | Ubah sakelar fokus di lensa Canon ke **MF (Manual Focus)** setelah titik fokus dikunci pada kursi/area subjek. |
| **Sesi terkunci di status `ERROR` atau `CAPTURING`** | Koneksi terputus di tengah sesi. | Buka **Panel Operator** di pojok kanan atas UI Kiosk lalu klik **Force Reset Sesi ke IDLE**, atau panggil `POST /session/reset`. |
| **iPad tidak bisa mengakses UI Kiosk** | Firewall host memblokir port `3000` atau `8000`, atau VM masih memakai NAT bukan Bridged Adapter. | Ubah network VM ke **Bridged Adapter** dan pastikan port `3000` & `8000` terbuka di LAN. |
