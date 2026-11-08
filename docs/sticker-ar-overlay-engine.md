# Sweet Studio — Sticker & AR Overlay Engine

**Dokumentasi Arsitektur dan Perancangan Sistem**

| Informasi | Detail |
|---|---|
| Project | Sweet Studio |
| Module | Sticker & AR Overlay Engine |
| Document Version | 1.0 |
| Status | Architecture Design |
| Architecture | Hybrid AR Effects |
| Primary Tracking | Face Tracking |
| Backend | Python + FastAPI |
| Frontend | Next.js + React |
| Image Processing | MediaPipe + OpenCV + Pillow |
| Database | SQLite |

---

# 1. Overview

## 1.1 Latar Belakang

Sweet Studio merupakan aplikasi photobooth digital yang dirancang untuk memberikan pengalaman foto interaktif dengan konsep visual sweet, cute, pastel, dan Korean-inspired.

Selain fitur pengambilan foto dan color filters, aplikasi membutuhkan sistem dekorasi foto yang memungkinkan pengguna menambahkan berbagai objek visual ke dalam hasil foto.

Objek tersebut dapat berupa:

- Glitter dan sparkle.
- Bintang yang melayang.
- Floating hearts.
- Emoji dan emoticon.
- Bunny ears.
- Kacamata.
- Crown dan hair accessories.
- Blush dan face decorations.
- Flowers, ribbons, dan doodle.

Untuk memenuhi kebutuhan tersebut, dikembangkan modul **Sticker & AR Overlay Engine**.

Modul ini bertanggung jawab mengelola asset dekorasi, mendeteksi wajah, menghitung posisi objek, dan menggabungkan objek visual dengan foto.

## 1.2 Tujuan

Tujuan utama modul:

1. Menyediakan sistem penempatan sticker otomatis berdasarkan wajah.
2. Mendukung dekorasi foto secara manual.
3. Mendukung beberapa wajah dalam satu foto.
4. Menyediakan sistem asset yang mudah diperluas.
5. Mendukung efek statis dan animasi.
6. Menghasilkan foto final berkualitas tinggi.
7. Menjaga konsistensi antara preview dan final rendering.
8. Memisahkan pengelolaan sticker dari sistem color filter dan template.

## 1.3 Prinsip Perancangan

Sistem menggunakan prinsip berikut:

- **Face-first:** deteksi wajah merupakan prioritas utama.
- **Hybrid:** menggabungkan face-anchored, decorative, dan animated effects.
- **Asset-driven:** penambahan sticker tidak memerlukan perubahan algoritma inti.
- **Non-destructive:** foto asli tidak pernah dimodifikasi.
- **Reusable:** satu asset dapat digunakan pada berbagai preset.
- **Consistent rendering:** konfigurasi preview dan hasil final menggunakan sumber koordinat yang sama.
- **Extensible:** sistem dapat dikembangkan untuk body tracking dan fitur AR lainnya.

---

# 2. Scope Sistem

## 2.1 Fitur yang Termasuk

| Fitur | Deskripsi |
|---|---|
| Face Detection | Mendeteksi satu atau beberapa wajah |
| Face Landmark | Mengidentifikasi titik-titik wajah |
| Face Anchoring | Menentukan posisi sticker berdasarkan wajah |
| Sticker Management | Mengelola asset sticker |
| Decorative Overlay | Menambahkan objek dekoratif |
| Multi-face Support | Mendukung banyak wajah |
| Manual Placement | Mengatur posisi objek secara manual |
| Sticker Transformation | Mengubah ukuran, posisi, dan rotasi |
| Layer Management | Mengatur urutan objek |
| Static Rendering | Menghasilkan gambar final |
| Animated Preview | Menampilkan efek bergerak |
| Asset Manifest | Mengelola metadata sticker |

## 2.2 Di Luar Scope Tahap Awal

Fitur berikut tidak termasuk implementasi awal:

