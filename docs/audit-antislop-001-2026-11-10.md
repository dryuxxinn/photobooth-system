# Laporan Audit & Remediasi Anti-Slop (`antislop` + `antislop-ui`)

- **ID Audit**: `001-2026-11-10`
- **Tanggal**: 10 November 2026
- **Target**: Seluruh Antarmuka Frontend Kiosk, Galeri Tamu, dan Dashboard Admin (`frontend/`)
- **Dokumen Sistem Desain**: [`DESIGN.md`](../DESIGN.md)
- **Status Akhir**: **PASS (Seluruh Hard Gate, Purpose-Gate, Liveliness Dials, & Quality Locks Terpenuhi)**

---

## 1. Ringkasan Temuan Audit (Prioritas & Alasan Satu Baris)

| No | ID Aturan | Kategori | Prioritas | File yang Terdampak | Alasan Satu Baris & Remediasi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **R-01** | Hard Gate (Kontras Teks WCAG AA) | **HIGH** | `frontend/app/globals.css`, `frontend/tailwind.config.ts` | Warna teks sekunder `--color-text-muted` (`#7A7893`) memiliki rasio kontras ~3.8:1 di atas `#FFF0F0`; digelapkan menjadi `#5C5A72` (rasio kontras **5.9:1–6.5:1**, lulus WCAG AA 4.5:1). |
| **2** | **R-02** | Hard Gate (Em Dash `—`) | **HIGH** | `frontend/app/layout.tsx`, `frontend/components/kiosk/CountdownOverlay.tsx` | Terdapat 3 karakter em dash (`—`) pada metadata judul/deskripsi dan instruksi tinjauan foto; seluruhnya diganti dengan tanda hubung/titik dua standar (**0 em dash tersisa**). |
| **3** | **R-03** | Hard Gate (Tap Target Minimum 44×44px) | **HIGH** | `Button.tsx`, `PreparationScreen.tsx`, `PhotoPreview.tsx`, `CompletionScreen.tsx`, `QrDialog.tsx`, `TemplateManager.tsx`, `CameraPreview.tsx`, `share/[sessionId]/page.tsx` | Varian tombol `size="sm"`, tombol `+`/`-` jumlah cetak (`size-8`), swatch warna (`size-7`), dan chip filter memiliki tinggi `< 44px`; seluruh elemen interaktif dinaikkan menjadi minimal `min-h-[44px]` atau `size-11` (`44×44px`). |
| **4** | **R-17 & R-38** | Hard Gate (Angka Palsu / *Fabricated Fallback*) | **HIGH** | `frontend/components/admin/Dashboard.tsx`, `frontend/components/admin/CameraStatus.tsx` | Kartu Storage menampilkan fallback palsu `health?.storage_used_percent ?? 12` (`12% Used`) dan baterai `?? 100%` saat API belum siap; diganti dengan status jujur (`Belum Terukur` / `AC / USB Power`). |
| **5** | **R-27** | Hard Gate (*Actionable Empty State*) | **HIGH** | `frontend/components/admin/SessionTable.tsx`, `frontend/components/admin/PrinterStatus.tsx` | Empty state tabel sesi dan pekerjaan cetak hanya menampilkan satu kalimat pasif; diperbaiki menjadi *empty state* yang menjelaskan penyebab kosongnya data beserta tombol aksi langsung `Buka Layar Kiosk` (`/`). |
| **6** | **R-32** | Hard Gate (Focus Outline & Modal Escape) | **HIGH** | `TemplateManager.tsx`, `PaymentModal.tsx`, `PreparationScreen.tsx`, `TemplateSelector.tsx` | Empat elemen `<input>`/`<select>` menggunakan `outline-none` dan dialog kesiapan sistem menggunakan `<div role="dialog">` tanpa handler `Escape`; seluruh `outline-none` dihapus dan dialog kesiapan dipindahkan ke komponen `<Modal>` berbasis `<dialog>` native. |
| **7** | **R-39** | Hard Gate (Affordance Kursor & Kontrol Semantik) | **HIGH** | `frontend/app/globals.css`, `frontend/components/ui/Button.tsx`, `frontend/components/TopBar.tsx` | Ditambahkan aturan global `cursor: pointer` untuk kontrol aktif dan `cursor: not-allowed` untuk `:disabled`, mengganti `disabled:pointer-events-none` pada `Button.tsx` menjadi `disabled:cursor-not-allowed`, serta mengubah `<div>` status `TopBar` menjadi `<button type="button">` yang mendukung keyboard (`Enter`/`Space`). |
| **8** | **R-40** | Hard Gate (Dimensi Eksplisit Media) | **HIGH** | `CameraPreview.tsx`, `PhotoSelection.tsx`, `TemplateSelector.tsx`, `PhotoPreview.tsx`, `CompletionScreen.tsx`, `share/[sessionId]/page.tsx` | Elemen `<video>` dan `<img>` sebelumnya belum memiliki atribut `width` dan `height` eksplisit; seluruhnya kini dilengkapi `width` dan `height` sesuai rasio 3:2 (`1800×1200` / `600×400`) atau 2:3 (`600×900`) untuk mencegah *Cumulative Layout Shift (CLS)*. |
| **9** | **R-04** | Purpose-Gate (Emoji Dekoratif pada UI) | **MEDIUM** | `defaults.ts`, `useWebcam.ts`, `page.tsx`, `QrDialog.tsx`, `LayoutMock.tsx`, `TemplateManager.tsx`, `share/[sessionId]/page.tsx`, seluruh `components/kiosk/*.tsx` | Seluruh emoji dan simbol dekoratif literal (`✨`, `♡`, `✦`, `📷`, `🎥`, `🤳`, `🌸`, `🖤`, `🍑`, `❄️`, `🎞️`, `💕`, `💿`, `🎀`, `☕`, `🐰`, `👓`, `🐱`, `👑`, `📱`, `🖥️`, `🪞`, `🪄`, `⚠️`, `📡`, `🔄`, `⚡`, `✿`) dihapus dan diganti dengan ikon SVG geometris (`components/icons.tsx`) atau badge teks bersih (**0 emoji tersisa**). |
| **10** | **R-08, R-09, R-16** | Purpose-Gate (Panah Teks, Eyebrow Pill, Buzzword AI) | **MEDIUM** | `CountdownOverlay.tsx`, `PhotoSelection.tsx`, `CompletionScreen.tsx`, `TemplateSelector.tsx` | Menghapus karakter panah `➔`/`↺` pada label tombol, menghapus *eyebrow pill badge* `MEMORIES CAPTURED` di atas `<h1>THANK YOU!</h1>`, dan mengganti istilah generik `"AI Face-Tracking"` / `"Cek AI AR & Filter"` menjadi label fungsional `"Deteksi Wajah Otomatis"` dan `"Pratinjau Stiker & Filter"`. |
| **11** | **R-10 & R-12** | Purpose-Gate (Batas Dosis Glassmorphism & Floating Shadow) | **MEDIUM** | `globals.css`, `tailwind.config.ts`, `Card.tsx`, `Button.tsx`, `TopBar.tsx`, `PreparationScreen.tsx`, `PhotoPreview.tsx`, `CompletionScreen.tsx` | Menghapus `backdrop-blur-*` dan *floating shadow* default dari kartu/panel statis; menggunakan *border* struktural `1.5px–2px solid #F3E6EE` sebagai mekanisme elevasi tunggal dan membatasi `backdrop-blur-md` hanya pada 2 pill HUD di atas video live kamera (`CameraPreview.tsx`). |
| **12** | **R-19** | Purpose-Gate (Animasi Loop Tak Berujung) | **MEDIUM** | `globals.css`, `TopBar.tsx`, `CameraPreview.tsx`, `CountdownOverlay.tsx`, `PreparationScreen.tsx`, `PhotoPreview.tsx`, `CompletionScreen.tsx` | Menghentikan seluruh animasi `infinite` (`dreamy-gradient`, `animate-float-strip-*`, `animate-pulse-cta`, `animate-float-soft`, `animate-ping`, `animate-bounce`, dan 24 partikel konfeti) menjadi transisi satu kali (*one-shot entrance settle* `0.38s–0.55s`) dan indikator status statis. |
| **13** | **R-11 & R-29** | Quality Lock (Skala Radius & Disiplin Palet Warna) | **LOW** | `DESIGN.md`, `Button.tsx`, `CompletionScreen.tsx` | Menetapkan hierarki radius yang disengaja (`rounded-xl` untuk kontrol kecil, `rounded-2xl` untuk tombol standar, `rounded-[2rem]` untuk kartu, `rounded-full` khusus CTA hero utama) dan mengunci palet pada 3 warna inti + 1 aksen di [`DESIGN.md`](../DESIGN.md). |

