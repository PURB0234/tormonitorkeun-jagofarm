export type StatusKegiatan =
    | "terjadwal"
    | "dikerjakan"
    | "berjalan"
    | "selesai"
    | "dibatalkan"
    | "perlu_update";

export type JadwalRow = {
    id: string;
    nama_kegiatan: string;
    penanggung_jawab_id?: string | null;
    penanggung_jawab_nama: string;
    tanggal: string; // YYYY-MM-DD
    tanggal_selesai?: string | null;
    waktu_mulai: string;
    waktu_selesai: string;
    lokasi?: string | null;
    catatan?: string | null;
    tag?: string | null;
    status: StatusKegiatan | string;
    lampiran_url?: string | null;
    lampiran_nama?: string | null;
    tautan_eksternal?: string | null;
    created_at?: string;
};

export type Catatan = {
    id: string;
    created_at: string;
    judul: string;
    penanggung_jawab: string;
    penanggung_jawab_id?: string | null;
    status: "dikerjakan" | "selesai";
    lokasi: string;
    deskripsi: string;
    tautan_eksternal?: string | null;
    lampiran_url?: string | null;
    lampiran_nama?: string | null;
    tag?: string | null;
    tanggal?: string | null;
    tanggal_selesai?: string | null;
    waktu_mulai?: string | null;
    waktu_selesai?: string | null;
};
