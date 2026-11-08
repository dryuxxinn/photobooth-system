# Panduan Integrasi Printer Foto (CUPS)

Sistem mendukung dua driver printer melalui [`PrinterInterface`](file:///c:/Users/ASUS%20TUF%20F15/dryu-booth/backend/app/services/printer/base.py):
1. **`SimulatedPrinter`** (`PRINTER_DRIVER=simulation`): Mensimulasikan pencetakan dan sisa kertas untuk pengujian.
2. **`CupsPrinter`** (`PRINTER_DRIVER=cups`): Mengirim dokumen ke spooler CUPS Linux menggunakan perintah `lp` dan memeriksa status via `lpstat`.

---

## Setup CUPS di Ubuntu Server
```bash
sudo apt update
sudo apt install -y cups printer-driver-gutenprint
sudo usermod -aG lpadmin $USER
```

Periksa nama antrean printer:
```bash
lpstat -p -d
```
Lalu sesuaikan variabel `PRINTER_NAME` pada `.env` atau `docker-compose.yml`.

---

## Catatan Perubahan Signifikan Fitur Pencetakan & Template Overlay

| Fitur / Komponen | Perubahan Signifikan | Penjelasan & Rincian Teknis |
| :--- | :--- | :--- |
| **Multi-Copy Printing** | Dukungan parameter `copies` pada `POST /print` | Pelanggan/operator dapat mencetak 1 hingga 4 rangkap strip sekaligus dengan tracking `print_jobs` di SQLite. |
| **Custom PNG Frame Overlay** | Integrasi PNG transparan ke proses cetak | Sebelum dikirim ke antrean cetak, `ImageProcessor._apply_custom_png_overlay()` menumpuk desain bingkai kustom event tepat di atas kanvas strip. |
| **Twin-Strip Split & Cut** | Dukungan layout strip ganda (2x6 inci) | Template twin-strip menduplikasi strip foto secara horizontal sehingga ketika dicetak di kertas 4x6 inci dapat dipotong menjadi dua strip identik. |
| **Spooler State Tracking** | Pencatatan status `print_jobs` di DB | Setiap pekerjaan cetak dicatat dengan status `QUEUED`, `PRINTING`, `COMPLETED`, atau `ERROR` yang dapat dipantau dari `/admin`. |
