"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    Calendar,
    BarChart3,
    Plus,
    Printer,
} from "lucide-react";
import CatatanList, { Catatan } from "./CatatanList";
import CatatanDetail from "./CatatanDetail";
import CatatanHeader, { SortOption } from "./CatatanHeader";
import CatatanTimelineSection from "./CatatanTimelineSection";
import ModalTambahKegiatan from "@/app/components/modal/ModalTambahKegiatan";
import ModalEditKegiatan from "@/app/components/modal/ModalEditKegiatan";

export type ViewMode = "catatan" | "kalender" | "gantt";

export default function CatatanWorkspace({
    catatans,
    initialId,
    initialView = "catatan",
    currentUser,
}: {
    catatans: Catatan[];
    initialId?: string;
    initialView?: ViewMode;
    currentUser: { id: string; role: string; name: string };
}) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<ViewMode>(initialView);
    const [selectedId, setSelectedId] = useState(initialId || catatans[0]?.id);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("semua");

    // Modal States
    const [isTambahModalOpen, setIsTambahModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<any | null>(null);

    useEffect(() => {
        const onSync = () => router.refresh();
        window.addEventListener("app:sync", onSync);
        return () => window.removeEventListener("app:sync", onSync);
    }, [router]);

    useEffect(() => {
        if (initialView && ["catatan", "kalender", "gantt"].includes(initialView)) {
            setViewMode(initialView);
        }
    }, [initialView]);

    const filteredCatatans = useMemo(() => {
        let result = [...catatans];

        if (sortBy === "status-dikerjakan") {
            result = result.filter((c) => c.status === "dikerjakan");
        } else if (sortBy === "status-selesai") {
            result = result.filter((c) => c.status === "selesai");
        }

        // 1. Filter Pencarian (judul, deskripsi, lokasi, penanggung jawab)
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (c) =>
                    c.judul.toLowerCase().includes(q) ||
                    c.deskripsi?.toLowerCase().includes(q) ||
                    c.lokasi?.toLowerCase().includes(q) ||
                    c.penanggung_jawab?.toLowerCase().includes(q)
            );
        }

        // 2. Sort By
        result.sort((a, b) => {
            if (sortBy === "semua") {
                return 0;
            }
            if (sortBy === "terbaru") {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortBy === "terlama") {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            if (sortBy === "status-dikerjakan") {
                if (a.status === b.status) return 0;
                return a.status === "dikerjakan" ? -1 : 1;
            }
            if (sortBy === "status-selesai") {
                if (a.status === b.status) return 0;
                return a.status === "selesai" ? -1 : 1;
            }
            if (sortBy === "petugas") {
                return (a.penanggung_jawab || "").localeCompare(b.penanggung_jawab || "");
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [catatans, search, sortBy]);

    const activeCatatan =
        filteredCatatans.find((c) => c.id === selectedId) || filteredCatatans[0] || null;

    return (
        <div className="space-y-6">
            {/* Header Ruang Kerja Terpadu */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catatan & Kegiatan Tim</h1>
                        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Sistem Terpadu
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Dokumentasi log harian, kalender jadwal operasional, dan timeline Gantt chart dalam satu sistem.
                    </p>
                </div>

                {/* Sisi Kanan: Switcher 3 Mode + Tombol Tambah & Cetak */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Switcher 3 Mode */}
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setViewMode("catatan")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${viewMode === "catatan"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Daftar Catatan</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("kalender")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${viewMode === "kalender"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Kalender Jadwal</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("gantt")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${viewMode === "gantt"
                                ? "bg-white text-gray-900 shadow-2xs font-semibold"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Gantt Chart</span>
                        </button>
                    </div>

                    {/* Tombol Cetak Laporan PDF */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer"
                        title="Cetak Laporan Resmi atau Ekspor ke PDF"
                    >
                        <Printer className="w-3.5 h-3.5 text-gray-600" />
                        <span>Cetak Laporan</span>
                    </button>

                    {/* Tombol Tambah Kegiatan Baru
                    <button
                        type="button"
                        onClick={() => setIsTambahModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#17462e] hover:bg-[#123824] text-white rounded-lg text-xs font-medium transition shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Kegiatan</span>
                    </button> */}
                </div>
            </div>

            {/* Konten Sesuai Mode Pilihan */}
            {viewMode === "catatan" ? (
                <div className="space-y-4">
                    <CatatanHeader
                        search={search}
                        onSearchChange={setSearch}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-7">
                            <CatatanList
                                catatans={filteredCatatans}
                                activeId={activeCatatan?.id}
                                currentUser={currentUser}
                                onSelect={(id) => setSelectedId(id)}
                            />
                        </div>
                        <div className="lg:col-span-5">
                            <CatatanDetail
                                catatan={activeCatatan}
                                currentUser={currentUser}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <CatatanTimelineSection
                    viewMode={viewMode}
                    onSelectTask={(task) => {
                        setSelectedTaskToEdit(task);
                        setIsEditModalOpen(true);
                    }}
                />
            )}

            {/* Modal Tambah Kegiatan (Terpadu) */}
            <ModalTambahKegiatan
                isOpen={isTambahModalOpen}
                onClose={() => setIsTambahModalOpen(false)}
            />

            {/* Modal Edit Kegiatan (Terpadu) */}
            <ModalEditKegiatan
                isOpen={isEditModalOpen}
                jadwal={selectedTaskToEdit}
                currentUser={currentUser}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedTaskToEdit(null);
                }}
            />
        </div>
    );
}