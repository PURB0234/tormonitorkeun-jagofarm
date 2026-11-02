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

## 3. Struktur Frontend & Workspace Terpadu

Halaman utama operasional disatukan di **`/catatan-pekerjaan`** (`app/(workspace)/catatan-pekerjaan/`):
URL legacy `/jadwal-tim` dialihkan otomatis via server redirect `app/(workspace)/jadwal-tim/page.tsx` ke `/catatan-pekerjaan?view=kalender`.

### Komponen Inti:
1. **`CatatanWorkspace.tsx`**:
   Induk workspace pengelola switcher 3 tampilan, state pencarian, filter sorting, dan integrasi modal universal.
2. **Mode 1 — Daftar Catatan (`CatatanList.tsx` & `CatatanDetail.tsx`)**:
   - Layout feed 2 kolom (List di kiri, detail preview dokumen/foto di kanan).
   - Filter tab: "Semua" dan "Tugas Saya".
   - Fitur "Seluruh Tim" otomatis tampil di tab "Tugas Saya" seluruh pengguna.
3. **Mode 2 — Kalender Mingguan (`CatatanTimelineSection.tsx`)**:
   - Grid 7 hari per minggu dengan navigasi tanggal `prevWeek` / `nextWeek`.
   - Filter petugas (chips) & filter dropdown bulan beragenda.
   - Drag-and-Drop kontekstual 3 zona (Poka-Yoke):
     - Normal: *Selesai / Done* dan *Hapus*.
     - Berstatus `perlu_update`: *Update Catatan*, *Done + Update*, dan *Hapus*.
     - Berstatus `selesai`: *Kembalikan ke Dikerjakan* (dua arah) dan *Hapus*.
4. **Mode 3 — Timeline Gantt Chart (`GanttChartTim.tsx`)**:
   - Split view: Metadata kiri (`Nama Kegiatan | PIC | Status`) dan grid timeline kanan.
   - Kolom metadata dilengkapi draggable vertical resizer handle (lebar dinamis 260px–650px).
   - Tombol Zoom level sumbu Z (Out, %, In, Reset ke 100%).
   - Drag-pan sumbu X & Y dengan proteksi klik kiri (`e.button === 0`).
   - Mode Layar Penuh (Fullscreen toggle) dengan tombol `Esc` dan body-scroll lock untuk mencegah scroll trap.
   - Kolom tanggal header terkunci di atas (`sticky top-0 z-30`).
   - Isolasi scroll dengan CSS `overscroll-contain`.
5. **Cetak Laporan PDF (`LaporanPdfPrint.tsx`)**:
   Layout format cetak resmi landscape via `@media print`.

---

## 4. Sistem Modal Universal

Hanya ada 2 komponen modal untuk seluruh kebutuhan input data:
1. **`app/components/modal/ModalTambahKegiatan.tsx`**:
   Modal universal untuk tambah agenda/catatan baru.
2. **`app/components/modal/ModalEditKegiatan.tsx`**:
   Modal universal untuk edit agenda/catatan eksisting.

### Aturan Form Modal:
- Status pekerjaan tidak diubah manual lewat radio button modal (status dikendalikan via aksi tombol atau drag-and-drop).
- Validasi tanggal dikunci minimal bulan berjalan (`min={minMonthStart}`). Untuk edit data riwayat lama, gunakan `min={tanggal && tanggal < minMonthStart ? tanggal : minMonthStart}` agar browser tidak memblokir simpan.
- Pilihan "Seluruh Tim" otomatis menandai seluruh ID anggota aktif dan menyetel tag `'Seluruh Tim (N)'`.

---

## 5. Event Sinkronisasi Global & Realtime

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