- Full 3D face tracking.
- Body pose tracking.
- Real-time facial expression recognition.
- AI generative sticker.
- Automatic background replacement.
- Advanced beauty retouching.
- Real-time video recording.

Fitur tersebut dapat dipertimbangkan pada pengembangan berikutnya.

---

# 3. System Architecture

## 3.1 Gambaran Umum

Arsitektur menggunakan pendekatan client-server.

Frontend berjalan pada iPad sebagai kiosk interface, sedangkan proses analisis wajah dan final image rendering dilakukan pada Mini PC Ubuntu.

### Arsitektur

```text
Canon EOS 700D
      |
      v
Camera Service
      |
      v
Original Image Storage
      |
      v
FastAPI Backend
      |
      v
AR Processing Engine
      |
      +----------------------+
      |                      |
      v                      v
Face Detection         Sticker Manager
      |                      |
      v                      |
Face Landmark                |
      |                      |
      v                      |
Anchor Calculation           |
      |                      |
      +----------+-----------+
                 |
                 v
          Positioning Engine
                 |
                 v
          Compositing Engine
                 |
                 v
          Rendering Pipeline
                 |
        +--------+--------+
        |        |        |
        v        v        v
      Preview  Storage   Printing
```

## 3.2 Pembagian Tanggung Jawab

| Komponen | Tanggung Jawab |
|---|---|
| Camera Service | Mengambil foto dari EOS 700D |
| Session Service | Mengelola sesi pengguna |
| Face Detector | Mendeteksi wajah |
| Landmark Processor | Mengolah landmark wajah |
| Anchor Engine | Menghasilkan koordinat anchor |
| Sticker Manager | Mengelola asset sticker |
| Positioning Engine | Menghitung posisi dan transformasi |
| Decorative Engine | Mengatur objek dekoratif |
| Compositor | Menggabungkan foto dan objek |
| Preview Renderer | Menampilkan preview |
| Final Renderer | Menghasilkan foto final |

---

# 4. Technology Stack

| Teknologi | Fungsi |
|---|---|
| Python | Backend processing |
| FastAPI | REST API |
| MediaPipe Face Landmarker | Face detection dan landmark |
| OpenCV | Image processing |
| Pillow | Image compositing |
| NumPy | Manipulasi pixel dan koordinat |
| Pydantic | Validasi konfigurasi |
| Next.js | Frontend |
| React | UI component |
| Canvas 2D | Interactive AR preview |
| SQLite | Penyimpanan metadata |

## 4.1 MediaPipe Face Landmarker

MediaPipe digunakan untuk memperoleh landmark wajah.

Kegunaan:

- Mengidentifikasi posisi mata.
- Mengidentifikasi posisi hidung.
- Mengidentifikasi posisi mulut.
- Mengidentifikasi kontur wajah.
- Memperkirakan posisi bagian atas wajah.
- Mendukung analisis beberapa wajah.

Mode awal yang digunakan adalah IMAGE karena sistem utama memproses foto hasil capture.

Mode VIDEO dapat digunakan pada pengembangan live AR preview.

Dokumentasi: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

## 4.2 Pillow dan OpenCV

Pillow digunakan untuk:

- Membaca dan mengolah gambar.
- Menempelkan PNG transparan.
- Mengatur opacity.
- Mengubah ukuran sticker.
- Menghasilkan gambar final.

OpenCV digunakan untuk:

- Image processing.
- Transformasi gambar.
- Masking.
- Analisis visual tambahan.

## 4.3 Canvas 2D

Canvas digunakan di frontend untuk:

- Menampilkan sticker.
- Drag and drop.
- Resize.
- Rotation.
- Layer preview.
- Animated effects.

Dokumentasi: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

# 5. Face Detection System

## 5.1 Konsep

Face Detection System bertugas mendeteksi wajah pada foto dan menghasilkan data landmark yang digunakan oleh Anchor Engine.

Proses:

1. Membaca foto.
2. Memperbaiki orientasi berdasarkan EXIF.
3. Menyesuaikan input untuk analisis.
4. Menjalankan MediaPipe Face Landmarker.
5. Mengambil koordinat landmark.
6. Menghitung bounding box.
7. Menghasilkan data wajah.
8. Mengirim hasil analisis kepada Anchor Engine.

