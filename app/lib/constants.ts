export const DAFTAR_LOKASI = [
    "Ko+Lab",
    "Empang balong",
] as const;

export type LokasiType = (typeof DAFTAR_LOKASI)[number];
