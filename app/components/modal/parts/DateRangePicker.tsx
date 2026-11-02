"use client";

import { Calendar } from "lucide-react";

type DateRangePickerProps = {
    tanggal: string;
    setTanggal: (val: string) => void;
    tanggalSelesai: string;
    setTanggalSelesai: (val: string) => void;
    waktuMulai: string;
    setWaktuMulai: (val: string) => void;
    waktuSelesai: string;
    setWaktuSelesai: (val: string) => void;
    minDate?: string;
};

export default function DateRangePicker({
    tanggal,
    setTanggal,
    tanggalSelesai,
    setTanggalSelesai,
    waktuMulai,
    setWaktuMulai,
    waktuSelesai,
    setWaktuSelesai,
    minDate,
}: DateRangePickerProps) {
    const now = new Date();
    const defaultMinMonthStart =
        now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";
    const effectiveMinDate = minDate || defaultMinMonthStart;

    return (
        <div className="space-y-3">
            {/* Rentang Tanggal Pelaksanaan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                        Dari Tanggal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="date"
                            required
                            min={effectiveMinDate}
                            value={tanggal}
                            onChange={(e) => {
                                const val = e.target.value;
                                setTanggal(val);
                                if (tanggalSelesai < val) setTanggalSelesai(val);
                            }}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>
                </div>

                <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                        Sampai Tanggal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="date"
                            required
                            min={tanggal || effectiveMinDate}
                            value={tanggalSelesai}
                            onChange={(e) => setTanggalSelesai(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>
                </div>
            </div>

            {/* Waktu Pelaksanaan */}
            <div>
                <label className="block font-bold text-gray-800 mb-1.5">
                    Waktu Pelaksanaan (Mulai - Selesai) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                    <input
                        type="time"
                        required
                        value={waktuMulai}
                        onChange={(e) => setWaktuMulai(e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-center outline-hidden focus:border-green-600"
                    />
                    <span className="text-gray-400 text-[11px] font-medium shrink-0">s/d</span>
                    <input
                        type="time"
                        required
                        value={waktuSelesai}
                        onChange={(e) => setWaktuSelesai(e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-center outline-hidden focus:border-green-600"
                    />
                </div>
            </div>
        </div>
    );
}