## 5.2 Face Landmark

Landmark merupakan titik koordinat yang merepresentasikan bagian wajah.

Contoh bagian wajah:

- Left eye.
- Right eye.
- Nose.
- Mouth.
- Forehead region.
- Left cheek.
- Right cheek.
- Chin.
- Face contour.

Sistem menggunakan normalized coordinates dengan rentang 0.0–1.0.

Contoh:

```json
{
  "face_id": 0,
  "anchors": {
    "eyes_center": [0.5, 0.4],
    "nose": [0.5, 0.55],
    "mouth": [0.5, 0.68],
    "head_top": [0.5, 0.15]
  }
}
```

Nilai di atas merupakan ilustrasi struktur data, bukan hasil deteksi aktual.

## 5.3 Multi-face Detection

Sistem harus mampu mendeteksi beberapa wajah dalam satu foto.

Kebutuhan:

- Menentukan jumlah wajah.
- Memberikan ID sementara untuk setiap wajah.
- Menyimpan landmark masing-masing wajah.
- Menghubungkan sticker dengan wajah tertentu.
- Mendukung penerapan sticker ke semua wajah.

ID wajah hanya berlaku untuk hasil analisis satu foto dan tidak boleh dianggap sebagai identitas permanen seseorang.

---

# 6. Face Anchor System

## 6.1 Konsep Anchor

Anchor adalah titik referensi yang digunakan untuk menempatkan sticker secara otomatis.

Contoh:

| Anchor | Penggunaan |
|---|---|
| head_top | Bunny ears, crown |
| forehead | Hair accessories |
| left_eye | Eye decoration |
| right_eye | Eye decoration |
| eyes_center | Glasses |
| nose | Nose sticker |
| left_cheek | Blush, heart |
| right_cheek | Blush, heart |
| mouth | Mouth decoration |
| chin | Decorative effects |
| face_center | Floating effects |

Anchor tersebut merupakan abstraksi internal sistem yang dipetakan ke landmark MediaPipe.

## 6.2 Perhitungan Geometri

Sistem menggunakan jarak dan sudut antar-landmark.

Contoh perhitungan jarak:

d = √((x2 - x1)² + (y2 - y1)²)

Contoh perhitungan rotasi:

θ = atan2(y2 - y1, x2 - x1)

Kegunaan:

- Menghitung ukuran kacamata berdasarkan jarak mata.
- Mengatur rotasi sticker berdasarkan kemiringan wajah.
- Menyesuaikan ukuran bunny ears berdasarkan lebar wajah.
- Mengatur posisi dekorasi pipi.

## 6.3 Head Top Estimation

Posisi head_top pada tahap awal merupakan estimasi geometris.

Sistem tidak boleh menganggap bounding box wajah sebagai batas rambut atau kepala yang sebenarnya.

Pengembangan selanjutnya dapat menggunakan estimasi kontur kepala, orientasi wajah, dan margin khusus setiap asset.

---

# 7. Sticker Asset Management

## 7.1 Konsep

Sticker Asset Management mengatur seluruh file dekorasi yang tersedia dalam Sweet Studio.

Penambahan sticker baru harus dapat dilakukan tanpa mengubah algoritma inti.

Setiap asset memiliki:

- ID.
- Nama.
- Kategori.
- Lokasi file.
- Jenis penempatan.
- Anchor.
- Skala.
- Offset.
- Rotasi.
- Opacity.
- Z-index.
- Status aktif.

## 7.2 Kategori Sticker

| Kategori | Contoh |
|---|---|
| Face Accessories | Bunny, crown, glasses |
| Face Decorations | Blush, hearts |
| Floating Objects | Stars, glitter, emojis |
| Decorative Objects | Flowers, ribbons, doodles |
| Animated Effects | Twinkle, floating hearts |

## 7.3 Format Asset

