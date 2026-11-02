"use client";

import { UploadCloud, Image as ImageIcon, X } from "lucide-react";

type FileUploaderProps = {
    file: File | null;
    setFile: (file: File | null) => void;
    inputId?: string;
    existingFileUrl?: string | null;
    existingFileName?: string | null;
    onRemoveExisting?: () => void;
};

export default function FileUploader({
    file,
    setFile,
    inputId = "file-modal-uploader",
    existingFileUrl,
    existingFileName,
    onRemoveExisting,
}: FileUploaderProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-gray-800">
                    Upload Bukti & Lampiran <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <span className="text-[11px] text-gray-400 font-mono">Maks. 25MB</span>
            </div>

            <input
                type="file"
                id={inputId}
                className="hidden"
                accept="image/*,.pdf,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {/* Jika ada file yang baru dipilih */}
            {file ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/40 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="truncate">
                            <p className="font-bold text-gray-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-400">
                                {(file.size / 1024).toFixed(0)} KB • Siap diunggah
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-md cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : existingFileUrl ? (
                /* Jika ada file eksisting dari database */
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="truncate">
                            <p className="font-bold text-gray-800 truncate">
                                {existingFileName || "Lampiran tersimpan"}
                            </p>
                            <a
                                href={existingFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-700 underline"
                            >
                                Lihat Berkas
                            </a>
                        </div>
                    </div>
                    {onRemoveExisting && (
                        <button
                            type="button"
                            onClick={onRemoveExisting}
                            className="p-1 text-gray-400 hover:text-red-600 rounded-md cursor-pointer"
                            title="Hapus berkas tersimpan"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ) : (
                /* State Kosong */
                <label
                    htmlFor={inputId}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors block"
                >
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-1">
                        <UploadCloud className="w-4 h-4" />
                    </div>
                    <p className="font-semibold text-gray-800 text-xs">Pilih berkas foto atau dokumen bukti</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Format JPG, PNG, PDF, atau CSV</p>
                </label>
            )}
        </div>
    );
}
