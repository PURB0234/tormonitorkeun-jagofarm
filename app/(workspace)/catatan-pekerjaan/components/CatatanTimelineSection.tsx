"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Sprout,
    Droplets,
    Loader2,
    Trash2,
    CheckCircle2,
    RefreshCw,
    CheckCheck,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import GanttChartTim from "./GanttChartTim";
import LaporanPdfPrint from "./LaporanPdfPrint";

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
    status: string;
    lampiran_url?: string | null;
    lampiran_nama?: string | null;
};

type ProfileMember = {
    id: string;
    full_name: string;
    email: string;
};

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
}

function addDays(date: Date, days: number): Date {
    const res = new Date(date);
    res.setDate(res.getDate() + days);
    return res;
}

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

type CatatanTimelineSectionProps = {
    viewMode: "kalender" | "gantt";
    onSelectTask: (task: JadwalRow) => void;
};

export default function CatatanTimelineSection({
    viewMode,
    onSelectTask,
}: CatatanTimelineSectionProps) {
    const router = useRouter();
    const [selectedStaff, setSelectedStaff] = useState<string>("Semua");
    const [members, setMembers] = useState<ProfileMember[]>([]);

    const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
    const [jadwals, setJadwals] = useState<JadwalRow[]>([]);
    const [loading, setLoading] = useState(true);

    const monday = useMemo(() => getMonday(anchorDate), [anchorDate]);
    const sunday = useMemo(() => addDays(monday, 6), [monday]);

    // Drag & Drop State
    const draggedIdRef = useRef<string | null>(null);
    const [draggableId, setDraggableId] = useState<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<JadwalRow | null>(null);
    const [isOverTrash, setIsOverTrash] = useState(false);
    const [isOverDone, setIsOverDone] = useState(false);
    const [isOverUpdate, setIsOverUpdate] = useState(false);
    const [isOverDoneUpdate, setIsOverDoneUpdate] = useState(false);
    const [isOverRevert, setIsOverRevert] = useState(false);

    // Bulan Filter State
    const [activeMonths, setActiveMonths] = useState<{ key: string; label: string; date: Date; count: number }[]>([]);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
    const [completedMonths, setCompletedMonths] = useState<{ key: string; label: string; date: Date; count: number }[]>([]);
    const [selectedCompletedMonthKey, setSelectedCompletedMonthKey] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<"semua" | "terjadwal" | "selesai">("terjadwal");

    // Real Now untuk proteksi bulan lampau
    const realNow = new Date();
    const realCurrentYear = realNow.getFullYear();
    const realCurrentMonth = realNow.getMonth();

    const fetchActiveMonths = useCallback(async () => {
        const supabase = createClient();
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

    // Hapus Kegiatan
    const handleDeleteJadwal = async (id: string, nama: string) => {
        setJadwals((prev) => prev.filter((item) => item.id !== id));
        const supabase = createClient();
        const { error } = await supabase.from("jadwal_kegiatan").delete().eq("id", id);

        if (error) {
            alert("Gagal menghapus dari database: " + error.message);
            fetchJadwal();
        } else {
            fetchActiveMonths();
            fetchCompletedMonths();
        }

        router.refresh();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // 1. Selesai (Done)
    const handleCompleteJadwal = async (item: JadwalRow) => {
        const supabase = createClient();
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "selesai" } : j))
        );

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({ status: "selesai" })
            .eq("id", item.id);

        if (error) {
            alert("Gagal mengubah status: " + error.message);
            fetchJadwal();
            return;
        }

        fetchActiveMonths();
        fetchCompletedMonths();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
        router.refresh();
    };

    // 2. Update Catatan (Tetap Terjadwal)
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

    // 3. Done + Update
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

    // 4. Kembalikan ke Dikerjakan (Dua Arah)
    const handleRevertToDikerjakan = async (item: JadwalRow) => {
        const supabase = createClient();
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "dikerjakan" } : j))
        );

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({ status: "dikerjakan" })
            .eq("id", item.id);

        if (error) {
            alert("Gagal mengubah status: " + error.message);
            fetchJadwal();
            return;
        }

        fetchActiveMonths();
        fetchCompletedMonths();
        router.refresh();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // Fetch data jadwal
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

        const supabase = createClient();
        const channel = supabase
            .channel("realtime-jadwal-section")
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

    // 7 Kolom Harian untuk mode kalender
    const weekDays = useMemo(() => {
        const todayStr = toIsoDate(new Date());

        return Array.from({ length: 7 }, (_, i) => {
            const dateObj = addDays(monday, i);
            const isoString = toIsoDate(dateObj);

            const dayTasks = jadwals.filter((item) => {
                const itemStart = String(item.tanggal).slice(0, 10);
                const itemEnd = item.tanggal_selesai
                    ? String(item.tanggal_selesai).slice(0, 10)
                    : itemStart;
                return isoString >= itemStart && isoString <= itemEnd;
            });

            return {
                hari: HARI_NAMES[i],
                tanggal: dateObj.getDate(),
                bulanTahun: BULAN_NAMES[dateObj.getMonth()].slice(0, 3) + " " + dateObj.getFullYear(),
                iso: isoString,
                isToday: isoString === todayStr,
                tasks: dayTasks,
            };
        });
    }, [monday, jadwals]);

    useEffect(() => {
        if (activeMonths.length === 0) return;
        const monKey = monday.getFullYear() + "-" + monday.getMonth();
        const matched = activeMonths.some((m) => m.key === monKey);
        setSelectedMonthKey(matched ? monKey : "");
    }, [anchorDate, monday, sunday, activeMonths]);

    const prevWeek = () => setAnchorDate((prev) => addDays(prev, -7));
    const nextWeek = () => setAnchorDate((prev) => addDays(prev, 7));

    const staffList = useMemo(() => {
        const dynamicList = members.map((m) => {
            const name = m.full_name || m.email.split("@")[0];
            return { label: name, text: name };
        });
        return [{ label: "Semua", text: "Semua Petugas" }, ...dynamicList];
    }, [members]);

    const getDotColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("tim")) return "bg-indigo-600";
        if (n.includes("budi")) return "bg-emerald-600";
        if (n.includes("siti")) return "bg-pink-600";
        if (n.includes("ahmad")) return "bg-amber-600";
        if (n.includes("rina")) return "bg-blue-600";
        return "bg-slate-400";
    };

    return (
        <div className="space-y-4">
            {/* Navigasi Tanggal & Filter Petugas */}
            <div className="flex flex-wrap items-center border border-gray-200 justify-between gap-3 p-2.5 rounded-xl bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={prevWeek}
                        className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition cursor-pointer"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={nextWeek}
                        className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition cursor-pointer"
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

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-gray-500 mr-1 text-[11px]">Petugas:</span>
                    {staffList.map((st) => (
                        <button
                            key={st.label}
                            type="button"
                            onClick={() => setSelectedStaff(st.label)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${selectedStaff === st.label
                                ? "bg-slate-900 text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {st.text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Status & Dua Dropdown Bulan */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Tab Filter Status */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">Tampilkan:</span>
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-100 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setFilterStatus("terjadwal")}
                            className={
                                "px-2.5 py-1 rounded-md font-medium transition cursor-pointer " +
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
                                "px-2.5 py-1 rounded-md font-medium transition cursor-pointer " +
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
                                "px-2.5 py-1 rounded-md font-medium transition cursor-pointer " +
                                (filterStatus === "semua"
                                    ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900")
                            }
                        >
                            Semua
                        </button>
                    </div>
                </div>

                {/* Dropdown Bulan */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[11px] font-medium text-gray-600">Bulan Beragenda:</span>
                        <select
                            value={selectedMonthKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedMonthKey(val);
                                if (val) {
                                    setSelectedCompletedMonthKey("");
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

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[11px] font-medium text-gray-600">Telah Dilaksanakan:</span>
                        <select
                            value={selectedCompletedMonthKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedCompletedMonthKey(val);
                                if (val) {
                                    setSelectedMonthKey("");
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

            {/* Konten: Kalender 7 Kolom ATAU Gantt Chart */}
            {viewMode === "gantt" ? (
                <GanttChartTim
                    weekDays={weekDays}
                    jadwals={jadwals}
                    filterStatus={filterStatus}
                    selectedStaff={selectedStaff}
                    anchorDate={anchorDate}
                    onSelectTask={onSelectTask}
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

                                            {day.isToday && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#17462e] text-white rounded">
                                                    HARI INI
                                                </span>
                                            )}
                                        </div>

                                        {/* List Kartu Tugas */}
                                        <div className="p-2 flex-1 flex flex-col gap-2">
                                            {loading ? (
                                                <div className="py-8 flex justify-center">
                                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                                </div>
                                            ) : displayedTasks.length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs mt-2">
                                                    <span>Tidak ada agenda</span>
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectTask(t);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!isSelesai) {
                                                                        if (confirm("Tandai agenda \"" + t.nama_kegiatan + "\" sebagai Selesai?")) {
                                                                            handleCompleteJadwal(t);
                                                                        }
                                                                    } else {
                                                                        if (confirm("Hapus agenda ini secara permanen?")) {
                                                                            handleDeleteJadwal(t.id, t.nama_kegiatan);
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
                                                                    setIsOverUpdate(false);
                                                                    setIsOverDoneUpdate(false);
                                                                    setIsOverRevert(false);
                                                                }}
                                                                className={
                                                                    "group relative p-2.5 rounded-lg border text-xs shadow-2xs transition-all select-none cursor-grab active:cursor-grabbing " +
                                                                    (isSelesai
                                                                        ? "bg-emerald-50/70 border-emerald-300"
                                                                        : isPanen
                                                                            ? "bg-green-50/80 border-green-200 hover:border-green-300"
                                                                            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs")
                                                                }
                                                            >
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

                                                                <h4
                                                                    className={
                                                                        "font-semibold mt-1 leading-snug " +
                                                                        (isSelesai
                                                                            ? "text-emerald-950 line-through opacity-80"
                                                                            : "text-gray-900 group-hover:text-green-800")
                                                                    }
                                                                >
                                                                    {t.nama_kegiatan}
                                                                </h4>

                                                                {t.catatan && (
                                                                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                                                        {t.catatan}
                                                                    </p>
                                                                )}

                                                                <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span
                                                                            className={
                                                                                "w-1.5 h-1.5 rounded-full " +
                                                                                getDotColor(t.penanggung_jawab_nama)
                                                                            }
                                                                        />
                                                                        <span className="truncate max-w-[80px]">
                                                                            {t.penanggung_jawab_nama}
                                                                        </span>
                                                                    </div>

                                                                    {t.lokasi && (
                                                                        <span className="text-gray-400 flex items-center gap-0.5 truncate max-w-[70px]">
                                                                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                                                            <span className="truncate">{t.lokasi}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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

            {/* Drop Zones saat Kartu Di-drag */}
            <div
                className={`fixed bottom-6 inset-x-0 mx-auto max-w-3xl z-50 flex items-center justify-center gap-2.5 px-4 transition-all duration-300 ${draggedItem
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-12 pointer-events-none"
                    }`}
            >
                {/* 1. Kondisi Selesai: Drop zone Kembalikan ke Dikerjakan (Dua Arah) */}
                {draggedItem?.status === "selesai" && (
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setIsOverRevert(true);
                        }}
                        onDragLeave={() => setIsOverRevert(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (draggedItem) {
                                handleRevertToDikerjakan(draggedItem);
                            }
                            draggedIdRef.current = null;
                            setDraggedItem(null);
                            setIsOverRevert(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${isOverRevert
                            ? "bg-amber-500 border-amber-600 text-white scale-105 ring-4 ring-amber-200"
                            : "bg-white border-amber-500 text-amber-700 hover:bg-amber-50/50"
                            }`}
                    >
                        <RefreshCw className={"w-5 h-5 shrink-0 " + (isOverRevert ? "animate-spin" : "")} />
                        <div className="text-left">
                            <div className="text-xs font-bold leading-tight">Kembalikan ke Dikerjakan</div>
                            <div className="text-[10px] opacity-80 leading-tight">Buka kembali status agenda</div>
                        </div>
                    </div>
                )}

                {/* 2. Kondisi Normal (belum selesai & tidak perlu update): Selesai (Done) */}
                {draggedItem?.status !== "selesai" && draggedItem?.status !== "perlu_update" && (
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

                {/* 3. Kondisi Perlu Update: Update Catatan & Done + Update */}
                {draggedItem?.status === "perlu_update" && (
                    <>
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

                {/* 3. Zona Hapus (Merah) */}
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
                })}
            />
        </div>
    );
}