Format yang disarankan:

- PNG RGBA sebagai format utama.
- WebP transparan untuk asset yang mendukungnya.
- Sprite sheet untuk animasi.
- Frame sequence untuk animasi khusus.

Asset harus memiliki transparansi yang benar dan resolusi yang memadai untuk kebutuhan cetak.

## 7.4 Asset Directory

```text
assets/
└── overlays/
    ├── manifest.json
    ├── face-accessories/
    │   ├── bunny/
    │   ├── glasses/
    │   └── crown/
    │
    ├── face-decorations/
    │   ├── blush/
    │   └── hearts/
    │
    ├── floating/
    │   ├── stars/
    │   ├── glitter/
    │   └── emojis/
    │
    ├── decorative/
    │   ├── flowers/
    │   └── ribbons/
    │
    └── animated/
        ├── sparkles/
        └── hearts/
```

## 7.5 Asset Manifest

Setiap asset harus memiliki konfigurasi.

Contoh:

```json
{
  "id": "pink_bunny",
  "name": "Pink Bunny",
  "category": "face-accessories",
  "type": "face-anchored",
  "asset": "face-accessories/bunny/pink_bunny.png",
  "anchor": "head_top",
  "placement": {
    "scale": 1.5,
    "offset_x": 0,
    "offset_y": -0.08,
    "rotation_offset": 0
  },
  "render": {
    "opacity": 1.0,
    "z_index": 20,
    "fit": "contain"
  },
  "enabled": true
}
```

Nilai konfigurasi harus divalidasi sebelum digunakan.

---

# 8. Sticker Positioning Engine

## 8.1 Jenis Penempatan

Sistem mendukung tiga metode utama.

### A. Face Anchored

Objek mengikuti posisi wajah.

Contoh:

- Bunny ears.
- Glasses.
- Crown.
- Blush.
- Face decorations.

### B. Canvas Position

Objek ditempatkan menggunakan koordinat relatif terhadap keseluruhan foto.

Contoh:

- Frame decorations.
- Corner stickers.
- Fixed ornaments.

### C. Random Scatter

Objek disebarkan secara otomatis berdasarkan seed.

Contoh:

- Glitter.
- Stars.
- Floating hearts.

## 8.2 Transformasi Sticker

Setiap sticker mendukung:

- Position.
- Scale.
- Rotation.
- Opacity.
- Z-index.

Ukuran objek harus dihitung berdasarkan anchor atau geometri yang relevan, bukan hanya ukuran foto.

## 8.3 Manual Positioning

Pengguna harus dapat mengubah posisi otomatis.

Interaksi:

- Drag.
- Resize.
- Rotate.
- Delete.
- Duplicate.
- Layer ordering.

Perubahan manual harus disimpan sebagai bagian dari konfigurasi foto.

## 8.4 Deterministic Positioning

Random scatter harus menggunakan seed.

Tujuannya agar posisi dekorasi tidak berubah ketika:

- Pengguna mengubah filter.
- Pengguna membuka kembali preview.
- Foto dirender ulang.
- Hasil final dicetak.

---

# 9. Decorative Overlay Engine

## 9.1 Fungsi

Decorative Overlay Engine menangani objek yang tidak harus mengikuti wajah.

Kategori:

- Glitter.
- Sparkles.
- Stars.
- Hearts.
- Emojis.
- Flowers.
- Doodles.

## 9.2 Avoid Face

Sistem perlu menyediakan opsi agar dekorasi tidak menutupi area wajah.

Tahap awal:

- Menggunakan bounding box wajah.
- Memberikan margin tambahan.
- Menghindari area tersebut ketika menentukan posisi objek.

Pengembangan lanjutan:

- Face contour masking.
- Region-based placement.
- Occlusion-aware placement.

## 9.3 Layering

Urutan rendering menggunakan z-index.

Contoh:

| Z-index | Elemen |
|---|---|
| 5 | Background decoration |
| 10 | Floating stars |
| 15 | Glitter |
| 20 | Bunny ears |
| 30 | Glasses |
| 40 | Face decoration |
| 50 | Foreground sparkle |

