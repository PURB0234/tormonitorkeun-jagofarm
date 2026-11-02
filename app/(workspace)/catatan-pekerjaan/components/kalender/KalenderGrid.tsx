"use client";

import { Loader2 } from "lucide-react";
import KalenderCard from "./KalenderCard";
import type { JadwalRow } from "@/types/kegiatan";

export type WeekDayCol = {
    hari: string;
    tanggal: number;
    bulanShort: string;
    bulanTahun: string;
    iso: string;
    isToday: boolean;
    tasks: JadwalRow[];
};

type KalenderGridProps = {
    weekDays: WeekDayCol[];
    loading: boolean;
    selectedStaff: string;
    filterStatus: "semua" | "terjadwal" | "selesai";
    realCurrentYear: number;
    realCurrentMonth: number;
    onSelectTask: (task: JadwalRow) => void;
    onDragStart: (e: React.DragEvent, task: JadwalRow) => void;
    onDragEnd: () => void;
    onCompleteTask?: (task: JadwalRow) => void;
    onDeleteTask?: (id: string, nama: string) => void;
};

export default function KalenderGrid({
    weekDays,
    loading,
    selectedStaff,
    filterStatus,
    realCurrentYear,
    realCurrentMonth,
    onSelectTask,
    onDragStart,
    onDragEnd,
    onCompleteTask,
    onDeleteTask,
}: KalenderGridProps) {
    return (
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
                                className={`flex flex-col min-h-[460px] transition ${
                                    isPastMonth
                                        ? "bg-gray-100/60 opacity-60"
                                        : day.isToday && displayedTasks.length > 0
                                        ? "bg-slate-50/50"
                                        : "bg-white"
                                }`}
                            >
                                {/* Header Tanggal */}
                                <div
                                    className={`p-3 border-b border-gray-200 flex items-start justify-between ${
                                        isPastMonth
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
                                        <span className="text-sm font-bold text-gray-900 mt-0.5 flex items-baseline gap-1">
                                            <span>{day.tanggal}</span>
                                            <span className="text-[11px] font-medium text-gray-500">
                                                {day.bulanShort}
                                            </span>
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
                                        displayedTasks.map((t) => (
                                            <KalenderCard
                                                key={t.id}
                                                task={t}
                                                onSelect={onSelectTask}
                                                onDragStart={onDragStart}
                                                onDragEnd={onDragEnd}
                                                onComplete={onCompleteTask}
                                                onDelete={onDeleteTask}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
