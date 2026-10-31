"use client";

import { useState, useEffect } from "react";
import { X, Calendar, MapPin, Check, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { DAFTAR_LOKASI } from "@/app/lib/constants";

type JadwalData = {
    id: string;
    nama_kegiatan: string;
    penanggung_jawab_id?: string | null;
    penanggung_jawab_nama: string;
    tanggal: string;
    waktu_mulai: string;
    waktu_selesai: string;
    lokasi?: string | null;
    catatan?: string | null;
    tag?: string | null;
    status: string;
};

type ModalProps = {
    isOpen: boolean;
    jadwal: JadwalData | null;
    onClose: () => void;
    onSuccess?: (targetDate: string) => void;
};

export default function ModalEditJadwal({ isOpen, jadwal, onClose, onSuccess }: ModalProps) {
    const [namaKegiatan, setNamaKegiatan] = useState("");
    const [tanggal, setTanggal] = useState("");
    const [waktuMulai, setWaktuMulai] = useState("08:00");
    const [waktuSelesai, setWaktuSelesai] = useState("10:00");
    const [lokasi, setLokasi] = useState("Ko+Lab");
    const [catatan, setCatatan] = useState("");
    const [tag, setTag] = useState("");
    const [status, setStatus] = useState("terjadwal");
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<{ id: string; full_name: string; email: string }[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isAllTeam, setIsAllTeam] = useState(false);

    // Hitung batas minimum tanggal input (hanya boleh bulan real saat ini ke atas)
    const now = new Date();
    const minMonthStart = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";

    useEffect(() => {
        if (!isOpen || !jadwal) return;

        const supabase = createClient();
        supabase.from("profiles").select("id, full_name, email").then(({ data }) => {
            if (data && data.length > 0) setMembers(data);
        });

        setNamaKegiatan(jadwal.nama_kegiatan || "");
        setTanggal(String(jadwal.tanggal).slice(0, 10));
        setWaktuMulai(String(jadwal.waktu_mulai).slice(0, 5));
        setWaktuSelesai(String(jadwal.waktu_selesai).slice(0, 5));
        setLokasi(jadwal.lokasi || "Ko+Lab");
        setCatatan(jadwal.catatan || "");
        setTag(jadwal.tag || "");
        setStatus(jadwal.status || "terjadwal");

        const pj = jadwal.penanggung_jawab_nama || "";
        if (pj.toLowerCase().includes("seluruh tim") || (jadwal.tag && jadwal.tag.toLowerCase().includes("tim"))) {
            setIsAllTeam(true);
        } else {
            setIsAllTeam(false);
        }
    }, [isOpen, jadwal]);

    // Sinkronkan selectedMemberIds saat members selesai di-load
    useEffect(() => {
        if (!jadwal || members.length === 0) return;
        if (isAllTeam) {
            setSelectedMemberIds(members.map((m) => m.id));
        } else {
            const pj = (jadwal.penanggung_jawab_nama || "").toLowerCase();
            const matchedIds = members
                .filter((m) => {
                    const name = (m.full_name || m.email.split("@")[0]).toLowerCase();
                    const first = name.split(" ")[0];
                    return pj.includes(first);
                })
                .map((m) => m.id);
            if (matchedIds.length > 0) {
                setSelectedMemberIds(matchedIds);
            }
        }
    }, [members, isAllTeam, jadwal]);

    if (!isOpen || !jadwal) return null;

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();
        let pjNama = "";
        let finalTag = tag || null;

        if (isAllTeam || (members.length > 0 && selectedMemberIds.length === members.length)) {
            pjNama = "Seluruh Tim (" + members.length + ")";
            finalTag = "Seluruh Tim (" + members.length + ")";
        } else if (selectedMemberIds.length > 0) {
            const selectedNames = members
                .filter((m) => selectedMemberIds.includes(m.id))
                .map((m) => {
                    const full = m.full_name || m.email.split("@")[0];
                    const parts = full.trim().split(" ");
                    return parts.length > 1 ? parts[0] + " " + parts[1][0] + "." : parts[0];
                });
            pjNama = selectedNames.join(" & ");
        } else {
            pjNama = jadwal.penanggung_jawab_nama || "Staf Lapangan";
        }

        const isValidUUID = (id: string | null) =>
            id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const primaryId = selectedMemberIds.length === 1 ? selectedMemberIds[0] : null;

        const { error } = await supabase
            .from("jadwal_kegiatan")
            .update({
                nama_kegiatan: namaKegiatan,
                penanggung_jawab_id: isValidUUID(primaryId) ? primaryId : null,
                penanggung_jawab_nama: pjNama,
                tanggal: tanggal,
                waktu_mulai: waktuMulai,
                waktu_selesai: waktuSelesai,
                lokasi: lokasi || null,
                catatan: catatan || null,
                tag: finalTag,
                status: status,
            })
            .eq("id", jadwal.id);

        setLoading(false);

        if (error) {
            alert("Gagal memperbarui jadwal: " + error.message);
            return;
        }

        if (onSuccess) onSuccess(tanggal);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div
                className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Edit Jadwal Kegiatan</h2>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {jadwal.id.slice(0, 8)}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                        {/* Nama Kegiatan */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-gray-800">
                                Nama Kegiatan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={namaKegiatan}
                                onChange={(e) => setNamaKegiatan(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-green-700"
                            />
                        </div>

                        {/* Status Kegiatan */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-gray-800">Status Agenda</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatus("terjadwal")}
                                    className={
                                        "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition " +
                                        (status === "terjadwal"
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")
                                    }
                                >
                                    Sedang Dikerjakan / Terjadwal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus("selesai")}
                                    className={
                                        "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition " +
                                        (status === "selesai"
                                            ? "bg-emerald-700 text-white border-emerald-700"
                                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")
                                    }
                                >
                                    ✓ Selesai
                                </button>
                            </div>
                        </div>

                        {/* Penanggung Jawab */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="font-semibold text-gray-800">
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
                                        "px-2.5 py-1 rounded-md text-xs font-medium transition " +
                                        (isAllTeam
                                            ? "bg-[#17462e] text-white"
                                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100")
                                    }
                                >
                                    Seluruh Tim
                                </button>

                                {members.map((m) => {
                                    const isSelected = selectedMemberIds.includes(m.id);
                                    const name = m.full_name || m.email.split("@")[0];
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleMember(m.id)}
                                            className={
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition " +
                                                (isSelected
                                                    ? "bg-[#17462e] text-white"
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

                        {/* Tanggal & Waktu */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-gray-800">
                                    Tanggal <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="date"
                                        required
                                        min={minMonthStart}
                                        value={tanggal}
                                        onChange={(e) => setTanggal(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-green-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-semibold text-gray-800">
                                    Waktu (Mulai - Selesai) <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="time"
                                        required
                                        value={waktuMulai}
                                        onChange={(e) => setWaktuMulai(e.target.value)}
                                        className="w-full px-2 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-green-700 text-center"
                                    />
                                    <span className="text-gray-400 text-[11px] font-medium shrink-0">s/d</span>
                                    <input
                                        type="time"
                                        required
                                        value={waktuSelesai}
                                        onChange={(e) => setWaktuSelesai(e.target.value)}
                                        className="w-full px-2 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-green-700 text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Lokasi */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-gray-800">Lokasi / Fasilitas</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    value={lokasi}
                                    onChange={(e) => setLokasi(e.target.value)}
                                    className="w-full appearance-none pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-green-700 cursor-pointer"
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

                        {/* Catatan */}
                        <div className="space-y-1.5">
                            <label className="font-semibold text-gray-800">Catatan Tambahan</label>
                            <textarea
                                rows={2}
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-green-700 resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3.5 bg-slate-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#17462e] hover:bg-[#123824] text-white rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Simpan Perubahan</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}