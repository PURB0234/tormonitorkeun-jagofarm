"use client";

import { CheckCircle2, RefreshCw, CheckCheck, Trash2 } from "lucide-react";
import type { JadwalRow } from "@/types/kegiatan";

type KalenderDropZonesProps = {
    draggedItem: JadwalRow | null;
    isOverDone: boolean;
    setIsOverDone: (val: boolean) => void;
    isOverUpdate: boolean;
    setIsOverUpdate: (val: boolean) => void;
    isOverDoneUpdate: boolean;
    setIsOverDoneUpdate: (val: boolean) => void;
    isOverRevert: boolean;
    setIsOverRevert: (val: boolean) => void;
    isOverTrash: boolean;
    setIsOverTrash: (val: boolean) => void;
    onComplete: (item: JadwalRow) => void;
    onUpdateOnly: (item: JadwalRow) => void;
    onDoneAndUpdate: (item: JadwalRow) => void;
    onRevert: (item: JadwalRow) => void;
    onDelete: (id: string, nama: string) => void;
    onResetDrag: () => void;
};

export default function KalenderDropZones({
    draggedItem,
    isOverDone,
    setIsOverDone,
    isOverUpdate,
    setIsOverUpdate,
    isOverDoneUpdate,
    setIsOverDoneUpdate,
    isOverRevert,
    setIsOverRevert,
    isOverTrash,
    setIsOverTrash,
    onComplete,
    onUpdateOnly,
    onDoneAndUpdate,
    onRevert,
    onDelete,
    onResetDrag,
}: KalenderDropZonesProps) {
    return (
        <div
            className={`fixed bottom-6 inset-x-0 mx-auto max-w-3xl z-50 flex items-center justify-center gap-2.5 px-4 transition-all duration-300 ${
                draggedItem
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-12 pointer-events-none"
            }`}
        >
            {/* 1. Kondisi Selesai: Drop zone Kembalikan ke Dikerjakan (Dua Arah) */}
            {draggedItem?.status === "selesai" && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setIsOverRevert(true);
                    }}
                    onDragLeave={() => setIsOverRevert(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (draggedItem) {
                            onRevert(draggedItem);
                        }
                        onResetDrag();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${
                        isOverRevert
                            ? "bg-amber-500 border-amber-600 text-white scale-105 ring-4 ring-amber-200"
                            : "bg-white border-amber-500 text-amber-700 hover:bg-amber-50/50"
                    }`}
                >
                    <RefreshCw className={"w-5 h-5 shrink-0 " + (isOverRevert ? "animate-spin" : "")} />
                    <div className="text-left">
                        <div className="text-xs font-bold leading-tight">Kembalikan ke Dikerjakan</div>
                        <div className="text-[10px] opacity-80 leading-tight">Buka kembali status agenda</div>
                    </div>
                </div>
            )}

            {/* 2. Kondisi Normal (belum selesai & tidak perlu update): Selesai (Done) */}
            {draggedItem?.status !== "selesai" && draggedItem?.status !== "perlu_update" && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setIsOverDone(true);
                    }}
                    onDragLeave={() => setIsOverDone(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (draggedItem) {
                            onComplete(draggedItem);
                        }
                        onResetDrag();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${
                        isOverDone
                            ? "bg-emerald-600 border-emerald-700 text-white scale-105 ring-4 ring-emerald-200"
                            : "bg-white border-emerald-500 text-emerald-700 hover:bg-emerald-50/50"
                    }`}
                >
                    <CheckCircle2 className={"w-5 h-5 shrink-0 " + (isOverDone ? "animate-bounce" : "")} />
                    <div className="text-left">
                        <div className="text-xs font-bold leading-tight">Selesai / Done</div>
                        <div className="text-[10px] opacity-80 leading-tight">Tandai agenda selesai</div>
                    </div>
                </div>
            )}

            {/* 3. Kondisi Perlu Update: Update Catatan & Done + Update */}
            {draggedItem?.status === "perlu_update" && (
                <>
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setIsOverUpdate(true);
                        }}
                        onDragLeave={() => setIsOverUpdate(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (draggedItem) {
                                onUpdateOnly(draggedItem);
                            }
                            onResetDrag();
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${
                            isOverUpdate
                                ? "bg-blue-600 border-blue-700 text-white scale-105 ring-4 ring-blue-200"
                                : "bg-white border-blue-400 text-blue-700 hover:bg-blue-50/50"
                        }`}
                    >
                        <RefreshCw className={"w-4 h-4 shrink-0 " + (isOverUpdate ? "animate-spin" : "")} />
                        <div className="text-left">
                            <div className="text-[11px] font-bold leading-tight">Update Catatan</div>
                            <div className="text-[9px] opacity-80 leading-tight">Sinkron data (Dikerjakan)</div>
                        </div>
                    </div>

                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setIsOverDoneUpdate(true);
                        }}
                        onDragLeave={() => setIsOverDoneUpdate(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (draggedItem) {
                                onDoneAndUpdate(draggedItem);
                            }
                            onResetDrag();
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-copy ${
                            isOverDoneUpdate
                                ? "bg-[#1E5E35] border-green-800 text-white scale-105 ring-4 ring-green-200"
                                : "bg-white border-[#1E5E35] text-[#1E5E35] hover:bg-green-50/50"
                        }`}
                    >
                        <CheckCheck className={"w-4 h-4 shrink-0 " + (isOverDoneUpdate ? "animate-bounce" : "")} />
                        <div className="text-left">
                            <div className="text-[11px] font-bold leading-tight">Done + Update</div>
                            <div className="text-[9px] opacity-80 leading-tight">Sinkron data & Selesai</div>
                        </div>
                    </div>
                </>
            )}

            {/* 4. Zona Hapus (Merah) */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setIsOverTrash(true);
                }}
                onDragLeave={() => setIsOverTrash(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    if (draggedItem) {
                        onDelete(draggedItem.id, draggedItem.nama_kegiatan);
                    }
                    onResetDrag();
                }}
                className={`w-28 flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all duration-200 shadow-xl cursor-no-drop ${
                    isOverTrash
                        ? "bg-red-600 border-red-700 text-white scale-105 ring-4 ring-red-200"
                        : "bg-white border-red-400 text-red-600 hover:bg-red-50/50"
                }`}
            >
                <Trash2 className={"w-4 h-4 shrink-0 " + (isOverTrash ? "animate-bounce" : "")} />
                <span className="text-[11px] font-bold">Hapus</span>
            </div>
        </div>
    );
}