Z-index merupakan konfigurasi awal dan dapat disesuaikan per asset.

---

# 10. AR Editor Interface

## 10.1 Tujuan UI

AR Editor merupakan tempat pengguna mengatur dekorasi foto sebelum hasil dicetak.

Desain harus:

- Cute.
- Sweet.
- Pastel.
- Minimalist.
- Touch-friendly.
- Mudah digunakan pada layar iPad.

## 10.2 Layout

Komponen utama:

1. Photo Preview.
2. Sticker Gallery.
3. Category Selector.
4. Sticker Controls.
5. Layer Manager.
6. Undo/Redo.
7. Confirm Button.

## 10.3 Kategori Gallery

- All.
- Face Accessories.
- Face Decorations.
- Glitter.
- Hearts.
- Stars.
- Emojis.
- Flowers.
- Animated.

## 10.4 Interaksi

| Aksi | Perilaku |
|---|---|
| Select Sticker | Menambahkan sticker |
| Drag | Mengubah posisi |
| Pinch | Mengubah ukuran |
| Rotate | Mengubah rotasi |
| Delete | Menghapus sticker |
| Duplicate | Menggandakan sticker |
| Undo | Membatalkan perubahan |
| Redo | Mengulang perubahan |
| Confirm | Menyimpan konfigurasi |

## 10.5 Multi-face Selection

Jika terdapat beberapa wajah, UI menyediakan:

- Apply to all faces.
- Select individual face.
- Manual placement.

---

# 11. Animated Effects

## 11.1 Konsep

Animated Effects digunakan untuk membuat dekorasi bergerak.

Contoh:

- Twinkling stars.
- Floating hearts.
- Moving glitter.
- Floating emojis.

## 11.2 Teknologi

Frontend menggunakan Canvas 2D untuk animasi preview.

Backend dapat menggunakan frame sequence untuk membuat GIF atau video.

## 11.3 Format Animasi

- Sprite sheet.
- Frame sequence.
- GIF.
- MP4.

## 11.4 Perbedaan Static dan Animated

| Static | Animated |
|---|---|
| Untuk foto final | Untuk preview bergerak |
| PNG/WebP | Sprite sheet/frame |
| Pillow rendering | Canvas rendering |
| JPG/PNG export | GIF/MP4 export |

Untuk kebutuhan cetak, sistem mengambil representasi statis yang konsisten dari efek animasi.

---

# 12. Backend API Design

## 12.1 Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/ar/analyze | Analisis wajah |
| GET | /api/ar/assets | Daftar asset |
| GET | /api/ar/assets/{id} | Detail asset |
| POST | /api/ar/preview | Membuat preview |
| POST | /api/ar/render | Final rendering |
| GET | /api/ar/render/{id} | Mengambil hasil render |

## 12.2 Analyze Response

Contoh:

```json
{
  "success": true,
  "image_id": "photo_001",
  "faces": [
    {
      "face_id": 0,
      "anchors": {
        "head_top": [0.5, 0.15],
        "eyes_center": [0.5, 0.4],
        "nose": [0.5, 0.55],
        "mouth": [0.5, 0.68]
      }
    }
  ]
}
```

## 12.3 Render Request

Contoh:

```json
{
  "photo_id": "PHOTO-001",
  "effects": [
    {
      "asset_id": "pink_bunny",
      "face_id": 0,
      "anchor": "head_top",
      "scale": 1.5,
      "rotation": 0,
      "opacity": 1
    }
  ]
}
```

## 12.4 API Security

- Gunakan image ID, bukan path file bebas dari pengguna.
- Validasi seluruh asset ID.
- Batasi ukuran file.
- Validasi format gambar.
- Batasi akses storage.
- Terapkan timeout pemrosesan.
- Pisahkan API request dan worker rendering.
- Jangan mengeksekusi path dari konfigurasi asset yang tidak tervalidasi.

---

