// app/components/layout/TopBar.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Button from "../ui/Button";
import { RotateCcw, Plus, LeafIcon } from "lucide-react";
import LogoutButton from "../LogoutButton";
import { createClient } from "../../lib/supabase/client";
import dynamic from "next/dynamic";
import type { UserRole } from "../../lib/auth/permissions";


interface OnlineUser {
    id: string;
    name: string;
    avatar?: string;
}

const ModalTambahCatatan = dynamic(
    () =>
        import("../modal/ModalTambahCatatan"),
    { ssr: false }
);

export default function TopBar({ role }: { role?: UserRole }) {
    const pathname = usePathname();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();
    const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced">("idle");

    const navigation = [
        { label: "Beranda", href: "/beranda" },
        { label: "Catatan Pekerjaan", href: "/catatan-pekerjaan" },
        { label: "Jadwal Tim", href: "/jadwal-tim" },
        ...(role === "admin" ? [{ label: "Admin Panel", href: "/admin" }] : []),
    ];

    const handleSync = () => {
        if (syncState === "syncing") return;

        setSyncState("syncing");
        router.refresh();

        setTimeout(() => {
            setSyncState("synced");
            setTimeout(() => setSyncState("idle"), 1500);
        }, 600);
    }

    useEffect(() => {
        const supabase = createClient();
        let channel: ReturnType<typeof supabase.channel>;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;

            const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Petugas";
            const avatar = user.user_metadata?.avatar_url;

            // Supabase Realtime Presence untuk lacak user online tanpa tabel DB
            channel = supabase.channel("online-presence", {
                config: { presence: { key: user.id } },
            });

            channel
                .on("presence", { event: "sync" }, () => {
                    const state = channel.presenceState<OnlineUser>();
                    const unique = Object.values(state).map((p) => p[0]).filter(Boolean);
                    setOnlineUsers(unique);
                })
                .subscribe(async (status) => {
                    if (status === "SUBSCRIBED") {
                        await channel.track({ id: user.id, name, avatar });
                    }
                });
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    // Maksimal 2 badge ditampilkan, sisanya masuk format +N
    const displayedUsers = onlineUsers.slice(0, 2);
    const remainingCount = onlineUsers.length - 2;

    const colors = [
        "bg-[#F1F5F1] border-green-200 text-green-800",
        "bg-slate-100 border-slate-300 text-slate-700",
    ];

    return (
        <header className="bg-white w-full h-15 border-b border-gray-200 px-6 flex flex-row items-center justify-between">
            {/* KIRI: Logo + Nav */}
            <div className="flex flex-row items-center gap-8 h-full">
                <div className="flex flex-row items-center gap-2">
                    <LeafIcon className="text-green-800 w-5 h-5" />
                    <h3 className="font-bold text-gray-900">JagoFarm-keun</h3>
                </div>

                <nav className="flex flex-row gap-2 items-center h-full">
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
                                <span>{item.label}</span>
                            </Button>
                        );
                    })}
                </nav>
            </div>

            {/* KANAN: Aksi + Realtime Badges */}
            <div className="flex flex-row items-center gap-4">
                <div className="flex flex-row gap-3 items-center pr-4 border-r border-gray-300">
                    <Button
                        type="button"
                        onClick={handleSync}
                        disabled={syncState === "syncing"}
                        className="!px-2.5 !py-1 !text-xs transition-all cursor-pointer disabled:opacity-60"
                        variant="sync"
                        title="Klik untuk menyinkronkan data terbaru"
                    >
                        <span>
                            {syncState === "syncing"
                                ? "Menyinkronkan..."
                                : syncState === "synced"
                                    ? "Tersinkron!"
                                    : "Sinkronisasi"}
                        </span>
                        <RotateCcw
                            className={`w-3 h-3 transition-transform ${syncState === "syncing" ? "animate-spin text-green-700" : ""
                                }`}
                        />
                    </Button>

                    <Button className="!px-2.5 !py-1 !text-xs" variant="addSchedule"><Plus className="w-3 h-3" />Tambah Jadwal</Button>
                    <Button className="!px-2.5 !py-1 !text-xs" variant="addNote" onClick={() => setIsModalOpen(true)}><Plus className="w-3 h-3" />Tambah Catatan</Button>
                </div>

                {/* Badge Realtime Akun */}
                <div className="flex flex-row -space-x-2 items-center">
                    {displayedUsers.map((u, idx) => {
                        const initial = (u.name?.[0] ?? "U").toUpperCase();
                        return u.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                key={u.id}
                                src={u.avatar}
                                alt={u.name}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full border-2 border-white object-cover"
                                title={u.name}
                            />
                        ) : (
                            <div
                                key={u.id}
                                className={`flex items-center justify-center w-7 h-7 text-xs font-bold border-2 border-white rounded-full ${colors[idx % colors.length]}`}
                                title={u.name}
                            >
                                {initial}
                            </div>
                        );
                    })}

                    {remainingCount > 0 && (
                        <div
                            className="flex items-center justify-center w-7 h-7 text-xs font-bold border-2 border-white bg-gray-500 text-white rounded-full"
                            title={`${remainingCount} akun lainnya`}
                        >
                            +{remainingCount}
                        </div>
                    )}
                </div>

                <LogoutButton />
            </div>
            {isModalOpen && (
                <ModalTambahCatatan
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </header>
    );

}
