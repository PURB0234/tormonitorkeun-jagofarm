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

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({
            data: { user }
        }) => {
            if (user) {
                const name = user.user_metadata?.full_name ??
                    user.email?.split("@")[0] ?? "Staf Lapangan";
                setUserName(name);
            }
        });
    }, []);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setMyEmail(user.email ?? "");
        });

        supabase.from("profiles").select("*").then(({ data }) => {
            if (data && data.length > 0) setMembers(data);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const supabase = createClient();

        const { error } = await supabase.from("catatan_pekerjaan").insert({
            judul: formData.get("judul") as string,
            penanggung_jawab: formData.get("penanggung_jawab") as string,
            status: status as "dikerjakan" | "selesai",
            lokasi: formData.get("lokasi") as string,
            deskripsi: formData.get("deskripsi") as string,
            tautan_eksternal: formData.get("tautan") as string || null
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
                                    name="penanggung_jawab"
                                    className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-hidden focus:border-green-600"
                                >
                                    {members.length > 0 ? (
                                        members.map((m) => {
                                            const name = m.name || m.full_name || m.email?.split("@")[0] || "Anggota";
                                            const isMe = m.email === myEmail;
                                            return (
                                                <option key={m.id} value={name}>
                                                    {name} {isMe ? "(Saya)" : ""}
                                                </option>
                                            );
                                        })
                                    ) : (
                                        <option value={myEmail.split("@")[0] || "Memuat..."}>
                                            {myEmail.split("@")[0] || "Memuat..."} (Saya)
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
                                <option>Farm Land</option>
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
                            <label className="font-bold text-gray-800">Upload Bukti & Berkas Lapangan</label>
                            <span className="text-[11px] text-gray-400 font-mono">Maks. 25MB / file</span>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-1.5">
                                <UploadCloud className="w-5 h-5" />
                            </div>
                            <p className="font-semibold text-gray-800">Klik atau seret file ke sini untuk mengunggah bukti pekerjaan</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Format JPG, PNG, PDF, atau CSV (dokumen uji, sertifikasi, atau foto sensor)</p>
                        </div>

                        {/* List Berkas Terunggah */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="flex items-center justify-between p-2.5 bg-blue-50/30 border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-gray-800 truncate">foto_kondisi_sensor_ec.jpg</p>
                                        <p className="text-[10px] text-gray-400">1.8 MB • Gambar</p>
                                    </div>
                                </div>
                                <button type="button" className="text-gray-400 hover:text-gray-700 ml-2"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-blue-50/30 border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileSpreadsheet className="w-4 h-4 text-green-700 shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-gray-800 truncate">log_pembacaan_do_sensor.csv</p>
                                        <p className="text-[10px] text-gray-400">34 KB • CSV</p>
                                    </div>
                                </div>
                                <button type="button" className="text-gray-400 hover:text-gray-700 ml-2"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
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