# 13. Rendering Pipeline

## 13.1 Tahapan

```text
Original Photo
      |
      v
EXIF Orientation Correction
      |
      v
Face Detection
      |
      v
Landmark Processing
      |
      v
Anchor Calculation
      |
      v
Sticker Configuration
      |
      v
Positioning and Transformation
      |
      v
Z-index Sorting
      |
      v
RGBA Compositing
      |
      v
Color Filter Processing
      |
      v
Template Composition
      |
      v
Final Export
```

## 13.2 Preview Rendering

Preview menggunakan gambar dengan resolusi lebih rendah untuk mempercepat interaksi.

Target awal: maksimal 1280 px pada sisi terpanjang.

## 13.3 Final Rendering

Final rendering menggunakan foto asli dengan resolusi penuh.

Ketentuan:

- Mempertahankan rasio foto.
- Mempertahankan transparansi asset.
- Menggunakan konfigurasi sticker yang sama dengan preview.
- Menghindari degradasi kualitas.
- Menghasilkan output siap cetak.

## 13.4 Non-destructive Processing

Foto asli tidak boleh diubah.

Setiap rendering harus berasal dari original image dan konfigurasi efek.

Jangan melakukan filter bertumpuk pada hasil rendering sebelumnya.

## 13.5 Color Grading Integration

Filter warna dan sticker harus memiliki aturan terpisah.

Setiap asset dapat memiliki opsi:

- `inherit_color_grading: true`
- `inherit_color_grading: false`

Secara default, asset dekorasi sebaiknya tidak ikut terkena color grading foto.

---

# 14. Database Design

Database awal menggunakan SQLite.

## 14.1 Tabel ar_assets

Menyimpan metadata asset.

| Field | Tipe |
|---|---|
| id | TEXT |
| name | TEXT |
| category | TEXT |
| asset_path | TEXT |
| asset_type | TEXT |
| manifest | JSON/TEXT |
| enabled | BOOLEAN |
| created_at | DATETIME |

## 14.2 Tabel ar_presets

Menyimpan kumpulan efek.

| Field | Tipe |
|---|---|
| id | TEXT |
| name | TEXT |
| description | TEXT |
| configuration | JSON/TEXT |
| created_at | DATETIME |

## 14.3 Tabel photo_effects

Menyimpan efek yang digunakan pada foto.

| Field | Tipe |
|---|---|
| id | TEXT |
| photo_id | TEXT |
| asset_id | TEXT |
| face_id | INTEGER |
| configuration | JSON/TEXT |
| created_at | DATETIME |

## 14.4 Tabel photo_renders

Menyimpan metadata hasil render.

| Field | Tipe |
|---|---|
| id | TEXT |
| photo_id | TEXT |
| output_path | TEXT |
| render_version | TEXT |
| configuration | JSON/TEXT |
| status | TEXT |
| created_at | DATETIME |

Foto asli dan hasil render disimpan sebagai file, bukan sebagai BLOB database.

---

# 15. Storage Architecture

```text
storage/
├── originals/
│   └── SESSION_ID/
│
├── previews/
│   └── SESSION_ID/
│
├── renders/
│   └── SESSION_ID/
│
├── animations/
│   └── SESSION_ID/
│
└── sessions/
    └── SESSION_ID/
        └── configuration.json
```

Ketentuan:

- Original image bersifat immutable.
- Preview dapat dibuat ulang.
- Final render memiliki ID tersendiri.
- Konfigurasi efek harus disimpan.
- File sementara dapat dibersihkan berdasarkan kebijakan retensi.
- Backup harus mempertimbangkan original image dan konfigurasi.

---

# 16. Performance Optimization

Karena sistem berjalan pada Mini PC Ubuntu, performa harus menjadi perhatian.

| Proses | Strategi |
|---|---|
| Face Detection | Gunakan resolusi analisis yang sesuai |
| Preview | Resolusi rendah |
| Final Rendering | Resolusi asli |
| Sticker Loading | Asset caching |
| Landmark | Simpan per foto |
| Rendering | Background worker |
| Animation | Frontend Canvas |
| Database | Simpan metadata saja |

