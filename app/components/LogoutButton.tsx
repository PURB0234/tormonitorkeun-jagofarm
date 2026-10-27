"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { PowerCircle, Loader2 } from "lucide-react";

export default function LogoutButton() {
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        if (!window.confirm("Apakah Anda yakin ingin keluar?")) return;

        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Gagal keluar: " + error.message);
            setLoading(false);
            return;
        }

        // Hard redirect: hapus bersih cache klien & state WebSocket browser
        window.location.href = "/login";
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            title="Keluar Akun"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
            {loading ? (
                <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
            ) : (
                <PowerCircle className="w-5 h-5 text-red-600" />
            )}
        </button>
    );
}
