"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import type { JadwalRow } from "@/types/kegiatan";

export type BarResizeState = {
    taskId: string;
    initialMouseX: number;
    initialEndIndex: number;
    startIndex: number;
    currentEndIndex: number;
};

type UseGanttResizeParams = {
    finalColWidth: number;
    dateColumns: { iso: string }[];
};

export function useGanttResize({ finalColWidth, dateColumns }: UseGanttResizeParams) {
    const [resizingBar, setResizingBar] = useState<BarResizeState | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [draggedTask, setDraggedTask] = useState<JadwalRow | null>(null);
    const [dragOverCol, setDragOverCol] = useState<number | null>(null);

    const [optimisticDates, setOptimisticDates] = useState<Record<string, string | null>>({});
    const justResizedBarRef = useRef(false);

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

    // Handler Drag-and-Drop: Pindah Tanggal Agenda ke Kolom Baru
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

    return {
        resizingBar,
        draggedTaskId,
        setDraggedTaskId,
        draggedTask,
        setDraggedTask,
        dragOverCol,
        setDragOverCol,
        optimisticDates,
        setOptimisticDates,
        justResizedBarRef,
        handleBarResizeStart,
        handleDropTaskOnCol,
    };
}
