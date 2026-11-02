"use client";

import type { MonthOption } from "@/types/common";
import SegmentedControl, { SegmentOption } from "@/app/components/ui/SegmentedControl";
import Select from "@/app/components/ui/Select";

export type FilterStatus = "semua" | "terjadwal" | "selesai";

export type TimelineFilterBarProps = {
    // 1. Status Filter
    filterStatus: FilterStatus;
    onFilterStatusChange: (status: FilterStatus) => void;

    // 2. Petugas Filter
    staffList?: { label: string; text: string }[];
    selectedStaff: string;
    onSelectStaff: (staff: string) => void;
    staffDisplayMode?: "chips" | "select" | "none" | "auto";

    // 3. Bulan Filter
    activeMonths?: MonthOption[];
    selectedMonthKey?: string;
    onSelectMonthKey?: (key: string, date?: Date) => void;
    completedMonths?: MonthOption[];
    selectedCompletedMonthKey?: string;
    onSelectCompletedMonthKey?: (key: string, date?: Date) => void;

    className?: string;
};

const statusOptions: SegmentOption<FilterStatus>[] = [
    { value: "terjadwal", label: "Diagendakan (Aktif)" },
    { value: "selesai", label: "Telah Dilaksanakan" },
    { value: "semua", label: "Semua" },
];

export default function TimelineFilterBar({
    filterStatus,
    onFilterStatusChange,
    staffList = [],
    selectedStaff,
    onSelectStaff,
    staffDisplayMode = "chips",
    activeMonths = [],
    selectedMonthKey = "",
    onSelectMonthKey,
    completedMonths = [],
    selectedCompletedMonthKey = "",
    onSelectCompletedMonthKey,
    className = "",
}: TimelineFilterBarProps) {
    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}>
            {/* Sisi Kiri: Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">Tampilkan:</span>
                    <SegmentedControl
                        options={statusOptions}
                        value={filterStatus}
                        onChange={onFilterStatusChange}
                    />
                </div>

                {/* Petugas Chips (Jika mode chips) */}
                {staffDisplayMode !== "select" && staffList.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-gray-200">
                        <span className="text-gray-500 mr-0.5 text-[11px]">Petugas:</span>
                        {staffList.map((st) => (
                            <button
                                key={st.label}
                                type="button"
                                onClick={() => onSelectStaff(st.label)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
                                    selectedStaff === st.label
                                        ? "bg-slate-900 text-white"
                                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                {st.text}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sisi Kanan: Petugas (Jika mode select) & Dropdown Bulan */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Petugas Select Dropdown */}
                {staffDisplayMode === "select" && staffList.length > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="text-[11px] font-medium text-gray-600">Petugas:</span>
                        <Select
                            value={selectedStaff}
                            onChange={(e) => onSelectStaff(e.target.value)}
                        >
                            {staffList.map((st) => (
                                <option key={st.label} value={st.label}>
                                    {st.text}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}

                {/* Dropdown Bulan Beragenda */}
                {activeMonths.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[11px] font-medium text-gray-600">Bulan Beragenda:</span>
                        <Select
                            value={selectedMonthKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                const target = activeMonths.find((m) => m.key === val);
                                onSelectMonthKey?.(val, target?.date);
                            }}
                        >
                            <option value="">-- Tidak Ada Filter --</option>
                            {activeMonths.map((m) => (
                                <option key={m.key} value={m.key}>
                                    {m.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}

                {/* Dropdown Bulan Telah Dilaksanakan */}
                {completedMonths.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-[11px] font-medium text-gray-600">Telah Dilaksanakan:</span>
                        <Select
                            value={selectedCompletedMonthKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                const target = completedMonths.find((m) => m.key === val);
                                onSelectCompletedMonthKey?.(val, target?.date);
                            }}
                        >
                            <option value="">-- Tidak Ada Filter --</option>
                            {completedMonths.map((m) => (
                                <option key={m.key} value={m.key}>
                                    {"✓ " + m.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}
            </div>
        </div>
    );
}
