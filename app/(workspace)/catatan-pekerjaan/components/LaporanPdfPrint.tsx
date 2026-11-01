"use client";

import { JadwalRow } from "./GanttChartTim";

type LaporanPdfPrintProps = {
    jadwals: JadwalRow[];
    periodeText: string;
    generatedAt: string;
};

export default function LaporanPdfPrint({
    jadwals,
    periodeText,
    generatedAt,
}: LaporanPdfPrintProps) {
    const totalAgenda = jadwals.length;
    const selesaiCount = jadwals.filter((j) => j.status === "selesai").length;
    const pendingCount = totalAgenda - selesaiCount;
    const panenCount = jadwals.filter((j) => j.tag?.toUpperCase() === "PANEN").length;

    // Urutkan berdasarkan tanggal & jam mulai
    const sortedJadwals = [...jadwals].sort((a, b) => {
        const dateCompare = a.tanggal.localeCompare(b.tanggal);
        if (dateCompare !== 0) return dateCompare;
        return a.waktu_mulai.localeCompare(b.waktu_mulai);
    });

    return (
        <div className="hidden print:block p-4 font-sans text-black bg-white">
            {/* Kop Laporan Resmi */}
            <div className="border-b-2 border-black pb-4 mb-5 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-lg tracking-wider uppercase text-emerald-900">
                            JAGOFARM TASKFLOW
                        </span>
                        <span className="text-xs text-gray-500">| Smart Agriculture & Monitoring</span>
                    </div>
                    <h1 className="text-xl font-bold mt-1 text-black">
                        LAPORAN JADWAL OPERASIONAL & PENUGASAN TIM LAPANGAN
                    </h1>
                    <p className="text-xs text-gray-700 mt-0.5">
                        Dokumen Rekapitulasi Rencana Kegiatan, Perawatan Greenhouse, dan Catatan Eksekusi Tim
                    </p>
                </div>
                <div className="text-right text-xs text-gray-700">
                    <p><strong>Periode:</strong> {periodeText}</p>
                    <p><strong>Dicetak pada:</strong> {generatedAt}</p>
                    <p><strong>Zona Waktu:</strong> WIB (GMT+7)</p>
                </div>
            </div>

            {/* Ringkasan KPI Eksekutif */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="border border-black p-2.5 rounded bg-gray-50 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">Total Agenda</span>
                    <strong className="text-base font-extrabold">{totalAgenda} Sesi</strong>
                </div>
                <div className="border border-black p-2.5 rounded bg-gray-50 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">Selesai Dilaksanakan</span>
                    <strong className="text-base font-extrabold text-emerald-800">
                        {selesaiCount} Agenda ({totalAgenda > 0 ? Math.round((selesaiCount / totalAgenda) * 100) : 0}%)
                    </strong>
                </div>
                <div className="border border-black p-2.5 rounded bg-gray-50 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">Belum / Berjalan</span>
                    <strong className="text-base font-extrabold text-amber-800">{pendingCount} Agenda</strong>
                </div>
                <div className="border border-black p-2.5 rounded bg-gray-50 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">Agenda Panen Raya</span>
                    <strong className="text-base font-extrabold text-emerald-900">{panenCount} Titik</strong>
                </div>
            </div>

            {/* Tabel Rincian Kegiatan Lapangan */}
            <div className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-gray-400 pb-1">
                    Rincian Penugasan & Pelaksanaan Kegiatan Lapangan
                </h2>
                <table className="w-full text-left text-[11px] border-collapse border border-black">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black text-black">
                            <th className="p-2 border border-black text-center w-8">No</th>
                            <th className="p-2 border border-black w-28">Tanggal & Hari</th>
                            <th className="p-2 border border-black w-24">Waktu (WIB)</th>
                            <th className="p-2 border border-black">Nama Kegiatan & Catatan</th>
                            <th className="p-2 border border-black w-36">Penanggung Jawab</th>
                            <th className="p-2 border border-black w-32">Lokasi / Fasilitas</th>
                            <th className="p-2 border border-black text-center w-20">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedJadwals.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-gray-500 border border-black italic">
                                    Tidak ada data kegiatan pada periode ini.
                                </td>
                            </tr>
                        ) : (
                            sortedJadwals.map((item, idx) => (
                                <tr key={item.id} className="border-b border-gray-400">
                                    <td className="p-2 border border-black text-center font-medium">{idx + 1}</td>
                                    <td className="p-2 border border-black font-semibold whitespace-nowrap">
                                        {item.tanggal}
                                    </td>
                                    <td className="p-2 border border-black whitespace-nowrap">
                                        {item.waktu_mulai.slice(0, 5)} - {item.waktu_selesai.slice(0, 5)}
                                    </td>
                                    <td className="p-2 border border-black">
                                        <div className="font-bold text-black">{item.nama_kegiatan}</div>
                                        {item.catatan && (
                                            <div className="text-[10px] text-gray-700 italic mt-0.5">
                                                &quot;{item.catatan}&quot;
                                            </div>
                                        )}
                                        {item.tag && (
                                            <span className="inline-block mt-1 text-[9px] border border-black px-1 rounded font-semibold uppercase">
                                                {item.tag}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2 border border-black font-medium">{item.penanggung_jawab_nama}</td>
                                    <td className="p-2 border border-black">{item.lokasi || "-"}</td>
                                    <td className="p-2 border border-black text-center font-bold">
                                        {item.status === "selesai" ? "SELESAI" : "TERJADWAL"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Lembar Tanda Tangan & Pengesahan */}
            <div className="grid grid-cols-2 gap-12 mt-12 pt-4 text-xs">
                <div className="text-center">
                    <p className="text-gray-600 mb-16">Disiapkan & Dilaporkan Oleh,</p>
                    <div className="w-48 mx-auto border-b border-black"></div>
                    <strong className="block mt-1 text-black">Staf Pelaksana Lapangan</strong>
                    <span className="text-[10px] text-gray-500">Tim Operasional JagoFarm</span>
                </div>

                <div className="text-center">
                    <p className="text-gray-600 mb-16">Diverifikasi & Disetujui Oleh,</p>
                    <div className="w-48 mx-auto border-b border-black"></div>
                    <strong className="block mt-1 text-black">Supervisor / Farm Manager</strong>
                    <span className="text-[10px] text-gray-500">Manajemen Budidaya & Greenhouse</span>
                </div>
            </div>
        </div>
    );
}
