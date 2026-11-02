export type ViewMode = "catatan" | "kalender" | "gantt";

export type SortOption =
    | "semua"
    | "terbaru"
    | "terlama"
    | "status-dikerjakan"
    | "status-selesai"
    | "petugas";

export type ProfileMember = {
    id: string;
    full_name?: string;
    name?: string;
    email: string;
};

export type CurrentUser = {
    id: string;
    role: string;
    name: string;
};

export type MonthOption = {
    key: string;
    label: string;
    date: Date;
    count: number;
};
