# Panduan Integrasi Kamera Canon EOS 700D

Sistem mendukung dua driver kamera melalui [`CameraInterface`](file:///c:/Users/ASUS%20TUF%20F15/dryu-booth/backend/app/services/camera/base.py):
1. **`SimulatedCamera`** (`CAMERA_DRIVER=simulation`): Menghasilkan gambar uji 1800x1200 (rasio 3:2) menggunakan Pillow.
2. **`GPhotoCamera`** (`CAMERA_DRIVER=gphoto`): Mengendalikan Canon EOS 700D fisik melalui `gphoto2` pada Ubuntu Server.

---

## Langkah Verifikasi di Ubuntu Server
1. Pastikan kamera menyala, mode dial diatur ke **M (Manual)** atau **Av**, dan Auto Power Off dinonaktifkan di menu kamera.
2. Hubungkan kabel USB Mini-B data dari Canon EOS 700D ke Mini PC / VM.
3. Hentikan proses daemon `gvfs-gphoto2-volume-monitor` jika ada agar tidak mengunci USB:
   ```bash
   pkill -f gphoto2
   ```
4. Uji deteksi:
   ```bash
   gphoto2 --auto-detect
   ```
5. Uji jepret dan unduh:
   ```bash
   gphoto2 --capture-image-and-download --filename=test.jpg
   ```
