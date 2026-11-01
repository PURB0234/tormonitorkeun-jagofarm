"use client";

import { useState, useEffect } from "react";
import {
    X,
    FileText,
    Calendar,
    MapPin,
    UploadCloud,
    Image as ImageIcon,
    Link2,
    BookmarkCheck,
    ChevronDown,
    Check,
    Loader2,
    Trash2,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import { DAFTAR_LOKASI } from "@/app/lib/constants";

type ModalEditProps = {
    isOpen: boolean;
    onClose: () => void;
    jadwal?: any | null;
    catatan?: any | null;
    currentUser?: { id: string; role: string; name: string };
    onDelete?: () => void;
    onSuccess?: (targetDate?: string) => void;
};

export default function ModalEditKegiatan({
    isOpen,
    onClose,
    jadwal,
    catatan,
    currentUser,
    onDelete,
    onSuccess,
}: ModalEditProps) {
    const activeItem = jadwal || catatan;
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form States
    const [namaKegiatan, setNamaKegiatan] = useState("");
    const [status, setStatus] = useState<string>("terjadwal");
    const [tanggal, setTanggal] = useState("");
    const [tanggalSelesai, setTanggalSelesai] = useState("");
    const [waktuMulai, setWaktuMulai] = useState("08:00");
    const [waktuSelesai, setWaktuSelesai] = useState("10:00");
    const [lokasi, setLokasi] = useState("Ko+Lab");
    const [deskripsi, setDeskripsi] = useState("");
    const [tautan, setTautan] = useState("");
    const [tag, setTag] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [currentLampiranUrl, setCurrentLampiranUrl] = useState<string | null>(null);
    const [currentLampiranNama, setCurrentLampiranNama] = useState<string | null>(null);

    // Member States
    const [members, setMembers] = useState<{ id: string; full_name?: string; name?: string; email: string }[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isAllTeam, setIsAllTeam] = useState(false);

    // Batas minimum tanggal
    const now = new Date();
    const minMonthStart = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";

    const isAdmin = currentUser?.role === "admin";
    const canDelete = Boolean(isAdmin || onDelete || true);

    const toggleMember = (id: string) => {
        setSelectedMemberIds((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            setIsAllTeam(members.length > 0 && next.length === members.length);
            return next;
        });
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
        if (!isOpen || !activeItem) return;

        const supabase = createClient();
        supabase.from("profiles").select("id, full_name, email").then(({ data }) => {
            if (data && data.length > 0) setMembers(data);
        });

        const initialNama = activeItem.nama_kegiatan || activeItem.judul || "";
        const initialTgl = String(activeItem.tanggal || activeItem.created_at || "").slice(0, 10) || new Date().toISOString().split("T")[0];
        const initialTglSelesai = activeItem.tanggal_selesai ? String(activeItem.tanggal_selesai).slice(0, 10) : initialTgl;
        const initialMulai = activeItem.waktu_mulai ? String(activeItem.waktu_mulai).slice(0, 5) : "08:00";
        const initialSelesai = activeItem.waktu_selesai ? String(activeItem.waktu_selesai).slice(0, 5) : "10:00";
        const initialLokasi = activeItem.lokasi || "Ko+Lab";
        const initialDesc = activeItem.catatan || activeItem.deskripsi || "";
        const initialTag = activeItem.tag || "";
        const initialStatus = activeItem.status || "terjadwal";
        const initialTautan = activeItem.tautan_eksternal && !activeItem.tautan_eksternal.startsWith("jadwal:") ? activeItem.tautan_eksternal : "";

        setNamaKegiatan(initialNama);
        setTanggal(initialTgl);
        setTanggalSelesai(initialTglSelesai);
        setWaktuMulai(initialMulai);
        setWaktuSelesai(initialSelesai);
        setLokasi(initialLokasi);
        setDeskripsi(initialDesc);
        setTag(initialTag);
        setStatus(initialStatus === "selesai" ? "selesai" : "terjadwal");
        setTautan(initialTautan);
        setCurrentLampiranUrl(activeItem.lampiran_url || null);
        setCurrentLampiranNama(activeItem.lampiran_nama || null);
        setFile(null);

        const pj = (activeItem.penanggung_jawab_nama || activeItem.penanggung_jawab || "").toLowerCase();
        if (pj.includes("seluruh tim") || (initialTag && initialTag.toLowerCase().includes("tim"))) {
            setIsAllTeam(true);
        } else {
            setIsAllTeam(false);
        }
    }, [isOpen, activeItem]);

    useEffect(() => {
        if (!activeItem || members.length === 0) return;
        if (isAllTeam) {
            setSelectedMemberIds(members.map((m) => m.id));
        } else {
            const pj = (activeItem.penanggung_jawab_nama || activeItem.penanggung_jawab || "").toLowerCase();
            const matchedIds = members
                .filter((m) => {
                    const name = (m.full_name || m.name || m.email?.split("@")[0] || "").toLowerCase();
                    const first = name.split(" ")[0];
                    return pj.includes(first) || (activeItem.penanggung_jawab_id && m.id === activeItem.penanggung_jawab_id);
                })
                .map((m) => m.id);

            if (matchedIds.length > 0) {
                setSelectedMemberIds(matchedIds);
            } else if (activeItem.penanggung_jawab_id) {
                setSelectedMemberIds([activeItem.penanggung_jawab_id]);
            }
        }
    }, [members, isAllTeam, activeItem]);

    if (!isOpen || !activeItem) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();

        // 1. Upload Berkas jika diganti
        let lampiranUrl = currentLampiranUrl;
        let lampiranNama = currentLampiranNama;

        if (file) {
            const ext = file.name.split(".").pop();
            const filePath = `kegiatan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("berkas_catatan")
                .upload(filePath, file);

            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from("berkas_catatan")
                    .getPublicUrl(filePath);
                lampiranUrl = publicUrlData.publicUrl;
                lampiranNama = file.name;
            }
        }

        // 2. Format PJ
        let pjNama = "";
        let finalTag = tag || null;

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
            pjNama = activeItem.penanggung_jawab_nama || activeItem.penanggung_jawab || "Staf Lapangan";
        }

        const isValidUUID = (id: string | null) =>
            id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const primaryId = selectedMemberIds.length === 1 ? selectedMemberIds[0] : null;

        // 3. Update tabel utama: jadwal_kegiatan
        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({
                nama_kegiatan: namaKegiatan,
                penanggung_jawab_id: isValidUUID(primaryId) ? primaryId : null,
                penanggung_jawab_nama: pjNama,
                tag: finalTag,
                lokasi: lokasi || "Ko+Lab",
                catatan: deskripsi || null,
                tanggal: tanggal,
                tanggal_selesai: tanggalSelesai || tanggal,
                waktu_mulai: waktuMulai,
                waktu_selesai: waktuSelesai,
                status: status === "selesai" ? "selesai" : "terjadwal",
                lampiran_url: lampiranUrl,
                lampiran_nama: lampiranNama,
                tautan_eksternal: tautan || null,
            })
            .eq("id", activeItem.id);

        setLoading(false);

        if (error) {
            alert("Gagal memperbarui: " + error.message);
            return;
        }

        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
        if (onSuccess) onSuccess(tanggal);
        onClose();
        router.refresh();
    };

    const handleDelete = async () => {
        if (!confirm(`Hapus kegiatan "${namaKegiatan}"? Tindakan ini tidak dapat dibatalkan.`)) return;

        setLoading(true);
        const supabase = createClient();

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .delete()
            .eq("id", activeItem.id);

        setLoading(false);

        if (error) {
            alert("Gagal menghapus: " + error.message);
            return;
        }

        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
        if (onDelete) onDelete();
        onClose();
        router.refresh();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <header className="flex items-start justify-between p-5 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-gray-900">Edit Catatan & Kegiatan</h2>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-200 bg-gray-100 text-gray-600 font-bold uppercase">
                                    ID-{activeItem.id.slice(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Perubahan data otomatis tersinkron ke seluruh modul sistem.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Form Isi */}
                <form id="form-edit-kegiatan" onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
                    {/* Judul Kegiatan */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Judul / Nama Kegiatan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={namaKegiatan}
                            onChange={(e) => setNamaKegiatan(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                    {/* Penanggung Jawab */}
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
                                onClick={toggleAllTeam}
                                className={
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer " +
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
                                        onClick={() => toggleMember(m.id)}
                                        className={
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer " +
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
                                    min={tanggal && tanggal < minMonthStart ? tanggal : minMonthStart}
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

                    {/* Waktu Pelaksanaan & Lokasi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    value={lokasi}
                                    onChange={(e) => setLokasi(e.target.value)}
                                    required
                                    className="w-full appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600 cursor-pointer"
                                >
                                    {DAFTAR_LOKASI.map((loc) => (
                                        <option key={loc} value={loc}>
                                            {loc}
                                        </option>
                                    ))}
                                    {lokasi && !(DAFTAR_LOKASI as readonly string[]).includes(lokasi) && (
                                        <option value={lokasi}>{lokasi}</option>
                                    )}
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Deskripsi & Catatan */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">
                            Deskripsi / Log Detail Pekerjaan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={deskripsi}
                            onChange={(e) => setDeskripsi(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                    {/* Upload Berkas / Dokumentasi */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="font-bold text-gray-800">
                                Bukti Foto & Lampiran <span className="text-gray-400 font-normal">(Opsional)</span>
                            </label>
                            <span className="text-[11px] text-gray-400 font-mono">Maks. 25MB</span>
                        </div>
                        <input
                            type="file"
                            id="file-edit-kegiatan"
                            className="hidden"
                            accept="image/*,.pdf,.csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        {!file && !currentLampiranUrl ? (
                            <label
                                htmlFor="file-edit-kegiatan"
                                className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors block"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-1">
                                    <UploadCloud className="w-4 h-4" />
                                </div>
                                <p className="font-semibold text-gray-800 text-xs">Pilih berkas foto atau dokumen bukti</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Format JPG, PNG, PDF, atau CSV</p>
                            </label>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-blue-50/40 border border-blue-200 rounded-xl">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div className="truncate">
                                        <p className="font-bold text-gray-800 truncate text-xs">
                                            {file ? file.name : currentLampiranNama || "Berkas Terlampir"}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {file ? (file.size / 1024).toFixed(0) + " KB • Siap diunggah" : "Tersimpan di server"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFile(null);
                                        setCurrentLampiranUrl(null);
                                        setCurrentLampiranNama(null);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded-md transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tautan */}
                    <div>
                        <label className="block font-bold text-gray-800 mb-1.5">Tautan Eksternal / Grafana (Opsional)</label>
                        <div className="relative">
                            <Link2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="url"
                                value={tautan}
                                onChange={(e) => setTautan(e.target.value)}
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
                                onClick={handleDelete}
                                className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus Kegiatan
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            form="form-edit-kegiatan"
                            disabled={loading}
                            type="submit"
                            className="px-4 py-2 bg-[#1E5E35] hover:bg-green-800 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
                            <span>Simpan Perubahan</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
