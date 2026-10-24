
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
    const supabase = createClient();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleEmailLogin(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setError("");
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError("Login gagal. Periksa email dan password.");
            return;
        }

        router.replace("/beranda");
        router.refresh();
    }

    async function handleGoogleLogin() {
        setError("");
        setLoading(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/beranda`,
            },
        });

        if (error) {
            setError("Login Google gagal. Periksa konfigurasi Supabase.");
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b1110] px-4 text-white">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
                <div className="mb-8">
                    <p className="mb-3 text-sm font-medium text-green-400">
                        JAGOFARM WORKSPACE
                    </p>
                    <h1 className="text-3xl font-bold">Selamat datang</h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Masuk untuk melanjutkan pekerjaan tim.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="mb-5 w-full rounded-lg border border-white/15 px-4 py-3 font-medium transition hover:bg-white/10 disabled:opacity-50"
                >
                    Lanjutkan dengan Google
                </button>

                <div className="mb-5 flex items-center gap-3 text-xs text-gray-500">
                    <div className="h-px flex-1 bg-white/10" />
                    ATAU DENGAN EMAIL
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-green-500"
                            placeholder="nama@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-green-500"
                            placeholder="Masukkan password"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold transition hover:bg-green-500 disabled:opacity-50"
                    >
                        {loading ? "Memproses..." : "Masuk"}
                    </button>
                </form>
            </div>
        </main>
    );
}
