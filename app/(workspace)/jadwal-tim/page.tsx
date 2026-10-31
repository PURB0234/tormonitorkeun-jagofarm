"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    MapPin,
    Sprout,
    Droplets,
    Loader2,
    Trash2,
    CheckCircle2
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import ModalTambahJadwal from "@/app/components/modal/ModalTambahJadwal";
import ModalEditJadwal from "@/app/components/modal/ModalEditJadwal";

type JadwalRow = {
    id: string;
    nama_kegiatan: string;
    penanggung_jawab_id?: string | null;
    penanggung_jawab_nama: string;
    tanggal: string; // YYYY-MM-DD
    waktu_mulai: string;
    waktu_selesai: string;
    lokasi?: string | null;
    catatan?: string | null;
    tag?: string | null;
    status: string;
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
    const [viewMode, setViewMode] = useState<"mingguan" | "bulanan">("mingguan");
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
        // 1. Hapus seketika dari state UI (layar langsung bersih tanpa tunggu loading)
        setJadwals((prev) => prev.filter((item) => item.id !== id));

        // 2. Eksekusi hapus di Supabase
        const supabase = createClient();
        const { error } = await supabase.from("jadwal_kegiatan").delete().eq("id", id);

        if (error) {
            alert("Gagal menghapus dari database: " + error.message);
            // Jika gagal di server, ambil ulang data
            fetchJadwal();
            fetchActiveMonths();
            fetchCompletedMonths();
        } else {
            fetchActiveMonths();
            fetchCompletedMonths();
        }
    };

    const handleCompleteJadwal = async (item: JadwalRow) => {
        const supabase = createClient();

        // 1. Optimistic Update state jadwal di frontend
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "selesai" } : j))
        );

        // 2. Update status jadwal_kegiatan di database
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

        // 3. Otomatis buat data di tabel catatan_pekerjaan
        const { error: insertCatatanError } = await supabase
            .from("catatan_pekerjaan")
            .insert({
                judul: item.nama_kegiatan,
                penanggung_jawab: item.penanggung_jawab_nama,
                penanggung_jawab_id: item.penanggung_jawab_id || null,
                status: "selesai",
                lokasi: item.lokasi || "Area Kebun",
                deskripsi:
                    item.catatan ||
                    "Kegiatan telah dilaksanakan sesuai jadwal operasional (" +
                    item.waktu_mulai.slice(0, 5) +
                    " - " +
                    item.waktu_selesai.slice(0, 5) +
                    ").",
            });

        if (insertCatatanError) {
            console.error("Gagal sinkron ke catatan:", insertCatatanError.message);
        }

        // 4. Perbarui bulan beragenda
        fetchActiveMonths();
        fetchCompletedMonths();
    };

    // Ambil data jadwal dari Supabase
    const fetchJadwal = useCallback(async () => {
        const supabase = createClient();
        const startStr = toIsoDate(monday);
        const endStr = toIsoDate(sunday);

        const { data, error } = await supabase
            .from("jadwal_kegiatan")
            .select("*")
            .gte("tanggal", startStr)
            .lte("tanggal", endStr)
            .order("waktu_mulai", { ascending: true });

        if (!error && data) {
            setJadwals(data);
        }
        setLoading(false);
    }, [monday, sunday]);

    useEffect(() => {
        fetchJadwal();

        // Realtime subscription
        const supabase = createClient();
        const channel = supabase
            .channel("realtime-jadwal")
            .on("postgres_changes", { event: "*", schema: "public", table: "jadwal_kegiatan" }, () => {
                fetchJadwal();
                fetchActiveMonths();
                fetchCompletedMonths();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchJadwal]);

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
                const itemIso = String(item.tanggal).slice(0, 10);
                return itemIso === iso;
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
                        Koordinasi kegiatan lapangan, panen, perawatan, dan kunjungan mitra.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setViewMode("mingguan")}
                            className={`px-3 py-1 rounded-md transition ${viewMode === "mingguan"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Mingguan
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("bulanan")}
                            className={`px-3 py-1 rounded-md transition ${viewMode === "bulanan"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Bulanan
                        </button>

                    </div>

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
                                if (!val) return;
                                setSelectedMonthKey(val);
                                setSelectedCompletedMonthKey(""); // Reset dropdown sebelah
                                setFilterStatus("terjadwal");     // Otomatis arahkan ke filter aktif
                                const target = activeMonths.find((m) => m.key === val);
                                if (target) {
                                    setAnchorDate(new Date(target.date.getTime()));
                                }
                            }}
                            className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 hover:border-gray-400 focus:outline-hidden focus:ring-1 focus:ring-green-700 cursor-pointer"
                        >
                            <option value="">
                                {activeMonths.length > 0 ? "-- Pilih Bulan --" : "-- Tidak Ada Agenda --"}
                            </option>
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
                                if (!val) return;
                                setSelectedCompletedMonthKey(val);
                                setSelectedMonthKey("");       // Reset dropdown sebelah
                                setFilterStatus("selesai");    // Otomatis alihkan tampilan ke yang selesai
                                const target = completedMonths.find((m) => m.key === val);
                                if (target) {
                                    setAnchorDate(new Date(target.date.getTime()));
                                }
                            }}
                            className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 hover:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-700 cursor-pointer"
                        >
                            <option value="">
                                {completedMonths.length > 0 ? "-- Riwayat Selesai --" : "-- Belum Ada Selesai --"}
                            </option>
                            {completedMonths.map((m) => (
                                <option key={m.key} value={m.key}>
                                    {"✓ " + m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid Kalender 7 Kolom */}
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

            {/* Dual Drop Zones: Selesai (Kiri) & Hapus (Kanan) saat Kartu Di-drag */}
            <div
                className={`fixed bottom-6 inset-x-0 mx-auto max-w-xl z-50 flex items-center justify-center gap-4 px-4 transition-all duration-300 ${draggedItem
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-12 pointer-events-none"
                    }`}
            >
                {/* 1. Zona Selesai / Done (Hijau) */}
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
                    className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${isOverDone
                        ? "bg-emerald-600 border-emerald-700 text-white scale-105 ring-4 ring-emerald-200"
                        : "bg-white border-emerald-500 text-emerald-700"
                        }`}
                >
                    <CheckCircle2 className={"w-5 h-5 " + (isOverDone ? "animate-bounce" : "")} />
                    <span className="text-xs font-bold">
                        {isOverDone ? "Lepas untuk Selesai & Masuk Catatan!" : "Tarik ke Sini: Selesai / Done"}
                    </span>
                </div>

                {/* 2. Zona Hapus / Trash (Merah) */}
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
                    className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-no-drop ${isOverTrash
                        ? "bg-red-600 border-red-700 text-white scale-105 ring-4 ring-red-200"
                        : "bg-white border-red-400 text-red-600"
                        }`}
                >
                    <Trash2 className={"w-5 h-5 " + (isOverTrash ? "animate-bounce" : "")} />
                    <span className="text-xs font-bold">
                        {isOverTrash ? "Lepas untuk Hapus!" : "Tarik ke Sini: Hapus"}
                    </span>
                </div>
            </div>
        </main>
    );
}