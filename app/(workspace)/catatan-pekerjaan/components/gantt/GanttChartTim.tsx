"use client";

import { useMemo, useEffect } from "react";
import type { JadwalRow } from "@/types/kegiatan";
import type { MonthOption } from "@/types/common";
import { toIsoDate, addDays, parseYmd, BULAN_NAMES, HARI_NAMES_ID } from "@/lib/utils/date";
import { useGanttInteraction } from "@/hooks/useGanttInteraction";
import { useGanttResize } from "@/hooks/useGanttResize";
import GanttToolbar from "./GanttToolbar";
import { GanttHeaderMetadata, GanttRowMetadata } from "./GanttMetadataCol";
import { GanttHeaderDates, GanttRowGrid, DateColumn } from "./GanttGrid";
import GanttTaskBar from "./GanttTaskBar";

type GanttProps = {
    weekDays?: DateColumn[];
    jadwals: JadwalRow[];
    filterStatus: "semua" | "terjadwal" | "selesai";
    selectedStaff: string;
    anchorDate: Date;
    onSelectTask: (task: JadwalRow) => void;
    getDotColor: (name: string) => string;
    realCurrentYear?: number;
    realCurrentMonth?: number;
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
    // 1. Filter & Urutkan jadwals berdasarkan status dan staff
    const sortedJadwals = useMemo(() => {
        return [...jadwals]
            .filter((task) => {
                const matchStatus =
                    filterStatus === "semua" ||
                    (filterStatus === "selesai" && task.status === "selesai") ||
                    (filterStatus === "terjadwal" && task.status !== "selesai");

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

    // 2. Generate date columns
    const dateColumns: DateColumn[] = useMemo(() => {
        const todayIso = toIsoDate(new Date());
        const anchorIso = toIsoDate(anchorDate);
        const dates: string[] = [anchorIso, todayIso];

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

        const startDate = addDays(parseYmd(earliest), -14);
        let endDate = addDays(parseYmd(latest), 28);

        const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (totalDays < 60) {
            endDate = addDays(startDate, 60);
        }

        const cols: DateColumn[] = [];
        let curr = new Date(startDate);
        const endIso = toIsoDate(endDate);

        let maxGuard = 0;
        while (toIsoDate(curr) <= endIso && maxGuard < 200) {
            const iso = toIsoDate(curr);
            cols.push({
                iso,
                day: curr.getDate(),
                month: BULAN_NAMES[curr.getMonth()].slice(0, 3),
                dayName: HARI_NAMES_ID[curr.getDay()].slice(0, 3),
                isToday: iso === todayIso,
            });
            curr = addDays(curr, 1);
            maxGuard++;
        }

        return cols;
    }, [sortedJadwals, anchorDate]);

    const baseColWidth = 75;

    // 3. Custom Hooks untuk Interaksi & Drag-Resize
    const {
        resizingBar,
        draggedTaskId,
        setDraggedTaskId,
        draggedTask,
        setDraggedTask,
        dragOverCol,
        setDragOverCol,
        optimisticDates,
        justResizedBarRef,
        handleBarResizeStart,
        handleDropTaskOnCol,
    } = useGanttResize({
        finalColWidth: baseColWidth,
        dateColumns,
    });

    const isBusy = Boolean(draggedTaskId || resizingBar);

    const {
        zoomLevel,
        setZoomLevel,
        isFullscreen,
        setIsFullscreen,
        metaWidth,
        isResizingMeta,
        handleResizeStart,
        containerRef,
        isPanning,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
    } = useGanttInteraction({
        initialMetaWidth: 380,
        initialZoom: 1,
        isBusy,
    });

    const scaledColWidth = Math.round(baseColWidth * zoomLevel);
    const totalTimelineWidth = dateColumns.length * scaledColWidth;

    // Auto-scroll ke anchorDate
    useEffect(() => {
        if (!containerRef.current) return;
        const targetIso = toIsoDate(anchorDate);
        const colIndex = dateColumns.findIndex((c) => c.iso === targetIso);
        if (colIndex !== -1) {
            const targetLeft = Math.max(0, (colIndex - 2) * scaledColWidth);
            containerRef.current.scrollTo({ left: targetLeft, behavior: "smooth" });
        }
    }, [anchorDate, dateColumns, scaledColWidth, containerRef]);

    return (
        <div className={isFullscreen ? "fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-xs p-4 flex flex-col h-screen w-screen space-y-3" : "space-y-3"}>
            <GanttToolbar
                totalTasks={sortedJadwals.length}
                totalDays={dateColumns.length}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                filterStatus={filterStatus}
                onFilterStatusChange={onFilterStatusChange}
                staffList={staffList}
                selectedStaff={selectedStaff}
                onSelectedStaffChange={onSelectedStaffChange}
                activeMonths={activeMonths}
                selectedMonthKey={selectedMonthKey}
                onSelectMonth={onSelectMonth}
                completedMonths={completedMonths}
                selectedCompletedMonthKey={selectedCompletedMonthKey}
                onSelectCompletedMonth={onSelectCompletedMonth}
            />

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
                        <GanttHeaderMetadata
                            metaWidth={metaWidth}
                            onResizeStart={handleResizeStart}
                        />
                        <GanttHeaderDates
                            totalTimelineWidth={totalTimelineWidth}
                            finalColWidth={scaledColWidth}
                            dateColumns={dateColumns}
                        />
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

                                let startIndex = dateColumns.findIndex((col) => col.iso === startIso);
                                let endIndex = dateColumns.findIndex((col) => col.iso === endIso);

                                if (startIndex === -1 && startIso < (dateColumns[0]?.iso || "")) startIndex = 0;
                                if (endIndex === -1 && endIso > (dateColumns[dateColumns.length - 1]?.iso || "")) endIndex = dateColumns.length - 1;
                                if (startIndex === -1 && endIndex !== -1) startIndex = 0;
                                if (endIndex === -1 && startIndex !== -1) endIndex = startIndex;

                                const isThisBarResizing = resizingBar?.taskId === task.id;
                                const effectiveEndIndex = isThisBarResizing ? resizingBar.currentEndIndex : endIndex;
                                const isVisible = startIndex !== -1 && effectiveEndIndex !== -1 && effectiveEndIndex >= startIndex;
                                const effectiveSpanWidth = isVisible ? (effectiveEndIndex - startIndex + 1) * scaledColWidth : 0;
                                const leftOffset = isVisible ? startIndex * scaledColWidth : 0;

                                const effectiveDiffDays = isVisible ? (effectiveEndIndex - startIndex + 1) : 1;
                                const effectiveIsMultiDay = effectiveDiffDays > 1;
                                const isBeingDragged = draggedTaskId === task.id;

                                return (
                                    <div
                                        key={task.id}
                                        className="flex hover:bg-slate-50/70 transition group text-xs relative"
                                    >
                                        <GanttRowMetadata
                                            task={task}
                                            metaWidth={metaWidth}
                                            isMultiDay={effectiveIsMultiDay}
                                            diffDays={effectiveDiffDays}
                                            getDotColor={getDotColor}
                                            onSelectTask={onSelectTask}
                                        />

                                        <GanttRowGrid
                                            totalTimelineWidth={totalTimelineWidth}
                                            finalColWidth={scaledColWidth}
                                            dateColumns={dateColumns}
                                            dragOverCol={dragOverCol}
                                            draggedTaskId={draggedTaskId}
                                            onDragOverCol={(colIdx) => setDragOverCol(colIdx)}
                                            onDragLeave={() => setDragOverCol(null)}
                                            onDropOnCol={(colIdx) => {
                                                if (draggedTask) {
                                                    handleDropTaskOnCol(draggedTask, colIdx);
                                                }
                                                setDragOverCol(null);
                                                setDraggedTask(null);
                                                setDraggedTaskId(null);
                                            }}
                                        >
                                            <GanttTaskBar
                                                task={task}
                                                isVisible={isVisible}
                                                isBeingDragged={isBeingDragged}
                                                isThisBarResizing={isThisBarResizing}
                                                effectiveSpanWidth={effectiveSpanWidth}
                                                leftOffset={leftOffset}
                                                effectiveDiffDays={effectiveDiffDays}
                                                effectiveIsMultiDay={effectiveIsMultiDay}
                                                effectiveEndIndex={effectiveEndIndex}
                                                startIndex={startIndex}
                                                endIndex={endIndex}
                                                dateColumns={dateColumns}
                                                isLockedInteraction={isResizingMeta || Boolean(resizingBar)}
                                                onSelectTask={(t) => {
                                                    if (justResizedBarRef.current) return;
                                                    onSelectTask(t);
                                                }}
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
                                                onResizeStart={handleBarResizeStart}
                                            />
                                        </GanttRowGrid>
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
