"use client";

import { useState, useEffect } from "react";
import {
    X,
    FileText,
    Calendar,
    MapPin,
    Clock,
    UploadCloud,
    Image as ImageIcon,
    Link2,
    BookmarkCheck,
    ChevronDown,
    Check,
    Loader2,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import { DAFTAR_LOKASI } from "@/app/lib/constants";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (targetDate?: string) => void;
};

export default function ModalTambahKegiatan({ isOpen, onClose, onSuccess }: ModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form States
    const [namaKegiatan, setNamaKegiatan] = useState("");
    const [status, setStatus] = useState<"terjadwal" | "selesai">("terjadwal");
    const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
    const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split("T")[0]);
    const [waktuMulai, setWaktuMulai] = useState("08:00");
    const [waktuSelesai, setWaktuSelesai] = useState("10:00");
    const [lokasi, setLokasi] = useState("Ko+Lab");
    const [deskripsi, setDeskripsi] = useState("");
    const [tautan, setTautan] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // Member & Auth States
    const [members, setMembers] = useState<{ id: string; full_name?: string; name?: string; email: string }[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isAllTeam, setIsAllTeam] = useState(false);
    const [myEmail, setMyEmail] = useState("");
    const [userName, setUserName] = useState("Staf Lapangan");

    // Batas minimum tanggal: awal bulan saat ini
    const now = new Date();
    const minMonthStart = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";

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
                if (data && data.length > 0) {
                    setMembers(data);
                    const me = data.find((m) => m.email === myEmail);
                    if (me) setSelectedMemberIds([me.id]);
                    else setSelectedMemberIds([data[0].id]);
                }
            });
    }, [isOpen, myEmail]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();

        // 1. Upload Berkas ke Storage jika ada
        let lampiranUrl: string | null = null;
        let lampiranNama: string | null = null;

        if (file) {
            const ext = file.name.split(".").pop();
            const filePath = `kegiatan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

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

        // 2. Format Penanggung Jawab
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
            pjNama = userName;
        }

        const isValidUUID = (id: string | null) =>
            id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const primaryId = selectedMemberIds.length === 1 ? selectedMemberIds[0] : null;

        // 3. Simpan ke Single Source of Truth: jadwal_kegiatan
        const { error } = await supabase.from("jadwal_kegiatan").insert({
            nama_kegiatan: namaKegiatan,
            penanggung_jawab_id: isValidUUID(primaryId) ? primaryId : null,
            penanggung_jawab_nama: pjNama,
            tanggal: tanggal,
            tanggal_selesai: tanggalSelesai || tanggal,
            waktu_mulai: waktuMulai,
            waktu_selesai: waktuSelesai,
            lokasi: lokasi || "Ko+Lab",
            catatan: deskripsi || null,
            tag: finalTag,
            status: status === "selesai" ? "selesai" : "terjadwal",
            lampiran_url: lampiranUrl,
            lampiran_nama: lampiranNama,
            tautan_eksternal: tautan || null,
        });

        setLoading(false);

        if (error) {
            alert("Gagal menyimpan: " + error.message);
            return;
        }

        // Reset Form
        setNamaKegiatan("");
        setDeskripsi("");
        setTautan("");
        setFile(null);

        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("app:sync"));
        }
        if (onSuccess) onSuccess(tanggal);
        onClose();
        router.refresh();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header Modal */}
                <header className="flex items-start justify-between p-5 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1E5E35] text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Tambah Catatan & Kegiatan Baru</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Terhubung langsung ke Log Catatan, Kalender Jadwal, dan Timeline Gantt Chart.
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

                {/* Form Isi (Scrollable) */}
                <form id="form-tambah-kegiatan" onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
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
                            placeholder="Contoh: Kalibrasi Sensor EC Greenhouse 02 & Cek Pompa Nutrisi"
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
                                    min={minMonthStart}
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
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
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
                            placeholder="Tuliskan catatan teknis lapangan, hasil inspeksi, penanganan nutrisi, atau arahan tugas..."
                            className="w-full p-3 border border-gray-300 rounded-lg text-xs outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-600"
                        />
                    </div>

                    {/* Upload Bukti / Lampiran */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="font-bold text-gray-800">
                                Upload Bukti & Lampiran <span className="text-gray-400 font-normal">(Opsional)</span>
                            </label>
                            <span className="text-[11px] text-gray-400 font-mono">Maks. 25MB</span>
                        </div>
                        <input
                            type="file"
                            id="file-tambah-kegiatan"
                            className="hidden"
                            accept="image/*,.pdf,.csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        {!file ? (
                            <label
                                htmlFor="file-tambah-kegiatan"
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

                    {/* Tautan Eksternal */}
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
                <footer className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition"
                    >
                        Batal
                    </button>
                    <button
                        form="form-tambah-kegiatan"
                        disabled={loading}
                        type="submit"
                        className="px-4 py-2 bg-[#1E5E35] hover:bg-green-800 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-2xs transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
                        <span>{loading ? "Menyimpan..." : "Simpan & Publikasikan"}</span>
                    </button>
                </footer>
            </div>
        </div>
    );
}
