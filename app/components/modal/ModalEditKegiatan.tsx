"use client";

import { useState, useEffect } from "react";
import {
    X,
    FileText,
    MapPin,
    Link2,
    BookmarkCheck,
    ChevronDown,
    Loader2,
    Trash2,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import { DAFTAR_LOKASI } from "@/app/lib/constants";
import MemberPicker from "./parts/MemberPicker";
import DateRangePicker from "./parts/DateRangePicker";
import FileUploader from "./parts/FileUploader";

export type EditableKegiatan = {
    id: string;
    nama_kegiatan?: string;
    judul?: string;
    catatan?: string | null;
    deskripsi?: string | null;
    penanggung_jawab_id?: string | null;
    penanggung_jawab_nama?: string;
    penanggung_jawab?: string;
    tanggal?: string | null;
    tanggal_selesai?: string | null;
    waktu_mulai?: string | null;
    waktu_selesai?: string | null;
    lokasi?: string | null;
    tag?: string | null;
    status?: string | null;
    lampiran_url?: string | null;
    lampiran_nama?: string | null;
    tautan_eksternal?: string | null;
    created_at?: string;
};

type ModalEditProps = {
    isOpen: boolean;
    onClose: () => void;
    jadwal?: EditableKegiatan | null;
    catatan?: EditableKegiatan | null;
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
        if (isAllTeam) {
            setIsAllTeam(false);
            setSelectedMemberIds([id]);
            return;
        }
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
            const mems = data || [];
            if (mems.length > 0) setMembers(mems);

            const pj = (activeItem.penanggung_jawab_nama || activeItem.penanggung_jawab || "").toLowerCase();
            const initialTag = activeItem.tag || "";
            const isTeam = pj.includes("seluruh tim") || (initialTag && initialTag.toLowerCase().includes("tim"));

            if (isTeam) {
                setIsAllTeam(true);
                setSelectedMemberIds(mems.map((m) => m.id));
            } else {
                setIsAllTeam(false);
                const matched = mems
                    .filter((m) => {
                        const name = (m.full_name || m.email?.split("@")[0] || "").toLowerCase();
                        const first = name.split(" ")[0];
                        return pj.includes(first) || (activeItem.penanggung_jawab_id && m.id === activeItem.penanggung_jawab_id);
                    })
                    .map((m) => m.id);

                if (matched.length > 0) {
                    setSelectedMemberIds(matched);
                } else if (activeItem.penanggung_jawab_id) {
                    setSelectedMemberIds([activeItem.penanggung_jawab_id]);
                } else {
                    setSelectedMemberIds([]);
                }
            }
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
    }, [isOpen, activeItem]);

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

        // 2. Format PJ & Tag
        let pjNama = "";
        let finalTag: string | null = tag || null;

        if (isAllTeam || (members.length > 0 && selectedMemberIds.length === members.length)) {
            pjNama = "Seluruh Tim (" + members.length + ")";
            finalTag = "Seluruh Tim (" + members.length + ")";
        } else {
            // Jika bukan seluruh tim, buang tag "Seluruh Tim"
            if (finalTag && finalTag.toLowerCase().includes("tim")) {
                finalTag = null;
            }

            if (selectedMemberIds.length > 0) {
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
                    <MemberPicker
                        members={members}
                        selectedMemberIds={selectedMemberIds}
                        isAllTeam={isAllTeam}
                        onToggleMember={toggleMember}
                        onToggleAllTeam={toggleAllTeam}
                    />

                    {/* Rentang Tanggal & Waktu Pelaksanaan */}
                    <DateRangePicker
                        tanggal={tanggal}
                        setTanggal={setTanggal}
                        tanggalSelesai={tanggalSelesai}
                        setTanggalSelesai={setTanggalSelesai}
                        waktuMulai={waktuMulai}
                        setWaktuMulai={setWaktuMulai}
                        waktuSelesai={waktuSelesai}
                        setWaktuSelesai={setWaktuSelesai}
                        minDate={tanggal && tanggal < minMonthStart ? tanggal : minMonthStart}
                    />

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

                    {/* Deskripsi & Log Detail */}
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

                    {/* Upload Bukti / Lampiran */}
                    <FileUploader
                        file={file}
                        setFile={setFile}
                        inputId="file-edit-kegiatan"
                        existingFileUrl={currentLampiranUrl}
                        existingFileName={currentLampiranNama}
                        onRemoveExisting={() => {
                            setFile(null);
                            setCurrentLampiranUrl(null);
                            setCurrentLampiranNama(null);
                        }}
                    />

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
