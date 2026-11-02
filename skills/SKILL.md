---
name: hayu-monitoringkeun
description: Context & architecture rules for MonitorKeun JagoFarm app.
version: 1.0.0
author: Purbo Jatmiko (PURB0234), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [hayu-monitoringkeun, jagofarm, smart-farming, supabase, nextjs16]
---

# MonitorKeun / JagoFarm System Architecture & Context

Dokumentasi arsitektur, basis data, dan aturan pengembangan aplikasi Smart Farming & Greenhouse IoT Monitoring (**MonitorKeun / JagoFarm**).

## 1. Identitas & Tech Stack

- **Framework**: Next.js 16 (App Router) dengan Turbopack
- **Library UI & Core**: React 19, Tailwind CSS v4, Lucide React
- **Database & Storage**: Supabase PostgreSQL & Storage Bucket `berkas_catatan`
- **Owner**: Purbo Jatmiko (`purbojatmiko57@gmail.com` / GitHub `PURB0234`)
- **Root Path Proyek**: `C:/hayu-monitoringkeun`

---

## 2. Single Source of Truth (Database)

Aplikasi mengadopsi prinsip **Single Source of Truth**:
- **Tabel Tunggal**: `public.jadwal_kegiatan`. Seluruh pencatatan, agenda tim, jadwal panen, dan log dokumentasi pekerjaan tersimpan di tabel ini.
- **Tabel Legacy**: `public.catatan_pekerjaan` telah di-deprecate. Seluruh kode aplikasi membaca dan menulis ke `public.jadwal_kegiatan`.

### Skema Kolom `jadwal_kegiatan`:
- `id` (`UUID`, Primary Key, `gen_random_uuid()`)
- `nama_kegiatan` (`TEXT`, Judul agenda / kegiatan)
- `penanggung_jawab_id` (`UUID`, nullable, merujuk ke `public.profiles.id` jika tunggal)
- `penanggung_jawab_nama` (`TEXT`, Nama PIC individu, multi-nama, atau "Seluruh Tim (N)")
- `tanggal` (`DATE`, Format `YYYY-MM-DD`, tanggal mulai pelaksanaan)
- `tanggal_selesai` (`DATE`, Format `YYYY-MM-DD`, untuk agenda multi-hari)
- `waktu_mulai` (`TIME`, default `'08:00'`)
- `waktu_selesai` (`TIME`, default `'10:00'`)
- `lokasi` (`TEXT`, Fasilitas, default `'Ko+Lab'`)
- `catatan` (`TEXT`, nullable, deskripsi teknis / log hasil lapangan)
- `status` (`TEXT`, enum nilai: `'terjadwal'`, `'dikerjakan'`, `'selesai'`, `'perlu_update'`, `'dibatalkan'`)
- `lampiran_url` (`TEXT`, nullable, URL publik bukti foto/file dari Supabase storage)
- `lampiran_nama` (`TEXT`, nullable, nama asli berkas)
- `tautan_eksternal` (`TEXT`, nullable, link eksternal)
- `tag` (`TEXT`, nullable, contoh: `'PANEN'`, `'Seluruh Tim (5)'`)
- `created_at` (`TIMESTAMPTZ`, default `now()`)

---

## 3. Struktur Direktori Modular & Arsitektur Terpadu

Proyek distrukturkan dengan pemisahan domain yang ketat agar bersih, mudah dibaca, dan modular:

```text
app/
├── (auth)/                    # Autentikasi (login, register)
├── (workspace)/               # Workspace terproteksi
│   ├── beranda/               # Dashboard ringkasan eksekutif
│   ├── admin/                 # Manajemen profil & peran tim
│   ├── catatan-pekerjaan/     # Workspace terpadu 3-in-1 operasional
│   │   ├── components/
│   │   │   ├── feed/          # CatatanList, CatatanDetail, CatatanHeader
│   │   │   ├── kalender/      # KalenderSection, KalenderNav, KalenderGrid, KalenderCard, KalenderDropZones
│   │   │   ├── gantt/         # GanttChartTim, GanttToolbar, GanttGrid, GanttTaskBar, GanttMetadataCol
│   │   │   ├── filter/        # TimelineFilterBar (Komponen filter bersama)
│   │   │   └── print/         # LaporanPdfPrint (Cetak dokumen A4)
│   │   └── page.tsx           # Server component / loader data
│   └── jadwal-tim/            # Legacy redirect ke /catatan-pekerjaan?view=kalender
├── components/
│   ├── layout/                # AppShell, TopBar, MainContent
│   ├── modal/                 # ModalTambahKegiatan, ModalEditKegiatan
│   │   └── parts/             # MemberPicker, DateRangePicker, FileUploader
│   └── ui/                    # Primitif UI atomik (Button, Card, Select, Badge, SegmentedControl)
├── auth/callback/route.ts     # Supabase OAuth/Magiclink exchange code endpoint
hooks/                         # useCalendarDragDrop, useGanttResize, useGanttInteraction
lib/utils/                     # date.ts, duration.ts, colors.ts
types/                         # kegiatan.ts, common.ts
skills/                        # SKILL.md (Dokumentasi sistem AI Agent)
```

---

## 4. Komponen Filter Terpadu (Shared Filtering Component)