## 16.1 Face Detection Caching

Face detection tidak perlu dijalankan ulang setiap pengguna mengganti sticker.

Hasil analisis dapat digunakan kembali selama foto tidak berubah.

## 16.2 Rendering Worker

Proses rendering final sebaiknya tidak dijalankan secara langsung dalam request API.

Gunakan worker agar API tetap responsif.

## 16.3 Resource Management

- Batasi jumlah foto yang diproses bersamaan.
- Atur ukuran input.
- Batasi jumlah asset aktif.
- Cache asset yang sering digunakan.
- Pantau penggunaan RAM.
- Sediakan cleanup untuk file sementara.

---

# 17. Error Handling

| Kondisi | Penanganan |
|---|---|
| Tidak ada wajah | Tampilkan manual placement |
| Wajah tidak jelas | Tampilkan peringatan |
| Banyak wajah | Tampilkan face selector |
| Sticker tidak ditemukan | Gunakan fallback |
| Asset rusak | Tandai asset tidak tersedia |
| Foto tidak valid | Tolak pemrosesan |
| Rendering gagal | Simpan status error |
| Storage penuh | Hentikan proses dan beri peringatan |
| Face detection timeout | Izinkan retry atau manual mode |

Sistem harus tetap dapat digunakan meskipun Face Detection tidak berhasil.

---

# 18. Testing Strategy

## 18.1 Face Detection Testing

Skenario:

- Satu wajah.
- Dua wajah.
- Tiga sampai empat wajah.
- Wajah miring.
- Wajah dengan kacamata.
- Pencahayaan terang.
- Pencahayaan redup.
- Wajah terpotong.
- Wajah di pinggir foto.

## 18.2 Sticker Testing

Skenario:

- Bunny ears.
- Glasses.
- Crown.
- Blush.
- Glitter.
- Random stars.
- Floating hearts.

## 18.3 Rendering Testing

Skenario:

- Portrait.
- Landscape.
- Resolusi tinggi.
- Transparansi PNG.
- Rotasi.
- Opacity.
- Multiple stickers.
- Layer ordering.
- Preview versus final.

## 18.4 Quality Assurance

Kriteria:

- Posisi sticker sesuai anchor.
- Tidak terjadi distorsi asset.
- Transparansi benar.
- Hasil tidak pecah saat dicetak.
- Preview dan final konsisten.
- Original image tetap utuh.
- Multi-face berfungsi.
- Konfigurasi dapat direproduksi.

---

# 19. Security and Privacy

Foto photobooth merupakan data yang perlu dijaga.

Ketentuan:

1. Original image hanya dapat diakses oleh komponen yang berwenang.
2. Face landmarks digunakan sebagai data pemrosesan, bukan identifikasi identitas seseorang.
3. Tidak melakukan face recognition untuk mengenali identitas.
4. File sementara memiliki kebijakan penghapusan.
5. Asset hanya boleh diakses melalui direktori yang diizinkan.
6. API harus membatasi akses file.
7. Backup harus mempertimbangkan privasi foto pengguna.
8. Data sesi tidak boleh terbuka untuk pengguna lain.

---

# 20. Development Roadmap

## Milestone 1 — Core Face Detection

- Setup MediaPipe.
- Model Face Landmarker.
- Face landmark detection.
- Anchor calculation.
- Multi-face detection.
- Unit testing.

## Milestone 2 — Sticker Engine

- Asset manifest.
- Asset loader.
- Face-anchored positioning.
- Scale and rotation.
- Opacity.
- Alpha compositing.

## Milestone 3 — Decorative Engine

- Glitter.
- Stars.
- Hearts.
- Emojis.
- Random scatter.
- Deterministic positioning.
- Face avoidance.

## Milestone 4 — AR Editor

- Canvas preview.
- Sticker gallery.
- Face selection.
- Drag and drop.
- Resize.
- Rotation.
- Undo/redo.
- Layer manager.

