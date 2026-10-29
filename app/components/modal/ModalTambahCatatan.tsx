// 1. app/components/modal/ModalTambahCatatan.tsx
"use client";

import { useState, useEffect } from "react";
import {
    X, FileText, MapPin, UploadCloud,
    Image as ImageIcon, FileSpreadsheet, Link2, BookmarkCheck, ChevronDown
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ModalTambahCatatan({ isOpen, onClose }: ModalProps) {
    const [status, setStatus] = useState<"dikerjakan" | "selesai">("dikerjakan");
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [myEmail, setMyEmail] = useState("");
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const supabase = createClient();

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            const email = user.email ?? "";
            const name = user.user_metadata?.full_name ?? email.split("@")[0] ?? "Staf Lapangan";
            setUserName(name);
            setMyEmail(email);
        });

        supabase
            .from("profiles")
            .select("id, full_name, email")
            .then(({ data }) => {
                if (data && data.length > 0) setMembers(data);
            });
    }, [isOpen]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const supabase = createClient();

        let lampiranUrl: string | null = null;
        let lampiranNama: string | null = null;

        if (file) {
            const ext = file.name.split(".").pop();
            const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("berkas_catatan").upload(filePath, file);

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

        const selectedMemberId = formData.get("penanggung_jawab_id") as string;
        const selectedMember = members.find((m) => m.id === selectedMemberId);
        const selectedMemberName = selectedMember
            ? (selectedMember.full_name || selectedMember.name || selectedMember.email?.split("@")[0] || "Anggota")
            : "Anggota";

        const { error } = await supabase.from("catatan_pekerjaan").insert({
            judul: formData.get("judul") as string,
            penanggung_jawab_id: selectedMemberId || null,
            penanggung_jawab: selectedMemberName,
            status: status as "dikerjakan" | "selesai",
            lokasi: formData.get("lokasi") as string,
            deskripsi: formData.get("deskripsi") as string,
            tautan_eksternal: formData.get("tautan") as string || null,
            lampiran_url: lampiranUrl,
            lampiran_nama: lampiranNama,
        });

        setLoading(false);
        if (error) {
            alert("Gagal menyimpan: " + error.message);
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
                            <h2 className="text-lg font-bold text-gray-900">Tambah Catatan Pekerjaan</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Dokumentasikan progres harian, temuan lapangan, atau bukti pekerjaan tim.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Form Isi (Scrollable) */}
                <form id="form-catatan" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                    {/* Judul */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Judul Catatan Pekerjaan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            name="judul"
                            placeholder="cth: Kalibrasi Sensor EC Greenhouse 02"
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
                                    className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-hidden focus:border-green-600"
                                >
                                    {members.length > 0 ? (
                                        members.map((m) => {
                                            const name = m.name || m.full_name || m.email?.split("@")[0] || "Anggota";
                                            const isMe = m.email === myEmail;
                                            return (
                                                <option key={m.id} value={m.id}>
                                                    {name} {isMe ? "(Saya)" : ""}
                                                </option>
                                            );
                                        })
                                    ) : (
                                        <option value={myEmail.split("@")[0] || "Memuat..."}>
                                            {myEmail.split("@")[0] || "Memuat..." + ("Saya")}
                                        </option>
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
                            <select name="lokasi" className="w-full appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-hidden focus:border-green-600">
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
                            placeholder="Tuliskan pengamatan teknis, tindakan pemeliharaan yang dilakukan, kendala yang dihadapi, atau rekomendasi tindak lanjut..."
                            className="w-full p-3 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                    {/* Upload Berkas */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="font-bold text-gray-800">
                                Upload Bukti & Berkas Lapangan <span className="text-gray-400 font-normal">(Opsional)</span>
                            </label>
                            <span className="text-[11px] text-gray-400 font-mono">Maks. 25MB</span>
                        </div>
                        <input
                            type="file"
                            id="file-bukti"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        {!file ? (
                            <label
                                htmlFor="file-bukti"
                                className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors block"
                            >
                                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-1.5">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <p className="font-semibold text-gray-800">Klik untuk memilih berkas bukti pekerjaan</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">Format JPG, PNG, PDF, atau CSV</p>
                            </label>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-blue-50/40 border border-blue-200 rounded-xl">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-gray-800 truncate">{file.name}</p>
                                        <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB • Siap diunggah</p>
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
                        )}
                    </div>

                    {/* Tautan Grafana */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">Tautan (Opsional)</label>
                        <div className="relative">
                            <Link2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="url"
                                name="tautan"
                                placeholder="cth: https://grafana.jagofarm.id/d/gh02-telemetry"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Modal */}
                <footer className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs"
                    >
                        Batal
                    </button>
                    <button
                        form="form-catatan"
                        disabled={loading}
                        type="submit"
                        className="px-4 py-2 bg-[#1E5E35] hover:bg-green-800 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-2xs"
                    >
                        <BookmarkCheck className="w-4 h-4" />{loading ? "Menyimpan..." : "Simpan & Publikasikan Catatan"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
