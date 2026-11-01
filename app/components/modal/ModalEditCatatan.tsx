"use client";

import { useState, useEffect } from "react";
import {
    X, FileText, MapPin, UploadCloud,
    Image as ImageIcon, FileSpreadsheet, Link2, BookmarkCheck,
    ChevronDown, Trash2, Clock, Plus, Loader2, Calendar, Check
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Catatan } from "../../(workspace)/catatan-pekerjaan/components/CatatanList";
import { DAFTAR_LOKASI } from "@/app/lib/constants";

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
    const [tanggal, setTanggal] = useState("");
    const [tanggalSelesai, setTanggalSelesai] = useState("");
    const [waktuMulai, setWaktuMulai] = useState("08:00");
    const [waktuSelesai, setWaktuSelesai] = useState("10:00");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isAllTeam, setIsAllTeam] = useState(false);

    const toggleMember = (id: string) => {
        setIsAllTeam(false);
        setSelectedMemberIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const toggleAllTeam = () => {
        if (!isAllTeam) {
            setIsAllTeam(true);
            setSelectedMemberIds(members.map((m) => m.id));
        } else {
            setIsAllTeam(false);
            setSelectedMemberIds([]);
        }
    };

    useEffect(() => {
        setStatus(catatan.status);
        setCurrentLampiranUrl(catatan.lampiran_url || null);
        setCurrentLampiranNama(catatan.lampiran_nama || null);
        setFile(null);

        const pj = (catatan.penanggung_jawab || "").toLowerCase();
        if (pj.includes("seluruh tim")) {
            setIsAllTeam(true);
        } else {
            setIsAllTeam(false);
        }

        const initialTgl = (catatan as any).tanggal ? String((catatan as any).tanggal).slice(0, 10) : new Date().toISOString().split("T")[0];
        const initialTglSelesai = (catatan as any).tanggal_selesai ? String((catatan as any).tanggal_selesai).slice(0, 10) : initialTgl;
        setTanggal(initialTgl);
        setTanggalSelesai(initialTglSelesai);
        setWaktuMulai((catatan as any).waktu_mulai ? String((catatan as any).waktu_mulai).slice(0, 5) : "08:00");
        setWaktuSelesai((catatan as any).waktu_selesai ? String((catatan as any).waktu_selesai).slice(0, 5) : "10:00");

        // Jika terhubung ke jadwal_kegiatan, load tanggal & jam langsung dari jadwal
        if (catatan.tautan_eksternal?.startsWith("jadwal:")) {
            const jadwalId = catatan.tautan_eksternal.replace("jadwal:", "");
            const supabase = createClient();
            supabase
                .from("jadwal_kegiatan")
                .select("tanggal, tanggal_selesai, waktu_mulai, waktu_selesai")
                .eq("id", jadwalId)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        if (data.tanggal) setTanggal(String(data.tanggal).slice(0, 10));
                        if (data.tanggal_selesai) setTanggalSelesai(String(data.tanggal_selesai).slice(0, 10));
                        else if (data.tanggal) setTanggalSelesai(String(data.tanggal).slice(0, 10));
                        if (data.waktu_mulai) setWaktuMulai(String(data.waktu_mulai).slice(0, 5));
                        if (data.waktu_selesai) setWaktuSelesai(String(data.waktu_selesai).slice(0, 5));
                    }
                });
        }
    }, [catatan]);

    useEffect(() => {
        if (!catatan || members.length === 0) return;
        if (isAllTeam) {
            setSelectedMemberIds(members.map((m) => m.id));
        } else {
            const pj = (catatan.penanggung_jawab || "").toLowerCase();
            const matchedIds = members
                .filter((m) => {
                    const name = (m.full_name || m.name || m.email?.split("@")[0] || "").toLowerCase();
                    const first = name.split(" ")[0];
                    return pj.includes(first) || (catatan.penanggung_jawab_id && m.id === catatan.penanggung_jawab_id);
                })
                .map((m) => m.id);

            if (matchedIds.length > 0) {
                setSelectedMemberIds(matchedIds);
            } else if (catatan.penanggung_jawab_id) {
                setSelectedMemberIds([catatan.penanggung_jawab_id]);
            }
        }
    }, [members, isAllTeam, catatan]);

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

        let pjNama = "";
        let finalTag: string | null = null;

        if (isAllTeam || (members.length > 0 && selectedMemberIds.length === members.length)) {
            pjNama = "Seluruh Tim (" + members.length + ")";
            finalTag = "Seluruh Tim (" + members.length + ")";
        } else if (selectedMemberIds.length > 0) {
            const selectedNames = members
                .filter((m) => selectedMemberIds.includes(m.id))
                .map((m) => {
                    const full = m.full_name || m.name || m.email?.split("@")[0] || "Anggota";
                    const parts = full.trim().split(" ");
                    return parts.length > 1 ? parts[0] + " " + parts[1][0] + "." : parts[0];
                });
            pjNama = selectedNames.join(" & ");
        } else {
            pjNama = catatan.penanggung_jawab || "Staf Lapangan";
        }

        const isValidUUID = (id: string | null) =>
            id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const primaryId = selectedMemberIds.length === 1 ? selectedMemberIds[0] : null;

        const userTautan = (formData.get("tautan") as string) || null;

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({
                nama_kegiatan: formData.get("judul") as string,
                penanggung_jawab_id: isValidUUID(primaryId) ? primaryId : null,
                penanggung_jawab_nama: pjNama,
                tag: finalTag,
                lokasi: formData.get("lokasi") as string,
                catatan: formData.get("deskripsi") as string,
                tanggal: tanggal,
                tanggal_selesai: tanggalSelesai || tanggal,
                waktu_mulai: waktuMulai,
                waktu_selesai: waktuSelesai,
                status: status === "selesai" ? "selesai" : "terjadwal",
                lampiran_url: lampiranUrl,
                lampiran_nama: lampiranNama,
                tautan_eksternal: userTautan,
            })
            .eq("id", catatan.id);

        setLoading(false);
        if (error) {
            alert("Gagal memperbarui catatan: " + error.message);
        } else {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("app:sync"));
            }
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

                    {/* Penanggung Jawab (Multi-PJ) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="font-bold text-gray-800">
                                Penanggung Jawab <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[11px] text-gray-500">
                                {selectedMemberIds.length} dipilih
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <button
                                type="button"
                                disabled={!canEdit}
                                onClick={toggleAllTeam}
                                className={
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition disabled:opacity-50 " +
                                    (isAllTeam
                                        ? "bg-[#1E5E35] text-white"
                                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100")
                                }
                            >
                                Seluruh Tim
                            </button>

                            {members.map((m) => {
                                const isSelected = selectedMemberIds.includes(m.id);
                                const name = m.name || m.full_name || m.email?.split("@")[0] || "Anggota";
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        disabled={!canEdit}
                                        onClick={() => toggleMember(m.id)}
                                        className={
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition disabled:opacity-50 " +
                                            (isSelected
                                                ? "bg-[#1E5E35] text-white"
                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100")
                                        }
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        <span>{name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status Pekerjaan */}
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

                    {/* Rentang Tanggal Pelaksanaan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-gray-800 mb-1.5">
                                Dari Tanggal <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="date"
                                    required
                                    value={tanggal}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setTanggal(val);
                                        if (tanggalSelesai < val) setTanggalSelesai(val);
                                    }}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-gray-800 mb-1.5">
                                Sampai Tanggal <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="date"
                                    required
                                    min={tanggal}
                                    value={tanggalSelesai}
                                    onChange={(e) => setTanggalSelesai(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Waktu Pelaksanaan */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Waktu Pelaksanaan (Mulai - Selesai) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="time"
                                required
                                value={waktuMulai}
                                onChange={(e) => setWaktuMulai(e.target.value)}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-center outline-hidden focus:border-green-600"
                            />
                            <span className="text-gray-400 text-[11px] font-medium shrink-0">s/d</span>
                            <input
                                type="time"
                                required
                                value={waktuSelesai}
                                onChange={(e) => setWaktuSelesai(e.target.value)}
                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-center outline-hidden focus:border-green-600"
                            />
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
                                required
                                className="w-full appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600 cursor-pointer"
                            >
                                {DAFTAR_LOKASI.map((loc) => (
                                    <option key={loc} value={loc}>
                                        {loc}
                                    </option>
                                ))}
                                {catatan.lokasi && !(DAFTAR_LOKASI as readonly string[]).includes(catatan.lokasi) && (
                                    <option value={catatan.lokasi}>{catatan.lokasi}</option>
                                )}
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
                                defaultValue={catatan.tautan_eksternal?.startsWith("jadwal:") ? "" : (catatan.tautan_eksternal || "")}
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
