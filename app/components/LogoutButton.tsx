
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { PowerCircle } from "lucide-react";

export default function LogoutButton() {
    const router = useRouter();

    async function handleLogout() {
        if (!window.confirm("Apakah Anda yakin ingin keluar?")) return;

        const supabase = createClient();
        await supabase.auth.signOut();

        router.replace("/login");
        router.refresh();
    }

    return (
        <button
            onClick={handleLogout}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
        >
            <PowerCircle className="w-5 h-5 text-red-600" />
        </button>
    );
}