**`TimelineFilterBar.tsx`** (`components/filter/TimelineFilterBar.tsx`):
- Digunakan bersama oleh **Kalender Mingguan**, **Gantt Chart (Mode Biasa)**, dan **Gantt Chart (Mode Layar Penuh)**.
- Menghilangkan duplikasi kode filter dan mencegah inkonsistensi state antar-tampilan.
- Fitur Filter:
  1. **Segmented Control Status**: Diagendakan (Aktif) / Telah Dilaksanakan / Semua.
  2. **Filter Petugas**: Chips interaktif atau Dropdown Select dengan dukungan nama multi-anggota & Seluruh Tim.
  3. **Filter Bulan Beragenda & Telah Dilaksanakan**: Menavigasi anchorDate ke bulan bersangkutan tanpa merusak filter status.

---

## 5. UI Primitives (`app/components/ui/`)

Komponen dasar UI konsisten tanpa dependensi berlebih:
1. **`Button.tsx`**: Varian `primary`, `secondary`, `outline`, `dark`, `danger`, `ghost`, `sync`, `nav`, `addNote`.
2. **`Card.tsx`**: Kontainer kartu bertepi halus dengan shadow minimalis.
3. **`Select.tsx`**: Dropdown select terstandardisasi dengan ikon ChevronDown.
4. **`Badge.tsx`**: Chip status dengan varian `success`, `warning`, `info`, `danger`, `neutral`.
5. **`SegmentedControl.tsx`**: Pengalih tab status berbasis pill yang responsif.

---

## 6. Sistem Modal Universal

Hanya ada 2 form modal yang bertindak sebagai orkestrator:
1. **`ModalTambahKegiatan.tsx`** & **`ModalEditKegiatan.tsx`**
2. Memanfaatkan subkomponen di `components/modal/parts/`:
   - **`MemberPicker.tsx`**: Pemilihan multi-PJ dan toggle Seluruh Tim.
   - **`DateRangePicker.tsx`**: Validasi rentang tanggal dan jam operasional.
   - **`FileUploader.tsx`**: Upload berkas baru / preview lampiran tersimpan.

---

## 7. Optimasi Ukuran Hosting & Produksi (Clean Production Mode)

- **Mode Deployment**: Standard Next.js server (`next start`).
- **Pembersihan Cache Otomatis**:
  - `package.json` menjalankan `postbuild` untuk otomatis menghapus folder cache internal `.next/cache` pasca build, menghemat 200–400 MB storage server.
- **Tailwind CSS v4 Integration**:
  - Dikompilasi secara native oleh Next.js 16 tanpa loader tambahan di `next.config.ts`.
- **Aset Statis**:
  - File CSS chunks dan font disajikan langsung oleh Next.js via `/_next/static/` (HTTP 200) tanpa risiko konflik folder atau 404.

---

## 8. Event Sinkronisasi Global & Realtime

- **Custom Event Sync**:
  ```ts
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:sync"));
  }
  ```
- **Supabase Realtime Channel**:
  Setiap komponen mendengarkan perubahan Postgres pada tabel `jadwal_kegiatan`:
  ```ts
  supabase
    .channel("...")
    .on("postgres_changes", { event: "*", schema: "public", table: "jadwal_kegiatan" }, () => {
      fetchData();
    })
    .subscribe();
  ```

---

## 6. Konvensi Koding & Standar Desain UI (Leonxlnx/taste-skill)

Setiap pembuatan atau modifikasi desain UI pada projek ini **wajib mematuhi standar `Leonxlnx/taste-skill` (anti-slop frontend)**:
1. **Anti-Default / Anti-Slop Discipline**:
   - Dilarang memakai gradien ungu AI ("AI-purple glow") atau background mesh acak. Gunakan palet netral bersih dengan aksen tunggal kontras (Emerald/Forest green sesuai tema smart farming).
   - Dilarang membuat 3 kartu fitur horizontal identik tanpa variasi komposisi.
   - Dilarang menggunakan em-dash (`—`) pada teks UI atau headline.
   - Dilarang memakai font serif generik (Fraunces / Instrument Serif). Gunakan font sans modern yang presisi (Geist / Inter Display / Tailwind defaults).
2. **Kontras & Aksesibilitas (WCAG AA)**:
   - Setiap tombol / CTA wajib lulus rasio kontras 4.5:1 (tidak ada teks putih di atas tombol abu-abu terang / transparan).
   - Teks tombol tidak boleh wrap 2 baris pada desktop.
   - Bentuk radius sudut (shape consistency) terkunci konsisten (misal `rounded-xl` untuk container, `rounded-lg` untuk tombol/input).
3. **Motion Terarah (Motivated Motion)**:
   - Animasi hanya digunakan untuk hierarki atau transisi state yang jelas, bukan sekadar dekorasi.
   - Wajib menghormati `prefers-reduced-motion` dan tidak memakai `window.addEventListener('scroll')` langsung di render loop.
4. **Gunakan String Concatenation untuk Snippet Chat**:
   Hindari template string backtick di blok kode jika memberikan panduan ke pengguna, karena mekanisme copy-paste pengguna sering menghilangkan karakter backtick (`"` + var + `"` lebih aman).
5. **Verifikasi Build Sebelum Selesai**:
   Setiap perubahan kode TypeScript/TSX wajib lolos `npm run build` (exit code 0).
6. **Poka-Yoke & Zero Data Loss**:
   Jangan pernah menghapus data catatan/jadwal lama saat migrasi.
