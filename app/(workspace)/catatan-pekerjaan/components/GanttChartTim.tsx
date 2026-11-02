"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
    Clock,
    Calendar,
    MapPin,
    CheckCircle2,
    Tag,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    RotateCcw,
    Layers,
    Users,
} from "lucide-react";

export type JadwalRow = {
    id: string;
    nama_kegiatan: string;
    penanggung_jawab_id?: string | null;
    penanggung_jawab_nama: string;
    tanggal: string;
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

type MonthOption = { key: string; label: string; date: Date; count: number };

type GanttProps = {
    weekDays: any[];
    jadwals: JadwalRow[];
    filterStatus: "semua" | "terjadwal" | "selesai";
    selectedStaff: string;
    anchorDate: Date;
    onSelectTask: (task: JadwalRow) => void;
    getDotColor: (name: string) => string;
    realCurrentYear: number;
    realCurrentMonth: number;
    onFilterStatusChange?: (status: "semua" | "terjadwal" | "selesai") => void;
    onSelectedStaffChange?: (staff: string) => void;
    staffList?: { label: string; text: string }[];
    activeMonths?: MonthOption[];
    selectedMonthKey?: string;
    onSelectMonth?: (key: string, date?: Date) => void;
    completedMonths?: MonthOption[];
    selectedCompletedMonthKey?: string;
    onSelectCompletedMonth?: (key: string, date?: Date) => void;
};

function toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

function addDays(d: Date, n: number): Date {
    const clone = new Date(d);
    clone.setDate(clone.getDate() + n);
    return clone;
}

function parseYmd(str: string): Date {
    const clean = str.slice(0, 10);
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
    return new Date();
}

const HARI_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function GanttChartTim({
    jadwals,
    filterStatus,
    selectedStaff,
    anchorDate,
    onSelectTask,
    getDotColor,
    onFilterStatusChange,
    onSelectedStaffChange,
    staffList,
    activeMonths,
    selectedMonthKey,
    onSelectMonth,
    completedMonths,
    selectedCompletedMonthKey,
    onSelectCompletedMonth,
}: GanttProps) {
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [metaWidth, setMetaWidth] = useState<number>(380); // Lebar kolom metadata (kegiatan, pic, status)
    const [isResizingMeta, setIsResizingMeta] = useState<boolean>(false);
    const resizeStartXRef = useRef<number>(0);
    const resizeStartWidthRef = useRef<number>(380);

    const [isPanning, setIsPanning] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // State untuk Drag-Resize Durasi Bar Timeline (w-resize)
    type BarResizeState = {
        taskId: string;
        initialMouseX: number;
        initialEndIndex: number;
        startIndex: number;
        currentEndIndex: number;
    };
    const [resizingBar, setResizingBar] = useState<BarResizeState | null>(null);

    // State untuk Drag and Drop Pindah Tanggal (seperti di kalender jadwal)
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [draggedTask, setDraggedTask] = useState<JadwalRow | null>(null);
    const [dragOverCol, setDragOverCol] = useState<number | null>(null);

    const [optimisticDates, setOptimisticDates] = useState<Record<string, string | null>>({});
    const justResizedBarRef = useRef(false);

    // Escape listener & Body scroll-lock saat Layar Penuh (mencegah scroll trap)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullscreen]);

    // Global listener mouseup agar drag pan tidak nyangkut saat kursor keluar container
    useEffect(() => {
        const onGlobalMouseUp = () => {
            if (isPanning) setIsPanning(false);
        };
        window.addEventListener("mouseup", onGlobalMouseUp);
        return () => window.removeEventListener("mouseup", onGlobalMouseUp);
    }, [isPanning]);

    // 1. Filter & Urutkan jadwals berdasarkan status dan staff (HITUNG DULUAN)
    const sortedJadwals = useMemo(() => {
        return [...jadwals]
            .filter((task) => {
                // Filter berdasarkan status
                const matchStatus =
                    filterStatus === "semua" ||
                    (filterStatus === "selesai" && task.status === "selesai") ||
                    (filterStatus === "terjadwal" && task.status !== "selesai");

                // Filter berdasarkan staff
                const matchStaff =
                    selectedStaff === "Semua" ||
                    task.penanggung_jawab_nama.toLowerCase().includes("tim") ||
                    task.penanggung_jawab_nama.toLowerCase().includes(selectedStaff.toLowerCase().split(" ")[0]);

                return matchStatus && matchStaff;
            })
            .sort((a, b) => {
                const dateA = String(a.tanggal).slice(0, 10);
                const dateB = String(b.tanggal).slice(0, 10);
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return a.waktu_mulai.localeCompare(b.waktu_mulai);
            });
    }, [jadwals, filterStatus, selectedStaff]);

    // 2. Generate date columns (SEMUA hari dalam rentang data, tidak terbatas 28 hari)
    const dateColumns = useMemo(() => {
        const todayIso = toIsoDate(new Date());
        const anchorIso = toIsoDate(anchorDate);
        const dates: string[] = [anchorIso, todayIso];

        // Kumpulkan semua tanggal dari seluruh agenda yang valid
        sortedJadwals.forEach((t) => {
            if (t.tanggal && /^\d{4}-\d{2}-\d{2}/.test(String(t.tanggal))) {
                dates.push(String(t.tanggal).slice(0, 10));
            }
            if (t.tanggal_selesai && /^\d{4}-\d{2}-\d{2}/.test(String(t.tanggal_selesai))) {
                dates.push(String(t.tanggal_selesai).slice(0, 10));
            }
        });

        dates.sort();
        const earliest = dates[0];
        const latest = dates[dates.length - 1];

        // Berikan buffer agar timeline leluasa digeser: 14 hari sebelum & 28 hari setelah
        const startDate = addDays(parseYmd(earliest), -14);
        let endDate = addDays(parseYmd(latest), 28);

        // Pastikan rentang minimal 60 hari agar tampilan luas dan dinamis
        const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (totalDays < 60) {
            endDate = addDays(startDate, 60);
        }

        const cols: { iso: string; day: number; month: string; dayName: string; isToday: boolean }[] = [];
        let curr = new Date(startDate);
        const endIso = toIsoDate(endDate);

        let maxGuard = 0;
        while (toIsoDate(curr) <= endIso && maxGuard < 200) {
            const iso = toIsoDate(curr);
            cols.push({
                iso,
                day: curr.getDate(),
                month: BULAN_NAMES[curr.getMonth()].slice(0, 3),
                dayName: HARI_NAMES[curr.getDay()].slice(0, 3),
                isToday: iso === todayIso,
            });
            curr = addDays(curr, 1);
            maxGuard++;
        }

        return cols;
    }, [sortedJadwals, anchorDate]);

    // Lebar kolom tanggal per hari (dipengaruhi zoom)
    const baseColWidth = 75;
    const finalColWidth = Math.round(baseColWidth * zoomLevel);

    // Window event listeners untuk resize kolom metadata yang mulus
    useEffect(() => {
        if (!isResizingMeta) return;

        const onMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - resizeStartXRef.current;
            const newWidth = Math.min(650, Math.max(260, resizeStartWidthRef.current + delta));
            setMetaWidth(newWidth);
        };

        const onMouseUp = () => {
            setIsResizingMeta(false);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [isResizingMeta]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizingMeta(true);
        resizeStartXRef.current = e.clientX;
        resizeStartWidthRef.current = metaWidth;
    };

    // Window event listeners untuk drag-resize durasi bar agenda di timeline
    useEffect(() => {
        if (!resizingBar) return;

        const onMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - resizingBar.initialMouseX;
            const colDelta = Math.round(deltaX / finalColWidth);
            const rawEnd = resizingBar.initialEndIndex + colDelta;
            const newEnd = Math.max(resizingBar.startIndex, Math.min(dateColumns.length - 1, rawEnd));
            if (newEnd !== resizingBar.currentEndIndex) {
                setResizingBar((prev) => (prev ? { ...prev, currentEndIndex: newEnd } : null));
            }
        };

        const onMouseUp = async () => {
            const current = resizingBar;
            setResizingBar(null);
            if (!current) return;

            justResizedBarRef.current = true;
            setTimeout(() => {
                justResizedBarRef.current = false;
            }, 250);

            if (current.currentEndIndex !== current.initialEndIndex) {
                const targetEndDate =
                    current.currentEndIndex > current.startIndex
                        ? dateColumns[current.currentEndIndex].iso
                        : null;

                setOptimisticDates((prev) => ({
                    ...prev,
                    [current.taskId]: targetEndDate,
                }));

                const supabase = createClient();
                const { error } = await supabase
                    .from("jadwal_kegiatan")
                    .update({ tanggal_selesai: targetEndDate })
                    .eq("id", current.taskId);

                if (!error && typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("app:sync"));
                }
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [resizingBar, finalColWidth, dateColumns]);

    const handleBarResizeStart = (
        e: React.MouseEvent,
        taskId: string,
        startIndex: number,
        endIndex: number
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingBar({
            taskId,
            initialMouseX: e.clientX,
            initialEndIndex: endIndex,
            startIndex,
            currentEndIndex: endIndex,
        });
    };

    // Handler Drag-and-Drop: Pindah Tanggal Agenda ke Kolom Baru (seperti di kalender jadwal)
    const handleDropTaskOnCol = async (droppedTask: JadwalRow, targetColIdx: number) => {
        const startStr = String(droppedTask.tanggal || "").slice(0, 10);
        const endStr = droppedTask.tanggal_selesai ? String(droppedTask.tanggal_selesai).slice(0, 10) : startStr;
        const origStartIdx = dateColumns.findIndex((col) => col.iso === startStr);
        const origEndIdx = dateColumns.findIndex((col) => col.iso === endStr);

        const duration = (origStartIdx !== -1 && origEndIdx !== -1 && origEndIdx >= origStartIdx)
            ? origEndIdx - origStartIdx
            : 0;

        const maxStartIdx = Math.max(0, dateColumns.length - 1 - duration);
        const clampedStartIdx = Math.max(0, Math.min(maxStartIdx, targetColIdx));
        const clampedEndIdx = clampedStartIdx + duration;

        const newStartDate = dateColumns[clampedStartIdx]?.iso;
        const newEndDate = duration > 0 ? dateColumns[clampedEndIdx]?.iso : null;

        if (!newStartDate) return;

        // Optimistic UI update
        setOptimisticDates((prev) => ({
            ...prev,
            [droppedTask.id + "_start"]: newStartDate,
            [droppedTask.id]: newEndDate,
        }));

        const supabase = createClient();
        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({
                tanggal: newStartDate,
                tanggal_selesai: newEndDate,
            })
            .eq("id", droppedTask.id);

        if (!error && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // Auto-scroll ke anchorDate atau today saat pertama kali load atau saat anchorDate berganti
    useEffect(() => {
        if (!containerRef.current) return;
        const targetIso = toIsoDate(anchorDate);
        const colIndex = dateColumns.findIndex((c) => c.iso === targetIso);
        if (colIndex !== -1) {
            const targetLeft = Math.max(0, (colIndex - 2) * finalColWidth);
            containerRef.current.scrollTo({ left: targetLeft, behavior: "smooth" });
        }
    }, [anchorDate, dateColumns, finalColWidth]);

    // 3. Warna bar
    const getBarColor = (item: JadwalRow) => {
        if (item.status === "selesai") {
            return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600";
        }
        if (item.tag?.toUpperCase() === "PANEN") {
            return "bg-green-600 hover:bg-green-700 text-white border-green-700";
        }
        if (item.tag?.toLowerCase().includes("tim")) {
            return "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700";
        }
        if (item.status === "perlu_update") {
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
        }
        return "bg-amber-500 hover:bg-amber-600 text-white border-amber-600";
    };

    // 4. Mouse Drag Pan (X & Y)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (draggedTaskId || resizingBar) return;
        if ((e.target as HTMLElement).closest("button, .task-bar, .cursor-pointer, .resizer-handle, a, input, select")) return;
        setIsPanning(true);
        setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
        setScrollLeft(containerRef.current?.scrollLeft || 0);
        setStartY(e.pageY - (containerRef.current?.offsetTop || 0));
        setScrollTop(containerRef.current?.scrollTop || 0);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walkX = (x - startX) * 1.5;
        containerRef.current.scrollLeft = scrollLeft - walkX;

        const y = e.pageY - containerRef.current.offsetTop;
        const walkY = (y - startY) * 1.5;
        containerRef.current.scrollTop = scrollTop - walkY;
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // 5. Smart Wheel Scroll (Anti-Scroll Trap: Mencegah Kursor Terkunci)
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isFullscreen) return;
        const el = containerRef.current;
        if (!el) return;

        // Hanya intervensi jika gerakan vertikal lebih dominan (mouse wheel standar)
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            const canScrollVertically = el.scrollHeight > el.clientHeight + 4;

            // Jika konten muat di dalam (tidak ada scroll vertikal internal)
            if (!canScrollVertically) {
                window.scrollBy({ top: e.deltaY, behavior: "auto" });
                return;
            }

            // Jika sudah di batas paling atas dan user scroll ke atas
            if (el.scrollTop <= 0 && e.deltaY < 0) {
                window.scrollBy({ top: e.deltaY, behavior: "auto" });
                return;
            }

            // Jika sudah di batas paling bawah dan user terus scroll ke bawah
            const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
            if (isAtBottom && e.deltaY > 0) {
                window.scrollBy({ top: e.deltaY, behavior: "auto" });
                return;
            }
        }
    };

    const totalTimelineWidth = dateColumns.length * finalColWidth;

    return (
        <div className={isFullscreen ? "fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-xs p-4 flex flex-col h-screen w-screen space-y-3" : "space-y-3"}>
            {/* Toolbar: Zoom Controls + Fullscreen + Legenda (+ Filtering jika Layar Penuh) */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-3 shadow-2xs">
                {/* Baris 1: Header Judul & Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                                <Layers className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-gray-900">
                                    {isFullscreen ? "Timeline Gantt Chart (Layar Penuh)" : "Timeline Dinamis"}
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    {sortedJadwals.length} agenda • {dateColumns.length} hari
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sisi Kanan Toolbar: Zoom + Fullscreen Toggle + Legenda */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Zoom Controls (Sumbu Z) */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase">Zoom:</span>
                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                                <button
                                    type="button"
                                    title="Zoom Out (Sumbu Z)"
                                    onClick={() => setZoomLevel((prev) => Math.max(0.6, Number((prev - 0.2).toFixed(1))))}
                                    className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition cursor-pointer"
                                >
                                    <ZoomOut className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                                <span className="text-xs font-semibold text-gray-700 px-2 min-w-[50px] text-center">
                                    {Math.round(zoomLevel * 100) + "%"}
                                </span>
                                <button
                                    type="button"
                                    title="Zoom In (Sumbu Z)"
                                    onClick={() => setZoomLevel((prev) => Math.min(1.8, Number((prev + 0.2).toFixed(1))))}
                                    className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition cursor-pointer"
                                >
                                    <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(1)}
                                    className="p-1.5 text-gray-500 hover:text-gray-800 cursor-pointer"
                                    title="Reset Zoom ke 100%"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Tombol Mode Layar Penuh (Sticky Header & Bebas Scroll Trap) */}
                        <button
                            type="button"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                isFullscreen
                                    ? "bg-[#17462e] text-white border-[#17462e] shadow-xs hover:bg-[#123824]"
                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-2xs"
                            }`}
                            title={isFullscreen ? "Keluar Layar Penuh (Tekan Esc)" : "Aktifkan Layar Penuh"}
                        >
                            {isFullscreen ? (
                                <>
                                    <Minimize2 className="w-3.5 h-3.5" />
                                    <span>Keluar Layar Penuh</span>
                                </>
                            ) : (
                                <>
                                    <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                                    <span>Layar Penuh</span>
                                </>
                            )}
                        </button>

                        {/* Legenda Warna */}
                        <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-gray-600 pl-2 border-l border-gray-200">
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                                <span>Selesai</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-green-600"></span>
                                <span>Panen</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>
                                <span>Tim</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                                <span>Operasional</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Baris 2: Filtering Khusus Mode Layar Penuh (taste-skill compliant) */}
                {isFullscreen && (
                    <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        {/* Status Filter Segmented Control */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-gray-500">Status:</span>
                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => onFilterStatusChange?.("terjadwal")}
                                    className={
                                        "px-2.5 py-1 rounded-md transition cursor-pointer " +
                                        (filterStatus === "terjadwal"
                                            ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                            : "text-gray-600 hover:text-gray-900")
                                    }
                                >
                                    Diagendakan (Aktif)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFilterStatusChange?.("selesai")}
                                    className={
                                        "px-2.5 py-1 rounded-md transition cursor-pointer " +
                                        (filterStatus === "selesai"
                                            ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                            : "text-gray-600 hover:text-gray-900")
                                    }
                                >
                                    Telah Dilaksanakan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onFilterStatusChange?.("semua")}
                                    className={
                                        "px-2.5 py-1 rounded-md transition cursor-pointer " +
                                        (filterStatus === "semua"
                                            ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                            : "text-gray-600 hover:text-gray-900")
                                    }
                                >
                                    Semua
                                </button>
                            </div>
                        </div>

                        {/* Sisi Kanan: Petugas + Bulan Dropdowns */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Petugas Select */}
                            {staffList && staffList.length > 0 && (
                                <div className="flex items-center gap-1.5 text-gray-600 bg-white border border-gray-300 px-2.5 py-1 rounded-lg shadow-2xs">
                                    <Users className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <span className="text-[11px] font-semibold text-gray-500">Petugas:</span>
                                    <select
                                        value={selectedStaff}
                                        onChange={(e) => onSelectedStaffChange?.(e.target.value)}
                                        className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer"
                                    >
                                        {staffList.map((st) => (
                                            <option key={st.label} value={st.label}>
                                                {st.text}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Dropdown Bulan */}
                            {activeMonths && (
                                <div className="flex items-center gap-1.5 text-gray-600 bg-white border border-gray-300 px-2.5 py-1 rounded-lg shadow-2xs">
                                    <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <span className="text-[11px] font-semibold text-gray-500">Bulan:</span>
                                    <select
                                        value={selectedMonthKey || selectedCompletedMonthKey || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                                onSelectMonth?.("");
                                                onSelectCompletedMonth?.("");
                                                return;
                                            }
                                            const activeTarget = activeMonths.find((m) => m.key === val);
                                            if (activeTarget) {
                                                onSelectMonth?.(val, activeTarget.date);
                                                return;
                                            }
                                            const compTarget = completedMonths?.find((m) => m.key === val);
                                            if (compTarget) {
                                                onSelectCompletedMonth?.(val, compTarget.date);
                                            }
                                        }}
                                        className="text-xs font-semibold text-gray-800 bg-transparent outline-none cursor-pointer"
                                    >
                                        <option value="">-- Tidak Ada Filter --</option>
                                        {activeMonths.length > 0 && (
                                            <optgroup label="Bulan Beragenda">
                                                {activeMonths.map((m) => (
                                                    <option key={m.key} value={m.key}>
                                                        {m.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {completedMonths && completedMonths.length > 0 && (
                                            <optgroup label="Telah Dilaksanakan">
                                                {completedMonths.map((m) => (
                                                    <option key={m.key} value={m.key}>
                                                        {"✓ " + m.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Container Timeline dengan Pan X,Y + Anti-Scroll Trap */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className={
                    (isFullscreen
                        ? "flex-1 w-full overflow-auto overscroll-contain bg-white border border-gray-300 rounded-xl shadow-lg select-none "
                        : "overflow-auto max-h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl shadow-2xs select-none ") +
                    (resizingBar ? "cursor-w-resize select-none " : isResizingMeta ? "cursor-col-resize select-none " : isPanning ? "cursor-grabbing " : "cursor-default ")
                }
            >
                <div
                    style={{
                        width: metaWidth + totalTimelineWidth + "px",
                        minWidth: "100%",
                    }}
                    className="relative flex flex-col"
                >
                    {/* Header Row: Kolom Kiri (Metadata) + Kolom Kanan (Timeline Dates) */}
                    <div className="sticky top-0 z-30 flex bg-slate-100 border-b border-gray-300 text-xs font-bold text-gray-700 shadow-2xs">
                        {/* Kiri: 3 Kolom Metadata (Sticky Left) */}
                        <div
                            style={{ width: metaWidth + "px" }}
                            className="sticky left-0 z-40 shrink-0 bg-slate-100 border-r border-gray-300 flex items-center divide-x divide-gray-200 relative"
                        >
                            <div className="flex-1 px-3 py-3 min-w-0">Nama Kegiatan</div>
                            <div className="w-24 shrink-0 px-2 py-3 text-center">PIC</div>
                            <div className="w-24 shrink-0 px-2 py-3 text-center">Status</div>

                            {/* Resize Handle pada garis vertikal kanan metadata */}
                            <div
                                onMouseDown={handleResizeStart}
                                title="Tarik untuk mengubah lebar kolom Nama Kegiatan | PIC | Status"
                                className="resizer-handle absolute top-0 -right-1.5 w-3 h-full cursor-col-resize hover:bg-emerald-500/40 active:bg-emerald-600 transition-colors z-40"
                            />
                        </div>

                        {/* Kanan: Timeline Dates (Dynamic Columns) */}
                        <div
                            style={{ width: totalTimelineWidth + "px" }}
                            className="shrink-0 flex bg-slate-50"
                        >
                            {dateColumns.map((col) => (
                                <div
                                    key={col.iso}
                                    style={{ width: finalColWidth + "px" }}
                                    className={
                                        "shrink-0 border-r border-gray-200 text-center py-2 " +
                                        (col.isToday ? "bg-emerald-100/90 text-emerald-950 font-bold" : "")
                                    }
                                >
                                    <div className="text-[10px] uppercase font-semibold text-gray-500">
                                        {col.dayName}
                                    </div>
                                    <div className="text-xs font-bold">{col.day}</div>
                                    <div className="text-[9px] text-gray-400">{col.month}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data Rows: Semua Agenda */}
                    {sortedJadwals.length === 0 ? (
                        <div className="py-20 text-center text-xs text-gray-400">
                            Tidak ada agenda yang terdaftar.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {sortedJadwals.map((task) => {
                                const optStart = optimisticDates[task.id + "_start"];
                                const rawStart = optStart || String(task.tanggal || "").slice(0, 10);
                                const startIso = /^\d{4}-\d{2}-\d{2}/.test(rawStart) ? rawStart : toIsoDate(anchorDate);
                                const optEnd = optimisticDates[task.id];
                                const rawEnd = optEnd !== undefined
                                    ? (optEnd || startIso)
                                    : (task.tanggal_selesai ? String(task.tanggal_selesai).slice(0, 10) : startIso);
                                const endIso = /^\d{4}-\d{2}-\d{2}/.test(rawEnd) && rawEnd >= startIso ? rawEnd : startIso;

                                // Cari index kolom start & end di dateColumns
                                let startIndex = dateColumns.findIndex((col) => col.iso === startIso);
                                let endIndex = dateColumns.findIndex((col) => col.iso === endIso);

                                // Toleransi jepit batas
                                if (startIndex === -1 && startIso < (dateColumns[0]?.iso || "")) {
                                    startIndex = 0;
                                }
                                if (endIndex === -1 && endIso > (dateColumns[dateColumns.length - 1]?.iso || "")) {
                                    endIndex = dateColumns.length - 1;
                                }
                                if (startIndex === -1 && endIndex !== -1) startIndex = 0;
                                if (endIndex === -1 && startIndex !== -1) endIndex = startIndex;

                                const isThisBarResizing = resizingBar?.taskId === task.id;
                                const effectiveEndIndex = isThisBarResizing ? resizingBar.currentEndIndex : endIndex;
                                const isVisible = startIndex !== -1 && effectiveEndIndex !== -1 && effectiveEndIndex >= startIndex;
                                const effectiveSpanWidth = isVisible ? (effectiveEndIndex - startIndex + 1) * finalColWidth : 0;
                                const leftOffset = isVisible ? startIndex * finalColWidth : 0;

                                // Deteksi durasi multi-hari
                                const effectiveDiffDays = isVisible ? (effectiveEndIndex - startIndex + 1) : 1;
                                const effectiveIsMultiDay = effectiveDiffDays > 1;

                                const isBeingDragged = draggedTaskId === task.id;

                                return (
                                    <div
                                        key={task.id}
                                        className="flex hover:bg-slate-50/70 transition group text-xs relative"
                                    >
                                        {/* Kiri: Metadata Baris (Sticky Left) */}
                                        <div
                                            style={{ width: metaWidth + "px" }}
                                            className="sticky left-0 z-20 shrink-0 bg-white group-hover:bg-slate-50 border-r border-gray-300 flex items-center divide-x divide-gray-100 relative shadow-2xs"
                                        >
                                            {/* Nama Kegiatan & Waktu */}
                                            <div
                                                className="flex-1 min-w-0 px-3 py-2.5 cursor-pointer"
                                                onClick={() => onSelectTask(task)}
                                            >
                                                <div className="font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition">
                                                    {task.nama_kegiatan}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                                    <span className="flex items-center gap-1 shrink-0">
                                                        {effectiveIsMultiDay ? (
                                                            <>
                                                                <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                <span className="text-emerald-700 font-semibold">{effectiveDiffDays} hari</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                                                                <span>{task.waktu_mulai.slice(0, 5)} - {task.waktu_selesai.slice(0, 5)}</span>
                                                            </>
                                                        )}
                                                    </span>
                                                    {task.lokasi && (
                                                        <span className="flex items-center gap-0.5 truncate">
                                                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                                            <span className="truncate">{task.lokasi}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* PIC */}
                                            <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center gap-1.5">
                                                <span
                                                    className={
                                                        "w-2 h-2 rounded-full shrink-0 " +
                                                        getDotColor(task.penanggung_jawab_nama)
                                                    }
                                                />
                                                <span className="text-[11px] font-medium text-gray-700 truncate text-center">
                                                    {task.penanggung_jawab_nama}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div className="w-24 shrink-0 px-2 py-2.5 flex items-center justify-center">
                                                {task.status === "selesai" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                        <CheckCircle2 className="w-3 h-3" /> Selesai
                                                    </span>
                                                ) : task.tag?.toUpperCase() === "PANEN" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">
                                                        <Tag className="w-3 h-3" /> Panen
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                                                        Terjadwal
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Kanan: Timeline Grid dengan Bar Horizontal (Drop Zone seperti kalender jadwal) */}
                                        <div
                                            style={{ width: totalTimelineWidth + "px" }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = "move";
                                                if (!containerRef.current) return;
                                                const rect = containerRef.current.getBoundingClientRect();
                                                const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft - metaWidth;
                                                const colIdx = Math.floor(mouseX / finalColWidth);
                                                const clamped = Math.max(0, Math.min(dateColumns.length - 1, colIdx));
                                                if (dragOverCol !== clamped) setDragOverCol(clamped);
                                            }}
                                            onDragLeave={() => {
                                                setDragOverCol(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (!draggedTask) return;
                                                if (!containerRef.current) return;
                                                const rect = containerRef.current.getBoundingClientRect();
                                                const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft - metaWidth;
                                                const colIdx = Math.floor(mouseX / finalColWidth);
                                                const clamped = Math.max(0, Math.min(dateColumns.length - 1, colIdx));
                                                handleDropTaskOnCol(draggedTask, clamped);
                                                setDragOverCol(null);
                                                setDraggedTask(null);
                                                setDraggedTaskId(null);
                                            }}
                                            className="shrink-0 relative h-14"
                                        >
                                            {/* Background Grid Lines & Highlight Drop Target */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {dateColumns.map((col, colIdx) => (
                                                    <div
                                                        key={col.iso}
                                                        style={{ width: finalColWidth + "px" }}
                                                        className={
                                                            "shrink-0 border-r border-gray-100 transition-colors " +
                                                            (dragOverCol === colIdx && draggedTaskId ? "bg-emerald-100/70 border-emerald-300 " : "") +
                                                            (col.isToday ? "bg-emerald-50/40" : "")
                                                        }
                                                    />
                                                ))}
                                            </div>

                                            {/* Timeline Bar (Horizontal Span - Draggable & Resizable) */}
                                            {isVisible && (
                                                <div
                                                    draggable={!isResizingMeta && !resizingBar}
                                                    onDragStart={(e) => {
                                                        setDraggedTaskId(task.id);
                                                        setDraggedTask(task);
                                                        e.dataTransfer.setData("text/plain", task.id);
                                                        e.dataTransfer.effectAllowed = "move";
                                                    }}
                                                    onDragEnd={() => {
                                                        setDraggedTaskId(null);
                                                        setDraggedTask(null);
                                                        setDragOverCol(null);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (justResizedBarRef.current) return;
                                                        onSelectTask(task);
                                                    }}
                                                    className={
                                                        "task-bar absolute top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md border text-xs font-medium shadow-xs transition-all flex items-center justify-between group select-none cursor-grab active:cursor-grabbing hover:scale-[1.01] hover:shadow-md " +
                                                        (isBeingDragged ? "opacity-40 ring-2 ring-emerald-500 scale-[0.98] " : "") +
                                                        (isThisBarResizing ? "z-30 ring-2 ring-slate-900 shadow-lg cursor-w-resize " : "z-[2] ") +
                                                        getBarColor(task)
                                                    }
                                                    style={{
                                                        left: leftOffset + 4 + "px",
                                                        width: Math.max(28, effectiveSpanWidth - 8) + "px",
                                                    }}
                                                    title={task.nama_kegiatan + (effectiveIsMultiDay ? " (" + effectiveDiffDays + " hari)" : "") + " • Klik untuk edit • Drag untuk geser jadwal"}
                                                >
                                                    <span className="truncate font-semibold text-[11px] leading-tight pr-3 pointer-events-none">
                                                        {task.nama_kegiatan}
                                                    </span>
                                                    {effectiveIsMultiDay ? (
                                                        <span className="text-[10px] font-bold bg-black/25 px-1.5 py-0.5 rounded ml-1 mr-1.5 shrink-0 whitespace-nowrap text-white/95 pointer-events-none">
                                                            {effectiveDiffDays} hari
                                                        </span>
                                                    ) : effectiveSpanWidth >= 120 ? (
                                                        <span className="text-[10px] opacity-90 ml-1 mr-1.5 shrink-0 font-medium pointer-events-none">
                                                            {task.waktu_mulai.slice(0, 5)}
                                                        </span>
                                                    ) : null}

                                                    {/* Handle Drag Resize (Tarik Durasi Tanggal Selesai - w-resize) */}
                                                    <div
                                                        onMouseDown={(e) => {
                                                            e.stopPropagation();
                                                            handleBarResizeStart(e, task.id, startIndex, endIndex);
                                                        }}
                                                        title="Tarik ujung bar (w-resize) untuk mengubah tanggal selesai"
                                                        className="absolute right-0 top-0 bottom-0 w-3.5 hover:w-4.5 cursor-w-resize flex items-center justify-center bg-black/15 hover:bg-black/35 active:bg-black/50 transition-all rounded-r-md z-10 group/handle"
                                                    >
                                                        <div className="w-0.5 h-3 bg-white/70 rounded-full group-hover/handle:bg-white transition-all" />
                                                    </div>

                                                    {/* Tooltip Indikator Tanggal Saat Di-resize */}
                                                    {isThisBarResizing && (
                                                        <div className="absolute -top-7 right-0 z-40 pointer-events-none bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap animate-in fade-in">
                                                            Hingga {dateColumns[effectiveEndIndex]?.day} {dateColumns[effectiveEndIndex]?.month} ({effectiveDiffDays} hari)
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}