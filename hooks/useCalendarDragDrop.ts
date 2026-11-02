"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import type { JadwalRow } from "@/types/kegiatan";

type UseCalendarDragDropParams = {
    setJadwals: React.Dispatch<React.SetStateAction<JadwalRow[]>>;
    onRefreshMonths?: () => void;
    fetchJadwal?: () => void;
};

export function useCalendarDragDrop({
    setJadwals,
    onRefreshMonths,
    fetchJadwal,
}: UseCalendarDragDropParams) {
    const router = useRouter();

    const draggedIdRef = useRef<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<JadwalRow | null>(null);

    const [isOverTrash, setIsOverTrash] = useState(false);
    const [isOverDone, setIsOverDone] = useState(false);
    const [isOverUpdate, setIsOverUpdate] = useState(false);
    const [isOverDoneUpdate, setIsOverDoneUpdate] = useState(false);
    const [isOverRevert, setIsOverRevert] = useState(false);

    const resetDragState = () => {
        draggedIdRef.current = null;
        setDraggedItem(null);
        setIsOverTrash(false);
        setIsOverDone(false);
        setIsOverUpdate(false);
        setIsOverDoneUpdate(false);
        setIsOverRevert(false);
    };

    const notifySync = () => {
        router.refresh();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
    };

    // Hapus Kegiatan
    const handleDeleteJadwal = async (id: string) => {
        setJadwals((prev) => prev.filter((item) => item.id !== id));
        const supabase = createClient();
        const { error } = await supabase.from("jadwal_kegiatan").delete().eq("id", id);

        if (error) {
            alert("Gagal menghapus dari database: " + error.message);
            fetchJadwal?.();
        } else {
            onRefreshMonths?.();
        }
        notifySync();
    };

    // 1. Selesai (Done)
    const handleCompleteJadwal = async (item: JadwalRow) => {
        const supabase = createClient();
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "selesai" } : j))
        );

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({ status: "selesai" })
            .eq("id", item.id);

        if (error) {
            alert("Gagal mengubah status: " + error.message);
            fetchJadwal?.();
            return;
        }

        onRefreshMonths?.();
        notifySync();
    };

    // 2. Update Catatan (Tetap Terjadwal)
    const handleUpdateOnlyToCatatan = async (item: JadwalRow) => {
        const supabase = createClient();
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "terjadwal" } : j))
        );

        await supabase
            .from("jadwal_kegiatan")
            .update({ status: "terjadwal" })
            .eq("id", item.id);

        onRefreshMonths?.();
        notifySync();
    };

    // 3. Done + Update
    const handleDoneAndUpdateCatatan = async (item: JadwalRow) => {
        const supabase = createClient();
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "selesai" } : j))
        );

        await supabase
            .from("jadwal_kegiatan")
            .update({ status: "selesai" })
            .eq("id", item.id);

        onRefreshMonths?.();
        notifySync();
    };

    // 4. Kembalikan ke Dikerjakan (Dua Arah)
    const handleRevertToDikerjakan = async (item: JadwalRow) => {
        const supabase = createClient();
        setJadwals((prev) =>
            prev.map((j) => (j.id === item.id ? { ...j, status: "dikerjakan" } : j))
        );

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({ status: "dikerjakan" })
            .eq("id", item.id);

        if (error) {
            alert("Gagal mengubah status: " + error.message);
            fetchJadwal?.();
            return;
        }

        onRefreshMonths?.();
        notifySync();
    };

    return {
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
    };
}
