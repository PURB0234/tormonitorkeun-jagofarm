"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Plus,
    MapPin,
    Sprout,
    Droplets,
    Loader2,
    Trash2,
    CheckCircle2,
    Printer,
    BarChart3,
    RefreshCw,
    CheckCheck,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import ModalTambahJadwal from "@/app/components/modal/ModalTambahJadwal";
import ModalEditJadwal from "@/app/components/modal/ModalEditJadwal";
import GanttChartTim from "./components/GanttChartTim";
import LaporanPdfPrint from "./components/LaporanPdfPrint";
import { useRouter } from "next/navigation";

type JadwalRow = {
    id: string;
    nama_kegiatan: string;
    penanggung_jawab_id?: string | null;
    penanggung_jawab_nama: string;
    tanggal: string; // YYYY-MM-DD
    tanggal_selesai?: string | null; // Tanggal Selesai (YYYY-MM-DD)
    waktu_mulai: string;
    waktu_selesai: string;
    lokasi?: string | null;
    catatan?: string | null;
    tag?: string | null;
    status: string;
    lampiran_url?: string | null;
    lampiran_nama?: string | null;
};

type ProfileMember = {
    id: string;
    full_name: string;
    email: string;
};

// Helper: Menghitung Senin dari minggu tanggal target
function getMonday(d: Date): Date {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
}

// Helper: Tambah hari
function addDays(d: Date, days: number): Date {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
}

// Helper: Format YYYY-MM-DD lokal
function toIsoDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

const BULAN_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const HARI_NAMES = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

