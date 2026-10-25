// 2. app/(workspace)/beranda/page.tsx (Main konten semantik & 1 sampel per bagian)
import {
    Calendar, Clock, ChevronRight, Paperclip,
    FileText, ExternalLink, MapPin, Users, Info
} from "lucide-react";
import Card from "@/app/components/ui/Card";
import { getCurrentUserRole } from "@/app/lib/auth/permissions";

export default async function BerandaPage() {
    const role = await getCurrentUserRole();
    const roleLabel = role === "admin" ? "Admin" : "Member";

    return (
        <main className="max-w-7xl mx-auto space-y-6">
            {/* HERO / GREETING */}
            <header className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <time dateTime="2025-02-24">Senin, 24 Februari 2025</time>
                        <span>•</span>
                        <span className="text-green-700 font-semibold">Musim Tanam Q1</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Selamat pagi, {roleLabel}! 🌾</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Semua sistem irigasi blok B normal. <strong className="text-gray-900">4 agenda tim</strong> hari ini.
                    </p>
                </div>

                {/* Metrics Box */}
                <div className="flex items-center border border-gray-200 rounded-lg p-2.5 divide-x divide-gray-200 text-center">
                    <div className="px-3.5">
                        <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">Greenhouse 01</span>
                        <span className="text-sm font-bold text-gray-800">27.4°C <span className="text-xs font-normal text-gray-400">/ 72%</span></span>
                    </div>
                    <div className="px-3.5">
                        <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">EC Tandon B</span>
                        <span className="text-sm font-bold text-gray-800">1.82 <span className="text-xs font-normal text-gray-400">mS/cm</span></span>
                    </div>
                    <div className="px-3.5">
                        <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">pH Rata-rata</span>
                        <span className="text-sm font-bold text-gray-800">6.2 <span className="text-xs text-green-600 font-medium">Opt.</span></span>
                    </div>
                </div>
            </header>

            {/* GRID SECTION: KIRI (Tugas & Catatan), KANAN (Jadwal & Tim) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* KOLOM KIRI */}
                <section className="lg:col-span-7 space-y-6">
                    {/* Card: Pekerjaan Berjalan */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
                                Pekerjaan Berjalan (Sedang Dikerjakan)
                            </h2>
                            <span className="bg-green-100 border-1 border-green-800 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">3 Aktif</span>
                        </div>

                        {/* Sampel Item Tugas */}
                        <article className="border-t border-gray-100 pt-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded text-[11px]">DIKERJAKAN</span>
                                    <span className="flex items-center gap-1 font-medium text-gray-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Dimas Setiawan
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Diperbarui 1 jam lalu</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm">Kalibrasi Sensor EC & pH Greenhouse 02</h3>
                            <p className="text-xs text-gray-600 mt-1">Pembersihan probe dengan larutan buffer pH 4.01 dan 7.00. Pengukuran deviasi pada modul dosing otomatis blok B2.</p>

                            <div className="flex gap-2 mt-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded text-xs">
                                    <Paperclip className="w-3 h-3 text-gray-400" /> foto_multimeter.jpg
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 rounded text-xs">
                                    <Paperclip className="w-3 h-3 text-gray-400" /> log_sensor_gh02.csv
                                </span>
                            </div>
                        </article>
                    </Card>

                    {/* Card: Catatan Terbaru Diperbarui */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-600" /> Catatan Terbaru Diperbarui
                            </h2>
                            <button className="text-xs font-semibold text-green-800 hover:underline">Lihat Semua Catatan →</button>
                        </div>

                        {/* Sampel Item Catatan */}
                        <article className="border-t border-gray-100 pt-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded text-[11px]">SELESAI</span>
                                    <span>oleh <strong>Budi Prasetyo</strong> • Kemarin, 16:45</span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm">Laporan Inspeksi Hama Thrips di Greenhouse 01</h3>
                            <blockquote className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs italic text-gray-600">
                                &quot;Dilakukan penyemprotan biopestisida neem oil dosis 3ml/L. Perangkap kuning dipasang ulang di 8 titik talang gantung.&quot;
                            </blockquote>
                        </article>
                    </Card>
                </section>

                {/* KOLOM KANAN */}
                <aside className="lg:col-span-5 space-y-6">
                    {/* Card: Jadwal Hari Ini */}
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-600" /> Jadwal Hari Ini & Mendatang
                            </h2>
                            <button className="text-xs font-semibold text-gray-600 hover:underline">Lihat Kalender</button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-2">
                            <span>• HARI INI (24 FEB)</span>
                            <span>2 Agenda</span>
                        </div>

                        {/* Sampel Item Jadwal */}
                        <article className="border-l-4 border-amber-500 bg-amber-50/20 border-y border-r border-gray-200 rounded-r-lg rounded-l-lg p-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <time className="font-semibold text-gray-700">08:30 - 10:00</time>
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">Dimas Setiawan</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm">Pengecekan Pompa Submersible Blok B</h3>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <MapPin className="w-3 h-3" /> Pompa Utama Greenhouse
                            </div>
                        </article>
                    </Card>

                    {/* Card: Anggota Tim */}
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-600" /> Anggota Tim JagoFarm
                            </h2>
                            <span className="text-xs text-gray-500">4 Petugas</span>
                        </div>

                        {/* Sampel Item Anggota */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg">
                                <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-200 text-green-800 font-bold flex items-center justify-center text-xs">
                                    B
                                </div>
                                <div className="text-xs leading-tight">
                                    <strong className="text-gray-900 flex items-center gap-1">Budi Prasetyo <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block"></span></strong>
                                    <span className="text-gray-500 text-[11px]">Fokus: Agronomi</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Protocol Alert */}
                    <div className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-600">
                        <Info className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                        <div>
                            <strong className="text-gray-900 block mb-0.5">Protokol Kebersihan Sprayer:</strong>
                            Pencucian nozel tangki biopestisida wajib dilakukan segera setelah shift sore berakhir dengan air steril.
                        </div>
                    </div>
                </aside>

            </div>
        </main>
    );
}
