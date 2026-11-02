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
