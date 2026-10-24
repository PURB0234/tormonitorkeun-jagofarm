
"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Button from "../ui/Button";
import { RotateCcw, Plus } from "lucide-react";

const pageTitles: Record<string, string> = {
    "/beranda": "Beranda",
    "/catatan-pekerjaan": "Catatan Pekerjaan",
    "/jadwal-tim": "Jadwal Tim",
};

const navigation = [
    { label: "Beranda", href: "/beranda" },
    { label: "Catatan Pekerjaan", href: "/catatan-pekerjaan" },
    { label: "Jadwal Tim", href: "/jadwal-tim" },
];

const badgeVariants = [
    {
        id: "b",
        label: "B",
        // Menggunakan warna kustom #F1F5F1 transparan yang Anda inginkan sebelumnya atau hijau lembut
        className: "bg-[#F1F5F1] border-green-200 text-green-800"
    },
    {
        id: "s",
        label: "S",
        className: "bg-slate-100 border-slate-300 text-slate-700"
    },
    {
        id: "d",
        className: "bg-amber-50 border-amber-200 text-amber-800",
        label: "D"
    },
    {
        id: "r",
        label: "R",
        className: "bg-purple-50 border-purple-200 text-purple-800"
    }
];

export default function TopBar() {
    const pathname = usePathname();
    const title = pageTitles[pathname] ?? "TaskFlow";

    return (
        <header className="bg-white w-full h-15 border border-b border-gray-200 flex flex-row items-center">
            <div className="flex flex-row justify-center items-center ml-5 gap-2">
                <Image src="/icons/potted-plant.png" alt="Logo" width={20} height={20} />
                <h3 className="font-bold">JagoFarm TaskFlow</h3>
            </div>

            <nav className="flex flex-row gap-2 justify-center items-center w-100 h-full">
                {navigation.map((item) => {
                    const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                    return (
                        <Button
                            key={item.href}
                            href={item.href}
                            variant="nav"
                            className={`flex items-center gap-2 px-4 h-full text-sm font-semibold border-b-2 transition-colors ${active
                                ? "border-green-600 text-green-700"
                                : "border-transparent text-gray-600 hover:text-black hover:bg-gray-100"
                                }`}
                        >
                            {/* <span>{item.icon}</span> */}
                            <span>{item.label}</span>
                        </Button>
                    );
                })}
            </nav>

            <div className="h-20 w-30">
            </div>

            <div className="h-auto pr-3 border-r-2 border-gray-400 w-auto flex flex-row gap-3 justify-center items-center">
                <Button variant="sync">Sinkronisasi <RotateCcw className="w-3 h-3" /></Button>
                <Button variant="addSchedule"><Plus className="w-5 h-5" />Tambah Jadwal</Button>
                <Button variant="addNote"><Plus className="w-5 h-5" />Tambah Catatan</Button>
            </div>

            <div className="flex flex-row items-center gap-3 ml-5 bg-white">
                {badgeVariants.map((badge) => (
                    <div
                        key={badge.id}
                        // Gabungkan base layout (ukuran, border, rounded) dengan style warna dari array
                        className={`flex items-center justify-center w-7 h-7 text-sm font-bold border-2 rounded-2xl ${badge.className}`}
                    >
                        {badge.label}
                    </div>
                ))}
            </div>
        </header>
    );
}
