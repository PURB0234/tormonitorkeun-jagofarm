"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/app/lib/supabase/client";
import GanttChartTim from "./gantt/GanttChartTim";
import KalenderSection from "./kalender/KalenderSection";
import LaporanPdfPrint from "./print/LaporanPdfPrint";
import { BULAN_NAMES } from "@/lib/utils/date";
import type { JadwalRow } from "@/types/kegiatan";
import type { MonthOption, ProfileMember } from "@/types/common";

type CatatanTimelineSectionProps = {
    viewMode: "kalender" | "gantt";
    onSelectTask: (task: JadwalRow) => void;
};

export default function CatatanTimelineSection({
    viewMode = "kalender",
    onSelectTask,
}: CatatanTimelineSectionProps) {
    const [selectedStaff, setSelectedStaff] = useState<string>("Semua");
    const [members, setMembers] = useState<ProfileMember[]>([]);

    const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
    const [jadwals, setJadwals] = useState<JadwalRow[]>([]);
    const [loading, setLoading] = useState(true);

    const monday = useMemo(() => {
        const d = new Date(anchorDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        mon.setHours(0, 0, 0, 0);
        return mon;
    }, [anchorDate]);

    const sunday = useMemo(() => {
        const res = new Date(monday);
        res.setDate(res.getDate() + 6);
        return res;
    }, [monday]);

    // Bulan Filter State
    const [activeMonths, setActiveMonths] = useState<MonthOption[]>([]);
    const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
    const [completedMonths, setCompletedMonths] = useState<MonthOption[]>([]);
    const [selectedCompletedMonthKey, setSelectedCompletedMonthKey] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<"semua" | "terjadwal" | "selesai">("terjadwal");

    const fetchActiveMonths = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from("jadwal_kegiatan")
            .select("tanggal")
            .neq("status", "selesai")
            .order("tanggal", { ascending: true });

        if (!data) return;

        const monthMap = new Map<string, { year: number; month: number; count: number; firstDateStr: string }>();

        data.forEach((row) => {
            const rawIso = String(row.tanggal).slice(0, 10);
            const parts = rawIso.split("-");
            if (parts.length < 3) return;

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const key = year + "-" + month;

            if (!monthMap.has(key)) {
                monthMap.set(key, { year, month, count: 1, firstDateStr: rawIso });
            } else {
                monthMap.get(key)!.count += 1;
            }
        });

        setActiveMonths(
            Array.from(monthMap.entries()).map(([key, val]) => {
                const [y, m, d] = val.firstDateStr.split("-").map(Number);
                const targetDate = new Date(y, m - 1, d, 12, 0, 0);

                return {
                    key,
                    label: BULAN_NAMES[val.month].slice(0, 3) + " " + val.year + " (" + val.count + ")",
                    date: targetDate,
                    count: val.count,
                };
            })
        );
    }, []);

    const fetchCompletedMonths = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from("jadwal_kegiatan")
            .select("tanggal")
            .eq("status", "selesai")
            .order("tanggal", { ascending: false });

        if (!data) return;

        const monthMap = new Map<string, { year: number; month: number; count: number; firstDateStr: string }>();

        data.forEach((row) => {
            const rawIso = String(row.tanggal).slice(0, 10);
            const parts = rawIso.split("-");
            if (parts.length < 3) return;

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const key = year + "-" + month;

            if (!monthMap.has(key)) {
                monthMap.set(key, { year, month, count: 1, firstDateStr: rawIso });
            } else {
                monthMap.get(key)!.count += 1;
            }
        });

        setCompletedMonths(
            Array.from(monthMap.entries()).map(([key, val]) => {
                const [y, m, d] = val.firstDateStr.split("-").map(Number);
                const targetDate = new Date(y, m - 1, d, 12, 0, 0);

                return {
                    key,
                    label: BULAN_NAMES[val.month].slice(0, 3) + " " + val.year + " (" + val.count + ")",
                    date: targetDate,
                    count: val.count,
                };
            })
        );
    }, []);

    const fetchJadwal = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from("jadwal_kegiatan")
            .select("*")
            .order("tanggal", { ascending: true })
            .order("waktu_mulai", { ascending: true });

        if (!error && data) {
            setJadwals(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchJadwal();
        fetchActiveMonths();
        fetchCompletedMonths();

        const supabase = createClient();
        const channel = supabase
            .channel("realtime-jadwal-section")
            .on("postgres_changes", { event: "*", schema: "public", table: "jadwal_kegiatan" }, () => {
                fetchJadwal();
                fetchActiveMonths();
                fetchCompletedMonths();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchJadwal, fetchActiveMonths, fetchCompletedMonths]);

    useEffect(() => {
        const onGlobalSync = () => {
            fetchJadwal();
            fetchActiveMonths();
            fetchCompletedMonths();
        };

        window.addEventListener("app:sync", onGlobalSync);
        return () => {
            window.removeEventListener("app:sync", onGlobalSync);
        };
    }, [fetchJadwal, fetchActiveMonths, fetchCompletedMonths]);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("profiles")
            .select("id, full_name, email")
            .then(({ data }) => {
                if (data) setMembers(data);
            });
    }, []);

    const staffList = useMemo(() => {
        const dynamicList = members.map((m) => {
            const name = m.full_name || m.email.split("@")[0];
            return { label: name, text: name };
        });
        return [{ label: "Semua", text: "Semua Petugas" }, ...dynamicList];
    }, [members]);

    const getDotColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("tim")) return "bg-indigo-600";
        if (n.includes("budi")) return "bg-emerald-600";
        if (n.includes("siti")) return "bg-pink-600";
        if (n.includes("ahmad")) return "bg-amber-600";
        if (n.includes("rina")) return "bg-blue-600";
        return "bg-slate-400";
    };

    return (
        <div className="space-y-4">
            {viewMode === "gantt" ? (
                <GanttChartTim
                    jadwals={jadwals}
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    selectedStaff={selectedStaff}
                    onSelectedStaffChange={setSelectedStaff}
                    staffList={staffList}
                    activeMonths={activeMonths}
                    selectedMonthKey={selectedMonthKey}
                    onSelectMonth={(val, date) => {
                        setSelectedMonthKey(val);
                        if (val) {
                            setSelectedCompletedMonthKey("");
                            if (date) {
                                setAnchorDate(new Date(date.getTime()));
                            } else {
                                const target = activeMonths.find((m) => m.key === val);
                                if (target) setAnchorDate(new Date(target.date.getTime()));
                            }
                        }
                    }}
                    completedMonths={completedMonths}
                    selectedCompletedMonthKey={selectedCompletedMonthKey}
                    onSelectCompletedMonth={(val, date) => {
                        setSelectedCompletedMonthKey(val);
                        if (val) {
                            setSelectedMonthKey("");
                            if (date) {
                                setAnchorDate(new Date(date.getTime()));
                            } else {
                                const target = completedMonths.find((m) => m.key === val);
                                if (target) setAnchorDate(new Date(target.date.getTime()));
                            }
                        }
                    }}
                    anchorDate={anchorDate}
                    onSelectTask={onSelectTask}
                    getDotColor={getDotColor}
                />
            ) : (
                <KalenderSection
                    jadwals={jadwals}
                    loading={loading}
                    setJadwals={setJadwals}
                    fetchJadwal={fetchJadwal}
                    activeMonths={activeMonths}
                    fetchActiveMonths={fetchActiveMonths}
                    completedMonths={completedMonths}
                    fetchCompletedMonths={fetchCompletedMonths}
                    members={members}
                    anchorDate={anchorDate}
                    setAnchorDate={setAnchorDate}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    selectedMonthKey={selectedMonthKey}
                    setSelectedMonthKey={setSelectedMonthKey}
                    selectedCompletedMonthKey={selectedCompletedMonthKey}
                    setSelectedCompletedMonthKey={setSelectedCompletedMonthKey}
                    onSelectTask={onSelectTask}
                    staffList={staffList}
                />
            )}

            {/* Dokumen Laporan Siap Cetak / Convert PDF */}
            <LaporanPdfPrint
                jadwals={jadwals}
                periodeText={monday.getDate() + " " + BULAN_NAMES[monday.getMonth()].slice(0, 3) + " - " + sunday.getDate() + " " + BULAN_NAMES[sunday.getMonth()].slice(0, 3) + " " + sunday.getFullYear()}
                generatedAt={new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                })}
            />
        </div>
    );
}
