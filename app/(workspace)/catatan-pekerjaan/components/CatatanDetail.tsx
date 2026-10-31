"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Link2, Printer, Edit3, CheckCircle2, Clock, ExternalLink, Loader2, Trash2, Paperclip } from "lucide-react";
import type { Catatan } from "./CatatanList";
import dynamic from "next/dynamic";

const ModalEditCatatan = dynamic(
    () => import("@/app/components/modal/ModalEditCatatan"),
    { ssr: false }
);

export default function CatatanDetail({
    catatan,
    currentUser,
}: {
    catatan: Catatan | null;
    currentUser: { id: string, role: string; name: string };
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isModalEditOpen, setIsModalEditOpen] = useState(false);

    if (!catatan) {
        return (
            <aside className="bg-white border border-gray-200 rounded-xl p-8 text-center text-xs text-gray-400">
                Pilih catatan di daftar sebelah kiri untuk melihat detail.
            </aside>
        );
    }

    const isAdmin = currentUser.role === "admin";
    const isAssignee = catatan.penanggung_jawab_id ? catatan.penanggung_jawab_id === currentUser.id : catatan.penanggung_jawab.toLowerCase().includes(currentUser.name.toLowerCase());
    const canUpdateStatus = isAdmin || isAssignee;
    const canDelete = isAdmin || isAssignee;

    const handleToggleStatus = async () => {
        if (!canUpdateStatus) {
            alert("Hanya penanggung jawab atau Admin yang dapat mengubah status pekerjaan ini.");
            return;
        }
        setLoading(true);
        const nextStatus = catatan.status === "selesai" ? "dikerjakan" : "selesai";
        const supabase = createClient();

        const { error } = await supabase
            .from("catatan_pekerjaan")
            .update({ status: nextStatus })
            .eq("id", catatan.id);

        setLoading(false);
        if (error) {
            alert("Gagal update status: " + error.message);
        } else {
            router.refresh();
        }
    };

    const handleDelete = async () => {
        if (!canDelete) {
            alert("Anda hanya boleh menghapus catatan milik Anda sendiri.");
            return;
        }
        if (!confirm(`Hapus catatan "${catatan.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase
            .from("catatan_pekerjaan")
            .delete()
            .eq("id", catatan.id);
        setLoading(false);
        if (error) {
            alert("Gagal menghapus catatan: " + error.message);
        } else {
            router.push("/catatan-pekerjaan");
            router.refresh();
        }
    };

    const formattedDate = new Date(catatan.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });


    return (
        <aside className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-140px)] sticky top-20">
            <header className="p-5 border-b border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${catatan.status === "dikerjakan" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                            {catatan.status}
                        </span>
                        <span className="text-xs font-mono text-gray-400">ID-{catatan.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                        {canDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                title={isAdmin ? "Hapus Catatan (Admin)" : "Hapus Catatan Saya"}
                                className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded-md"><Link2 className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded-md"><Printer className="w-4 h-4" /></button>
                    </div>

                </div>

                <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{catatan.judul}</h2>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Dibuat {formattedDate} WIB oleh <strong>{catatan.penanggung_jawab}</strong></span>
                    </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <button
                        type="button"
                        onClick={() => setIsModalEditOpen(true)}
                        disabled={!canUpdateStatus}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Catatan
                    </button>
                    <button
                        type="button"
                        onClick={handleToggleStatus}
                        disabled={loading || !canUpdateStatus}
                        title={!canUpdateStatus ? "Hanya penanggung jawab atau Admin yang dapat mengubah status" : ""}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E5E35] hover:bg-green-800 text-white rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {catatan.status === "selesai" ? "Tandai Dikerjakan" : "Tandai Selesai"}
                    </button>
                </div>
            </header>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 text-gray-700">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Penanggung Jawab</span>
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span> {catatan.penanggung_jawab}
                        </div>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lokasi / Fasilitas</span>
                        <strong className="text-gray-900 block">{catatan.lokasi}</strong>
                    </div>
                </div>

                <section className="space-y-2">
                    <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">≡ Deskripsi & Log Pekerjaan</h3>
                    <p className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 leading-relaxed text-xs whitespace-pre-wrap">
                        {catatan.deskripsi}
                    </p>
                </section>

                {catatan.tautan_eksternal && (
                    <section className="space-y-2 pt-2 border-t border-gray-100">
                        <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">Tautan</h3>
                        <a
                            href={catatan.tautan_eksternal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-blue-600 truncate"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <ExternalLink className="w-4 h-4 shrink-0" /> {catatan.tautan_eksternal}
                            </span>
                            <span className="text-gray-400">→</span>
                        </a>
                    </section>
                )}

                {catatan.lampiran_url && (
                    <section className="space-y-2 pt-2 border-t border-gray-100">
                        <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                            Bukti & Lampiran Lapangan
                        </h3>
                        <a
                            href={catatan.lampiran_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-gray-50/70 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <Paperclip className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                    <p className="font-semibold text-gray-900 truncate">{catatan.lampiran_nama || "Berkas Bukti Pekerjaan"}</p>
                                    <p className="text-[10px] text-gray-400">Klik untuk melihat berkas asli</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                        </a>
                        {/* Preview gambar jika format gambar */}
                        {catatan.lampiran_url.match(/\.(jpg|jpeg|png|webp)$/i) && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 max-h-48 bg-gray-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={catatan.lampiran_url}
                                    alt="Bukti lapangan"
                                    className="w-full h-auto object-cover max-h-48"
                                />
                            </div>
                        )}
                    </section>
                )}
            </div>
            {/* Modal Edit diunduh hanya saat diklik */}
            {isModalEditOpen && (
                <ModalEditCatatan
                    isOpen={isModalEditOpen}
                    onClose={() => setIsModalEditOpen(false)}
                    catatan={catatan}
                    currentUser={currentUser}
                    onDelete={handleDelete}
                />
            )}
        </aside>
    );
}