---

## 2. Bukti Verifikasi Otomatis

Pemindaian statis dijalankan terhadap seluruh file `.ts`, `.tsx`, dan `.css` di dalam direktori `frontend/`:

- **Jumlah Em Dash (`—`)**: `0`
- **Jumlah `outline-none`**: `0`
- **Jumlah Emoji / Simbol Dekoratif Literal**: `0`
- **Jumlah Animasi Loop `infinite` / `animate-ping` / `animate-bounce`**: `0`
- **Jumlah Elemen `<img` / `<video` Tanpa `width` & `height`**: `0`
- **Jumlah Tombol dengan `min-h` di bawah `44px`**: `0`

---

## 3. Delivery Gate Report (`antislop` + `antislop-ui`)

| Gate | Pemeriksaan | Status | Bukti |
| :--- | :--- | :--- | :--- |
| **1. Hard Gate** | Tidak ada pelanggaran `R-01` s/d `R-03`, `R-17`, `R-27`, `R-32`, `R-38` s/d `R-40` | **PASS** | Kontras `--color-text-muted` `#5C5A72` (≥ 5.9:1), 0 em dash, semua target sentuh ≥ 44×44px, fallback palsu `12%` & `100%` dihapus, empty state memiliki alasan + tautan aksi `/`, 0 `outline-none`, `<Modal>` native menangani `Escape`, `cursor: pointer`/`not-allowed` aktif di `@layer base`, dan seluruh `<img>`/`<video>` memiliki `width` & `height`. |
| **2. Purpose-Gate** | Elemen bertanda `R-04` s/d `R-25` lolos uji alasan fungsional & batas dosis | **PASS** | 0 emoji dekoratif, tidak ada eyebrow pill di atas `<h1>`, tidak ada teks panah `➔`, `backdrop-blur-md` dibatasi hanya pada 2 pill HUD di atas `<video>` live (`CameraPreview.tsx`), elevasi kartu diseragamkan menggunakan border struktural `#F3E6EE`, dan seluruh animasi `infinite` dihentikan. |
| **3. Liveliness Gate** | Dials (`ENERGY 2 / RHYTHM 2 / MOTION 2`), hirarki tipografi, & ritme seksi | **PASS** | Ditetapkan secara eksplisit di [`DESIGN.md`](../DESIGN.md); skala judul menggunakan `clamp(2.2rem, 1.6rem + 2.4vw, 3rem)`, body `16px`, transisi antar-layar menggunakan *View Transitions API* satu arah (`0.38s cubic-bezier(0.22, 1, 0.36, 1)`) dengan dukungan penuh `prefers-reduced-motion: reduce`. |
| **4. Quality Gate** | Seluruh Quality Locks (`R-01` s/d `R-40`, `C-1` s/d `C-5`) terpenuhi | **PASS** | Build produksi Next.js diuji dan berjalan bersih di kontainer Docker `dryu-booth-frontend`. |
