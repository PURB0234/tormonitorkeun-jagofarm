"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { MapPin, Paperclip, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

export type Catatan = {
    id: string;
    created_at: string;
    judul: string;
    penanggung_jawab: string;
    penanggung_jawab_id?: string | null;
    status: "dikerjakan" | "selesai";
    lokasi: string;
    deskripsi: string;
    tautan_eksternal?: string | null;
    lampiran_url?: string | null;
    lampiran_nama?: string | null;
};

export default function CatatanList({
    catatans,
    activeId,
    currentUser,
    onSelect,
}: {
    catatans: Catatan[];
    activeId?: string;
    currentUser: { id: string, role: string; name: string };
    onSelect?: (id: string) => void;
}) {
    const router = useRouter();
    const [filter, setFilter] = useState<"semua" | "saya">("semua");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 5;

    const handleFilterChange = (
        tab: "semua" | "saya"
    ) => {
        setFilter(tab);
        setPage(1);
    }

    const displayCatatans = filter === "semua"
        ? catatans
        : catatans.filter((c) =>
            c.penanggung_jawab_id
                ? c.penanggung_jawab_id === currentUser.id
                : c.penanggung_jawab.toLowerCase().includes(currentUser.name.toLowerCase())
        );


    const totalPages = Math.ceil(displayCatatans.length / PAGE_SIZE) || 1;
    const paginatedCatatans = displayCatatans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel("realtime-catatan").on(
            "postgres_changes",
            { event: "*", schema: "public", table: "catatan_pekerjaan" },
            () => router.refresh()
        ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [router]);

    const displayedCatatans = filter === "semua"
        ? catatans
        : catatans.filter((c) =>
            c.penanggung_jawab.toLowerCase().includes(currentUser.name.toLowerCase())
        );

    return (
        <section className="space-y-3">
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-gray-500">
                    <span className="text-[11px] text-gray-400">
                        {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, displayedCatatans.length)} dari {displayedCatatans.length} catatan
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-2xs transition-colors"
                            title="Halaman Sebelumnya"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setPage(num)}
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${page === num
                                        ? "bg-[#1E5E35] text-white shadow-2xs"
                                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-2xs transition-colors"
                            title="Halaman Berikutnya"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => handleFilterChange("semua")}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${filter === "semua" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Semua ({catatans.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => handleFilterChange("saya")}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${filter === "saya" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Tugas Saya ({catatans.filter((c) => c.penanggung_jawab.toLowerCase().includes(currentUser.name.toLowerCase())).length})
                    </button>

                </div>
                {/* <span className="text-gray-400">{displayedCatatans.length} entri</span> */}
            </div>

            {displayedCatatans.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                    Tidak ada catatan pekerjaan {filter === "saya" ? "yang ditugaskan ke Anda." : "."}
                </div>
            ) : (
                paginatedCatatans.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                        <div
                            key={item.id}
                            onClick={() => {
                                onSelect?.(item.id);
                                window.history.replaceState(null, "", `/catatan-pekerjaan?id=${item.id}`);
                            }}
                            className="block"
                        >
                            <article
                                className={`rounded-xl p-4 shadow-xs space-y-2 cursor-pointer transition-all ${isActive
                                    ? "bg-white border-2 border-green-700"
                                    : "bg-white border border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${item.status === "dikerjakan"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-700"
                                            }`}>
                                            {item.status}
                                        </span>
                                        <span className="flex items-center gap-1.5 font-medium text-gray-700">
                                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                            {item.penanggung_jawab}
                                        </span>
                                        <time className="text-gray-400 text-[11px]">
                                            {new Date(item.created_at).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })} WIB
                                        </time>
                                    </div>
                                    {isActive && (
                                        <span className="bg-green-50 text-green-800 border border-green-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                                            Aktif Ditinjau
                                        </span>
                                    )}
                                </div>
                                <h2 className="font-bold text-gray-900 text-sm">{item.judul}</h2>
                                <p className="text-xs text-gray-600 line-clamp-2">{item.deskripsi}</p>
                                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-gray-200 text-[11px]">
                                    {item.lokasi && (
                                        <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {item.lokasi}
                                        </span>
                                    )}
                                    {item.lampiran_url && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-700 rounded font-medium max-w-[200px] truncate">
                                            {item.lampiran_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                                <ImageIcon className="w-3 h-3 text-blue-600 shrink-0" />
                                            ) : (
                                                <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                                            )}
                                            <span className="truncate">{item.lampiran_nama || "Bukti Terunggah"}</span>
                                        </span>
                                    )}
                                    {item.tautan_eksternal && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/60 border border-blue-200 text-blue-700 rounded font-medium">
                                            <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                                            <span>Tautan</span>
                                        </span>
                                    )}
                                </div>

                            </article>
                        </div>
                    );
                })
            )}
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-gray-500">
                    <span className="text-[11px] text-gray-400">
                        {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, displayedCatatans.length)} dari {displayedCatatans.length} catatan
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-2xs transition-colors"
                            title="Halaman Sebelumnya"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setPage(num)}
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${page === num
                                        ? "bg-[#1E5E35] text-white shadow-2xs"
                                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-2xs transition-colors"
                            title="Halaman Berikutnya"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
