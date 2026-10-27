// 1. app/(workspace)/catatan-pekerjaan/components/CatatanHeader.tsx
import { Search, ChevronDown, ArrowUpDown } from "lucide-react";

export default function CatatanHeader() {
    return (
        <header className="space-y-4 p-4 border border-gray-200 bg-white rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Catatan Pekerjaan Tim</h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Dokumentasi operasional, progres teknis, dan bukti pekerjaan harian 4 anggota tim.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 shadow-2xs self-start">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    4 Personel Bertugas Lapangan Hari Ini
                </div>
            </div>

            {/* Filter & Pencarian */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="search"
                            placeholder="Cari catatan atau kata kunci..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-green-600"
                        />
                    </div>
                    {/* <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <span>Semua Anggota</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-100 p-0.5 text-xs">
                        <button className="px-2.5 py-1 bg-white rounded-md font-semibold text-gray-900 shadow-2xs">Semua (18)</button>
                        <button className="px-2.5 py-1 text-gray-600 hover:text-gray-900 font-medium">Dikerjakan (4)</button>
                        <button className="px-2.5 py-1 text-gray-600 hover:text-gray-900 font-medium">Selesai (14)</button>
                    </div> */}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Urutkan:</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <span>Terbaru diperbarui</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                </div>
            </div>
        </header>
    );
}
