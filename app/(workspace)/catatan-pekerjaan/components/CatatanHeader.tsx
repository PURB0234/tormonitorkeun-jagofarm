"use client";

import { Search, ArrowUpDown } from "lucide-react";

export type SortOption = "semua" | "terbaru" | "terlama" | "status-dikerjakan" | "status-selesai" | "petugas";

type CatatanHeaderProps = {
    search: string;
    onSearchChange: (value: string) => void;
    sortBy: SortOption;
    onSortChange: (value: SortOption) => void;
    activeCount?: number;
};

export default function CatatanHeader({
    search,
    onSearchChange,
    sortBy,
    onSortChange,
}: CatatanHeaderProps) {
    return (
        <header className="space-y-4 p-4 border border-gray-200 bg-white rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Catatan Pekerjaan Tim JagoFarm</h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Dokumentasi operasional, progres teknis, dan bukti pekerjaan harian tim lapangan.
                    </p>
                </div>
                {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 shadow-2xs self-start">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    {activeCount} Personel Bertugas Lapangan Hari Ini
                </div> */}
            </div>

            {/* Filter & Pencarian */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Cari catatan, lokasi, petugas..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Urutkan:</span>
                    <div className="relative inline-flex items-center">
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as SortOption)}
                            className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-1 focus:ring-green-600 cursor-pointer"
                        >
                            <option value="semua">All</option>
                            <option value="terbaru">Terbaru dibuat</option>
                            <option value="terlama">Terlama dibuat</option>
                            <option value="status-dikerjakan">Dikerjakan</option>
                            <option value="status-selesai">Selesai</option>
                            <option value="petugas">Petugas (A-Z)</option>
                        </select>
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
                    </div>
                </div>
            </div>
        </header>
    );
}