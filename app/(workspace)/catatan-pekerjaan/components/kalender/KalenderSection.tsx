"use client";

import { useMemo, useEffect } from "react";
import { getMonday, addDays, toIsoDate, BULAN_NAMES, HARI_NAMES } from "@/lib/utils/date";
import { useCalendarDragDrop } from "@/hooks/useCalendarDragDrop";
import KalenderNav from "./KalenderNav";
import KalenderGrid, { WeekDayCol } from "./KalenderGrid";
import KalenderDropZones from "./KalenderDropZones";
import type { JadwalRow } from "@/types/kegiatan";
import type { MonthOption, ProfileMember } from "@/types/common";

type KalenderSectionProps = {
    jadwals: JadwalRow[];
    loading: boolean;
    setJadwals: React.Dispatch<React.SetStateAction<JadwalRow[]>>;
    fetchJadwal: () => void;
    activeMonths: MonthOption[];
    fetchActiveMonths: () => void;
    completedMonths: MonthOption[];
    fetchCompletedMonths: () => void;
    members: ProfileMember[];
    anchorDate: Date;
    setAnchorDate: React.Dispatch<React.SetStateAction<Date>>;
    selectedStaff: string;
    setSelectedStaff: React.Dispatch<React.SetStateAction<string>>;
    filterStatus: "semua" | "terjadwal" | "selesai";
    setFilterStatus: React.Dispatch<React.SetStateAction<"semua" | "terjadwal" | "selesai">>;
    selectedMonthKey: string;
    setSelectedMonthKey: React.Dispatch<React.SetStateAction<string>>;
    selectedCompletedMonthKey: string;
    setSelectedCompletedMonthKey: React.Dispatch<React.SetStateAction<string>>;
    onSelectTask: (task: JadwalRow) => void;
    staffList: { label: string; text: string }[];
};

export default function KalenderSection({
    jadwals,
    loading,
    setJadwals,
    fetchJadwal,
    activeMonths,
    fetchActiveMonths,
    completedMonths,
    fetchCompletedMonths,
    anchorDate,
    setAnchorDate,
    selectedStaff,
    setSelectedStaff,
    filterStatus,
    setFilterStatus,
    selectedMonthKey,
    setSelectedMonthKey,
    selectedCompletedMonthKey,
    setSelectedCompletedMonthKey,
    onSelectTask,
    staffList,
}: KalenderSectionProps) {
    const monday = useMemo(() => getMonday(anchorDate), [anchorDate]);
    const sunday = useMemo(() => addDays(monday, 6), [monday]);

    const realNow = new Date();
    const realCurrentYear = realNow.getFullYear();
    const realCurrentMonth = realNow.getMonth();

    const onRefreshMonths = () => {
        fetchActiveMonths();
        fetchCompletedMonths();
    };

    const {
        draggedIdRef,
        draggedItem,
        setDraggedItem,
        isOverTrash,
        setIsOverTrash,
        isOverDone,
        setIsOverDone,
        isOverUpdate,
        setIsOverUpdate,
        isOverDoneUpdate,
        setIsOverDoneUpdate,
        isOverRevert,
        setIsOverRevert,
        resetDragState,
        handleDeleteJadwal,
        handleCompleteJadwal,
        handleUpdateOnlyToCatatan,
        handleDoneAndUpdateCatatan,
        handleRevertToDikerjakan,
    } = useCalendarDragDrop({
        setJadwals,
        onRefreshMonths,
        fetchJadwal,
    });

    // 7 Kolom Harian untuk mode kalender
    const weekDays: WeekDayCol[] = useMemo(() => {
        const todayStr = toIsoDate(new Date());

        return Array.from({ length: 7 }, (_, i) => {
            const dateObj = addDays(monday, i);
            const isoString = toIsoDate(dateObj);

            const dayTasks = jadwals.filter((item) => {
                const itemStart = String(item.tanggal).slice(0, 10);
                const itemEnd = item.tanggal_selesai
                    ? String(item.tanggal_selesai).slice(0, 10)
                    : itemStart;
                return isoString >= itemStart && isoString <= itemEnd;
            });

            return {
                hari: HARI_NAMES[i],
                tanggal: dateObj.getDate(),
                bulanShort: BULAN_NAMES[dateObj.getMonth()].slice(0, 3),
                bulanTahun: BULAN_NAMES[dateObj.getMonth()].slice(0, 3) + " " + dateObj.getFullYear(),
                iso: isoString,
                isToday: isoString === todayStr,
                tasks: dayTasks,
            };
        });
    }, [monday, jadwals]);

    useEffect(() => {
        if (activeMonths.length === 0) return;
        const monKey = monday.getFullYear() + "-" + monday.getMonth();
        const matched = activeMonths.some((m) => m.key === monKey);
        setSelectedMonthKey(matched ? monKey : "");
    }, [anchorDate, monday, activeMonths, setSelectedMonthKey]);

    const prevWeek = () => setAnchorDate((prev) => addDays(prev, -7));
    const nextWeek = () => setAnchorDate((prev) => addDays(prev, 7));

    return (
        <div className="space-y-4">
            <KalenderNav
                monday={monday}
                sunday={sunday}
                onPrevWeek={prevWeek}
                onNextWeek={nextWeek}
                staffList={staffList}
                selectedStaff={selectedStaff}
                onSelectStaff={setSelectedStaff}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                activeMonths={activeMonths}
                selectedMonthKey={selectedMonthKey}
                onSelectMonthKey={(val) => {
                    setSelectedMonthKey(val);
                    if (val) {
                        setSelectedCompletedMonthKey("");
                        const target = activeMonths.find((m) => m.key === val);
                        if (target) setAnchorDate(new Date(target.date.getTime()));
                    }
                }}
                completedMonths={completedMonths}
                selectedCompletedMonthKey={selectedCompletedMonthKey}
                onSelectCompletedMonthKey={(val) => {
                    setSelectedCompletedMonthKey(val);
                    if (val) {
                        setSelectedMonthKey("");
                        const target = completedMonths.find((m) => m.key === val);
                        if (target) setAnchorDate(new Date(target.date.getTime()));
                    }
                }}
            />

            <KalenderGrid
                weekDays={weekDays}
                loading={loading}
                selectedStaff={selectedStaff}
                filterStatus={filterStatus}
                realCurrentYear={realCurrentYear}
                realCurrentMonth={realCurrentMonth}
                onSelectTask={onSelectTask}
                onDragStart={(e, t) => {
                    draggedIdRef.current = t.id;
                    setDraggedItem(t);
                    e.dataTransfer.setData("text/plain", t.id);
                    e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={resetDragState}
                onCompleteTask={handleCompleteJadwal}
                onDeleteTask={handleDeleteJadwal}
            />

            <KalenderDropZones
                draggedItem={draggedItem}
                isOverDone={isOverDone}
                setIsOverDone={setIsOverDone}
                isOverUpdate={isOverUpdate}
                setIsOverUpdate={setIsOverUpdate}
                isOverDoneUpdate={isOverDoneUpdate}
                setIsOverDoneUpdate={setIsOverDoneUpdate}
                isOverRevert={isOverRevert}
                setIsOverRevert={setIsOverRevert}
                isOverTrash={isOverTrash}
                setIsOverTrash={setIsOverTrash}
                onComplete={handleCompleteJadwal}
                onUpdateOnly={handleUpdateOnlyToCatatan}
                onDoneAndUpdate={handleDoneAndUpdateCatatan}
                onRevert={handleRevertToDikerjakan}
                onDelete={handleDeleteJadwal}
                onResetDrag={resetDragState}
            />
        </div>
    );
}
