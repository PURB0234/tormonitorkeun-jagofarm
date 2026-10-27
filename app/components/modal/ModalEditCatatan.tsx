"use client";

import { useState, useEffect } from "react";
import {
    X, FileText, MapPin, UploadCloud,
    Image as ImageIcon, FileSpreadsheet, Link2, BookmarkCheck,
    ChevronDown, Trash2, Clock, Plus, Loader2
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Catatan } from "../../(workspace)/catatan-pekerjaan/components/CatatanList";

type ModalEditProps = {
    isOpen: boolean;
    onClose: () => void;
    catatan: Catatan;
    currentUser: { id: string, role: string; name: string };
    onDelete?: () => void;
};

export default function ModalEditCatatan({
    isOpen,
    onClose,
    catatan,
    currentUser,
    onDelete,
}: ModalEditProps) {
    const router = useRouter();
    const [status, setStatus] = useState<"dikerjakan" | "selesai">(catatan.status);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);

    const isAdmin = currentUser.role === "admin";
    const isAssignee = catatan.penanggung_jawab_id ? catatan.penanggung_jawab_id === currentUser.id : catatan.penanggung_jawab.toLowerCase().includes(currentUser.name.toLowerCase());
    const canEdit = isAdmin || isAssignee;
    const canDelete = isAdmin || isAssignee;
    const [file, setFile] = useState<File | null>(null);
    const [currentLampiranUrl, setCurrentLampiranUrl] = useState<string | null>(catatan.lampiran_url || null);
    const [currentLampiranNama, setCurrentLampiranNama] = useState<string | null>(catatan.lampiran_nama || null);

    useEffect(() => {
        setStatus(catatan.status);
        setCurrentLampiranUrl(catatan.lampiran_url || null);
        setCurrentLampiranNama(catatan.lampiran_nama || null);
        setFile(null);
    }, [catatan]);

    useEffect(() => {
        const supabase = createClient();
        supabase.from("profiles").select("*").then(({ data }) => {
            if (data && data.length > 0) setMembers(data);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canEdit) {
            alert("Anda hanya berhak mengedit catatan milik Anda sendiri.");
            return;
        }

        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const supabase = createClient();

        let lampiranUrl = currentLampiranUrl;
        let lampiranNama = currentLampiranNama;

        if (file) {
            const ext = file.name.split(".").pop();
            const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("berkas_catatan")
                .upload(filePath, file);
            if (uploadError) {
                alert("Gagal mengunggah lampiran: " + uploadError.message);
                setLoading(false);
                return;
            }
            const { data: publicUrlData } = supabase.storage
                .from("berkas_catatan")
                .getPublicUrl(filePath);
            lampiranUrl = publicUrlData.publicUrl;
            lampiranNama = file.name;
        }

        const selectedMemberId = (formData.get("penanggung_jawab_id") as string) || catatan.penanggung_jawab_id;
        const selectedMember = members.find((m) => m.id === selectedMemberId);
        const selectedMemberName = selectedMember
            ? (selectedMember.full_name || selectedMember.name || selectedMember.email?.split("@")[0])
            : catatan.penanggung_jawab;

        const { error } = await supabase
            .from("catatan_pekerjaan")
            .update({
                judul: formData.get("judul") as string,
                penanggung_jawab_id: selectedMemberId || null,
                penanggung_jawab: selectedMemberName,
                status: status,
                lokasi: formData.get("lokasi") as string,
                deskripsi: formData.get("deskripsi") as string,
                tautan_eksternal: (formData.get("tautan") as string) || null,
                lampiran_url: lampiranUrl,
                lampiran_nama: lampiranNama,
            })
            .eq("id", catatan.id);

        setLoading(false);
        if (error) {
            alert("Gagal memperbarui catatan: " + error.message);
        } else {
            onClose();
            router.refresh();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header Modal */}
                <header className="flex items-start justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1E5E35] text-white flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-900">Edit Catatan Pekerjaan</h2>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-200 bg-gray-100 text-gray-600 font-bold uppercase">
                                    ID-{catatan.id.slice(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Perbarui informasi operasional, progres tindakan, atau kelengkapan berkas bukti.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Form Isi */}
                <form id="form-edit-catatan" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                    {/* Judul */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Judul Catatan Pekerjaan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            name="judul"
                            defaultValue={catatan.judul}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                    {/* Penanggung Jawab & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-gray-800 mb-1.5">
                                Penanggung Jawab <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    name="penanggung_jawab_id"
                                    defaultValue={catatan.penanggung_jawab_id || ""}
                                    disabled={!isAdmin && !isAssignee}
                                    className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-hidden focus:border-green-600 disabled:bg-gray-50"
                                >
                                    {members.length > 0 ? (
                                        members.map((m) => {
                                            const name = m.name || m.full_name || m.email?.split("@")[0] || "Anggota";
                                            return (
                                                <option key={m.id} value={m.id}>
                                                    {name}
                                                </option>
                                            );
                                        })
                                    ) : (
                                        <option value={catatan.penanggung_jawab_id || ""}>{catatan.penanggung_jawab}</option>
                                    )}
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-gray-800 mb-1.5">
                                Status Pekerjaan <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatus("dikerjakan")}
                                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${status === "dikerjakan"
                                        ? "border-green-600 bg-green-50 text-green-800"
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-green-600"></span> Dikerjakan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus("selesai")}
                                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${status === "selesai"
                                        ? "border-green-600 bg-green-50 text-green-800"
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-gray-400"></span> Selesai
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lokasi */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Lokasi / Fasilitas Operasional <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                                name="lokasi"
                                defaultValue={catatan.lokasi}
                                className="w-full appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-hidden focus:border-green-600"
                            >
                                <option>Ko+Lab</option>
                                <option>Empang balong</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Deskripsi */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Deskripsi & Log Detail Pekerjaan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            required
                            name="deskripsi"
                            defaultValue={catatan.deskripsi}
                            className="w-full p-3 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                    {/* Riwayat & Update Progres */}
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wide">
                                <Clock className="w-3.5 h-3.5 text-gray-400" /> Riwayat & Update Progres
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    const time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                                    const log = prompt("Tambah catatan progres waktu nyata:");
                                    if (log) {
                                        const area = document.querySelector('textarea[name="deskripsi"]') as HTMLTextAreaElement;
                                        if (area) area.value += `\n[${time} WIB] ${log}`;
                                    }
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-green-800 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-2xs"
                            >
                                <Plus className="w-3 h-3" /> Tambah Update Waktu Nyata
                            </button>
                        </div>
                        <div className="text-xs bg-white border border-gray-200 rounded-lg p-2.5 text-gray-600">
                            <strong>Status Saat Ini:</strong> {catatan.status.toUpperCase()} di {catatan.lokasi}
                        </div>
                    </div>

                    {/* Lampiran & Berkas */}
                    {/* Lampiran & Berkas (Opsional) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="font-bold text-gray-800">
                                Lampiran & Bukti Terunggah <span className="text-gray-400 font-normal">(Opsional)</span>
                            </label>
                            <span className="text-[11px] text-gray-400 font-mono">Maks. 25MB</span>
                        </div>

                        <input
                            type="file"
                            id="file-bukti-edit"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />

                        {file ? (
                            // Berkas baru dipilih
                            <div className="flex items-center justify-between p-3 bg-blue-50/40 border border-blue-200 rounded-xl">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-gray-800 truncate">{file.name}</p>
                                        <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB • Berkas Baru</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : currentLampiranUrl ? (
                            // Berkas yang sudah tersimpan sebelumnya
                            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <ImageIcon className="w-5 h-5 text-gray-600 shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-gray-800 truncate">{currentLampiranNama || "Berkas Tersimpan"}</p>
                                        <label htmlFor="file-bukti-edit" className="text-[10px] text-blue-600 hover:underline cursor-pointer">
                                            Klik untuk ganti berkas
                                        </label>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentLampiranUrl(null);
                                        setCurrentLampiranNama(null);
                                    }}
                                    title="Hapus lampiran"
                                    className="p-1 text-gray-400 hover:text-red-600 rounded-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            // Belum ada berkas
                            <label
                                htmlFor="file-bukti-edit"
                                className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors block"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-1">
                                    <UploadCloud className="w-4 h-4" />
                                </div>
                                <p className="font-semibold text-gray-800 text-xs">Klik untuk menambah berkas bukti pekerjaan</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Format JPG, PNG, PDF, atau CSV</p>
                            </label>
                        )}
                    </div>


                    {/* Tautan Grafana */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">Tautan Eksternal / Telemetri IoT (Opsional)</label>
                        <div className="relative">
                            <Link2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="url"
                                name="tautan"
                                defaultValue={catatan.tautan_eksternal || ""}
                                placeholder="cth: https://grafana.jagofarm.id/d/gh02-telemetry"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Modal */}
                <footer className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
                    <div>
                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onDelete?.();
                                }}
                                className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus Catatan
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs"
                        >
                            Batal
                        </button>
                        <button
                            form="form-edit-catatan"
                            disabled={loading || !canEdit}
                            type="submit"
                            className="px-4 py-2 bg-[#1E5E35] hover:bg-green-800 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-2xs disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
                            Simpan Perubahan
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