export default function JadwalTimPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"penjadwalan" | "gantt">("penjadwalan");
    const [selectedStaff, setSelectedStaff] = useState<string>("Semua");
    const [members, setMembers] = useState<ProfileMember[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Default mulai dari 24 Feb 2025 sesuai mockup
    // const [anchorDate, setAnchorDate] = useState<Date>(() => new Date(2025, 1, 24));
    const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
    const [jadwals, setJadwals] = useState<JadwalRow[]>([]);
    const [loading, setLoading] = useState(true);

    const monday = useMemo(() => getMonday(anchorDate), [anchorDate]);
    const sunday = useMemo(() => addDays(monday, 6), [monday]);

    // State untuk drag & drop
    const draggedIdRef = useRef<string | null>(null);
    const [draggableId, setDraggableId] = useState<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<JadwalRow | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);
    const [activeMonths, setActiveMonths] = useState<{ key: string, label: string; date: Date; count: number }[]>([]);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");

    const [filterStatus, setFilterStatus] = useState<"semua" | "terjadwal" | "selesai">("terjadwal");
    const [selectedJadwalToEdit, setSelectedJadwalToEdit] = useState<JadwalRow | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isOverDone, setIsOverDone] = useState(false);

    // Bulan saat ini (real-time) untuk proteksi bulan lampau
    const realNow = new Date();
    const realCurrentYear = realNow.getFullYear();
    const realCurrentMonth = realNow.getMonth(); // 0-indexed

    const [completedMonths, setCompletedMonths] = useState<{ key: string; label: string; date: Date; count: number }[]>([]);
    const [selectedCompletedMonthKey, setSelectedCompletedMonthKey] = useState<string>("");
    const [isOverUpdate, setIsOverUpdate] = useState(false);
    const [isOverDoneUpdate, setIsOverDoneUpdate] = useState(false);

    const fetchActiveMonths = useCallback(async () => {
        const supabase = createClient();

        // Hanya hitung agenda yang belum selesai agar bulan beragenda mencerminkan task aktif
        const { data } = await supabase
            .from("jadwal_kegiatan")
            .select("tanggal")
            .neq("status", "selesai")
            .order("tanggal", { ascending: true });

        if (!data) return;

        const monthMap = new Map<string, { year: number; month: number; count: number; firstDateStr: string }>();

        data.forEach((row) => {
            const rawIso = String(row.tanggal).slice(0, 10);
            const parts = rawIso.split("-");
            if (parts.length < 3) return;

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const key = year + "-" + month;

            if (!monthMap.has(key)) {
                monthMap.set(key, { year, month, count: 1, firstDateStr: rawIso });
            } else {
                monthMap.get(key)!.count += 1;
            }
        });

        setActiveMonths(
            Array.from(monthMap.entries()).map(([key, val]) => {
                const [y, m, d] = val.firstDateStr.split("-").map(Number);
                const targetDate = new Date(y, m - 1, d, 12, 0, 0);

                return {
                    key,
                    label: BULAN_NAMES[val.month].slice(0, 3) + " " + val.year + " (" + val.count + ")",
                    date: targetDate,
                    count: val.count,
                };
            })
        );
    }, []);

    useEffect(() => {
        fetchActiveMonths();
    }, [fetchActiveMonths]);

    const fetchCompletedMonths = useCallback(async () => {
        const supabase = createClient();

        // Ambil agenda yang sudah selesai
        const { data } = await supabase
            .from("jadwal_kegiatan")
            .select("tanggal")
            .eq("status", "selesai")
            .order("tanggal", { ascending: false });

        if (!data) return;

        const monthMap = new Map<string, { year: number; month: number; count: number; firstDateStr: string }>();

        data.forEach((row) => {
            const rawIso = String(row.tanggal).slice(0, 10);
            const parts = rawIso.split("-");
            if (parts.length < 3) return;

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const key = year + "-" + month;

            if (!monthMap.has(key)) {
                monthMap.set(key, { year, month, count: 1, firstDateStr: rawIso });
            } else {
                monthMap.get(key)!.count += 1;
            }
        });

        setCompletedMonths(
            Array.from(monthMap.entries()).map(([key, val]) => {
                const [y, m, d] = val.firstDateStr.split("-").map(Number);
                const targetDate = new Date(y, m - 1, d, 12, 0, 0);

                return {
                    key,
                    label: BULAN_NAMES[val.month].slice(0, 3) + " " + val.year + " (" + val.count + ")",
                    date: targetDate,
                    count: val.count,
                };
            })
        );
    }, []);

    useEffect(() => {
        fetchCompletedMonths();
    }, [fetchCompletedMonths]);

    // Fungsi eksekusi hapus ke Supabase
    const handleDeleteJadwal = async (id: string, nama: string) => {
        // 1. Hapus seketika dari state UI
        setJadwals((prev) => prev.filter((item) => item.id !== id));

        const supabase = createClient();

        // 2. Hapus dari tabel jadwal_kegiatan (Single Source of Truth)
        const { error } = await supabase.from("jadwal_kegiatan").delete().eq("id", id);

        if (error) {
            alert("Gagal menghapus dari database: " + error.message);
            fetchJadwal();
            fetchActiveMonths();
            fetchCompletedMonths();
        } else {
            fetchActiveMonths();
            fetchCompletedMonths();
        }

        // 3. Sinkronkan modul seketika
        router.refresh();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // 1. DONE SAJA: Mengubah status jadwal jadi selesai
    const handleCompleteJadwal = async (item: JadwalRow) => {
        const supabase = createClient();

        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "selesai" } : j))
        );

        const { error: updateError } = await supabase
            .from("jadwal_kegiatan")
            .update({ status: "selesai" })
            .eq("id", item.id);

        if (updateError) {
            alert("Gagal mengubah status: " + updateError.message);
            fetchJadwal();
            fetchCompletedMonths();
            return;
        }

        fetchActiveMonths();
        fetchCompletedMonths();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
        router.refresh();
    };

    // 2. UPDATE SAJA: Kembalikan status jadwal ke 'terjadwal' (dikerjakan)
    const handleUpdateOnlyToCatatan = async (item: JadwalRow) => {
        const supabase = createClient();

        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "terjadwal" } : j))
        );

        await supabase
            .from("jadwal_kegiatan")
            .update({ status: "terjadwal" })
            .eq("id", item.id);

        fetchActiveMonths();
        fetchCompletedMonths();
        router.refresh();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // 3. DONE + UPDATE: Mengubah status jadwal menjadi 'selesai'
    const handleDoneAndUpdateCatatan = async (item: JadwalRow) => {
        const supabase = createClient();

        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "selesai" } : j))
        );

        await supabase
            .from("jadwal_kegiatan")
            .update({ status: "selesai" })
            .eq("id", item.id);

        fetchActiveMonths();
        fetchCompletedMonths();
        router.refresh();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // Ambil seluruh data jadwal dari Supabase (lengkap untuk Kanban mingguan & Gantt chart timeline)
    const fetchJadwal = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("jadwal_kegiatan")
            .select("*")
            .order("tanggal", { ascending: true })
            .order("waktu_mulai", { ascending: true });

        if (!error && data) {
            setJadwals(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchJadwal();

        // Realtime subscription ke jadwal_kegiatan
        const supabase = createClient();
        const channel = supabase
            .channel("realtime-jadwal-single")
            .on("postgres_changes", { event: "*", schema: "public", table: "jadwal_kegiatan" }, () => {
                fetchJadwal();
                fetchActiveMonths();
                fetchCompletedMonths();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchJadwal, fetchActiveMonths, fetchCompletedMonths]);

    useEffect(() => {
        const onGlobalSync = () => {
            fetchJadwal();
            fetchActiveMonths();
            fetchCompletedMonths();
        };

        window.addEventListener("app:sync", onGlobalSync);
        return () => {
            window.removeEventListener("app:sync", onGlobalSync);
        };
    }, [fetchJadwal, fetchActiveMonths, fetchCompletedMonths]);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("profiles")
            .select("id, full_name, email")
            .then(({ data }) => {
                if (data) setMembers(data);
            });
    }, []);

    // Bangun 7 kolom harian
    const weekDays = useMemo(() => {
        const todayStr = toIsoDate(new Date());

        return Array.from({ length: 7 }, (_, i) => {
            const dateObj = addDays(monday, i);
            const iso = toIsoDate(dateObj);
            const dayNum = dateObj.getDate();
            const monthShort = BULAN_NAMES[dateObj.getMonth()].slice(0, 3);

            // Cocokkan tanggal (ambil 10 karakter pertama YYYY-MM-DD)
            const dayTasks = jadwals.filter((item) => {
                const startIso = String(item.tanggal).slice(0, 10);
                const endIso = item.tanggal_selesai
                    ? String(item.tanggal_selesai).slice(0, 10)
                    : startIso;
                return iso >= startIso && iso <= endIso;
            });

            return {
                iso,
                hari: HARI_NAMES[i],
                tanggal: dayNum + " " + monthShort,
                isToday: iso === todayStr,
                isWeekend: i >= 5,
                tasks: dayTasks,
            };
        });
    }, [monday, jadwals]);

    useEffect(() => {
        // Cek apakah ada hari di minggu ini yang cocok dengan salah satu bulan beragenda
        const match = activeMonths.find((m) => {
            const mKey = m.key;
            // Cek Senin, Kamis, atau Minggu
            const monKey = monday.getFullYear() + "-" + monday.getMonth();
            const sunKey = sunday.getFullYear() + "-" + sunday.getMonth();
            const ancKey = anchorDate.getFullYear() + "-" + anchorDate.getMonth();
            return mKey === ancKey || mKey === monKey || mKey === sunKey;
        });

        if (match) {
            setSelectedMonthKey(match.key);
        } else {
            setSelectedMonthKey("");
        }
    }, [anchorDate, monday, sunday, activeMonths]);

    // Navigasi minggu
    const prevWeek = () => setAnchorDate((prev) => addDays(prev, -7));
    const nextWeek = () => setAnchorDate((prev) => addDays(prev, 7));

    const staffList = useMemo(() => {
        const list = [{ label: "Semua", text: "Semua (" + members.length + ")" }];
        members.forEach((m) => {
            // Ambil nama panggilan (kata pertama dari nama lengkap / username email)
            const rawName = m.full_name || m.email.split("@")[0];
            const firstName = rawName.split(" ")[0];
            list.push({
                label: rawName,
                text: firstName,
            });
        });
        return list;
    }, [members]);

    const getDotColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("budi")) return "bg-green-600";
        if (n.includes("siti")) return "bg-emerald-600";
        if (n.includes("dimas")) return "bg-amber-700";
        if (n.includes("rina")) return "bg-blue-600";
        return "bg-slate-400";
    };

    return (
        <main className="max-w-7xl mx-auto space-y-4">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jadwal Kerja Tim</h1>
                        <span className="text-[11px] font-medium bg-slate-100 text-['#3B684A'] border border-slate-200 px-2 py-0.5 rounded-full">
                            Operasional Aktif
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Koordinasi kegiatan lapangan, panen, perawatan
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setViewMode("penjadwalan")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${viewMode === "penjadwalan"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Mode Penjadwalan</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("gantt")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${viewMode === "gantt"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Mode Gantt Chart</span>
                        </button>
                    </div>

                    {/* Tombol Cetak PDF / Laporan */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                        title="Cetak Laporan Resmi atau Ekspor ke PDF"
                    >
                        <Printer className="w-3.5 h-3.5 text-gray-600" />
                        <span>Cetak Laporan</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#17462e] hover:bg-[#123824] text-white rounded-lg text-xs font-medium transition shadow-2xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Jadwal</span>
                    </button>
                </div>
            </div>

            {/* Navigasi Tanggal & Filter Petugas */}
            <div className="flex flex-wrap items-center border border-1 border-gray-200 justify-between gap-3 p-2 rounded-md">
                <div className="flex items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={prevWeek}
                        className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {/* <button
                        type="button"
                        onClick={() => setAnchorDate(new Date())}
                        className="px-2 py-0.5 border border-gray-200 rounded-md hover:bg-gray-50 text-[11px] font-medium text-gray-700 transition"
                    >
                        Hari Ini
                    </button> */}
                    <button
                        type="button"
                        onClick={nextWeek}
                        className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold text-gray-900">
                        {BULAN_NAMES[monday.getMonth()]} {monday.getFullYear()}
                    </span>
                    <span className="text-gray-400 mx-1">•</span>
                    <span className="text-gray-500 font-normal">
                        {monday.getDate()} {BULAN_NAMES[monday.getMonth()].slice(0, 3)} - {sunday.getDate()} {BULAN_NAMES[sunday.getMonth()].slice(0, 3)} {sunday.getFullYear()}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500 mr-1 text-[11px]">Petugas:</span>
                    {staffList.map((st) => (
                        <button
                            key={st.label}
                            type="button"
                            onClick={() => setSelectedStaff(st.label)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${selectedStaff === st.label
                                ? "bg-slate-900 text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {st.text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Status & Dua Dropdown Bulan: Beragenda vs Telah Dilaksanakan */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Selektor Tampilan Cepat (Tab) */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">Tampilkan:</span>
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-100 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setFilterStatus("terjadwal")}
                            className={
                                "px-2.5 py-1 rounded-md font-medium transition " +
                                (filterStatus === "terjadwal"
                                    ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900")
                            }
                        >
                            Diagendakan (Aktif)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus("selesai")}
                            className={
                                "px-2.5 py-1 rounded-md font-medium transition " +
                                (filterStatus === "selesai"
                                    ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900")
                            }
                        >
                            Telah Dilaksanakan
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus("semua")}
                            className={
                                "px-2.5 py-1 rounded-md font-medium transition " +
                                (filterStatus === "semua"
                                    ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900")
                            }
                        >
                            Semua
                        </button>
                    </div>
                </div>

                {/* Sisi Kanan: Dua Dropdown Berdampingan */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* 1. Dropdown Bulan Beragenda (Aktif / Belum Selesai) */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[11px] font-medium text-gray-600">Bulan Beragenda:</span>
                        <select
                            value={selectedMonthKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedMonthKey(val);
                                if (val) {
                                    setSelectedCompletedMonthKey(""); // Reset dropdown sebelah
                                    const target = activeMonths.find((m) => m.key === val);
                                    if (target) {
                                        setAnchorDate(new Date(target.date.getTime()));
                                    }
                                }
                            }}
                            className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 hover:border-gray-400 focus:outline-hidden focus:ring-1 focus:ring-green-700 cursor-pointer"
                        >
                            <option value="">-- Tidak Ada Filter --</option>
                            {activeMonths.map((m) => (
                                <option key={m.key} value={m.key}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Dropdown Telah Dilaksanakan (Selesai) */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[11px] font-medium text-gray-600">Telah Dilaksanakan:</span>
                        <select
                            value={selectedCompletedMonthKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedCompletedMonthKey(val);
                                if (val) {
                                    setSelectedMonthKey("");       // Reset dropdown sebelah
                                    const target = completedMonths.find((m) => m.key === val);
                                    if (target) {
                                        setAnchorDate(new Date(target.date.getTime()));
                                    }
                                }
                            }}
                            className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 hover:border-gray-400 focus:outline-hidden focus:ring-1 focus:ring-green-700 cursor-pointer"
                        >
                            <option value="">-- Tidak Ada Filter --</option>
                            {completedMonths.map((m) => (
                                <option key={m.key} value={m.key}>
                                    {"✓ " + m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tampilan Kalender Mingguan ATAU Gantt Chart */}
            {viewMode === "gantt" ? (
                <GanttChartTim
                    weekDays={weekDays}
                    jadwals={jadwals}
                    filterStatus={filterStatus}
                    selectedStaff={selectedStaff}
                    anchorDate={anchorDate}
                    onSelectTask={(task) => {
                        setSelectedJadwalToEdit(task);
                        setIsEditModalOpen(true);
                    }}
                    getDotColor={getDotColor}
                    realCurrentYear={realCurrentYear}
                    realCurrentMonth={realCurrentMonth}
                />
            ) : (
                /* Grid Kalender 7 Kolom */
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-7 min-w-[960px] divide-x divide-gray-200">
                            {weekDays.map((day) => {
                                // Cek apakah tanggal ini berada di bulan sebelum bulan real saat ini
                                const [dayY, dayM] = day.iso.split("-").map(Number);
                                const isPastMonth =
                                    dayY < realCurrentYear ||
                                    (dayY === realCurrentYear && dayM - 1 < realCurrentMonth);

                                const isMatchStaff = (task: JadwalRow) => {
                                    if (selectedStaff === "Semua") return true;
                                    const pj = task.penanggung_jawab_nama.toLowerCase();
                                    const query = selectedStaff.toLowerCase().split(" ")[0];
                                    return pj.includes("tim") || pj.includes(query);
                                };

                                const isMatchStatus = (task: JadwalRow) => {
                                    if (filterStatus === "semua") return true;
                                    if (filterStatus === "selesai") return task.status === "selesai";
                                    return task.status !== "selesai";
                                };

                                const displayedTasks = day.tasks.filter(
                                    (t) => isMatchStaff(t) && isMatchStatus(t)
                                );

                                return (
                                    <div
                                        key={day.iso}
                                        className={`flex flex-col min-h-[460px] transition ${isPastMonth
                                            ? "bg-gray-100/60 opacity-60"
                                            : day.isToday && displayedTasks.length > 0
                                                ? "bg-slate-50/50"
                                                : "bg-white"
                                            }`}
                                    >
                                        {/* Header Tanggal */}
                                        <div
                                            className={`p-3 border-b border-gray-200 flex items-start justify-between ${isPastMonth
                                                ? "bg-gray-200/50"
                                                : day.isToday && displayedTasks.length > 0
                                                    ? "bg-slate-100/70"
                                                    : "bg-slate-50/70"
                                                }`}
                                        >
                                            <div>
                                                <span className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase block">
                                                    {day.hari}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                                                    {day.tanggal}
                                                </span>
                                            </div>

                                            {isPastMonth && (
                                                <span className="text-[9px] font-medium text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                                                    Lewat
                                                </span>
                                            )}

                                            {!isPastMonth && day.isToday && displayedTasks.length > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                                    Hari ini
                                                </span>
                                            )}
                                        </div>

                                        {/* Isi Kartu */}
                                        <div className="p-2.5 space-y-2.5 flex-1">
                                            {loading ? (
                                                <div className="flex justify-center items-center py-8 text-gray-400">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                </div>
                                            ) : (
                                                <>
                                                    {displayedTasks.map((t) => {
                                                        const formatTime = (timeStr: string) => timeStr.slice(0, 5);
                                                        const isPanen = t.tag?.toUpperCase() === "PANEN";
                                                        const isTim = t.tag?.toLowerCase().includes("tim");
                                                        const isSelesai = t.status === "selesai";

                                                        return (
                                                            <div
                                                                key={t.id}
                                                                draggable={true}
                                                                onClick={() => {
                                                                    setSelectedJadwalToEdit(t);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isSelesai) {
                                                                        if (confirm("Hapus agenda \"" + t.nama_kegiatan + "\"?")) {
                                                                            handleDeleteJadwal(t.id, t.nama_kegiatan);
                                                                        }
                                                                    } else {
                                                                        const aksi = confirm(
                                                                            "Klik OK untuk TANDAI SELESAI (Masuk Catatan),\natau Batal jika ingin Hapus."
                                                                        );
                                                                        if (aksi) {
                                                                            handleCompleteJadwal(t);
                                                                        } else {
                                                                            if (confirm("Hapus agenda ini secara permanen?")) {
                                                                                handleDeleteJadwal(t.id, t.nama_kegiatan);
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                onDragStart={(e) => {
                                                                    draggedIdRef.current = t.id;
                                                                    setDraggedItem(t);
                                                                    e.dataTransfer.setData("text/plain", t.id);
                                                                    e.dataTransfer.effectAllowed = "move";
                                                                }}
                                                                onDragEnd={() => {
                                                                    draggedIdRef.current = null;
                                                                    setDraggedItem(null);
                                                                    setIsOverTrash(false);
                                                                    setIsOverDone(false);
                                                                }}
                                                                className={
                                                                    "group relative border rounded-lg p-2.5 shadow-2xs space-y-2 transition cursor-pointer select-none " +
                                                                    (draggedItem?.id === t.id
                                                                        ? "opacity-30 border-dashed border-emerald-400 scale-95"
                                                                        : isSelesai
                                                                            ? "bg-emerald-50/40 border-emerald-300 hover:border-emerald-400"
                                                                            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs")
                                                                }
                                                            >
                                                                {/* Tombol Aksi Cepat saat Hover: Selesai & Hapus */}
                                                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                                                                    {!isSelesai && (
                                                                        <button
                                                                            type="button"
                                                                            title="Tandai Selesai (Masuk Catatan)"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCompleteJadwal(t);
                                                                            }}
                                                                            className="p-1 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded border border-emerald-200 transition"
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        title="Hapus jadwal"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm("Hapus jadwal \"" + t.nama_kegiatan + "\"?")) {
                                                                                handleDeleteJadwal(t.id, t.nama_kegiatan);
                                                                            }
                                                                        }}
                                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 bg-white rounded border border-gray-200 transition"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>

                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="text-[10px] font-medium text-gray-500">
                                                                        {formatTime(t.waktu_mulai)} - {formatTime(t.waktu_selesai)}
                                                                    </span>

                                                                    {t.status === "perlu_update" && (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                                                                            PERLU UPDATE
                                                                        </span>
                                                                    )}

                                                                    {isSelesai ? (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                                                            SELESAI
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            {isPanen && (
                                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                                                                    PANEN
                                                                                </span>
                                                                            )}
                                                                            {isTim && (
                                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                                                                    {t.tag}
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <h2
                                                                    className={`text-xs font-semibold leading-snug ${isSelesai ? "text-emerald-950 line-through decoration-emerald-600/60" : "text-gray-900"
                                                                        }`}
                                                                >
                                                                    {t.nama_kegiatan}
                                                                </h2>

                                                                <div className="space-y-1 pt-1 border-t border-gray-100 text-[11px] text-gray-600">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span
                                                                            className={
                                                                                "w-1.5 h-1.5 rounded-full shrink-0 " +
                                                                                getDotColor(t.penanggung_jawab_nama)
                                                                            }
                                                                        />
                                                                        <span className="truncate">{t.penanggung_jawab_nama}</span>
                                                                    </div>
                                                                    {t.lokasi && (
                                                                        <div className="flex items-center gap-1.5 text-gray-400">
                                                                            <MapPin className="w-3 h-3 shrink-0" />
                                                                            <span className="truncate text-[10px] text-gray-500">
                                                                                {t.lokasi}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Placeholder Kosong */}
                                                    {displayedTasks.length === 0 && (
                                                        <div className="h-full min-h-[140px] border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                                                            {isPastMonth ? (
                                                                <span className="text-xs font-medium text-gray-400">
                                                                    Bulan lampau
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-medium text-gray-500">
                                                                    Tidak ada agenda
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Penanggung Jawab */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 pt-1 px-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="text-[11px] font-medium text-gray-700">Penanggung Jawab:</span>
                    {members.map((m) => {
                        const name = m.full_name || m.email.split("@")[0];
                        return (
                            <div key={m.id} className="flex items-center gap-1.5">
                                <span className={"w-2 h-2 rounded-full " + getDotColor(name)}></span>
                                <span className="text-[11px]">{name}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Zona Waktu: WIB (GMT+7)</span>
                </div>
            </div>

            {/* Modal Tambah Jadwal */}
            <ModalTambahJadwal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={(newDate) => {
                    if (newDate) setAnchorDate(new Date(newDate));
                    fetchJadwal();
                    fetchActiveMonths();
                }}
            />

            {/* Modal Edit Jadwal */}
            <ModalEditJadwal
                isOpen={isEditModalOpen}
                jadwal={selectedJadwalToEdit}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedJadwalToEdit(null);
                }}
                onSuccess={() => {
                    fetchJadwal();
                    fetchActiveMonths();
                }}
            />

            {/* Drop Zones saat Kartu Di-drag */}
            <div
                className={`fixed bottom-6 inset-x-0 mx-auto max-w-3xl z-50 flex items-center justify-center gap-2.5 px-4 transition-all duration-300 ${draggedItem
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-12 pointer-events-none"
                    }`}
            >
                {/* 1. Kondisi Normal (tidak perlu update): Hanya tampilkan Selesai (Done) */}
                {draggedItem?.status !== "perlu_update" && (
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setIsOverDone(true);
                        }}
                        onDragLeave={() => setIsOverDone(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (draggedItem) {
                                handleCompleteJadwal(draggedItem);
                            }
                            draggedIdRef.current = null;
                            setDraggedItem(null);
                            setIsOverDone(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${isOverDone
                            ? "bg-emerald-600 border-emerald-700 text-white scale-105 ring-4 ring-emerald-200"
                            : "bg-white border-emerald-500 text-emerald-700 hover:bg-emerald-50/50"
                            }`}
                    >
                        <CheckCircle2 className={"w-5 h-5 shrink-0 " + (isOverDone ? "animate-bounce" : "")} />
                        <div className="text-left">
                            <div className="text-xs font-bold leading-tight">Selesai / Done</div>
                            <div className="text-[10px] opacity-80 leading-tight">Tandai agenda selesai</div>
                        </div>
                    </div>
                )}

                {/* 2. Kondisi Perlu Update: Hanya tampilkan Update Catatan & Done + Update */}
                {draggedItem?.status === "perlu_update" && (
                    <>
                        {/* Zona Update Saja (Belum Selesai) */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setIsOverUpdate(true);
                            }}
                            onDragLeave={() => setIsOverUpdate(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggedItem) {
                                    handleUpdateOnlyToCatatan(draggedItem);
                                }
                                draggedIdRef.current = null;
                                setDraggedItem(null);
                                setIsOverUpdate(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${isOverUpdate
                                ? "bg-blue-600 border-blue-700 text-white scale-105 ring-4 ring-blue-200"
                                : "bg-white border-blue-400 text-blue-700 hover:bg-blue-50/50"
                                }`}
                        >
                            <RefreshCw className={"w-4 h-4 shrink-0 " + (isOverUpdate ? "animate-spin" : "")} />
                            <div className="text-left">
                                <div className="text-[11px] font-bold leading-tight">Update Catatan</div>
                                <div className="text-[9px] opacity-80 leading-tight">Sinkron data (Dikerjakan)</div>
                            </div>
                        </div>

                        {/* Zona Done + Update (Selesai & Update) */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setIsOverDoneUpdate(true);
                            }}
                            onDragLeave={() => setIsOverDoneUpdate(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggedItem) {
                                    handleDoneAndUpdateCatatan(draggedItem);
                                }
                                draggedIdRef.current = null;
                                setDraggedItem(null);
                                setIsOverDoneUpdate(false);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${isOverDoneUpdate
                                ? "bg-[#1E5E35] border-green-800 text-white scale-105 ring-4 ring-green-200"
                                : "bg-white border-[#1E5E35] text-[#1E5E35] hover:bg-green-50/50"
                                }`}
                        >
                            <CheckCheck className={"w-4 h-4 shrink-0 " + (isOverDoneUpdate ? "animate-bounce" : "")} />
                            <div className="text-left">
                                <div className="text-[11px] font-bold leading-tight">Done + Update</div>
                                <div className="text-[9px] opacity-80 leading-tight">Sinkron data & Selesai</div>
                            </div>
                        </div>
                    </>
                )}

                {/* 3. Zona Hapus / Trash (Merah) - Selalu Tampil */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setIsOverTrash(true);
                    }}
                    onDragLeave={() => setIsOverTrash(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (draggedItem) {
                            handleDeleteJadwal(draggedItem.id, draggedItem.nama_kegiatan);
                        }
                        draggedIdRef.current = null;
                        setDraggedItem(null);
                        setIsOverTrash(false);
                    }}
                    className={`w-28 flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-no-drop ${isOverTrash
                        ? "bg-red-600 border-red-700 text-white scale-105 ring-4 ring-red-200"
                        : "bg-white border-red-400 text-red-600 hover:bg-red-50/50"
                        }`}
                >
                    <Trash2 className={"w-4 h-4 shrink-0 " + (isOverTrash ? "animate-bounce" : "")} />
                    <span className="text-[11px] font-bold">Hapus</span>
                </div>
            </div>

            {/* Dokumen Laporan Siap Cetak / Convert PDF */}
            <LaporanPdfPrint
                jadwals={jadwals}
                periodeText={monday.getDate() + " " + BULAN_NAMES[monday.getMonth()].slice(0, 3) + " - " + sunday.getDate() + " " + BULAN_NAMES[sunday.getMonth()].slice(0, 3) + " " + sunday.getFullYear()}
                generatedAt={new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })}
            />
        </main>
    );
}