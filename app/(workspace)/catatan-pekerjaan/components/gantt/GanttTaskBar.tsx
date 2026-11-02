"use client";

import { getBarColor } from "@/lib/utils/colors";
import type { JadwalRow } from "@/types/kegiatan";

type DateColumn = {
    iso: string;
    day: number;
    month: string;
    dayName: string;
    isToday: boolean;
};

type GanttTaskBarProps = {
    task: JadwalRow;
    isVisible: boolean;
    isBeingDragged: boolean;
    isThisBarResizing: boolean;
    effectiveSpanWidth: number;
    leftOffset: number;
    effectiveDiffDays: number;
    effectiveIsMultiDay: boolean;
    effectiveEndIndex: number;
    startIndex: number;
    endIndex: number;
    dateColumns: DateColumn[];
    isLockedInteraction: boolean;
    onSelectTask: (task: JadwalRow) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onResizeStart: (e: React.MouseEvent, taskId: string, startIndex: number, endIndex: number) => void;
};

export default function GanttTaskBar({
    task,
    isVisible,
    isBeingDragged,
    isThisBarResizing,
    effectiveSpanWidth,
    leftOffset,
    effectiveDiffDays,
    effectiveIsMultiDay,
    effectiveEndIndex,
    startIndex,
    endIndex,
    dateColumns,
    isLockedInteraction,
    onSelectTask,
    onDragStart,
    onDragEnd,
    onResizeStart,
}: GanttTaskBarProps) {
    if (!isVisible) return null;

    return (
        <div
            draggable={!isLockedInteraction}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={(e) => {
                e.stopPropagation();
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
            title={
                task.nama_kegiatan +
                (effectiveIsMultiDay ? " (" + effectiveDiffDays + " hari)" : "") +
                " • Klik untuk edit • Drag untuk geser jadwal"
            }
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
                    onResizeStart(e, task.id, startIndex, endIndex);
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
    );
}
