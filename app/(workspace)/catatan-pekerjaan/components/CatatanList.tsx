"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";

export type Catatan = {
    id: string;
    created_at: string;
    judul: string;
    penanggung_jawab: string;
    status: "dikerjakan" | "selesai";
    lokasi: string;
    deskripsi: string;
    tautan_eksternal?: string | null;
};

export default function CatatanList({
    catatans,
    activeId,
    currentUser,
}: {
    catatans: Catatan[];
    activeId?: string;
    currentUser: { role: string; name: string };
}) {
    const router = useRouter();
    const [filter, setFilter] = useState<"semua" | "saya">("semua");

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
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => setFilter("semua")}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${filter === "semua" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Semua ({catatans.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("saya")}
                        className={`px-3 py-1 rounded-md font-semibold transition-all ${filter === "saya" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Tugas Saya ({catatans.filter((c) => c.penanggung_jawab.toLowerCase().includes(currentUser.name.toLowerCase())).length})
                    </button>
                </div>
                <span className="text-gray-400">{displayedCatatans.length} entri</span>
            </div>

            {displayedCatatans.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                    Tidak ada catatan pekerjaan {filter === "saya" ? "yang ditugaskan ke Anda." : "."}
                </div>
            ) : (
                displayedCatatans.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                        <Link
                            key={item.id}
                            href={`/catatan-pekerjaan?id=${item.id}`}
                            replace
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
                            </article>
                        </Link>
                    );
                })
            )}
        </section>
    );
}