## Milestone 5 — Final Renderer

- High-resolution rendering.
- Color filter integration.
- Template integration.
- Export JPG/PNG.
- Print integration.

## Milestone 6 — Animated Effects

- Twinkle.
- Floating hearts.
- Animated stickers.
- GIF.
- MP4.

## Milestone 7 — Production Integration

- EOS 700D integration.
- Session integration.
- Print service.
- Storage management.
- Performance testing.
- Production QA.

---

# 21. Definition of Done

Modul dianggap siap untuk digunakan ketika:

- [ ] Face Detection berjalan stabil.
- [ ] Face Landmark berhasil diperoleh.
- [ ] Anchor wajah dapat dihitung.
- [ ] Multi-face detection berfungsi.
- [ ] Sticker otomatis dapat ditempatkan.
- [ ] Sticker dapat dipindahkan secara manual.
- [ ] Skala dan rotasi dapat diatur.
- [ ] Decorative Overlay berfungsi.
- [ ] Asset manifest tervalidasi.
- [ ] Preview dan final rendering konsisten.
- [ ] Original image tetap utuh.
- [ ] Output siap cetak.
- [ ] Error handling tersedia.
- [ ] Testing selesai.
- [ ] Dokumentasi API dan asset diperbarui.

---

# 22. Future Development

Pengembangan lanjutan yang dapat dipertimbangkan:

| Fitur | Tujuan |
|---|---|
| Body Tracking | Menempelkan objek ke tubuh |
| Head Pose Estimation | Tracking orientasi kepala lebih akurat |
| Segmentation | Mengatur objek di depan atau belakang subjek |
| Expression-based Effects | Efek berdasarkan ekspresi wajah |
| AI Background Removal | Mengganti latar belakang |
| Custom Sticker Upload | Memungkinkan pengelola menambahkan asset |
| Admin Asset Manager | Mengelola sticker melalui dashboard |
| Advanced Animation | Efek animasi yang lebih kompleks |

---

# 23. Architectural Decisions

Keputusan arsitektur yang ditetapkan untuk versi pertama:

| Aspek | Keputusan |
|---|---|
| Architecture | Hybrid AR |
| Primary tracking | Face |
| Face detection | MediaPipe Face Landmarker |
| Coordinate system | Normalized coordinates |
| Asset format | PNG RGBA |
| Asset management | JSON manifest |
| Positioning | Anchor-based |
| Decorative placement | Canvas position + random scatter |
| Preview | Next.js Canvas 2D |
| Backend processing | Python |
| Image compositing | Pillow |
| Image processing | OpenCV |
| API | FastAPI |
| Metadata database | SQLite |
| Final output | JPG/PNG |
| Animation | Canvas + GIF/MP4 |

## 23.1 Keputusan Penting

Sticker & AR Overlay Engine harus menjadi modul mandiri.

Modul ini tidak boleh mencampur tanggung jawab dengan:

- Color Filter Engine.
- Template Engine.
- Camera Service.
- Print Service.
- Session Management.

Integrasi dilakukan melalui API dan konfigurasi yang terstandarisasi.

Dengan demikian, pengembangan fitur baru dapat dilakukan tanpa mengubah keseluruhan sistem Sweet Studio.

---

# 24. Reference Documentation

Dokumentasi teknologi:

1. MediaPipe Face Landmarker  
   https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

2. FastAPI  
   https://fastapi.tiangolo.com/

3. Pillow  
   https://pillow.readthedocs.io/

4. OpenCV  
   https://docs.opencv.org/

5. NumPy  
   https://numpy.org/doc/

6. Next.js  
   https://nextjs.org/docs

7. MDN Canvas API  
   https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

**End of Document**

**Sweet Studio — Sticker & AR Overlay Engine v1.0**

Dokumen ini merupakan acuan arsitektur dan spesifikasi pengembangan. Seluruh implementasi source code dilakukan pada tahap development berdasarkan keputusan dan spesifikasi yang tercantum di sini.